import React, { useState } from "react";

function PostBook() {
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
  });

  const [imageFile, setImageFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("New Post:", formData, imageFile);
  };

  // Same styling 
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
      backgroundImage:
        'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.55)), url("https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop")',
      backgroundPosition: "center",
    },
    card: {
      width: "100%",
      maxWidth: "450px",
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
    inputGroup: {
      textAlign: "left",
      marginBottom: "1rem",
    },
    label: {
      display: "block",
      fontSize: "0.8rem",
      fontWeight: "700",
      marginBottom: "4px",
      color: colors.darkGray,
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      padding: "10px 15px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "1rem",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "10px 15px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "1rem",
      boxSizing: "border-box",
      minHeight: "90px",
      resize: "vertical",
    },
    button: {
      width: "100%",
      padding: "14px",
      backgroundColor: colors.black,
      color: colors.gold,
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      fontSize: "1rem",
      cursor: "pointer",
      marginTop: "15px",
      textTransform: "uppercase",
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
        <h1 style={styles.mainHeading}>Post a Book</h1>
        <div style={styles.uwmBadge}>Listings</div>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Book Title *</label>
            <input
              style={styles.input}
              type="text"
              name="title"
              placeholder="Fundamentals of Electric Circuits"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Price ($) *</label>
            <input
              style={styles.input}
              type="text"
              name="price"
              placeholder="25"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              name="description"
              placeholder="Any highlights, wear, missing pages, etc."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <button type="submit" style={styles.button}>
            Post Listing
          </button>
        </form>

        <div style={styles.footerLink}>
          Back to <a href="/login" style={styles.link}>Sign In</a>
        </div>
      </div>
    </div>
  );
}

export default PostBook;
