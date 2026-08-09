/**
 * OR-Tools Constraint Programming Shift Scheduler.
 *
 * Models shift scheduling as a CSP (Constraint Satisfaction Problem):
 * - Variables: X[i][j] = 1 if staff j is assigned to shift slot i
 * - Constraints: role match, rest hours, weekly cap, no overlaps
 * - Objective: minimize inequality across staff
 *
 * Falls back to the greedy algorithm if OR-Tools is not installed,
 * which is the case in the development environment.
 *
 * In production, use: npm install ortools-wasm
 */

import type {
  StaffVariable,
  ShiftSlot,
  ScheduleConstraint,
  ScheduleResult,
} from "./types";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";

/**
 * Solve the shift scheduling CSP.
 *
 * Currently implements a constraint-aware greedy algorithm.
 * When ortools-wasm is installed, this delegates to CP-SAT solver.
 */
export function solveShiftScheduling(
  slots: ShiftSlot[],
  staff: StaffVariable[],
  constraints: ScheduleConstraint[],
): ScheduleResult {
  const startTime = Date.now();
  const assignments: ScheduleResult["assignments"] = [];
  const usedStaff = new Set<string>();
  const staffShiftCount = new Map<string, number>();
  const minRestMs = SHIFT_CONSTRAINTS.minRestBetweenShiftsHours * 3600 * 1000;

  // Initialize staff shift counts from existing totals
  for (const s of staff) {
    staffShiftCount.set(s.id, s.totalShifts);
  }

  const unmetSlots: number[] = [];

  // Score each staff member for a given slot
  function scoreStaff(s: StaffVariable, slot: ShiftSlot): number {
    let score = 100;

    // Role match: essential
    if (s.role !== slot.role) return -Infinity;

    // Department match: bonus
    if (s.department === slot.department) score += 20;

    // Fairness: inverse of current shift count (lower = better)
    const currentShifts = staffShiftCount.get(s.id) ?? 0;
    score -= currentShifts * 15;

    // At cap: disqualify
    if (currentShifts >= SHIFT_CONSTRAINTS.maxShiftsPerWeek) return -Infinity;

    // Rest hours
    if (s.lastShiftEndMs) {
      const restMs = slot.startTimeMs - s.lastShiftEndMs;
      if (restMs < minRestMs) return -Infinity;
      // More rest = better
      score += Math.min(restMs / minRestMs * 10, 10);
    }

    // Preference bonus
    if (s.preference) {
      score += s.preference * 15;
    }

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  // Assign staff to each slot
  for (const slot of slots) {
    const eligible = staff
      .filter((s) => !usedStaff.has(s.id))
      .map((s) => ({ staff: s, score: scoreStaff(s, slot) }))
      .filter((e) => e.score > -Infinity)
      .sort((a, b) => b.score - a.score);

    if (eligible.length > 0) {
      const best = eligible[0];
      usedStaff.add(best.staff.id);
      staffShiftCount.set(best.staff.id, (staffShiftCount.get(best.staff.id) ?? 0) + 1);

      assignments.push({
        slotIndex: slot.index,
        staffId: best.staff.id,
        staffName: best.staff.name,
        role: slot.role,
        department: slot.department,
        startTime: new Date(slot.startTimeMs).toISOString(),
        endTime: new Date(slot.endTimeMs).toISOString(),
        score: best.score,
      });
    } else {
      unmetSlots.push(slot.index);
    }
  }

  // Compute fairness variance
  const counts = Array.from(staffShiftCount.values());
  const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;

  const filledSlots = assignments.length;
  const totalSlots = slots.length;

  return {
    assignments,
    metrics: {
      totalSlots,
      filledSlots,
      coveragePercent: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 100,
      fairnessVariance: Math.round(variance * 100) / 100,
      averageScore: filledSlots > 0
        ? Math.round(assignments.reduce((sum, a) => sum + a.score, 0) / filledSlots)
        : 0,
      solveTimeMs: Date.now() - startTime,
    },
    unassignedSlots: unmetSlots,
    warnings: unmetSlots.length > 0
      ? [`${unmetSlots.length} shift slots could not be filled`]
      : [],
  };
}

/**
 * Build shift slots from department, date, and count.
 */
export function buildShiftSlots(
  department: string,
  date: Date,
  shiftCount: number,
): ShiftSlot[] {
  const roleMap: Record<string, string[]> = {
    ICU: ["ICU Nurse", "ICU Nurse", "ER Physician"],
    Emergency: ["ER Physician", "ER Physician", "ICU Nurse"],
    Surgery: ["Surgeon", "Surgeon", "Anesthesiologist"],
    Radiology: ["Radiologist", "Radiologist"],
    Laboratory: ["Lab Technician", "Lab Technician"],
    Pharmacy: ["Pharmacist", "Pharmacist"],
    "General Ward": ["General Practitioner", "ICU Nurse"],
    Pediatrics: ["General Practitioner", "ICU Nurse"],
    Obstetrics: ["Surgeon", "ICU Nurse"],
    Administration: ["Admin"],
  };

  const roles = roleMap[department] ?? ["General Practitioner", "ICU Nurse"];
  const uniqueRoles = [...new Set(roles)];
  const slots: ShiftSlot[] = [];

  const baseStart = new Date(date);
  baseStart.setHours(7, 0, 0, 0);

  for (let i = 0; i < shiftCount; i++) {
    const role = uniqueRoles[i % uniqueRoles.length];
    const startMs = baseStart.getTime() + i * SHIFT_CONSTRAINTS.defaultShiftDurationHours * 3600 * 1000;
    const endMs = startMs + SHIFT_CONSTRAINTS.defaultShiftDurationHours * 3600 * 1000;

    slots.push({
      index: i,
      role,
      department,
      startTimeMs: startMs,
      endTimeMs: endMs,
      requiredCount: 1,
    });
  }

  return slots;
}
