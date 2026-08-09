"use client";

import { useEffect, useRef, useCallback } from "react";
import { wsManager } from "@/lib/ws";
import type { WebSocketChannel } from "@/lib/ws";

export function useRealtime(channel: WebSocketChannel, handler: (data: unknown) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    wsManager.connect();
    const unsubscribe = wsManager.subscribe(channel, (data) => {
      handlerRef.current(data);
    });
    return unsubscribe;
  }, [channel]);
}

export function useRealtimeAll(handler: (event: { channel: string; data: unknown }) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    wsManager.connect();
    const unsubscribe = wsManager.subscribe("all", (data) => {
      handlerRef.current(data as { channel: string; data: unknown });
    });
    return unsubscribe;
  }, []);
}
