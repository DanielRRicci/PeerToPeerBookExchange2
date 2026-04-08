import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser } from "./auth";

export default function Notifications() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/notifications?userId=${currentUser.id}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  async function clearAll() {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/clear`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function notificationIcon(type) {
    if (type === "message") return "💬";
    if (type === "price_drop") return "💰";
    return "🔔";
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .notif-page {
          min-height: calc(100vh - 64px);
          width: 100vw;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          padding: 2.5rem 1.5rem;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .notif-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .notif-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .notif-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .notif-header {
          background: #0a0a0a;
          padding: 24px 28px 20px;
          border-bottom: 3px solid #FFBD00;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .notif-header-left { display: flex; align-items: center; gap: 12px; }
        .notif-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          letter-spacing: 2px;
          color: #FFBD00;
          line-height: 1;
        }
        .notif-unread-badge {
          background: #FFBD00;
          color: #0a0a0a;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }
        .notif-header-actions { display: flex; gap: 8px; }
        .notif-action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1.5px solid rgba(255,189,0,0.3);
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
        }
        .notif-action-btn:hover {
          border-color: #FFBD00;
          color: #FFBD00;
          background: rgba(255,189,0,0.08);
        }

        .notif-body { padding: 0; }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 24px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: #fafafa; }
        .notif-item.unread { background: #fffdf0; }
        .notif-item.unread:hover { background: #fff9d6; }

        .notif-unread-dot {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #FFBD00;
        }

        .notif-icon {
          font-size: 1.4rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .notif-content { flex: 1; min-width: 0; }
        .notif-message {
          font-size: 13px;
          color: #0a0a0a;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 4px;
        }
        .notif-time {
          font-size: 11px;
          color: #bbb;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .notif-mark-read {
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1.5px solid #e8e8e8;
          background: transparent;
          color: #bbb;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          align-self: center;
        }
        .notif-mark-read:hover { border-color: #FFBD00; color: #0a0a0a; }

        .notif-empty {
          text-align: center;
          padding: 60px 24px;
          color: #bbb;
        }
        .notif-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .notif-empty-text {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 2px;
          color: #ccc;
        }
        .notif-empty-sub { font-size: 13px; color: #bbb; margin-top: 6px; }

        .notif-back {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #aaa;
          text-decoration: none;
          margin-top: 20px;
          cursor: pointer;
          transition: color 0.2s;
          position: relative;
          z-index: 1;
        }
        .notif-back:hover { color: #FFBD00; }
      `}</style>

      <div className="notif-page">
        <div style={{ width: "100%", maxWidth: "600px", position: "relative", zIndex: 1 }}>
          <div className="notif-card">
            <div className="notif-header">
              <div className="notif-header-left">
                <div className="notif-title">Notifications</div>
                {unreadCount > 0 && (
                  <span className="notif-unread-badge">{unreadCount} new</span>
                )}
              </div>
              <div className="notif-header-actions">
                {unreadCount > 0 && (
                  <button className="notif-action-btn" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="notif-action-btn" onClick={clearAll}>
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="notif-body">
              {loading ? (
                <div className="notif-empty">
                  <div className="notif-empty-text">Loading…</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">
                  <div className="notif-empty-icon">🔔</div>
                  <div className="notif-empty-text">All caught up</div>
                  <div className="notif-empty-sub">No notifications yet</div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.notification_id}
                    className={`notif-item${!n.is_read ? " unread" : ""}`}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.notification_id);
                      if (n.type === "message") navigate("/messages");
                      else if (n.listing_id) navigate(`/listings/${n.listing_id}`);
                    }}
                  >
                    <div className="notif-icon">{notificationIcon(n.type)}</div>
                    <div className="notif-content">
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && (
                      <button
                        className="notif-mark-read"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.notification_id); }}
                      >
                        Mark read
                      </button>
                    )}
                    {!n.is_read && <div className="notif-unread-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="notif-back" onClick={() => navigate("/booklistings")}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Listings
          </div>
        </div>
      </div>
    </>
  );
}