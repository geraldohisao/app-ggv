/**
 * Utilitários para conversão de duração
 * Função centralizada para converter duration_formated
 */

// Função para converter HH:MM:SS para segundos
export function parseFormattedDuration(duration_formated: string): number {
  if (!duration_formated) return 0;

  try {
    const trimmed = duration_formated.trim();

    // Formato HH:MM:SS ou MM:SS
    const colonParts = trimmed.split(':');
    if (colonParts.length === 3 || colonParts.length === 2) {
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      if (colonParts.length === 3) {
        hours = parseInt(colonParts[0], 10) || 0;
        minutes = parseInt(colonParts[1], 10) || 0;
        seconds = parseInt(colonParts[2], 10) || 0;
      } else {
        minutes = parseInt(colonParts[0], 10) || 0;
        seconds = parseInt(colonParts[1], 10) || 0;
      }

      const total = hours * 3600 + minutes * 60 + seconds;
      return isFinite(total) && total >= 0 ? total : 0;
    }

    // Formato com sufixo (ex.: "10s", "5m 22s")
    const regex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i;
    const match = trimmed.match(regex);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      const total = hours * 3600 + minutes * 60 + seconds;
      if (total > 0) return total;
    }

    // Número puro em segundos
    const numeric = parseInt(trimmed, 10);
    if (isFinite(numeric) && numeric > 0) return numeric;
  } catch (error) {
    console.warn('Erro ao converter duration_formated:', duration_formated, error);
  }

  return 0;
}

// Função para obter duração real de uma chamada
export function getRealDuration(call: any): number {
  // ✅ PRIORIDADE CORRIGIDA: duration_formated é a fonte PRIMÁRIA (vem do sistema de telefonia)
  // 1. duration_formated (MAIS CONFIÁVEL - vem da API4COM/sistema)
  if (call.duration_formated && typeof call.duration_formated === 'string') {
    const parsed = parseFormattedDuration(call.duration_formated);
    if (parsed > 0) return parsed;
  }

  // 2. duration_seconds (se existir e for válido)
  if (typeof call.duration_seconds === 'number' && call.duration_seconds > 0) {
    return call.duration_seconds;
  }

  // 3. durationSec (campo legado)
  if (call.durationSec && call.durationSec > 0) {
    return call.durationSec;
  }

  // 4. duration (último fallback)
  if (typeof call.duration === 'number' && call.duration > 0) {
    return call.duration;
  }

  return 0;
}

// Função para formatar duração para exibição
export function formatDurationDisplay(call: any): string {
  const totalSeconds = getRealDuration(call);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutesStr}:${secondsStr}`;
  }

  return `${minutes}:${secondsStr}`;
}
