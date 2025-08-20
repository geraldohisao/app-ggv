// Netlify Function para webhook do diagnóstico - integração Pipedrive/N8N
// URL: https://app.grupoggv.com/.netlify/functions/diag-ggv-register
// Alias: https://app.grupoggv.com/api/webhook/diag-ggv-register

export const handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    console.log('🔔 DIAG WEBHOOK - Método:', event.httpMethod);
    console.log('🔔 DIAG WEBHOOK - Query params:', event.queryStringParameters);
    console.log('🔔 DIAG WEBHOOK - Headers:', event.headers);
    console.log('🔔 DIAG WEBHOOK - Body:', event.body);

    // Extrair deal_id da query string
    const dealId = event.queryStringParameters?.deal_id;
    
    if (!dealId) {
      console.error('❌ DIAG WEBHOOK - Deal ID não fornecido');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Deal ID não fornecido',
          message: 'Parâmetro deal_id é obrigatório'
        })
      };
    }

    console.log('🔍 DIAG WEBHOOK - Processando deal_id:', dealId);

    // TEMPORÁRIO: Retornar dados simulados enquanto N8N não está configurado
    console.log('⚠️ DIAG WEBHOOK - N8N não configurado, retornando dados simulados');
    
    // Dados simulados baseados no deal_id
    const mockData = {
      companyName: `Empresa Deal ${dealId}`,
      email: `contato@empresa${dealId}.com.br`,
      'ramo_de_atividade': 'Tecnologia',
      'setor_de_atuação': 'Tecnologia / Desenvolvimento / Sites',
      faturamento_mensal: 'R$ 101 a 300 mil/mês',
      'tamanho_equipe_comercial': 'De 4 a 10 colaboradores',
      org_name: `Empresa Deal ${dealId}`,
      contact_email: `contato@empresa${dealId}.com.br`,
      person_email: `contato@empresa${dealId}.com.br`,
      _mockData: true,
      _dealId: dealId
    };

    console.log('📋 DIAG WEBHOOK - Dados simulados gerados:', mockData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockData)
    };

  } catch (error) {
    console.error('❌ DIAG WEBHOOK - Erro geral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado no processamento da requisição',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
