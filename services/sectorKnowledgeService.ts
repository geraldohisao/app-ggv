/**
 * Serviço para integrar setores de atuação no banco vetorial
 * Permite que o Assistente IA use informações dos setores para melhorar respostas
 */

import { supabase } from './supabaseClient';
import { MarketSegment } from '../types';
import { getDiagnosticSegments } from './supabaseService';
import { generateEmbedding } from './embeddingService';

/**
 * Converte um setor de atuação em documento de conhecimento
 */
const sectorToKnowledgeDocument = (sector: MarketSegment): string => {
    return `SETOR DE ATUAÇÃO: ${sector.name}

CARACTERÍSTICAS DO MERCADO:
${sector.characteristics}

TENDÊNCIAS ATUAIS:
${sector.trends}

PRINCIPAIS DESAFIOS:
${sector.challenges}

FATORES CRÍTICOS DE SUCESSO:
${sector.successFactors}

ÁREAS DE FOCO PARA ANÁLISE:
${sector.aiFocusAreas.join(', ')}

ESTRATÉGIAS POR CANAL DE VENDAS:
- B2B: ${sector.aiChannelInsights.b2b}
- Híbrido: ${sector.aiChannelInsights.hibrido}

INSIGHTS POR FATURAMENTO:
${sector.aiRevenueInsights}

PROMPT PERSONALIZADO PARA IA:
${sector.aiCustomPrompt}

BENCHMARKS:
- Média do setor: ${sector.benchmarkMedio}%
- Top performers: ${sector.topPerformers}%`;
};

/**
 * Sincroniza todos os setores de atuação com o banco vetorial
 */
export const syncSectorsToVectorDatabase = async (): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
        console.log('🔄 SYNC_SECTORS - Iniciando sincronização dos setores...');
        
        if (!supabase) {
            return { success: false, message: 'Supabase não inicializado' };
        }

        // 1. Carregar todos os setores
        const sectors = await getDiagnosticSegments();
        console.log(`📊 SYNC_SECTORS - ${sectors.length} setores carregados`);

        // 2. Remover documentos antigos de setores do usuário atual (prefixo "SETOR:")
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error: deleteError } = await supabase
                .from('knowledge_documents')
                .delete()
                .like('name', 'SETOR:%')
                .eq('user_id', user.id);

            if (deleteError) {
                console.warn('⚠️ SYNC_SECTORS - Erro ao limpar setores antigos:', deleteError);
            }
        }

        // 3. Processar cada setor
        let successCount = 0;
        for (const sector of sectors) {
            try {
                const documentContent = sectorToKnowledgeDocument(sector);
                const documentName = `SETOR: ${sector.name}`;

                // Gerar embedding
                const embedding = await generateEmbedding(documentContent, 'RETRIEVAL_DOCUMENT');

                // Salvar no banco vetorial (usar mesmo usuário que fez a limpeza)
                const { error: insertError } = await supabase
                    .from('knowledge_documents')
                    .insert({
                        name: documentName,
                        content: documentContent,
                        embedding: embedding,
                        user_id: user?.id || null // Usar ID do usuário atual, ou null para público
                    });

                if (insertError) {
                    console.error(`❌ SYNC_SECTORS - Erro ao salvar setor ${sector.name}:`, insertError);
                } else {
                    successCount++;
                    console.log(`✅ SYNC_SECTORS - Setor ${sector.name} sincronizado`);
                }
            } catch (error) {
                console.error(`❌ SYNC_SECTORS - Erro ao processar setor ${sector.name}:`, error);
            }
        }

        console.log(`🎉 SYNC_SECTORS - Sincronização concluída: ${successCount}/${sectors.length} setores`);
        
        return {
            success: successCount > 0,
            message: `${successCount} setores sincronizados com sucesso`,
            count: successCount
        };

    } catch (error) {
        console.error('❌ SYNC_SECTORS - Erro geral:', error);
        return {
            success: false,
            message: `Erro na sincronização: ${(error as any)?.message || error}`
        };
    }
};

/**
 * Verifica se os setores estão sincronizados no banco vetorial
 */
export const checkSectorsSyncStatus = async (): Promise<{ synced: boolean; count: number }> => {
    try {
        if (!supabase) {
            return { synced: false, count: 0 };
        }

        const { data, error } = await supabase
            .from('knowledge_documents')
            .select('id')
            .like('name', 'SETOR:%');

        if (error) {
            console.error('❌ CHECK_SECTORS - Erro ao verificar status:', error);
            return { synced: false, count: 0 };
        }

        const count = data?.length || 0;
        console.log(`📊 CHECK_SECTORS - ${count} setores encontrados no banco vetorial`);
        
        return { synced: count > 0, count };

    } catch (error) {
        console.error('❌ CHECK_SECTORS - Erro geral:', error);
        return { synced: false, count: 0 };
    }
};

/**
 * Auto-sincronização: verifica e sincroniza se necessário
 */
export const autoSyncSectors = async (): Promise<void> => {
    try {
        const status = await checkSectorsSyncStatus();
        
        if (!status.synced) {
            console.log('🔄 AUTO_SYNC - Setores não sincronizados, iniciando sincronização...');
            await syncSectorsToVectorDatabase();
        } else {
            console.log(`✅ AUTO_SYNC - ${status.count} setores já sincronizados`);
        }
    } catch (error) {
        console.error('❌ AUTO_SYNC - Erro:', error);
    }
};
