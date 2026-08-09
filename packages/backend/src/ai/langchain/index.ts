/**
 * Barrel export for the AI pipeline.
 *
 * Exports all LangChain chains, OR-Tools scheduler,
 * and the orchestrator as a unified AI module.
 */

// Config
export { getChatModel, resetChatModel } from "./config";

// LangChain chains
export {
  buildShiftOptimizationChain,
  runShiftOptimization,
  aiOutputToScheduleResult,
} from "./chains/shiftOptimization";
export type { ShiftOptimizationInput, AIShiftMatchingOutput } from "./chains/shiftOptimization";

export {
  buildDisputeResolutionChain,
  runDisputeResolution,
  mapResolutionType,
} from "./chains/disputeResolution";
export type { DisputeResolutionInput, AIDisputeOutput } from "./chains/disputeResolution";

export {
  buildCredentialReviewChain,
  runCredentialReview,
} from "./chains/credentialReview";
export type { CredentialReviewInput, AICredentialReviewOutput } from "./chains/credentialReview";

// LangChain tools
export { staffQueryTool, shiftDistributionTool } from "./tools/staffQuery";
export { constraintValidatorTool, fairnessScoreTool } from "./tools/constraintValidator";

// Pipeline orchestrator
export {
  aiScheduleShifts,
  aiResolveDispute,
  aiReviewCredential,
} from "./pipeline";
export type { DisputeResolutionResult, CredentialReviewResult } from "./pipeline";

// OR-Tools scheduler
export {
  solveShiftScheduling,
  buildShiftSlots,
} from "../ortools/scheduler";
export type {
  StaffVariable,
  ShiftSlot,
  ScheduleConstraint,
  ScheduleResult,
} from "../ortools/types";
