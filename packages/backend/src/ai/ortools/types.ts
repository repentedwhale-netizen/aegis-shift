/**
 * OR-Tools constraint programming types for shift scheduling.
 *
 * Models a Constraint Satisfaction Problem (CSP) where:
 * - Variables: staff assignments per shift slot
 * - Domains: eligible staff per role
 * - Constraints: rest hours, weekly caps, role matching
 * - Objective: maximize coverage, minimize inequality
 */

export interface StaffVariable {
  id: string;
  name: string;
  role: string;
  department: string;
  totalShifts: number;
  /** Timestamp of last completed shift, ms since epoch */
  lastShiftEndMs: number | null;
  /** Staff preference score for this shift (0-1) */
  preference?: number;
}

export interface ShiftSlot {
  index: number;
  role: string;
  department: string;
  startTimeMs: number;
  endTimeMs: number;
  /** Each slot requires exactly one staff member */
  requiredCount: number;
}

export interface ScheduleConstraint {
  type: "role_match" | "rest_hours" | "weekly_cap" | "no_overlap" | "max_consecutive";
  params: Record<string, unknown>;
}

export interface ScheduleResult {
  assignments: Array<{
    slotIndex: number;
    staffId: string;
    staffName: string;
    role: string;
    department: string;
    startTime: string;
    endTime: string;
    score: number;
  }>;
  metrics: {
    totalSlots: number;
    filledSlots: number;
    coveragePercent: number;
    fairnessVariance: number;
    averageScore: number;
    solveTimeMs: number;
  };
  unassignedSlots: number[];
  warnings: string[];
}
