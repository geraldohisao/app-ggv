/**
 * Utilitários para conversão de duração
 * Função centralizada para converter duration_formated
 */

// Função para converter HH:MM:SS para segundos
export function parseFormattedDuration(duration_formated: string): number {
  if (!duration_formated || duration_formated === '00:00:00') {
    return 0;
  }
  
  try {
    const parts = duration_formated.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    
    const total = hours * 3600 + minutes * 60 + seconds;
    
    console.log(`🕐 Conversão: ${duration_formated} → ${total}s (${Math.floor(total/60)}m ${total%60}s)`);
    
    return total;
  } catch (error) {
    console.warn('Erro ao converter duration_formated:', duration_formated, error);
    return 0;
  }
}

// Função para obter duração real de uma chamada
export function getRealDuration(call: any): number {
  if (call.duration_formated) {
    return parseFormattedDuration(call.duration_formated);
  }
  return call.durationSec || call.duration || 0;
}

// Função para formatar duração para exibição
export function formatDurationDisplay(call: any): string {
  const totalSeconds = getRealDuration(call);
  
  if (totalSeconds === 0) return '0s';
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
