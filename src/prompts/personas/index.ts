import { PersonaPolicy } from './types';
import { SDR_POLICY } from './sdr';
import { CLOSER_POLICY } from './closer';
import { GESTOR_POLICY } from './gestor';

const SAFE_DEFAULT: PersonaPolicy = {
  id: 'SDR',
  tone: 'profissional',
  traits: ['consultivo'],
  wordLimit: 500,
  allowedTopics: [],
  forbiddenTopics: ['dados sensíveis', 'cláusula contratual', 'jurídico'],
  styleRules: [],
};

const map: Record<string, PersonaPolicy> = {
  SDR: SDR_POLICY,
  Closer: CLOSER_POLICY,
  Gestor: GESTOR_POLICY,
};

export function getPersonaPolicy(id: string): PersonaPolicy {
  return map[id] || SAFE_DEFAULT;
}


