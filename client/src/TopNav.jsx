import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredUser, getStoredUser } from "./auth";
import { getApiBaseUrl } from "./apiBaseUrl";

export default function TopNav() {
  const navigate = useNavigate();
  const [hoveredNavLink, setHoveredNavLink] = useState(null);
  const currentUser = getStoredUser();

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
  };

  const styles = {
    navbar: {
      backgroundColor: colors.black,
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `4px solid ${colors.gold}`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      width: "100%",
      boxSizing: "border-box",
    },
    logo: {
      color: colors.gold,
      fontSize: "1.5rem",
      fontWeight: "800",
      letterSpacing: "1px",
      textTransform: "uppercase",
      cursor: "pointer",
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
      display: "inline-flex",
      alignItems: "center",
      transition: "transform 0.18s ease",
    },
    userInfo: {
      color: colors.white,
      fontWeight: "600",
      fontSize: "0.9rem",
    },
  };

  const displayName =
    currentUser?.username ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : null);

  const getNavLinkStyle = (id) => ({
    ...styles.navLink,
    transform: hoveredNavLink === id ? "scale(1.08)" : "scale(1)",
  });

  async function handleLogout() {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id ?? null }),
      });
    } catch (_error) {
      // still clear local auth
    }

    clearStoredUser();
    navigate("/login");
  }

  return (
    <nav style={styles.navbar}>
      <div style={styles.logo} onClick={() => navigate("/booklistings")}>
        UWM Exchange
      </div>

      <div style={styles.navLinks}>
        <span style={styles.userInfo}>
          {displayName ? `Logged in as ${displayName}` : "Not logged in"}
        </span>

        <span
          style={getNavLinkStyle("listings")}
          onClick={() => navigate("/booklistings")}
          onMouseEnter={() => setHoveredNavLink("listings")}
          onMouseLeave={() => setHoveredNavLink(null)}
        >
          Listings
        </span>

        <span
          style={getNavLinkStyle("post")}
          onClick={() => navigate("/post")}
          onMouseEnter={() => setHoveredNavLink("post")}
          onMouseLeave={() => setHoveredNavLink(null)}
        >
          Post
        </span>

        <span
          style={getNavLinkStyle("messages")}
          onClick={() => navigate("/messages")}
          onMouseEnter={() => setHoveredNavLink("messages")}
          onMouseLeave={() => setHoveredNavLink(null)}
        >
          💬 Messages
        </span>

        <span
          style={getNavLinkStyle("profile")}
          onClick={() => navigate("/profile")}
          onMouseEnter={() => setHoveredNavLink("profile")}
          onMouseLeave={() => setHoveredNavLink(null)}
        >
          Profile
        </span>

        <span
          style={getNavLinkStyle("logout")}
          onClick={handleLogout}
          onMouseEnter={() => setHoveredNavLink("logout")}
          onMouseLeave={() => setHoveredNavLink(null)}
        >
          Logout
        </span>
      </div>
    </nav>
  );
}