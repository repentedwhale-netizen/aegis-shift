import prisma from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { getWebSocket } from "../websocket/manager";

export interface IssueCredentialParams {
  staffId: string;
  credentialType: string;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
  issuedBy: string;
}

export async function issueCredential(input: IssueCredentialParams) {
  const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw new Error(`Staff ${input.staffId} not found`);

  const cred = await prisma.credential.create({
    data: {
      staffId: input.staffId,
      credentialType: input.credentialType,
      issuedAt: new Date(),
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata as any,
      revoked: false,
    },
    include: { staff: true },
  });

  await auditLog({
    action: "credential:issued",
    entity: "credential",
    entityId: cred.id,
    actor: input.issuedBy,
    details: JSON.stringify({ type: input.credentialType, staffId: input.staffId }),
  });

  getWebSocket().broadcast("credential:issued", { credential: cred });

  return cred;
}

export async function verifyCredential(credentialId: string) {
  const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!cred) return { valid: false, reason: "not_found" };
  if (cred.revoked) return { valid: false, reason: "revoked" };
  if (cred.expiresAt && new Date() > cred.expiresAt) return { valid: false, reason: "expired" };
  return { valid: true, credential: cred };
}

export async function revokeCredential(input: { credentialId: string; revokedBy: string }) {
  const cred = await prisma.credential.findUnique({ where: { id: input.credentialId } });
  if (!cred) throw new Error("Credential not found");
  if (cred.revoked) throw new Error("Already revoked");

  const updated = await prisma.credential.update({
    where: { id: input.credentialId },
    data: { revoked: true },
    include: { staff: true },
  });

  await auditLog({
    action: "credential:revoked",
    entity: "credential",
    entityId: updated.id,
    actor: input.revokedBy,
  });

  getWebSocket().broadcast("credential:revoked", { credential: updated });

  return updated;
}

export async function listCredentials(staffId: string) {
  return prisma.credential.findMany({
    where: { staffId },
    include: { staff: true },
    orderBy: { issuedAt: "desc" },
  });
}
