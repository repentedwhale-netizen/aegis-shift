import { AgentRole, AgentMessage, ReasoningStep } from "../types";

export abstract class BaseAgent {
  abstract role: AgentRole;
  protected conversationHistory: AgentMessage[] = [];

  protected abstract getSystemPrompt(): string;
  protected abstract getTools(): unknown[];

  protected addToHistory(message: AgentMessage): void {
    this.conversationHistory.push(message);
  }

  protected buildReasoningStep(step: string, reasoning: string, confidence: number): ReasoningStep {
    return { step, reasoning, confidence };
  }

  async invoke(input: string): Promise<{ content: string; reasoning: ReasoningStep[] }> {
    const systemPrompt = this.getSystemPrompt();
    const msg: AgentMessage = {
      id: `${this.role}_${Date.now()}`,
      role: "user",
      agentId: this.role,
      content: input,
      timestamp: new Date().toISOString(),
    };
    this.addToHistory(msg);

    return {
      content: `[${this.role}] Processing: ${input}\nSystem prompt: ${systemPrompt.slice(0, 100)}...`,
      reasoning: [
        this.buildReasoningStep("context_load", `Loading context for ${this.role} agent`, 0.99),
        this.buildReasoningStep("analysis", `Analyzing input: "${input.slice(0, 80)}"`, 0.85),
      ],
    };
  }
}
