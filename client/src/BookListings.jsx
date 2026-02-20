import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function BookListings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const navigate = useNavigate();

  // UWM Identity Colors (Reused from Login)
  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
    lightGray: "#F4F4F4",
  };

  // Mock Data: In a real app, this comes from a database/API
  const books = [
    { id: 1, title: "Calculus: Early Transcendentals", author: "James Stewart", price: 45, course: "Math 231", condition: "Good", image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000" },
    { id: 2, title: "Intro to Java Programming", author: "Daniel Liang", price: 60, course: "CompSci 250", condition: "Like New", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000" },
    { id: 3, title: "Psychology: Themes & Variations", author: "Wayne Weiten", price: 25, course: "Psych 101", condition: "Fair", image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1000" },
    { id: 4, title: "Chemistry: The Central Science", author: "Brown & LeMay", price: 80, course: "Chem 100", condition: "New", image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=1000" },
    { id: 5, title: "Art History Vol 1", author: "Marilyn Stokstad", price: 30, course: "ArtHist 101", condition: "Good", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000" },
  ];

  // Filtering Logic
  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "All" || book.course.includes(category);
    return matchesSearch && matchesCategory;
  });

  const styles = {
    // Main page wrapper - Reusing the background from Login
    wrapper: {
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed", // Keeps bg still while scrolling
      display: "flex",
      flexDirection: "column",
    },
    // Navigation Bar
    navbar: {
      backgroundColor: colors.black,
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `4px solid ${colors.gold}`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    logo: {
      color: colors.gold,
      fontSize: "1.5rem",
      fontWeight: "800",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    // navLinks: {
    //   color: colors.white,
    //   fontWeight: "600",
    //   cursor: "pointer",
    // },
    navActions: {
      display: "flex",
    gap: "0.75rem",
    },
    navButton: {
      backgroundColor: colors.gold,
      color: colors.black,
      border: "none",
      padding: "8px 14px",
      borderRadius: "20px",
      fontWeight: "700",
      cursor: "pointer",
    },
    // Layout for Content
    container: {
      display: "flex",
      flexWrap: "wrap", // Responsive wrap
      padding: "2rem",
      maxWidth: "1200px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    },
    // Sidebar / Filters Panel
    sidebar: {
      flex: "1 1 250px", // Grow 1, Shrink 1, Base 250px
      backgroundColor: colors.white,
      padding: "1.5rem",
      borderRadius: "12px",
      height: "fit-content",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      borderTop: `6px solid ${colors.gold}`, // Matching the card style
    },
    sidebarTitle: {
      fontSize: "1.2rem",
      fontWeight: "800",
      marginBottom: "1rem",
      borderBottom: `2px solid ${colors.lightGray}`,
      paddingBottom: "0.5rem",
    },
    // Main Grid Area
    grid: {
      flex: "3 1 600px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: "1.5rem",
    },
    // Individual Book Card
    card: {
      backgroundColor: colors.white,
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
      transition: "transform 0.2s ease",
      display: "flex",
      flexDirection: "column",
    },
    cardImage: {
      width: "100%",
      height: "160px",
      objectFit: "cover",
      borderBottom: `4px solid ${colors.gold}`,
    },
    cardContent: {
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
    },
    courseBadge: {
      backgroundColor: colors.black,
      color: colors.gold,
      fontSize: "0.7rem",
      fontWeight: "700",
      padding: "4px 8px",
      borderRadius: "4px",
      alignSelf: "flex-start",
      marginBottom: "0.5rem",
      textTransform: "uppercase",
    },
    bookTitle: {
      fontSize: "1.1rem",
      fontWeight: "700",
      color: colors.darkGray,
      marginBottom: "0.3rem",
      lineHeight: "1.3",
    },
    bookAuthor: {
      fontSize: "0.9rem",
      color: "#666",
      marginBottom: "1rem",
    },
    cardFooter: {
      marginTop: "auto", // Pushes footer to bottom
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: `1px solid ${colors.lightGray}`,
      paddingTop: "0.8rem",
    },
    price: {
      fontSize: "1.2rem",
      fontWeight: "800",
      color: colors.black,
    },
    buyButton: {
      backgroundColor: colors.gold,
      color: colors.black,
      border: "none",
      padding: "8px 16px",
      borderRadius: "20px",
      fontWeight: "700",
      fontSize: "0.85rem",
      cursor: "pointer",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
    // Form Elements (Reused styles)
    input: {
      width: "100%",
      padding: "10px",
      borderRadius: "6px",
      border: "2px solid #eee",
      marginBottom: "1rem",
      fontSize: "0.95rem",
      boxSizing: "border-box",
    },
    label: {
      display: "block",
      fontSize: "0.85rem",
      fontWeight: "700",
      marginBottom: "6px",
      color: colors.darkGray,
    },
  };

  return (
    <div style={styles.wrapper}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.logo}>UWM Exchange</div>
        {/* <div style={styles.navLinks}>Logout</div> */}
        <div style={styles.navActions}>
          <button style={styles.navButton} onClick={() => navigate("/profile")}>
            Profile
          </button>
          <button style={styles.navButton} onClick={() => navigate("/post")}>
            Post Book
          </button>
          <button style={styles.navButton} onClick={() => navigate("/login")}>
            Logout
          </button>
        </div>
      </nav>

      <div style={styles.container}>
        {/* Sidebar Filter */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Filters</div>
          
          <label style={styles.label}>Search</label>
          <input 
            style={styles.input} 
            placeholder="Title, ISBN, or Course..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = colors.gold}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          />

          <label style={styles.label}>Department</label>
          <select 
            style={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = colors.gold}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          >
            <option value="All">All Departments</option>
            <option value="Math">Mathematics</option>
            <option value="CompSci">Computer Science</option>
            <option value="Psych">Psychology</option>
            <option value="Chem">Chemistry</option>
            <option value="Art">Arts & Humanities</option>
          </select>

          <label style={styles.label}>Condition</label>
          <div style={{fontSize: "0.9rem", color: "#555"}}>
            <div style={{marginBottom: "5px"}}><input type="checkbox" /> New / Like New</div>
            <div style={{marginBottom: "5px"}}><input type="checkbox" /> Good Used</div>
            <div style={{marginBottom: "5px"}}><input type="checkbox" /> Fair / Heavily Used</div>
          </div>
        </aside>

        {/* Book Grid */}
        <main style={styles.grid}>
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <div 
                key={book.id} 
                style={styles.card}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <img src={book.image} alt={book.title} style={styles.cardImage} />
                <div style={styles.cardContent}>
                  <div style={styles.courseBadge}>{book.course}</div>
                  <div style={styles.bookTitle}>{book.title}</div>
                  <div style={styles.bookAuthor}>{book.author}</div>
                  
                  <div style={styles.cardFooter}>
                    <div style={styles.price}>${book.price}</div>
                    <button style={styles.buyButton}>Details</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{color: colors.white, gridColumn: "1 / -1", textAlign: "center"}}>
              <h3>No books found matching your criteria.</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default BookListings;