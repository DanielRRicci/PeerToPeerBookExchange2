import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "./apiBaseUrl";
import { clearStoredUser, getStoredUser, setStoredUser } from "./auth";
import { Link, useNavigate } from "react-router-dom";

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
  )
    return "PowerPoint";
  return "File";
}

function getStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "active":       return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" };
    case "pending":      return { bg: "#fefce8", text: "#854d0e", border: "#fde047", dot: "#eab308" };
    case "sold":         return { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444" };
    case "removed":      return { bg: "#f5f5f5", text: "#777",    border: "#ddd",    dot: "#aaa"    };
    case "under review": return { bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" };
    default:             return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" };
  }
}

function StatusBadge({ status }) {
  const s = getStatusStyle(status);
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 20, fontSize: 10,
        fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
        background: s.bg, color: s.text, border: `1.5px solid ${s.border}`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {status || "Active"}
    </span>
  );
}

function Profile() {
  const navigate = useNavigate();
  const [user,            setUser]            = useState(null);
  const [listings,        setListings]        = useState([]);
  const [notes,           setNotes]           = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [accountData,     setAccountData]     = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmDelete: "",
  });
  const [accountErrors,   setAccountErrors]   = useState({});
  const [accountStatus,   setAccountStatus]   = useState({ username: "", password: "", delete: "" });
  const [accountBusy,     setAccountBusy]     = useState({ username: false, password: false, delete: false });
  const [editData,        setEditData]        = useState({
    listing_id: null, title: "", author: "", edition: "",
    isbn: "", course_code: "", book_condition: "", price: "", notes: "", status: "Active",
  });

  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    const stored = localStorage.getItem("bookExchangeUser");
    if (!stored) return;
    const { id: userId } = JSON.parse(stored);
    if (!userId) return;
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/users/${userId}`).then((r) => r.json()).then(setUser);
    fetch(`${baseUrl}/api/listings?userId=${userId}`).then((r) => r.json()).then((d) => setListings(Array.isArray(d) ? d : []));
    fetch(`${baseUrl}/Notes?userId=${userId}`).then((r) => r.json()).then((d) => setNotes(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!user?.full_name) return;
    setAccountData((prev) => ({ ...prev, username: user.full_name }));
  }, [user?.full_name]);

  function setSectionMessage(section, message = "", error = "") {
    setAccountStatus((prev) => ({ ...prev, [section]: message }));
    setAccountErrors((prev) => ({ ...prev, [section]: error }));
  }

  function validateUsername(username) {
    const trimmed = String(username || "").trim();
    if (!/^[A-Za-z0-9]{2,30}$/.test(trimmed)) {
      return "Username must be 2-30 characters and use letters or numbers only.";
    }
    return "";
  }

  async function handleUsernameUpdate(e) {
    e.preventDefault();
    const usernameError = validateUsername(accountData.username);
    if (usernameError) {
      setSectionMessage("username", "", usernameError);
      return;
    }

    setAccountBusy((prev) => ({ ...prev, username: true }));
    setSectionMessage("username");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/users/${currentUser?.id}/username`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ username: accountData.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update username.");

      setUser(data.user);
      const storedUser = getStoredUser();
      if (storedUser) {
        setStoredUser({ ...storedUser, fullName: data.user.full_name });
      }
      setAccountData((prev) => ({ ...prev, username: data.user.full_name }));
      setSectionMessage("username", data.message || "Username updated.");
    } catch (err) {
      setSectionMessage("username", "", err.message || "Could not update username.");
    } finally {
      setAccountBusy((prev) => ({ ...prev, username: false }));
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (!accountData.currentPassword) {
      setSectionMessage("password", "", "Enter your current password to continue.");
      return;
    }
    if (accountData.newPassword.length < 8) {
      setSectionMessage("password", "", "New password must be at least 8 characters.");
      return;
    }

    setAccountBusy((prev) => ({ ...prev, password: true }));
    setSectionMessage("password");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/users/${currentUser?.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({
          currentPassword: accountData.currentPassword,
          newPassword: accountData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password.");

      setAccountData((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
      setSectionMessage("password", data.message || "Password updated.");
    } catch (err) {
      setSectionMessage("password", "", err.message || "Could not update password.");
    } finally {
      setAccountBusy((prev) => ({ ...prev, password: false }));
    }
  }

  async function handleDeleteAccount() {
    setAccountBusy((prev) => ({ ...prev, delete: true }));
    setSectionMessage("delete");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/users/${currentUser?.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete account.");

      clearStoredUser();
      navigate("/login", { replace: true });
    } catch (err) {
      setSectionMessage("delete", "", err.message || "Could not delete account.");
      setAccountBusy((prev) => ({ ...prev, delete: false }));
    }
  }

  function confirmDeleteAccount() {
    if (accountData.confirmDelete !== "DELETE") {
      setSectionMessage("delete", "", "Type DELETE before removing your account.");
      return;
    }

    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");
    if (!confirmed) return;
    handleDeleteAccount();
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const stored = localStorage.getItem("bookExchangeUser");
    if (!stored) return;
    const { id: userId } = JSON.parse(stored);
    setAvatarUploading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch(`${baseUrl}/api/users/${userId}/avatar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });
      setUser((prev) => ({ ...prev, profile_image_url: publicUrl }));
      const stored2 = getStoredUser();
      if (stored2) setStoredUser({ ...stored2, profile_image_url: publicUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
    setAvatarUploading(false);
  }

  function handleEdit(book) {
    setEditData({
      listing_id:     book.listing_id,
      title:          book.title || "",
      author:         book.author || "",
      edition:        book.edition || book.Edition || "",
      isbn:           book.isbn || "",
      course_code:    book.course_code || "",
      book_condition: book.book_condition || "Good",
      price:          book.price || "",
      notes:          book.notes || "",
      status:         book.status || "Active",
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/listings/${editData.listing_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({
          title:          editData.title,
          author:         editData.author,
          edition:        editData.edition || null,
          isbn:           editData.isbn || null,
          course_code:    editData.course_code || null,
          book_condition: editData.book_condition,
          condition:      editData.book_condition,
          price:          Number(editData.price),
          notes:          editData.notes || null,
          status:         editData.status,
        }),
      });
      const updatedBook = await res.json();
      if (!res.ok) throw new Error(updatedBook.error || "Failed to update listing.");
      setListings((prev) =>
        prev.map((b) => (b.listing_id === editData.listing_id ? { ...b, ...updatedBook } : b))
      );
      setShowEditModal(false);
    } catch (err) {
      console.error("Update failed:", err);
      alert(err.message || "Failed to update listing.");
    }
  }

  function handleDelete(id) {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/listings/${id}`, {
      method: "DELETE",
      headers: { "x-user-id": currentUser?.id },
    })
      .then(() => setListings((prev) => prev.filter((b) => b.listing_id !== id)))
      .catch(console.error);
  }

  // Seller: toggle Active ↔ Sold directly from profile
  async function handleStatusToggle(book) {
    const newStatus = book.status === "Sold" ? "Active" : "Sold";
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/listings/${book.listing_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id },
        body: JSON.stringify({ status: newStatus, userId: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      setListings((prev) =>
        prev.map((b) =>
          b.listing_id === book.listing_id ? { ...b, status: data.status || newStatus } : b
        )
      );
      if (data.message) alert(data.message);
    } catch (err) {
      alert(err.message || "Could not update status.");
    }
  }

  function handleDeleteNote(id) {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/Notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.note_id !== id));
  }

  if (!user)
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          .profile-loading {
            min-height: calc(100vh - 64px);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px;
            color: rgba(255,255,255,0.5);
            background: linear-gradient(rgba(0,0,0,0.72),rgba(0,0,0,0.72)),
              url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
          }
  
        @media (max-width: 640px) {
          .profile-page { padding: 1rem 0.75rem; }
          .profile-card { border-radius: 14px; }
          .profile-card-header { padding: 24px 20px 20px; }
          .profile-card-body { padding: 16px 16px 20px; }
          .profile-name { font-size: 28px; }
          .modal-grid { grid-template-columns: 1fr; }
          .modal-card { border-radius: 14px; }
          .listing-row { gap: 6px; }
          .listing-actions { flex-wrap: wrap; }
        }
      `}</style>
        <div className="profile-loading">Loading…</div>
      </>
    );

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=FFBD00&color=000&size=100`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .profile-page {
          min-height: calc(100vh - 64px); width: 100vw;
          display: flex; align-items: flex-start; justify-content: center;
          font-family: 'DM Sans', sans-serif; position: relative;
          padding: 2.5rem 1.5rem;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .profile-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .profile-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .profile-card {
          position: relative; z-index: 1; width: 100%; max-width: 600px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .profile-card-header {
          background: #0a0a0a; padding: 32px 36px 28px;
          border-bottom: 3px solid #FFBD00; text-align: center;
        }

        .profile-avatar-wrap {
          position: relative; width: 90px; height: 90px;
          margin: 0 auto 16px; cursor: pointer; display: inline-block;
        }
        .profile-avatar {
          width: 90px; height: 90px; border-radius: 50%;
          object-fit: cover; border: 3px solid #FFBD00; display: block;
        }
        .profile-avatar-overlay {
          position: absolute; bottom: 0; right: 0;
          background: #FFBD00; border-radius: 50%; width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #0a0a0a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }

        .profile-name {
          font-family: 'Bebas Neue', sans-serif; font-size: 36px;
          letter-spacing: 2px; color: #FFBD00; line-height: 1; margin-bottom: 6px;
        }
        .profile-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px; }
        .profile-badge {
          display: inline-block; background: #FFBD00; color: #0a0a0a;
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; padding: 3px 12px; border-radius: 20px;
        }
        .profile-badge-admin {
          display: inline-block; background: #ff6b35; color: #fff;
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; padding: 3px 12px; border-radius: 20px;
        }
        .profile-email { font-size: 13px; color: rgba(255,255,255,0.4); }

        .profile-card-body { padding: 24px 28px 28px; }

        .account-section {
          margin-top: 4px; padding: 18px; border: 1.5px solid #f0f0f0;
          border-radius: 12px; background: #fafafa;
        }
        .account-copy {
          font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 14px;
        }
        .account-form {
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;
        }
        .account-row {
          display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end;
        }
        .account-field {
          display: flex; flex-direction: column; gap: 5px;
        }
        .account-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #666;
        }
        .account-input {
          width: 100%; padding: 10px 13px;
          border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fff; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .account-input:focus {
          border-color: #FFBD00; box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }
        .account-hint {
          font-size: 11px; color: #999;
        }
        .account-error {
          font-size: 12px; color: #b91c1c; background: #fef2f2;
          border: 1px solid #fecaca; border-radius: 8px; padding: 9px 11px;
        }
        .account-success {
          font-size: 12px; color: #15803d; background: #f0fdf4;
          border: 1px solid #86efac; border-radius: 8px; padding: 9px 11px;
        }
        .account-btn {
          padding: 11px 16px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 8px; font-size: 12px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
          min-width: 150px; transition: background 0.15s;
        }
        .account-btn:hover { background: #222; }
        .account-btn:disabled { opacity: 0.6; cursor: wait; }
        .account-btn-danger {
          background: #991b1b; color: #fff;
        }
        .account-btn-danger:hover { background: #7f1d1d; }
        .account-divider {
          height: 1px; background: #ececec; margin: 16px 0;
        }

        .section-heading {
          font-family: 'Bebas Neue', sans-serif; font-size: 26px;
          letter-spacing: 2px; color: #0a0a0a; margin: 18px 0 12px;
          display: flex; align-items: center; gap: 10px;
        }
        .section-count {
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
          background: #0a0a0a; color: #FFBD00; padding: 2px 9px; border-radius: 20px;
          letter-spacing: 0;
        }

        .listing-row {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          padding: 12px 14px; border-radius: 10px; border: 1.5px solid #f0f0f0;
          background: #fafafa; margin-bottom: 8px; transition: border-color 0.15s;
        }
        .listing-row:hover { border-color: #FFBD00; }

        .listing-title { font-weight: 700; font-size: 13px; color: #0a0a0a; flex: 1 1 100%; }
        .listing-meta  { font-size: 12px; color: #888; flex: 1 1 auto; }
        .listing-type-tag {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; background: #FFBD00; color: #0a0a0a;
          padding: 2px 8px; border-radius: 20px;
        }
        .listing-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }

        .btn-edit {
          padding: 5px 14px; background: #FFBD00; color: #0a0a0a; border: none;
          border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          cursor: pointer; transition: background 0.15s, transform 0.15s;
        }
        .btn-edit:hover { background: #e6a800; transform: translateY(-1px); }

        .btn-delete {
          padding: 5px 14px; background: transparent; color: #dc2626;
          border: 1.5px solid #dc2626; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .btn-delete:hover { background: #fef2f2; }

        .btn-view {
          padding: 5px 14px; background: #0a0a0a; color: #FFBD00; border: none;
          border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-view:hover { background: #222; transform: translateY(-1px); }

        .btn-sold-toggle {
          padding: 5px 14px; background: transparent; color: #854d0e;
          border: 1.5px solid #fde047; border-radius: 20px;
          font-size: 11px; font-weight: 700; cursor: pointer;
          transition: background 0.15s;
        }
        .btn-sold-toggle:hover { background: #fefce8; }
        .btn-sold-toggle.is-sold {
          color: #15803d; border-color: #86efac;
        }
        .btn-sold-toggle.is-sold:hover { background: #f0fdf4; }

        .profile-admin-link {
          display: block; margin: 16px 0 0;
          padding: 12px 16px; border-radius: 10px;
          background: linear-gradient(135deg, #1a0a00, #0a0a0a);
          border: 1.5px solid rgba(255,189,0,0.3); text-align: center;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px;
          letter-spacing: 2px; color: #FFBD00; cursor: pointer;
          transition: border-color 0.15s;
        }
        .profile-admin-link:hover { border-color: #FFBD00; }

        .profile-back {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #aaa; text-decoration: none;
          margin-top: 20px; transition: color 0.2s;
        }
        .profile-back:hover { color: #FFBD00; }

        .empty-section { text-align: center; padding: 20px 0; color: #bbb; font-size: 13px; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
        }
        .modal-card {
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          width: 100%; max-width: 560px; overflow: hidden; max-height: 90vh; overflow-y: auto;
        }
        .modal-header {
          background: #0a0a0a; padding: 20px 28px; border-bottom: 3px solid #FFBD00;
        }
        .modal-title {
          font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 2px; color: #FFBD00;
        }
        .modal-body { padding: 24px 28px 28px; }
        .modal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .modal-full { grid-column: 1 / -1; }
        .modal-group { display: flex; flex-direction: column; }
        .modal-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #666; margin-bottom: 5px;
        }
        .modal-input, .modal-select, .modal-textarea {
          padding: 10px 13px; border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none; width: 100%;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-input:focus, .modal-select:focus, .modal-textarea:focus {
          border-color: #FFBD00; background: #fff; box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }
        .modal-textarea { min-height: 90px; resize: vertical; }
        .modal-save {
          width: 100%; padding: 13px; background: #0a0a0a; color: #FFBD00; border: none;
          border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 18px;
          letter-spacing: 2px; cursor: pointer; margin-top: 18px; transition: background 0.2s;
        }
        .modal-save:hover { background: #222; }
        .modal-cancel {
          width: 100%; padding: 11px; background: #f5f5f5; color: #666; border: none;
          border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 8px;
        }
        .modal-cancel:hover { background: #eee; }

        @media (max-width: 640px) {
          .profile-page { padding: 1rem 0.75rem; }
          .profile-card { border-radius: 14px; }
          .profile-card-header { padding: 24px 20px 20px; }
          .profile-card-body { padding: 16px 16px 20px; }
          .profile-name { font-size: 28px; }
          .account-row { grid-template-columns: 1fr; }
          .account-btn { width: 100%; }
          .modal-grid { grid-template-columns: 1fr; }
          .modal-card { border-radius: 14px; }
          .listing-row { gap: 6px; }
          .listing-actions { flex-wrap: wrap; }
        }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">

          <div className="profile-card-header">
            <label className="profile-avatar-wrap" title="Click to change photo">
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} disabled={avatarUploading} />
              <img src={user.profile_image_url || defaultAvatar} alt="Profile" className="profile-avatar" style={{ opacity: avatarUploading ? 0.5 : 1 }} />
              <div className="profile-avatar-overlay">{avatarUploading ? "…" : "✎"}</div>
            </label>

            <div className="profile-name">{user.full_name}</div>
            <div className="profile-badges">
              <span className="profile-badge">UWM Panther</span>
              {isAdmin && <span className="profile-badge-admin">⚡ Admin</span>}
            </div>
            <div className="profile-email">{user.email}</div>
          </div>

          <div className="profile-card-body">

            {/* Admin shortcut */}
            {isAdmin && (
              <div className="profile-admin-link" onClick={() => navigate("/admin")}>
                ⚙ Open Admin Dashboard →
              </div>
            )}

            <div className="section-heading" style={{ marginTop: isAdmin ? "24px" : 0 }}>
              Account Settings
            </div>

            <div className="account-section">
              <div className="account-copy">
                Keep your profile details current, rotate your password, or permanently remove your account.
              </div>

              <form className="account-form" onSubmit={handleUsernameUpdate}>
                <div className="account-row">
                  <div className="account-field">
                    <label className="account-label">Username</label>
                    <input
                      className="account-input"
                      value={accountData.username}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, username: e.target.value }))}
                      maxLength={30}
                    />
                    <div className="account-hint">2-30 characters. Letters and numbers only.</div>
                  </div>
                  <button className="account-btn" type="submit" disabled={accountBusy.username}>
                    {accountBusy.username ? "Saving..." : "Update Username"}
                  </button>
                </div>
                {accountErrors.username && <div className="account-error">{accountErrors.username}</div>}
                {accountStatus.username && <div className="account-success">{accountStatus.username}</div>}
              </form>

              <div className="account-divider" />

              <form className="account-form" onSubmit={handlePasswordUpdate}>
                <div className="account-field">
                  <label className="account-label">Current Password</label>
                  <input
                    className="account-input"
                    type="password"
                    value={accountData.currentPassword}
                    onChange={(e) => setAccountData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="account-row">
                  <div className="account-field">
                    <label className="account-label">New Password</label>
                    <input
                      className="account-input"
                      type="password"
                      value={accountData.newPassword}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <div className="account-hint">At least 8 characters.</div>
                  </div>
                  <button className="account-btn" type="submit" disabled={accountBusy.password}>
                    {accountBusy.password ? "Updating..." : "Change Password"}
                  </button>
                </div>
                {accountErrors.password && <div className="account-error">{accountErrors.password}</div>}
                {accountStatus.password && <div className="account-success">{accountStatus.password}</div>}
              </form>

              <div className="account-divider" />

              <div className="account-form" style={{ marginBottom: 0 }}>
                <div className="account-field">
                  <label className="account-label">Delete Account Confirmation</label>
                  <input
                    className="account-input"
                    value={accountData.confirmDelete}
                    onChange={(e) => setAccountData((prev) => ({ ...prev, confirmDelete: e.target.value }))}
                    placeholder="Type DELETE to confirm"
                  />
                  <div className="account-hint">
                    This removes your account and any related listings, notes, messages, and moderation records.
                  </div>
                </div>
                <button
                  className="account-btn account-btn-danger"
                  type="button"
                  onClick={confirmDeleteAccount}
                  disabled={accountBusy.delete}
                >
                  {accountBusy.delete ? "Deleting..." : "Delete Account"}
                </button>
                {accountErrors.delete && <div className="account-error">{accountErrors.delete}</div>}
                {accountStatus.delete && <div className="account-success">{accountStatus.delete}</div>}
              </div>
            </div>

            <div className="section-heading">
              My Listings <span className="section-count">{listings.length}</span>
            </div>

            {listings.length === 0 && <div className="empty-section">No listings yet.</div>}
            {listings.map((book) => (
              <div key={book.listing_id} className="listing-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 100%" }}>
                  <div className="listing-title" style={{ flex: 1, margin: 0 }}>{book.title}</div>
                  <StatusBadge status={book.status || "Active"} />
                </div>
                <div className="listing-meta">
                  {book.author} · {book.course_code} · {book.book_condition} · ${book.price}
                </div>
                <div className="listing-actions">
                  <button className="btn-edit" onClick={() => handleEdit(book)}>Edit</button>
                  <button
                    className={`btn-sold-toggle${book.status === "Sold" ? " is-sold" : ""}`}
                    onClick={() => handleStatusToggle(book)}
                    title={book.status === "Sold" ? "Relist for review" : "Mark as Sold"}
                  >
                    {book.status === "Sold" ? "↩ Relist" : "Mark Sold"}
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(book.listing_id)}>Delete</button>
                </div>
              </div>
            ))}

            <div className="section-heading" style={{ marginTop: "24px" }}>
              My Notes <span className="section-count">{notes.length}</span>
            </div>

            {notes.length === 0 && <div className="empty-section">No notes posted yet.</div>}
            {notes.map((note) => (
              <div key={note.note_id} className="listing-row">
                <div className="listing-title">{note.title}</div>
                <div className="listing-meta">
                  {note.course_code || "No course"}
                  {note.file_type && (
                    <span className="listing-type-tag" style={{ marginLeft: 8 }}>
                      {fileTypeLabel(note.file_type)}
                    </span>
                  )}
                </div>
                <div className="listing-actions">
                  <button className="btn-view" onClick={() => window.open(note.file_url, "_blank")}>View</button>
                  <button className="btn-delete" onClick={() => handleDeleteNote(note.note_id)}>Delete</button>
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center" }}>
              <Link to="/booklistings" className="profile-back">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Listings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">Edit Listing</div>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-group">
                  <label className="modal-label">Book Title *</label>
                  <input className="modal-input" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="modal-group">
                  <label className="modal-label">Author *</label>
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
                  <label className="modal-label">Condition *</label>
                  <select className="modal-select" value={editData.book_condition} onChange={(e) => setEditData({ ...editData, book_condition: e.target.value })}>
                    <option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option>
                  </select>
                </div>
                <div className="modal-group">
                  <label className="modal-label">Price ($)</label>
                  <input className="modal-input" type="number" step="0.01" min="0" value={editData.price} onChange={(e) => setEditData({ ...editData, price: e.target.value })} />
                </div>
                <div className="modal-group">
                  <label className="modal-label">Status</label>
                  <select className="modal-select" value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
                <div className="modal-group modal-full">
                  <label className="modal-label">Notes</label>
                  <textarea className="modal-textarea" value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                </div>
              </div>
              <button className="modal-save" onClick={handleSaveEdit}>Save Changes</button>
              <button className="modal-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
