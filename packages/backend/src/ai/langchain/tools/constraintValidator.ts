import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";

/**
 * LangChain tool: validateShiftConstraints
 *
 * Validates that a proposed shift assignment satisfies all
 * scheduling constraints. Used by the LLM to self-correct
 * before returning the final schedule.
 */
export const constraintValidatorTool = new DynamicStructuredTool({
  name: "validateShiftConstraints",
  description: `Validate that a proposed shift assignment satisfies all constraints.
Returns any violations found. Always call this before finalizing a schedule.
Constraints checked:
- No staff assigned to overlapping shifts
- Minimum rest between shifts (${SHIFT_CONSTRAINTS.minRestBetweenShiftsHours}h)
- Maximum shifts per week (${SHIFT_CONSTRAINTS.maxShiftsPerWeek})
- Staff role matches required role`,
  schema: z.object({
    assignments: z.array(z.object({
      staffId: z.string().describe("Staff member ID"),
      staffName: z.string().describe("Staff member name"),
      role: z.string().describe("Role assigned"),
      department: z.string().describe("Department"),
      startTime: z.string().describe("Shift start time (ISO 8601)"),
      endTime: z.string().describe("Shift end time (ISO 8601)"),
    })).describe("Proposed shift assignments to validate"),
    staffData: z.array(z.object({
      id: z.string(),
      role: z.string(),
      totalShifts: z.number(),
      lastShiftEnd: z.string().nullable(),
    })).describe("Staff data for validation"),
  }),
  func: async ({ assignments, staffData }) => {
    const violations: string[] = [];
    const staffMap = new Map(staffData.map((s) => [s.id, s]));
    const minRestMs = SHIFT_CONSTRAINTS.minRestBetweenShiftsHours * 3600 * 1000;

    // Check for duplicate staff assignments
    const staffAssignments = new Map<string, number>();
    for (const a of assignments) {
      staffAssignments.set(a.staffId, (staffAssignments.get(a.staffId) ?? 0) + 1);
    }

    for (const [staffId, count] of staffAssignments) {
      if (count > 1) {
        violations.push(`Staff ${staffId} assigned to ${count} overlapping shifts`);
      }
    }

    // Check role match
    for (const a of assignments) {
      const staff = staffMap.get(a.staffId);
      if (staff && staff.role !== a.role) {
        violations.push(
          `Staff ${a.staffName} (role: ${staff.role}) assigned to ${a.role} shift — role mismatch`,
        );
      }
    }

    // Check rest hours
    for (const a of assignments) {
      const staff = staffMap.get(a.staffId);
      if (staff?.lastShiftEnd) {
        const lastEnd = new Date(staff.lastShiftEnd).getTime();
        const thisStart = new Date(a.startTime).getTime();
        if (thisStart - lastEnd < minRestMs) {
          const restHours = ((thisStart - lastEnd) / 3600000).toFixed(1);
          violations.push(
            `Staff ${a.staffName}: only ${restHours}h rest (need ${SHIFT_CONSTRAINTS.minRestBetweenShiftsHours}h)`,
          );
        }
      }
    }

    // Check weekly cap
    for (const a of assignments) {
      const staff = staffMap.get(a.staffId);
      if (staff && staff.totalShifts >= SHIFT_CONSTRAINTS.maxShiftsPerWeek) {
        violations.push(
          `Staff ${a.staffName}: at weekly cap (${staff.totalShifts}/${SHIFT_CONSTRAINTS.maxShiftsPerWeek})`,
        );
      }
    }

    return JSON.stringify({
      valid: violations.length === 0,
      violations,
      summary: violations.length === 0
        ? "All constraints satisfied"
        : `${violations.length} constraint violation(s) found`,
    });
  },
});

/**
 * LangChain tool: calculateFairnessScore
 *
 * Computes a fairness score (0-100) for a set of shift assignments.
 * Higher = more balanced distribution.
 */
export const fairnessScoreTool = new DynamicStructuredTool({
  name: "calculateFairnessScore",
  description: `Calculate a fairness score for a shift distribution.
Returns a 0-100 score where 100 = perfectly balanced. Lower scores mean
some staff are overworked while others are under-assigned.`,
  schema: z.object({
    assignments: z.array(z.object({
      staffId: z.string().describe("Staff ID"),
      staffName: z.string().describe("Staff name"),
    })).describe("Current assignment list"),
    allStaff: z.array(z.object({
      id: z.string(),
      name: z.string(),
      totalShifts: z.number(),
    })).describe("All staff eligible for shifts"),
  }),
  func: async ({ assignments, allStaff }) => {
    // Count assignments per staff
    const counts = new Map<string, number>();
    for (const s of allStaff) counts.set(s.id, s.totalShifts);
    for (const a of assignments) {
      counts.set(a.staffId, (counts.get(a.staffId) ?? 0) + 1);
    }

    const values = Array.from(counts.values());
    if (values.length <= 1) return JSON.stringify({ fairnessScore: 100, distribution: "single staff" });

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    // Score: 100 when all equal, decreases as range grows
    const score = Math.max(0, Math.round(100 - (range / Math.max(max, 1)) * 50));

    return JSON.stringify({
      fairnessScore: score,
      distribution: values.map((v, i) => ({
        staffId: Array.from(counts.keys())[i],
        shiftCount: v,
      })),
      range,
    });
  },
});
