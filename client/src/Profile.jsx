import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser, setStoredUser } from "./auth";
import { Link } from "react-router-dom";

function Profile() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notes, setNotes] = useState([]); // ADDED

  // EDIT MODAL STATE
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    listing_id: null,
    title: "",
    author: "",
    edition: "",
    isbn: "",
    course_code: "",
    book_condition: "",
    price: "",
    notes: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("bookExchangeUser");
    if (!stored) return;
    const { id: userId } = JSON.parse(stored);
    if (!userId) return;

    const baseUrl = getApiBaseUrl();

    fetch(`${baseUrl}/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data));

    fetch(`${baseUrl}/api/listings?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data) ? data : []));

    // ADDED
    fetch(`${baseUrl}/Notes?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []));
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const stored = localStorage.getItem("bookExchangeUser");
    if (!stored) return;
    const { id: userId } = JSON.parse(stored);

    setAvatarUploading(true);

    try {
      const baseUrl = getApiBaseUrl();

      // Step 1: get presigned URL from Express
      const res = await fetch(
        `${baseUrl}/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
      );
      const { uploadUrl, publicUrl } = await res.json();

      // Step 2: upload image directly to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Step 3: save the public URL to the user's profile
      await fetch(`${baseUrl}/api/users/${userId}/avatar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      // Step 4: update UI
      setUser((prev) => ({ ...prev, profile_image_url: publicUrl }));
      const storedUser = getStoredUser();
      if (storedUser) {
        setStoredUser({ ...storedUser, profile_image_url: publicUrl });
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }

    setAvatarUploading(false);
  }

  function handleDelete(id) {
    const baseUrl = getApiBaseUrl();

    fetch(`${baseUrl}/api/listings/${id}`, { method: "DELETE" })
      .then(() => {
        setListings((prev) => prev.filter((book) => book.listing_id !== id));
      })
      .catch((err) => console.error("Delete failed:", err));
  }

  function handleEdit(book) {
    setEditData({
      listing_id: book.listing_id,
      title: book.title || "",
      author: book.author || "",
      edition: book.edition || book.Edition || "",
      isbn: book.isbn || "",
      course_code: book.course_code || "",
      book_condition: book.book_condition || "Good",
      price: book.price || "",
      notes: book.notes || "",
    });

    setShowEditModal(true);
  }

  function handleSave(id) {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    })
      .then((res) => res.json())
      .then((updatedBook) => {
        setListings(listings.map((book) => (book.listing_id === parseInt(id) ? updatedBook : book)));
        setEditingId(null);
      });
  }
  async function handleSaveEdit() {
    try {
      const baseUrl = getApiBaseUrl();

      const res = await fetch(`${baseUrl}/api/listings/${editData.listing_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editData.title,
          author: editData.author,
          edition: editData.edition || null,
          isbn: editData.isbn || null,
          course_code: editData.course_code || null,
          book_condition: editData.book_condition,
          condition: editData.book_condition,
          price: Number(editData.price),
          notes: editData.notes || null,
        }),
      });

      const updatedBook = await res.json();

      if (!res.ok) {
        throw new Error(updatedBook.error || "Failed to update listing.");
      }

      setListings((prev) =>
        prev.map((book) =>
          book.listing_id === editData.listing_id ? updatedBook : book
        )
      );

      setShowEditModal(false);
    } catch (err) {
      console.error("Update failed:", err);
      alert(err.message || "Failed to update listing.");
    }
  }

  // ADDED
  function handleDeleteNote(id) {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/Notes/${id}`, { method: "DELETE" });
    setNotes(notes.filter((note) => note.note_id !== id));
  }

  if (!user) return <p>Loading...</p>;

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
  };

  const styles = {
    wrapper: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "calc(100vh - 76px)",
      width: "100vw",
      margin: 0,
      padding: "20px",
      boxSizing: "border-box",
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.5)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
    card: {
      width: "100%",
      maxWidth: "520px",
      backgroundColor: colors.white,
      padding: "2.5rem",
      borderRadius: "12px",
      boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
      borderTop: `8px solid ${colors.gold}`,
      textAlign: "center",
    },
      avatarWrapper: {
    position: "relative",
    width: "100px",
    height: "100px",
    margin: "0 auto 1rem",
    cursor: "pointer",
    display: "inline-block",
    },
    avatar: {
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      objectFit: "cover",
      border: `4px solid ${colors.gold}`,
      display: "block",
    },
    avatarOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.gold,
      borderRadius: "50%",
      width: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "700",
      color: colors.black,
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    },
    mainHeading: {
      fontSize: "1.8rem",
      fontWeight: "800",
      color: colors.black,
      marginBottom: "0.5rem",
    },
    uwmBadge: {
      display: "inline-block",
      backgroundColor: colors.black,
      color: colors.gold,
      fontSize: "0.75rem",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "1px",
      padding: "4px 12px",
      borderRadius: "20px",
      marginBottom: "1.5rem",
    },
    instructions: {
      color: "#666",
      marginBottom: "1rem",
      fontSize: "0.95rem",
    },
    listingRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "0.9rem",
      marginBottom: "10px",
      textAlign: "left",
      flexWrap: "wrap",
    },
    listingText: {
      flex: 1,
      color: colors.darkGray,
    },
    btn: {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      fontWeight: "700",
      fontSize: "0.8rem",
      cursor: "pointer",
    },
    footerLink: {
      marginTop: "1.5rem",
      fontSize: "0.9rem",
      color: "#555",
    },
    link: {
      color: colors.black,
      fontWeight: "bold",
      textDecoration: "none",
      borderBottom: `2px solid ${colors.gold}`,
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
      padding: "20px",
      boxSizing: "border-box",
    },
    modalCard: {
      width: "100%",
      maxWidth: "700px",
      backgroundColor: colors.white,
      padding: "2rem",
      borderRadius: "12px",
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      textAlign: "left",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "12px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
    },
    fullWidth: {
      gridColumn: "1 / -1",
    },
    label: {
      fontSize: "0.8rem",
      fontWeight: "700",
      marginBottom: "4px",
      color: colors.darkGray,
      textTransform: "uppercase",
    },
    input: {
      padding: "10px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      fontSize: "0.95rem",
      boxSizing: "border-box",
    },
    textarea: {
      padding: "10px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      minHeight: "100px",
      resize: "vertical",
      fontSize: "0.95rem",
      boxSizing: "border-box",
    },
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=FFBD00&color=000&size=100`;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>

        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <label style={{ ...styles.avatarWrapper, margin: 0 }} title="Click to change photo">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
            <img
              src={user.profile_image_url || defaultAvatar}
              alt="Profile"
              style={{ ...styles.avatar, opacity: avatarUploading ? 0.5 : 1 }}
            />
            <div style={styles.avatarOverlay}>
              {avatarUploading ? "..." : "✎"}
            </div>
          </label>
        </div>

        <h1 style={styles.mainHeading}>{user.full_name}</h1>
        <div style={styles.uwmBadge}>UWM Panther</div>
        <p style={styles.instructions}>{user.email}</p>

        <h2 style={styles.mainHeading}>My Listings ({listings.length})</h2>

        {listings.map((book) => (
          <div key={book.listing_id} style={styles.listingRow}>
            <span style={{ fontWeight: "700" }}>{book.title}</span>
            <span style={styles.listingText}>
              {book.author} · {book.course_code} · {book.book_condition} · ${book.price}
            </span>

            <button
              style={{ ...styles.btn, backgroundColor: colors.gold, color: colors.black }}
              onClick={() => handleEdit(book)}
            >
              Edit
            </button>

            <button
              style={{
                ...styles.btn,
                backgroundColor: "#fff",
                color: "red",
                border: "1px solid red",
              }}
              onClick={() => handleDelete(book.listing_id)}
            >
              Delete
            </button>
          </div>
        ))}

        {/* ADDED: notes section */}
        <h2 style={{ ...styles.mainHeading, marginTop: "1.5rem" }}>My Notes ({notes.length})</h2>

        {notes.map((note) => (
          <div key={note.note_id} style={styles.listingRow}>
            <span style={{ fontWeight: "700" }}>📄 {note.title}</span>
            <span style={styles.listingText}>
              {note.course_code || "No course"}
            </span>
            <button
              style={{ ...styles.btn, backgroundColor: colors.gold, color: colors.black }}
              onClick={() => window.open(note.pdf_url, "_blank")}
            >
              View
            </button>
            <button
              style={{ ...styles.btn, backgroundColor: "#fff", color: "red", border: "1px solid red" }}
              onClick={() => handleDeleteNote(note.note_id)}
            >
              Delete
            </button>
          </div>
        ))}


        <div style={styles.footerLink}>
          <Link to="/booklistings" style={styles.link}>
            ← Back to Listings
          </Link>
        </div>
      </div>

      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.mainHeading}>Edit Book Listing</h2>

            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Book Title *</label>
                <input
                  style={styles.input}
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Author *</label>
                <input
                  style={styles.input}
                  value={editData.author}
                  onChange={(e) => setEditData({ ...editData, author: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Edition</label>
                <input
                  style={styles.input}
                  value={editData.edition}
                  onChange={(e) => setEditData({ ...editData, edition: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>ISBN</label>
                <input
                  style={styles.input}
                  value={editData.isbn}
                  onChange={(e) => setEditData({ ...editData, isbn: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Course Code</label>
                <input
                  style={styles.input}
                  value={editData.course_code}
                  onChange={(e) => setEditData({ ...editData, course_code: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Condition *</label>
                <select
                  style={styles.input}
                  value={editData.book_condition}
                  onChange={(e) =>
                    setEditData({ ...editData, book_condition: e.target.value })
                  }
                >
                  <option>New</option>
                  <option>Like New</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Price ($)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                />
              </div>

              <div style={{ ...styles.inputGroup, ...styles.fullWidth }}>
                <label style={styles.label}>Notes</label>
                <textarea
                  style={styles.textarea}
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                />
              </div>
            </div>

            <button
              style={{
                ...styles.btn,
                backgroundColor: colors.gold,
                color: colors.black,
                width: "100%",
                marginTop: "12px",
                padding: "12px",
              }}
              onClick={handleSaveEdit}
            >
              Save Changes
            </button>

            <button
              style={{
                ...styles.btn,
                backgroundColor: "#eee",
                color: colors.darkGray,
                width: "100%",
                marginTop: "8px",
                padding: "12px",
              }}
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;