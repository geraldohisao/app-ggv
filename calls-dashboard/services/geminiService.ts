import { AiInsight, CallItem } from '../types';

// Mocked AI service to keep app self-contained.
export async function analyzeCallWithAI(call: CallItem): Promise<AiInsight[]> {
  await new Promise((r) => setTimeout(r, 200));
  const base: AiInsight[] = [
    { title: 'Abertura clara', content: 'A SDR se apresentou de forma profissional.', severity: 'success' },
    { title: 'Exploração de necessidades', content: 'Poderia aprofundar a necessidade do prospect.', severity: 'warning' },
    { title: 'Próximos passos', content: 'Encaminhou agenda para follow-up.', severity: 'info' },
  ];
  if (typeof call.score === 'number' && call.score < 70) {
    base.push({ title: 'Objeções', content: 'Houve dificuldade ao contornar objeções específicas.', severity: 'error' });
  }
  return base;
}


