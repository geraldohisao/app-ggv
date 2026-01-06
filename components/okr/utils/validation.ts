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

  if (!map.objectives || map.objectives.length === 0) {
    errors.push({
      field: 'objectives',
      message: 'Adicione pelo menos 1 objetivo estratégico',
      severity: 'error'
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

