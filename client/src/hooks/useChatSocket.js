import { useCallback, useEffect, useRef, useState } from "react";
import { getWsUrl } from "../api.js";

/**
 * @param {object} opts
 * @param {(msg: object) => void} opts.onMessage — new persisted message from server
 */
export function useChatSocket({ onMessage }) {
  const [status, setStatus] = useState("connecting");
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => setStatus("open");
    ws.onclose = () => {
      setStatus("closed");
      wsRef.current = null;
    };
    ws.onerror = () => setStatus("error");

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "message" && data.message) {
          onMessageRef.current(data.message);
        }
      } catch {
        /* non-JSON or unexpected */
      }
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, []);

  const sendChat = useCallback((body, author, roomId) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(
      JSON.stringify({
        type: "chat",
        body,
        author,
        roomId,
      })
    );
    return true;
  }, []);

  return { status, sendChat };
}
