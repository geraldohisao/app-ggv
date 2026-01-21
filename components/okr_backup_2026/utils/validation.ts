import { StrategicMap } from '../../../types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Valida um mapa estratégico antes de salvar
 */
export const validateStrategicMap = (map: StrategicMap): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!map.company_name?.trim()) {
    errors.push({
      field: 'company_name',
      message: 'Nome da empresa é obrigatório',
      severity: 'error'
    });
  }

  if (!map.mission?.trim()) {
    errors.push({
      field: 'mission',
      message: 'Missão da empresa não está definida',
      severity: 'warning'
    });
  }

  if (!map.vision?.trim()) {
    errors.push({
      field: 'vision',
      message: 'Visão da empresa não está definida',
      severity: 'warning'
    });
  }

  // OKRs obrigatórios
  if (!map.okrs || map.okrs.length === 0) {
    errors.push({
      field: 'okrs',
      message: 'Adicione pelo menos 1 OKR com seus Key Results',
      severity: 'error'
    });
  } else {
    map.okrs.forEach((okr, idx) => {
      if (!okr.title?.trim()) {
        errors.push({
          field: `okrs[${idx}].title`,
          message: `OKR ${idx + 1} sem título`,
          severity: 'error'
        });
      }
      if (!okr.keyResults || okr.keyResults.length === 0) {
        errors.push({
          field: `okrs[${idx}].keyResults`,
          message: `OKR ${idx + 1} precisa de pelo menos 1 Key Result`,
          severity: 'error'
        });
      } else {
        okr.keyResults.forEach((kr, krIdx) => {
          if (!kr.name?.trim()) {
            errors.push({
              field: `okrs[${idx}].keyResults[${krIdx}].name`,
              message: `Key Result ${krIdx + 1} do OKR ${idx + 1} está vazio`,
              severity: 'error'
            });
          }
        });
      }
    });
  }

  // Objetivos legados (aviso apenas, não bloqueia)
  if (map.objectives && map.objectives.length === 0) {
    errors.push({
      field: 'objectives',
      message: 'Objetivos estratégicos não foram definidos (opcional, legado)',
      severity: 'warning'
    });
  }

  return errors;
};

export const hasBlockingErrors = (errors: ValidationError[]): boolean => {
  return errors.some(err => err.severity === 'error');
};

export const formatValidationErrors = (errors: ValidationError[]): string => {
  const errorMessages = errors
    .filter(err => err.severity === 'error')
    .map(err => `• ${err.message}`)
    .join('\n');

  const warningMessages = errors
    .filter(err => err.severity === 'warning')
    .map(err => `• ${err.message}`)
    .join('\n');

  let message = '';

  if (errorMessages) {
    message += '❌ ERROS:\n' + errorMessages;
  }

  if (warningMessages) {
    if (message) message += '\n\n';
    message += '⚠️ AVISOS:\n' + warningMessages;
  }

  return message;
};

