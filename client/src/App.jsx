import "./App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login           from "./Login.jsx";
import Register        from "./Register.jsx";
import VerifyEmail     from "./VerifyEmail.jsx";
import BookListings    from "./BookListings.jsx";
import BookDetail      from "./Bookdetail.jsx";
import PostBook        from "./PostBook.jsx";
import Profile         from "./Profile.jsx";
import Messages        from "./Messages.jsx";
import TopNav          from "./TopNav.jsx";
import AdminDashboard  from "./AdminDashboard.jsx";
import { getStoredUser, subscribeToAuthChanges } from "./auth";
import Notifications from "./Notifications.jsx";


// ─── Role guard — redirects non-admins away from /admin ──────────────────────
function AdminGuard({ children }) {
  const user = getStoredUser();
  if (!user || user.role !== "admin") {
    return <Navigate to="/booklistings" replace />;
  }
  return children;
}

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
    "/admin",
    "/notifications",
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith("/listings/")
  );

  return (
    <div style={{ margin: 0, padding: 0, width: "100%", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {showTopNav && <TopNav />}

      <Routes>
        <Route path="/"             element={<Login />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/booklistings" element={<BookListings />} />
        <Route path="/listings/:id" element={<BookDetail />} />
        <Route path="/post"         element={<PostBook />} />
        <Route path="/profile"      element={<Profile />} />
        <Route path="/messages"     element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Admin — role-gated */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/booklistings" replace />} />
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