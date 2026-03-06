import React, { useState, useEffect } from "react";

function Profile() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("bookExchangeUser");
    if (!stored) return;
    const { id: userId } = JSON.parse(stored);
    if (!userId) return;

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data));

    fetch(`/api/listings?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data) ? data : []));
  }, []);

  function handleDelete(id) {
    fetch(`/api/listings/${id}`, { method: "DELETE" });
    setListings(listings.filter((book) => book.listing_id !== id));
  }

  function handleEdit(book) {
    setEditingId(book.listing_id);
    setEditData({ price: book.price, condition: book.book_condition });
  }

  function handleSave(id) {
    fetch(`/api/listings/${id}`, {
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
      minHeight: "100vh",
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

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
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

        <div style={styles.footerLink}>
          <a href="/booklistings" style={styles.link}>← Back to Listings</a>
        </div>
      </div>
    </div>
  );
}

export default Profile;