import prisma from "../lib/prisma";
import { SHIFT_CONSTRAINTS } from "@aegis-shift/shared";
import { aiScheduleShifts } from "./langchain/pipeline";
import type { ScheduleResult } from "./ortools/types";

export { aiScheduleShifts, aiResolveDispute, aiReviewCredential } from "./langchain/pipeline";

interface StaffCandidate {
  id: string;
  name: string;
  role: string;
  department: string;
  totalShifts: number;
  lastShiftEnd: Date | null;
}

interface ShiftNeed {
  role: string;
  department: string;
  count: number;
  startTime: Date;
  endTime: Date;
}

interface Assignment {
  staffId: string;
  staffName: string;
  role: string;
  department: string;
  startTime: Date;
  endTime: Date;
  optimizationScore: number;
}

export interface MatchResult {
  assignments: Assignment[];
  totalScore: number;
  unmetDemand: number;
}

export async function matchShifts(
  department: string,
  date: Date,
  shiftCount: number,
): Promise<MatchResult> {
  const defaultDurationHours = SHIFT_CONSTRAINTS.defaultShiftDurationHours;
  const startOfDay = new Date(date);
  startOfDay.setHours(7, 0, 0, 0);

  const staff = await prisma.staff.findMany({
    where: { department, isActive: true },
    orderBy: { totalShifts: "asc" },
  });

  const staffWithLastShift = await Promise.all(
    staff.map(async (s) => {
      const lastShift = await prisma.shift.findFirst({
        where: { staffId: s.id, status: "completed" },
        orderBy: { completedAt: "desc" },
      });
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        department: s.department,
        totalShifts: s.totalShifts,
        lastShiftEnd: lastShift?.completedAt ?? null,
      } satisfies StaffCandidate;
    }),
  );

  const roleNeeds = getDepartmentRoleNeeds(department, shiftCount);

  const assignments: Assignment[] = [];
  const usedStaff = new Set<string>();
  let unmetDemand = 0;

  for (const need of roleNeeds) {
    for (let i = 0; i < need.count; i++) {
      const best = findBestStaff(staffWithLastShift, need, usedStaff, assignments, startOfDay);
      if (best) {
        usedStaff.add(best.id);
        assignments.push({
          staffId: best.id,
          staffName: best.name,
          role: need.role,
          department: need.department,
          startTime: startOfDay,
          endTime: new Date(startOfDay.getTime() + defaultDurationHours * 3600 * 1000),
          optimizationScore: best.score,
        });
      } else {
        unmetDemand++;
      }
    }
  }

  const totalScore = assignments.reduce((sum, a) => sum + a.optimizationScore, 0);
  return { assignments, totalScore, unmetDemand };
}

function getDepartmentRoleNeeds(department: string, totalShifts: number): ShiftNeed[] {
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
  const start = new Date();
  start.setHours(7, 0, 0, 0);
  const end = new Date(start.getTime() + 12 * 3600 * 1000);

  const needs: ShiftNeed[] = [];
  const perRole = Math.ceil(totalShifts / roles.length);
  const uniqueRoles = [...new Set(roles)];

  for (const role of uniqueRoles) {
    needs.push({ role, department, count: perRole, startTime: start, endTime: end });
  }

  return needs;
}

interface StaffScore {
  id: string;
  name: string;
  score: number;
}

function findBestStaff(
  candidates: StaffCandidate[],
  need: ShiftNeed,
  usedStaff: Set<string>,
  currentAssignments: Assignment[],
  shiftStart: Date,
): StaffScore | null {
  const minRestMs = SHIFT_CONSTRAINTS.minRestBetweenShiftsHours * 3600 * 1000;

  const scored = candidates
    .filter((c) => {
      if (c.role !== need.role) return false;
      if (usedStaff.has(c.id)) return false;
      if (c.lastShiftEnd) {
        const restMs = shiftStart.getTime() - c.lastShiftEnd.getTime();
        if (restMs < minRestMs) return false;
      }
      if (c.totalShifts >= SHIFT_CONSTRAINTS.maxShiftsPerWeek) return false;
      return true;
    })
    .map((c) => {
      let score = 100 - c.totalShifts * 10;
      if (c.department === need.department) score += 20;
      return { id: c.id, name: c.name, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0] ?? null;
}

export async function aiEnhancedMatchShifts(
  department: string,
  date: Date,
  shiftCount: number,
): Promise<MatchResult> {
  try {
    const result: ScheduleResult = await aiScheduleShifts(department, date, shiftCount);
    return {
      assignments: result.assignments.map((a) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        role: a.role,
        department: a.department,
        startTime: new Date(a.startTime),
        endTime: new Date(a.endTime),
        optimizationScore: a.score,
      })),
      totalScore: result.assignments.reduce((sum, a) => sum + a.score, 0),
      unmetDemand: result.unassignedSlots.length,
    };
  } catch (err) {
    console.error("AI pipeline failed, falling back to greedy:", err);
    return matchShifts(department, date, shiftCount);
  }
}

export async function aiScheduleShiftsDetailed(
  department: string,
  date: Date,
  shiftCount: number,
): Promise<ScheduleResult> {
  return aiScheduleShifts(department, date, shiftCount);
}
