// Serviço de e-mail ultra-simples usando EmailJS
// Funciona em qualquer ambiente sem dependências de servidor

declare global {
  interface Window {
    emailjs: any;
  }
}

// Configuração EmailJS (público - pode ser exposto)
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY', // Será configurado via EmailJS
  SERVICE_ID: 'service_ggv_gmail', // ID do serviço
  TEMPLATE_ID: 'template_diagnostico' // ID do template
};

// Inicializar EmailJS
function initEmailJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('EmailJS só funciona no browser'));
      return;
    }

    // Verificar se EmailJS já está carregado
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
      console.log('✅ EmailJS - Inicializado com sucesso');
      resolve();
      return;
    }

    // Aguardar carregamento do script
    const checkEmailJS = () => {
      if (window.emailjs) {
        window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        console.log('✅ EmailJS - Carregado e inicializado');
        resolve();
      } else {
        setTimeout(checkEmailJS, 100);
      }
    };

    checkEmailJS();
  });
}

// Função principal de envio de e-mail
export async function sendEmailSimple({
  to,
  subject,
  html,
  companyName = 'Empresa'
}: {
  to: string;
  subject: string;
  html: string;
  companyName?: string;
}): Promise<boolean> {
  try {
    console.log('📧 EMAILJS - Enviando e-mail para:', to);

    // Inicializar EmailJS
    await initEmailJS();

    // Preparar dados para o template
    const templateParams = {
      to_email: to,
      to_name: companyName,
      subject: subject,
      message: html,
      from_name: 'GGV Inteligência',
      reply_to: 'contato@grupoggv.com'
    };

    console.log('📧 EMAILJS - Enviando com parâmetros:', templateParams);

    // Enviar e-mail
    const response = await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('✅ EMAILJS - E-mail enviado com sucesso:', response);
    return true;

  } catch (error) {
    console.error('❌ EMAILJS - Erro ao enviar:', error);
    throw new Error(`EmailJS error: ${error}`);
  }
}

// Fallback ultra-simples usando mailto (sempre funciona)
export function sendEmailViaMailto({
  to,
  subject,
  body
}: {
  to: string;
  subject: string;
  body: string;
}): void {
  console.log('📧 MAILTO - Abrindo cliente de e-mail padrão...');
  
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Abrir cliente de e-mail
  window.open(mailtoUrl, '_blank');
  
  console.log('✅ MAILTO - Cliente de e-mail aberto');
}

// Função integrada que usa mailto como principal (sempre funciona)
export async function sendEmailReliable({
  to,
  subject,
  html,
  companyName = 'Empresa'
}: {
  to: string;
  subject: string;
  html: string;
  companyName?: string;
}): Promise<boolean> {
  console.log('📧 EMAIL CONFIÁVEL - Iniciando envio para:', to);

  // Usar mailto como método principal (sempre funciona)
  const plainTextBody = html
    .replace(/<[^>]*>/g, '') // Remover HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n') // Remover linhas vazias extras
    .trim();

  const emailBody = `${plainTextBody}

---
📊 Acesse seu relatório completo em: https://app.grupoggv.com

Enviado via GGV Inteligência
https://ggvinteligencia.com.br
contato@grupoggv.com`;

  console.log('📧 MAILTO - Abrindo cliente de e-mail...');
  
  sendEmailViaMailto({
    to,
    subject,
    body: emailBody
  });

  // Tentar EmailJS em background (opcional)
  try {
    if (EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
      console.log('📧 EMAILJS - Tentando envio em background...');
      await sendEmailSimple({ to, subject, html, companyName });
      console.log('✅ EMAILJS - Enviado com sucesso em background');
    }
  } catch (error) {
    console.warn('⚠️ EMAILJS - Falha em background (não é crítico):', error);
  }

  return true; // Mailto sempre "funciona" (abre cliente)
}
