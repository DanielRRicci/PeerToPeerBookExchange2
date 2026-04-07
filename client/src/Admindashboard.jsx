import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser } from "./auth";

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function actionLabel(type) {
  const map = {
    approve_listing:                   "✓ Approved listing",
    set_listing_status_active:         "↑ Set Active",
    set_listing_status_sold:           "$ Marked Sold",
    set_listing_status_pending:        "⏳ Set Pending",
    set_listing_status_removed:        "✕ Removed listing",
    set_listing_status_under_review:   "⚑ Under Review",
    remove_listing:                    "✕ Removed listing",
    suspend_user:                      "⛔ Suspended user",
    unsuspend_user:                    "✓ Unsuspended user",
    promote_to_admin:                  "⚡ Promoted to Admin",
  };
  return map[type] || type;
}

function statusColors(status) {
  switch ((status || "").toLowerCase()) {
    case "active":       return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" };
    case "pending":      return { bg: "#fefce8", text: "#854d0e", border: "#fde047", dot: "#eab308" };
    case "sold":         return { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444" };
    case "removed":      return { bg: "#f5f5f5", text: "#777",    border: "#ddd",    dot: "#aaa"    };
    case "under review": return { bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" };
    default:             return { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" };
  }
}

function StatusPill({ status }) {
  const c = statusColors(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
      background: c.bg, color: c.text, border: `1.5px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {status || "Active"}
    </span>
  );
}

// ─── Bar chart with date labels ───────────────────────────────────────────────
function SparkBars({ data = [], color = "#FFBD00", height = 80 }) {
  if (!data.length) return <div style={{ height }}>—</div>;
  const max = Math.max(...data.map((d) => d.count), 1);

  // Show a label every N bars so they don't overlap
  const total     = data.length;
  const labelEvery = total <= 7 ? 1 : total <= 14 ? 2 : total <= 21 ? 3 : 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${formatDateLabel(d.date)}: ${d.count}`}
            style={{
              flex: 1, minWidth: 4,
              height: `${Math.max(4, (d.count / max) * 100)}%`,
              background: color,
              borderRadius: "2px 2px 0 0",
              opacity: 0.85,
              transition: "height 0.3s ease",
              cursor: "default",
            }}
          />
        ))}
      </div>
      {/* X-axis date labels */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1, minWidth: 4,
              fontSize: 9, color: "#bbb", textAlign: "center",
              overflow: "hidden", whiteSpace: "nowrap",
              visibility: i % labelEvery === 0 ? "visible" : "hidden",
            }}
          >
            {formatDateLabel(d.date)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 100 }) {
  const total = slices.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let cumulative = 0;
  const r = 40, cx = 50, cy = 50;

  function polarToCartesian(angle) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(startAngle, endAngle) {
    const start = polarToCartesian(startAngle);
    const end   = polarToCartesian(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {slices.map((s, i) => {
        const startAngle = (cumulative / total) * 360;
        const sweep      = (s.value / total) * 360;
        cumulative += s.value;
        if (sweep === 0) return null;
        return (
          <path key={i} d={describeArc(startAngle, startAngle + sweep)} fill={s.color}>
            <title>{s.label}: {s.value}</title>
          </path>
        );
      })}
      <circle cx={cx} cy={cy} r={26} fill="#fff" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0a0a0a">
        {total}
      </text>
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = "#FFBD00" }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "20px 22px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      borderLeft: `4px solid ${accent}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, color: "#0a0a0a" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#999" }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#bbb" }}>{sub}</div>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, badge, children, action }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)", marginBottom: 24,
    }}>
      <div style={{
        background: "#0a0a0a", padding: "16px 22px",
        borderBottom: "3px solid #FFBD00",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: "#FFBD00" }}>
            {title}
          </span>
          {badge != null && (
            <span style={{ background: "#FFBD00", color: "#0a0a0a", fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 22px" }}>{children}</div>
    </div>
  );
}

const TABS = ["Overview", "Listings", "Users", "Moderation Log"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate    = useNavigate();
  const currentUser = getStoredUser();

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/booklistings", { replace: true });
    }
  }, []);

  const [activeTab,     setActiveTab]     = useState("Overview");
  const [stats,         setStats]         = useState(null);
  const [modLog,        setModLog]        = useState([]);
  const [allListings,   setAllListings]   = useState([]);
  const [allUsers,      setAllUsers]      = useState([]);
  const [listingFilter, setListingFilter] = useState("All");
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [loadingLog,    setLoadingLog]    = useState(false);
  const [loadingList,   setLoadingList]   = useState(false);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [actionNote,    setActionNote]    = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const baseUrl = getApiBaseUrl();
  const headers = { "Content-Type": "application/json", "x-user-id": currentUser?.id };

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoadingStats(false);
  }, []);

  const loadModLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/moderation-log?limit=60`, { headers });
      if (res.ok) setModLog(await res.json());
    } catch {}
    setLoadingLog(false);
  }, []);

  const loadListings = useCallback(async () => {
    setLoadingList(true);
    try {
      const url = listingFilter === "All"
        ? `${baseUrl}/api/admin/listings`
        : `${baseUrl}/api/admin/listings?status=${encodeURIComponent(listingFilter)}`;
      const res = await fetch(url, { headers });
      if (res.ok) setAllListings(await res.json());
    } catch {}
    setLoadingList(false);
  }, [listingFilter]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, { headers });
      if (res.ok) setAllUsers(await res.json());
    } catch {}
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadStats(); loadModLog(); }, []);
  useEffect(() => { if (activeTab === "Listings")       loadListings(); }, [activeTab, listingFilter]);
  useEffect(() => { if (activeTab === "Users")          loadUsers();    }, [activeTab]);
  useEffect(() => { if (activeTab === "Moderation Log") loadModLog();   }, [activeTab]);

  async function approveListing(id) {
    await fetch(`${baseUrl}/api/admin/listings/${id}/approve`, {
      method: "POST", headers, body: JSON.stringify({ userId: currentUser?.id }),
    });
    setAllListings((prev) => prev.map((l) => l.listing_id === id ? { ...l, status: "Active" } : l));
    loadStats();
    setConfirmTarget(null);
  }

  async function setListingStatus(id, status) {
    await fetch(`${baseUrl}/api/admin/listings/${id}/status`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status, notes: actionNote, userId: currentUser?.id }),
    });
    setAllListings((prev) => prev.map((l) => l.listing_id === id ? { ...l, status } : l));
    loadStats();
    setConfirmTarget(null);
    setActionNote("");
  }

  async function suspendUser(id) {
    await fetch(`${baseUrl}/api/admin/users/${id}/suspend`, {
      method: "POST", headers,
      body: JSON.stringify({ reason: actionNote, userId: currentUser?.id }),
    });
    setAllUsers((prev) => prev.map((u) => u.user_id === id ? { ...u, is_suspended: true } : u));
    setConfirmTarget(null);
    setActionNote("");
  }

  async function unsuspendUser(id) {
    await fetch(`${baseUrl}/api/admin/users/${id}/unsuspend`, {
      method: "POST", headers, body: JSON.stringify({ userId: currentUser?.id }),
    });
    setAllUsers((prev) => prev.map((u) => u.user_id === id ? { ...u, is_suspended: false } : u));
    setConfirmTarget(null);
  }

  async function makeAdmin(id) {
    await fetch(`${baseUrl}/api/admin/users/${id}/make-admin`, {
      method: "POST", headers, body: JSON.stringify({ userId: currentUser?.id }),
    });
    setAllUsers((prev) => prev.map((u) => u.user_id === id ? { ...u, role: "admin" } : u));
    setConfirmTarget(null);
  }

  const pendingCount = Number(stats?.listings?.pending       || 0);
  const reviewCount  = Number(stats?.listings?.under_review  || 0);
  const urgentCount  = pendingCount + reviewCount;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-page { min-height: calc(100vh - 64px); width: 100%; background: #f4f5f7; font-family: 'DM Sans', sans-serif; }

        .admin-header {
          background: #0a0a0a; border-bottom: 3px solid #FFBD00;
          padding: 20px 32px; display: flex; align-items: center; justify-content: space-between;
        }
        .admin-header-left { display: flex; align-items: center; gap: 14px; }
        .admin-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 3px; color: #FFBD00; }
        .admin-pill  { background: #FFBD00; color: #0a0a0a; font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; }
        .admin-back  {
          background: rgba(255,189,0,0.1); border: 1.5px solid rgba(255,189,0,0.25);
          color: #FFBD00; border-radius: 8px; padding: 6px 16px;
          font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer; transition: background 0.15s;
        }
        .admin-back:hover { background: rgba(255,189,0,0.2); }

        .admin-tabs {
          display: flex; gap: 2px; padding: 0 32px;
          background: #0a0a0a; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .admin-tab {
          padding: 12px 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: rgba(255,189,0,0.5); cursor: pointer;
          border-bottom: 3px solid transparent; transition: color 0.15s, border-color 0.15s;
          display: flex; align-items: center; gap: 6px;
        }
        .admin-tab:hover  { color: rgba(255,189,0,0.85); }
        .admin-tab.active { color: #FFBD00; border-bottom-color: #FFBD00; }
        .tab-badge {
          background: #ef4444; color: #fff; font-size: 9px; font-weight: 800;
          padding: 1px 6px; border-radius: 20px; letter-spacing: 0;
        }

        .admin-body { padding: 28px 32px; max-width: 1200px; margin: 0 auto; }

        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px; margin-bottom: 24px;
        }

        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        @media (max-width: 700px) { .charts-row { grid-template-columns: 1fr; } }

        .chart-inner { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .legend-list { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 120px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #555; }
        .legend-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .legend-val  { margin-left: auto; font-weight: 700; color: #0a0a0a; }

        /* chart date range label */
        .chart-range {
          font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
          color: #bbb; margin-bottom: 10px;
        }

        .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .admin-table th {
          background: #f9f9f9; padding: 10px 14px; text-align: left;
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #888; border-bottom: 1.5px solid #f0f0f0;
        }
        .admin-table td { padding: 11px 14px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }

        /* clickable rows */
        .admin-table tr.clickable-row { cursor: pointer; }
        .admin-table tr.clickable-row:hover td { background: #fffbeb; }

        .tbl-btn {
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
          cursor: pointer; border: 1.5px solid; transition: background 0.15s;
        }
        .tbl-btn-approve { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .tbl-btn-approve:hover { background: #dcfce7; }
        .tbl-btn-remove  { background: #fef2f2; color: #b91c1c; border-color: #fca5a5; }
        .tbl-btn-remove:hover  { background: #fee2e2; }
        .tbl-btn-suspend { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
        .tbl-btn-suspend:hover { background: #ffedd5; }
        .tbl-btn-restore { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .tbl-btn-restore:hover { background: #dcfce7; }
        .tbl-btn-admin   { background: #fefce8; color: #854d0e; border-color: #fde047; }
        .tbl-btn-admin:hover   { background: #fef9c3; }
        .tbl-btn-review  { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
        .tbl-btn-review:hover  { background: #ffedd5; }

        .action-group { display: flex; gap: 6px; flex-wrap: wrap; }

        .log-feed { display: flex; flex-direction: column; gap: 10px; }
        .log-item  {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 10px 12px; border-radius: 10px; background: #fafafa; border: 1px solid #f0f0f0;
        }
        .log-icon  {
          width: 32px; height: 32px; border-radius: 8px; background: #0a0a0a;
          display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;
        }
        .log-action { font-size: 13px; font-weight: 700; color: #0a0a0a; }
        .log-meta   { font-size: 11px; color: #aaa; margin-top: 2px; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
        }
        .modal-box {
          background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .modal-box h3 { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; color: #0a0a0a; margin-bottom: 8px; }
        .modal-box p  { font-size: 13px; color: #555; margin-bottom: 16px; }
        .modal-note   {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e0e0e0; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none;
          margin-bottom: 16px; resize: vertical; min-height: 60px;
        }
        .modal-note:focus { border-color: #FFBD00; box-shadow: 0 0 0 3px rgba(255,189,0,0.12); }
        .modal-actions { display: flex; gap: 10px; }
        .modal-confirm {
          flex: 1; padding: 11px; background: #0a0a0a; color: #FFBD00; border: none;
          border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;
        }
        .modal-confirm:hover { background: #222; }
        .modal-cancel {
          flex: 1; padding: 11px; background: #f0f0f0; color: #555; border: none;
          border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;
        }
        .modal-cancel:hover { background: #e0e0e0; }

        .empty-msg { color: #bbb; font-size: 13px; text-align: center; padding: 24px 0; }

        .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .filter-chip {
          padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700;
          cursor: pointer; border: 1.5px solid #e0e0e0; background: #fafafa; color: #666;
          transition: all 0.15s;
        }
        .filter-chip.active { background: #0a0a0a; color: #FFBD00; border-color: #0a0a0a; }
        .filter-chip:hover:not(.active) { border-color: #FFBD00; color: #0a0a0a; }

        .spinner {
          display: inline-block; width: 20px; height: 20px;
          border: 3px solid #f0f0f0; border-top-color: #FFBD00;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Under Review callout banner */
        .review-banner {
          display: flex; align-items: center; justify-content: space-between;
          background: #fff7ed; border: 1.5px solid #fdba74; border-radius: 10px;
          padding: 12px 16px; margin-bottom: 16px; gap: 12px;
        }
        .review-banner-text { font-size: 13px; font-weight: 600; color: #c2410c; }
        .review-banner-btn  {
          background: #c2410c; color: #fff; border: none; padding: 6px 16px;
          border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer;
          white-space: nowrap; transition: background 0.15s;
        }
        .review-banner-btn:hover { background: #9a3412; }
      `}</style>

      <div className="admin-page">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-title">Admin Dashboard</div>
            <span className="admin-pill">⚡ Admin</span>
            {urgentCount > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>
                {urgentCount} need attention
              </span>
            )}
          </div>
          <button className="admin-back" onClick={() => navigate("/booklistings")}>
            ← Back to Listings
          </button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`admin-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Listings" && urgentCount > 0 && (
                <span className="tab-badge">{urgentCount}</span>
              )}
            </div>
          ))}
        </div>

        <div className="admin-body">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {activeTab === "Overview" && (
            <>
              {loadingStats ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div className="spinner" />
                </div>
              ) : stats ? (
                <>
                  {/* Under Review callout */}
                  {reviewCount > 0 && (
                    <div className="review-banner">
                      <div className="review-banner-text">
                        ⚑ {reviewCount} listing{reviewCount > 1 ? "s are" : " is"} Under Review and need your attention
                      </div>
                      <button
                        className="review-banner-btn"
                        onClick={() => { setActiveTab("Listings"); setListingFilter("Under Review"); }}
                      >
                        Review Now →
                      </button>
                    </div>
                  )}

                  {/* Listing stat cards */}
                  <div className="stats-grid">
                    <StatCard icon="📚" label="Total Listings"   value={stats.listings?.total_listings} accent="#FFBD00" />
                    <StatCard icon="⏳" label="Pending Approval" value={stats.listings?.pending}        accent="#eab308" sub="Awaiting review" />
                    <StatCard icon="✅" label="Active"           value={stats.listings?.active}         accent="#22c55e" />
                    <StatCard icon="💰" label="Sold"             value={stats.listings?.sold}           accent="#3b82f6" />
                    <StatCard icon="⚑"  label="Under Review"    value={stats.listings?.under_review}   accent="#f97316" sub="Flagged" />
                    <StatCard icon="✕"  label="Removed"         value={stats.listings?.removed}        accent="#ef4444" />
                  </div>

                  {/* User stat cards */}
                  <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                    <StatCard icon="👥" label="Total Users"   value={stats.users?.total_users}    accent="#8b5cf6" />
                    <StatCard icon="🆕" label="New (7 days)"  value={stats.users?.new_last_7d}    accent="#06b6d4" />
                    <StatCard icon="📅" label="New (30 days)" value={stats.users?.new_last_30d}   accent="#0ea5e9" />
                    <StatCard icon="⛔" label="Suspended"     value={stats.users?.suspended_count} accent="#ef4444" />
                    <StatCard icon="⚡" label="Admins"        value={stats.users?.admin_count}    accent="#FFBD00" />
                  </div>

                  {/* Charts */}
                  <div className="charts-row">
                    <Section title="Listings by Status">
                      <div className="chart-inner">
                        <DonutChart
                          size={120}
                          slices={[
                            { value: Number(stats.listings?.active       || 0), color: "#22c55e", label: "Active"       },
                            { value: Number(stats.listings?.pending      || 0), color: "#eab308", label: "Pending"      },
                            { value: Number(stats.listings?.sold         || 0), color: "#3b82f6", label: "Sold"         },
                            { value: Number(stats.listings?.under_review || 0), color: "#f97316", label: "Under Review" },
                            { value: Number(stats.listings?.removed      || 0), color: "#e5e7eb", label: "Removed"      },
                          ]}
                        />
                        <div className="legend-list">
                          {[
                            { label: "Active",       color: "#22c55e", val: stats.listings?.active       },
                            { label: "Pending",      color: "#eab308", val: stats.listings?.pending      },
                            { label: "Sold",         color: "#3b82f6", val: stats.listings?.sold         },
                            { label: "Under Review", color: "#f97316", val: stats.listings?.under_review },
                            { label: "Removed",      color: "#e5e7eb", val: stats.listings?.removed      },
                          ].map((d) => (
                            <div key={d.label} className="legend-item">
                              <span className="legend-dot" style={{ background: d.color }} />
                              {d.label}
                              <span className="legend-val">{d.val ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Section>

                    <Section title="New Signups (30 days)">
                      {stats.signupTrend?.length > 0 ? (
                        <>
                          <div className="chart-range">
                            {formatDateLabel(stats.signupTrend[0]?.date)} — {formatDateLabel(stats.signupTrend[stats.signupTrend.length - 1]?.date)}
                          </div>
                          <SparkBars data={stats.signupTrend} color="#FFBD00" height={80} />
                        </>
                      ) : (
                        <div className="empty-msg">No signup data yet.</div>
                      )}
                      <div style={{ fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 8 }}>
                        {stats.users?.new_last_30d ?? 0} new users this month
                      </div>
                    </Section>
                  </div>

                  <Section title="New Listings (30 days)">
                    {stats.listingTrend?.length > 0 ? (
                      <>
                        <div className="chart-range">
                          {formatDateLabel(stats.listingTrend[0]?.date)} — {formatDateLabel(stats.listingTrend[stats.listingTrend.length - 1]?.date)}
                        </div>
                        <SparkBars data={stats.listingTrend} color="#3b82f6" height={70} />
                      </>
                    ) : (
                      <div className="empty-msg">No listing data yet.</div>
                    )}
                    <div style={{ fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 8 }}>
                      {stats.listings?.total_listings ?? 0} total listings
                    </div>
                  </Section>
                </>
              ) : (
                <div className="empty-msg">Could not load stats.</div>
              )}
            </>
          )}

          {/* ── LISTINGS ─────────────────────────────────────────────────── */}
          {activeTab === "Listings" && (
            <Section title="All Listings" badge={allListings.length}>
              <div className="filter-chips">
                {["All", "Pending", "Active", "Sold", "Under Review", "Removed"].map((f) => (
                  <div
                    key={f}
                    className={`filter-chip${listingFilter === f ? " active" : ""}`}
                    onClick={() => setListingFilter(f)}
                  >
                    {f}
                    {f === "Pending" && pendingCount > 0 && (
                      <span style={{ marginLeft: 5, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 20 }}>
                        {pendingCount}
                      </span>
                    )}
                    {f === "Under Review" && reviewCount > 0 && (
                      <span style={{ marginLeft: 5, background: "#f97316", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 20 }}>
                        {reviewCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {loadingList ? (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div className="spinner" />
                </div>
              ) : allListings.length === 0 ? (
                <div className="empty-msg">No listings match this filter.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Seller</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Posted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allListings.map((l) => (
                        <tr
                          key={l.listing_id}
                          className="clickable-row"
                          onClick={() => navigate(`/listings/${l.listing_id}`)}
                          title="Click to view listing"
                        >
                          <td>
                            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                              {l.title}
                              {(l.status === "Pending" || l.status === "Under Review") && (
                                <span style={{ fontSize: 10, color: "#aaa" }}>↗ view</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{l.author}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{l.seller_name}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{l.seller_email}</div>
                          </td>
                          <td>${Number(l.price).toFixed(2)}</td>
                          <td><StatusPill status={l.status} /></td>
                          <td style={{ fontSize: 12, color: "#aaa" }}>{relativeTime(l.created_at)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="action-group">
                              {l.status === "Pending" && (
                                <button
                                  className="tbl-btn tbl-btn-approve"
                                  onClick={() => setConfirmTarget({
                                    type: "approve", id: l.listing_id,
                                    label: l.title, action: () => approveListing(l.listing_id),
                                  })}
                                >✓ Approve</button>
                              )}
                              {l.status === "Under Review" && (
                                <button
                                  className="tbl-btn tbl-btn-approve"
                                  onClick={() => setConfirmTarget({
                                    type: "approve", id: l.listing_id,
                                    label: l.title, action: () => approveListing(l.listing_id),
                                  })}
                                >✓ Restore</button>
                              )}
                              {l.status !== "Removed" && (
                                <button
                                  className="tbl-btn tbl-btn-remove"
                                  onClick={() => setConfirmTarget({
                                    type: "remove", id: l.listing_id,
                                    label: l.title, action: () => setListingStatus(l.listing_id, "Removed"),
                                    needsNote: true,
                                  })}
                                >Remove</button>
                              )}
                              {l.status !== "Under Review" && l.status !== "Removed" && (
                                <button
                                  className="tbl-btn tbl-btn-review"
                                  onClick={() => setListingStatus(l.listing_id, "Under Review")}
                                >⚑ Flag</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ── USERS ────────────────────────────────────────────────────── */}
          {activeTab === "Users" && (
            <Section title="All Users" badge={allUsers.length}>
              {loadingUsers ? (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div className="spinner" />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="empty-msg">No users found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Listings</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => (
                        <tr key={u.user_id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{u.email}</div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                              padding: "2px 9px", borderRadius: 20,
                              background: u.role === "admin" ? "#FFBD00" : "#f0f0f0",
                              color: u.role === "admin" ? "#0a0a0a" : "#555",
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td>{u.listing_count}</td>
                          <td>
                            {u.is_suspended ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1.5px solid #fca5a5", padding: "2px 9px", borderRadius: 20 }}>
                                Suspended
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1.5px solid #86efac", padding: "2px 9px", borderRadius: 20 }}>
                                Active
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "#aaa" }}>{relativeTime(u.created_at)}</td>
                          <td>
                            <div className="action-group">
                              {u.user_id !== currentUser?.id && u.role !== "admin" && (
                                <>
                                  {u.is_suspended ? (
                                    <button
                                      className="tbl-btn tbl-btn-restore"
                                      onClick={() => setConfirmTarget({
                                        type: "unsuspend", id: u.user_id,
                                        label: u.full_name, action: () => unsuspendUser(u.user_id),
                                      })}
                                    >↩ Restore</button>
                                  ) : (
                                    <button
                                      className="tbl-btn tbl-btn-suspend"
                                      onClick={() => setConfirmTarget({
                                        type: "suspend", id: u.user_id,
                                        label: u.full_name, action: () => suspendUser(u.user_id),
                                        needsNote: true,
                                      })}
                                    >⛔ Suspend</button>
                                  )}
                                  <button
                                    className="tbl-btn tbl-btn-admin"
                                    onClick={() => setConfirmTarget({
                                      type: "makeAdmin", id: u.user_id,
                                      label: u.full_name, action: () => makeAdmin(u.user_id),
                                    })}
                                  >⚡ Make Admin</button>
                                </>
                              )}
                              {u.user_id === currentUser?.id && (
                                <span style={{ fontSize: 11, color: "#aaa" }}>You</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ── MODERATION LOG ───────────────────────────────────────────── */}
          {activeTab === "Moderation Log" && (
            <Section title="Moderation Log" badge={modLog.length}>
              {loadingLog ? (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div className="spinner" />
                </div>
              ) : modLog.length === 0 ? (
                <div className="empty-msg">No actions logged yet.</div>
              ) : (
                <div className="log-feed">
                  {modLog.map((entry) => (
                    <div key={entry.log_id} className="log-item">
                      <div className="log-icon">⚡</div>
                      <div style={{ flex: 1 }}>
                        <div className="log-action">{actionLabel(entry.action_type)}</div>
                        <div className="log-meta">
                          by <strong>{entry.admin_name}</strong>
                          {" · "}{entry.target_type} #{entry.target_id}
                          {entry.notes && <span style={{ color: "#999" }}> · "{entry.notes}"</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#bbb", flexShrink: 0 }}>
                        {relativeTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

        </div>
      </div>

      {/* Confirm modal */}
      {confirmTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmTarget(null); }}>
          <div className="modal-box">
            <h3>Confirm Action</h3>
            <p>
              {confirmTarget.type === "approve"   && `Approve listing: "${confirmTarget.label}"?`}
              {confirmTarget.type === "remove"    && `Remove listing: "${confirmTarget.label}"? This will set it to Removed status.`}
              {confirmTarget.type === "suspend"   && `Suspend user: "${confirmTarget.label}"? They will lose access immediately.`}
              {confirmTarget.type === "unsuspend" && `Restore access for: "${confirmTarget.label}"?`}
              {confirmTarget.type === "makeAdmin" && `Promote "${confirmTarget.label}" to Admin? This grants full admin access.`}
            </p>
            {confirmTarget.needsNote && (
              <textarea
                className="modal-note"
                placeholder="Optional reason / notes…"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            )}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setConfirmTarget(null); setActionNote(""); }}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={confirmTarget.action}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}