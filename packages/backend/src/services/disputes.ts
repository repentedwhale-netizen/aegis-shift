import prisma from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { getWebSocket } from "../websocket/manager";
import type { FileDisputeInput, ProposeResolutionInput } from "@aegis-shift/shared";

export async function fileDispute(input: FileDisputeInput & { filedBy: string }) {
  const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });
  if (!shift) throw new Error(`Shift ${input.shiftId} not found`);

  const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw new Error(`Staff ${input.staffId} not found`);

  // Mark shift as disputed
  await prisma.shift.update({
    where: { id: input.shiftId },
    data: { status: "disputed" },
  });

  const dispute = await prisma.dispute.create({
    data: {
      shiftId: input.shiftId,
      staffId: input.staffId,
      reason: input.reason,
      status: "active",
    },
    include: { staff: true, shift: true },
  });

  await auditLog({
    action: "dispute:filed",
    entity: "dispute",
    entityId: dispute.id,
    actor: input.filedBy,
    details: JSON.stringify({ shiftId: input.shiftId, staffId: input.staffId }),
  });

  getWebSocket().broadcast("dispute:filed", { dispute });
  getWebSocket().broadcast("shift:disputed", { shift: { id: shift.id } });

  return dispute;
}

export async function proposeResolution(input: ProposeResolutionInput & { proposedBy: string }) {
  const dispute = await prisma.dispute.findUnique({ where: { id: input.disputeId } });
  if (!dispute) throw new Error(`Dispute ${input.disputeId} not found`);
  if (dispute.status !== "active") throw new Error("Dispute not active");

  const resolved = await prisma.dispute.update({
    where: { id: input.disputeId },
    data: {
      status: "ai_resolved",
      proposedResolution: input.resolutionType,
      resolution: input.resolution,
      evidence: input.evidence,
    },
    include: { staff: true, shift: true },
  });

  await auditLog({
    action: "dispute:resolved",
    entity: "dispute",
    entityId: resolved.id,
    actor: input.proposedBy,
    details: JSON.stringify({
      disputeId: input.disputeId,
      resolutionType: input.resolutionType,
    }),
  });

  getWebSocket().broadcast("dispute:resolved", { dispute: resolved });

  return resolved;
}

export async function executeResolution(disputeId: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new Error(`Dispute ${disputeId} not found`);
  if (dispute.status !== "ai_resolved") throw new Error("No resolution to execute");

  const executed = await prisma.dispute.update({
    where: { id: disputeId },
    data: { status: "executed", resolvedAt: new Date() },
  });

  // Resolve the shift as well
  await prisma.shift.update({
    where: { id: dispute.shiftId },
    data: { status: "completed" },
  });

  getWebSocket().broadcast("dispute:resolved", { dispute: executed });

  return executed;
}

export async function overrideResolution(
  disputeId: string,
  params: { resolution: string; reason: string; overriddenBy: string },
) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new Error(`Dispute ${disputeId} not found`);
  if (dispute.status === "executed" || dispute.status === "overridden" || dispute.status === "cancelled") {
    throw new Error("Dispute already resolved");
  }

  const overridden = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: "overridden",
      resolution: params.resolution,
      evidence: params.reason,
      resolvedAt: new Date(),
    },
    include: { staff: true, shift: true },
  });

  await auditLog({
    action: "dispute:overridden",
    entity: "dispute",
    entityId: overridden.id,
    actor: params.overriddenBy,
    details: JSON.stringify({ disputeId, reason: params.reason }),
  });

  getWebSocket().broadcast("dispute:resolved", { dispute: overridden });

  return overridden;
}

export async function listDisputes(params: { status?: string; limit?: number; offset?: number }) {
  return prisma.dispute.findMany({
    where: params.status ? { status: params.status } : {},
    include: { staff: true, shift: true },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  });
}

export async function getDispute(disputeId: string) {
  return prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { staff: true, shift: true },
  });
}
