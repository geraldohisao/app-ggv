// Netlify Function: Recebe webhook do N8N quando reativação de leads é concluída
// URL: https://app.grupoggv.com/.netlify/functions/reativacao-webhook
// N8N deve chamar este endpoint após processar leads

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
  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  }

  // Apenas aceitar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Verificar configuração
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase configuration missing' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
    auth: { persistSession: false } 
  });

  try {
    console.log('🔔 REATIVACAO WEBHOOK - Recebendo do N8N:', event.body);

    // Parse do body (pode ser array ou objeto)
    let body = JSON.parse(event.body || '{}');
    
    // Se recebeu array, pegar primeiro item
    if (Array.isArray(body) && body.length > 0) {
      console.log('📊 REATIVACAO WEBHOOK - N8N retornou array, usando primeiro item');
      body = body[0];
    }

    const {
      workflowId = 'Reativação de Leads',
      status,
      message,
      leadsProcessed,
      sdr,
      filtro,
      cadencia
    } = body;

    console.log('✅ REATIVACAO WEBHOOK - Dados extraídos:', {
      workflowId,
      status,
      message,
      leadsProcessed,
      sdr
    });

    // Validação básica
    if (!status) {
      return { 
        statusCode: 400, 
        headers: corsHeaders, 
        body: JSON.stringify({ error: 'Status é obrigatório' }) 
      };
    }

    // Preparar dados para salvar
    const n8nResponseData = {
      workflowId,
      status,
      message: message || `${leadsProcessed || 0} lead(s) processados`,
      leadsProcessed: leadsProcessed || 0,
      webhookReceived: true,
      webhookTime: new Date().toISOString(),
      real: true,
      source: 'n8n_reactivacao_webhook'
    };

    // Determinar status mapeado
    let mappedStatus = 'processing';
    if (status === 'completed' || status === 'success') {
      mappedStatus = 'completed';
    } else if (status === 'failed' || status === 'error') {
      mappedStatus = 'failed';
    }

    console.log('🔄 REATIVACAO WEBHOOK - Atualizando tabela reactivated_leads...');

    // Estratégia 1: Atualizar por workflow_id
    let { data: updatedRecord, error: updateError } = await supabase
      .from('reactivated_leads')
      .update({
        status: mappedStatus,
        count_leads: leadsProcessed || 0,
        workflow_id: workflowId,
        execution_id: `webhook_${Date.now()}`,
        n8n_data: n8nResponseData,
        error_message: status === 'failed' ? message : null,
        updated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    // Estratégia 2: Se não encontrou por workflow_id, tentar pelo registro mais recente pendente
    if (!updatedRecord && !updateError) {
      console.log('🔄 REATIVACAO WEBHOOK - Tentando atualizar registro pendente mais recente...');
      
      ({ data: updatedRecord, error: updateError } = await supabase
        .from('reactivated_leads')
        .update({
          status: mappedStatus,
          count_leads: leadsProcessed || 0,
          workflow_id: workflowId,
          execution_id: `webhook_${Date.now()}`,
          n8n_data: n8nResponseData,
          error_message: status === 'failed' ? message : null,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Últimos 30 minutos
        .order('created_at', { ascending: false })
        .limit(1)
        .select()
        .maybeSingle());
    }

    // Estratégia 3: Se ainda não encontrou e temos SDR, tentar por SDR
    if (!updatedRecord && !updateError && sdr) {
      console.log('🔄 REATIVACAO WEBHOOK - Tentando atualizar por SDR:', sdr);
      
      ({ data: updatedRecord, error: updateError } = await supabase
        .from('reactivated_leads')
        .update({
          status: mappedStatus,
          count_leads: leadsProcessed || 0,
          workflow_id: workflowId,
          execution_id: `webhook_${Date.now()}`,
          n8n_data: n8nResponseData,
          error_message: status === 'failed' ? message : null,
          updated_at: new Date().toISOString()
        })
        .eq('sdr', sdr)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .select()
        .maybeSingle());
    }

    if (updateError) {
      console.error('❌ REATIVACAO WEBHOOK - Erro ao atualizar:', updateError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Erro ao atualizar registro', details: updateError.message })
      };
    }

    if (updatedRecord) {
      console.log('✅ REATIVACAO WEBHOOK - Registro atualizado:', {
        id: updatedRecord.id,
        sdr: updatedRecord.sdr,
        status: mappedStatus,
        count_leads: leadsProcessed || 0
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          message: 'Registro atualizado com sucesso',
          recordId: updatedRecord.id,
          sdr: updatedRecord.sdr,
          status: mappedStatus,
          leadsProcessed: leadsProcessed || 0
        })
      };
    } else {
      console.warn('⚠️ REATIVACAO WEBHOOK - Nenhum registro encontrado para atualizar');
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Nenhum registro pendente encontrado',
          searchCriteria: { workflowId, sdr, status: 'pending' }
        })
      };
    }

  } catch (error) {
    console.error('❌ REATIVACAO WEBHOOK - Erro:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      })
    };
  }
};
