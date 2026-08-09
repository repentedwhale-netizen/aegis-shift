import { ChatAnthropic } from "@langchain/anthropic";
import { AI_AGENT } from "@aegis-shift/shared";

/**
 * LangChain configuration for Aegis Shift AI pipeline.
 *
 * Creates a ChatAnthropic instance configured for the hackathon's
 * model (claude-3-5-sonnet by default) with low temperature for
 * deterministic, constraint-satisfying shift schedules.
 */

let _model: ChatAnthropic | null = null;

export function getChatModel(): ChatAnthropic {
  if (_model) return _model;

  _model = new ChatAnthropic({
    modelName: AI_AGENT.model,
    maxTokens: AI_AGENT.maxTokens,
    temperature: AI_AGENT.temperature,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    clientOptions: {
      defaultHeaders: {
        "anthropic-beta": "tools-2024-04-04",
      },
    },
  });

  return _model;
}

/**
 * Reset the cached model instance — useful for tests.
 */
export function resetChatModel(): void {
  _model = null;
}
