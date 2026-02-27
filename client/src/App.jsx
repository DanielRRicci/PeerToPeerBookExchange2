import "./App.css"; 
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import VerifyEmail from "./VerifyEmail.jsx";
import BookListings from "./BookListings.jsx";
import PostBook from "./PostBook.jsx";
import Profile from "./Profile.jsx";

// Wrap content in a component to use useLocation
function AppContent() {
  const location = useLocation();

  // Hide header and navbar on these pages (Login/Register)
  const hideNav = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register";

  return (
    <div style={{ padding: hideNav ? 0 : 24, fontFamily: "sans-serif" }}>
      {/* Show header and navbar only on non-login/register pages */}
      {!hideNav && <h1>Peer-to-Peer Book Exchange</h1>}

      {!hideNav && (
        <div style={{ display: "flex", gap: 12, margin: "12px 0 24px" }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/booklistings">Listings</Link>
          <Link to="/post">Post</Link>
          <Link to="/profile">Profile</Link>
        </div>
      )}

      <Routes>
        {/* Login and Register keep their own fixed background */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Other pages with normal layout */}
        <Route path="/booklistings" element={<BookListings />} />
        <Route path="/post" element={<PostBook />} />
        <Route path="/profile" element={<Profile />} />
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
