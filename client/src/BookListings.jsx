import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fileTypeLabel(mimeType) {
  if (!mimeType) return "File";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "text/csv" || mimeType === "application/vnd.ms-excel") return "CSV";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) return "PowerPoint";
  return "File";
}

function getStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "active":       return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e", label: "Active" };
    case "pending":      return { bg: "#fefce8", text: "#854d0e", border: "#fde047", dot: "#eab308", label: "Pending Review" };
    case "sold":         return { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444", label: "Sold" };
    case "removed":      return { bg: "#f5f5f5", text: "#777",    border: "#ddd",    dot: "#aaa",    label: "Removed" };
    case "under review": return { bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316", label: "Under Review" };
    default:             return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e", label: status || "Active" };
  }
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem("bookExchangeUser");
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function StatusBadge({ status, style: extraStyle = {} }) {
  const s = getStatusStyle(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "20px",
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
      background: s.bg, color: s.text, border: `1.5px solid ${s.border}`, ...extraStyle,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function AdminStatusModal({ listing, onClose, onSave }) {
  const [status, setStatus] = useState(listing.status || "Active");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(listing.listing_id, status, notes);
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Admin: Override Status</div>
          <div style={{ color: "rgba(255,189,0,0.55)", fontSize: 12, marginTop: 4 }}>{listing.title}</div>
        </div>
        <div className="modal-body">
          <div className="modal-group" style={{ marginBottom: 14 }}>
            <label className="modal-label">New Status</label>
            <select className="modal-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Sold">Sold</option>
              <option value="Under Review">Under Review</option>
              <option value="Removed">Removed</option>
            </select>
          </div>
          <div className="modal-group">
            <label className="modal-label">Admin Notes (optional)</label>
            <textarea className="modal-textarea" placeholder="Reason for status change…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80 }} />
          </div>
          <button className="modal-save" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Apply Status"}</button>
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function BookListings() {
  const navigate    = useNavigate();
  const currentUser = getCurrentUser();
  const isAdmin     = currentUser?.role === "admin";

  const [books,         setBooks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [searchBy,      setSearchBy]      = useState("All");
  const [category,      setCategory]      = useState("All");
  const [sortOrder,     setSortOrder]     = useState("");
  const [typeFilter,    setTypeFilter]    = useState("All");
  const [statusFilter,  setStatusFilter]  = useState(isAdmin ? "All" : "Active");

  const [editingId,     setEditingId]     = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adminTarget,   setAdminTarget]   = useState(null);

  // Likes state
  const [likedNoteIds,  setLikedNoteIds]  = useState(new Set());
  const [likingIds,     setLikingIds]     = useState(new Set()); // notes currently being toggled

  const [editData, setEditData] = useState({
    listing_id: null, title: "", author: "", edition: "", isbn: "",
    course_code: "", book_condition: "", price: "", notes: "", status: "Active",
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const fetches = [fetch(`${baseUrl}/BookListings`), fetch(`${baseUrl}/Notes`)];
        if (currentUser?.id) fetches.push(fetch(`${baseUrl}/api/notes/likes?userId=${currentUser.id}`));

        const [booksRes, notesRes, likesRes] = await Promise.all(fetches);
        const booksData = booksRes.ok ? await booksRes.json() : [];
        const notesData = notesRes.ok ? await notesRes.json() : [];

        if (likesRes?.ok) {
          const likedIds = await likesRes.json();
          setLikedNoteIds(new Set(likedIds));
        }

        const combined = [
          ...booksData.map((b) => ({ ...b, _type: "book" })),
          ...notesData.map((n) => ({ ...n, _type: "notes", listing_id: `n-${n.note_id}`, price: 0, status: "Active" })),
        ];
        setBooks(combined);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── filter & sort ────────────────────────────────────────────────────────
  let processedBooks = books.filter((book) => {
    const s         = (book.status || "active").toLowerCase();
    const searchLow = searchTerm.toLowerCase();
    const title     = (book.title || "").toLowerCase();
    const course    = (book.course_code || "").toLowerCase();
    const author    = (book.author || "").toLowerCase();
    const isbn      = (book.isbn || "").toLowerCase();
    const desc      = (book.description || "").toLowerCase();

    const isOwn = currentUser && currentUser.id === book.user_id;
    if (!isAdmin && !isOwn) { if (s !== "active") return false; }
    else if (!isAdmin && isOwn) { if (s === "removed" && statusFilter !== "All") return false; }
    else if (isAdmin && statusFilter !== "All") { if (s !== statusFilter.toLowerCase()) return false; }

    let matchesSearch = true;
    if (searchTerm.trim() !== "") {
      if (searchBy === "All")    matchesSearch = title.includes(searchLow) || course.includes(searchLow) || author.includes(searchLow) || isbn.includes(searchLow) || desc.includes(searchLow);
      else if (searchBy === "Title")  matchesSearch = title.includes(searchLow);
      else if (searchBy === "Author") matchesSearch = author.includes(searchLow);
      else if (searchBy === "Course") matchesSearch = course.includes(searchLow);
      else if (searchBy === "ISBN")   matchesSearch = isbn.includes(searchLow);
    }

    const matchesCategory = category === "All" || course.includes(category.toLowerCase());
    const matchesType =
      typeFilter === "All" ||
      (typeFilter === "Books" && book._type === "book") ||
      (typeFilter === "Notes" && book._type === "notes");

    return matchesSearch && matchesCategory && matchesType;
  });

  if (sortOrder === "lowToHigh")   processedBooks.sort((a, b) => a.price - b.price);
  else if (sortOrder === "highToLow") processedBooks.sort((a, b) => b.price - a.price);
  else if (sortOrder === "mostLiked") processedBooks.sort((a, b) => Number(b.like_count || 0) - Number(a.like_count || 0));

  // ── actions ──────────────────────────────────────────────────────────────
  function handleContact(book) {
    if (currentUser && currentUser.id === book.user_id) return;
    navigate("/messages", {
      state: { receiverId: book.user_id, receiverName: book.seller_name || "Seller", listingId: book.listing_id, bookTitle: book.title },
    });
  }

  function handleEditClick(book) {
    setEditingId(book.listing_id);
    setEditData({
      listing_id: book.listing_id, title: book.title || "", author: book.author || "",
      edition: book.edition || "", isbn: book.isbn || "", course_code: book.course_code || "",
      book_condition: book.book_condition || "Good", price: book.price || "",
      notes: book.notes || "", status: book.status || "Active",
    });
    setShowEditModal(true);
  }

  function handleCancelEdit() { setEditingId(null); setShowEditModal(false); }

  async function handleSaveEdit() {
    try {
      const baseUrl = getApiBaseUrl();
      if (!editData.listing_id) throw new Error("Missing listing id.");
      const allowedStatuses = isAdmin ? ["Pending", "Active", "Sold", "Removed", "Under Review"] : ["Active", "Sold"];
      const safeStatus = allowedStatuses.includes(editData.status) ? editData.status : "Active";
      const payload = {
        title: editData.title, author: editData.author, edition: editData.edition || null,
        isbn: editData.isbn || null, course_code: editData.course_code || null,
        book_condition: editData.book_condition, price: Number(editData.price),
        notes: editData.notes || null, status: safeStatus, userId: currentUser?.id,
      };
      const res = await fetch(`${baseUrl}/BookListings/${editData.listing_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update listing");
      let updatedBook;
      try { updatedBook = await res.json(); } catch { updatedBook = payload; }
      setBooks((prev) => prev.map((item) => item._type === "book" && item.listing_id === editData.listing_id ? { ...item, ...updatedBook, _type: "book" } : item));
      handleCancelEdit();
    } catch (error) {
      console.error("Save error:", error);
      alert("Could not save changes.");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/BookListings/${deleteTarget.listing_id}`, {
        method: "DELETE", headers: { "x-user-id": currentUser?.id },
      });
      if (!res.ok) throw new Error("Failed to delete listing");
      setBooks((prev) => prev.filter((item) => !(item._type === "book" && item.listing_id === deleteTarget.listing_id)));
      if (editingId === deleteTarget.listing_id) handleCancelEdit();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete listing.");
    }
  }

  async function handleApprove(listingId) {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/listings/${listingId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setBooks((prev) => prev.map((b) => b._type === "book" && b.listing_id === listingId ? { ...b, status: "Active" } : b));
    } catch { alert("Could not approve listing."); }
  }

  async function handleAdminStatusSave(listingId, newStatus, notes) {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/listings/${listingId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ status: newStatus, notes, userId: currentUser?.id }),
      });
      setBooks((prev) => prev.map((b) => b._type === "book" && b.listing_id === listingId ? { ...b, status: newStatus } : b));
    } catch { alert("Could not update status."); }
  }

  async function handleSellerStatusToggle(book) {
    const newStatus = (book.status || "Active") === "Sold" ? "Active" : "Sold";
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/listings/${book.listing_id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ status: newStatus, userId: currentUser?.id }),
      });
      setBooks((prev) => prev.map((b) => b._type === "book" && b.listing_id === book.listing_id ? { ...b, status: newStatus } : b));
    } catch { alert("Could not update status."); }
  }

  async function handleLike(note) {
    if (!currentUser?.id) return;
    const noteId = note.note_id;
    if (likingIds.has(noteId)) return; // debounce

    setLikingIds((prev) => new Set([...prev, noteId]));
    const isLiked = likedNoteIds.has(noteId);

    // Optimistic update
    setLikedNoteIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(noteId); else next.add(noteId);
      return next;
    });
    setBooks((prev) => prev.map((b) =>
      b._type === "notes" && b.note_id === noteId
        ? { ...b, like_count: Math.max(0, Number(b.like_count || 0) + (isLiked ? -1 : 1)) }
        : b
    ));

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/notes/${noteId}/like`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      // Sync with server's authoritative count
      setBooks((prev) => prev.map((b) => b._type === "notes" && b.note_id === noteId ? { ...b, like_count: data.like_count } : b));
    } catch {
      // Revert on error
      setLikedNoteIds((prev) => { const next = new Set(prev); if (isLiked) next.add(noteId); else next.delete(noteId); return next; });
      setBooks((prev) => prev.map((b) =>
        b._type === "notes" && b.note_id === noteId
          ? { ...b, like_count: Math.max(0, Number(b.like_count || 0) + (isLiked ? 1 : -1)) }
          : b
      ));
    } finally {
      setLikingIds((prev) => { const next = new Set(prev); next.delete(noteId); return next; });
    }
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .listings-page {
          min-height: calc(100vh - 64px); width: 100vw;
          font-family: 'DM Sans', sans-serif; position: relative;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .listings-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 10% 60%, rgba(255,189,0,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 85% 25%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .listings-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .admin-banner {
          position: relative; z-index: 2;
          background: linear-gradient(90deg, #0a0a0a, #1a0a00);
          border-bottom: 2px solid #FFBD00;
          padding: 10px 2rem;
          display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .admin-banner-left { display: flex; align-items: center; gap: 10px; }
        .admin-pill { background: #FFBD00; color: #0a0a0a; font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; }
        .admin-banner-text { color: rgba(255,189,0,0.7); font-size: 12px; font-weight: 600; }
        .admin-dashboard-link {
          background: rgba(255,189,0,0.12); border: 1.5px solid rgba(255,189,0,0.3); color: #FFBD00;
          border-radius: 8px; padding: 5px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer; transition: background 0.15s;
        }
        .admin-dashboard-link:hover { background: rgba(255,189,0,0.22); }

        .listings-container {
          position: relative; z-index: 1;
          display: flex; flex-wrap: wrap;
          padding: 2rem; max-width: 1240px; margin: 0 auto; gap: 1.75rem;
        }

        .listings-sidebar {
          flex: 1 1 240px; background: #fff; border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,189,0,0.1);
          overflow: hidden; height: fit-content;
        }
        .sidebar-header { background: #0a0a0a; padding: 18px 20px; border-bottom: 3px solid #FFBD00; }
        .sidebar-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; color: #FFBD00; }
        .sidebar-body { padding: 20px; }

        .filter-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 6px; }
        .filter-input {
          width: 100%; padding: 9px 12px; border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none; margin-bottom: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .filter-input:focus { border-color: #FFBD00; background: #fff; box-shadow: 0 0 0 3px rgba(255,189,0,0.12); }

        .radio-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
        .radio-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; color: #555;
          cursor: pointer; padding: 4px 10px; border-radius: 20px;
          border: 1.5px solid #e8e8e8; background: #fafafa;
          transition: all 0.15s; white-space: nowrap;
        }
        .radio-chip input { display: none; }
        .radio-chip:has(input:checked) { background: #0a0a0a; color: #FFBD00; border-color: #0a0a0a; }
        .radio-chip:hover:not(:has(input:checked)) { border-color: #FFBD00; color: #0a0a0a; }
        .filter-divider { height: 1px; background: #f0f0f0; margin: 4px 0 16px; }

        .listings-grid {
          flex: 3 1 600px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.25rem; align-content: start;
        }

        .book-card {
          background: #fff; border-radius: 14px; overflow: hidden;
          box-shadow: 0 10px 35px rgba(0,0,0,0.4);
          display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s; cursor: default;
        }
        .book-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .book-card.status-sold     { opacity: 0.75; }
        .book-card.status-pending  { border: 2px dashed #eab308; }
        .book-card.status-removed  { opacity: 0.5; filter: grayscale(0.4); }
        .book-card.status-under-review { border: 2px dashed #f97316; }

        .book-card-img { width: 100%; height: 160px; object-fit: cover; border-bottom: 3px solid #FFBD00; }
        .book-card-img-notes {
          width: 100%; height: 160px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
          border-bottom: 3px solid #FFBD00;
          font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 3px; color: #FFBD00;
        }
        .book-card-body { padding: 14px; display: flex; flex-direction: column; flex-grow: 1; }

        .badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
        .badge-course { display: inline-block; background: #0a0a0a; color: #FFBD00; font-size: 0.65rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.8px; text-transform: uppercase; }
        .badge-notes  { display: inline-block; background: #FFBD00; color: #0a0a0a; font-size: 0.65rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.8px; text-transform: uppercase; }

        .book-title  { font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; color: #0a0a0a; margin-bottom: 3px; line-height: 1.3; }
        .book-author { font-size: 0.85rem; color: #777; margin-bottom: 10px; }
        .book-description { font-size: 0.82rem; color: #999; margin-bottom: 8px; line-height: 1.5; }

        .card-footer {
          margin-top: auto; display: flex; justify-content: space-between;
          align-items: center; border-top: 1px solid #f0f0f0;
          padding-top: 10px; gap: 8px; flex-wrap: wrap;
        }
        .card-price { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: #0a0a0a; }
        .card-btn-group { display: flex; gap: 6px; flex-wrap: wrap; }

        .btn-primary   { background: #FFBD00; color: #0a0a0a; border: none; padding: 7px 13px; border-radius: 20px; font-weight: 700; font-size: 0.75rem; cursor: pointer; letter-spacing: 0.5px; transition: background 0.15s, transform 0.15s; }
        .btn-primary:hover { background: #e6a800; transform: translateY(-1px); }
        .btn-secondary { background: #0a0a0a; color: #FFBD00; border: none; padding: 7px 13px; border-radius: 20px; font-weight: 700; font-size: 0.75rem; cursor: pointer; letter-spacing: 0.5px; transition: background 0.15s, transform 0.15s; }
        .btn-secondary:hover { background: #222; transform: translateY(-1px); }
        .btn-danger    { background: #b3261e; color: white; border: none; padding: 7px 13px; border-radius: 20px; font-weight: 700; font-size: 0.75rem; cursor: pointer; letter-spacing: 0.5px; transition: background 0.15s, transform 0.15s; }
        .btn-danger:hover { background: #8f1f18; transform: translateY(-1px); }
        .btn-approve   { background: #f0fdf4; color: #15803d; border: 1.5px solid #86efac; padding: 5px 10px; border-radius: 20px; font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: background 0.15s; }
        .btn-approve:hover { background: #dcfce7; }
        .btn-admin     { background: linear-gradient(135deg, #1a0a00, #0a0a0a); color: #FFBD00; border: 1.5px solid rgba(255,189,0,0.3); padding: 5px 10px; border-radius: 20px; font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: border-color 0.15s; }
        .btn-admin:hover { border-color: #FFBD00; }
        .btn-sold-toggle { background: transparent; color: #854d0e; border: 1.5px solid #fde047; padding: 5px 10px; border-radius: 20px; font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: background 0.15s; }
        .btn-sold-toggle:hover { background: #fefce8; }
        .btn-sold-toggle.is-sold { background: #fefce8; color: #15803d; border-color: #86efac; }
        .btn-sold-toggle.is-sold:hover { background: #f0fdf4; }

        /* Like button */
        .btn-like {
          display: inline-flex; align-items: center; gap: 5px;
          background: transparent; border: 1.5px solid #e8e8e8;
          padding: 5px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700; cursor: pointer;
          color: #aaa; transition: all 0.15s;
        }
        .btn-like:hover { border-color: #f43f5e; color: #f43f5e; background: #fff1f2; }
        .btn-like.liked { border-color: #f43f5e; color: #f43f5e; background: #fff1f2; }
        .btn-like:disabled { opacity: 0.6; cursor: not-allowed; }

        .like-count-text { font-size: 10px; color: #bbb; margin-top: 2px; }

        .listings-empty { color: rgba(255,255,255,0.6); grid-column: 1 / -1; text-align: center; padding: 4rem 0; }
        .listings-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .listings-empty-text { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; color: rgba(255,255,255,0.5); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
        .modal-card { width: 100%; max-width: 700px; background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
        .modal-header { background: #0a0a0a; padding: 20px 24px; border-bottom: 3px solid #FFBD00; }
        .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; color: #FFBD00; }
        .modal-body { padding: 22px; }
        .modal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .modal-group { display: flex; flex-direction: column; }
        .modal-full  { grid-column: 1 / -1; }
        .modal-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-bottom: 6px; }
        .modal-input, .modal-textarea, .modal-select { width: 100%; padding: 10px 12px; border: 1.5px solid #ddd; border-radius: 10px; font-size: 14px; background: #fafafa; outline: none; font-family: 'DM Sans', sans-serif; }
        .modal-input:focus, .modal-textarea:focus, .modal-select:focus { border-color: #FFBD00; background: white; box-shadow: 0 0 0 3px rgba(255,189,0,0.12); }
        .modal-textarea { min-height: 100px; resize: vertical; }
        .modal-save { margin-top: 18px; width: 100%; background: #FFBD00; color: #0a0a0a; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.15s; }
        .modal-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .modal-save:not(:disabled):hover { background: #e6a800; }
        .modal-cancel { margin-top: 10px; width: 100%; background: #0a0a0a; color: #FFBD00; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .delete-modal { background: white; width: 90%; max-width: 400px; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
        .delete-modal h3 { margin-bottom: 8px; color: #0a0a0a; }
        .delete-modal p { color: #555; margin-bottom: 18px; }
        .delete-modal-actions { display: flex; justify-content: center; gap: 10px; }

        @media (max-width: 700px) {
          .listings-container { flex-direction: column; padding: 1rem; gap: 1rem; }
          .listings-sidebar { flex: none; width: 100%; }
          .listings-grid { grid-template-columns: 1fr; }
          .modal-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {isAdmin && (
        <div className="admin-banner">
          <div className="admin-banner-left">
            <span className="admin-pill">Admin</span>
            <span className="admin-banner-text">You are viewing as administrator — all listing statuses visible</span>
          </div>
          <button className="admin-dashboard-link" onClick={() => navigate("/admin")}>Admin Dashboard →</button>
        </div>
      )}

      <div className="listings-page">
        <div className="listings-container">

          {/* ── Sidebar ── */}
          <aside className="listings-sidebar">
            <div className="sidebar-header"><div className="sidebar-title">Filters</div></div>
            <div className="sidebar-body">
              <label className="filter-label">Search</label>
              <input
                className="filter-input"
                placeholder={`Search by ${searchBy === "All" ? "keywords" : searchBy.toLowerCase()}…`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <label className="filter-label">Search by</label>
              <div className="radio-group">
                {["All", "Title", "Author", "Course", "ISBN"].map((opt) => (
                  <label key={opt} className="radio-chip">
                    <input type="radio" name="searchBy" value={opt} checked={searchBy === opt} onChange={(e) => setSearchBy(e.target.value)} />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="filter-divider" />

              <label className="filter-label">Listing Type</label>
              <div className="radio-group">
                {["All", "Books", "Notes"].map((opt) => (
                  <label key={opt} className="radio-chip">
                    <input type="radio" name="typeFilter" value={opt} checked={typeFilter === opt} onChange={(e) => setTypeFilter(e.target.value)} />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="filter-divider" />

              <label className="filter-label">Status</label>
              <div className="radio-group">
                {(isAdmin
                  ? ["All", "Active", "Pending", "Sold", "Under Review", "Removed"]
                  : ["Active", "All"]
                ).map((opt) => (
                  <label key={opt} className="radio-chip">
                    <input type="radio" name="statusFilter" value={opt} checked={statusFilter === opt} onChange={(e) => setStatusFilter(e.target.value)} />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="filter-divider" />

              <label className="filter-label">Department</label>
              <select className="filter-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Math">Mathematics</option>
                <option value="CompSci">Computer Science</option>
                <option value="Psych">Psychology</option>
                <option value="Chem">Chemistry</option>
                <option value="Art">Arts &amp; Humanities</option>
              </select>

              <label className="filter-label">Sort by</label>
              <select className="filter-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="">Relevance (Default)</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
                <option value="mostLiked">Most Liked Notes</option>
              </select>
            </div>
          </aside>

          {/* ── Grid ── */}
          <main className="listings-grid">
            {loading ? (
              <div className="listings-empty">
                <div className="listings-empty-icon">📚</div>
                <div className="listings-empty-text">Loading listings…</div>
              </div>
            ) : processedBooks.length > 0 ? (
              processedBooks.map((book) => {
                const isOwnListing = currentUser && currentUser.id === book.user_id;
                const isNotes      = book._type === "notes";
                const label        = isNotes ? fileTypeLabel(book.file_type) : null;
                const statusKey    = (book.status || "active").toLowerCase().replace(" ", "-");
                const isLiked      = isNotes && likedNoteIds.has(book.note_id);
                const likeCount    = Number(book.like_count || 0);

                return (
                  <div key={book.listing_id} className={`book-card status-${statusKey}`}>
                    {isNotes ? (
                      <div className="book-card-img-notes">{label}</div>
                    ) : (
                      <img
                        src={book.image_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000"}
                        alt={book.title}
                        className="book-card-img"
                      />
                    )}

                    <div className="book-card-body">
                      <div className="badge-row">
                        <span className={isNotes ? "badge-notes" : "badge-course"}>
                          {isNotes ? `${label} — Notes` : (book.course_code || "General")}
                        </span>
                        {!isNotes && <StatusBadge status={book.status || "Active"} />}
                      </div>

                      <div className="book-title">{book.title}</div>
                      <div className="book-author">{isNotes ? (book.course_code || "") : book.author}</div>
                      {isNotes && book.description && (
                        <div className="book-description">{book.description}</div>
                      )}

                      <div className="card-footer">
                        <div>
                          <div className="card-price">{isNotes ? "Free" : `$${book.price}`}</div>
                          {isNotes && likeCount > 0 && (
                            <div className="like-count-text">♥ {likeCount} {likeCount === 1 ? "like" : "likes"}</div>
                          )}
                        </div>
                        <div className="card-btn-group">
                          {isNotes ? (
                            <>
                              <button className="btn-primary" onClick={() => window.open(book.file_url, "_blank")}>
                                View File
                              </button>
                              {currentUser && (
                                <button
                                  className={`btn-like${isLiked ? " liked" : ""}`}
                                  onClick={() => handleLike(book)}
                                  disabled={likingIds.has(book.note_id)}
                                  title={isLiked ? "Unlike" : "Like"}
                                >
                                  {isLiked ? "♥" : "♡"} {likeCount > 0 ? likeCount : ""}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button className="btn-primary" onClick={() => navigate(`/listings/${book.listing_id}`)}>Details</button>

                              {!isOwnListing && (book.status || "Active") === "Active" && (
                                <button className="btn-secondary" onClick={() => handleContact(book)}>Contact</button>
                              )}

                              {isOwnListing && !isAdmin && (
                                <>
                                  <button className="btn-secondary" onClick={() => handleEditClick(book)}>Edit</button>
                                  <button
                                    className={`btn-sold-toggle${book.status === "Sold" ? " is-sold" : ""}`}
                                    onClick={() => handleSellerStatusToggle(book)}
                                  >
                                    {book.status === "Sold" ? "↩ Relist" : "Mark Sold"}
                                  </button>
                                  <button className="btn-danger" onClick={() => setDeleteTarget(book)}>Delete</button>
                                </>
                              )}

                              {isAdmin && (
                                <>
                                  {book.status === "Pending" && (
                                    <button className="btn-approve" onClick={() => handleApprove(book.listing_id)}>✓ Approve</button>
                                  )}
                                  <button className="btn-admin" onClick={() => setAdminTarget(book)}>⚙ Status</button>
                                  <button className="btn-danger" onClick={() => setDeleteTarget(book)}>Permanently Delete</button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="listings-empty">
                <div className="listings-empty-icon">🔍</div>
                <div className="listings-empty-text">No listings found</div>
              </div>
            )}
          </main>
        </div>

        {/* Edit modal */}
        {showEditModal && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancelEdit(); }}>
            <div className="modal-card">
              <div className="modal-header"><div className="modal-title">Edit Listing</div></div>
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="modal-group">
                    <label className="modal-label">Title</label>
                    <input className="modal-input" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Author</label>
                    <input className="modal-input" value={editData.author} onChange={(e) => setEditData({ ...editData, author: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Edition</label>
                    <input className="modal-input" value={editData.edition} onChange={(e) => setEditData({ ...editData, edition: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">ISBN</label>
                    <input className="modal-input" value={editData.isbn} onChange={(e) => setEditData({ ...editData, isbn: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Course Code</label>
                    <input className="modal-input" value={editData.course_code} onChange={(e) => setEditData({ ...editData, course_code: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Condition</label>
                    <select className="modal-select" value={editData.book_condition} onChange={(e) => setEditData({ ...editData, book_condition: e.target.value })}>
                      <option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option>
                    </select>
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Price</label>
                    <input className="modal-input" type="number" value={editData.price} onChange={(e) => setEditData({ ...editData, price: e.target.value })} />
                  </div>
                  <div className="modal-group">
                    <label className="modal-label">Status</label>
                    <select className="modal-select" value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Sold">Sold</option>
                      {isAdmin && <option value="Pending">Pending</option>}
                      {isAdmin && <option value="Under Review">Under Review</option>}
                      {isAdmin && <option value="Removed">Removed</option>}
                    </select>
                  </div>
                  <div className="modal-group modal-full">
                    <label className="modal-label">Notes</label>
                    <textarea className="modal-textarea" value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                  </div>
                </div>
                <button className="modal-save" onClick={handleSaveEdit}>Save Changes</button>
                <button className="modal-cancel" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h3>{isAdmin ? "Permanently Delete?" : "Delete Listing?"}</h3>
              <p>
                {isAdmin
                  ? <>This will <strong>permanently delete</strong> <strong>{deleteTarget.title}</strong> and cannot be undone.</>
                  : <>Are you sure you want to delete <strong>{deleteTarget.title}</strong>?</>
                }
              </p>
              <div className="delete-modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn-danger" onClick={handleDeleteConfirmed}>
                  {isAdmin ? "Permanently Delete" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {adminTarget && (
          <AdminStatusModal listing={adminTarget} onClose={() => setAdminTarget(null)} onSave={handleAdminStatusSave} />
        )}
      </div>
    </>
  );
}

export default BookListings;