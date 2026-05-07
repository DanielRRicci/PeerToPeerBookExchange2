import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { setStoredUser } from "./auth";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    const normalEmail = email.trim().toLowerCase();
    if (!normalEmail.endsWith("@uwm.edu")) { setError("Please use your UWM email (@uwm.edu)"); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${getApiBaseUrl()}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) { navigate("/verify-email", { state: { email: normalEmail } }); return; }
        setError(data.error || data.message || "Invalid credentials");
        return;
      }
      setStoredUser(data.user);
      navigate("/booklistings");
    } catch {
      setError("Could not reach server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh; width: 100vw;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; position: relative;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
          padding: 2rem 1rem;
        }
        .login-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .login-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .login-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 440px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .login-header {
          background: #0a0a0a; padding: 28px 36px 24px;
          border-bottom: 3px solid #FFBD00; text-align: center;
        }
        .login-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: rgba(255,189,0,0.6); margin-bottom: 6px;
        }
        .login-heading {
          font-family: 'Bebas Neue', sans-serif; font-size: 52px;
          letter-spacing: 2px; color: #FFBD00; line-height: 1;
        }

        .login-body { padding: 28px 36px 32px; }

        .login-group { margin-bottom: 14px; }
        .login-label {
          display: block; font-size: 10px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase; color: #666; margin-bottom: 5px;
        }
        .login-input {
          width: 100%; padding: 11px 13px;
          border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input:focus {
          border-color: #FFBD00; background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }

        .login-error {
          color: #dc2626; font-size: 12px; margin-bottom: 14px;
          padding: 9px 12px; background: #fef2f2;
          border-radius: 6px; border-left: 3px solid #dc2626;
        }

        .login-btn {
          width: 100%; padding: 13px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px;
          letter-spacing: 2px; cursor: pointer; margin-top: 4px;
          transition: background 0.2s, transform 0.15s;
        }
        .login-btn:hover { background: #222; transform: translateY(-1px); }
        .login-btn:disabled { opacity: 0.6; cursor: wait; }

        .login-footer {
          margin-top: 18px; text-align: center;
          font-size: 13px; color: #888;
        }
        .login-footer a {
          color: #0a0a0a; font-weight: 700; text-decoration: none;
          border-bottom: 2px solid #FFBD00;
        }
        .login-footer a:hover { color: #c97d00; }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-eyebrow">UWM Student Marketplace</div>
            <div className="login-heading">Sign In</div>
          </div>

          <div className="login-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="login-group">
                <label className="login-label">UWM Email</label>
                <input
                  className="login-input" type="email" placeholder="ePantherID@uwm.edu"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="login-group">
                <label className="login-label">Password</label>
                <input
                  className="login-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Signing In…" : "Start Trading"}
              </button>
            </form>

            <div className="login-footer">
              New here? <Link to="/register">Create an Account</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}