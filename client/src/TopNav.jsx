import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredUser, getStoredUser, setStoredUser, subscribeToAuthChanges } from "./auth";
import { getApiBaseUrl } from "./apiBaseUrl";

export default function TopNav() {
  const navigate = useNavigate();
  const [hoveredNavLink, setHoveredNavLink] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      setCurrentUser(getStoredUser());
    });
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    let isActive = true;

    async function loadCurrentUserProfile() {
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/users/${currentUser.id}`);
        if (!response.ok) return;

        const profile = await response.json();
        if (!isActive) return;

        const nextUser = {
          ...currentUser,
          profile_image_url: profile.profile_image_url || null,
        };

        setCurrentUser(nextUser);
        setStoredUser(nextUser);
      } catch {
        // Keep the fallback icon if profile lookup fails.
      }
    }

    loadCurrentUserProfile();

    return () => {
      isActive = false;
    };
  }, [currentUser?.id]);

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
    userAvatarButton: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      overflow: "hidden",
      border: `2px solid ${colors.gold}`,
      backgroundColor: colors.black,
      padding: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    userAvatar: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
  };

  const displayName =
    currentUser?.username ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "User");
  const defaultAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="20" fill="#F2F2F2"/>
      <circle cx="20" cy="15" r="7" fill="#9A9A9A"/>
      <path d="M10 32c1.8-5.4 6-8 10-8s8.2 2.6 10 8" fill="#9A9A9A"/>
    </svg>
  `)}`;
  const avatarSrc = currentUser?.profile_image_url || defaultAvatar;

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
    } catch {
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
        {currentUser ? (
          <button
            type="button"
            style={styles.userAvatarButton}
            onClick={() => navigate("/profile")}
            title={displayName}
            aria-label={`${displayName} profile`}
          >
            <img src={avatarSrc} alt={displayName} style={styles.userAvatar} />
          </button>
        ) : null}

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
