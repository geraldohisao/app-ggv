import { supabase } from '../services/supabaseClient';

/**
 * Busca os logos do banco de dados uma única vez e os salva localmente
 */
export async function fetchAndSaveLogosFromDatabase(): Promise<void> {
  try {
    console.log('🔄 LOGOS - Buscando logos do banco de dados...');
    
    if (!supabase) {
      console.warn('⚠️ LOGOS - Supabase não inicializado, usando URLs fixas');
      return;
    }

    // Tentar buscar da tabela platform_logos primeiro
    const { data: platformLogos, error: platformError } = await supabase
      .from('platform_logos')
      .select('grupo_ggv_logo_url, ggv_inteligencia_logo_url')
      .eq('id', 1)
      .single();

    if (platformLogos && !platformError) {
      console.log('✅ LOGOS - Encontrados na tabela platform_logos:', platformLogos);
      
      // Salvar no localStorage para uso offline
      const logoData = {
        grupoGGVLogoUrl: platformLogos.grupo_ggv_logo_url,
        ggvInteligenciaLogoUrl: platformLogos.ggv_inteligencia_logo_url,
        _fetchedAt: new Date().toISOString(),
        _source: 'platform_logos'
      };
      
      localStorage.setItem('ggv-logos-cache', JSON.stringify(logoData));
      
      // Atualizar window.APP_CONFIG se existir
      if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
        (window as any).APP_CONFIG.LOGOS = {
          grupoGGVLogoUrl: logoData.grupoGGVLogoUrl,
          ggvInteligenciaLogoUrl: logoData.ggvInteligenciaLogoUrl
        };
      }
      
      console.log('✅ LOGOS - Salvos no localStorage e window.APP_CONFIG');
      return;
    }

    // Fallback: tentar RPC get_logo_urls
    console.log('🔄 LOGOS - Tentando RPC get_logo_urls...');
    const { data: rpcLogos, error: rpcError } = await supabase.rpc('get_logo_urls');
    
    if (rpcLogos && !rpcError) {
      console.log('✅ LOGOS - Encontrados via RPC:', rpcLogos);
      
      const logoData = {
        grupoGGVLogoUrl: rpcLogos.grupoGGVLogoUrl || rpcLogos.grupo_ggv_logo_url,
        ggvInteligenciaLogoUrl: rpcLogos.ggvInteligenciaLogoUrl || rpcLogos.ggv_inteligencia_logo_url,
        _fetchedAt: new Date().toISOString(),
        _source: 'rpc'
      };
      
      localStorage.setItem('ggv-logos-cache', JSON.stringify(logoData));
      
      if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
        (window as any).APP_CONFIG.LOGOS = {
          grupoGGVLogoUrl: logoData.grupoGGVLogoUrl,
          ggvInteligenciaLogoUrl: logoData.ggvInteligenciaLogoUrl
        };
      }
      
      console.log('✅ LOGOS - Salvos do RPC no localStorage');
      return;
    }

    console.warn('⚠️ LOGOS - Não foi possível buscar do banco, usando URLs fixas');
    
  } catch (error) {
    console.error('❌ LOGOS - Erro ao buscar do banco:', error);
  }
}

/**
 * Busca logos do cache local ou usa URLs fixas como fallback
 */
export function getLogosFromCache(): { grupoGGVLogoUrl: string; ggvInteligenciaLogoUrl: string } {
  try {
    const cached = localStorage.getItem('ggv-logos-cache');
    if (cached) {
      const logoData = JSON.parse(cached);
      console.log('📦 LOGOS - Usando cache local:', logoData._source);
      return {
        grupoGGVLogoUrl: logoData.grupoGGVLogoUrl,
        ggvInteligenciaLogoUrl: logoData.ggvInteligenciaLogoUrl
      };
    }
  } catch (error) {
    console.warn('⚠️ LOGOS - Erro ao ler cache:', error);
  }

  // Fallback para URLs fixas
  console.log('🔧 LOGOS - Usando URLs fixas como fallback');
  return {
    grupoGGVLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png',
    ggvInteligenciaLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/Logo-GGV-Inteligencia.svg'
  };
}

/**
 * Inicializa o sistema de logos - chama uma vez no início da aplicação
 */
export async function initializeLogos(): Promise<void> {
  // Buscar do banco e salvar localmente
  await fetchAndSaveLogosFromDatabase();
  
  // Agendar atualização periódica (a cada 1 hora)
  setInterval(() => {
    fetchAndSaveLogosFromDatabase();
  }, 60 * 60 * 1000);
}
