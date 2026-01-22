/**
 * Serviço de Parser de Check-in
 * Extrai bullet points dos campos de texto do check-in e converte em sprint_items estruturados
 */

import type { SprintCheckin } from './checkin.service';

export interface ParsedCheckinItem {
  type: 'iniciativa' | 'impedimento' | 'decisão';
  title: string;
  status: 'concluído' | 'pendente' | 'em andamento';
  source_field: string; // Campo de origem (achievements, blockers, etc)
}

/**
 * Extrai bullet points de um texto e converte em array de strings
 */
function extractBulletPoints(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Aceitar linhas que começam com: •, -, números (1., 2., etc)
      return line.startsWith('•') || 
             line.startsWith('-') || 
             line.startsWith('*') ||
             /^\d+\./.test(line);
    })
    .map(line => {
      // Remover prefixos de bullet point
      return line.replace(/^[•\-*\d]+\.?\s*/, '');
    })
    .filter(line => line.length >= 3); // Ignorar linhas muito curtas
}

/**
 * Fallback: extrai itens mesmo sem bullets explícitos.
 * Aceita linhas não vazias ou separadores por ponto e vírgula.
 */
function extractLooseItems(text: string): string[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length >= 3);

  if (lines.length > 1) {
    return lines;
  }

  return text
    .split(';')
    .map(part => part.trim())
    .filter(part => part.length >= 3);
}

/**
 * Limpa o título removendo markdown, emojis excessivos e limitando tamanho
 */
function cleanTitle(title: string): string {
  return title
    .replace(/[*_~`]/g, '') // Remove markdown
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .substring(0, 100) // Limita a 100 caracteres
    .trim();
}

/**
 * Converte check-in em lista de items estruturados
 * Extrai bullet points dos campos de texto e cria ParsedCheckinItem
 */
export function parseCheckinToItems(checkin: SprintCheckin, scope: 'execucao' | 'governanca' = 'execucao'): ParsedCheckinItem[] {
  const items: ParsedCheckinItem[] = [];
  
  if (scope === 'execucao') {
    // ===== EXECUÇÃO =====
    
    // 1. Extrair INICIATIVAS de "achievements" (concluídas)
    if (checkin.achievements) {
      const lines = extractBulletPoints(checkin.achievements);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.achievements) : [];
      items.push(...lines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'concluído' as const,
        source_field: 'achievements'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'concluído' as const,
        source_field: 'achievements'
      })));
    }
    
    // 2. Extrair IMPEDIMENTOS de "blockers" (pendentes/abertos)
    if (checkin.blockers) {
      const lines = extractBulletPoints(checkin.blockers);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.blockers) : [];
      items.push(...lines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'blockers'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'blockers'
      })));
    }
    
    // 3. Extrair DECISÕES de "decisions_taken" (concluídas)
    if (checkin.decisions_taken) {
      const lines = extractBulletPoints(checkin.decisions_taken);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.decisions_taken) : [];
      items.push(...lines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(title),
        status: 'concluído' as const,
        source_field: 'decisions_taken'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(title),
        status: 'concluído' as const,
        source_field: 'decisions_taken'
      })));
    }
    
    // 4. Extrair INICIATIVAS de "next_focus" (pendentes para próximo ciclo)
    if (checkin.next_focus) {
      const lines = extractBulletPoints(checkin.next_focus);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.next_focus) : [];
      items.push(...lines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'next_focus'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'next_focus'
      })));
    }
    
  } else {
    // ===== GOVERNANÇA =====
    
    // 1. Extrair INICIATIVAS de "keep_doing" (práticas para manter)
    if (checkin.keep_doing) {
      const lines = extractBulletPoints(checkin.keep_doing);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.keep_doing) : [];
      items.push(...lines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'em andamento' as const,
        source_field: 'keep_doing'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(title),
        status: 'em andamento' as const,
        source_field: 'keep_doing'
      })));
    }
    
    // 2. Extrair DECISÕES de "stop_doing" (descontinuar)
    if (checkin.stop_doing) {
      const lines = extractBulletPoints(checkin.stop_doing);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.stop_doing) : [];
      items.push(...lines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(`Descontinuar: ${title}`),
        status: 'concluído' as const,
        source_field: 'stop_doing'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(`Descontinuar: ${title}`),
        status: 'concluído' as const,
        source_field: 'stop_doing'
      })));
    }
    
    // 3. Extrair INICIATIVAS de "adjust_doing" (ajustar)
    if (checkin.adjust_doing) {
      const lines = extractBulletPoints(checkin.adjust_doing);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.adjust_doing) : [];
      items.push(...lines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(`Ajustar: ${title}`),
        status: 'pendente' as const,
        source_field: 'adjust_doing'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'iniciativa' as const,
        title: cleanTitle(`Ajustar: ${title}`),
        status: 'pendente' as const,
        source_field: 'adjust_doing'
      })));
    }
    
    // 4. Extrair IMPEDIMENTOS de "identified_risks" (riscos)
    if (checkin.identified_risks) {
      const lines = extractBulletPoints(checkin.identified_risks);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.identified_risks) : [];
      items.push(...lines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(`Risco: ${title}`),
        status: 'pendente' as const,
        source_field: 'identified_risks'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(`Risco: ${title}`),
        status: 'pendente' as const,
        source_field: 'identified_risks'
      })));
    }
    
    // 5. Extrair DECISÕES de "strategic_recommendations"
    if (checkin.strategic_recommendations) {
      const lines = extractBulletPoints(checkin.strategic_recommendations);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.strategic_recommendations) : [];
      items.push(...lines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'strategic_recommendations'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'decisão' as const,
        title: cleanTitle(title),
        status: 'pendente' as const,
        source_field: 'strategic_recommendations'
      })));
    }
    
    // 6. Extrair IMPEDIMENTOS de "okr_misalignments" (desalinhamentos)
    if (checkin.okr_misalignments) {
      const lines = extractBulletPoints(checkin.okr_misalignments);
      const fallbackLines = lines.length === 0 ? extractLooseItems(checkin.okr_misalignments) : [];
      items.push(...lines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(`Desalinhamento: ${title}`),
        status: 'pendente' as const,
        source_field: 'okr_misalignments'
      })));
      items.push(...fallbackLines.map(title => ({
        type: 'impedimento' as const,
        title: cleanTitle(`Desalinhamento: ${title}`),
        status: 'pendente' as const,
        source_field: 'okr_misalignments'
      })));
    }
  }
  
  console.log(`📋 Parser extraiu ${items.length} items do check-in (${scope})`);
  return items;
}
