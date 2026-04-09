import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMessages } from "./api.js";
import { useChatSocket } from "./hooks/useChatSocket.js";
import "./App.css";

const AUTHOR_KEY = "chatroom-author";
const ROOM_KEY = "chatroom-room";

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function connectionLabel(status) {
  switch (status) {
    case "open":
      return "Live";
    case "connecting":
      return "Connecting…";
    case "closed":
      return "Disconnected";
    case "error":
      return "Error";
    default:
      return status;
  }
}

export default function App() {
  const [author, setAuthor] = useState(() => {
    try {
      return localStorage.getItem(AUTHOR_KEY) || "";
    } catch {
      return "";
    }
  });
  const [roomId, setRoomId] = useState(() => {
    try {
      return localStorage.getItem(ROOM_KEY) || "default";
    } catch {
      return "default";
    }
  });
  const [draftRoom, setDraftRoom] = useState(roomId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadError, setLoadError] = useState(null);
  const listRef = useRef(null);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const onSocketMessage = useCallback((msg) => {
    if (msg.roomId !== roomIdRef.current) return;
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const { status, sendChat } = useChatSocket({ onMessage: onSocketMessage });

  useEffect(() => {
    try {
      localStorage.setItem(AUTHOR_KEY, author);
    } catch {
      /* ignore */
    }
  }, [author]);

  useEffect(() => {
    try {
      localStorage.setItem(ROOM_KEY, roomId);
    } catch {
      /* ignore */
    }
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetchMessages(roomId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const canSend = useMemo(() => status === "open" && input.trim().length > 0, [status, input]);

  const joinRoom = (e) => {
    e.preventDefault();
    const next = draftRoom.trim() || "default";
    setRoomId(next);
  };

  const send = (e) => {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    const name = author.trim() || "anonymous";
    if (sendChat(body, name, roomId)) setInput("");
  };

  return (
    <div className="chat">
      <header className="chat__header">
        <div className="chat__title">
          <h1>Chatroom</h1>
          <span className={`chat__pill chat__pill--${status}`}>{connectionLabel(status)}</span>
        </div>
        <form className="chat__room" onSubmit={joinRoom}>
          <label className="chat__label">
            Room
            <input
              className="chat__input chat__input--inline"
              value={draftRoom}
              onChange={(e) => setDraftRoom(e.target.value)}
              placeholder="default"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="chat__btn chat__btn--secondary">
            Join
          </button>
        </form>
      </header>

      <p className="chat__roomline">
        Active room: <strong>{roomId}</strong>
      </p>

      {loadError ? <p className="chat__banner chat__banner--error">{loadError}</p> : null}

      <ul className="chat__messages" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <li className="chat__empty">No messages yet. Say hi.</li>
        ) : (
          messages.map((m) => (
            <li key={m._id} className="chat__msg">
              <div className="chat__msg-meta">
                <span className="chat__msg-author">{m.author || "anonymous"}</span>
                <time className="chat__msg-time" dateTime={m.createdAt}>
                  {formatTime(m.createdAt)}
                </time>
              </div>
              <p className="chat__msg-body">{m.body}</p>
            </li>
          ))
        )}
      </ul>

      <footer className="chat__composer">
        <div className="chat__composer-row">
          <label className="chat__label chat__label--grow">
            Display name
            <input
              className="chat__input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              autoComplete="nickname"
            />
          </label>
        </div>
        <form className="chat__composer-row chat__composer-send" onSubmit={send}>
          <label className="chat__label chat__label--grow">
            Message
            <textarea
              className="chat__textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
            />
          </label>
          <button type="submit" className="chat__btn" disabled={!canSend}>
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
