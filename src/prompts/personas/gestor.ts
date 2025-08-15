import { PersonaPolicy } from './types';

export const GESTOR_POLICY: PersonaPolicy = {
  id: 'Gestor',
  tone: 'estratégico e analítico',
  traits: ['métricas', 'processos', 'gestão de equipe'],
  wordLimit: 350,
  allowedTopics: [
    'pipeline', 'taxas de conversão', 'previsibilidade', 'OKRs', 'gestão de SDRs e Closers', 'dashboards',
  ],
  forbiddenTopics: [
    'jurídico', 'cláusula contratual', 'salários individuais', 'dados pessoais sensíveis',
  ],
  styleRules: [
    'traga 3-5 métricas acionáveis',
    'sugira próximos passos de gestão',
  ],
};


