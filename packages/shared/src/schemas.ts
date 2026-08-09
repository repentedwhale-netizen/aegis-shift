import { z } from "zod";

// ─── Shift Management ────────────────────────────────────────────

export const ShiftStatus = z.enum(["scheduled", "active", "completed", "cancelled", "disputed"]);
export type ShiftStatus = z.infer<typeof ShiftStatus>;

export const ShiftRole = z.enum([
  "ICU Nurse",
  "ER Physician",
  "General Practitioner",
  "Surgeon",
  "Anesthesiologist",
  "Radiologist",
  "Lab Technician",
  "Pharmacist",
  "Paramedic",
  "Admin",
]);
export type ShiftRole = z.infer<typeof ShiftRole>;

export const ShiftDepartment = z.enum([
  "ICU",
  "Emergency",
  "Surgery",
  "Radiology",
  "Laboratory",
  "Pharmacy",
  "General Ward",
  "Pediatrics",
  "Obstetrics",
  "Administration",
]);
export type ShiftDepartment = z.infer<typeof ShiftDepartment>;

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string(),
  staffName: z.string().min(1).max(100),
  role: ShiftRole,
  department: ShiftDepartment,
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  status: ShiftStatus,
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Shift = z.infer<typeof ShiftSchema>;

export const CreateShiftInput = z.object({
  staffId: z.string(),
  staffName: z.string().min(1).max(100),
  role: ShiftRole,
  department: ShiftDepartment,
  startedAt: z.coerce.date(),
});
export type CreateShiftInput = z.infer<typeof CreateShiftInput>;

export const CompleteShiftInput = z.object({
  shiftId: z.string().uuid(),
});
export type CompleteShiftInput = z.infer<typeof CompleteShiftInput>;

// ─── Staff / User ──────────────────────────────────────────────────

export const StaffSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().nullable(),
  role: ShiftRole,
  department: ShiftDepartment,
  isActive: z.boolean(),
  totalShifts: z.number().int().nonnegative(),
  credentials: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Staff = z.infer<typeof StaffSchema>;

export const CreateStaffInput = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: ShiftRole,
  department: ShiftDepartment,
});
export type CreateStaffInput = z.infer<typeof CreateStaffInput>;

// ─── Disputes ──────────────────────────────────────────────────────

export const DisputeStatus = z.enum([
  "active",
  "ai_resolved",
  "executed",
  "overridden",
  "cancelled",
]);
export type DisputeStatus = z.infer<typeof DisputeStatus>;

export const ResolutionType = z.enum([
  "pay_facility",
  "pay_staff",
  "split_50_50",
  "custom",
]);
export type ResolutionType = z.infer<typeof ResolutionType>;

export const DisputeSchema = z.object({
  id: z.string().uuid(),
  shiftId: z.string().uuid(),
  staffId: z.string(),
  reason: z.string().min(1).max(500),
  status: DisputeStatus,
  proposedResolution: ResolutionType.nullable(),
  resolution: z.string().nullable(),
  evidence: z.string().nullable(),
  createdAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
});
export type Dispute = z.infer<typeof DisputeSchema>;

export const FileDisputeInput = z.object({
  shiftId: z.string().uuid(),
  staffId: z.string(),
  reason: z.string().min(1).max(500),
});
export type FileDisputeInput = z.infer<typeof FileDisputeInput>;

export const ProposeResolutionInput = z.object({
  disputeId: z.string().uuid(),
  resolution: z.string(),
  resolutionType: ResolutionType,
  evidence: z.string().max(2000),
});
export type ProposeResolutionInput = z.infer<typeof ProposeResolutionInput>;

// ─── Credentials ───────────────────────────────────────────────────

export const CredentialType = z.enum([
  "medical_license",
  "board_certification",
  "DEA_registration",
  "CPR_certification",
  "ACLS_certification",
  "specialty_certification",
  "hospital_privileges",
  "background_check",
]);
export type CredentialType = z.infer<typeof CredentialType>;

export const CredentialSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string(),
  credentialType: CredentialType,
  issuedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  metadata: z.record(z.unknown()),
  revoked: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Credential = z.infer<typeof CredentialSchema>;

// ─── AI Shift Matching ─────────────────────────────────────────────

export const ShiftAssignmentInput = z.object({
  department: ShiftDepartment,
  date: z.coerce.date(),
  shiftCount: z.number().int().min(1).max(50),
});
export type ShiftAssignmentInput = z.infer<typeof ShiftAssignmentInput>;

export const ShiftAssignmentResult = z.object({
  assignments: z.array(z.object({
    staffId: z.string(),
    staffName: z.string(),
    role: ShiftRole,
    department: ShiftDepartment,
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    optimizationScore: z.number(),
  })),
  totalScore: z.number(),
  unmetDemand: z.number().int(),
});
export type ShiftAssignmentResult = z.infer<typeof ShiftAssignmentResult>;

// ─── WebSocket Events ──────────────────────────────────────────────

export const WsEventType = z.enum([
  "shift:created",
  "shift:completed",
  "shift:disputed",
  "credential:issued",
  "credential:revoked",
  "dispute:filed",
  "dispute:resolved",
  "agent:thinking",
  "agent:conclusion",
]);
export type WsEventType = z.infer<typeof WsEventType>;

export const WsEventSchema = z.object({
  type: WsEventType,
  payload: z.record(z.unknown()),
  timestamp: z.number(),
});
export type WsEvent = z.infer<typeof WsEventSchema>;
