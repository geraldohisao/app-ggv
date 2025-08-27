/**
 * Sistema de notificações unificado
 * Envia alertas para múltiplos canais (Google Chat e Slack)
 */

export interface NotificationPayload {
  title: string;
  message: string;
  context?: {
    user?: {
      name?: string;
      email?: string;
      role?: string;
    };
    url?: string;
    stack?: string;
    componentStack?: string;
    userAgent?: string;
    appVersion?: string;
    tags?: string[];
    status?: number;
    method?: string;
    responsePreview?: string;
    errorName?: string;
    [key: string]: any;
  };
  incidentHash?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
}

/**
 * Envia notificação para Google Chat (função existente)
 */
async function sendToGoogleChat(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    let endpoint = '/.netlify/functions/alert';
    
    if (isLocalhost && typeof window !== 'undefined' && window.location.port !== '8888') {
      endpoint = 'http://localhost:8888/.netlify/functions/alert';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      channel: 'google-chat'
    };
  } catch (error) {
    return {
      success: false,
      channel: 'google-chat',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Envia notificação para Slack
 */
async function sendToSlack(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    let endpoint = '/.netlify/functions/slack-alert';
    
    if (isLocalhost && typeof window !== 'undefined' && window.location.port !== '8888') {
      endpoint = 'http://localhost:8888/.netlify/functions/slack-alert';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      channel: 'slack'
    };
  } catch (error) {
    return {
      success: false,
      channel: 'slack',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Envia notificação para todos os canais configurados
 */
export async function sendNotifications(
  payload: NotificationPayload,
  channels: ('google-chat' | 'slack')[] = ['google-chat', 'slack']
): Promise<NotificationResult[]> {
  const promises: Promise<NotificationResult>[] = [];

  if (channels.includes('google-chat')) {
    promises.push(sendToGoogleChat(payload));
  }

  if (channels.includes('slack')) {
    promises.push(sendToSlack(payload));
  }

  // Envia para todos os canais em paralelo
  const results = await Promise.allSettled(promises);
  
  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : { success: false, channel: 'unknown', error: 'Promise rejected' }
  );
}

/**
 * Função utilitária para enviar alertas críticos
 */
export async function sendCriticalAlert(payload: NotificationPayload): Promise<void> {
  try {
    // Gera hash do incidente se não fornecido
    if (!payload.incidentHash && typeof crypto !== 'undefined') {
      const incidentKey = JSON.stringify({
        title: payload.title,
        message: payload.message,
        url: payload.context?.url,
        stack: String(payload.context?.stack || '').slice(0, 600),
        componentStack: String(payload.context?.componentStack || '').slice(0, 600)
      });
      payload.incidentHash = crypto.randomUUID().slice(0, 12);
    }

    // Envia para ambos os canais
    const results = await sendNotifications(payload);
    
    // Log dos resultados (opcional)
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ Alert sent to ${result.channel}`);
      } else {
        console.error(`❌ Failed to send alert to ${result.channel}:`, result.error);
      }
    });
  } catch (error) {
    console.error('❌ Critical alert sending failed:', error);
  }
}

/**
 * Wrapper para compatibilidade com código existente
 */
export { sendCriticalAlert as postCriticalAlert };