// Netlify Function: Recebe POST quando o fluxo de Reativação for COMPLETADO
// URL: https://app.grupoggv.com/.netlify/functions/reativacao-complete

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase configuration missing' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const body = JSON.parse(event.body || '{}');

    const workflowId = body.workflowId || body.executionId || body.runId;
    const status = body.status || 'completed';
    const leadsProcessed = body.leadsProcessed || body?.data?.leadsProcessed;
    const totalLeads = body.totalLeads || body?.data?.totalLeads;
    const message = body.message || (typeof leadsProcessed === 'number' ? `${leadsProcessed} lead(s) processados` : 'Workflow completed');

    if (!workflowId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'workflowId is required' }) };
    }

    // 1) Tenta atualizar por workflowId conhecido
    const n8n_response = {
      status: 'completed',
      message,
      leadsProcessed: typeof leadsProcessed === 'number' ? leadsProcessed : undefined,
      totalLeads: typeof totalLeads === 'number' ? totalLeads : undefined,
      webhookReceived: true,
      webhookTime: new Date().toISOString(),
      real: true,
    };

    const updateByWorkflow = await supabase
      .from('automation_history')
      .update({ status: 'completed', error_message: null, n8n_response, updated_at: new Date().toISOString() })
      .or(`id.eq.${workflowId},n8n_response->>workflowId.eq.${workflowId},n8n_response->>runId.eq.${workflowId}`)
      .select()
      .limit(1)
      .maybeSingle();

    if (updateByWorkflow.error) {
      console.error('❌ reativacao-complete: erro update por workflowId', updateByWorkflow.error);
    }

    if (updateByWorkflow.data) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, matched: 'workflow', recordId: updateByWorkflow.data.id, message }) };
    }

    // 2) Fallback: pega o registro mais recente em processamento para reativacao_leads
    const latest = await supabase
      .from('automation_history')
      .select('*')
      .eq('automation_type', 'reativacao_leads')
      .in('status', ['started', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest.error) {
      console.error('❌ reativacao-complete: erro buscar latest in-progress', latest.error);
    }

    if (latest.data) {
      const upd = await supabase
        .from('automation_history')
        .update({ status: 'completed', error_message: null, n8n_response: { ...(latest.data.n8n_response || {}), ...n8n_response, workflowId }, updated_at: new Date().toISOString() })
        .eq('id', latest.data.id)
        .select()
        .single();

      if (upd.error) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to update latest record', details: upd.error.message }) };
      }

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, matched: 'latest_in_progress', recordId: upd.data.id, message }) };
    }

    // 3) Se nada encontrado, cria um registro mínimo para manter histórico
    const newRecord = {
      id: `n8n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: null,
      user_email: 'unknown@n8n.callback',
      user_role: 'UNKNOWN',
      automation_type: 'reativacao_leads',
      filtro: 'Desconhecido',
      proprietario: 'Desconhecido',
      cadencia: 'Desconhecida',
      numero_negocio: typeof totalLeads === 'number' ? totalLeads : 0,
      status: 'completed',
      error_message: null,
      n8n_response,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const insert = await supabase.from('automation_history').insert([newRecord]).select().single();
    if (insert.error) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to create record', details: insert.error.message }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, matched: 'created_new', recordId: insert.data.id, message }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error', details: err.message }) };
  }
};


