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

    // IMPORTANTE: Aqui você deve integrar com seu sistema N8N/Pipedrive real
    // Por enquanto, vamos simular uma busca no Pipedrive via N8N
    
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

    /* CÓDIGO ORIGINAL PARA QUANDO N8N ESTIVER CONFIGURADO:
    try {
      // URL do seu workflow N8N que busca dados do Pipedrive
      const N8N_WEBHOOK_URL = process.env.N8N_PIPEDRIVE_WEBHOOK_URL || 'https://seu-n8n.com/webhook/pipedrive-deal';
      
      console.log('🔄 DIAG WEBHOOK - Fazendo requisição para N8N:', N8N_WEBHOOK_URL);
      
      // Fazer requisição para N8N para buscar dados reais do Pipedrive
      const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}?deal_id=${encodeURIComponent(dealId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      });

      if (!n8nResponse.ok) {
        console.error('❌ DIAG WEBHOOK - Erro na resposta do N8N:', n8nResponse.status, n8nResponse.statusText);
        
        // Se N8N não responder, retornar erro específico
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: 'Erro na integração com N8N',
            message: `N8N retornou status ${n8nResponse.status}: ${n8nResponse.statusText}`,
            dealId: dealId,
            suggestion: 'Verifique se o workflow N8N está ativo e configurado corretamente'
          })
        };
      }

      const n8nData = await n8nResponse.json();
      console.log('✅ DIAG WEBHOOK - Dados recebidos do N8N:', n8nData);

      // Mapear dados do N8N para formato esperado pelo frontend
      const mappedData = {
        companyName: n8nData.companyName || n8nData.company_name || n8nData.org_name || '',
        email: n8nData.email || n8nData.contact_email || n8nData.person_email || '',
        'ramo_de_atividade': n8nData.ramo_de_atividade || n8nData.activity_branch || '',
        'setor_de_atuação': n8nData.setor_de_atuacao || n8nData['setor_de_atuação'] || n8nData.activity_sector || '',
        faturamento_mensal: n8nData.faturamento_mensal || n8nData.monthly_billing || '',
        'tamanho_equipe_comercial': n8nData.tamanho_equipe_comercial || n8nData['tamanho_equipe_comercial'] || n8nData.sales_team_size || '',
        org_name: n8nData.org_name || n8nData.companyName || n8nData.company_name || '',
        contact_email: n8nData.contact_email || n8nData.email || '',
        person_email: n8nData.person_email || n8nData.email || '',
        // Preservar dados originais
        ...n8nData
      };

      console.log('📋 DIAG WEBHOOK - Dados mapeados:', mappedData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mappedData)
      };

    } catch (fetchError) {
      console.error('❌ DIAG WEBHOOK - Erro ao conectar com N8N:', fetchError);
      
      // Se não conseguir conectar com N8N, retornar erro de integração
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Serviço de integração indisponível',
          message: 'Não foi possível conectar com o sistema N8N. Tente novamente em alguns minutos.',
          dealId: dealId,
          details: fetchError.message,
          suggestion: 'Verifique sua conexão de internet e se o serviço N8N está online'
        })
      };
    }
    */

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
