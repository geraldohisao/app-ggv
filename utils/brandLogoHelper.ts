/**
 * Busca o logo do Grupo GGV via Netlify Function (sem restrições CSP)
 * Retorna HTML da imagem em base64 inline pronto para e-mails
 */
export async function getGGVLogoHTML(): Promise<string> {
    try {
        console.log('🔍 Buscando logo via backend...');
        
        // Buscar logo convertido do backend (sem CSP)
        const response = await fetch('/.netlify/functions/get-logo-base64', {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Backend retornou erro: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.base64) {
            console.log('✅ Logo recebido do backend (tamanho:', Math.round(result.size / 1024), 'KB)');
            return `<img src="${result.base64}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
        }

        if (result.fallback) {
            throw new Error('Backend retornou fallback');
        }
    } catch (err) {
        console.warn('⚠️ Falha ao buscar logo do backend, usando fallback:', err);
    }

    // Fallback: SVG inline (sempre funciona)
    console.log('⚠️ Usando fallback SVG');
    const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="GRUPO GGV"><rect x="0" y="0" width="220" height="64" rx="10" fill="#f8f9fa"/><text x="110" y="38" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">GRUPO GGV</text></svg>'
    );
    return `<img src="${fallbackSvg}" alt="GRUPO GGV" style="height:48px; width:auto; display:block; margin:0 auto; border:0;" />`;
}

