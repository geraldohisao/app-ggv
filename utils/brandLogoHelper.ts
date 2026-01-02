import { supabase } from '../services/supabaseClient';

/**
 * Busca o logo do Grupo GGV da tabela brand_logos
 * Retorna HTML da imagem pronto para usar em e-mails
 */
export async function getGGVLogoHTML(): Promise<string> {
    try {
        console.log('🔍 Buscando logo do brand_logos...');
        const { data, error } = await supabase
            .from('brand_logos')
            .select('url')
            .eq('key', 'grupo_ggv')
            .single();

        if (error) {
            console.error('❌ Erro ao buscar logo:', error);
            throw error;
        }

        const logoUrl = data?.url;
        console.log('✅ URL do logo:', logoUrl);

        if (logoUrl) {
            return `<img src="${logoUrl}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
        }
    } catch (err) {
        console.warn('⚠️ Falha ao buscar logo, usando fallback:', err);
    }

    // Fallback: SVG inline
    console.log('⚠️ Usando fallback SVG');
    const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="GRUPO GGV"><rect x="0" y="0" width="220" height="64" rx="10" fill="#f8f9fa"/><text x="110" y="38" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">GRUPO GGV</text></svg>'
    );
    return `<img src="${fallbackSvg}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
}

