import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

export default function Register() {
  const [fullName,        setFullName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!email.trim().toLowerCase().endsWith("@uwm.edu")) {
      setError("Please use your UWM email (@uwm.edu)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/verify-email";
      } else {
        setError(data.error || data.message || "Registration failed.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  const gold  = "#FFBD00";
  const black = "#0a0a0a";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-page {
          min-height: 100vh; width: 100vw;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; position: relative;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
          padding: 2rem 1rem;
        }
        .reg-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .reg-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .reg-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 460px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .reg-header {
          background: #0a0a0a; padding: 28px 36px 24px;
          border-bottom: 3px solid #FFBD00; text-align: center;
        }
        .reg-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: rgba(255,189,0,0.6); margin-bottom: 6px;
        }
        .reg-heading {
          font-family: 'Bebas Neue', sans-serif; font-size: 42px;
          letter-spacing: 2px; color: #FFBD00; line-height: 1;
        }

        .reg-body { padding: 28px 36px 32px; }

        .reg-group { margin-bottom: 14px; }
        .reg-label {
          display: block; font-size: 10px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase; color: #666; margin-bottom: 5px;
        }
        .reg-input {
          width: 100%; padding: 11px 13px;
          border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .reg-input:focus {
          border-color: #FFBD00; background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }

        .reg-error {
          color: #dc2626; font-size: 12px; margin-bottom: 14px;
          padding: 9px 12px; background: #fef2f2;
          border-radius: 6px; border-left: 3px solid #dc2626;
        }

        .reg-btn {
          width: 100%; padding: 13px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px;
          letter-spacing: 2px; cursor: pointer; margin-top: 4px;
          transition: background 0.2s, transform 0.15s;
        }
        .reg-btn:hover { background: #222; transform: translateY(-1px); }
        .reg-btn:disabled { opacity: 0.6; cursor: wait; }

        .reg-footer {
          margin-top: 18px; text-align: center;
          font-size: 13px; color: #888;
        }
        .reg-footer a {
          color: #0a0a0a; font-weight: 700; text-decoration: none;
          border-bottom: 2px solid #FFBD00;
        }
        .reg-footer a:hover { color: #c97d00; }
      `}</style>

      <div className="reg-page">
        <div className="reg-card">
          <div className="reg-header">
            <div className="reg-eyebrow">UWM Student Marketplace</div>
            <div className="reg-heading">Create Account</div>
          </div>

          <div className="reg-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="reg-group">
                <label className="reg-label">Full Name</label>
                <input
                  className="reg-input" type="text" placeholder="Pounce Panther"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div className="reg-group">
                <label className="reg-label">UWM Email</label>
                <input
                  className="reg-input" type="email" placeholder="ePantherID@uwm.edu"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="reg-group">
                <label className="reg-label">Password</label>
                <input
                  className="reg-input" type="password" placeholder="At least 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="reg-group">
                <label className="reg-label">Confirm Password</label>
                <input
                  className="reg-input" type="password" placeholder="Repeat your password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && <div className="reg-error">{error}</div>}

              <button type="submit" className="reg-btn" disabled={loading}>
                {loading ? "Creating Account…" : "Join the Exchange"}
              </button>
            </form>

            <div className="reg-footer">
              Already have an account? <Link to="/login">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}