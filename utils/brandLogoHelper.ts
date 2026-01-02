import { supabase } from '../services/supabaseClient';

/**
 * Converte ArrayBuffer para base64 (compatível com browser)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Busca o logo do Grupo GGV da tabela brand_logos
 * Converte para base64 inline para garantir que sempre apareça em e-mails
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
            // Baixar imagem e converter para base64 inline
            console.log('📥 Baixando imagem para converter em base64...');
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(logoUrl, { 
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || 'image/png';
            const arrayBuffer = await response.arrayBuffer();
            const base64 = arrayBufferToBase64(arrayBuffer);
            
            console.log('✅ Logo convertido para base64 inline (tamanho:', Math.round(base64.length / 1024), 'KB)');
            
            return `<img src="data:${contentType};base64,${base64}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
        }
    } catch (err) {
        console.warn('⚠️ Falha ao buscar/converter logo, usando fallback:', err);
    }

    // Fallback: SVG inline
    console.log('⚠️ Usando fallback SVG');
    const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="GRUPO GGV"><rect x="0" y="0" width="220" height="64" rx="10" fill="#f8f9fa"/><text x="110" y="38" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">GRUPO GGV</text></svg>'
    );
    return `<img src="${fallbackSvg}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
}

