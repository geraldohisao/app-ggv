/**
 * ✅ MELHORIA: Validação de qualidade da transcrição
 * Avalia se uma transcrição tem qualidade suficiente para análise IA
 */

export interface TranscriptionQuality {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  segments: number;
  avgSegmentLength: number;
  containsDialog: boolean;
  languageQuality: 'low' | 'medium' | 'high';
}

/**
 * Avaliar qualidade da transcrição
 */
export function validateTranscriptionQuality(transcription: string): TranscriptionQuality {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. Verificações básicas
  if (!transcription || transcription.trim().length === 0) {
    return {
      isValid: false,
      score: 0,
      issues: ['Transcrição vazia'],
      recommendations: ['Verificar se o áudio foi processado corretamente'],
      segments: 0,
      avgSegmentLength: 0,
      containsDialog: false,
      languageQuality: 'low'
    };
  }

  // 2. Análise de segmentos
  const segments = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const segmentCount = segments.length;
  const avgSegmentLength = segments.reduce((sum, s) => sum + s.length, 0) / segmentCount;

  if (segmentCount < 5) {
    issues.push('Muito poucos segmentos (< 5)');
    recommendations.push('Ligações muito curtas podem ter análise imprecisa');
    score -= 20;
  }

  if (avgSegmentLength < 10) {
    issues.push('Segmentos muito curtos');
    recommendations.push('Pode indicar transcrição fragmentada');
    score -= 15;
  }

  // 3. Verificar se contém diálogo
  const dialogIndicators = [
    /\b(eu|você|nós|vocês)\b/gi,
    /\b(obrigad|por favor|desculp)\b/gi,
    /\b(bom dia|boa tarde|boa noite)\b/gi,
    /\?/g,
    /\b(sim|não|talvez)\b/gi
  ];

  const dialogScore = dialogIndicators.reduce((sum, pattern) => {
    const matches = transcription.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  const containsDialog = dialogScore > 3;
  if (!containsDialog) {
    issues.push('Pouco diálogo detectado');
    recommendations.push('Verificar se a transcrição capturou ambos os participantes');
    score -= 25;
  }

  // 4. Qualidade da linguagem
  const badPatterns = [
    /\[inaudível\]/gi,
    /\[ruído\]/gi,
    /\.\.\./g,
    /\b(ahn|uhm|hmm)\b/gi,
    /\b[a-z]{1,2}\b/g // Palavras muito curtas podem indicar má transcrição
  ];

  let badMatches = 0;
  badPatterns.forEach(pattern => {
    const matches = transcription.match(pattern);
    badMatches += matches ? matches.length : 0;
  });

  const badRatio = badMatches / transcription.length;
  let languageQuality: 'low' | 'medium' | 'high' = 'high';

  if (badRatio > 0.1) {
    languageQuality = 'low';
    issues.push('Qualidade de transcrição baixa (muitos ruídos)');
    recommendations.push('Considerar melhorar qualidade do áudio');
    score -= 30;
  } else if (badRatio > 0.05) {
    languageQuality = 'medium';
    issues.push('Qualidade de transcrição média');
    score -= 10;
  }

  // 5. Verificar comprimento mínimo
  if (transcription.length < 100) {
    issues.push('Transcrição muito curta (< 100 caracteres)');
    recommendations.push('Ligações muito curtas podem não ter conteúdo suficiente para análise');
    score -= 20;
  }

  // 6. Verificar se contém informações comerciais
  const businessIndicators = [
    /\b(produto|serviço|solução|proposta|orçamento|preço|valor|investimento)\b/gi,
    /\b(empresa|negócio|mercado|cliente|fornecedor)\b/gi,
    /\b(reunião|apresentação|demonstração|demo)\b/gi,
    /\b(interesse|necessidade|problema|desafio)\b/gi
  ];

  const businessScore = businessIndicators.reduce((sum, pattern) => {
    const matches = transcription.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  if (businessScore === 0) {
    issues.push('Nenhum conteúdo comercial detectado');
    recommendations.push('Verificar se a ligação é realmente comercial');
    score -= 15;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const isValid = finalScore >= 60 && segmentCount >= 5 && containsDialog;

  return {
    isValid,
    score: finalScore,
    issues,
    recommendations,
    segments: segmentCount,
    avgSegmentLength: Math.round(avgSegmentLength),
    containsDialog,
    languageQuality
  };
}

/**
 * Verificar se transcrição deve ser analisada
 */
export function shouldAnalyzeTranscription(transcription: string): { should: boolean; reason: string } {
  const quality = validateTranscriptionQuality(transcription);
  
  if (!quality.isValid) {
    return {
      should: false,
      reason: `Qualidade insuficiente (${quality.score}/100): ${quality.issues.join(', ')}`
    };
  }

  return {
    should: true,
    reason: `Qualidade adequada (${quality.score}/100)`
  };
}
