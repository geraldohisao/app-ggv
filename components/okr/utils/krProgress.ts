import type { KeyResult, KeyResultType, KeyResultDirection } from '../types/okr.types';

/**
 * Calcula progresso para metas que AUMENTAM (mais é melhor)
 * Ex: Aumentar receita de 1M para 2M
 */
function calculateProgressIncreasing(
  start: number,
  current: number,
  target: number
): number {
  if (target === start) return current >= target ? 100 : 0;
  const raw = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Calcula progresso para metas que DIMINUEM (menos é melhor)
 * Ex: Reduzir churn de 10% para 5%
 */
function calculateProgressDecreasing(
  start: number,
  current: number,
  target: number
): number {
  if (start === target) return current <= target ? 100 : 0;
  const raw = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Calcula progresso de um Key Result
 * Suporta: numeric, percentage, currency, activity
 * Suporta: increase, decrease
 */
export function calculateKRProgress(kr: KeyResult): number {
  // Atividade: usar activity_progress (0-100) se disponível, senão fallback para boolean
  if (kr.type === 'activity') {
    if (kr.activity_progress !== null && kr.activity_progress !== undefined) {
      return Math.max(0, Math.min(100, kr.activity_progress));
    }
    return kr.activity_done ? 100 : 0; // Backward compatibility
  }

  const start = kr.start_value ?? 0;
  const current = kr.current_value ?? 0;
  const target = kr.target_value ?? 0;

  console.log(`📊 Calculando progresso do KR "${kr.title}":`, {
    type: kr.type,
    direction: kr.direction,
    start,
    current,
    target
  });

  // Sem direção: usar lógica simples (backward compatibility)
  if (!kr.direction) {
    console.log('⚠️ KR sem direção, usando lógica simples');
    if (target === 0) return 0;
    const raw = (current / target) * 100;
    const result = Math.max(0, Math.min(100, raw));
    console.log(`📊 Progresso calculado (sem direção): ${result}%`);
    return result;
  }

  // Com direção: usar lógica apropriada
  if (kr.direction === 'increase') {
    // Para aumento: progresso absoluto (atual / meta), ignorando baseline
    if (target === 0) return 0;
    const result = (current / target) * 100;
    const clamped = Math.max(0, Math.min(150, result)); // Permite overperformance até 150%
    console.log(`📊 Progresso calculado (increase - absoluto): ${clamped}%`);
    return clamped;
  }

  if (kr.direction === 'decrease') {
    // Para redução: progresso desde baseline (DE → PARA)
    const result = calculateProgressDecreasing(start, current, target);
    console.log(`📊 Progresso calculado (decrease - baseline): ${result}%`);
    return result;
  }

  return 0;
}

/**
 * Formata valor do KR com unidade apropriada
 */
export function formatKRValue(value: number | null | undefined, type: KeyResultType, unit?: string): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(1)}%`;
    
    case 'numeric':
    default:
      return unit ? `${value} ${unit}` : value.toString();
  }
}

/**
 * Retorna label da direção
 */
export function getDirectionLabel(direction?: KeyResultDirection): string {
  if (!direction) return '';
  return direction === 'increase' ? '🔼 Aumentar' : '🔽 Diminuir';
}

/**
 * Retorna label do tipo
 */
export function getTypeLabel(type: KeyResultType): string {
  const labels: Record<KeyResultType, string> = {
    numeric: 'Quantidade',
    percentage: 'Percentual (%)',
    currency: 'Valor em R$',
    activity: 'Atividade',
  };
  return labels[type];
}

/**
 * Calcula status automático baseado no progresso
 */
export function calculateAutoStatus(progress: number): 'verde' | 'amarelo' | 'vermelho' {
  if (progress >= 85) return 'verde';
  if (progress >= 75) return 'amarelo';
  return 'vermelho';
}

