import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { getChatModel } from "../config";
import { disputeResolutionPrompt } from "../prompts/disputeResolution";
import type { ResolutionType } from "@aegis-shift/shared";

// ─── Output Schema ──────────────────────────────────────────────────

const disputeOutputSchema = z.object({
  resolutionType: z.enum(["pay_facility", "pay_staff", "split_50_50", "custom"]),
  facilityPayout: z.string(),
  staffPayout: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().max(500),
  keyEvidence: z.array(z.string()),
});

export type AIDisputeOutput = z.infer<typeof disputeOutputSchema>;

// ─── Input Types ─────────────────────────────────────────────────────

export interface DisputeResolutionInput {
  disputeId: string;
  shiftId: string;
  reason: string;
  role: string;
  department: string;
  status: string;
  staffName: string;
  evidence: string;
  staffTotalShifts: number;
  staffDisputeCount: number;
}

// ─── Chain ───────────────────────────────────────────────────────────

const parser = StructuredOutputParser.fromZodSchema(disputeOutputSchema);

export function buildDisputeResolutionChain() {
  const model = getChatModel();
  return RunnableSequence.from([
    disputeResolutionPrompt,
    model,
    parser,
  ]);
}

/**
 * Run AI dispute resolution.
 * Returns null if the API key is missing or the call fails.
 */
export async function runDisputeResolution(
  input: DisputeResolutionInput,
): Promise<AIDisputeOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const chain = buildDisputeResolutionChain();
    const result = await chain.invoke({
      ...input,
      disputeId: input.disputeId.toString(),
      shiftId: input.shiftId.toString(),
      staffTotalShifts: input.staffTotalShifts.toString(),
      staffDisputeCount: input.staffDisputeCount.toString(),
    });
    return result;
  } catch (err) {
    console.error("LangChain dispute resolution failed:", err);
    return null;
  }
}

/**
 * Map AI resolution type to the contract-level ResolutionType enum.
 */
export function mapResolutionType(aiType: string): ResolutionType {
  switch (aiType) {
    case "pay_facility": return "pay_facility";
    case "pay_staff": return "pay_staff";
    case "split_50_50": return "split_50_50";
    default: return "custom";
  }
}
