import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearStoredUser, getStoredUser, setStoredUser, subscribeToAuthChanges } from "./auth";
import { getApiBaseUrl } from "./apiBaseUrl";

export default function TopNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [hoveredNavLink, setHoveredNavLink] = useState(null);
  const [currentUser,    setCurrentUser]    = useState(() => getStoredUser());
  const [unreadCount,    setUnreadCount]    = useState(0); // ADDED

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    return subscribeToAuthChanges(() => setCurrentUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    let isActive = true;
    async function loadProfile() {
      try {
        const res     = await fetch(`${getApiBaseUrl()}/api/users/${currentUser.id}`);
        if (!res.ok) return;
        const profile = await res.json();
        if (!isActive) return;
        const next = { ...currentUser, profile_image_url: profile.profile_image_url || null };
        setCurrentUser(next);
        setStoredUser(next);
      } catch {}
    }
    loadProfile();
    return () => { isActive = false; };
  }, [currentUser?.id]);

  // ADDED: poll for unread notification count every 30 seconds
  useEffect(() => {
    if (!currentUser?.id) return;

    async function fetchUnreadCount() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/notifications/unread-count?userId=${currentUser.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(data.count || 0);
      } catch {}
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Reset unread count when visiting notifications page
  useEffect(() => {
    if (location.pathname === "/notifications") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const displayName = currentUser?.username || currentUser?.fullName ||
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
      await fetch(`${getApiBaseUrl()}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id ?? null }),
      });
    } catch {}
    clearStoredUser();
    navigate("/login");
  }

  const navItems = [
    { id: "listings", label: "Listings",   path: "/booklistings" },
    { id: "post",     label: "Post",       path: "/post"         },
    { id: "messages", label: "💬 Messages", path: "/messages"     },
  ];

  if (currentUser?.role === "admin") {
    navItems.push({ id: "admin", label: "⚡ Admin", path: "/admin" });
  }

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
          z-index: 200;
          width: 100%;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }

        .topnav-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.35rem;
          letter-spacing: 2px;
          color: #FFBD00;
          cursor: pointer;
          text-transform: uppercase;
          transition: opacity 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
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
        .topnav-logout:hover { color: #ff6b6b; border-color: rgba(255,107,107,0.25); }
        .topnav-avatar-btn {
          width: 34px; height: 34px; border-radius: 50%; overflow: hidden;
          border: 2px solid #FFBD00; background: #1a1a1a; padding: 0;
          cursor: pointer; display: inline-flex; align-items: center;
          justify-content: center; flex-shrink: 0;
          transition: box-shadow 0.2s; margin-right: 6px;
        }
        .topnav-avatar-btn:hover { box-shadow: 0 0 0 3px rgba(255,189,0,0.28); }
        .topnav-avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
        .topnav-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 4px; }

        /* ADDED: Bell button */
        .topnav-bell {
          position: relative;
          width: 34px; height: 34px;
          border-radius: 8px;
          border: 1.5px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: color 0.18s, border-color 0.18s, background 0.18s;
          flex-shrink: 0;
        }
        .topnav-bell:hover {
          color: #FFBD00;
          border-color: rgba(255,189,0,0.3);
          background: rgba(255,189,0,0.07);
        }
        .topnav-bell-badge {
          position: absolute;
          top: -4px; right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          font-family: 'DM Sans', sans-serif;
          pointer-events: none;
        }

        /* Hamburger button */
        .topnav-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 40px; height: 40px;
          background: none; border: none;
          cursor: pointer; padding: 4px;
          border-radius: 8px;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .topnav-hamburger:hover { background: rgba(255,189,0,0.1); }
        .topnav-hamburger span {
          display: block; width: 22px; height: 2px;
          background: #FFBD00; border-radius: 2px;
          transition: transform 0.25s, opacity 0.25s;
          transform-origin: center;
        }
        .topnav-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .topnav-hamburger.open span:nth-child(2) { opacity: 0; }
        .topnav-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* Mobile drawer */
        .topnav-drawer {
          display: none;
          position: fixed;
          top: 67px; left: 0; right: 0; bottom: 0;
          background: #0a0a0a;
          z-index: 199;
          flex-direction: column;
          padding: 16px 0 32px;
          overflow-y: auto;
          border-top: 1px solid rgba(255,189,0,0.15);
          animation: drawerSlide 0.22s ease;
        }
        @keyframes drawerSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .topnav-drawer.open { display: flex; }

        .drawer-user {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 24px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 8px;
        }
        .drawer-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2px solid #FFBD00; object-fit: cover; flex-shrink: 0;
        }
        .drawer-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px; letter-spacing: 1.5px; color: #FFBD00;
        }
        .drawer-email { font-size: 11px; color: rgba(255,255,255,0.35); }

        .drawer-item {
          display: flex; align-items: center;
          padding: 15px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .drawer-item:hover, .drawer-item:active {
          color: #FFBD00;
          background: rgba(255,189,0,0.06);
          border-left-color: #FFBD00;
        }
        .drawer-divider {
          height: 1px; background: rgba(255,255,255,0.07);
          margin: 8px 24px;
        }
        .drawer-logout {
          display: flex; align-items: center;
          padding: 15px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(255,100,100,0.6);
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: color 0.15s, background 0.15s;
        }
        .drawer-logout:hover { color: #ff6b6b; background: rgba(255,100,100,0.06); }

        @media (max-width: 680px) {
          .topnav { padding: 0 1rem; }
          .topnav-links { display: none; }
          .topnav-hamburger { display: flex; }
          .topnav-logo { font-size: 1.1rem; letter-spacing: 1px; }
        }
      `}</style>

      <nav className="topnav">
        <div className="topnav-logo" onClick={() => navigate("/booklistings")}>
          Peer To Peer Book Exchange
        </div>

        {/* Desktop nav */}
        <div className="topnav-links">
          {currentUser && (
            <button className="topnav-avatar-btn" onClick={() => navigate("/profile")} title={displayName}>
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

          {/* ADDED: Bell icon */}
          {currentUser && (
            <button
              className="topnav-bell"
              onClick={() => navigate("/notifications")}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="topnav-bell-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}

          <div className="topnav-divider" />
          <span className="topnav-logout" onClick={handleLogout}>Logout</span>
        </div>

        {/* Hamburger */}
        <button
          className={`topnav-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`topnav-drawer${menuOpen ? " open" : ""}`}>
        {currentUser && (
          <div className="drawer-user" onClick={() => navigate("/profile")}>
            <img src={avatarSrc} alt={displayName} className="drawer-avatar" />
            <div>
              <div className="drawer-name">{displayName}</div>
              <div className="drawer-email">{currentUser.email}</div>
            </div>
          </div>
        )}

        {navItems.map((item) => (
          <div key={item.id} className="drawer-item" onClick={() => navigate(item.path)}>
            {item.label}
          </div>
        ))}

        {/* ADDED: Notifications in mobile drawer */}
        {currentUser && (
          <div className="drawer-item" onClick={() => navigate("/notifications")}>
            🔔 Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: "8px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "10px" }}>
                {unreadCount}
              </span>
            )}
          </div>
        )}

        <div className="drawer-divider" />
        <div className="drawer-logout" onClick={handleLogout}>Logout</div>
      </div>
    </>
  );
}