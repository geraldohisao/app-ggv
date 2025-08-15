export interface PersonaPolicy {
  id: 'SDR' | 'Closer' | 'Gestor';
  tone: string;
  traits: string[];
  wordLimit: number;
  allowedTopics?: string[];
  forbiddenTopics?: string[];
  styleRules?: string[];
}


