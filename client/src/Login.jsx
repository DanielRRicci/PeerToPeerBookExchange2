import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalEmail = email.trim().toLowerCase();

    if (!normalEmail.endsWith("@uwm.edu")) {
      setError("Please use your UWM email (@uwm.edu)");
      return;
    }

    setError("");
    console.log("Logging in:", normalEmail);
    navigate("/booklistings");
  };

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
  };

  const styles = {
    wrapper: {
      position: "fixed",   // fix to viewport
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      backgroundImage:
        'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed", // keep background stationary
      overflow: "hidden",
    },
    card: {
      width: "90%",
      maxWidth: "420px",
      maxHeight: "90vh",     // prevent card from exceeding viewport
      overflowY: "auto",     // scroll inside card if needed
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
      lineHeight: "1.2",
    },
    uwmBadge: {
      display: "inline-block",
      backgroundColor: colors.black,
      color: colors.gold,
      fontSize: "0.8rem",
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
    inputGroup: {
      textAlign: "left",
      marginBottom: "1.2rem",
    },
    label: {
      display: "block",
      fontSize: "0.85rem",
      fontWeight: "700",
      marginBottom: "6px",
      color: colors.darkGray,
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "1rem",
      boxSizing: "border-box",
      transition: "border-color 0.3s ease",
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
      marginTop: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
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
        <h1 style={styles.mainHeading}>Peer-To-Peer Book Exchange</h1>
        <div style={styles.uwmBadge}>UWM Student Marketplace</div>

        <p style={styles.instructions}>
          Sign in to find cheap textbooks or sell your old ones.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="email">UWM Email</label>
            <input
              style={styles.input}
              type="email"
              id="email"
              placeholder="ePantherID@uwm.edu"
              value={email}
              onFocus={(e) => e.target.style.borderColor = colors.gold}
              onBlur={(e) => e.target.style.borderColor = "#eee"}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: "red", marginTop: "8px" }}>{error}</p>}

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              style={styles.input}
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onFocus={(e) => e.target.style.borderColor = colors.gold}
              onBlur={(e) => e.target.style.borderColor = "#eee"}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            style={styles.button}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#222")}
            onMouseOut={(e) => (e.target.style.backgroundColor = colors.black)}
          >
            Start Trading
          </button>
        </form>

        <div style={styles.footerLink}>
          Need to post a book? <Link to="/register" style={styles.link}>Create an Account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
