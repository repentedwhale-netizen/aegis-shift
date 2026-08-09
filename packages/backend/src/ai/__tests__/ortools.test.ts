import { describe, it, expect } from "vitest";
import {
  solveShiftScheduling,
  buildShiftSlots,
} from "../ortools/scheduler";
import type { StaffVariable, ShiftSlot, ScheduleConstraint } from "../ortools/types";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";

// ─── Edge Cases & Fairness ─────────────────────────────────────────

describe("OR-Tools Scheduler — Edge Cases", () => {
  const makeStaff = (overrides: Partial<StaffVariable> = {}): StaffVariable => ({
    id: `staff-${Math.random().toString(36).slice(2, 6)}`,
    name: "Test Staff",
    role: "ICU Nurse",
    department: "ICU",
    totalShifts: 0,
    lastShiftEndMs: null,
    ...overrides,
  });

  const makeSlot = (overrides: Partial<ShiftSlot> = {}): ShiftSlot => ({
    index: 0,
    role: "ICU Nurse",
    department: "ICU",
    startTimeMs: Date.now(),
    endTimeMs: Date.now() + 8 * 3600 * 1000,
    requiredCount: 1,
    ...overrides,
  });

  const defaultConstraints: ScheduleConstraint[] = [
    { type: "role_match", params: {} },
    { type: "rest_hours", params: { hours: 8 } },
    { type: "weekly_cap", params: { max: 5 } },
  ];

  it("prefers staff with lower totalShifts (fairness)", () => {
    const staff: StaffVariable[] = [
      makeStaff({ id: "low", name: "Low", totalShifts: 0 }),
      makeStaff({ id: "mid", name: "Mid", totalShifts: 2 }),
      makeStaff({ id: "high", name: "High", totalShifts: 4 }),
    ];

    const slots: ShiftSlot[] = [makeSlot()];
    const result = solveShiftScheduling(slots, staff, defaultConstraints);

    expect(result.assignments.length).toBe(1);
    expect(result.assignments[0].staffId).toBe("low"); // lowest totalShifts
  });

  it("department match bonus applies", () => {
    const staff: StaffVariable[] = [
      makeStaff({ id: "same-dept", name: "Same Dept", department: "ICU", totalShifts: 0 }),
      makeStaff({ id: "diff-dept", name: "Diff Dept", department: "Emergency", totalShifts: 0 }),
    ];

    const slots: ShiftSlot[] = [makeSlot({ department: "ICU" })];
    const result = solveShiftScheduling(slots, staff, defaultConstraints);

    expect(result.assignments.length).toBe(1);
    expect(result.assignments[0].staffId).toBe("same-dept");
  });

  it("handles 50-slot large schedule", () => {
    const staff: StaffVariable[] = Array.from({ length: 20 }, (_, i) =>
      makeStaff({
        id: `staff-${i}`,
        name: `Staff ${i}`,
        role: "ICU Nurse",
        totalShifts: i % 5,
      }),
    );

    const slots: ShiftSlot[] = Array.from({ length: 50 }, (_, i) =>
      makeSlot({
        index: i,
        startTimeMs: Date.now() + i * 9 * 3600 * 1000,
        endTimeMs: Date.now() + (i * 9 + 8) * 3600 * 1000,
      }),
    );

    const result = solveShiftScheduling(slots, staff, defaultConstraints);
    expect(result.assignments.length).toBeGreaterThan(0);
    expect(result.metrics.solveTimeMs).toBeLessThan(1000); // should be fast
  });

  it("all scores are within 0-100 range", () => {
    const staff: StaffVariable[] = Array.from({ length: 5 }, (_, i) =>
      makeStaff({ id: `staff-${i}`, name: `S${i}`, totalShifts: i }),
    );

    const slots: ShiftSlot[] = [makeSlot()];
    const result = solveShiftScheduling(slots, staff, defaultConstraints);

    for (const a of result.assignments) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    }
  });

  it("buildShiftSlots covers all known departments", () => {
    const departments = [
      "ICU", "Emergency", "Surgery", "Radiology", "Laboratory",
      "Pharmacy", "General Ward", "Pediatrics", "Obstetrics", "Administration",
    ];

    for (const dept of departments) {
      const slots = buildShiftSlots(dept, new Date(), 2);
      expect(slots.length).toBe(2);
      expect(slots[0].department).toBe(dept);
    }
  });
});
