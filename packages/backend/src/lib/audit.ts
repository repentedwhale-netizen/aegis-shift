import prisma from "./prisma";

export async function auditLog(params: {
  action: string;
  entity: string;
  entityId: string;
  actor: string;
  details?: string;
}) {
  await prisma.auditLog.create({ data: params });
}
