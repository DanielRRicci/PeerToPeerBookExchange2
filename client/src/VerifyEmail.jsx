import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Verification failed.");
        return;
      }
      setMessage(data.message || "Email verified. You can now log in.");
      setTimeout(() => navigate("/login"), 700);
    } catch {
      setError("Could not reach server. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .verify-page {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .verify-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .verify-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .verify-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          padding: 48px 44px 40px;
          margin: 20px;
        }

        .verify-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 8px;
        }
        .verify-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 46px;
          letter-spacing: 2px;
          color: #0a0a0a;
          line-height: 1;
          margin-bottom: 10px;
        }
        .verify-sub {
          font-size: 13px;
          color: rgba(0,0,0,0.48);
          line-height: 1.65;
          margin-bottom: 28px;
        }

        .verify-form-group {
          margin-bottom: 14px;
        }
        .verify-form-group label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 5px;
        }
        .verify-form-group input {
          width: 100%;
          padding: 10px 13px;
          border: 1.5px solid #e8e8e8;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #0a0a0a;
          background: #fafafa;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .verify-form-group input:focus {
          border-color: #FFBD00;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }

        .verify-submit {
          width: 100%;
          padding: 13px;
          background: #0a0a0a;
          color: #FFBD00;
          border: none;
          border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 17px;
          letter-spacing: 2px;
          cursor: pointer;
          margin-top: 6px;
          transition: background 0.2s, transform 0.15s;
        }
        .verify-submit:hover {
          background: #222;
          transform: translateY(-1px);
        }

        .verify-error {
          margin-top: 12px;
          color: #dc2626;
          font-size: 12px;
          padding: 8px 12px;
          background: #fef2f2;
          border-radius: 6px;
          border-left: 3px solid #dc2626;
        }
        .verify-success {
          margin-top: 12px;
          color: #15803d;
          font-size: 12px;
          padding: 8px 12px;
          background: #f0fdf4;
          border-radius: 6px;
          border-left: 3px solid #22c55e;
          font-weight: 600;
        }

        .verify-back {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          padding: 0 0 14px 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #aaa;
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
        }
        .verify-back:hover { color: #FFBD00; transform: translateX(-2px); }
      `}</style>

      <div className="verify-page">
        <div className="verify-card">
          <button className="verify-back" onClick={() => navigate("/login")}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Sign In
          </button>

          <div className="verify-eyebrow">UWM Student Marketplace</div>
          <div className="verify-heading">Verify Email</div>
          <p className="verify-sub">Enter the 6-digit code sent to your UWM inbox.</p>

          <form onSubmit={handleSubmit}>
            <div className="verify-form-group">
              <label>UWM Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ePantherID@uwm.edu"
                required
              />
            </div>
            <div className="verify-form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
              />
            </div>
            <button type="submit" className="verify-submit">Verify &amp; Continue</button>
          </form>

          {message && <div className="verify-success">{message}</div>}
          {error   && <div className="verify-error">{error}</div>}
        </div>
      </div>
    </>
  );
}

export default VerifyEmail;