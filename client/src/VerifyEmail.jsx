import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      setMessage(data.message || "Email verified. You can now log in.");
      setTimeout(() => navigate("/login"), 700);
    } catch (_error) {
      setError("Could not reach server. Please try again.");
    }
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
        'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.5)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
    card: {
      width: "100%",
      maxWidth: "450px",
      backgroundColor: "#FFFFFF",
      padding: "2.5rem",
      borderRadius: "12px",
      boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
      borderTop: "8px solid #FFBD00",
      textAlign: "center",
    },
    title: {
      fontSize: "1.8rem",
      fontWeight: "800",
      color: "#000000",
      marginBottom: "0.5rem",
    },
    subtitle: {
      color: "#444",
      marginBottom: "1.2rem",
      fontSize: "0.95rem",
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
      color: "#333333",
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
    button: {
      width: "100%",
      padding: "14px",
      backgroundColor: "#000000",
      color: "#FFBD00",
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      fontSize: "1rem",
      cursor: "pointer",
      marginTop: "10px",
      textTransform: "uppercase",
    },
    success: {
      marginTop: "10px",
      color: "#14532d",
      fontWeight: "600",
    },
    error: {
      marginTop: "10px",
      color: "#b91c1c",
      fontWeight: "600",
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Verify Your Email</h1>
        <p style={styles.subtitle}>
          Enter the 6-digit code sent to your UWM inbox.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>UWM Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ePantherID@uwm.edu"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Verification Code</label>
            <input
              style={styles.input}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
            />
          </div>

          <button type="submit" style={styles.button}>Verify Email</button>
        </form>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default VerifyEmail;
