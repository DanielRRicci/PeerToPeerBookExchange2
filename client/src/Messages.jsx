import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("bookExchangeUser");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function formatTime(ts) {
  if (!ts) return "";
  const d   = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Messages() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = getStoredUser();
  const preselect   = location.state || {};
  const baseUrl     = getApiBaseUrl();
  const pollRef     = useRef(null);
  const bottomRef   = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConv,    setActiveConv]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [draft,         setDraft]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [pendingChat,   setPendingChat]   = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  // Mobile: "list" shows sidebar, "chat" shows chat panel
  const [mobileView,    setMobileView]    = useState("list");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState("reason");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportData, setReportData] = useState({
    reasonType: "",
    reasonText: "",
  });
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [checkingReportStatus, setCheckingReportStatus] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const res  = await fetch(`${baseUrl}/api/messages/conversations?userId=${currentUser.id}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setConversations(list);

        if (preselect.receiverId) {
          const existing = list.find(
            (c) => c.other_user_id === preselect.receiverId && c.listing_id === preselect.listingId
          );
          if (existing) {
            setActiveConv(existing);
            loadMessages(existing.other_user_id, existing.listing_id);
            markRead(existing.other_user_id, existing.listing_id);
            setMobileView("chat");
          } else {
            setPendingChat({
              other_user_id:   preselect.receiverId,
              other_user_name: preselect.receiverName || "Seller",
              listing_id:      preselect.listingId,
              book_title:      preselect.bookTitle || "",
            });
            setActiveConv(null);
            setMessages([]);
            setMobileView("chat");
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function selectConversation(conv) {
    setPendingChat(null);
    setActiveConv(conv);
    setMessages([]);
    loadMessages(conv.other_user_id, conv.listing_id);
    markRead(conv.other_user_id, conv.listing_id);
    setMobileView("chat");
  }

  async function loadMessages(otherUserId, listingId) {
    try {
      const res  = await fetch(`${baseUrl}/api/messages?userId=${currentUser.id}&otherUserId=${otherUserId}&listingId=${listingId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Failed to load messages:", err); }
  }

  async function markRead(otherUserId, listingId) {
    try {
      await fetch(`${baseUrl}/api/messages/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, otherUserId, listingId }),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.other_user_id === otherUserId && c.listing_id === listingId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch {}
  }

  async function refreshConversations() {
    try {
      const res  = await fetch(`${baseUrl}/api/messages/conversations?userId=${currentUser.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch {}
  }

  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(() => {
      loadMessages(activeConv.other_user_id, activeConv.listing_id);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatTarget = activeConv || pendingChat;

useEffect(() => {
  async function fetchReportStatus() {
    if (!chatTarget?.other_user_id || !currentUser?.id) {
      setAlreadyReported(false);
      return;
    }

    setCheckingReportStatus(true);

    try {
      const res = await fetch(
        `${baseUrl}/api/reports/status?reportedUserId=${chatTarget.other_user_id}`,
        {
          headers: {
            "x-user-id": currentUser.id,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setAlreadyReported(Boolean(data.reported));
      } else {
        setAlreadyReported(false);
      }
    } catch {
      setAlreadyReported(false);
    } finally {
      setCheckingReportStatus(false);
    }
  }

  fetchReportStatus();
}, [chatTarget?.other_user_id, currentUser?.id, baseUrl]);

  async function sendMessage() {
    const text = draft.trim();
    const now = Date.now();
    if (!text || !chatTarget || sending) return;
    if (now < cooldownUntil) { setErrorMessage("Please wait a moment before sending another message."); return; }
    if (text.length > 500) { setErrorMessage("Message must be 500 characters or less."); return;}
    setSending(true);
    try {
      const res = await fetch(`${baseUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId:   currentUser.id,
          receiverId: chatTarget.other_user_id,
          listingId:  chatTarget.listing_id,
          content:    text,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setDraft("");
      setCooldownUntil(Date.now() + 1000);

      if (pendingChat) {
        setPendingChat(null);
        const convRes  = await fetch(`${baseUrl}/api/messages/conversations?userId=${currentUser.id}`);
        const convData = await convRes.json();
        const convList = Array.isArray(convData) ? convData : [];
        setConversations(convList);
        const newConv  = convList.find(
          (c) => c.other_user_id === chatTarget.other_user_id && c.listing_id === chatTarget.listing_id
        );
        if (newConv) setActiveConv(newConv);
      }

      await loadMessages(chatTarget.other_user_id, chatTarget.listing_id);
      refreshConversations();
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  }

function openReportModal() {
  if (alreadyReported) return;

  setReportData({
    reasonType: "",
    reasonText: "",
  });
  setReportStep("reason");
  setShowReportModal(true);
}

  function closeReportModal() {
    setShowReportModal(false);
    setReportStep("reason");
    setReportData({
      reasonType: "",
      reasonText: "",
    });
  }

  function goToReportDetails() {
    if (!reportData.reasonType) {
      alert("Please choose a reason first.");
      return;
    }
    setReportStep("details");
  }

  function goBackToReasonPicker() {
    setReportStep("reason");
  }

  async function handleSubmitReport() {
  if (!chatTarget || alreadyReported) return;

  const trimmedReasonText = reportData.reasonText.trim();
  if (!trimmedReasonText) {
    alert("Please enter a detailed explanation.");
    return;
  }

  setReportSubmitting(true);

  try {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        userId: currentUser.id,
        reportedUserId: chatTarget.other_user_id,
        listingId: chatTarget.listing_id,
        reasonType: reportData.reasonType,
        reasonText: trimmedReasonText,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to submit report.");
    }

    setAlreadyReported(true);
    closeReportModal();
  } catch (err) {
    alert(err.message || "Failed to submit report.");
  } finally {
    setReportSubmitting(false);
  }
}

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (!currentUser) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .msg-wrapper {
          display: flex;
          height: calc(100vh - 64px);
          width: 100vw;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .msg-wrapper::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Sidebar */
        .msg-sidebar {
          position: relative; z-index: 1;
          width: 300px; min-width: 240px; flex-shrink: 0;
          display: flex; flex-direction: column;
          background: #fff;
          border-right: 3px solid #FFBD00;
          overflow-y: auto;
          box-shadow: 4px 0 20px rgba(0,0,0,0.3);
        }
        .sidebar-header {
          background: #0a0a0a; padding: 18px 20px;
          border-bottom: 3px solid #FFBD00;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; letter-spacing: 2px; color: #FFBD00;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
        }

        .conv-item {
          padding: 14px 16px; border-bottom: 1px solid #f5f5f5;
          cursor: pointer; border-left: 3px solid transparent;
          transition: background 0.15s, border-color 0.15s;
        }
        .conv-item:hover  { background: #fffbea; }
        .conv-item.active { background: #fffbea; border-left-color: #FFBD00; }

        .conv-name  { font-weight: 700; font-size: 13px; color: #0a0a0a; }
        .conv-meta  { font-size: 11px; color: #aaa; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-book-badge {
          display: inline-block; background: #0a0a0a; color: #FFBD00;
          font-size: 0.6rem; font-weight: 700; padding: 2px 8px;
          border-radius: 20px; margin-top: 5px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .conv-row   { display: flex; justify-content: space-between; align-items: flex-start; }
        .conv-time  { font-size: 11px; color: #bbb; }
        .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFBD00; flex-shrink: 0; margin-top: 3px; }
        .sidebar-empty { padding: 16px; color: #bbb; font-size: 12px; line-height: 1.6; }

        /* Chat panel */
        .msg-chat-panel {
          position: relative; z-index: 1; flex: 1;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .chat-header {
          background: rgba(10,10,10,0.92); backdrop-filter: blur(8px);
          padding: 14px 20px; border-bottom: 3px solid #FFBD00;
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .chat-header-back {
          background: none; border: none; color: #FFBD00;
          font-size: 22px; cursor: pointer; padding: 0 8px 0 0;
          display: none; line-height: 1;
        }
        .chat-header-name {
          font-family: 'Bebas Neue', sans-serif; font-size: 22px;
          letter-spacing: 1.5px; color: #fff;
        }
        .chat-header-book {
          background: #FFBD00; color: #0a0a0a;
          font-size: 0.65rem; font-weight: 700; padding: 3px 11px;
          border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
        }

        .chat-header-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .chat-header-spacer {
          flex: 1;
        }

        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .chat-action-btn {
          border: none;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s, color 0.15s, opacity 0.15s;
        }

        .chat-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .chat-action-report {
          background: #991b1b;
          color: #fff;
        }

        .chat-action-report:hover:not(:disabled) {
          background: #7f1d1d;
        }

        .chat-action-reported {
          background: #4b2e2e;
          color: #d7c2c2;
          cursor: default;
          transform: none;
        }

        .chat-action-reported:hover,
        .chat-action-reported:disabled,
        .chat-action-reported:disabled:hover {
          background: #4b2e2e;
          color: #d7c2c2;
          transform: none;
          cursor: default;
          opacity: 1;
        }

        .report-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 500;
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .report-modal-card {
          width: 100%;
          max-width: 460px;
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        }

        .report-modal-header {
          position: relative;
          background: #0a0a0a;
          border-bottom: 3px solid #FFBD00;
          padding: 20px 24px 18px 24px;
        }

        .report-modal-close {
          position: absolute;
          top: 14px;
          left: 16px;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          color: #FFBD00;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .report-modal-close:hover {
          background: rgba(255,189,0,0.16);
        }

        .report-modal-title {
          text-align: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: #FFBD00;
        }

        .report-modal-body {
          padding: 22px 24px 24px;
        }

        .report-modal-copy {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .report-reason-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 18px;
        }

        .report-reason-btn {
          width: 100%;
          text-align: left;
          padding: 12px 14px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          background: #fafafa;
          color: #0a0a0a;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }

        .report-reason-btn:hover {
          border-color: #FFBD00;
          background: #fffdf2;
        }

        .report-reason-btn.selected {
          border-color: #FFBD00;
          background: #fff7cc;
        }

        .report-selected-reason {
          font-size: 12px;
          color: #444;
          margin-bottom: 12px;
        }

        .report-details-textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          padding: 12px 13px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          background: #fafafa;
          outline: none;
        }

        .report-details-textarea:focus {
          border-color: #FFBD00;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }

        .report-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .report-primary-btn,
        .report-secondary-btn {
          flex: 1;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .report-primary-btn {
          background: #FFBD00;
          color: #0a0a0a;
        }

        .report-primary-btn:hover {
          background: #e6a800;
        }

        .report-secondary-btn {
          background: #0a0a0a;
          color: #FFBD00;
        }

        .report-secondary-btn:hover {
          background: #222;
        }

        .chat-messages {
          flex: 1; overflow-y: auto; padding: 1.5rem;
          display: flex; flex-direction: column; gap: 10px;
        }

        .bubble-wrap   { display: flex; flex-direction: column; }
        .bubble-mine {
          max-width: 72%; align-self: flex-end;
          background: #0a0a0a; color: #FFBD00;
          padding: 10px 15px; border-radius: 18px 18px 4px 18px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          word-break: break-word; font-size: 14px; line-height: 1.5;
        }
        .bubble-theirs {
          max-width: 72%; align-self: flex-start;
          background: #fff; color: #0a0a0a;
          padding: 10px 15px; border-radius: 18px 18px 18px 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          word-break: break-word; font-size: 14px; line-height: 1.5;
        }
        .bubble-time-mine   { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px; text-align: right; }
        .bubble-time-theirs { font-size: 10px; color: #bbb; margin-top: 3px; }

        .chat-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: rgba(255,255,255,0.35); gap: 10px; padding: 2rem; text-align: center;
        }
        .chat-empty-icon { font-size: 3rem; }
        .chat-empty-text {
          font-family: 'Bebas Neue', sans-serif; font-size: 26px;
          letter-spacing: 2px; color: rgba(255,255,255,0.4);
        }
        .chat-empty-sub { font-size: 12px; color: rgba(255,255,255,0.25); }

        .chat-pending-prompt {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: rgba(255,255,255,0.5); gap: 8px; padding: 2rem; text-align: center;
        }
        .chat-pending-icon { font-size: 2.5rem; }
        .chat-pending-text { font-weight: 700; font-size: 14px; color: rgba(255,255,255,0.7); }
        .chat-pending-sub  { font-size: 12px; color: rgba(255,255,255,0.3); }

        .chat-input-bar {
          display: flex; gap: 10px; padding: 14px 20px;
          background: rgba(10,10,10,0.92); backdrop-filter: blur(8px);
          border-top: 3px solid #FFBD00; flex-shrink: 0;
        }
        .chat-text-input {
          flex: 1; padding: 12px 16px; border-radius: 25px;
          border: 1.5px solid rgba(255,189,0,0.2);
          background: rgba(255,255,255,0.06); color: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none;
          transition: border-color 0.2s, background 0.2s;
          -webkit-appearance: none;
        }
        .chat-text-input::placeholder { color: rgba(255,255,255,0.3); }
        .chat-text-input:focus { border-color: #FFBD00; background: rgba(255,189,0,0.06); }

        .chat-send-btn {
          background: #FFBD00; color: #0a0a0a; border: none; border-radius: 25px;
          padding: 0 22px; font-family: 'Bebas Neue', sans-serif;
          font-size: 16px; letter-spacing: 1.5px; cursor: pointer;
          transition: background 0.15s, transform 0.15s; flex-shrink: 0;
          min-width: 70px; min-height: 46px;
        }
        .chat-send-btn:hover:not(:disabled) { background: #e6a800; transform: translateY(-1px); }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .no-msgs-hint { color: rgba(255,255,255,0.25); text-align: center; margin-top: 2rem; font-size: 12px; }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .msg-sidebar {
            width: 100vw; min-width: unset; flex-shrink: 0;
            border-right: none;
            display: none;
          }
          .msg-sidebar.mobile-visible { display: flex; }

          .msg-chat-panel { display: none; }
          .msg-chat-panel.mobile-visible { display: flex; }

          .chat-header-back { display: block; }

          .chat-messages { padding: 1rem; }

          .bubble-mine, .bubble-theirs { max-width: 85%; font-size: 15px; }

          .chat-input-bar { padding: 10px 12px; gap: 8px; }
          .chat-text-input { font-size: 16px; padding: 12px 14px; } /* 16px prevents iOS zoom */
          .chat-send-btn { padding: 0 16px; font-size: 15px; }
        }
      `}</style>

      <div className="msg-wrapper">

        {/* Sidebar */}
        <aside className={`msg-sidebar${mobileView === "list" ? " mobile-visible" : ""}`}>
          <div className="sidebar-header">
            <span>Messages</span>
          </div>

          {loading ? (
            <div className="sidebar-empty">Loading…</div>
          ) : conversations.length === 0 && !pendingChat ? (
            <div className="sidebar-empty">
              No conversations yet. Click <strong>Contact</strong> on a listing to start one.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive =
                activeConv?.other_user_id === conv.other_user_id &&
                activeConv?.listing_id    === conv.listing_id;
              return (
                <div
                  key={`${conv.other_user_id}-${conv.listing_id}`}
                  className={`conv-item${isActive ? " active" : ""}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="conv-row">
                    <div className="conv-name">{conv.other_user_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {conv.unread_count > 0 && <div className="unread-dot" />}
                      <span className="conv-time">{formatTime(conv.last_sent_at)}</span>
                    </div>
                  </div>
                  <div className="conv-book-badge">{conv.book_title}</div>
                  {conv.last_message && <div className="conv-meta">{conv.last_message}</div>}
                </div>
              );
            })
          )}
        </aside>

        {/* Chat panel */}
        <div className={`msg-chat-panel${mobileView === "chat" ? " mobile-visible" : ""}`}>
          {!chatTarget ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <div className="chat-empty-text">Select a Conversation</div>
              <div className="chat-empty-sub">Or click "Contact" on a listing to start one</div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <button
                  className="chat-header-back"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to conversations"
                >
                  ‹
                </button>

                <div className="chat-header-main">
                  <div className="chat-header-name">{chatTarget.other_user_name}</div>
                  <div className="chat-header-book">{chatTarget.book_title}</div>
                </div>

                <div className="chat-header-spacer" />

                {!pendingChat && (
                  <div className="chat-header-actions">
                    <button
                      className={`chat-action-btn ${
                        alreadyReported ? "chat-action-reported" : "chat-action-report"
                      }`}
                      onClick={alreadyReported ? undefined : openReportModal}
                      disabled={alreadyReported || checkingReportStatus}
                    >
                      {alreadyReported ? "Reported" : "Report"}
                    </button>
                  </div>
                )}
              </div>

              <div className="chat-messages">
                {pendingChat && messages.length === 0 && (
                  <div className="chat-pending-prompt">
                    <div className="chat-pending-icon">👋</div>
                    <div className="chat-pending-text">Start a conversation with {pendingChat.other_user_name}</div>
                    <div className="chat-pending-sub">Ask about <em>{pendingChat.book_title}</em> below</div>
                  </div>
                )}
                {!pendingChat && messages.length === 0 && (
                  <div className="no-msgs-hint">No messages yet — say hi!</div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.message_id} className="bubble-wrap">
                      <div className={isMine ? "bubble-mine" : "bubble-theirs"}>{msg.content}</div>
                      <div className={isMine ? "bubble-time-mine" : "bubble-time-theirs"}>{formatTime(msg.sent_at)}</div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="chat-input-bar">
                <input
                  className="chat-text-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); if (errorMessage) setErrorMessage(""); }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="chat-send-btn"
                  onClick={sendMessage}
                  disabled={sending || !draft.trim() || Date.now() < cooldownUntil}
                >
                  Send
                </button>
              </div>
                {errorMessage && (
                  <div
                    style={{
                      color: "#ffb3b3",
                      fontSize: "12px",
                      marginTop: "6px",
                      paddingLeft: "20px",
                      paddingBottom: "8px",
                      background: "rgba(10,10,10,0.92)"
                    }}
                  >
                    {errorMessage}
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {showReportModal && (
        <div
          className="report-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReportModal();
          }}
        >
          <div className="report-modal-card">
            <div className="report-modal-header">
              <button
                className="report-modal-close"
                onClick={closeReportModal}
                aria-label="Close report modal"
                disabled={reportSubmitting}
              >
                ×
              </button>

              <div className="report-modal-title">
                {reportStep === "reason" ? "Report User" : "Report Details"}
              </div>
            </div>

            <div className="report-modal-body">
              {reportStep === "reason" && (
                <>
                  <div className="report-modal-copy">
                    Choose the reason that best matches your complaint.
                  </div>

                  <div className="report-reason-list">
                    {[
                      "Inappropriate messages",
                      "Inappropriate listings",
                      "Message spam",
                      "Inappropriate name",
                      "Other",
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        className={`report-reason-btn${
                          reportData.reasonType === reason ? " selected" : ""
                        }`}
                        onClick={() =>
                          setReportData((prev) => ({ ...prev, reasonType: reason }))
                        }
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <button className="report-primary-btn" onClick={goToReportDetails}>
                    Next
                  </button>
                </>
              )}

              {reportStep === "details" && (
                <>
                  <div className="report-modal-copy">
                    Add a more detailed explanation for the admin review.
                  </div>

                  <div className="report-selected-reason">
                    Reason: <strong>{reportData.reasonType}</strong>
                  </div>

                  <textarea
                    className="report-details-textarea"
                    value={reportData.reasonText}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        reasonText: e.target.value,
                      }))
                    }
                    placeholder="Describe what happened..."
                    disabled={reportSubmitting}
                  />

                  <div className="report-modal-actions">
                    <button
                      className="report-secondary-btn"
                      onClick={goBackToReasonPicker}
                      disabled={reportSubmitting}
                    >
                      Back
                    </button>

                    <button
                      className="report-primary-btn"
                      onClick={handleSubmitReport}
                      disabled={reportSubmitting}
                    >
                      {reportSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}