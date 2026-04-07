import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800";

function conditionColor(cond) {
  switch ((cond || "").toLowerCase()) {
    case "like new":  return { bg: "#f0fdf4", text: "#15803d", border: "#86efac" };
    case "very good": return { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" };
    case "good":      return { bg: "#fefce8", text: "#854d0e", border: "#fde047" };
    case "fair":      return { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" };
    case "poor":      return { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" };
    default:          return { bg: "#f5f5f5", text: "#555",    border: "#ddd"    };
  }
}

// ─── Lightbox with scroll/pinch zoom + pan ────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx,    setIdx]    = useState(startIndex);
  const [scale,  setScale]  = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragging  = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const overlayRef = useRef(null);
  const count = images.length;

  function resetZoom() { setScale(1); setOffset({ x: 0, y: 0 }); }

  const prev = useCallback(() => { setIdx((i) => (i - 1 + count) % count); resetZoom(); }, [count]);
  const next = useCallback(() => { setIdx((i) => (i + 1) % count);         resetZoom(); }, [count]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  { setIdx((i) => (i - 1 + count) % count); resetZoom(); }
      if (e.key === "ArrowRight") { setIdx((i) => (i + 1) % count);         resetZoom(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  // Scroll / trackpad pinch → zoom (must use non-passive listener)
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      // ctrlKey = true during a pinch gesture on Mac trackpad
      const factor = e.ctrlKey ? 0.02 : 0.008;
      const delta  = -e.deltaY * factor;
      setScale((s) => {
        const next = Math.min(6, Math.max(1, s + delta * s));
        if (next <= 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan while zoomed
  function onMouseDown(e) {
    if (scale <= 1) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e) {
    if (!dragging.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  }
  function onMouseUp() { dragging.current = false; }

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.96)",
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <style>{`
        @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lbPop    { from{transform:scale(0.94);opacity:0} to{transform:scale(1);opacity:1} }
        .lb-wrap { animation: lbFadeIn 0.18s ease; }
        .lb-img-anim { animation: lbPop 0.18s ease; }
        .lb-btn {
          position: fixed; background: rgba(255,255,255,0.1);
          border: none; color: #fff; border-radius: 50%;
          width: 50px; height: 50px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 26px;
          transition: background 0.15s, color 0.15s; z-index: 1001;
        }
        .lb-btn:hover { background: rgba(255,189,0,0.35); color: #FFBD00; }
        .lb-close { top: 18px; right: 22px; font-size: 30px; }
        .lb-left  { left: 18px; top: 50%; transform: translateY(-50%); }
        .lb-right { right: 18px; top: 50%; transform: translateY(-50%); }
        .lb-reset {
          position: fixed; top: 22px; left: 22px;
          background: rgba(255,255,255,0.08); border: none;
          color: rgba(255,255,255,0.5); border-radius: 50px;
          padding: 6px 14px; font-size: 11px; font-weight: 700;
          letter-spacing: 1px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; z-index: 1001;
          transition: background 0.15s, color 0.15s;
        }
        .lb-reset:hover { background: rgba(255,189,0,0.25); color: #FFBD00; }
        .lb-counter {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.55); color: rgba(255,255,255,0.65);
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 1.5px; padding: 5px 16px; border-radius: 50px;
          z-index: 1001; pointer-events: none;
        }
        .lb-hint {
          position: fixed; bottom: 52px; left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,0.28); font-size: 11px;
          font-family: 'DM Sans', sans-serif; letter-spacing: 0.5px;
          pointer-events: none; white-space: nowrap; z-index: 1001;
        }

        @media (max-width: 720px) {
          .detail-page { padding: 1.2rem 0.75rem; }
          .detail-layout { grid-template-columns: 1fr; gap: 16px; }
          .detail-title { font-size: 28px; }
          .detail-price { font-size: 38px; }
          .detail-info { padding: 22px 18px; }
          .gallery-thumb { width: 52px; height: 52px; }
          .detail-btn-row { flex-direction: column; }
          .detail-btn-contact, .detail-btn-back { width: 100%; text-align: center; }
        }
      `}</style>

      <div className="lb-wrap" style={{ display: "contents" }}>
        {/* Close */}
        <button className="lb-btn lb-close" onClick={onClose} aria-label="Close">×</button>

        {/* Reset zoom */}
        {scale > 1.01 && (
          <button className="lb-reset" onClick={resetZoom}>Reset zoom  ×{scale.toFixed(1)}</button>
        )}

        {/* Prev */}
        {count > 1 && (
          <button className="lb-btn lb-left" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
        )}

        {/* Image */}
        <img
          key={idx}
          src={images[idx]}
          alt={`Photo ${idx + 1}`}
          className="lb-img-anim"
          style={{
            maxWidth: "88vw", maxHeight: "84vh",
            objectFit: "contain", borderRadius: "4px",
            boxShadow: "0 0 80px rgba(0,0,0,0.6)",
            display: "block",
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            cursor: scale > 1 ? "grab" : "zoom-in",
            transition: dragging.current ? "none" : "transform 0.06s ease",
          }}
          onMouseDown={onMouseDown}
          onClick={(e) => e.stopPropagation()}
          onError={(e) => { e.target.src = FALLBACK_IMG; }}
          draggable={false}
        />

        {/* Next */}
        {count > 1 && (
          <button className="lb-btn lb-right" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
        )}

        {count > 1 && <div className="lb-counter">{idx + 1} / {count}</div>}
        <div className="lb-hint">
          {scale > 1 ? "Drag to pan · Scroll to zoom" : "Scroll or pinch to zoom · Arrow keys to navigate"}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BookDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [book,         setBook]         = useState(null);
  const [images,       setImages]       = useState([]);
  const [seller,       setSeller]       = useState(null);
  const [activeImg,    setActiveImg]    = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    async function load() {
      try {
        const baseUrl = getApiBaseUrl();

        const listingRes = await fetch(`${baseUrl}/BookListings`);
        if (!listingRes.ok) { setError("Could not reach server."); setLoading(false); return; }
        const allListings = await listingRes.json();

        const listingData = allListings.find(
          (l) => String(l.listing_id) === String(id)
        );
        if (!listingData) { setError("Listing not found."); setLoading(false); return; }
        setBook(listingData);

        // Build image URLs directly from R2 public bucket
        // Pattern: Post_Pic/{listingId}/{n}.ext  (up to 6 photos, posted by PostBook)
        const R2_BASE   = "https://pub-4429fb76bd9f4e89988702805e462f52.r2.dev";
        const MAX_SLOTS = 6;

        const probeImage = (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload  = () => resolve(url);
            img.onerror = () => resolve(null);
            img.src = url;
          });

        // For each numbered slot try common extensions in order
        const probes = [];
        for (let n = 1; n <= MAX_SLOTS; n++) {
          probes.push(
            probeImage(`${R2_BASE}/Post_Pic/${id}/${n}.jpg`)
              .then((u) => u || probeImage(`${R2_BASE}/Post_Pic/${id}/${n}.jpeg`))
              .then((u) => u || probeImage(`${R2_BASE}/Post_Pic/${id}/${n}.png`))
              .then((u) => u || probeImage(`${R2_BASE}/Post_Pic/${id}/${n}.webp`))
          );
        }
        const probeResults = await Promise.all(probes);
        let imgArr = probeResults.filter(Boolean);

        // Fall back to single image_url on the listing row if nothing found in R2
        if (imgArr.length === 0 && listingData.image_url) {
          imgArr = [listingData.image_url];
        }
        setImages(imgArr);

        if (listingData.user_id) {
          try {
            const sellerRes = await fetch(`${baseUrl}/api/users/${listingData.user_id}`);
            if (sellerRes.ok) setSeller(await sellerRes.json());
          } catch {}
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load listing.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const displayImages = images.length > 0 ? images : [FALLBACK_IMG];
  const count         = displayImages.length;
  const condStyle     = conditionColor(book?.book_condition);

  function prevImg() { setActiveImg((i) => (i - 1 + count) % count); }
  function nextImg() { setActiveImg((i) => (i + 1) % count); }

  function handleContact() {
    const stored = localStorage.getItem("bookExchangeUser");
    const currentUser = stored ? JSON.parse(stored) : null;
    if (!currentUser || !book) return;
    if (currentUser.id === book.user_id) return;
    navigate("/messages", {
      state: {
        receiverId:   book.user_id,
        receiverName: seller?.full_name || "Seller",
        listingId:    book.listing_id,
        bookTitle:    book.title,
      },
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .detail-page {
          min-height: calc(100vh - 64px); width: 100vw;
          font-family: 'DM Sans', sans-serif;
          position: relative; padding: 2.5rem 1.5rem;
          display: flex; justify-content: center; align-items: flex-start;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop')
            center/cover no-repeat fixed;
        }
        .detail-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 55% 50% at 20% 40%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 55% at 80% 25%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .detail-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .detail-back {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none; padding: 0 0 20px 0;
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase; color: #aaa;
          cursor: pointer; transition: color 0.2s;
        }
        .detail-back:hover { color: #FFBD00; }

        .detail-card { position: relative; z-index: 1; width: 100%; max-width: 980px; }

        .detail-layout {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 28px; align-items: start;
        }
        @media (max-width: 720px) { .detail-layout { grid-template-columns: 1fr; } }

        /* ── Gallery ── */
        .detail-gallery {
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,189,0,0.1);
          overflow: hidden;
        }
        .gallery-main {
          position: relative; width: 100%; aspect-ratio: 4/3;
          background: #111; overflow: hidden; cursor: zoom-in;
        }
        .gallery-main-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.3s ease; pointer-events: none;
        }
        .gallery-main:hover .gallery-main-img { transform: scale(1.03); }

        .gallery-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,0.5); border: none; color: #fff;
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; cursor: pointer; z-index: 2;
          transition: background 0.15s, color 0.15s;
          backdrop-filter: blur(4px);
        }
        .gallery-arrow:hover { background: #FFBD00; color: #0a0a0a; }
        .gallery-arrow-left  { left: 10px; }
        .gallery-arrow-right { right: 10px; }

        .gallery-counter {
          position: absolute; bottom: 10px; right: 12px;
          background: rgba(0,0,0,0.6); color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          padding: 3px 10px; border-radius: 50px; pointer-events: none;
        }
        .gallery-zoom-hint {
          position: absolute; bottom: 10px; left: 12px;
          background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.7);
          font-size: 10px; font-weight: 600;
          padding: 3px 10px; border-radius: 50px; pointer-events: none;
        }

        .gallery-thumbs {
          display: flex; gap: 8px; padding: 12px;
          overflow-x: auto; background: #fafafa;
          border-top: 1.5px solid #f0f0f0; scrollbar-width: thin;
        }
        .gallery-thumb {
          width: 62px; height: 62px; flex-shrink: 0;
          border-radius: 8px; overflow: hidden; cursor: pointer;
          border: 2.5px solid transparent;
          transition: border-color 0.15s, transform 0.15s; background: #eee;
        }
        .gallery-thumb.active { border-color: #FFBD00; transform: scale(1.07); }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* ── Info panel ── */
        .detail-info {
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,189,0,0.1);
          padding: 36px 32px;
        }
        .detail-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: #bbb; margin-bottom: 6px;
        }
        .detail-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 38px; letter-spacing: 1px; color: #0a0a0a;
          line-height: 1.1; margin-bottom: 6px;
        }
        .detail-author { font-size: 14px; color: #666; margin-bottom: 18px; }
        .detail-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 52px; letter-spacing: 1px; color: #0a0a0a;
          line-height: 1; margin-bottom: 18px;
        }
        .detail-meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .detail-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 50px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        }
        .detail-pill-course { background: #0a0a0a; color: #FFBD00; }
        .detail-pill-status-available { background: #f0fdf4; color: #15803d; border: 1.5px solid #86efac; }
        .detail-pill-status-pending   { background: #fefce8; color: #854d0e; border: 1.5px solid #fde047; }
        .detail-pill-status-sold      { background: #fef2f2; color: #b91c1c; border: 1.5px solid #fca5a5; }

        .detail-divider { height: 1.5px; background: #f0f0f0; margin: 18px 0; }

        .detail-data-table { width: 100%; }
        .detail-data-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px;
        }
        .detail-data-row:last-child { border-bottom: none; }
        .detail-data-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #bbb;
        }
        .detail-data-value { color: #0a0a0a; font-weight: 500; text-align: right; }
        .detail-condition-badge {
          display: inline-block; padding: 4px 12px; border-radius: 50px;
          font-size: 11px; font-weight: 700; border: 1.5px solid;
        }
        .detail-notes-box {
          background: #fafafa; border-radius: 10px;
          border: 1.5px solid #f0f0f0; padding: 14px 16px; margin-top: 18px;
        }
        .detail-notes-label {
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #bbb; margin-bottom: 6px;
        }
        .detail-notes-text { font-size: 13px; color: #444; line-height: 1.6; }
        .detail-seller-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: 12px;
          background: #fafafa; border: 1.5px solid #f0f0f0; margin-top: 18px;
        }
        .detail-seller-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          object-fit: cover; border: 2.5px solid #FFBD00; flex-shrink: 0;
        }
        .detail-seller-name  { font-size: 13px; font-weight: 700; color: #0a0a0a; }
        .detail-seller-label {
          font-size: 10px; color: #bbb; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
        }
        .detail-btn-row { display: flex; gap: 10px; margin-top: 22px; }
        .detail-btn-contact {
          flex: 1; padding: 14px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 10px;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px;
          cursor: pointer; transition: background 0.2s, transform 0.15s;
        }
        .detail-btn-contact:hover:not(:disabled) { background: #222; transform: translateY(-1px); }
        .detail-btn-contact:disabled { opacity: 0.4; cursor: not-allowed; }
        .detail-btn-back {
          padding: 14px 18px; background: #fafafa; color: #0a0a0a;
          border: 1.5px solid #e0e0e0; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
        }
        .detail-btn-back:hover { background: #f0f0f0; }

        .detail-state {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 40vh; gap: 14px;
        }
        .detail-state-text {
          font-family: 'Bebas Neue', sans-serif; font-size: 28px;
          letter-spacing: 3px; color: rgba(255,255,255,0.45);
        }
      `}</style>

      <div className="detail-page">
        {loading ? (
          <div className="detail-state">
            <div className="detail-state-text">Loading…</div>
          </div>
        ) : error || !book ? (
          <div className="detail-state">
            <div style={{ fontSize: "3rem" }}>📚</div>
            <div className="detail-state-text">{error || "Listing not found."}</div>
            <button className="detail-btn-back" onClick={() => navigate("/booklistings")}>
              ← Back to Listings
            </button>
          </div>
        ) : (
          <div className="detail-card">

            <button className="detail-back" onClick={() => navigate("/booklistings")}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Listings
            </button>

            <div className="detail-layout">

              {/* ── Gallery ── */}
              <div className="detail-gallery">
                <div className="gallery-main" onClick={() => setLightboxOpen(true)}>
                  <img
                    key={activeImg}
                    src={displayImages[activeImg]}
                    alt={`${book.title} photo ${activeImg + 1}`}
                    className="gallery-main-img"
                    onError={(e) => { e.target.src = FALLBACK_IMG; }}
                  />

                  {count > 1 && (
                    <button
                      className="gallery-arrow gallery-arrow-left"
                      onClick={(e) => { e.stopPropagation(); prevImg(); }}
                      aria-label="Previous photo"
                    >‹</button>
                  )}
                  {count > 1 && (
                    <button
                      className="gallery-arrow gallery-arrow-right"
                      onClick={(e) => { e.stopPropagation(); nextImg(); }}
                      aria-label="Next photo"
                    >›</button>
                  )}
                  {count > 1 && (
                    <div className="gallery-counter">{activeImg + 1} / {count}</div>
                  )}
                  <div className="gallery-zoom-hint">🔍 Click to zoom</div>
                </div>

                {count > 1 && (
                  <div className="gallery-thumbs">
                    {displayImages.map((src, i) => (
                      <div
                        key={i}
                        className={`gallery-thumb${i === activeImg ? " active" : ""}`}
                        onClick={() => setActiveImg(i)}
                      >
                        <img
                          src={src}
                          alt={`Thumbnail ${i + 1}`}
                          onError={(e) => { e.target.src = FALLBACK_IMG; }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Info ── */}
              <div className="detail-info">
                <div className="detail-eyebrow">UWM Student Marketplace</div>
                <div className="detail-title">{book.title}</div>
                <div className="detail-author">by {book.author}</div>
                <div className="detail-price">${Number(book.price).toFixed(2)}</div>

                <div className="detail-meta-row">
                  {book.course_code && (
                    <span className="detail-pill detail-pill-course">📖 {book.course_code}</span>
                  )}
                  {book.status && (
                    <span className={`detail-pill detail-pill-status-${(book.status || "available").toLowerCase()}`}>
                      {book.status}
                    </span>
                  )}
                </div>

                <div className="detail-divider" />

                <div className="detail-data-table">
                  <div className="detail-data-row">
                    <span className="detail-data-label">Condition</span>
                    <span
                      className="detail-condition-badge"
                      style={{
                        backgroundColor: condStyle.bg,
                        color:           condStyle.text,
                        borderColor:     condStyle.border,
                      }}
                    >
                      {book.book_condition || "—"}
                    </span>
                  </div>
                  {book.edition && (
                    <div className="detail-data-row">
                      <span className="detail-data-label">Edition</span>
                      <span className="detail-data-value">{book.edition}</span>
                    </div>
                  )}
                  {book.isbn && (
                    <div className="detail-data-row">
                      <span className="detail-data-label">ISBN</span>
                      <span className="detail-data-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                        {book.isbn}
                      </span>
                    </div>
                  )}
                  {book.course_code && (
                    <div className="detail-data-row">
                      <span className="detail-data-label">Course</span>
                      <span className="detail-data-value">{book.course_code}</span>
                    </div>
                  )}
                  <div className="detail-data-row">
                    <span className="detail-data-label">Listed</span>
                    <span className="detail-data-value">
                      {book.created_at
                        ? new Date(book.created_at).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                </div>

                {book.notes && (
                  <div className="detail-notes-box">
                    <div className="detail-notes-label">Seller Notes</div>
                    <div className="detail-notes-text">{book.notes}</div>
                  </div>
                )}

                {seller && (
                  <div className="detail-seller-card">
                    <img
                      src={seller.profile_image_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.full_name)}&background=FFBD00&color=000&size=88`}
                      alt={seller.full_name}
                      className="detail-seller-avatar"
                    />
                    <div>
                      <div className="detail-seller-label">Seller</div>
                      <div className="detail-seller-name">{seller.full_name}</div>
                    </div>
                  </div>
                )}

                {(() => {
                  const stored = localStorage.getItem("bookExchangeUser");
                  const me = stored ? JSON.parse(stored) : null;
                  const isOwn = me && me.id === book.user_id;
                  const isSold = (book.status || "").toLowerCase() === "sold";
                  return (
                    <div className="detail-btn-row">
                      <button
                        className="detail-btn-contact"
                        onClick={handleContact}
                        disabled={isOwn || isSold}
                      >
                        {isOwn ? "Your Listing" : isSold ? "Sold" : "Contact Seller"}
                      </button>
                      <button className="detail-btn-back" onClick={() => navigate("/booklistings")}>
                        ← Back
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={displayImages}
          startIndex={activeImg}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}