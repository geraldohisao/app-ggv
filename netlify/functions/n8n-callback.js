// Netlify Function para receber callbacks do N8N
// URL: https://app.grupoggv.com/.netlify/functions/n8n-callback

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  // Apenas aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('🔔 N8N CALLBACK - Recebendo webhook:', event.body);

    // Parse do body
    const body = JSON.parse(event.body || '{}');
    const { workflowId, executionId, status, message, data, timestamp } = body;

    // Validação básica
    if (!workflowId || !status) {
      console.error('❌ N8N CALLBACK - Dados obrigatórios ausentes:', { workflowId, status });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing workflowId or status',
          received: { workflowId, status }
        })
      };
    }

    // Verificar configuração do Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ N8N CALLBACK - Configuração Supabase ausente');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Supabase configuration missing',
          config: { 
            hasUrl: !!SUPABASE_URL, 
            hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY 
          }
        })
      };
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    console.log('✅ N8N CALLBACK - Processando:', { workflowId, status, message });

    // Atualizar registro no banco
    const { data: updatedRecord, error } = await supabase
      .from('automation_history')
      .update({
        status: status,
        error_message: status === 'failed' ? message : null,
        n8n_response: {
          status: status,
          message: message,
          data: data,
          executionId: executionId,
          webhookReceived: true,
          webhookTime: timestamp || new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${workflowId},n8n_response->>workflowId.eq.${workflowId},n8n_response->>runId.eq.${workflowId}`)
      .select()
      .single();

    if (error) {
      console.error('❌ N8N CALLBACK - Erro ao atualizar registro:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to update record', 
          details: error.message,
          workflowId: workflowId
        })
      };
    }

    console.log('✅ N8N CALLBACK - Registro atualizado:', updatedRecord?.id || 'N/A');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Callback processed successfully',
        workflowId: workflowId,
        status: status,
        updatedRecord: updatedRecord ? {
          id: updatedRecord.id,
          status: updatedRecord.status,
          updated_at: updatedRecord.updated_at
        } : null
      })
    };

  } catch (error) {
    console.error('❌ N8N CALLBACK - Erro no processamento:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
