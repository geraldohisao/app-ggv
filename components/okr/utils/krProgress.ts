import type { KeyResult, KeyResultType, KeyResultDirection } from '../types/okr.types';
import { calculateKeyResultProgress } from '../types/okr.types';

/**
 * Calcula progresso de um Key Result
 * Wrapper para a lógica oficial (okr.types)
 */
export function calculateKRProgress(kr: KeyResult): number {
  return calculateKeyResultProgress(kr).percentage;
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
  switch (direction) {
    case 'increase': return '↑ Aumentar';
    case 'decrease': return '↓ Diminuir';
    case 'at_most': return '↕ No Máximo';
    case 'at_least': return '↕ No Mínimo';
    case 'in_between': return '⇅ Entre';
    default: return '';
  }
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

