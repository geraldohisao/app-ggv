export type GenParams = {
  prompt: string;
  responseMimeType?: string; // 'application/json'
  responseSchema?: any;      // optional validation schema (zod or json-schema-like)
  temperature?: number;
  maxOutputTokens?: number;
};

export type GenResult = {
  ok: boolean;
  model: string;
  provider: 'gemini' | 'deepseek';
  rawText?: string;
  json?: any;
  usage?: { inputTokens?: number; outputTokens?: number; costUSD?: number };
  error?: { code?: string; message: string; retriable?: boolean };
};

export interface LLMProvider {
  name(): 'gemini' | 'deepseek';
  generate(params: GenParams): Promise<GenResult>;
  healthy?(): Promise<boolean>;
}


