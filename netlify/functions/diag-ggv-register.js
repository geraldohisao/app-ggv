// Netlify Function para webhook do diagnóstico - integração Pipedrive/N8N
// URL: https://app.grupoggv.com/.netlify/functions/diag-ggv-register
// Alias: https://app.grupoggv.com/api/webhook/diag-ggv-register

exports.handler = async (event, context) => {
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

    // Buscar dados reais do Pipedrive via N8N
    try {
      // URL do seu workflow N8N que busca dados do Pipedrive
      const N8N_WEBHOOK_URL = process.env.N8N_PIPEDRIVE_WEBHOOK_URL || 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
      
      console.log('🔄 DIAG WEBHOOK - Fazendo requisição para N8N:', N8N_WEBHOOK_URL);
      console.log('🔍 DIAG WEBHOOK - Deal ID enviado para N8N:', dealId);
      
      // Fazer requisição para N8N para buscar dados reais do Pipedrive
      const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}?deal_id=${encodeURIComponent(dealId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 DIAG WEBHOOK - Status da resposta N8N:', n8nResponse.status);

      if (!n8nResponse.ok) {
        console.error('❌ DIAG WEBHOOK - Erro na resposta do N8N:', n8nResponse.status, n8nResponse.statusText);
        
        // Se N8N não responder, usar dados simulados como fallback
        console.warn('⚠️ DIAG WEBHOOK - N8N indisponível, usando dados simulados como fallback');
        const fallbackData = {
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
          _fallback: 'n8n-unavailable',
          _dealId: dealId
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(fallbackData)
        };
      }

      const n8nData = await n8nResponse.json();
      console.log('✅ DIAG WEBHOOK - Dados recebidos do N8N:', n8nData);

      // Mapear dados do N8N para formato esperado pelo frontend
      // Baseado na resposta real: {"tamanho_equipe_comercial":"De 1 a 3 colaboradores","faturamento_mensal":"Acima de 1 milhão/mês","setor_de_atuação":"Imóveis / Arquitetura / Construção civil","ramo_de_atividade":"Serviço","email":"Grupokondo@gmail.com","empresa":"Construtora Ikigai"}
      const mappedData = {
        companyName: n8nData.empresa || n8nData.companyName || n8nData.company_name || n8nData.org_name || '',
        email: n8nData.email || n8nData.contact_email || n8nData.person_email || '',
        'ramo_de_atividade': n8nData.ramo_de_atividade || n8nData['ramo_de_atividade'] || n8nData.activity_branch || '',
        'setor_de_atuação': n8nData['setor_de_atuação'] || n8nData.setor_de_atuacao || n8nData.activity_sector || '',
        faturamento_mensal: n8nData.faturamento_mensal || n8nData.monthly_billing || '',
        'tamanho_equipe_comercial': n8nData.tamanho_equipe_comercial || n8nData['tamanho_equipe_comercial'] || n8nData.sales_team_size || '',
        org_name: n8nData.empresa || n8nData.org_name || n8nData.companyName || n8nData.company_name || '',
        contact_email: n8nData.email || n8nData.contact_email || '',
        person_email: n8nData.email || n8nData.person_email || '',
        // Preservar dados originais do N8N
        ...n8nData,
        _realData: true,
        _dealId: dealId,
        _source: 'n8n-pipedrive'
      };

      console.log('📋 DIAG WEBHOOK - Dados mapeados do N8N:', mappedData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mappedData)
      };

    } catch (fetchError) {
      console.error('❌ DIAG WEBHOOK - Erro ao conectar com N8N:', fetchError);
      
      // Se não conseguir conectar com N8N, usar dados simulados como fallback
      console.warn('⚠️ DIAG WEBHOOK - Erro de conexão N8N, usando dados simulados como fallback');
      const fallbackData = {
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
        _fallback: 'n8n-connection-error',
        _dealId: dealId,
        _error: fetchError.message
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallbackData)
      };
    }

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