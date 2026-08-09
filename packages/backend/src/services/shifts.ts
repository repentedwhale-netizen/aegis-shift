import prisma from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { getWebSocket } from "../websocket/manager";
import type { CreateShiftInput, CompleteShiftInput } from "@aegis-shift/shared";

export async function createShift(input: CreateShiftInput) {
  // Verify staff exists
  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
  });
  if (!staff) throw new Error(`Staff ${input.staffId} not found`);

  const shift = await prisma.shift.create({
    data: {
      staffId: input.staffId,
      role: input.role,
      department: input.department,
      startedAt: input.startedAt,
      status: "scheduled",
    },
    include: { staff: true },
  });

  await auditLog({
    action: "shift:created",
    entity: "shift",
    entityId: shift.id,
    actor: "system",
    details: JSON.stringify({ staffId: input.staffId, staff: input.staffName }),
  });

  getWebSocket().broadcast("shift:created", { shift });

  return shift;
}

export async function getShift(shiftId: string) {
  return prisma.shift.findUnique({
    where: { id: shiftId },
    include: { staff: true, disputes: true },
  });
}

export async function listShifts(params: {
  status?: string;
  department?: string;
  staffId?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.shift.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.department ? { department: params.department } : {}),
      ...(params.staffId ? { staffId: params.staffId } : {}),
    },
    include: { staff: true },
    orderBy: { startedAt: "desc" },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  });
}

export async function completeShift(input: CompleteShiftInput) {
  const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });
  if (!shift) throw new Error(`Shift ${input.shiftId} not found`);
  if (shift.status === "completed") throw new Error("Shift already completed");

  const updated = await prisma.shift.update({
    where: { id: input.shiftId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
    include: { staff: true },
  });

  // Increment staff total shifts
  await prisma.staff.update({
    where: { id: shift.staffId },
    data: { totalShifts: { increment: 1 } },
  });

  await auditLog({
    action: "shift:completed",
    entity: "shift",
    entityId: updated.id,
    actor: "system",
    details: JSON.stringify({ shiftId: input.shiftId }),
  });

  getWebSocket().broadcast("shift:completed", { shift: updated });

  return updated;
}

export async function getShiftStats() {
  const [total, completed, active, disputed, cancelled] = await Promise.all([
    prisma.shift.count(),
    prisma.shift.count({ where: { status: "completed" } }),
    prisma.shift.count({ where: { status: "active" } }),
    prisma.shift.count({ where: { status: "disputed" } }),
    prisma.shift.count({ where: { status: "cancelled" } }),
  ]);

  return { total, completed, active, disputed, cancelled };
}

export async function getStaffShiftHistory(staffId: string) {
  return prisma.shift.findMany({
    where: { staffId },
    orderBy: { startedAt: "desc" },
    include: { disputes: true },
  });
}
