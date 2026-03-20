import React, { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "./apiBaseUrl";
import { setStoredUser } from "./auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loginData,  setLoginData]  = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [regData,    setRegData]    = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [regError,   setRegError]   = useState("");

  const [progress,  setProgress]  = useState(0); // 0 = login, 1 = register
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  function flipTo(target) {
    if (animating) return;
    setAnimating(true);
    const from  = progress;
    const dur   = 900;
    const start = performance.now();
    const ease  = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    const tick  = now => {
      const t = Math.min((now - start) / dur, 1);
      setProgress(from + (target - from) * ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { setProgress(target); setAnimating(false); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = loginData.email.trim().toLowerCase();
    if (!email.endsWith("@uwm.edu")) { setLoginError("Please use your UWM email (@uwm.edu)"); return; }
    setLoginError("");
    try {
      const res  = await fetch(`${getApiBaseUrl()}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginData.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) { navigate("/verify-email", { state: { email } }); return; }
        setLoginError(data.error || data.message || "Invalid credentials"); return;
      }
      setStoredUser(data.user); navigate("/booklistings");
    } catch { setLoginError("Could not reach server."); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setRegError("");
    if (regData.password !== regData.confirmPassword) { setRegError("Passwords do not match!"); return; }
    if (!regData.email.trim().toLowerCase().endsWith("@uwm.edu")) { setRegError("Please use your UWM email (@uwm.edu)"); return; }
    try {
      const res  = await fetch(`${getApiBaseUrl()}/api/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: regData.fullName, email: regData.email.trim().toLowerCase(), password: regData.password }),
      });
      const data = await res.json();
      if (res.ok) navigate("/verify-email", { state: { email: regData.email.trim().toLowerCase() } });
      else setRegError(data.error || data.message || "Registration failed");
    } catch { setRegError("Could not connect to server."); }
  }

  // angle: 0 → -180 as progress: 0 → 1
  // Hinge is at the RIGHT edge of the left half (center of the book).
  // The flipping page is FULL WIDTH so it sweeps over the sign-in side.
  const angle     = progress * -180;
  const showFront = angle > -90; // gold panel visible in first half of turn

  // Shadow on the left side (peaks mid-flip)
  const turnShadow = Math.sin(progress * Math.PI);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-page {
          min-height: 100vh; width: 100vw;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative; overflow: hidden;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .auth-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .auth-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* ── The book shell ── */
        .book {
          position: relative; z-index: 1;
          width: 860px; max-width: 98vw; height: 540px;
          border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: visible;
        }

        /* ── Static left half: Sign In ── */
        .half-left {
          position: absolute;
          left: 0; top: 0;
          width: 50%; height: 100%;
          background: #fff;
          border-radius: 20px 0 0 20px;
          display: flex; flex-direction: column; justify-content: center;
          padding: 50px 44px;
          z-index: 1;
        }

        .half-right-bg {
          position: absolute;
          right: 0; top: 0;
          width: 50%; height: 100%;
          background: linear-gradient(155deg, #FFBD00 0%, #e6a800 45%, #c97d00 100%);
          border-radius: 0 20px 20px 0;
          z-index: 1;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 48px 36px; text-align: center;
          overflow: hidden;
        }
        .half-right-bg::before {
          content: ''; position: absolute;
          top: -70px; right: -70px; width: 240px; height: 240px;
          border-radius: 50%; background: rgba(255,255,255,0.09); pointer-events: none;
        }
        .half-right-bg::after {
          content: ''; position: absolute;
          bottom: -60px; left: -60px; width: 200px; height: 200px;
          border-radius: 50%; background: rgba(0,0,0,0.06); pointer-events: none;
        }

        /* ── The flipping page — RIGHT HALF ONLY, hinges on its left edge ── */
        .flip-page {
          position: absolute;
          top: 0; left: 50%;
          width: 50%; height: 100%;
          transform-origin: left center;
          transform-style: preserve-3d;
          z-index: 3;
          border-radius: 0 20px 20px 0;
        }

        .face {
          position: absolute;
          inset: 0;
          border-radius: 0 20px 20px 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          overflow: hidden;
        }

        .face-front {
          background: linear-gradient(155deg, #FFBD00 0%, #e6a800 45%, #c97d00 100%);
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 48px 36px; text-align: center;
          pointer-events: none;
        }
        .face-front.active {
          pointer-events: all;
        }
        .face-front::before {
          content: ''; position: absolute;
          top: -70px; right: -70px; width: 240px; height: 240px;
          border-radius: 50%; background: rgba(255,255,255,0.09); pointer-events: none;
        }
        .face-front::after {
          content: ''; position: absolute;
          bottom: -60px; left: -60px; width: 200px; height: 200px;
          border-radius: 50%; background: rgba(0,0,0,0.06); pointer-events: none;
        }

        /* BACK face: white register form — after flip it sits on the LEFT, so left corners rounded */
        .face-back {
          transform: rotateY(180deg);
          background: #fff;
          display: flex; flex-direction: column;
          justify-content: center;
          padding: 36px 40px;
          border-radius: 20px 0 0 20px;
          pointer-events: none;
        }
        .face-back.active {
          pointer-events: all;
        }

        /* Spine crease on the left edge of the flipping page */
        .spine-center {
          position: absolute; top:0; bottom:0;
          left: 0; width: 5px;
          background: linear-gradient(90deg, rgba(0,0,0,0.15), transparent);
          z-index: 20; pointer-events: none;
        }

        /* Panel content (gold side) */
        .panel-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
        .panel-icon    { font-size: 48px; margin-bottom: 14px; }
        .uwm-tag       { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(0,0,0,0.4); margin-bottom: 8px; }
        .panel-heading { font-family: 'Bebas Neue', sans-serif; font-size: 38px; letter-spacing: 2px; color: #0a0a0a; line-height: 1.1; margin-bottom: 12px; }
        .panel-text    { font-size: 13px; color: rgba(0,0,0,0.58); line-height: 1.65; margin-bottom: 26px; }
        .panel-btn {
          padding: 11px 26px; background: transparent;
          border: 2px solid rgba(0,0,0,0.3); border-radius: 50px;
          font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 2px; color: #0a0a0a;
          cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .panel-btn:hover { background: rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.55); transform: translateX(3px); }

        /* Back link */
        .back-link {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; padding: 0 0 10px 0;
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase; color: #aaa;
          cursor: pointer; transition: color 0.2s, transform 0.2s;
        }
        .back-link:hover { color: #FFBD00; transform: translateX(-2px); }

        /* Forms */
        .eyebrow   { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #bbb; margin-bottom: 8px; }
        .f-heading { font-family: 'Bebas Neue', sans-serif; font-size: 50px; letter-spacing: 2px; color: #0a0a0a; line-height: 1; margin-bottom: 22px; }
        .r-heading { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: 2px; color: #0a0a0a; line-height: 1; margin-bottom: 14px; }
        .form-group { margin-bottom: 11px; }
        .form-group label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
        .form-group input {
          width: 100%; padding: 10px 13px;
          border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-group input:focus { border-color: #FFBD00; background: #fff; box-shadow: 0 0 0 3px rgba(255,189,0,0.12); }
        .error-msg { color: #dc2626; font-size: 12px; margin-bottom: 8px; padding: 7px 11px; background: #fef2f2; border-radius: 6px; border-left: 3px solid #dc2626; }
        .submit-btn {
          width: 100%; padding: 12px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: 2px;
          cursor: pointer; margin-top: 4px;
          transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover { background: #222; transform: translateY(-1px); }
      `}</style>

      <div className="auth-page">
        <div className="book">

          {/* Static login form underneath everything */}
          <div
            className="half-left"
            style={{
              boxShadow: `inset -${turnShadow * 50}px 0 ${turnShadow * 60}px rgba(0,0,0,${turnShadow * 0.22})`,
            }}
          >
            <div className="eyebrow">UWM Student Marketplace</div>
            <div className="f-heading">Sign In</div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>UWM Email</label>
                <input type="email" placeholder="ePantherID@uwm.edu"
                  value={loginData.email}
                  onChange={e => setLoginData({...loginData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••"
                  value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})} required />
              </div>
              {loginError && <div className="error-msg">{loginError}</div>}
              <button
                type="submit"
                className="submit-btn"
                style={{ pointerEvents: progress > 0.05 ? 'none' : 'all' }}
              >
                Start Trading
              </button>
            </form>
          </div>

          {/* Gold bg revealed after flip */}
          <div className="half-right-bg">
            <div className="panel-content">
              <div className="panel-icon">📚</div>
              <div className="uwm-tag">UWM Panther</div>
              <div className="panel-heading">Almost There!</div>
              <p className="panel-text">Join hundreds of UWM students saving money on textbooks every semester.</p>
              <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.45)', fontStyle: 'italic', lineHeight: 1.6, textAlign: 'center' }}>
                "Sold my calc book in 2 days —<br/>best $40 I ever made."<br/>
                <span style={{ fontWeight: 700, fontStyle: 'normal' }}>— CS Junior</span>
              </div>
            </div>
          </div>

          {/* THE FLIPPING PAGE — right half only, hinges at its left edge */}
          <div
            className="flip-page"
            style={{ transform: `perspective(1400px) rotateY(${angle}deg)` }}
          >
            <div className="spine-center" />

            {/* FRONT FACE — gold panel */}
            <div className={`face face-front${progress < 0.5 ? ' active' : ''}`}>
              <div className="panel-content">
                <div className="panel-icon">🎓</div>
                <div className="uwm-tag">New here?</div>
                <div className="panel-heading">Hello, Panther!</div>
                <p className="panel-text">Register with your UWM email to buy and sell textbooks with fellow students.</p>
                <button className="panel-btn" onClick={() => !animating && flipTo(1)}>
                  Register
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* BACK FACE — register form */}
            <div className={`face face-back${progress > 0.5 ? ' active' : ''}`}>
              <button className="back-link" onClick={() => !animating && flipTo(0)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Sign In
              </button>
              <div className="eyebrow">UWM Student Marketplace</div>
              <div className="r-heading">Create Account</div>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Pounce Panther"
                    value={regData.fullName}
                    onChange={e => setRegData({...regData, fullName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>UWM Email</label>
                  <input type="email" placeholder="ePantherID@uwm.edu"
                    value={regData.email}
                    onChange={e => setRegData({...regData, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Create a password"
                    value={regData.password}
                    onChange={e => setRegData({...regData, password: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" placeholder="Repeat your password"
                    value={regData.confirmPassword}
                    onChange={e => setRegData({...regData, confirmPassword: e.target.value})} required />
                </div>
                {regError && <div className="error-msg">{regError}</div>}
                <button type="submit" className="submit-btn">Join the Exchange</button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}