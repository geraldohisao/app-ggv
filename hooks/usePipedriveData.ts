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

// Usar proxy local em desenvolvimento para contornar CORS
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PIPEDRIVE_ENDPOINT = isDevelopment
  ? '/n8n-api/diag-ggv-register'  // Proxy local em desenvolvimento
  : 'https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register'; // Direto em produção

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
    
    // Capturar deal_id da URL
    const urlParams = new URLSearchParams(window.location.search);
    const dealIdFromUrl = urlParams.get('deal_id');
    
    console.log('🔍 PIPEDRIVE - URL atual:', window.location.href);
    console.log('🔍 PIPEDRIVE - Deal ID encontrado:', dealIdFromUrl);
    
    if (dealIdFromUrl) {
      console.log('✅ PIPEDRIVE - Deal ID válido, iniciando busca...');
      setDealId(dealIdFromUrl);
      fetchPipedriveData(dealIdFromUrl);
    } else {
      console.log('ℹ️ PIPEDRIVE - Nenhum deal_id encontrado na URL');
    }
  }, []);

  const fetchPipedriveData = async (dealId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 PIPEDRIVE - Buscando dados para deal_id:', dealId);
      
      const url = `${PIPEDRIVE_ENDPOINT}?deal_id=${encodeURIComponent(dealId)}`;
      console.log('📍 PIPEDRIVE - URL completa:', url);
      
      // Fazer requisição via proxy (dev) ou direta (prod)
      console.log('🔄 PIPEDRIVE - Fazendo requisição...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('📊 PIPEDRIVE - Status da resposta:', response.status);
      console.log('📋 PIPEDRIVE - Headers da resposta:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📄 PIPEDRIVE - Resposta raw:', responseText);

      if (!response.ok) {
        console.error('❌ PIPEDRIVE - Erro HTTP:', response.status, response.statusText);
        console.error('📄 PIPEDRIVE - Conteúdo do erro:', responseText);
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`);
      }

      // Tentar fazer parse JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('✅ PIPEDRIVE - Dados JSON recebidos:', responseData);
      } catch (parseError) {
        console.error('❌ PIPEDRIVE - Erro ao fazer parse JSON:', parseError);
        console.error('📄 PIPEDRIVE - Texto recebido:', responseText);
        throw new Error('Resposta não é um JSON válido');
      }

      // Mapear os dados recebidos para o formato esperado
      const mappedData: PipedriveData = {
        companyName: responseData.companyName || responseData.company_name || responseData.org_name || '',
        email: responseData.email || responseData.contact_email || responseData.person_email || '',
        activityBranch: responseData.activityBranch || responseData.activity_branch || responseData.ramo || '',
        activitySector: responseData.activitySector || responseData.activity_sector || responseData.setor || '',
        monthlyBilling: responseData.monthlyBilling || responseData.monthly_billing || responseData.faturamento_mensal || '',
        salesTeamSize: responseData.salesTeamSize || responseData.sales_team_size || responseData.tamanho_equipe_vendas || '',
        salesChannels: Array.isArray(responseData.salesChannels) 
          ? responseData.salesChannels 
          : Array.isArray(responseData.sales_channels)
          ? responseData.sales_channels
          : Array.isArray(responseData.canais_vendas)
          ? responseData.canais_vendas
          : [],
        // Preservar dados originais para uso posterior
        ...responseData,
      };

      setData(mappedData);
      console.log('✅ PIPEDRIVE - Dados mapeados:', mappedData);

    } catch (err: any) {
      console.error('❌ PIPEDRIVE - Erro ao buscar dados:', err);
      setError(err.message || 'Erro ao buscar dados do Pipedrive');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    dealId,
  };
};
