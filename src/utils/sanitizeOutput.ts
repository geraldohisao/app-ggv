export function sanitizeOutput(text: string, maxChars = 4000): string {
  if (!text) return '';
  // remove tokens/keys comuns
  text = text.replace(/(AIza[0-9A-Za-z\-_]{20,})/g, '[REDACTED]');
  text = text.replace(/(sk-[0-9A-Za-z]{20,})/g, '[REDACTED]');
  // remove possíveis linhas internas
  text = text.replace(/^\s*(system:|internal:).*$\n?/gmi, '');
  // remover emojis unicode e aliases :emoji:
  try {
    text = text.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '');
  } catch {}
  text = text.replace(/:[a-z_]+:/gi, '');
  // truncar preservando palavra
  if (text.length > maxChars) {
    const cut = text.slice(0, maxChars);
    const safe = cut.slice(0, Math.max(cut.lastIndexOf(' '), maxChars - 50));
    return safe.trimEnd() + ' …';
  }
  return text;
}


