import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routes/trpc";
import { initWebSocket, getWebSocket } from "./websocket/manager";
import { APP } from "@aegis-shift/shared";
import prisma from "./lib/prisma";

async function main() {
  const app = express();

  app.use(cors({ origin: APP.corsOrigin }));
  app.use(express.json());

  // ── tRPC Middleware ────────────────────────────────────────────
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}),
    }),
  );

  // ── REST Health Endpoint ───────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      wsClients: getWebSocket().getClientCount(),
      timestamp: Date.now(),
    });
  });

  // ── Start Server ───────────────────────────────────────────────
  const server = app.listen(APP.port, () => {
    console.log(`[Aegis Shift] Server running on http://localhost:${APP.port}`);
    console.log(`[Aegis Shift] tRPC at http://localhost:${APP.port}/trpc`);
    console.log(`[Aegis Shift] WebSocket at ws://localhost:${APP.port}/ws`);
  });

  // ── WebSocket ──────────────────────────────────────────────────
  initWebSocket(server);

  // ── Graceful Shutdown ──────────────────────────────────────────
  const shutdown = async () => {
    console.log("[Aegis Shift] Shutting down...");
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[Aegis Shift] Fatal error:", err);
  process.exit(1);
});
