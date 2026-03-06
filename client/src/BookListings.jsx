import React, { useState, useEffect } from "react";

function BookListings() {
  //States for database books and loading the books
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState(""); 

  // UWM Colors
  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
    lightGray: "#F4F4F4",
  };

  //Fetches data from the backend when the page loads
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch("https://peer-to-peer-book-exchange2.vercel.app/booklistings"); 
        if (!response.ok) throw new Error("Failed to fetch listings");
        
        const data = await response.json();
        setBooks(data);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []); // Runs once if it is empty on mount

  // Filter the books from the database
  let processedBooks = books.filter((book) => {
    const title = book.title || "";
    // NEW: Look for course_code from the DB
    const course = book.course_code || ""; 
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.toLowerCase().includes(searchTerm.toLowerCase());
    
    // NEW: Filter by the course variable
    const matchesCategory = category === "All" || course.includes(category);
    
    return matchesSearch && matchesCategory;
  });

  // Sorts by price
  if (sortOrder === "lowToHigh") {
    processedBooks.sort((a, b) => a.price - b.price);
  } else if (sortOrder === "highToLow") {
    processedBooks.sort((a, b) => b.price - a.price);
  }

  const styles = {
    wrapper: {
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex",
      flexDirection: "column",
    },
    navbar: {
      backgroundColor: colors.black,
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `4px solid ${colors.gold}`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    logo: { color: colors.gold, fontSize: "1.5rem", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" },
    navLinks: { color: colors.white, fontWeight: "600", cursor: "pointer" },
    container: { display: "flex", flexWrap: "wrap", padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%", gap: "2rem" },
    sidebar: { flex: "1 1 250px", backgroundColor: colors.white, padding: "1.5rem", borderRadius: "12px", height: "fit-content", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", borderTop: `6px solid ${colors.gold}` },
    sidebarTitle: { fontSize: "1.2rem", fontWeight: "800", marginBottom: "1rem", borderBottom: `2px solid ${colors.lightGray}`, paddingBottom: "0.5rem" },
    grid: { flex: "3 1 600px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" },
    card: { backgroundColor: colors.white, borderRadius: "10px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", transition: "transform 0.2s ease", display: "flex", flexDirection: "column" },
    cardImage: { width: "100%", height: "160px", objectFit: "cover", borderBottom: `4px solid ${colors.gold}` },
    cardContent: { padding: "1rem", display: "flex", flexDirection: "column", flexGrow: 1 },
    courseBadge: { backgroundColor: colors.black, color: colors.gold, fontSize: "0.7rem", fontWeight: "700", padding: "4px 8px", borderRadius: "4px", alignSelf: "flex-start", marginBottom: "0.5rem", textTransform: "uppercase" },
    bookTitle: { fontSize: "1.1rem", fontWeight: "700", color: colors.darkGray, marginBottom: "0.3rem", lineHeight: "1.3" },
    bookAuthor: { fontSize: "0.9rem", color: "#666", marginBottom: "1rem" },
    cardFooter: { marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.lightGray}`, paddingTop: "0.8rem" },
    price: { fontSize: "1.2rem", fontWeight: "800", color: colors.black },
    buyButton: { backgroundColor: colors.gold, color: colors.black, border: "none", padding: "8px 16px", borderRadius: "20px", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
    input: { width: "100%", padding: "10px", borderRadius: "6px", border: "2px solid #eee", marginBottom: "1rem", fontSize: "0.95rem", boxSizing: "border-box" },
    label: { display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "6px", color: colors.darkGray },
  };

  return (
    <div style={styles.wrapper}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.logo}>UWM Exchange</div>
        <div style={styles.navLinks}>Logout</div>
      </nav>

      <div style={styles.container}>
        {/* Sidebar Filter */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Filters</div>
          
          <label style={styles.label}>Search</label>
          <input 
            style={styles.input} 
            placeholder="Title or Keywords..." 
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

          <label style={styles.label}>Sort by Price</label>
          <select 
            style={styles.input}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = colors.gold}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          >
            <option value="">Relevance (Default)</option>
            <option value="lowToHigh">Price: Low to High</option>
            <option value="highToLow">Price: High to Low</option>
          </select>
        </aside>

        {/* Book Grid */}
        <main style={styles.grid}>
          {loading ? (
            <div style={{color: colors.white, gridColumn: "1 / -1", textAlign: "center"}}>
              <h3>Loading books from database...</h3>
            </div>
          ) : processedBooks.length > 0 ? (
            processedBooks.map((book) => (
              <div 
                key={book.listing_id} // Updated to exact DB name
                style={styles.card}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                {/* Updated to book.image_url */}
                <img 
                  src={book.image_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000"} 
                  alt={book.title} 
                  style={styles.cardImage} 
                />
                <div style={styles.cardContent}>
                  {/* Updated to display the course code (e.g., CompSci 315) */}
                  <div style={styles.courseBadge}>{book.course_code || "General"}</div>
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