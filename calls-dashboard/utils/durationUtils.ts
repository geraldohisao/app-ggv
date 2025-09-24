/**
 * Utilitários para conversão de duração
 * Função centralizada para converter duration_formated
 */

// Função para converter HH:MM:SS para segundos
export function parseFormattedDuration(duration_formated: string): number {
  if (!duration_formated) return 0;

  try {
    const parts = duration_formated.split(':');
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 3) {
      // HH:MM:SS
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
      seconds = parseInt(parts[2]) || 0;
    } else if (parts.length === 2) {
      // MM:SS
      minutes = parseInt(parts[0]) || 0;
      seconds = parseInt(parts[1]) || 0;
    } else if (parts.length === 1) {
      // SS
      seconds = parseInt(parts[0]) || 0;
    }

    const total = hours * 3600 + minutes * 60 + seconds;
    return isFinite(total) && total >= 0 ? total : 0;
  } catch (error) {
    console.warn('Erro ao converter duration_formated:', duration_formated, error);
    return 0;
  }
}

// Função para obter duração real de uma chamada
export function getRealDuration(call: any): number {
  // Prioridade: duration_formated (fonte confiável) > durationSec > duration (fallback)
  if (call.duration_formated && typeof call.duration_formated === 'string') {
    const parsed = parseFormattedDuration(call.duration_formated);
    if (parsed > 0) return parsed;
  }

  if (call.durationSec && call.durationSec > 0) {
    return call.durationSec;
  }

  // Atenção: alguns datasets gravam "duration" em minutos. Se for um valor pequeno (<= 30)
  // e não houver duration_formated, assumimos que está em minutos e convertemos para segundos.
  if (typeof call.duration === 'number') {
    if (call.duration > 0 && call.duration <= 30) {
      return call.duration * 60;
    }
    return call.duration; // já em segundos em datasets corretos
  }

  return 0;
}

// Função para formatar duração para exibição
export function formatDurationDisplay(call: any): string {
  const totalSeconds = getRealDuration(call);
  if (totalSeconds === 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}
