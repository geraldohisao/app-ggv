// Script para executar no console do navegador
// Busca logos do banco de dados e os fixa no localStorage

(async function fetchAndFixLogos() {
  console.log('🔄 Buscando logos do banco de dados...');
  
  try {
    // Verificar se o supabase está disponível
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase não está disponível. Certifique-se de estar na página da aplicação.');
      return;
    }
    
    // Buscar da tabela platform_logos
    console.log('🔍 Buscando na tabela platform_logos...');
    const { data: platformLogos, error: platformError } = await supabase
      .from('platform_logos')
      .select('grupo_ggv_logo_url, ggv_inteligencia_logo_url')
      .eq('id', 1)
      .single();

    if (platformLogos && !platformError) {
      console.log('✅ Logos encontrados na tabela platform_logos:', platformLogos);
      
      const logoData = {
        grupoGGVLogoUrl: platformLogos.grupo_ggv_logo_url,
        ggvInteligenciaLogoUrl: platformLogos.ggv_inteligencia_logo_url,
        _fetchedAt: new Date().toISOString(),
        _source: 'platform_logos',
        _fixedManually: true
      };
      
      // Salvar no localStorage
      localStorage.setItem('ggv-logos-cache', JSON.stringify(logoData));
      
      // Atualizar window.APP_CONFIG
      if (window.APP_CONFIG) {
        window.APP_CONFIG.LOGOS = {
          grupoGGVLogoUrl: logoData.grupoGGVLogoUrl,
          ggvInteligenciaLogoUrl: logoData.ggvInteligenciaLogoUrl
        };
      }
      
      console.log('✅ Logos fixados com sucesso!');
      console.log('📦 Dados salvos no localStorage:', logoData);
      console.log('🔄 Recarregue a página para ver os logos atualizados.');
      
      return logoData;
    }

    // Fallback: tentar RPC
    console.log('🔄 Tentando RPC get_logo_urls...');
    const { data: rpcLogos, error: rpcError } = await supabase.rpc('get_logo_urls');
    
    if (rpcLogos && !rpcError) {
      console.log('✅ Logos encontrados via RPC:', rpcLogos);
      
      const logoData = {
        grupoGGVLogoUrl: rpcLogos.grupoGGVLogoUrl || rpcLogos.grupo_ggv_logo_url,
        ggvInteligenciaLogoUrl: rpcLogos.ggvInteligenciaLogoUrl || rpcLogos.ggv_inteligencia_logo_url,
        _fetchedAt: new Date().toISOString(),
        _source: 'rpc',
        _fixedManually: true
      };
      
      localStorage.setItem('ggv-logos-cache', JSON.stringify(logoData));
      
      if (window.APP_CONFIG) {
        window.APP_CONFIG.LOGOS = {
          grupoGGVLogoUrl: logoData.grupoGGVLogoUrl,
          ggvInteligenciaLogoUrl: logoData.ggvInteligenciaLogoUrl
        };
      }
      
      console.log('✅ Logos fixados via RPC!');
      console.log('📦 Dados salvos:', logoData);
      console.log('🔄 Recarregue a página para ver os logos atualizados.');
      
      return logoData;
    }

    console.error('❌ Não foi possível buscar logos do banco de dados');
    console.error('Platform error:', platformError);
    console.error('RPC error:', rpcError);
    
  } catch (error) {
    console.error('❌ Erro ao buscar logos:', error);
  }
})();

// Função para verificar cache atual
window.checkLogosCache = function() {
  const cached = localStorage.getItem('ggv-logos-cache');
  if (cached) {
    const logoData = JSON.parse(cached);
    console.log('📦 Cache atual dos logos:', logoData);
    return logoData;
  } else {
    console.log('📭 Nenhum cache de logos encontrado');
    return null;
  }
};

// Função para limpar cache
window.clearLogosCache = function() {
  localStorage.removeItem('ggv-logos-cache');
  console.log('🗑️ Cache de logos limpo');
};

console.log('🛠️ Funções disponíveis:');
console.log('  - checkLogosCache() - Verificar cache atual');
console.log('  - clearLogosCache() - Limpar cache');
console.log('  - fetchAndFixLogos() - Buscar e fixar logos novamente');
