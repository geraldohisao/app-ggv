// Netlify Function: Extrai valor e pessoa de documentos de OS
// URL: /.netlify/functions/extract-os-metadata
// Method: POST { osId: string }

const { createClient } = require('@supabase/supabase-js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

exports.handler = async (event) => {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    // Apenas POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Verificar config
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Supabase configuration missing' })
        };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });

    try {
        const { osId } = JSON.parse(event.body || '{}');

        if (!osId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'osId é obrigatório' })
            };
        }

        console.log('🔍 EXTRACT OS - Iniciando extração para OS:', osId);

        // Buscar OS no banco
        const { data: os, error: osError } = await supabase
            .from('service_orders')
            .select('id, file_path, file_name, file_hash')
            .eq('id', osId)
            .single();

        if (osError || !os) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'OS não encontrada' })
            };
        }

        console.log('📄 EXTRACT OS - OS encontrada:', os.file_name);

        // Baixar PDF do storage
        const { data: pdfBlob, error: downloadError } = await supabase.storage
            .from('service-orders')
            .download(os.file_path);

        if (downloadError || !pdfBlob) {
            console.error('❌ EXTRACT OS - Erro ao baixar PDF:', downloadError);
            
            // Marcar como erro
            await supabase
                .from('service_orders')
                .update({
                    extraction_status: 'ERROR',
                    extraction_log: {
                        error: 'Falha ao baixar PDF',
                        details: downloadError?.message
                    }
                })
                .eq('id', osId);

            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Falha ao baixar PDF' })
            };
        }

        console.log('📥 EXTRACT OS - PDF baixado, extraindo texto...');

        // Converter Blob para Buffer e Uint8Array
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Extrair texto do PDF usando pdfjs-dist
        let extractedText = '';
        try {
            const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
            const pdfDocument = await loadingTask.promise;
            const numPages = pdfDocument.numPages;
            
            console.log('📄 EXTRACT OS - PDF tem', numPages, 'páginas');

            // Extrair texto de todas as páginas
            const textParts = [];
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                textParts.push(pageText);
            }

            extractedText = textParts.join('\n\n');
            console.log('✅ EXTRACT OS - Texto extraído:', extractedText.length, 'caracteres');
        } catch (parseError) {
            console.error('❌ EXTRACT OS - Erro ao fazer parse do PDF:', parseError);
            
            await supabase
                .from('service_orders')
                .update({
                    extraction_status: 'ERROR',
                    extraction_log: {
                        error: 'Falha ao extrair texto do PDF',
                        details: parseError.message
                    }
                })
                .eq('id', osId);

            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Falha ao extrair texto do PDF' })
            };
        }

        // HEURÍSTICAS PARA EXTRAÇÃO
        console.log('🔍 EXTRACT OS - Aplicando heurísticas...');

        // 1) VALOR: Procurar por padrões de moeda brasileira
        const valorRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi;
        const valorMatches = [...extractedText.matchAll(valorRegex)];
        
        let extractedValor = null;
        let valorContext = '';
        let valorConfidence = 0;

        if (valorMatches.length > 0) {
            // Pegar o maior valor encontrado (provavelmente é o valor principal)
            const valores = valorMatches.map(m => {
                const valorStr = m[1].replace(/\./g, '').replace(',', '.');
                const valorNum = parseFloat(valorStr);
                return { valor: m[0], numeric: valorNum, index: m.index };
            });
            
            valores.sort((a, b) => b.numeric - a.numeric);
            extractedValor = valores[0].valor;
            valorConfidence = valorMatches.length === 1 ? 0.9 : 0.7; // Alta confiança se único

            // Pegar contexto (50 chars antes e depois)
            const idx = valores[0].index;
            const start = Math.max(0, idx - 50);
            const end = Math.min(extractedText.length, idx + 50);
            valorContext = extractedText.substring(start, end).trim();

            console.log('✅ EXTRACT OS - Valor encontrado:', extractedValor, 'confiança:', valorConfidence);
        } else {
            console.log('⚠️ EXTRACT OS - Nenhum valor encontrado');
        }

        // 2) PESSOA/CLIENTE: Procurar por marcadores comuns
        const pessoaMarkers = [
            /(?:cliente|contratante|favorecido|proponente|responsável|solicitante|requerente):\s*([^\n]{5,100})/gi,
            /(?:nome|razão social):\s*([^\n]{5,100})/gi,
            /(?:cpf|cnpj):\s*[\d.\-\/]+\s*([^\n]{5,100})/gi
        ];

        let extractedPessoa = null;
        let pessoaContext = '';
        let pessoaConfidence = 0;

        for (const regex of pessoaMarkers) {
            const matches = [...extractedText.matchAll(regex)];
            if (matches.length > 0) {
                extractedPessoa = matches[0][1].trim();
                pessoaConfidence = 0.8;

                // Pegar contexto
                const idx = matches[0].index;
                const start = Math.max(0, idx - 30);
                const end = Math.min(extractedText.length, idx + 100);
                pessoaContext = extractedText.substring(start, end).trim();

                console.log('✅ EXTRACT OS - Pessoa encontrada:', extractedPessoa, 'confiança:', pessoaConfidence);
                break;
            }
        }

        if (!extractedPessoa) {
            console.log('⚠️ EXTRACT OS - Nenhuma pessoa encontrada');
        }

        // Confiança geral: média das duas
        const overallConfidence = extractedValor && extractedPessoa
            ? (valorConfidence + pessoaConfidence) / 2
            : extractedValor
                ? valorConfidence
                : extractedPessoa
                    ? pessoaConfidence
                    : 0;

        // Status baseado na confiança
        let status = 'SUCCESS';
        if (overallConfidence < 0.6) {
            status = 'REVIEW'; // Baixa confiança, revisar manualmente
        }
        if (!extractedValor && !extractedPessoa) {
            status = 'ERROR'; // Nada encontrado
        }

        // Salvar resultados
        console.log('💾 EXTRACT OS - Salvando resultados...');

        const { error: updateError } = await supabase
            .from('service_orders')
            .update({
                extracted_valor: extractedValor,
                extracted_pessoa: extractedPessoa,
                extraction_confidence: overallConfidence,
                extraction_status: status,
                extraction_log: {
                    timestamp: new Date().toISOString(),
                    text_length: extractedText.length,
                    valor: {
                        found: !!extractedValor,
                        value: extractedValor,
                        confidence: valorConfidence,
                        context: valorContext,
                        matches_count: valorMatches.length
                    },
                    pessoa: {
                        found: !!extractedPessoa,
                        value: extractedPessoa,
                        confidence: pessoaConfidence,
                        context: pessoaContext
                    },
                    overall_confidence: overallConfidence,
                    method: 'heuristic_regex'
                }
            })
            .eq('id', osId);

        if (updateError) {
            console.error('❌ EXTRACT OS - Erro ao salvar:', updateError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Falha ao salvar extração' })
            };
        }

        console.log('✅ EXTRACT OS - Extração concluída com sucesso!');

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                osId,
                extracted: {
                    valor: extractedValor,
                    pessoa: extractedPessoa,
                    confidence: overallConfidence,
                    status
                }
            })
        };

    } catch (error) {
        console.error('❌ EXTRACT OS - Erro geral:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Erro ao processar extração',
                details: error.message
            })
        };
    }
};

