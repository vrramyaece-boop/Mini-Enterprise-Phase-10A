// src/hooks/useWebSocket.js — Phase 5
// Custom hook for WebSocket connection with auto-reconnect
// Usage: const { isConnected, lastEvent } = useWebSocket(userId, token)

import { useState, useEffect, useRef, useCallback } from "react";

export default function useWebSocket(userId, token) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent]     = useState(null);
  const wsRef       = useRef(null);
  const reconnectRef= useRef(null);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!userId || !token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `ws://localhost:8000/ws/${userId}?token=${token}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      attemptsRef.current = 0;
      console.log("WebSocket connected ✅");
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEvent(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect with exponential backoff
      if (attemptsRef.current < MAX_ATTEMPTS) {
        const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
        attemptsRef.current += 1;
        reconnectRef.current = setTimeout(connect, delay);
        console.log(`WS reconnecting in ${delay}ms (attempt ${attemptsRef.current})`);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
      ws.close();
    };
  }, [userId, token]);

  // Keep-alive ping every 25s
  useEffect(() => {
    if (!isConnected) return;
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: "ping" }));
      }
    }, 25000);
    return () => clearInterval(ping);
  }, [isConnected]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  return { isConnected, lastEvent, sendMessage };
}
