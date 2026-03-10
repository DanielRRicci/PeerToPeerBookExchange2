import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import VerifyEmail from "./VerifyEmail.jsx";
import BookListings from "./BookListings.jsx";
import PostBook from "./PostBook.jsx";
import Profile from "./Profile.jsx";
import Messages from "./Messages.jsx"; // ← NEW

function AppContent() {
  const location = useLocation();

  const hideNav =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/messages"; // ← Messages has its own nav

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      {!hideNav && <h1>Peer-to-Peer Book Exchange</h1>}

      {!hideNav && (
        <div style={{ display: "flex", gap: 12, margin: "12px 0 24px" }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/verify-email">VerifyEmail</Link>
          <Link to="/booklistings">Listings</Link>
          <Link to="/post">Post</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/messages">Messages</Link> {/* ← NEW */}
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
        <Route path="/messages" element={<Messages />} /> {/* ← NEW */}
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