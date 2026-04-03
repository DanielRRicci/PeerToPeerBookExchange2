import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

function BookListings() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState("All");
  const [category, setCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [editData, setEditData] = useState({
    listing_id: null, title: "", author: "", edition: "", isbn: "",
    course_code: "", book_condition: "", price: "", notes: "", status: "Available",
  });

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const [booksRes, notesRes] = await Promise.all([
          fetch(`${baseUrl}/BookListings`),
          fetch(`${baseUrl}/Notes`),
        ]);
        const booksData = booksRes.ok ? await booksRes.json() : [];
        const notesData = notesRes.ok ? await notesRes.json() : [];
        const combined = [
          ...booksData.map((b) => ({ ...b, _type: "book" })),
          ...notesData.map((n) => ({ ...n, _type: "notes", listing_id: `n-${n.note_id}`, price: 0 })),
        ];
        setBooks(combined);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  let processedBooks = books.filter((book) => {
    const searchLower = searchTerm.toLowerCase();
    const title = (book.title || "").toLowerCase();
    const course = (book.course_code || "").toLowerCase();
    const isbn = (book.isbn || "").toLowerCase();
    const description = (book.description || "").toLowerCase();

    let matchesSearch = true;
    if (searchTerm.trim() !== "") {
      if (searchBy === "All") matchesSearch = title.includes(searchLower) || course.includes(searchLower) || author.includes(searchLower) || isbn.includes(searchLower) || description.includes(searchLower);
      else if (searchBy === "Title") matchesSearch = title.includes(searchLower);
      else if (searchBy === "Author") matchesSearch = author.includes(searchLower);
      else if (searchBy === "Course") matchesSearch = course.includes(searchLower);
      else if (searchBy === "ISBN") matchesSearch = isbn.includes(searchLower);
    }

    const matchesCategory = category === "All" || course.includes(category.toLowerCase());
    const matchesType =
      typeFilter === "All" ||
      (typeFilter === "Books" && book._type === "book") ||
      (typeFilter === "Notes" && book._type === "notes");

    return matchesSearch && matchesCategory && matchesType;
  });

  if (sortOrder === "lowToHigh") processedBooks.sort((a, b) => a.price - b.price);
  else if (sortOrder === "highToLow") processedBooks.sort((a, b) => b.price - a.price);

  function handleContact(book) {
    const stored = localStorage.getItem("bookExchangeUser");
    const currentUser = stored ? JSON.parse(stored) : null;
    if (currentUser && currentUser.id === book.user_id) return;
    navigate("/messages", {
      state: {
        receiverId: book.user_id,
        receiverName: book.seller_name || "Seller",
        listingId: book.listing_id,
        bookTitle: book.title,
      },
    });
  }
  // opens edit mode for a listing only
  function handleEditClick(book) {
    setEditingId(book.listing_id);

    setEditData({
      listing_id: book.listing_id,
      title: book.title || "",
      author: book.author || "",
      edition: book.edition || "",
      isbn: book.isbn || "",
      course_code: book.course_code || "",
      book_condition: book.book_condition || "Good",
      price: book.price || "",
      notes: book.notes || "",
      status: book.status || "Available",
    });

     setShowEditModal(true);
  }

  //  cancel edit mode
  function handleCancelEdit() {
    setEditingId(null);
    setShowEditModal(false);
    setEditData({
      listing_id: null,
      title: "",
      author: "",
      edition: "",
      isbn: "",
      course_code: "",
      book_condition: "",
      price: "",
      notes: "",
      status: "Available",
    });
  }

  // save updated listing
  async function handleSaveEdit(book) {
    try {
      const baseUrl = getApiBaseUrl();

      if (!editData.listing_id) {
      throw new Error("Missing listing id.");
    }

      const payload = {
        title: editData.title,
        author: editData.author,
        edition: editData.edition || null,
        isbn: editData.isbn || null,
        course_code: editData.course_code || null,
        book_condition: editData.book_condition,
        price: Number(editData.price),
        notes: editData.notes || null,
        status: editData.status,
      };

      const res = await fetch(`${baseUrl}/BookListings/${editData.listing_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update listing");
      }

      let updatedBook;
      try {
        updatedBook = await res.json();
      } catch {
        updatedBook = payload;
      }

      setBooks((prev) =>
        prev.map((item) =>
          item._type === "book" && item.listing_id === editData.listing_id
            ? { ...item, ...updatedBook, _type: "book" }
            : item
        )
      );

      handleCancelEdit();
    } catch (error) {
      console.error("Save error:", error);
      alert("Could not save changes.");
    }
  }

  // delete listing
  async function handleDeleteConfirmed(book) {
    if (!deleteTarget) return;

    try {
      const baseUrl = getApiBaseUrl();

      const res = await fetch(`${baseUrl}/BookListings/${deleteTarget.listing_id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete listing");
      }

      setBooks((prev) =>
        prev.filter(
          (item) =>
            !(item._type === "book" && item.listing_id === deleteTarget.listing_id)
        )
      );

      if (editingId === deleteTarget.listing_id) {
        handleCancelEdit();
      }

      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete listing.");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .listings-page {
          min-height: calc(100vh - 64px);
          width: 100vw;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .listings-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 10% 60%, rgba(255,189,0,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 85% 25%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .listings-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .listings-container {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          padding: 2rem;
          max-width: 1240px;
          margin: 0 auto;
          gap: 1.75rem;
        }

        /* ── Sidebar ── */
        .listings-sidebar {
          flex: 1 1 240px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,189,0,0.1);
          overflow: hidden;
          height: fit-content;
        }
        .sidebar-header {
          background: #0a0a0a;
          padding: 18px 20px;
          border-bottom: 3px solid #FFBD00;
        }
        .sidebar-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 2px;
          color: #FFBD00;
        }
        .sidebar-body {
          padding: 20px;
        }

        .filter-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 6px;
        }
        .filter-input {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid #e8e8e8;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #0a0a0a;
          background: #fafafa;
          outline: none;
          margin-bottom: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .filter-input:focus {
          border-color: #FFBD00;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }

        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 18px;
        }
        .radio-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: #555;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1.5px solid #e8e8e8;
          background: #fafafa;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .radio-chip input { display: none; }
        .radio-chip:has(input:checked) {
          background: #0a0a0a;
          color: #FFBD00;
          border-color: #0a0a0a;
        }
        .radio-chip:hover:not(:has(input:checked)) {
          border-color: #FFBD00;
          color: #0a0a0a;
        }

        .filter-divider {
          height: 1px;
          background: #f0f0f0;
          margin: 4px 0 16px;
        }

        /* ── Grid ── */
        .listings-grid {
          flex: 3 1 600px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.25rem;
          align-content: start;
        }

        .book-card {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 35px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }
        .book-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .book-card-img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-bottom: 3px solid #FFBD00;
        }
        .book-card-img-notes {
          width: 100%;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
          border-bottom: 3px solid #FFBD00;
          font-size: 3rem;
        }

        .book-card-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .badge-course {
          display: inline-block;
          background: #0a0a0a;
          color: #FFBD00;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          align-self: flex-start;
          margin-bottom: 8px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .badge-notes {
          display: inline-block;
          background: #FFBD00;
          color: #0a0a0a;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          align-self: flex-start;
          margin-bottom: 8px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .badge-status {
          display: inline-block;
          background: #f4f4f4;
          color: #333;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          align-self: flex-start;
          margin-bottom: 8px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .book-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 3px;
          line-height: 1.3;
        }
        .book-author {
          font-size: 0.85rem;
          color: #777;
          margin-bottom: 10px;
        }
        .book-description {
          font-size: 0.82rem;
          color: #999;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f0f0f0;
          padding-top: 10px;
          gap: 8px;
          flex-wrap:wrap;
        }
        .card-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.3rem;
          letter-spacing: 1px;
          color: #0a0a0a;
        }
        .card-btn-group { display: flex; gap: 6px; }

        .btn-primary {
          background: #FFBD00;
          color: #0a0a0a;
          border: none;
          padding: 7px 13px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-primary:hover { background: #e6a800; transform: translateY(-1px); }

        .btn-secondary {
          background: #0a0a0a;
          color: #FFBD00;
          border: none;
          padding: 7px 13px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-secondary:hover { background: #222; transform: translateY(-1px); }
        
        .btn-danger {
          background: #b3261e;
          color: white;
          border: none;
          padding: 7px 13px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-danger:hover {
          background: #8f1f18;
          transform: translateY(-1px);
        }
        .listings-empty {
          color: rgba(255,255,255,0.6);
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 0;
        }
        .listings-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .listings-empty-text {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: rgba(255,255,255,0.5);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .modal-card {
          width: 100%;
          max-width: 700px;
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .modal-header {
          background: #0a0a0a;
          padding: 20px 24px;
          border-bottom: 3px solid #FFBD00;
        }
        .modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: #FFBD00;
        }
        .modal-body {
          padding: 22px;
        }
        .modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .modal-group {
          display: flex;
          flex-direction: column;
        }
        .modal-full {
          grid-column: 1 / -1;
        }
        .modal-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 6px;
        }
        .modal-input,
        .modal-textarea,
        .modal-select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #ddd;
          border-radius: 10px;
          font-size: 14px;
          background: #fafafa;
          outline: none;
        }
        .modal-input:focus,
        .modal-textarea:focus,
        .modal-select:focus {
          border-color: #FFBD00;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }
        .modal-textarea {
          min-height: 100px;
          resize: vertical;
        }
        .modal-save {
          margin-top: 18px;
          width: 100%;
          background: #FFBD00;
          color: #0a0a0a;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .modal-cancel {
          margin-top: 10px;
          width: 100%;
          background: #0a0a0a;
          color: #FFBD00;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .delete-modal {
          background: white;
          width: 90%;
          max-width: 400px;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .delete-modal h3 {
          margin-bottom: 8px;
          color: #0a0a0a;
        }
        .delete-modal p {
          color: #555;
          margin-bottom: 18px;
        }
        .delete-modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
        }
      `}</style>

      <div className="listings-page">
        <div className="listings-container">

          {/* Sidebar */}
          <aside className="listings-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title">Filters</div>
            </div>
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
                    <input
                      type="radio"
                      name="searchBy"
                      value={opt}
                      checked={searchBy === opt}
                      onChange={(e) => setSearchBy(e.target.value)}
                    />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="filter-divider" />

              <label className="filter-label">Listing Type</label>
              <div className="radio-group">
                {["All", "Books", "Notes"].map((opt) => (
                  <label key={opt} className="radio-chip">
                    <input
                      type="radio"
                      name="typeFilter"
                      value={opt}
                      checked={typeFilter === opt}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    />
                    {opt}
                  </label>
                ))}
              </div>

              <div className="filter-divider" />

              <label className="filter-label">Department</label>
              <select
                className="filter-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="All">All Departments</option>
                <option value="Math">Mathematics</option>
                <option value="CompSci">Computer Science</option>
                <option value="Psych">Psychology</option>
                <option value="Chem">Chemistry</option>
                <option value="Art">Arts &amp; Humanities</option>
              </select>

              <label className="filter-label">Sort by Price</label>
              <select
                className="filter-input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="">Relevance (Default)</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
              </select>
            </div>
          </aside>

          {/* Grid */}
          <main className="listings-grid">
            {loading ? (
              <div className="listings-empty">
                <div className="listings-empty-icon">📚</div>
                <div className="listings-empty-text">Loading listings…</div>
              </div>
            ) : processedBooks.length > 0 ? (
              processedBooks.map((book) => {
                const stored = localStorage.getItem("bookExchangeUser");
                const currentUser = stored ? JSON.parse(stored) : null;
                const isOwnListing = currentUser && currentUser.id === book.user_id;
                const isNotes = book._type === "notes";
                const isEditing = !isNotes && editingId === book.listing_id;

                return (
                  <div key={book.listing_id} className="book-card">
                    {isNotes ? (
                      <div className="book-card-img-notes">📄</div>
                    ) : (
                      <img
                        src={book.image_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000"}
                        alt={book.title}
                        className="book-card-img"
                      />
                    )}

                    <div className="book-card-body">
                          <div className={isNotes ? "badge-notes" : "badge-course"}>
                            {isNotes ? "📄 Notes PDF" : (book.course_code || "General")}
                          </div>
                          
                          {!isNotes && (
                            <div className="badge-status">
                              {book.status || "Available"}
                            </div>
                          )}

                          <div className="book-title">{book.title}</div>
                          <div className="book-author">
                            {isNotes ? (book.course_code || "") : book.author}
                          </div>
                          {isNotes && book.description && (
                            <div className="book-description">{book.description}</div>
                          )}

                          <div className="card-footer">
                            <div className="card-price">{isNotes ? "Free" : `$${book.price}`}</div>
                            <div className="card-btn-group">
                              {isNotes ? (
                                <button className="btn-primary" onClick={() => window.open(book.pdf_url, "_blank")}>
                                  View PDF
                                </button>
                              ) : (
                                <>
                                  <button className="btn-primary" onClick={() => navigate(`/listings/${book.listing_id}`)}>Details</button>
                                  {!isOwnListing && (
                                    <button className="btn-secondary" onClick={() => handleContact(book)}>
                                      Contact
                                    </button>
                                  )}
                                  {isOwnListing && (
                                    <>
                                      <button
                                        className="btn-secondary"
                                        onClick={() => handleEditClick(book)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn-danger"
                                        onClick={() => setDeleteTarget(book)}
                                      >
                                        Delete
                                      </button>
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

        {showEditModal && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCancelEdit();
            }}
          >
            <div className="modal-card">
              <div className="modal-header">
                <div className="modal-title">Edit Listing</div>
              </div>

              <div className="modal-body">
                <div className="modal-grid">
                  <div className="modal-group">
                    <label className="modal-label">Title</label>
                    <input
                      className="modal-input"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Author</label>
                    <input
                      className="modal-input"
                      value={editData.author}
                      onChange={(e) =>
                        setEditData({ ...editData, author: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Edition</label>
                    <input
                      className="modal-input"
                      value={editData.edition}
                      onChange={(e) =>
                        setEditData({ ...editData, edition: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">ISBN</label>
                    <input
                      className="modal-input"
                      value={editData.isbn}
                      onChange={(e) =>
                        setEditData({ ...editData, isbn: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Course Code</label>
                    <input
                      className="modal-input"
                      value={editData.course_code}
                      onChange={(e) =>
                        setEditData({ ...editData, course_code: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Condition</label>
                    <select
                      className="modal-select"
                      value={editData.book_condition}
                      onChange={(e) =>
                        setEditData({ ...editData, book_condition: e.target.value })
                      }
                    >
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Price</label>
                    <input
                      className="modal-input"
                      type="number"
                      value={editData.price}
                      onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                      }
                    />
                  </div>

                  <div className="modal-group">
                    <label className="modal-label">Status</label>
                    <select
                      className="modal-select"
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      <option value="Available">Available</option>
                      <option value="Pending">Pending</option>
                      <option value="Sold">Sold</option>
                    </select>
                  </div>

                  <div className="modal-group modal-full">
                    <label className="modal-label">Notes</label>
                    <textarea
                      className="modal-textarea"
                      value={editData.notes}
                      onChange={(e) =>
                        setEditData({ ...editData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>

                <button className="modal-save" onClick={handleSaveEdit}>
                  Save Changes
                </button>
                <button className="modal-cancel" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h3>Delete Listing?</h3>
              <p>
                Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
              </p>
              <div className="delete-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDeleteConfirmed}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default BookListings;