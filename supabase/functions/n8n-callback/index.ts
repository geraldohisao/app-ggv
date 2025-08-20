// supabase/functions/n8n-callback/index.ts
// Edge Function para receber callbacks do N8N
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface N8nCallbackPayload {
  workflowId: string
  executionId?: string
  status: 'started' | 'completed' | 'failed' | 'cancelled'
  message?: string
  data?: {
    leadsProcessed?: number
    totalLeads?: number
    errors?: string[]
    [key: string]: any
  }
  timestamp?: string
}

interface AutomationRecord {
  id: string
  userId: string
  userEmail: string
  userRole: string
  automationType: string
  filtro: string
  proprietario: string
  cadencia: string
  numeroNegocio: number
  status: 'started' | 'completed' | 'failed' | 'cancelled'
  errorMessage?: string
  n8nResponse: {
    workflowId: string
    executionId?: string
    status: string
    message: string
    progress?: number
    leadsProcessed?: number
    totalLeads?: number
    data?: any
    webhookReceived?: boolean
    webhookTime?: string
    real?: boolean
  }
  createdAt: string
  updatedAt: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse do payload
    const payload: N8nCallbackPayload = await req.json()
    
    console.log('🔔 N8N CALLBACK - Payload recebido:', {
      workflowId: payload.workflowId,
      executionId: payload.executionId,
      status: payload.status,
      message: payload.message?.substring(0, 100) + '...',
      timestamp: payload.timestamp
    })

    // Validar payload obrigatório
    if (!payload.workflowId || !payload.status) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: workflowId and status are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Conectar ao Supabase como service_role para acessar tabela de automação
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // 1. Buscar o registro de automação pelo workflowId
    const { data: automationRecords, error: searchError } = await supabase
      .from('automation_history')
      .select('*')
      .eq('n8n_response->>workflowId', payload.workflowId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (searchError) {
      console.error('❌ N8N CALLBACK - Erro ao buscar registro:', searchError)
      return new Response(
        JSON.stringify({ 
          error: 'Database search error', 
          details: searchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!automationRecords || automationRecords.length === 0) {
      console.warn('⚠️ N8N CALLBACK - Nenhum registro encontrado para workflowId:', payload.workflowId)
      
      // Criar um novo registro se não existir (callback chegou antes do registro)
      const newRecord = {
        id: `n8n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: null, // Será preenchido se possível
        user_email: 'unknown@n8n.callback',
        user_role: 'UNKNOWN',
        automation_type: 'reativacao_leads',
        filtro: 'N8N Callback Only',
        proprietario: 'Unknown',
        cadencia: 'Unknown',
        numero_negocio: payload.data?.totalLeads || 0,
        status: payload.status,
        error_message: payload.status === 'failed' ? payload.message : null,
        n8n_response: {
          workflowId: payload.workflowId,
          executionId: payload.executionId,
          status: payload.status,
          message: payload.message || `Workflow ${payload.status}`,
          leadsProcessed: payload.data?.leadsProcessed || 0,
          totalLeads: payload.data?.totalLeads || 0,
          data: payload.data,
          webhookReceived: true,
          webhookTime: new Date().toISOString(),
          real: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('automation_history')
        .insert([newRecord])

      if (insertError) {
        console.error('❌ N8N CALLBACK - Erro ao criar novo registro:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create new record', 
            details: insertError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ N8N CALLBACK - Novo registro criado:', newRecord.id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'New automation record created from N8N callback',
          recordId: newRecord.id,
          workflowId: payload.workflowId,
          status: payload.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 2. Atualizar o registro existente
    const existingRecord = automationRecords[0]
    const updatedN8nResponse = {
      ...existingRecord.n8n_response,
      status: payload.status,
      message: payload.message || existingRecord.n8n_response.message,
      executionId: payload.executionId || existingRecord.n8n_response.executionId,
      leadsProcessed: payload.data?.leadsProcessed || existingRecord.n8n_response.leadsProcessed,
      totalLeads: payload.data?.totalLeads || existingRecord.n8n_response.totalLeads,
      data: payload.data || existingRecord.n8n_response.data,
      webhookReceived: true,
      webhookTime: new Date().toISOString(),
      real: true
    }

    const { error: updateError } = await supabase
      .from('automation_history')
      .update({
        status: payload.status,
        error_message: payload.status === 'failed' ? payload.message : null,
        n8n_response: updatedN8nResponse,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRecord.id)

    if (updateError) {
      console.error('❌ N8N CALLBACK - Erro ao atualizar registro:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update record', 
          details: updateError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ N8N CALLBACK - Registro atualizado:', {
      id: existingRecord.id,
      workflowId: payload.workflowId,
      oldStatus: existingRecord.status,
      newStatus: payload.status,
      message: payload.message
    })

    // 3. Resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automation status updated successfully',
        recordId: existingRecord.id,
        workflowId: payload.workflowId,
        previousStatus: existingRecord.status,
        newStatus: payload.status,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ N8N CALLBACK - Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
