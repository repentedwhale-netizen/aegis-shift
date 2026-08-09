import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { getChatModel } from "../config";
import { credentialReviewPrompt } from "../prompts/credentialReview";
import type { CredentialType } from "@aegis-shift/shared";

// ─── Output Schema ──────────────────────────────────────────────────

const credentialReviewOutputSchema = z.object({
  recommendation: z.enum(["approve", "reject", "review"]),
  riskLevel: z.enum(["low_risk", "medium_risk", "high_risk"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().max(500),
  flags: z.array(z.string()),
  complianceScore: z.number().min(0).max(100),
});

export type AICredentialReviewOutput = z.infer<typeof credentialReviewOutputSchema>;

// ─── Input Types ─────────────────────────────────────────────────────

export interface CredentialReviewInput {
  credentialType: CredentialType;
  staffId: string;
  staffName: string;
  issuedAt: Date;
  expiresAt: Date | null;
  staffRole: string;
  staffDepartment: string;
  previousCredentials: Array<{ type: string; status: string }>;
}

// ─── Chain ───────────────────────────────────────────────────────────

const parser = StructuredOutputParser.fromZodSchema(credentialReviewOutputSchema);

export function buildCredentialReviewChain() {
  const model = getChatModel();
  return RunnableSequence.from([
    credentialReviewPrompt,
    model,
    parser,
  ]);
}

/**
 * Run AI credential review.
 * Returns null if the API key is missing or the call fails.
 */
export async function runCredentialReview(
  input: CredentialReviewInput,
): Promise<AICredentialReviewOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const chain = buildCredentialReviewChain();
    const result = await chain.invoke({
      credentialType: input.credentialType,
      staffId: input.staffId,
      staffName: input.staffName,
      issuedAt: input.issuedAt.toISOString(),
      expiresAt: input.expiresAt?.toISOString() ?? "none",
      staffRole: input.staffRole,
      staffDepartment: input.staffDepartment,
      previousCredentials: JSON.stringify(input.previousCredentials),
    });
    return result;
  } catch (err) {
    console.error("LangChain credential review failed:", err);
    return null;
  }
}
