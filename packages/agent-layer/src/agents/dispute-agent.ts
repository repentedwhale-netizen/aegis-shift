import { BaseAgent } from "./base-agent";
import { staffingTools } from "../tools/base-tools";
import { AgentRole, ReasoningStep } from "../types";

export class DisputeAgent extends BaseAgent {
  role: AgentRole = "dispute";

  protected getSystemPrompt(): string {
    return `You are the DisputeAgent for Aegis Shift, an AI-powered healthcare shift management system.
Your responsibilities:
1. Mediate shift assignment disputes between staff
2. Analyze fairness of shift distributions
3. Propose evidence-based resolutions
4. Track dispute patterns to prevent recurrence

Always reason step by step. When resolving disputes:
- Review shift history and distribution fairness
- Consider individual circumstances and documented preferences
- Apply consistent resolution criteria
- Document rationale for auditability

Return structured resolutions with transparent reasoning.`;
  }

  protected getTools() {
    return [
      staffingTools.resolveDispute,
      staffingTools.queryStaffDatabase,
      staffingTools.calculateShiftCoverage,
    ];
  }

  async resolveDispute(dispute: {
    staffId: string;
    shiftId: string;
    complaint: string;
  }) {
    const steps: ReasoningStep[] = [
      {
        step: "review_history",
        reasoning: `Reviewing shift history and distribution for staff ${dispute.staffId}`,
        confidence: 0.94,
      },
      {
        step: "analyze_fairness",
        reasoning: `Analyzing fairness of shift assignment ${dispute.shiftId}`,
        confidence: 0.85,
      },
    ];

    return { resolution: {}, reasoning: steps };
  }
}
