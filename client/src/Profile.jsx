import React, { useState } from "react";

function Profile() {
  // user's info
  const [user] = useState({
    fullName: "Pounce Panther",
    email: "ppanther@uwm.edu",
    bio: "CS major selling my old books!",
  });

  // user's book listings
  const [listings] = useState([
    {
      id: 1,
      title: "Discrete Math",
      author: "C. Cheng",
      price: "$10",
      condition: "Good",
      course: "CS 123",
    },
    {
      id: 2,
      title: "Computer Architecture",
      author: "J. Thomas",
      price: "$30",
      condition: "Fair",
      course: "CS 456",
    },
    {
      id: 3,
      title: "Database Systems",
      author: "A. Post",
      price: "$20",
      condition: "Like New",
      course: "CS 789",
    },
  ]);

  // colors from Login.js
  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
  };

  // styles from Login.js
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
    instructions: {
      color: "#666",
      marginBottom: "2rem",
      fontSize: "0.95rem",
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
    inputGroup: {
      textAlign: "left",
      marginBottom: "1rem",
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

        {/* show user's name */}
        <h1 style={styles.mainHeading}>{user.fullName}</h1>

        {/* show UWM badge */}
        <div style={styles.uwmBadge}>UWM Panther</div>

        {/* show user's email */}
        <p style={styles.instructions}>{user.email}</p>

        {/* show user's bio */}
        <p style={styles.instructions}>{user.bio}</p>

        {/* show how many books user listed */}
        <h2 style={styles.mainHeading}>My Listings ({listings.length})</h2>

        {/* loop through each book and display it */}
        {listings.map((book) => (
          <div key={book.id} style={styles.inputGroup}>
            <label style={styles.label}>{book.title}</label>
            <div style={styles.input}>
              {book.author} · {book.course} · {book.condition} · {book.price}
            </div>
          </div>
        ))}

        {/* link back to login page */}
        <div style={styles.footerLink}>
          <a href="/login" style={styles.link}>← Back to Login</a>
        </div>

      </div>
    </div>
  );
}

export default Profile;