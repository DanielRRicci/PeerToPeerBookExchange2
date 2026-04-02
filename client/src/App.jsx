import "./App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Login        from "./Login.jsx";
import Register     from "./Register.jsx";
import VerifyEmail  from "./VerifyEmail.jsx";
import BookListings from "./BookListings.jsx";
import BookDetail   from "./BookDetail.jsx";
import PostBook     from "./PostBook.jsx";
import Profile      from "./Profile.jsx";
import Messages     from "./Messages.jsx";
import TopNav       from "./TopNav.jsx";
import { getStoredUser, subscribeToAuthChanges } from "./auth";

function AppContent() {
  const [, setCurrentUser] = useState(() => getStoredUser());
  const location = useLocation();

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    return subscribeToAuthChanges(syncUser);
  }, []);

  const showTopNav = [
    "/booklistings",
    "/post",
    "/profile",
    "/messages",
  ].some((path) =>
    location.pathname === path || location.pathname.startsWith("/listings/")
  );

  return (
    <div
      style={{
        margin: 0, padding: 0,
        width: "100%", minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      {showTopNav && <TopNav />}

      <Routes>
        <Route path="/"               element={<Login />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/verify-email"   element={<VerifyEmail />} />
        <Route path="/booklistings"   element={<BookListings />} />
        <Route path="/listings/:id"   element={<BookDetail />} />
        <Route path="/post"           element={<PostBook />} />
        <Route path="/profile"        element={<Profile />} />
        <Route path="/messages"       element={<Messages />} />
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