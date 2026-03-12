import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { clearStoredUser, getStoredUser } from "./auth";

function BookListings() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("");
  const currentUser = getStoredUser();

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
    lightGray: "#F4F4F4",
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch("http://localhost:5000/BookListings");
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
  }, []);

  let processedBooks = books.filter((book) => {
    const title = book.title || "";
    const course = book.course_code || "";
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "All" || course.includes(category);
    return matchesSearch && matchesCategory;
  });

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
      backgroundImage:
        'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
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
    logo: {
      color: colors.gold,
      fontSize: "1.5rem",
      fontWeight: "800",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    navLinks: {
      display: "flex",
      gap: "16px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    navLink: {
      color: colors.white,
      fontWeight: "600",
      cursor: "pointer",
      textDecoration: "none",
      fontSize: "0.9rem",
    },
    userInfo: {
      color: colors.white,
      fontWeight: "600",
      fontSize: "0.9rem",
    },
    container: {
      display: "flex",
      flexWrap: "wrap",
      padding: "2rem",
      maxWidth: "1200px",
      margin: "0 auto",
      width: "100%",
      gap: "2rem",
    },
    sidebar: {
      flex: "1 1 250px",
      backgroundColor: colors.white,
      padding: "1.5rem",
      borderRadius: "12px",
      height: "fit-content",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      borderTop: `6px solid ${colors.gold}`,
    },
    sidebarTitle: {
      fontSize: "1.2rem",
      fontWeight: "800",
      marginBottom: "1rem",
      borderBottom: `2px solid ${colors.lightGray}`,
      paddingBottom: "0.5rem",
    },
    grid: {
      flex: "3 1 600px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: "1.5rem",
    },
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
      marginTop: "auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: `1px solid ${colors.lightGray}`,
      paddingTop: "0.8rem",
      gap: "8px",
    },
    price: {
      fontSize: "1.2rem",
      fontWeight: "800",
      color: colors.black,
    },
    buttonGroup: {
      display: "flex",
      gap: "6px",
    },
    buyButton: {
      backgroundColor: colors.gold,
      color: colors.black,
      border: "none",
      padding: "8px 14px",
      borderRadius: "20px",
      fontWeight: "700",
      fontSize: "0.8rem",
      cursor: "pointer",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
    contactButton: {
      backgroundColor: colors.black,
      color: colors.gold,
      border: "none",
      padding: "8px 14px",
      borderRadius: "20px",
      fontWeight: "700",
      fontSize: "0.8rem",
      cursor: "pointer",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
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

  function handleContact(book) {
    // Get the logged-in user so we don't show Contact on our own listings
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

  async function handleLogout() {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id ?? null }),
      });
    } catch (_error) {
      // Clear local auth even if the API call fails.
    }

    clearStoredUser();
    navigate("/login");
  }

  const displayName =
    currentUser?.username ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : null);

  return (
    <div style={styles.wrapper}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.logo}>UWM Exchange</div>
        <div style={styles.navLinks}>
          <span style={styles.userInfo}>
            {displayName ? `Logged in as ${displayName}` : "Not logged in"}
          </span>
          <span style={styles.navLink} onClick={() => navigate("/messages")}>
            💬 Messages
          </span>
          <span style={styles.navLink} onClick={() => navigate("/profile")}>
            Profile
          </span>
          <span style={styles.navLink} onClick={handleLogout}>
            Logout
          </span>
        </div>
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
            onFocus={(e) => (e.target.style.borderColor = colors.gold)}
            onBlur={(e) => (e.target.style.borderColor = "#eee")}
          />

          <label style={styles.label}>Department</label>
          <select
            style={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = colors.gold)}
            onBlur={(e) => (e.target.style.borderColor = "#eee")}
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
            onFocus={(e) => (e.target.style.borderColor = colors.gold)}
            onBlur={(e) => (e.target.style.borderColor = "#eee")}
          >
            <option value="">Relevance (Default)</option>
            <option value="lowToHigh">Price: Low to High</option>
            <option value="highToLow">Price: High to Low</option>
          </select>
        </aside>

        {/* Book Grid */}
        <main style={styles.grid}>
          {loading ? (
            <div
              style={{
                color: colors.white,
                gridColumn: "1 / -1",
                textAlign: "center",
              }}
            >
              <h3>Loading books from database...</h3>
            </div>
          ) : processedBooks.length > 0 ? (
            processedBooks.map((book) => {
              const stored = localStorage.getItem("bookExchangeUser");
              const currentUser = stored ? JSON.parse(stored) : null;
              const isOwnListing = currentUser && currentUser.id === book.user_id;

              return (
                <div
                  key={book.listing_id}
                  style={styles.card}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "translateY(-5px)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <img
                    src={
                      book.image_url ||
                      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000"
                    }
                    alt={book.title}
                    style={styles.cardImage}
                  />
                  <div style={styles.cardContent}>
                    <div style={styles.courseBadge}>
                      {book.course_code || "General"}
                    </div>
                    <div style={styles.bookTitle}>{book.title}</div>
                    <div style={styles.bookAuthor}>{book.author}</div>

                    <div style={styles.cardFooter}>
                      <div style={styles.price}>${book.price}</div>
                      <div style={styles.buttonGroup}>
                        <button style={styles.buyButton}>Details</button>
                        {!isOwnListing && (
                          <button
                            style={styles.contactButton}
                            onClick={() => handleContact(book)}
                          >
                            Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                color: colors.white,
                gridColumn: "1 / -1",
                textAlign: "center",
              }}
            >
              <h3>No books found matching your criteria.</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default BookListings;
