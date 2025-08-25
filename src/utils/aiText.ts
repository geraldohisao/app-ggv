export function stripSourceTags(s: string): string {
  if (!s) return s as any;
  let out = s.replace(/\[#src:[^\]]+\]/g, '');
  // remove linhas "Fontes:" e "### Fontes" (modelo pode ecoar)
  out = out.replace(/^\s*(###\s+)?Fontes\s*:.*$/gmi, '');
  // remover bloco inteiro de Fontes até o fim
  out = out.replace(/(?:^|\n)#{0,3}\s*Fontes?:[\s\S]*$/i, '');
  // remove referências inline como [Overview GGV parte 1], [Doc 1], etc.
  out = out.replace(/\[Overview [^\]]+\]/g, '');
  out = out.replace(/\[Doc \d+[^\]]*\]/g, '');
  out = out.replace(/\[[A-Z][a-zA-Z0-9\s]+\s+parte\s+\d+\]/gi, '');
  // remover marcadores genéricos como [src], [src, src], [#src:web:1]
  out = out.replace(/\[(?:#?src[^\]]*)\]/gi, '');
  // remover sobras de overview_ggv_parte_X
  out = out.replace(/\(\s*overview_ggv_parte_?\d+\s*\)/gi, '');
  out = out.replace(/\boverview_ggv_parte_?\d+\b/gi, '');
  // remover linhas que são apenas nomes de arquivos (pdf/doc/ppt/xlsx/md)
  out = out.replace(/^[\t\s]*[-•]?\s*[\w\s\-–—_]+\.(pdf|docx?|pptx?|xlsx|md)\s*$/gmi, '');
  // normalizar espaços múltiplos e quebras de linha excessivas
  out = out
    .replace(/\s+\./g, '.') // remove espaço antes de ponto
    .replace(/\.{2,}/g, '.') // colapsa ".." → "."
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

export function formatAIResponse(text: string): string {
  if (!text) return text;
  
  // Aplicar stripSourceTags primeiro
  let formatted = stripSourceTags(text);
  
  // Normalizar bullets e listas
  formatted = formatted
    .replace(/^[\t\s]*[•–—]\s+/gm, '- ')
    // Normalizar listas ordenadas "1)" → "1."
    .replace(/^(\d+)\)\s+/gm, '$1. ')
    
    // Enfatizar pontos importantes
    .replace(/\b(fundamental|essencial|crucial|vital)\b/gi, '**$1**')
    .replace(/\b(primeiro|segundo|terceiro|quarto|quinto)\b/gi, '**$1**')
    
    // Melhorar formatação de perguntas
    .replace(/\?([^?\n]*)\n/g, '?\n\n$1\n')
    // Inserir parágrafos após pontuação final seguida de maiúscula
    .replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÄËÏÖÜ])/g, '$1\n\n')
    // Remover linhas isoladas com ponto
    .replace(/^\s*\.$/gm, '')
    // Negritar prefixos "Termo: texto" em parágrafos (sem cabeçalho)
    .replace(/^(?![#\-])([A-ZÁÉÍÓÚÃÕÂÊÔÄËÏÖÜ][^:\n]{2,40}):\s+/gm, '**$1**: ')
    
    // Limpar espaços extras
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Se o modelo colocou "##" no meio da linha, quebrar para um novo parágrafo
  formatted = formatted.replace(/([^\n])\s+(#{1,3})\s+/g, '$1\n\n$2 ');

  // Rebaixar cabeçalhos muito longos para parágrafos em negrito (mais fluidez)
  formatted = formatted
    .replace(/^###\s+([^\n]{100,})$/gm, '**$1**')
    .replace(/^##\s+([^\n]{100,})$/gm, '**$1**');

  // Remover citações/códigos de referência entre parênteses com Playbook/.pdf/etc
  formatted = formatted.replace(/\s*\((?:[^()]*\b(?:Playbook|GGV-|\.pdf)\b[^()]*)\)\s*/gi, ' ');

  // Limpar ** soltos e normalizar marcadores BANT
  formatted = formatted
    // Remover '**' no início de linhas inteiras e no fim da linha
    .replace(/^\s*\*\*\s*/gm, '')
    .replace(/\s*\*\*\s*$/gm, '')
    .replace(/\s*\*\*(?=\s|$)/g, '') // remove ** soltos
    .replace(/\b(Budget|Authority|Need|Time)\s*:\s*\*\*/gi, '$1: ') // ex: Budget:** → Budget:
    .replace(/^\*\*([^\n]{80,})\*\*$/gm, '$1'); // negrito muito longo vira parágrafo

  // Normalizar rótulos comuns sem dois-pontos (mantendo layout em PT-BR)
  formatted = formatted
    // Cabeçalhos de seção em linha → negrito com dois-pontos
    .replace(/^\s*(Resposta)\s+(?=\S)/gmi, '**$1**: ')
    .replace(/^\s*(Análise)\s+(?=\S)/gmi, '**$1**: ')
    .replace(/^\s*(Próximos\s+Passos)\s+(?=\S)/gmi, '**$1**: ')
    // Se o modelo vier como “Análise Essa informação …”, converte para “**Análise**: Essa informação …”
    .replace(/^\s*(Análise)\s+(Essa|Este|Isto)\b/gmi, '**$1**: $2')
    // Garantir quebra de parágrafo antes de rótulos conhecidos
    .replace(/\s*(\n|^)\s*(\*\*Resposta\*\*:\s*)/g, '\n\n$2')
    .replace(/\s*(\n|^)\s*(\*\*Análise\*\*:\s*)/g, '\n\n$2')
    .replace(/\s*(\n|^)\s*(\*\*Próximos\s+Passos\*\*:\s*)/g, '\n\n$2')
    // Corrigir linhas iniciadas com heading (##/###) seguidas dos rótulos acima
    .replace(/^(?:#{1,3}\s*)\s*(Resposta|Análise|Próximo\s+Passo|Próximos\s+Passos|Conclusão|Resumo|Observação|Notas?)\b\s*:?(?=\s|\b)/gmi, '**$1**:')
    // Caso ainda falte espaço após inserir ':'
    .replace(/\*\*(Resposta|Análise|Próximo\s+Passo|Próximos\s+Passos|Conclusão|Resumo|Observação|Notas?)\*\*:(?!\s)/gmi, '**$1**: ')
    // Linhas simples iniciando diretamente com os rótulos (sem heading)
    .replace(/^\s*(Resposta|Análise|Próximo\s+Passo|Próximos\s+Passos|Conclusão|Resumo|Observação|Notas?)\b\s*:?(?=\s|\b)/gmi, '**$1**:');

  return formatted;
}


