import type { StoredKnowledgeDocument } from '../types';
import * as SupabaseService from './supabaseService';

type LocalDoc = StoredKnowledgeDocument & {
  __localId?: string;
  __synced?: boolean;
  __remoteId?: string;
};

const DOCS_KEY = 'ggv_kb_docs_v1';
const QUEUE_KEY = 'ggv_kb_queue_v1';

const safeLoad = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeSave = (key: string, value: any) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const getLocalDocuments = (): LocalDoc[] => {
  return safeLoad<LocalDoc[]>(DOCS_KEY, []);
};

export const addLocalDocument = (doc: Omit<StoredKnowledgeDocument, 'id' | 'created_at'>): LocalDoc => {
  const docs = getLocalDocuments();
  const local: LocalDoc = {
    ...(doc as any),
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    __localId: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    __synced: false,
  } as any;
  docs.unshift(local);
  safeSave(DOCS_KEY, docs);

  // enfileirar
  const queue = safeLoad<LocalDoc[]>(QUEUE_KEY, []);
  queue.push(local);
  safeSave(QUEUE_KEY, queue);
  return local;
};

export const syncQueuedDocuments = async (): Promise<{ saved: number; remaining: number; }> => {
  const queue = safeLoad<LocalDoc[]>(QUEUE_KEY, []);
  if (queue.length === 0) return { saved: 0, remaining: 0 };

  let saved = 0;
  const remaining: LocalDoc[] = [];

  for (const item of queue) {
    try {
      // tenta salvar no supabase (sem timeout artificial)
      const remote = await SupabaseService.addKnowledgeDocument({
        user_id: (item as any).user_id,
        name: item.name,
        content: item.content,
        embedding: item.embedding,
      } as any);

      // marcar como sincronizado no DOCS_KEY
      const docs = getLocalDocuments();
      const idx = docs.findIndex(d => (d.__localId && d.__localId === item.__localId) || d.id === item.id);
      if (idx >= 0) {
        (docs[idx] as any).__synced = true;
        (docs[idx] as any).__remoteId = remote.id;
        // opcionalmente, substituir id pelo id remoto
        (docs[idx] as any).id = remote.id;
        safeSave(DOCS_KEY, docs);
      }
      saved += 1;
    } catch (e) {
      // manter na fila
      remaining.push(item);
    }
  }

  safeSave(QUEUE_KEY, remaining);
  return { saved, remaining: remaining.length };
};


