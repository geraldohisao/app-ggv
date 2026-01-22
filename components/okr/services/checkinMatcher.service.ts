/**
 * Serviço de Match Semântico de Items
 * Usa IA para identificar correspondências entre items manuais e bullet points da transcrição
 */

import { callOpenAI } from '../../../calls-dashboard/services/openaiService';
import type { ParsedCheckinItem } from './checkinParser.service';
import type { SprintItem } from '../types/sprint.types';

export interface ItemMatch {
  parsedItem: ParsedCheckinItem;
  existingItem: SprintItem | null;
  matchConfidence: number; // 0-100
  shouldUpdate: boolean;
  matchReason?: string;
  suggestedStatus?: string | null;
  contextToAdd?: string | null;
  updateFields: {
    description?: string;
    status?: string;
    checkin_id: string;
  };
}

interface AIMatchResult {
  matches: Array<{
    parsed_index: number;
    existing_item_id: string | null;
    confidence: number;
    reason: string;
    suggested_status_update: string | null;
    context_to_add: string;
  }>;
}

/**
 * Usa IA para encontrar correspondências semânticas entre
 * items manuais e bullet points da transcrição
 */
export async function matchItemsWithAI(
  parsedItems: ParsedCheckinItem[],
  existingItems: SprintItem[],
  checkinId: string
): Promise<ItemMatch[]> {
  if (parsedItems.length === 0) {
    return [];
  }

  if (existingItems.length === 0) {
    return parsedItems.map(item => ({
      parsedItem: item,
      existingItem: null,
      matchConfidence: 0,
      shouldUpdate: false,
      updateFields: { checkin_id: checkinId }
    }));
  }

  const prompt = buildMatchingPrompt(parsedItems, existingItems);
  
  try {
    console.log('🤖 Iniciando match semântico com IA...');
    const responseText = await callOpenAI(prompt);
    const aiResult: AIMatchResult = JSON.parse(responseText);
    
    const matches = parsedItems.map((parsedItem, idx) => {
      const match = aiResult.matches[idx];
      
      if (match && match.existing_item_id && match.confidence >= 70) {
        const existingItem = existingItems.find(i => i.id === match.existing_item_id);
        
        if (existingItem) {
          console.log(`✅ Match encontrado (${match.confidence}%): "${parsedItem.title}" → "${existingItem.title}"`);
          
          return {
            parsedItem,
            existingItem,
            matchConfidence: match.confidence,
            shouldUpdate: true,
            matchReason: match.reason,
            suggestedStatus: match.suggested_status_update,
            contextToAdd: match.context_to_add,
            updateFields: {
              description: buildEnhancedDescription(existingItem, parsedItem, match),
              status: inferStatus(parsedItem, match),
              checkin_id: checkinId
            }
          };
        }
      }
      
      return {
        parsedItem,
        existingItem: null,
        matchConfidence: match?.confidence || 0,
        shouldUpdate: false,
        matchReason: match?.reason || undefined,
        suggestedStatus: match?.suggested_status_update || null,
        contextToAdd: match?.context_to_add || null,
        updateFields: { checkin_id: checkinId }
      };
    });
    
    const matchedCount = matches.filter(m => m.shouldUpdate).length;
    const newCount = matches.filter(m => !m.shouldUpdate).length;
    console.log(`📊 Match semântico: ${matchedCount} atualizados, ${newCount} novos`);
    
    return matches;
  } catch (error) {
    console.error('❌ Erro no match semântico, usando fallback:', error);
    // Fallback: criar todos como novos items
    return parsedItems.map(item => ({
      parsedItem: item,
      existingItem: null,
      matchConfidence: 0,
      shouldUpdate: false,
      updateFields: { checkin_id: checkinId }
    }));
  }
}

/**
 * Constrói prompt para IA identificar correspondências semânticas
 */
function buildMatchingPrompt(
  parsedItems: ParsedCheckinItem[],
  existingItems: SprintItem[]
): string {
  const parsedList = parsedItems.map((item, idx) => 
    `${idx}: [${item.type}] "${item.title}"`
  ).join('\n');
  
  const existingList = existingItems.map(item => 
    `${item.id}: [${item.type}] "${item.title}"${item.description ? ` - ${item.description}` : ''}`
  ).join('\n');

  return `Você é um especialista em análise semântica de tarefas e iniciativas.

OBJETIVO: Identificar correspondências semânticas entre items de uma transcrição e items manuais existentes.

ITEMS DA TRANSCRIÇÃO (novos):
${parsedList}

ITEMS MANUAIS EXISTENTES:
${existingList}

INSTRUÇÕES:
1. Para cada item da transcrição, identifique se há um item manual correspondente
2. Correspondência = mesmo conceito/iniciativa/problema, mesmo que com palavras diferentes
3. Considere sinônimos, abreviações e contexto
4. Confiança:
   - 90-100: Certeza absoluta (ex: "CRM" = "Sistema CRM", "Bug login" = "Corrigir autenticação")
   - 70-89: Alta probabilidade (ex: "Integração" = "API terceiros", "Relatório" = "Dashboard métricas")
   - 0-69: Sem correspondência clara

FORMATO DE RESPOSTA (JSON):
{
  "matches": [
    {
      "parsed_index": 0,
      "existing_item_id": "uuid-do-item-manual" ou null,
      "confidence": 85,
      "reason": "Ambos se referem à integração do CRM",
      "suggested_status_update": "concluído" ou null,
      "context_to_add": "Texto adicional da transcrição para enriquecer descrição"
    }
  ]
}

IMPORTANTE:
- Se confiança < 70, retorne existing_item_id: null
- Priorize evitar duplicação sobre criar novos
- O array "matches" DEVE ter o mesmo tamanho que items da transcrição (${parsedItems.length} items)
- RESPONDA APENAS COM JSON VÁLIDO, SEM TEXTO ADICIONAL`;
}

/**
 * Enriquece descrição do item existente com contexto da transcrição
 */
function buildEnhancedDescription(
  existingItem: SprintItem,
  parsedItem: ParsedCheckinItem,
  match: AIMatchResult['matches'][0]
): string {
  const base = existingItem.description || '';
  const context = match.context_to_add || parsedItem.title;
  
  // Se não tem descrição base, usar contexto da transcrição
  if (!base) {
    return `${context} (do check-in)`;
  }
  
  // Se já contém o contexto, não duplicar
  if (base.includes(context)) {
    return base;
  }
  
  // Adicionar atualização do check-in
  return `${base}\n\nAtualização do check-in: ${context}`;
}

/**
 * Infere status do item baseado na análise da IA
 */
function inferStatus(
  parsedItem: ParsedCheckinItem,
  match: AIMatchResult['matches'][0]
): string {
  // Priorizar sugestão da IA
  if (match.suggested_status_update) {
    return match.suggested_status_update;
  }
  
  // Fallback: usar status do parsed item
  return parsedItem.status;
}
