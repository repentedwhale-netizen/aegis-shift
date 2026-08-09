import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { WsEvent, WsEventType } from "@aegis-shift/shared";
import { WS_CHANNELS } from "@aegis-shift/shared";

type Channel = string;

/**
 * WebSocket manager for real-time event broadcasting.
 * Clients subscribe to channels: shifts, credentials, markets, disputes, all.
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private subscriptions: Map<WebSocket, Set<Channel>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setup();
  }

  private setup() {
    this.wss.on("connection", (ws) => {
      // Default: subscribe to 'all'
      this.subscriptions.set(ws, new Set([WS_CHANNELS.ALL]));

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "subscribe" && typeof msg.channel === "string") {
            const channels = this.subscriptions.get(ws);
            if (channels) {
              channels.add(msg.channel);
            }
          } else if (msg.type === "unsubscribe" && typeof msg.channel === "string") {
            const channels = this.subscriptions.get(ws);
            if (channels) {
              channels.delete(msg.channel);
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on("close", () => {
        this.subscriptions.delete(ws);
      });

      ws.on("error", () => {
        this.subscriptions.delete(ws);
      });

      // Send welcome
      ws.send(JSON.stringify({
        type: "connected",
        payload: { message: "Connected to Aegis Shift WebSocket" },
        timestamp: Date.now(),
      }));
    });
  }

  /**
   * Broadcast an event to all clients subscribed to the relevant channel.
   */
  broadcast(event: WsEventType, payload: Record<string, unknown>) {
    const channel = this.eventToChannel(event);
    const message = JSON.stringify({
      type: event,
      payload,
      timestamp: Date.now(),
    } satisfies WsEvent);

    let sent = 0;
    this.subscriptions.forEach((channels, ws) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (channels.has(channel) || channels.has(WS_CHANNELS.ALL))
      ) {
        ws.send(message);
        sent++;
      }
    });
    return sent;
  }

  private eventToChannel(event: WsEventType): Channel {
    if (event.startsWith("shift")) return WS_CHANNELS.SHIFTS;
    if (event.startsWith("credential")) return WS_CHANNELS.CREDENTIALS;
    if (event.startsWith("agent")) return WS_CHANNELS.AGENTS;
    if (event.startsWith("dispute")) return WS_CHANNELS.DISPUTES;
    return WS_CHANNELS.ALL;
  }

  getClientCount(): number {
    return this.subscriptions.size;
  }
}

let instance: WebSocketManager | null = null;

export function initWebSocket(server: Server): WebSocketManager {
  instance = new WebSocketManager(server);
  return instance;
}

export function getWebSocket(): WebSocketManager {
  if (!instance) throw new Error("WebSocket not initialized");
  return instance;
}
