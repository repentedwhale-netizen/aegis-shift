import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { getChatModel } from "../config";
import { shiftMatchingPrompt } from "../prompts/shiftMatching";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";
import type { StaffVariable, ShiftSlot, ScheduleResult } from "../../ortools/types";

// ─── Output Schema ──────────────────────────────────────────────────

const assignmentSchema = z.object({
  staffId: z.string(),
  staffName: z.string(),
  role: z.string(),
  department: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
});

const shiftMatchingOutputSchema = z.object({
  assignments: z.array(assignmentSchema),
  metrics: z.object({
    totalAssignments: z.number(),
    coveragePercent: z.number().min(0).max(100),
    fairnessScore: z.number().min(0).max(100),
    unmetSlots: z.number(),
  }),
  warnings: z.array(z.string()),
});

export type AIShiftMatchingOutput = z.infer<typeof shiftMatchingOutputSchema>;

// ─── Input Types ─────────────────────────────────────────────────────

export interface ShiftOptimizationInput {
  department: string;
  date: Date;
  shiftCount: number;
  staff: StaffVariable[];
  currentDistribution: Array<{ staffId: string; name: string; currentShifts: number }>;
}

// ─── Chain ───────────────────────────────────────────────────────────

const parser = StructuredOutputParser.fromZodSchema(shiftMatchingOutputSchema);

/**
 * Build the LangChain shift optimization chain.
 *
 * LCEL (LangChain Expression Language) pipeline:
 * prompt → chat model → structured output parser
 */
export function buildShiftOptimizationChain() {
  const model = getChatModel();
  const chain = RunnableSequence.from([
    shiftMatchingPrompt,
    model,
    parser,
  ]);
  return chain;
}

/**
 * Run the AI shift optimization chain.
 *
 * Falls back to the greedy algorithm if the LLM call fails
 * or ANTHROPIC_API_KEY is not set.
 */
export async function runShiftOptimization(
  input: ShiftOptimizationInput,
): Promise<AIShiftMatchingOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null; // caller falls back to greedy
  }

  try {
    const chain = buildShiftOptimizationChain();
    const result = await chain.invoke({
      department: input.department,
      date: input.date.toISOString().split("T")[0],
      shiftCount: input.shiftCount.toString(),
      staffData: JSON.stringify(input.staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        department: s.department,
        totalShifts: s.totalShifts,
        lastShiftEnd: s.lastShiftEndMs ? new Date(s.lastShiftEndMs).toISOString() : "never",
      })), null, 2),
      currentDistribution: JSON.stringify(input.currentDistribution, null, 2),
      maxShiftsPerWeek: SHIFT_CONSTRAINTS.maxShiftsPerWeek.toString(),
      minRestHours: SHIFT_CONSTRAINTS.minRestBetweenShiftsHours.toString(),
      shiftDurationHours: SHIFT_CONSTRAINTS.defaultShiftDurationHours.toString(),
    });

    return result;
  } catch (err) {
    console.error("LangChain shift optimization failed:", err);
    return null; // caller falls back to greedy
  }
}

/**
 * Convert AI output to ScheduleResult format for the OR-Tools layer.
 */
export function aiOutputToScheduleResult(
  aiOutput: AIShiftMatchingOutput,
  staff: StaffVariable[],
  department: string,
): ScheduleResult {
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const assignments = aiOutput.assignments.map((a, i) => {
    const s = staffMap.get(a.staffId);
    return {
      slotIndex: i,
      staffId: a.staffId,
      staffName: s?.name ?? a.staffName,
      role: a.role,
      department: a.department,
      startTime: a.startTime,
      endTime: a.endTime,
      score: a.score,
    };
  });

  return {
    assignments,
    metrics: {
      totalSlots: aiOutput.metrics.totalAssignments + aiOutput.metrics.unmetSlots,
      filledSlots: aiOutput.metrics.totalAssignments,
      coveragePercent: aiOutput.metrics.coveragePercent,
      fairnessVariance: 0, // computed separately
      averageScore: assignments.length > 0
        ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
        : 0,
      solveTimeMs: 0,
    },
    unassignedSlots: [],
    warnings: aiOutput.warnings,
  };
}
