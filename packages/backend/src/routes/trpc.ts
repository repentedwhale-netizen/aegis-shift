import { initTRPC } from "@trpc/server";
import { z } from "zod";
import {
  CreateShiftInput,
  CompleteShiftInput,
  FileDisputeInput,
  ProposeResolutionInput,
  CreateStaffInput,
  ShiftAssignmentInput,
} from "@aegis-shift/shared";
import * as shiftService from "../services/shifts";
import * as credentialService from "../services/credentials";
import * as disputeService from "../services/disputes";
import {
  matchShifts,
  aiEnhancedMatchShifts,
  aiScheduleShiftsDetailed,
} from "../ai/shiftMatcher";
import { aiResolveDispute } from "../ai/langchain/pipeline";
import prisma from "../lib/prisma";

const t = initTRPC.create({ isServer: true });

export const appRouter = t.router({
  // ── Health ──────────────────────────────────────────────────────
  health: t.procedure.query(() => ({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: "0.2.0",
    aiAvailable: !!process.env.ANTHROPIC_API_KEY,
  })),

  // ── Shifts ──────────────────────────────────────────────────────
  shifts: t.router({
    create: t.procedure.input(CreateShiftInput).mutation(({ input }) => shiftService.createShift(input)),

    get: t.procedure
      .input(z.object({ shiftId: z.string().uuid() }))
      .query(({ input }) => shiftService.getShift(input.shiftId)),

    list: t.procedure
      .input(
        z.object({
          status: z.string().optional(),
          department: z.string().optional(),
          staffId: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        }),
      )
      .query(({ input }) => shiftService.listShifts(input)),

    complete: t.procedure.input(CompleteShiftInput).mutation(({ input }) => shiftService.completeShift(input)),

    stats: t.procedure.query(() => shiftService.getShiftStats()),

    staffHistory: t.procedure
      .input(z.object({ staffId: z.string().uuid() }))
      .query(({ input }) => shiftService.getStaffShiftHistory(input.staffId)),
  }),

  // ── Staff ───────────────────────────────────────────────────────
  staff: t.router({
    create: t.procedure.input(CreateStaffInput).mutation(async ({ input }) =>
      prisma.staff.create({ data: { ...input, email: input.email ?? null } }),
    ),

    list: t.procedure
      .input(
        z.object({
          department: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        }),
      )
      .query(({ input }) =>
        prisma.staff.findMany({
          where: {
            ...(input.department ? { department: input.department } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          },
          take: input.limit,
          skip: input.offset,
          orderBy: { name: "asc" },
        }),
      ),

    get: t.procedure.input(z.object({ id: z.string().uuid() })).query(({ input }) =>
      prisma.staff.findUnique({
        where: { id: input.id },
        include: { shifts: true, credentials: true },
      }),
    ),
  }),

  // ── Credentials ─────────────────────────────────────────────────
  credentials: t.router({
    issue: t.procedure
      .input(
        z.object({
          staffId: z.string().uuid(),
          credentialType: z.string(),
          expiresAt: z.coerce.date().nullable(),
          metadata: z.record(z.unknown()),
          issuedBy: z.string(),
        }),
      )
      .mutation(({ input }) => credentialService.issueCredential(input)),

    verify: t.procedure
      .input(z.object({ credentialId: z.string().uuid() }))
      .query(({ input }) => credentialService.verifyCredential(input.credentialId)),

    revoke: t.procedure
      .input(z.object({ credentialId: z.string().uuid(), revokedBy: z.string() }))
      .mutation(({ input }) => credentialService.revokeCredential(input)),

    list: t.procedure
      .input(z.object({ staffId: z.string().uuid() }))
      .query(({ input }) => credentialService.listCredentials(input.staffId)),
  }),

  // ── Disputes ────────────────────────────────────────────────────
  disputes: t.router({
    file: t.procedure
      .input(FileDisputeInput.extend({ filedBy: z.string() }))
      .mutation(({ input }) => disputeService.fileDispute(input)),

    get: t.procedure
      .input(z.object({ disputeId: z.string().uuid() }))
      .query(({ input }) => disputeService.getDispute(input.disputeId)),

    list: t.procedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        }),
      )
      .query(({ input }) => disputeService.listDisputes(input)),

    propose: t.procedure
      .input(ProposeResolutionInput.extend({ proposedBy: z.string() }))
      .mutation(({ input }) => disputeService.proposeResolution(input)),

    execute: t.procedure
      .input(z.object({ disputeId: z.string().uuid() }))
      .mutation(({ input }) => disputeService.executeResolution(input.disputeId)),

    override: t.procedure
      .input(
        z.object({
          disputeId: z.string().uuid(),
          resolution: z.string(),
          reason: z.string(),
          overriddenBy: z.string(),
        }),
      )
      .mutation(({ input }) =>
        disputeService.overrideResolution(input.disputeId, {
          resolution: input.resolution,
          reason: input.reason,
          overriddenBy: input.overriddenBy,
        }),
      ),
  }),

  // ── AI ──────────────────────────────────────────────────────────
  ai: t.router({
    matchShifts: t.procedure.input(ShiftAssignmentInput).mutation(({ input }) =>
      aiEnhancedMatchShifts(input.department, input.date, input.shiftCount),
    ),

    matchShiftsDetailed: t.procedure.input(ShiftAssignmentInput).query(({ input }) =>
      aiScheduleShiftsDetailed(input.department, input.date, input.shiftCount),
    ),

    basicMatch: t.procedure.input(ShiftAssignmentInput).query(({ input }) =>
      matchShifts(input.department, input.date, input.shiftCount),
    ),

    resolveDispute: t.procedure
      .input(z.object({ disputeId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const result = await aiResolveDispute(input.disputeId);
        return result;
      }),

    status: t.procedure.query(() => ({
      aiAvailable: !!process.env.ANTHROPIC_API_KEY,
      model: process.env.AI_MODEL || "claude-sonnet-4-20250514",
      capabilities: {
        shiftOptimization: true,
        disputeResolution: true,
        langChain: !!process.env.ANTHROPIC_API_KEY,
        orTools: true,
        greedyFallback: true,
        multiAgent: true,
      },
    })),
  }),

  // ── Agent Layer ─────────────────────────────────────────────────
  agent: t.router({
    orchestrate: t.procedure
      .input(z.object({
        task: z.string(),
        context: z.record(z.unknown()).optional(),
        agents: z.array(z.enum(["staffing", "shift", "prediction", "dispute"])).optional(),
        maxRounds: z.number().int().min(1).max(5).default(3),
      }))
      .mutation(async ({ input }) => {
        // Agent orchestration endpoint — will be wired to agent-layer in Phase 2
        return {
          success: true,
          task: input.task,
          agentsInvolved: input.agents ?? ["staffing", "shift", "prediction", "dispute"],
          message: "Agent orchestration endpoint ready for Phase 2 multi-agent LangChain integration",
        };
      }),
  }),

  // ── Analytics ───────────────────────────────────────────────────
  analytics: t.router({
    dashboard: t.procedure.query(async () => {
      const [shiftStats, activeDisputes, staffCount] = await Promise.all([
        shiftService.getShiftStats(),
        prisma.dispute.count({ where: { status: "active" } }),
        prisma.staff.count({ where: { isActive: true } }),
      ]);
      return { shiftStats, activeDisputes, staffCount };
    }),
  }),
});

export type AppRouter = typeof appRouter;
