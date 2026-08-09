import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../../lib/prisma";

/**
 * LangChain tool: queryStaff
 *
 * Allows the LLM to query the database for staff availability,
 * shift history, and credential status during shift optimization.
 */
export const staffQueryTool = new DynamicStructuredTool({
  name: "queryStaff",
  description: `Query staff members for shift scheduling. Returns staff list with their role,
department, total shifts, and last shift completion time. Use this to understand who is
available and how to balance shift distribution fairly.`,
  schema: z.object({
    department: z.string().optional().describe("Filter by department (e.g. ICU, Emergency)"),
    role: z.string().optional().describe("Filter by role (e.g. ICU Nurse, Surgeon)"),
    limit: z.number().int().min(1).max(100).default(50).describe("Max staff to return"),
  }),
  func: async ({ department, role, limit }) => {
    const staff = await prisma.staff.findMany({
      where: {
        isActive: true,
        ...(department ? { department } : {}),
        ...(role ? { role } : {}),
      },
      take: limit,
      orderBy: { totalShifts: "asc" },
      include: {
        shifts: {
          where: { status: "completed" },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    const result = staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      department: s.department,
      totalShifts: s.totalShifts,
      lastShiftEnd: s.shifts[0]?.completedAt?.toISOString() ?? null,
      isActive: s.isActive,
    }));

    return JSON.stringify(result, null, 2);
  },
});

/**
 * LangChain tool: getShiftDistribution
 *
 * Returns current shift distribution statistics so the LLM can
 * optimize for fairness.
 */
export const shiftDistributionTool = new DynamicStructuredTool({
  name: "getShiftDistribution",
  description: `Get current shift distribution across staff in a department.
Returns each staff member's total completed shifts, current week count, and active shifts.`,
  schema: z.object({
    department: z.string().describe("Department to query"),
    date: z.string().describe("Reference date (YYYY-MM-DD) for week calculation"),
  }),
  func: async ({ department }) => {
    const staff = await prisma.staff.findMany({
      where: { department, isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        totalShifts: true,
        _count: { select: { shifts: true } },
      },
      orderBy: { totalShifts: "asc" },
    });

    const distribution = staff.map((s) => ({
      staffId: s.id,
      name: s.name,
      role: s.role,
      totalShifts: s.totalShifts,
      shiftCount: s._count.shifts,
    }));

    return JSON.stringify(distribution, null, 2);
  },
});
