import { supabase } from './supabaseClient';

export interface CallsQuery {
  limit?: number;
  offset?: number;
  sdrId?: string;
  status?: string;
  callType?: string;
  start?: string; // ISO
  end?: string;   // ISO
}

export interface UiCallItem {
  id: string;
  company?: string | null;
  deal_id?: string | null;
  sdr_id?: string | null;
  status: string;
  duration: number;
  call_type?: string | null;
  created_at: string;
}

export async function fetchCalls(query: CallsQuery): Promise<{ items: UiCallItem[]; total: number }> {
  if (!supabase) return { items: [], total: 0 };
  const { limit = 50, offset = 0, sdrId, status, callType, start, end } = query;
  const { data, error } = await supabase.rpc('get_calls_v2', {
    p_limit: limit,
    p_offset: offset,
    p_sdr_id: sdrId ?? null,
    p_status: status ?? null,
    p_call_type: callType ?? null,
    p_start: start ?? null,
    p_end: end ?? null,
  });
  if (error) throw error;
  const items: UiCallItem[] = (data || []).map((r: any) => ({
    id: r.id,
    company: r.company,
    deal_id: r.deal_id,
    sdr_id: r.sdr_id,
    status: r.status,
    duration: r.duration,
    call_type: r.call_type,
    created_at: r.created_at,
  }));
  const total = items.length > 0 ? (data[0]?.total_count ?? items.length) : 0;
  return { items, total };
}

export async function fetchCallDetails(callId: string) {
  if (!supabase) return null;
  // Tenta RPC otimizada primeiro
  try {
    const { data } = await supabase.rpc('get_call_details', { p_call_id: callId });
    if (data && data[0]) return data[0];
  } catch (e) {
    // continua com fallback
  }
  // Fallback: busca direta na tabela (garante funcionamento mesmo sem a RPC)
  const { data: row, error: err } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();
  if (err) throw err;
  return row ?? null;
}

export interface CallsMetrics {
  totalCalls: number;
  answeredCalls: number;
  avgDurationSec: number;
  avgScore?: number | null;
}

// Placeholder para, no futuro, trocar por uma RPC específica de métricas.
export function computeMetricsClientSide(items: UiCallItem[]): CallsMetrics {
  const totalCalls = items.length;
  const answeredCalls = items.filter((c: any) => c.status !== 'missed').length;
  const avgDurationSec = items.reduce((a: number, c: any) => a + (c.duration ?? 0), 0) / (totalCalls || 1);
  return { totalCalls, answeredCalls, avgDurationSec, avgScore: null };
}

// ---- Scorecard API (CRUD mínimo) ----
export async function listScorecards() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('scorecards').select('*').order('updated_at', { ascending: false });
  if (error) throw error; return data || [];
}

export async function listCriteria(scorecardId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('scorecard_criteria').select('*').eq('scorecard_id', scorecardId).order('order_index');
  if (error) throw error; return data || [];
}

export async function upsertCriterion(row: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('scorecard_criteria').upsert(row).select('*').single();
  if (error) throw error; return data;
}

export async function upsertScorecard(row: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('scorecards').upsert(row).select('*').single();
  if (error) throw error; return data;
}

// ---- Comentários de call ----
export async function listCallComments(callId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('call_comments').select('*').eq('call_id', callId).order('created_at', { ascending: true });
  if (error) throw error; return data || [];
}

export async function addCallComment(callId: string, text: string, atSeconds: number = 0, author?: { id: string; name: string }) {
  if (!supabase) return null;
  let authorId = author?.id || null;
  let authorName = author?.name || null;
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      authorId = data.user.id;
      authorName = data.user.user_metadata?.full_name || data.user.email || authorName;
    }
  } catch {}
  const row = { call_id: callId, text, at_seconds: atSeconds, author_id: authorId, author_name: authorName };
  const { data: inserted, error } = await supabase.from('call_comments').insert(row).select('*').single();
  if (error) throw error; return inserted;
}

// ---- Scores por critério ----
export async function listCallScores(callId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('call_scores')
    .select('*, scorecard_criteria!inner(id,category,text,weight)')
    .eq('call_id', callId)
    .order('created_at', { ascending: true });
  if (error) throw error; return data || [];
}




