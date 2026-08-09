import { z } from "zod";

// ── Agent identity ──
export const AgentRole = z.enum([
  "staffing",
  "shift",
  "prediction",
  "dispute",
  "orchestrator",
]);
export type AgentRole = z.infer<typeof AgentRole>;

// ── Agent message types ──
export const AgentMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "agent"]),
  agentId: z.string().optional(),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type AgentMessage = z.infer<typeof AgentMessage>;

// ── Agent reasoning panel entry ──
export const ReasoningStep = z.object({
  step: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional(),
});
export type ReasoningStep = z.infer<typeof ReasoningStep>;

// ── Multi-agent orchestration types ──
export const OrchestrationRequest = z.object({
  task: z.string(),
  context: z.record(z.unknown()).optional(),
  agents: z.array(AgentRole).optional(),
  maxRounds: z.number().default(3),
});
export type OrchestrationRequest = z.infer<typeof OrchestrationRequest>;

export const OrchestrationResult = z.object({
  success: z.boolean(),
  result: z.record(z.unknown()),
  reasoning: z.array(ReasoningStep),
  agentTraces: z.array(
    z.object({
      agentRole: AgentRole,
      messages: z.array(AgentMessage),
      conclusion: z.string(),
    })
  ),
});
export type OrchestrationResult = z.infer<typeof OrchestrationResult>;

// ── WebSocket event types for real-time agent updates ──
export const WSEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("agent.thinking"), agentRole: AgentRole, step: ReasoningStep }),
  z.object({ type: z.literal("agent.conclusion"), agentRole: AgentRole, conclusion: z.string() }),
  z.object({ type: z.literal("orchestrator.complete"), result: OrchestrationResult }),
  z.object({ type: z.literal("orchestrator.error"), error: z.string() }),
]);
export type WSEvent = z.infer<typeof WSEvent>;
