import { BaseAgent } from "./base-agent";
import { staffingTools } from "../tools/base-tools";
import { AgentRole, ReasoningStep } from "../types";

export class StaffingAgent extends BaseAgent {
  role: AgentRole = "staffing";

  protected getSystemPrompt(): string {
    return `You are the StaffingAgent for Aegis Shift, an AI-powered healthcare shift management system.
Your responsibilities:
1. Analyze staff availability, qualifications, and preferences
2. Optimize shift assignments across departments
3. Detect coverage gaps and flag staffing shortages
4. Propose equitable shift distributions

Always reason step by step. When matching staff to shifts, consider:
- Required qualifications and certifications
- Staff preferences and work-life balance
- Regulatory compliance (max hours, mandatory breaks)
- Historical performance and reliability

Return structured results with clear reasoning.`;
  }

  protected getTools() {
    return [
      staffingTools.queryStaffDatabase,
      staffingTools.calculateShiftCoverage,
      staffingTools.matchStaffToShift,
    ];
  }

  async analyze(staffRequest: {
    department: string;
    timeframe: { start: string; end: string };
    requirements: string[];
  }): Promise<{ coverage: unknown; recommendations: string[]; reasoning: ReasoningStep[] }> {
    const steps: ReasoningStep[] = [
      {
        step: "query_staff",
        reasoning: `Querying staff database for ${staffRequest.department} department`,
        confidence: 0.9,
      },
      {
        step: "calculate_coverage",
        reasoning: `Calculating shift coverage for ${staffRequest.timeframe.start} to ${staffRequest.timeframe.end}`,
        confidence: 0.95,
      },
    ];

    return {
      coverage: {},
      recommendations: [],
      reasoning: steps,
    };
  }
}
