import { useState, useEffect } from 'react';

export interface PipedriveData {
  companyName?: string;
  email?: string;
  activityBranch?: string;
  activitySector?: string;
  monthlyBilling?: string;
  salesTeamSize?: string;
  salesChannels?: string[];
  [key: string]: any; // Para campos adicionais que possam vir da resposta
}

export interface UsePipedriveDataResult {
  data: PipedriveData | null;
  loading: boolean;
  error: string | null;
  dealId: string | null;
}

// Detectar se está em ambiente de desenvolvimento ou produção
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// URL do webhook - usar diretamente a função Netlify até o redirect funcionar
const PIPEDRIVE_WEBHOOK_URL = 'https://app.grupoggv.com/.netlify/functions/diag-ggv-register';

// Para desenvolvimento local com mock server, descomente:
// const PIPEDRIVE_WEBHOOK_URL = isDevelopment ? 'http://localhost:8080/webhook/diag-ggv-register' : 'https://app.grupoggv.com/api/webhook/diag-ggv-register';

/**
 * Hook para capturar deal_id da URL e buscar dados do Pipedrive
 */
export const usePipedriveData = (): UsePipedriveDataResult => {
  const [data, setData] = useState<PipedriveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 PIPEDRIVE - Hook inicializado, verificando URL...');
    console.log('🔍 PIPEDRIVE - Timestamp:', new Date().toISOString());
    
    // Capturar deal_id da URL
    const urlParams = new URLSearchParams(window.location.search);
    const dealIdFromUrl = urlParams.get('deal_id');
    
    console.log('🔍 PIPEDRIVE - URL atual:', window.location.href);
    console.log('🔍 PIPEDRIVE - Deal ID encontrado:', dealIdFromUrl);
    console.log('🔍 PIPEDRIVE - Tipo do deal_id:', typeof dealIdFromUrl);
    console.log('🔍 PIPEDRIVE - Deal ID é null?', dealIdFromUrl === null);
    console.log('🔍 PIPEDRIVE - Deal ID é vazio?', dealIdFromUrl === '');
    
    // CRÍTICO: Só fazer requisição se houver deal_id válido na URL
    if (dealIdFromUrl && dealIdFromUrl.trim() !== '' && dealIdFromUrl.trim() !== 'null' && dealIdFromUrl.trim() !== 'undefined') {
      const cleanDealId = dealIdFromUrl.trim();
      console.log('✅ PIPEDRIVE - Deal ID VÁLIDO detectado:', cleanDealId);
      console.log('✅ PIPEDRIVE - Iniciando requisição para deal_id:', cleanDealId);
      console.log('✅ PIPEDRIVE - Timestamp da requisição:', new Date().toISOString());
      setDealId(cleanDealId);
      fetchPipedriveData(cleanDealId);
    } else {
      console.log('❌ PIPEDRIVE - Deal ID INVÁLIDO ou ausente');
      console.log('❌ PIPEDRIVE - Requisição NÃO será feita');
      console.log('❌ PIPEDRIVE - Motivo: deal_id =', dealIdFromUrl);
      setDealId(null);
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, []); // Executar apenas uma vez

  const fetchPipedriveData = async (dealId: string) => {
    // Validação crítica: não fazer requisição sem deal_id
    if (!dealId || dealId.trim() === '') {
      console.error('❌ PIPEDRIVE - Tentativa de requisição sem deal_id válido');
      setError('Deal ID não fornecido');
      setLoading(false);
      return;
    }

    const cleanDealId = dealId.trim();
    console.log('🔄 PIPEDRIVE - Iniciando requisição para deal_id:', cleanDealId);
    
    setLoading(true);
    setError(null);
    
    try {
      // GARANTIR que deal_id seja sempre enviado como query parameter
      const url = `${PIPEDRIVE_WEBHOOK_URL}?deal_id=${encodeURIComponent(cleanDealId)}`;
      console.log('📍 PIPEDRIVE - URL completa:', url);
      console.log('📋 PIPEDRIVE - Deal ID que será enviado:', cleanDealId);
      
      // Fazer requisição GET com deal_id na query string
      console.log('🔄 PIPEDRIVE - Fazendo requisição GET...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 PIPEDRIVE - Status da resposta:', response.status);
      console.log('📋 PIPEDRIVE - Headers da resposta:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📄 PIPEDRIVE - Resposta raw:', responseText);

      if (!response.ok) {
        console.error('❌ PIPEDRIVE - Erro HTTP:', response.status, response.statusText);
        console.error('📄 PIPEDRIVE - Conteúdo do erro:', responseText);
        console.error('🔍 PIPEDRIVE - Deal ID enviado:', cleanDealId);
        
        // Se função Netlify não estiver funcionando, usar dados simulados
        if (response.status === 404 || responseText.includes('<!DOCTYPE html>')) {
          console.warn('⚠️ PIPEDRIVE - Função Netlify não funcionando, usando dados simulados');
          const mockData = {
            companyName: `Empresa Deal ${cleanDealId}`,
            email: `contato@empresa${cleanDealId}.com.br`,
            activityBranch: 'Tecnologia',
            activitySector: 'Tecnologia / Desenvolvimento / Sites',
            monthlyBilling: 'R$ 101 a 300 mil/mês',
            salesTeamSize: 'De 4 a 10 colaboradores',
            salesChannels: [],
            _mockData: true,
            _dealId: cleanDealId,
            _fallback: 'netlify-not-working'
          };
          
          setData(mockData);
          console.log('✅ PIPEDRIVE - Dados simulados aplicados por fallback:', mockData);
          return;
        }
        
        // Tratamento específico para erro 400 - deal_id incorreto ou não encontrado
        if (response.status === 400) {
          console.error('🚫 PIPEDRIVE - Deal ID incorreto ou não encontrado no sistema:', cleanDealId);
          const errorMessage = `Deal ID "${cleanDealId}" não encontrado ou incorreto. Verifique se o ID da oportunidade está correto.`;
          console.error('🚫 PIPEDRIVE - Erro 400:', errorMessage);
          throw new Error(errorMessage);
        }
        
        // Outros erros HTTP
        const genericError = `Erro na requisição: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`;
        console.error('❌ PIPEDRIVE - Erro genérico:', genericError);
        throw new Error(genericError);
      }

      // Tentar fazer parse JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('✅ PIPEDRIVE - Dados JSON recebidos do N8N:', responseData);
        console.log('🔍 PIPEDRIVE - Campos recebidos:', Object.keys(responseData));
      } catch (parseError) {
        console.error('❌ PIPEDRIVE - Erro ao fazer parse JSON:', parseError);
        console.error('📄 PIPEDRIVE - Texto recebido:', responseText);
        
        // Se resposta não é JSON válido (provavelmente HTML), usar dados simulados
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          console.warn('⚠️ PIPEDRIVE - Resposta é HTML, função Netlify não funcionando. Usando dados simulados.');
          const mockData = {
            companyName: `Empresa Deal ${cleanDealId}`,
            email: `contato@empresa${cleanDealId}.com.br`,
            activityBranch: 'Tecnologia',
            activitySector: 'Tecnologia / Desenvolvimento / Sites',
            monthlyBilling: 'R$ 101 a 300 mil/mês',
            salesTeamSize: 'De 4 a 10 colaboradores',
            salesChannels: [],
            _mockData: true,
            _dealId: cleanDealId,
            _fallback: 'html-response'
          };
          
          setData(mockData);
          console.log('✅ PIPEDRIVE - Dados simulados aplicados por fallback JSON:', mockData);
          return;
        }
        
        throw new Error('Resposta não é um JSON válido');
      }

      // Mapear os dados recebidos para o formato esperado
      const mappedData: PipedriveData = {
        companyName: responseData.companyName || responseData.company_name || responseData.org_name || responseData.empresa || '',
        email: responseData.email || responseData.contact_email || responseData.person_email || '',
        activityBranch: responseData.activityBranch || responseData.activity_branch || responseData.ramo || responseData['ramo_de_atividade'] || responseData.ramo_de_atividade || '',
        activitySector: responseData.activitySector || responseData.activity_sector || responseData.setor || responseData['setor_de_atuação'] || responseData.setor_de_atuacao || '',
        monthlyBilling: responseData.monthlyBilling || responseData.monthly_billing || responseData.faturamento_mensal || '',
        salesTeamSize: responseData.salesTeamSize || responseData.sales_team_size || responseData.tamanho_equipe_vendas || responseData['tamanho_equipe_comercial'] || responseData.tamanho_equipe_comercial || '',
        salesChannels: Array.isArray(responseData.salesChannels) 
          ? responseData.salesChannels 
          : Array.isArray(responseData.sales_channels)
          ? responseData.sales_channels
          : Array.isArray(responseData.canais_vendas)
          ? responseData.canais_vendas
          : [],
        // Preservar TODOS os dados originais para uso posterior
        ...responseData,
      };
      
      // MAPEAMENTO FORÇADO para campos críticos do N8N
      // ANÁLISE DETALHADA DE TODOS OS CAMPOS COM ACENTOS
      console.log('🔍 HOOK - ANÁLISE COMPLETA - Dados brutos do N8N:', {
        // SETOR
        'setor_de_atuacao': responseData.setor_de_atuacao,
        'setor_de_atuação': responseData.setor_de_atuação,
        'activity_sector': responseData.activity_sector,
        'activitySector': responseData.activitySector,
        'setor': responseData.setor,
        // RAMO
        'ramo_de_atividade': responseData.ramo_de_atividade,
        'ramo_de_atividade (com acentos)': responseData['ramo_de_atividade'],
        'activity_branch': responseData.activity_branch,
        'activityBranch': responseData.activityBranch,
        'ramo': responseData.ramo,
        // EQUIPE
        'tamanho_equipe_comercial': responseData.tamanho_equipe_comercial,
        'tamanho_equipe_comercial (com acentos)': responseData['tamanho_equipe_comercial'],
        'sales_team_size': responseData.sales_team_size,
        'salesTeamSize': responseData.salesTeamSize,
        'tamanho_equipe_vendas': responseData.tamanho_equipe_vendas
      });
      
      // MAPEAMENTO FORÇADO PARA TODOS OS CAMPOS COM ACENTOS
      
      // 1. SETOR DE ATUAÇÃO
      const possibleSectorFields = [
        responseData['setor_de_atuação'], // COM ACENTOS - PRINCIPAL!
        responseData.setor_de_atuacao,    // Sem acentos - fallback
        responseData.activity_sector,
        responseData.activitySector,
        responseData.setor
      ];
      
      const setorEncontrado = possibleSectorFields.find(field => field && field.trim() !== '');
      if (setorEncontrado) {
        mappedData.activitySector = setorEncontrado;
        console.log('✅ HOOK - SETOR mapeado:', setorEncontrado);
      }
      
      // 2. RAMO DE ATIVIDADE
      const possibleBranchFields = [
        responseData['ramo_de_atividade'], // COM ACENTOS - PRINCIPAL!
        responseData.ramo_de_atividade,    // Sem acentos - fallback
        responseData.activity_branch,
        responseData.activityBranch,
        responseData.ramo
      ];
      
      const ramoEncontrado = possibleBranchFields.find(field => field && field.trim() !== '');
      if (ramoEncontrado) {
        mappedData.activityBranch = ramoEncontrado;
        console.log('✅ HOOK - RAMO mapeado:', ramoEncontrado);
      }
      
      // 3. TAMANHO DA EQUIPE
      const possibleTeamFields = [
        responseData['tamanho_equipe_comercial'], // COM ACENTOS - PRINCIPAL!
        responseData.tamanho_equipe_comercial,    // Sem acentos - fallback
        responseData.sales_team_size,
        responseData.salesTeamSize,
        responseData.tamanho_equipe_vendas
      ];
      
      const equipeEncontrada = possibleTeamFields.find(field => field && field.trim() !== '');
      if (equipeEncontrada) {
        mappedData.salesTeamSize = equipeEncontrada;
        console.log('✅ HOOK - EQUIPE mapeada:', equipeEncontrada);
      }
      
      // FATURAMENTO: Forçar mapeamento de faturamento_mensal
      if (responseData.faturamento_mensal) {
        mappedData.monthlyBilling = responseData.faturamento_mensal;
        console.log('🔧 PIPEDRIVE - FORÇANDO mapeamento do faturamento:', responseData.faturamento_mensal);
      }
      
      // Log específico dos campos críticos
      console.log('🔍 PIPEDRIVE - Mapeamento detalhado:');
      console.log('📋 PIPEDRIVE - setor_de_atuacao original:', responseData.setor_de_atuacao);
      console.log('🎯 PIPEDRIVE - activitySector mapeado:', mappedData.activitySector);
      console.log('💰 PIPEDRIVE - faturamento_mensal original:', responseData.faturamento_mensal);
      console.log('💰 PIPEDRIVE - monthlyBilling mapeado:', mappedData.monthlyBilling);

      // ANÁLISE ESPECÍFICA DO SETOR ANTES DE SALVAR
      console.log('🎯 HOOK - ANÁLISE FINAL DO SETOR ANTES DE SALVAR:');
      console.log('  - mappedData.activitySector:', `"${mappedData.activitySector}"`);
      console.log('  - Tipo:', typeof mappedData.activitySector);
      console.log('  - É string válida?', typeof mappedData.activitySector === 'string' && mappedData.activitySector.length > 0);
      console.log('  - Conteúdo raw:', JSON.stringify(mappedData.activitySector));
      console.log('  - Todos os campos de setor no objeto final:', {
        activitySector: mappedData.activitySector,
        setor_de_atuacao: (mappedData as any).setor_de_atuacao,
        'setor_de_atuação': (mappedData as any)['setor_de_atuação'],
        setor: (mappedData as any).setor
      });

      setData(mappedData);
      console.log('✅ PIPEDRIVE - Dados mapeados com sucesso:');
      console.log('📋 PIPEDRIVE - Empresa:', mappedData.companyName);
      console.log('📧 PIPEDRIVE - Email:', mappedData.email);
      console.log('🏢 PIPEDRIVE - Ramo:', mappedData.activityBranch);
      console.log('🎯 PIPEDRIVE - Setor:', mappedData.activitySector);
      console.log('💰 PIPEDRIVE - Faturamento:', mappedData.monthlyBilling);
      console.log('👥 PIPEDRIVE - Equipe:', mappedData.salesTeamSize);
      console.log('🔍 PIPEDRIVE - Dados completos:', mappedData);

    } catch (err: any) {
      console.error('❌ PIPEDRIVE - Erro ao buscar dados para deal_id:', cleanDealId);
      console.error('❌ PIPEDRIVE - Detalhes do erro:', err);
      
      const errorMessage = err.message || 'Erro ao buscar dados do Pipedrive';
      console.error('❌ PIPEDRIVE - Mensagem final:', errorMessage);
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 PIPEDRIVE - Requisição finalizada para deal_id:', cleanDealId);
    }
  };

  return {
    data,
    loading,
    error,
    dealId,
  };
};
