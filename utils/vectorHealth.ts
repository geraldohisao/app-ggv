import { supabase } from '../services/supabaseClient';

export type VectorHealth = { extversion?: string; docsCount: number; overviewCount: number; explainPlanUsedIvf?: boolean };

export const vectorHealth = async (): Promise<VectorHealth> => {
  const { data: stats, error: statsErr } = await supabase.rpc('vector_health_stats');
  if (statsErr) throw statsErr;

  let extversion: string | undefined;
  let explainPlanUsedIvf: boolean | undefined;

  try {
    const { data } = await supabase.rpc('vector_pgvector_version');
    extversion = (data as any) ?? undefined;
  } catch {}

  try {
    const { data: plan } = await supabase.rpc('vector_health_explain');
    if (typeof plan === 'string') {
      const p = plan.toLowerCase();
      explainPlanUsedIvf = p.includes('ivfflat') || (p.includes('index scan using') && p.includes('ivf'));
    }
  } catch {}

  return {
    docsCount: Number((stats as any)?.docs_count || 0),
    overviewCount: Number((stats as any)?.overview_count || 0),
    extversion,
    explainPlanUsedIvf
  };
};


