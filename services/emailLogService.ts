import { supabase } from './supabaseClient';

// 📧 SISTEMA DE LOGS DE E-MAIL - DIAGNÓSTICO GGV
// Serviço completo para rastrear envios de e-mail

export interface EmailLogData {
  // Identificação
  dealId: string;
  companyName?: string;
  userEmail?: string;
  
  // Dados do e-mail
  recipientEmail: string;
  subject?: string;
  emailType?: 'diagnostic_report' | 'reminder' | 'follow_up' | 'other';
  
  // Status
  status: 'pending' | 'sending' | 'success' | 'failed' | 'retry';
  attempts?: number;
  maxAttempts?: number;
  
  // Detalhes técnicos
  gmailMessageId?: string;
  gmailThreadId?: string;
  tokenSource?: 'supabase' | 'oauth' | 'manual';
  clientIdUsed?: string;
  
  // Erro
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: any;
  
  // Metadados
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  
  // Timestamps
  firstAttemptAt?: Date;
  lastAttemptAt?: Date;
  successAt?: Date;
  
  // Dados do relatório
  reportToken?: string;
  reportUrl?: string;
  reportSize?: number;
  
  // Configurações
  retryDelays?: number[];
  timeoutSeconds?: number;
  
  // Dados adicionais
  metadata?: Record<string, any>;
}

export interface EmailLogStats {
  date: string;
  totalEmails: number;
  successfulEmails: number;
  failedEmails: number;
  pendingEmails: number;
  successRatePercent: number;
  avgAttempts: number;
  maxAttemptsUsed: number;
}

export interface EmailLogError {
  errorCode: string;
  errorMessage: string;
  errorCount: number;
  lastOccurrence: string;
  affectedEmails: string[];
}

/**
 * 📝 Criar novo log de e-mail
 */
export async function createEmailLog(data: EmailLogData): Promise<string> {
  try {
    console.log('📧 EMAIL_LOG - Criando novo log de e-mail...', {
      dealId: data.dealId,
      recipient: data.recipientEmail,
      status: data.status
    });

    const logData = {
      deal_id: data.dealId,
      company_name: data.companyName,
      user_email: data.userEmail,
      recipient_email: data.recipientEmail,
      subject: data.subject,
      email_type: data.emailType || 'diagnostic_report',
      status: data.status,
      attempts: data.attempts || 0,
      max_attempts: data.maxAttempts || 3,
      gmail_message_id: data.gmailMessageId,
      gmail_thread_id: data.gmailThreadId,
      token_source: data.tokenSource,
      client_id_used: data.clientIdUsed,
      error_message: data.errorMessage,
      error_code: data.errorCode,
      error_details: data.errorDetails,
      user_agent: data.userAgent || navigator.userAgent,
      ip_address: data.ipAddress,
      session_id: data.sessionId,
      first_attempt_at: data.firstAttemptAt?.toISOString(),
      last_attempt_at: data.lastAttemptAt?.toISOString(),
      success_at: data.successAt?.toISOString(),
      report_token: data.reportToken,
      report_url: data.reportUrl,
      report_size: data.reportSize,
      retry_delays: data.retryDelays,
      timeout_seconds: data.timeoutSeconds || 30,
      metadata: data.metadata || {}
    };

    const { data: result, error } = await supabase
      .from('email_logs')
      .insert([logData])
      .select('id')
      .single();

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao criar log:', error);
      throw new Error(`Falha ao criar log de e-mail: ${error.message}`);
    }

    console.log('✅ EMAIL_LOG - Log criado com sucesso:', result.id);
    return result.id;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 🔄 Atualizar log de e-mail existente
 */
export async function updateEmailLog(
  logId: string, 
  updates: Partial<EmailLogData>
): Promise<void> {
  try {
    console.log('📧 EMAIL_LOG - Atualizando log:', logId, updates);

    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.attempts !== undefined) updateData.attempts = updates.attempts;
    if (updates.gmailMessageId) updateData.gmail_message_id = updates.gmailMessageId;
    if (updates.gmailThreadId) updateData.gmail_thread_id = updates.gmailThreadId;
    if (updates.errorMessage) updateData.error_message = updates.errorMessage;
    if (updates.errorCode) updateData.error_code = updates.errorCode;
    if (updates.errorDetails) updateData.error_details = updates.errorDetails;
    if (updates.lastAttemptAt) updateData.last_attempt_at = updates.lastAttemptAt.toISOString();
    if (updates.successAt) updateData.success_at = updates.successAt.toISOString();
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { error } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao atualizar log:', error);
      throw new Error(`Falha ao atualizar log: ${error.message}`);
    }

    console.log('✅ EMAIL_LOG - Log atualizado com sucesso');

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 📊 Buscar logs de e-mail por deal
 */
export async function getEmailLogsByDeal(dealId: string): Promise<EmailLogData[]> {
  try {
    console.log('📧 EMAIL_LOG - Buscando logs para deal:', dealId);

    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao buscar logs:', error);
      throw new Error(`Falha ao buscar logs: ${error.message}`);
    }

    const logs: EmailLogData[] = (data || []).map(row => ({
      dealId: row.deal_id,
      companyName: row.company_name,
      userEmail: row.user_email,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      emailType: row.email_type,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      gmailMessageId: row.gmail_message_id,
      gmailThreadId: row.gmail_thread_id,
      tokenSource: row.token_source,
      clientIdUsed: row.client_id_used,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      errorDetails: row.error_details,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      sessionId: row.session_id,
      firstAttemptAt: row.first_attempt_at ? new Date(row.first_attempt_at) : undefined,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
      successAt: row.success_at ? new Date(row.success_at) : undefined,
      reportToken: row.report_token,
      reportUrl: row.report_url,
      reportSize: row.report_size,
      retryDelays: row.retry_delays,
      timeoutSeconds: row.timeout_seconds,
      metadata: row.metadata
    }));

    console.log('✅ EMAIL_LOG - Logs encontrados:', logs.length);
    return logs;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 📈 Buscar estatísticas de e-mail
 */
export async function getEmailLogStats(days: number = 30): Promise<EmailLogStats[]> {
  try {
    console.log('📧 EMAIL_LOG - Buscando estatísticas dos últimos', days, 'dias');

    const { data, error } = await supabase
      .from('email_logs_stats')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao buscar estatísticas:', error);
      throw new Error(`Falha ao buscar estatísticas: ${error.message}`);
    }

    const stats: EmailLogStats[] = (data || []).map(row => ({
      date: row.date,
      totalEmails: row.total_emails,
      successfulEmails: row.successful_emails,
      failedEmails: row.failed_emails,
      pendingEmails: row.pending_emails,
      successRatePercent: row.success_rate_percent,
      avgAttempts: row.avg_attempts,
      maxAttemptsUsed: row.max_attempts_used
    }));

    console.log('✅ EMAIL_LOG - Estatísticas encontradas:', stats.length);
    return stats;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 🚨 Buscar erros de e-mail
 */
export async function getEmailLogErrors(): Promise<EmailLogError[]> {
  try {
    console.log('📧 EMAIL_LOG - Buscando erros de e-mail...');

    const { data, error } = await supabase
      .from('email_logs_errors')
      .select('*')
      .order('error_count', { ascending: false });

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao buscar erros:', error);
      throw new Error(`Falha ao buscar erros: ${error.message}`);
    }

    const errors: EmailLogError[] = (data || []).map(row => ({
      errorCode: row.error_code,
      errorMessage: row.error_message,
      errorCount: row.error_count,
      lastOccurrence: row.last_occurrence,
      affectedEmails: row.affected_emails
    }));

    console.log('✅ EMAIL_LOG - Erros encontrados:', errors.length);
    return errors;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 🔍 Buscar logs recentes
 */
export async function getRecentEmailLogs(limit: number = 50): Promise<EmailLogData[]> {
  try {
    console.log('📧 EMAIL_LOG - Buscando logs recentes (limite:', limit, ')');

    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao buscar logs recentes:', error);
      throw new Error(`Falha ao buscar logs recentes: ${error.message}`);
    }

    const logs: EmailLogData[] = (data || []).map(row => ({
      dealId: row.deal_id,
      companyName: row.company_name,
      userEmail: row.user_email,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      emailType: row.email_type,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      gmailMessageId: row.gmail_message_id,
      gmailThreadId: row.gmail_thread_id,
      tokenSource: row.token_source,
      clientIdUsed: row.client_id_used,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      errorDetails: row.error_details,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      sessionId: row.session_id,
      firstAttemptAt: row.first_attempt_at ? new Date(row.first_attempt_at) : undefined,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
      successAt: row.success_at ? new Date(row.success_at) : undefined,
      reportToken: row.report_token,
      reportUrl: row.report_url,
      reportSize: row.report_size,
      retryDelays: row.retry_delays,
      timeoutSeconds: row.timeout_seconds,
      metadata: row.metadata
    }));

    console.log('✅ EMAIL_LOG - Logs recentes encontrados:', logs.length);
    return logs;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 🧹 Limpar logs antigos (manter apenas últimos 90 dias)
 */
export async function cleanupOldEmailLogs(): Promise<number> {
  try {
    console.log('📧 EMAIL_LOG - Iniciando limpeza de logs antigos...');

    const { data, error } = await supabase.rpc('cleanup_old_email_logs');

    if (error) {
      console.error('❌ EMAIL_LOG - Erro ao limpar logs:', error);
      throw new Error(`Falha ao limpar logs: ${error.message}`);
    }

    const deletedCount = data || 0;
    console.log('✅ EMAIL_LOG - Logs antigos removidos:', deletedCount);
    return deletedCount;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}

/**
 * 📊 Obter resumo de logs por deal
 */
export async function getEmailLogSummary(dealId: string): Promise<{
  totalAttempts: number;
  successfulEmails: number;
  failedEmails: number;
  lastAttempt?: Date;
  lastSuccess?: Date;
  lastError?: string;
}> {
  try {
    console.log('📧 EMAIL_LOG - Gerando resumo para deal:', dealId);

    const logs = await getEmailLogsByDeal(dealId);
    
    const summary = {
      totalAttempts: logs.reduce((sum, log) => sum + (log.attempts || 0), 0),
      successfulEmails: logs.filter(log => log.status === 'success').length,
      failedEmails: logs.filter(log => log.status === 'failed').length,
      lastAttempt: logs.length > 0 ? logs[0].lastAttemptAt : undefined,
      lastSuccess: logs.find(log => log.status === 'success')?.successAt,
      lastError: logs.find(log => log.status === 'failed')?.errorMessage
    };

    console.log('✅ EMAIL_LOG - Resumo gerado:', summary);
    return summary;

  } catch (error) {
    console.error('❌ EMAIL_LOG - Erro inesperado:', error);
    throw error;
  }
}
