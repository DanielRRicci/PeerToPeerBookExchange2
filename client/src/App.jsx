import "./App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import VerifyEmail from "./VerifyEmail.jsx";
import BookListings from "./BookListings.jsx";
import PostBook from "./PostBook.jsx";
import Profile from "./Profile.jsx";
import Messages from "./Messages.jsx";
import { getStoredUser, subscribeToAuthChanges } from "./auth";

function AppContent() {
  const [, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    return subscribeToAuthChanges(syncUser);
  }, []);

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100%",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
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
