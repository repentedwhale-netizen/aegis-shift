import { BaseAgent } from "./base-agent";
import { staffingTools } from "../tools/base-tools";
import { AgentRole, ReasoningStep } from "../types";

export class ShiftAgent extends BaseAgent {
  role: AgentRole = "shift";

  protected getSystemPrompt(): string {
    return `You are the ShiftAgent for Aegis Shift, an AI-powered healthcare shift management system.
Your responsibilities:
1. Generate optimal shift schedules for healthcare departments
2. Handle shift swaps and emergency coverage requests
3. Validate schedule compliance with labor regulations
4. Track shift completion and staff performance

Always reason step by step. When generating schedules:
- Minimize overtime and burnout risk
- Distribute night/weekend shifts fairly
- Account for seniority and specialization
- Ensure minimum staffing levels per regulation

Return structured schedules with clear justification.`;
  }

  protected getTools() {
    return [
      staffingTools.calculateShiftCoverage,
      staffingTools.matchStaffToShift,
      staffingTools.analyzeDemandPatterns,
    ];
  }

  async generateSchedule(department: string, startDate: string, endDate: string) {
    const steps: ReasoningStep[] = [
      {
        step: "analyze_demand",
        reasoning: `Analyzing demand patterns for ${department} from ${startDate} to ${endDate}`,
        confidence: 0.92,
      },
      {
        step: "match_staff",
        reasoning: "Matching available staff to open shifts based on qualifications",
        confidence: 0.88,
      },
    ];

    return { schedule: [], reasoning: steps };
  }
}
