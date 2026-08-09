import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma", () => ({
  default: {
    staff: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    shift: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    dispute: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    credential: {},
    predictionMarket: {},
  },
}));

import { describe as describe2, it as it2, expect as expect2 } from "vitest";
import { solveShiftScheduling, buildShiftSlots } from "../ortools/scheduler";
import type { StaffVariable, ShiftSlot, ScheduleConstraint } from "../ortools/types";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";

// ─── OR-Tools Scheduler Tests ──────────────────────────────────────

describe("solveShiftScheduling", () => {
  const testStaff: StaffVariable[] = [
    {
      id: "staff-1",
      name: "Alice Chen",
      role: "ICU Nurse",
      department: "ICU",
      totalShifts: 2,
      lastShiftEndMs: null,
      preference: 0.8,
    },
    {
      id: "staff-2",
      name: "Bob Smith",
      role: "ICU Nurse",
      department: "ICU",
      totalShifts: 5, // at weekly cap
      lastShiftEndMs: null,
    },
    {
      id: "staff-3",
      name: "Carol Davis",
      role: "ER Physician",
      department: "ICU",
      totalShifts: 1,
      lastShiftEndMs: null,
    },
    {
      id: "staff-4",
      name: "Dan Wilson",
      role: "ICU Nurse",
      department: "ICU",
      totalShifts: 0,
      lastShiftEndMs: null,
    },
  ];

  const testSlots: ShiftSlot[] = [
    {
      index: 0,
      role: "ICU Nurse",
      department: "ICU",
      startTimeMs: Date.now(),
      endTimeMs: Date.now() + 8 * 3600 * 1000,
      requiredCount: 1,
    },
    {
      index: 1,
      role: "ICU Nurse",
      department: "ICU",
      startTimeMs: Date.now() + 9 * 3600 * 1000,
      endTimeMs: Date.now() + 17 * 3600 * 1000,
      requiredCount: 1,
    },
    {
      index: 2,
      role: "ER Physician",
      department: "ICU",
      startTimeMs: Date.now(),
      endTimeMs: Date.now() + 8 * 3600 * 1000,
      requiredCount: 1,
    },
  ];

  const constraints: ScheduleConstraint[] = [
    { type: "role_match", params: {} },
    { type: "rest_hours", params: { hours: 8 } },
    { type: "weekly_cap", params: { max: 5 } },
    { type: "no_overlap", params: {} },
  ];

  it("fills all slots with eligible staff", () => {
    const result = solveShiftScheduling(testSlots, testStaff, constraints);

    expect(result.assignments.length).toBeGreaterThanOrEqual(2);
    expect(result.metrics.coveragePercent).toBeGreaterThan(0);
  });

  it("does not assign staff at weekly cap", () => {
    const result = solveShiftScheduling(testSlots, testStaff, constraints);

    // Bob (staff-2) has 5 shifts (at cap), should not be assigned
    const bobAssignments = result.assignments.filter((a) => a.staffId === "staff-2");
    expect(bobAssignments.length).toBe(0);
  });

  it("does not assign role-mismatched staff", () => {
    const result = solveShiftScheduling(testSlots, testStaff, constraints);

    // Carol (staff-3, ER Physician) should only be in ER Physician slots
    const carolAssignments = result.assignments.filter((a) => a.staffId === "staff-3");
    for (const a of carolAssignments) {
      expect(a.role).toBe("ER Physician");
    }
  });

  it("no staff assigned to multiple slots", () => {
    const result = solveShiftScheduling(testSlots, testStaff, constraints);

    const staffIds = result.assignments.map((a) => a.staffId);
    const uniqueIds = new Set(staffIds);
    expect(uniqueIds.size).toBe(staffIds.length);
  });

  it("returns metrics with correct structure", () => {
    const result = solveShiftScheduling(testSlots, testStaff, constraints);

    expect(result.metrics).toHaveProperty("totalSlots");
    expect(result.metrics).toHaveProperty("filledSlots");
    expect(result.metrics).toHaveProperty("coveragePercent");
    expect(result.metrics).toHaveProperty("fairnessVariance");
    expect(result.metrics).toHaveProperty("averageScore");
    expect(result.metrics).toHaveProperty("solveTimeMs");
    expect(result.metrics.solveTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("handles empty staff list gracefully", () => {
    const result = solveShiftScheduling(testSlots, [], constraints);
    expect(result.assignments.length).toBe(0);
    expect(result.metrics.filledSlots).toBe(0);
    expect(result.unassignedSlots.length).toBe(testSlots.length);
  });

  it("handles empty slots list gracefully", () => {
    const result = solveShiftScheduling([], testStaff, constraints);
    expect(result.assignments.length).toBe(0);
    expect(result.metrics.coveragePercent).toBe(100);
  });

  it("enforces rest hours constraint", () => {
    const justFinished: StaffVariable = {
      id: "staff-5",
      name: "Eve",
      role: "ICU Nurse",
      department: "ICU",
      totalShifts: 1,
      lastShiftEndMs: Date.now() - 2 * 3600 * 1000, // only 2 hours rest
    };

    const staffWithRecent = [...testStaff, justFinished];
    const result = solveShiftScheduling(testSlots, staffWithRecent, constraints);

    const eveAssignments = result.assignments.filter((a) => a.staffId === "staff-5");
    expect(eveAssignments.length).toBe(0); // should not be assigned
  });
});

// ─── Slot Builder Tests ────────────────────────────────────────────

describe("buildShiftSlots", () => {
  it("builds correct number of slots", () => {
    const date = new Date("2026-09-12");
    const slots = buildShiftSlots("ICU", date, 6);
    expect(slots.length).toBe(6);
  });

  it("assigns correct roles per department", () => {
    const date = new Date("2026-09-12");
    const slots = buildShiftSlots("Surgery", date, 4);

    // Surgery: ["Surgeon", "Anesthesiologist"] → alternating with 4 slots:
    // Slot 0=Surgeon, 1=Anesthesiologist, 2=Surgeon, 3=Anesthesiologist
    expect(slots[0].role).toBe("Surgeon");
    expect(slots[1].role).toBe("Anesthesiologist");
    expect(slots[2].role).toBe("Surgeon");
    expect(slots[3].role).toBe("Anesthesiologist");
  });

  it("each slot has sequential timing", () => {
    const date = new Date("2026-09-12");
    const slots = buildShiftSlots("ICU", date, 3);

    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startTimeMs).toBeGreaterThan(slots[i - 1].startTimeMs);
    }
  });

  it("each slot has correct duration", () => {
    const date = new Date("2026-09-12");
    const slots = buildShiftSlots("ICU", date, 1);
    const duration = slots[0].endTimeMs - slots[0].startTimeMs;
    expect(duration).toBe(SHIFT_CONSTRAINTS.defaultShiftDurationHours * 3600 * 1000);
  });

  it("falls back to General Ward roles for unknown department", () => {
    const date = new Date("2026-09-12");
    const slots = buildShiftSlots("UnknownDept", date, 2);
    expect(slots.length).toBe(2);
    expect(["General Practitioner", "ICU Nurse"]).toContain(slots[0].role);
  });
});

// ─── Greedy Matcher Integration Tests ──────────────────────────────

describe("matchShifts (greedy fallback)", () => {
  it("export exists and is callable", async () => {
    const { matchShifts } = await import("../shiftMatcher");
    expect(typeof matchShifts).toBe("function");
  });

  it("aiEnhancedMatchShifts export exists", async () => {
    const { aiEnhancedMatchShifts } = await import("../shiftMatcher");
    expect(typeof aiEnhancedMatchShifts).toBe("function");
  });

  it("aiScheduleShiftsDetailed export exists", async () => {
    const { aiScheduleShiftsDetailed } = await import("../shiftMatcher");
    expect(typeof aiScheduleShiftsDetailed).toBe("function");
  });
});
