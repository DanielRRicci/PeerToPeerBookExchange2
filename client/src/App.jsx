
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import BookListings from "./BookListings.jsx";
import PostBook from "./PostBook.jsx";
import Profile from "./Profile.jsx";

export default function App() {
  return (
    <Router>
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h1>Peer-to-Peer Book Exchange</h1>

        <div style={{ display: "flex", gap: 12, margin: "12px 0 24px" }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/booklistings">Listings</Link>
          <Link to="/post">Post</Link>
          <Link to="/profile">Profile</Link>
        </div>

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/booklistings" element={<BookListings />} />
          <Route path="/post" element={<PostBook />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}