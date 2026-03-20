// Register is now embedded inside Login.jsx as a flip panel.
// This file redirects to /login so any direct /register visits still work.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
}