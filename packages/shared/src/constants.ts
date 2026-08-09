// ─── AI Agent ──────────────────────────────────────────────────────

export const AI_AGENT = {
  model: process.env.AI_MODEL || "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.2,
  shiftMatchingTimeout: 30000, // 30s
  agentTimeout: 60000, // 60s for multi-agent orchestration
} as const;

// ─── Application ───────────────────────────────────────────────────

export const APP = {
  name: "Aegis Shift",
  version: "0.2.0",
  hackathon: "AI Builders Hackathon 2026",
  platform: "Devpost",
  port: parseInt(process.env.PORT || "4000", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
} as const;

// ─── Shift Constraints ─────────────────────────────────────────────

export const SHIFT_CONSTRAINTS = {
  minShiftHours: 4,
  maxShiftHours: 12,
  maxShiftsPerWeek: 5,
  minRestBetweenShiftsHours: 8,
  defaultShiftDurationHours: 8,
} as const;

// ─── Multi-Agent Configuration ─────────────────────────────────────

export const AGENT_CONFIG = {
  maxRounds: 3,
  defaultAgents: ["staffing", "shift", "prediction", "dispute"] as const,
  websocketHeartbeat: 30000,
} as const;

// ─── WebSocket Channels ────────────────────────────────────────────

export const WS_CHANNELS = {
  SHIFTS: "shifts",
  CREDENTIALS: "credentials",
  DISPUTES: "disputes",
  AGENTS: "agents",
  ALL: "all",
} as const;
