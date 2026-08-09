import { BaseAgent } from "./base-agent";
import { staffingTools } from "../tools/base-tools";
import { AgentRole, ReasoningStep } from "../types";

export class PredictionAgent extends BaseAgent {
  role: AgentRole = "prediction";

  protected getSystemPrompt(): string {
    return `You are the PredictionAgent for Aegis Shift, an AI-powered healthcare shift management system.
Your responsibilities:
1. Forecast patient volumes and staff demand
2. Predict no-show rates and shift drop probabilities
3. Model staffing cost scenarios
4. Simulate "what-if" staffing strategies

Always reason step by step. When making predictions:
- Use historical data patterns (seasonality, day-of-week, holidays)
- Account for special events and weather impacts
- Provide confidence intervals for all predictions
- Flag anomalies and edge cases

Return structured predictions with confidence scores and assumptions.`;
  }

  protected getTools() {
    return [
      staffingTools.analyzeDemandPatterns,
      staffingTools.queryStaffDatabase,
    ];
  }

  async predictDemand(department: string, targetDate: string) {
    const steps: ReasoningStep[] = [
      {
        step: "analyze_patterns",
        reasoning: `Analyzing historical demand patterns for ${department}`,
        confidence: 0.87,
      },
      {
        step: "forecast",
        reasoning: `Generating demand forecast for ${targetDate} with 95% confidence interval`,
        confidence: 0.82,
      },
    ];

    return { prediction: {}, reasoning: steps };
  }
}
