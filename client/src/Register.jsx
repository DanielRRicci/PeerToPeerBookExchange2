import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Registration failed.");
        return;
      }

      alert(data.message || "Account created. Check your email for a verification code.");
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (_error) {
      alert("Could not reach server. Please try again.");
    }
  };

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
  };

  const styles = {
    wrapper: {
      position: "fixed", // fix wrapper to viewport
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
      overflow: "hidden", // prevent page scroll
    },
    card: {
      width: "90%",
      maxWidth: "450px",
      maxHeight: "90vh", // prevent card from exceeding viewport
      overflowY: "auto", // scroll inside card if content is too tall
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
        <h1 style={styles.mainHeading}>Create Account</h1>
        <div style={styles.uwmBadge}>Join the Peer-To-Peer Exchange</div>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              type="text"
              name="fullName"
              placeholder="Pounce Panther"
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>UWM Email</label>
            <input
              style={styles.input}
              type="email"
              name="email"
              placeholder="ePantherID@uwm.edu"
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              name="password"
              placeholder="Create a password"
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              style={styles.input}
              type="password"
              name="confirmPassword"
              placeholder="Repeat your password"
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" style={styles.button}>
            Create Panther Account
          </button>
        </form>

        <div style={styles.footerLink}>
          Already swapping books? <Link to="/login" style={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
