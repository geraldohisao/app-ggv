const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Supabase client
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        // Buscar URL do logo
        const { data, error } = await supabase
            .from('brand_logos')
            .select('url')
            .eq('key', 'grupo_ggv')
            .single();

        if (error || !data?.url) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Logo não encontrado',
                    fallback: true
                })
            };
        }

        const logoUrl = data.url;
        console.log('📥 Baixando logo:', logoUrl);

        // Fazer fetch do logo (sem restrições de CSP)
        const response = await fetch(logoUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        console.log('✅ Logo convertido para base64 (tamanho:', Math.round(base64.length / 1024), 'KB)');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                base64: `data:${contentType};base64,${base64}`,
                contentType,
                size: base64.length
            })
        };

    } catch (err) {
        console.error('❌ Erro ao buscar logo:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: err.message,
                fallback: true
            })
        };
    }
};

