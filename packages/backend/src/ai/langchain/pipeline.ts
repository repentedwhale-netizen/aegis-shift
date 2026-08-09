/**
 * Aegis Shift AI Pipeline Orchestrator.
 *
 * Coordinates all three AI capabilities:
 * 1. Shift Optimization (LangChain + OR-Tools)
 * 2. Dispute Resolution (LangChain evidence analysis)
 * 3. Credential Review (LangChain compliance check)
 *
 * The orchestrator handles fallback logic:
 * - If ANTHROPIC_API_KEY is set: use LangChain with structured output
 * - If key is missing or call fails: fall back to deterministic algorithms
 */

import prisma from "../../lib/prisma";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";
import {
  runShiftOptimization,
  aiOutputToScheduleResult,
} from "./chains/shiftOptimization";
import {
  runDisputeResolution,
  mapResolutionType,
} from "./chains/disputeResolution";
import { runCredentialReview } from "./chains/credentialReview";
import {
  solveShiftScheduling,
  buildShiftSlots,
} from "../ortools/scheduler";
import type { ScheduleResult } from "../ortools/types";
import type { ResolutionType, CredentialType } from "@aegis-shift/shared";
import type { AIDisputeOutput } from "./chains/disputeResolution";
import type { AICredentialReviewOutput } from "./chains/credentialReview";
import { matchShifts as greedyMatchShifts } from "../shiftMatcher";

// ─── Shift Scheduling Pipeline ──────────────────────────────────────

export async function aiScheduleShifts(
  department: string,
  date: Date,
  shiftCount: number,
): Promise<ScheduleResult> {
  // Attempt LangChain first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const staff = await prisma.staff.findMany({
        where: { department, isActive: true },
        orderBy: { totalShifts: "asc" },
      });

      const distribution = staff.map((s) => ({
        staffId: s.id,
        name: s.name,
        currentShifts: s.totalShifts,
      }));

      const staffWithLastShift = await Promise.all(
        staff.map(async (s) => {
          const last = await prisma.shift.findFirst({
            where: { staffId: s.id, status: "completed" },
            orderBy: { completedAt: "desc" },
            select: { completedAt: true },
          });
          return {
            id: s.id,
            name: s.name,
            role: s.role,
            department: s.department,
            totalShifts: s.totalShifts,
            lastShiftEndMs: last?.completedAt?.getTime() ?? null,
          };
        }),
      );

      const aiResult = await runShiftOptimization({
        department,
        date,
        shiftCount,
        staff: staffWithLastShift,
        currentDistribution: distribution,
      });

      if (aiResult) {
        return aiOutputToScheduleResult(aiResult, staffWithLastShift, department);
      }
    } catch (err) {
      console.error("AI shift scheduling failed, falling back to OR-Tools:", err);
    }
  }

  // Fallback: OR-Tools constraint solver
  const slots = buildShiftSlots(department, date, shiftCount);

  const staff = await prisma.staff.findMany({
    where: { department, isActive: true },
    orderBy: { totalShifts: "asc" },
  });

  const staffVars = await Promise.all(
    staff.map(async (s) => {
      const last = await prisma.shift.findFirst({
        where: { staffId: s.id, status: "completed" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      });
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        department: s.department,
        totalShifts: s.totalShifts,
        lastShiftEndMs: last?.completedAt?.getTime() ?? null,
      };
    }),
  );

  return solveShiftScheduling(slots, staffVars, [
    { type: "role_match", params: {} },
    { type: "rest_hours", params: { hours: SHIFT_CONSTRAINTS.minRestBetweenShiftsHours } },
    { type: "weekly_cap", params: { max: SHIFT_CONSTRAINTS.maxShiftsPerWeek } },
    { type: "no_overlap", params: {} },
  ]);
}

// ─── Dispute Resolution Pipeline ────────────────────────────────────

export interface DisputeResolutionResult {
  resolutionType: ResolutionType;
  facilityPayout: string;
  staffPayout: string;
  confidence: number;
  reasoning: string;
  method: "ai" | "deterministic";
}

export async function aiResolveDispute(disputeId: string): Promise<DisputeResolutionResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { staff: true, shift: true },
  });

  if (!dispute) throw new Error(`Dispute ${disputeId} not found`);

  // Attempt LangChain
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const staffDisputeCount = await prisma.dispute.count({
        where: { staffId: dispute.staffId, status: { not: "cancelled" } },
      });

      const result = await runDisputeResolution({
        disputeId,
        shiftId: dispute.shiftId,
        reason: dispute.reason,
        role: dispute.shift?.role ?? "unknown",
        department: dispute.shift?.department ?? "unknown",
        status: dispute.status,
        staffName: dispute.staff?.name ?? "",
        evidence: dispute.evidence ?? "No evidence submitted",
        staffTotalShifts: dispute.staff?.totalShifts ?? 0,
        staffDisputeCount,
      });

      if (result) {
        return {
          resolutionType: mapResolutionType(result.resolutionType),
          facilityPayout: result.facilityPayout,
          staffPayout: result.staffPayout,
          confidence: result.confidence,
          reasoning: result.reasoning,
          method: "ai",
        };
      }
    } catch (err) {
      console.error("AI dispute resolution failed, falling back:", err);
    }
  }

  // Fallback: deterministic split
  return {
    resolutionType: "split_50_50",
    facilityPayout: "0",
    staffPayout: "0",
    confidence: 30,
    reasoning: "Deterministic 50/50 split — insufficient data for AI resolution",
    method: "deterministic",
  };
}

// ─── Credential Review Pipeline ─────────────────────────────────────

export interface CredentialReviewResult {
  recommendation: "approve" | "reject" | "review";
  riskLevel: "low_risk" | "medium_risk" | "high_risk";
  confidence: number;
  reasoning: string;
  complianceScore: number;
  flags: string[];
  method: "ai" | "deterministic";
}

export async function aiReviewCredential(
  credentialType: CredentialType,
  staffId: string,
  issuedAt: Date,
  expiresAt: Date | null,
): Promise<CredentialReviewResult> {
  // Find staff member
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { credentials: { select: { credentialType: true, revoked: true } } },
  });

  // Attempt LangChain
  if (process.env.ANTHROPIC_API_KEY && staff) {
    try {
      const previousCredentials = (staff.credentials ?? []).map((c) => ({
        type: c.credentialType,
        status: c.revoked ? "revoked" : "active",
      }));

      const result = await runCredentialReview({
        credentialType,
        staffId,
        staffName: staff.name,
        issuedAt,
        expiresAt,
        staffRole: staff.role,
        staffDepartment: staff.department,
        previousCredentials,
      });

      if (result) {
        return { ...result, method: "ai" };
      }
    } catch (err) {
      console.error("AI credential review failed, falling back:", err);
    }
  }

  // Fallback: deterministic check
  const now = new Date();
  const isExpired = expiresAt ? expiresAt < now : false;
  const issuedRecently = issuedAt.getTime() > now.getTime() - 365 * 24 * 60 * 60 * 1000;

  const flags: string[] = [];
  if (isExpired) flags.push("Credential has expired");
  if (!issuedRecently) flags.push("Credential is over 1 year old");

  let recommendation: "approve" | "reject" | "review" = "review";
  let riskLevel: "low_risk" | "medium_risk" | "high_risk" = "medium_risk";

  if (isExpired) {
    recommendation = "reject";
    riskLevel = "high_risk";
  } else if (issuedRecently && flags.length === 0) {
    recommendation = "approve";
    riskLevel = "low_risk";
  }

  return {
    recommendation,
    riskLevel,
    confidence: 60,
    reasoning: `Deterministic check: expired=${isExpired}, recent=${issuedRecently}`,
    complianceScore: recommendation === "approve" ? 80 : recommendation === "review" ? 50 : 20,
    flags,
    method: "deterministic",
  };
}
