import "./App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import VerifyEmail from "./VerifyEmail.jsx";
import BookListings from "./BookListings.jsx";
import PostBook from "./PostBook.jsx";
import Profile from "./Profile.jsx";
import Messages from "./Messages.jsx";
import { getApiBaseUrl } from "./apiBaseUrl";
import { clearStoredUser, getStoredUser, subscribeToAuthChanges } from "./auth";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const hideNav =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/messages";

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    return subscribeToAuthChanges(syncUser);
  }, []);

  const handleLogout = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id ?? null }),
      });
    } catch (_error) {
      // Clear local auth even if the API is unreachable.
    }

    clearStoredUser();
    navigate("/login");
  };

  const displayName =
    currentUser?.username ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : null);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      {!hideNav && <h1>Peer-to-Peer Book Exchange</h1>}

      {!hideNav && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            margin: "12px 0 24px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/verify-email">VerifyEmail</Link>
            <Link to="/booklistings">Listings</Link>
            <Link to="/post">Post</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/messages">Messages</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>{displayName ? `Logged in as ${displayName}` : "Not logged in"}</span>
            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  border: "1px solid #ccc",
                  background: "#fff",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/booklistings" element={<BookListings />} />
        <Route path="/post" element={<PostBook />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
