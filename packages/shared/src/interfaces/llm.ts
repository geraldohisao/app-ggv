export type Insights = {
  summary: string;
  painPoints: string[];
  objections: string[];
  nextActions: Array<{ title: string; dueDate?: string; owner?: string }>;
  tags: string[];
};

export type ScorecardItem = { key: string; weight: number; score: number };
export type Scorecard = { items: ScorecardItem[]; totalScore: number; templateKey: string };

export interface LLM {
  extractInsights(input: { transcript: string; locale: string }): Promise<Insights>;
  scorecall(input: { transcript: string; template: any; locale: string }): Promise<Scorecard>;
  crmFields(input: { transcript: string; insights: Insights; locale: string }): Promise<{ noteTitle: string; noteMarkdown: string; nextActivity?: any }>;
}
