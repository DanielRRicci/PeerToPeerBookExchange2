import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";

const colors = {
  gold: "#FFBD00",
  black: "#000000",
  white: "#FFFFFF",
  darkGray: "#333333",
  lightGray: "#F4F4F4",
  midGray: "#999",
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem("bookExchangeUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
    backgroundImage:
      'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  },
  sidebar: {
    width: "320px",
    minWidth: "260px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.white,
    borderRight: `4px solid ${colors.gold}`,
    overflowY: "auto",
  },
  sidebarHeader: {
    backgroundColor: colors.black,
    color: colors.gold,
    padding: "1.2rem 1.5rem",
    fontSize: "1.1rem",
    fontWeight: "800",
    letterSpacing: "1px",
    textTransform: "uppercase",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  convItem: (active) => ({
    padding: "1rem 1.2rem",
    borderBottom: `1px solid ${colors.lightGray}`,
    cursor: "pointer",
    backgroundColor: active ? "#FFF8E1" : colors.white,
    borderLeft: active ? `4px solid ${colors.gold}` : "4px solid transparent",
    transition: "background 0.15s",
  }),
  convName: {
    fontWeight: "700",
    fontSize: "0.95rem",
    color: colors.darkGray,
  },
  convMeta: {
    fontSize: "0.8rem",
    color: colors.midGray,
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  convBook: {
    display: "inline-block",
    backgroundColor: colors.black,
    color: colors.gold,
    fontSize: "0.65rem",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "4px",
    marginTop: "4px",
    textTransform: "uppercase",
  },
  unreadDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    backgroundColor: colors.gold,
    flexShrink: 0,
    marginTop: "4px",
  },
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatHeader: {
    backgroundColor: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(6px)",
    padding: "1rem 1.5rem",
    borderBottom: `3px solid ${colors.gold}`,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  chatHeaderName: {
    color: colors.white,
    fontWeight: "700",
    fontSize: "1rem",
  },
  chatHeaderBook: {
    backgroundColor: colors.gold,
    color: colors.black,
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
    textTransform: "uppercase",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bubble: (isMine) => ({
    maxWidth: "65%",
    alignSelf: isMine ? "flex-end" : "flex-start",
    backgroundColor: isMine ? colors.black : colors.white,
    color: isMine ? colors.gold : colors.darkGray,
    padding: "10px 14px",
    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    wordBreak: "break-word",
    fontSize: "0.92rem",
    lineHeight: "1.4",
  }),
  bubbleTime: (isMine) => ({
    fontSize: "0.7rem",
    color: isMine ? "#aaa" : colors.midGray,
    marginTop: "4px",
    textAlign: isMine ? "right" : "left",
  }),
  inputBar: {
    display: "flex",
    gap: "10px",
    padding: "1rem 1.5rem",
    backgroundColor: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(6px)",
    borderTop: `3px solid ${colors.gold}`,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "25px",
    border: "2px solid #333",
    backgroundColor: "#111",
    color: colors.white,
    fontSize: "0.95rem",
    outline: "none",
  },
  sendBtn: {
    backgroundColor: colors.gold,
    color: colors.black,
    border: "none",
    borderRadius: "25px",
    padding: "0 22px",
    fontWeight: "800",
    fontSize: "0.9rem",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "rgba(255,255,255,0.6)",
    gap: "12px",
  },
  emptyIcon: { fontSize: "3rem" },
  emptyText: { fontSize: "1.1rem", fontWeight: "600" },
  emptySubtext: { fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" },
  backBtn: {
    backgroundColor: "transparent",
    border: `2px solid ${colors.gold}`,
    color: colors.gold,
    borderRadius: "6px",
    padding: "6px 14px",
    fontWeight: "700",
    fontSize: "0.8rem",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  // New chat panel shown when arriving from a listing before any message exists
  newChatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  newChatPrompt: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "rgba(255,255,255,0.7)",
    gap: "10px",
    padding: "2rem",
    textAlign: "center",
  },
};

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  // Passed in when navigating here via the Contact button on a listing
  const preselect = location.state || {};

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Tracks a new chat that hasn't been sent yet (no DB row yet)
  const [pendingChat, setPendingChat] = useState(null);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    if (!currentUser) navigate("/login");
  }, []);

  // On mount: load conversations from DB, then handle preselect with fresh data
  useEffect(() => {
    if (!currentUser) return;

    async function init() {
      try {
        const res = await fetch(
          `${baseUrl}/api/messages/conversations?userId=${currentUser.id}`
        );
        const data = await res.json();
        const convList = Array.isArray(data) ? data : [];
        setConversations(convList);

        if (preselect.receiverId && preselect.listingId) {
          const existing = convList.find(
            (c) =>
              c.other_user_id === preselect.receiverId &&
              c.listing_id === preselect.listingId
          );

          if (existing) {
            // Conversation already exists in DB — open it normally
            setActiveConv(existing);
            setPendingChat(null);
            loadMessages(existing.other_user_id, existing.listing_id);
            markRead(existing.other_user_id, existing.listing_id);
          } else {
            // No messages yet — hold as a pending (unsaved) chat
            // Do NOT add it to the sidebar until first message is sent
            setPendingChat({
              other_user_id: preselect.receiverId,
              other_user_name: preselect.receiverName || "Seller",
              listing_id: preselect.listingId,
              book_title: preselect.bookTitle || "Book",
            });
            setActiveConv(null);
            setMessages([]);
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
  }

  async function loadMessages(otherUserId, listingId) {
    try {
      const res = await fetch(
        `${baseUrl}/api/messages?userId=${currentUser.id}&otherUserId=${otherUserId}&listingId=${listingId}`
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
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
    } catch (_) {}
  }

  async function refreshConversations() {
    try {
      const res = await fetch(
        `${baseUrl}/api/messages/conversations?userId=${currentUser.id}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (_) {}
  }

  // Poll for new messages every 5 seconds while a real conversation is open
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

  // The active target is either an existing conversation or the pending new chat
  const chatTarget = activeConv || pendingChat;

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !chatTarget || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${baseUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: chatTarget.other_user_id,
          listingId: chatTarget.listing_id,
          content: text,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setDraft("");

      // If this was a pending chat, promote it to a real conversation
      if (pendingChat) {
        setPendingChat(null);
        // Refresh sidebar — the new conversation now exists in DB
        const convRes = await fetch(
          `${baseUrl}/api/messages/conversations?userId=${currentUser.id}`
        );
        const convData = await convRes.json();
        const convList = Array.isArray(convData) ? convData : [];
        setConversations(convList);

        // Find and activate the newly created conversation
        const newConv = convList.find(
          (c) =>
            c.other_user_id === chatTarget.other_user_id &&
            c.listing_id === chatTarget.listing_id
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

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!currentUser) return null;

  return (
    <div style={styles.wrapper}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span>Messages</span>
          <button style={styles.backBtn} onClick={() => navigate("/booklistings")}>
            ← Listings
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "1rem", color: colors.midGray, fontSize: "0.9rem" }}>
            Loading...
          </div>
        ) : conversations.length === 0 && !pendingChat ? (
          <div style={{ padding: "1.2rem", color: colors.midGray, fontSize: "0.9rem" }}>
            No conversations yet. Click <strong>Contact</strong> on a listing to start one.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={`${conv.other_user_id}-${conv.listing_id}`}
              style={styles.convItem(
                activeConv?.other_user_id === conv.other_user_id &&
                  activeConv?.listing_id === conv.listing_id
              )}
              onClick={() => selectConversation(conv)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={styles.convName}>{conv.other_user_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {conv.unread_count > 0 && <div style={styles.unreadDot} />}
                  <span style={{ fontSize: "0.72rem", color: colors.midGray }}>
                    {formatTime(conv.last_sent_at)}
                  </span>
                </div>
              </div>
              <div style={styles.convBook}>{conv.book_title}</div>
              {conv.last_message && (
                <div style={styles.convMeta}>{conv.last_message}</div>
              )}
            </div>
          ))
        )}
      </aside>

      {/* Chat Panel */}
      <div style={styles.chatPanel}>
        {!chatTarget ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <div style={styles.emptyText}>Select a conversation</div>
            <div style={styles.emptySubtext}>
              Or go to a listing and click "Contact"
            </div>
          </div>
        ) : (
          <>
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderName}>{chatTarget.other_user_name}</div>
              <div style={styles.chatHeaderBook}>{chatTarget.book_title}</div>
            </div>

            <div style={styles.messagesArea}>
              {/* Prompt shown before the very first message is sent */}
              {pendingChat && messages.length === 0 && (
                <div style={styles.newChatPrompt}>
                  <div style={{ fontSize: "2rem" }}>👋</div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    Start a conversation with {pendingChat.other_user_name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>
                    Ask about <em>{pendingChat.book_title}</em> below
                  </div>
                </div>
              )}

              {!pendingChat && messages.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: "2rem", fontSize: "0.9rem" }}>
                  No messages yet — say hi!
                </div>
              )}

              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.message_id} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={styles.bubble(isMine)}>{msg.content}</div>
                    <div style={styles.bubbleTime(isMine)}>{formatTime(msg.sent_at)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={styles.inputBar}>
              <input
                style={styles.textInput}
                placeholder="Type a message… (Enter to send)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: sending || !draft.trim() ? 0.5 : 1,
                  cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
                }}
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}