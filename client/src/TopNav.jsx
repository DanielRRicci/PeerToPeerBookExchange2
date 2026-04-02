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
        const nextUser = { ...currentUser, profile_image_url: profile.profile_image_url || null };
        setCurrentUser(nextUser);
        setStoredUser(nextUser);
      } catch {}
    }
    loadCurrentUserProfile();
    return () => { isActive = false; };
  }, [currentUser?.id]);

  const displayName =
    currentUser?.username ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "User");

  const defaultAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="20" fill="#1a1a1a"/>
      <circle cx="20" cy="15" r="7" fill="#FFBD00"/>
      <path d="M10 32c1.8-5.4 6-8 10-8s8.2 2.6 10 8" fill="#FFBD00"/>
    </svg>
  `)}`;
  const avatarSrc = currentUser?.profile_image_url || defaultAvatar;

  async function handleLogout() {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id ?? null }),
      });
    } catch {}
    clearStoredUser();
    navigate("/login");
  }

  const navItems = [
    { id: "listings", label: "Listings",     path: "/booklistings" },
    { id: "post",     label: "Post",          path: "/post" },
    { id: "messages", label: "💬 Messages",   path: "/messages" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .topnav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 64px;
          background: #0a0a0a;
          border-bottom: 3px solid #FFBD00;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
          position: relative;
          z-index: 100;
          width: 100%;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }

        .topnav-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.55rem;
          letter-spacing: 2px;
          color: #FFBD00;
          cursor: pointer;
          text-transform: uppercase;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .topnav-logo:hover { opacity: 0.8; }

        .topnav-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .topnav-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 6px;
          border: 1.5px solid transparent;
          transition: color 0.18s, border-color 0.18s, background 0.18s;
          white-space: nowrap;
        }
        .topnav-link:hover {
          color: #FFBD00;
          border-color: rgba(255,189,0,0.3);
          background: rgba(255,189,0,0.07);
        }

        .topnav-logout {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 6px;
          border: 1.5px solid transparent;
          transition: color 0.18s, border-color 0.18s;
        }
        .topnav-logout:hover {
          color: #ff6b6b;
          border-color: rgba(255,107,107,0.25);
        }

        .topnav-avatar-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #FFBD00;
          background: #1a1a1a;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: box-shadow 0.2s;
          margin-right: 6px;
        }
        .topnav-avatar-btn:hover {
          box-shadow: 0 0 0 3px rgba(255,189,0,0.28);
        }
        .topnav-avatar-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .topnav-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          margin: 0 4px;
        }
      `}</style>
      <nav className="topnav">
        <div className="topnav-logo" onClick={() => navigate("/booklistings")}>
          Peer To Peer Book Exchange
        </div>

        <div className="topnav-links">
          {currentUser && (
            <button
              className="topnav-avatar-btn"
              onClick={() => navigate("/profile")}
              title={displayName}
              aria-label={`${displayName} profile`}
            >
              <img src={avatarSrc} alt={displayName} />
            </button>
          )}

          {navItems.map((item) => (
            <span
              key={item.id}
              className="topnav-link"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredNavLink(item.id)}
              onMouseLeave={() => setHoveredNavLink(null)}
            >
              {item.label}
            </span>
          ))}

          <div className="topnav-divider" />

          <span
            className="topnav-logout"
            onClick={handleLogout}
            onMouseEnter={() => setHoveredNavLink("logout")}
            onMouseLeave={() => setHoveredNavLink(null)}
          >
            Logout
          </span>
        </div>
      </nav>
    </>
  );
}