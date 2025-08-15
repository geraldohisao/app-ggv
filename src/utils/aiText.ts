export function stripSourceTags(s: string): string {
  if (!s) return s as any;
  let out = s.replace(/\[#src:[^\]]+\]/g, '');
  // remove linhas "Fontes:" e "### Fontes" (modelo pode ecoar)
  out = out.replace(/^\s*(###\s+)?Fontes\s*:.*$/gmi, '');
  // remove referências inline como [Overview GGV parte 1], [Doc 1], etc.
  out = out.replace(/\[Overview [^\]]+\]/g, '');
  out = out.replace(/\[Doc \d+[^\]]*\]/g, '');
  out = out.replace(/\[[A-Z][a-zA-Z0-9\s]+\s+parte\s+\d+\]/gi, '');
  // remover marcadores genéricos como [src], [src, src], [#src:web:1]
  out = out.replace(/\[(?:#?src[^\]]*)\]/gi, '');
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
  
  // Melhorar estruturação com headers
  formatted = formatted
    // Transformar frases em headers quando apropriado
    .replace(/^(Análise|Diagnóstico|Resumo|Conclusão|Recomendações?|Estratégias?|Insights?|Resultados?)(\s*:?\s*)/gmi, '## $1\n\n')
    .replace(/^(Como|Onde|Quando|Por que|Quais?|O que)([^?\n]*\?)/gmi, '## $1$2\n')

    // Normalizar bullets: converter pontos médios/traços em '- ' para o renderer
    .replace(/^[\t\s]*[•–—]\s+/gm, '- ')
    // Normalizar listas ordenadas "1)" → "1."
    .replace(/^(\d+)\)\s+/gm, '$1. ')
    // Forçar H2 para títulos comuns
    .replace(/^\s*(As Quatro Etapas do SPIN|Defini[cç][aã]o|Aplic[aç][aã]o na GGV|Como funciona|Vis[aã]o Geral|Resumo)\b/gmi, '## $1')
    // Converter sub-seções comuns em H3
    .replace(/^\s*(Situa[cç][aã]o|Problema|Implic[aã]?[cç][aã]o|Necessidade)\s*:/gmi, '### $1\n')
    .replace(/^\s*(Situa[cç][aã]o|Problema|Implic[aã]?[cç][aã]o|Necessidade)\s*\n+/gmi, '### $1\n')
    
    // Enfatizar pontos importantes
    .replace(/\b(fundamental|essencial|crucial|vital)\b/gi, '**$1**')
    .replace(/\b(primeiro|segundo|terceiro|quarto|quinto)\b/gi, '**$1**')
    
    // Melhorar formatação de perguntas
    .replace(/\?([^?\n]*)\n/g, '?\n\n$1\n')
    // Inserir parágrafos após pontuação final seguida de maiúscula
    .replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÄËÏÖÜ])/g, '$1\n\n')
    // Remover linhas isoladas com ponto
    .replace(/^\s*\.$/gm, '')
    // Converter linhas curtas terminadas com ':' em H2
    .replace(/^(?=.{3,60}$)([A-ZÁÉÍÓÚÃÕÂÊÔÄËÏÖÜ][^:\n]{2,}):\s*$/gm, '## $1')
    // Negritar prefixos "Termo: texto" em parágrafos (sem cabeçalho)
    .replace(/^(?![#\-])([A-ZÁÉÍÓÚÃÕÂÊÔÄËÏÖÜ][^:\n]{2,40}):\s+/gm, '**$1**: ')
    
    // Limpar espaços extras
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Garantir um H1 no topo quando não houver
  if (!/^#{1,3}\s/m.test(formatted.slice(0, 10))) {
    const lines = formatted.split('\n');
    const first = (lines[0] || '').trim();
    let title = '';
    if (first.includes(':')) {
      title = first.split(':')[0].trim();
      lines[0] = first.substring(first.indexOf(':') + 1).trim();
    } else {
      title = first.split(/\s+/).slice(0, 6).join(' ');
      lines.shift();
    }
    if (title) {
      formatted = `# ${title}\n\n${lines.join('\n').trim()}`;
    }
  }
    
  return formatted;
}


