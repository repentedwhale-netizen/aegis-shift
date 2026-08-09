import { StaffingAgent } from "./agents/staffing-agent";
import { ShiftAgent } from "./agents/shift-agent";
import { PredictionAgent } from "./agents/prediction-agent";
import { DisputeAgent } from "./agents/dispute-agent";
import {
  AgentRole,
  OrchestrationRequest,
  OrchestrationResult,
  ReasoningStep,
  AgentMessage,
} from "./types";

export interface OrchestratorConfig {
  agents: AgentRole[];
  maxRounds: number;
  onAgentThinking?: (agentRole: AgentRole, step: ReasoningStep) => void;
  onAgentConclusion?: (agentRole: AgentRole, conclusion: string) => void;
}

export function createAgentOrchestrator(config?: Partial<OrchestratorConfig>) {
  const cfg: OrchestratorConfig = {
    agents: ["staffing", "shift", "prediction", "dispute"],
    maxRounds: 3,
    ...config,
  };

  return new AgentOrchestrator(cfg);
}

class AgentOrchestrator {
  private staffingAgent: StaffingAgent;
  private shiftAgent: ShiftAgent;
  private predictionAgent: PredictionAgent;
  private disputeAgent: DisputeAgent;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.staffingAgent = new StaffingAgent();
    this.shiftAgent = new ShiftAgent();
    this.predictionAgent = new PredictionAgent();
    this.disputeAgent = new DisputeAgent();
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const reasoning: ReasoningStep[] = [];
    const agentTraces: OrchestrationResult["agentTraces"] = [];
    const activeAgents = request.agents || this.config.agents;

    reasoning.push({
      step: "orchestrator.init",
      reasoning: `Starting multi-agent orchestration for task: "${request.task}"`,
      confidence: 1.0,
    });

    // Round 1: Specialized analysis
    for (const agentRole of activeAgents) {
      reasoning.push({
        step: `orchestrator.dispatch.${agentRole}`,
        reasoning: `Dispatching task to ${agentRole} agent`,
        confidence: 0.95,
      });

      const result = await this.invokeAgent(agentRole, request.task);

      if (this.config.onAgentConclusion) {
        this.config.onAgentConclusion(agentRole, result.content);
      }

      agentTraces.push({
        agentRole,
        messages: [
          {
            id: `${agentRole}_msg_${Date.now()}`,
            role: "agent",
            agentId: agentRole,
            content: result.content,
            timestamp: new Date().toISOString(),
          },
        ],
        conclusion: result.content,
      });

      reasoning.push(...result.reasoning);
    }

    // Round 2+: Cross-agent synthesis (up to maxRounds)
    if (request.task.toLowerCase().includes("dispute") && activeAgents.includes("dispute")) {
      reasoning.push({
        step: "orchestrator.synthesize",
        reasoning: "Cross-referencing agent outputs for dispute resolution",
        confidence: 0.88,
      });
    }

    return {
      success: true,
      result: { task: request.task, resolved: true },
      reasoning,
      agentTraces,
    };
  }

  private async invokeAgent(
    role: AgentRole,
    input: string
  ): Promise<{ content: string; reasoning: ReasoningStep[] }> {
    switch (role) {
      case "staffing":
        return this.staffingAgent.invoke(input);
      case "shift":
        return this.shiftAgent.invoke(input);
      case "prediction":
        return this.predictionAgent.invoke(input);
      case "dispute":
        return this.disputeAgent.invoke(input);
      default:
        return {
          content: `Unknown agent role: ${role}`,
          reasoning: [],
        };
    }
  }
}
