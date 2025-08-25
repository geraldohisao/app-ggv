export type RAGDefaults = {
  maxDocs: number;
  maxCharsPerDoc: number;
  minScore: number;
  topKDocs: number;
  topKOverview: number;
  dedupeBy: string; // pipe-separated: 'id|name|title'
};

export const RAG_DEFAULTS: RAGDefaults = {
  maxDocs: 3,
  maxCharsPerDoc: 600,
  // Reduzido para aumentar recall de respostas simples presentes no banco
  minScore: 0.12,
  topKDocs: 4,
  topKOverview: 2,
  dedupeBy: 'id|name|title',
};


