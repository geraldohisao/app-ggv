import { LLM, Insights, Scorecard } from '@calls-mvp/shared';
import { env } from '@calls-mvp/shared';

class StubLLM implements LLM {
  async extractInsights(): Promise<Insights> {
    return { summary: '', painPoints: [], objections: [], nextActions: [], tags: [] };
  }
  async scorecall(): Promise<Scorecard> {
    return { items: [], totalScore: 0, templateKey: 'diagnostico' };
  }
  async crmFields() {
    return { noteTitle: 'Ligação', noteMarkdown: 'Resumo', nextActivity: undefined };
  }
}

export async function createLLM(): Promise<LLM> {
  if (env.providers.openaiKey) {
    return new StubLLM(); // Replace with real OpenAI calls using prompts
  }
  return new StubLLM();
}
