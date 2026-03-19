import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser, setStoredUser } from "./auth";

function Profile() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notes, setNotes] = useState([]); // ADDED

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
    fetch(`${baseUrl}/api/listings/${id}`, { method: "DELETE" });
    setListings(listings.filter((book) => book.listing_id !== id));
  }

  function handleEdit(book) {
    setEditingId(book.listing_id);
    setEditData({ price: book.price, condition: book.book_condition });
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
    input: {
      flex: 1,
      padding: "8px 10px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "0.9rem",
      boxSizing: "border-box",
      minWidth: "60px",
    },
    select: {
      flex: 1,
      padding: "8px 10px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "0.9rem",
      backgroundColor: colors.white,
      minWidth: "80px",
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
    editRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "10px",
      flexWrap: "wrap",
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
          <div key={book.listing_id}>
            {editingId === book.listing_id ? (
              <div style={styles.editRow}>
                <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{book.title}</span>
                <input
                  style={styles.input}
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                  placeholder="Price"
                />
                <select
                  style={styles.select}
                  value={editData.condition}
                  onChange={(e) => setEditData({ ...editData, condition: e.target.value })}
                >
                  <option>New</option>
                  <option>Like New</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                </select>
                <button style={{ ...styles.btn, backgroundColor: colors.gold, color: colors.black }} onClick={() => handleSave(book.listing_id)}>Save</button>
                <button style={{ ...styles.btn, backgroundColor: "#eee", color: colors.darkGray }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={styles.listingRow}>
                <span style={{ fontWeight: "700" }}>{book.title}</span>
                <span style={styles.listingText}>
                  {book.author} · {book.course_code} · {book.book_condition} · ${book.price}
                </span>
                <button style={{ ...styles.btn, backgroundColor: colors.gold, color: colors.black }} onClick={() => handleEdit(book)}>Edit</button>
                <button style={{ ...styles.btn, backgroundColor: "#fff", color: "red", border: "1px solid red" }} onClick={() => handleDelete(book.listing_id)}>Delete</button>
              </div>
            )}
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
          <a href="/booklistings" style={styles.link}>← Back to Listings</a>
        </div>
      </div>
    </div>
  );
}

export default Profile;
