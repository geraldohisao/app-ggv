export function validateJson(payload: any, schema: any): { ok: boolean; error?: string } {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    // Minimal validation: if a Zod schema is provided use it, otherwise accept any
    if (schema && typeof (schema as any).parse === 'function') {
      (schema as any).parse(data);
      return { ok: true };
    }
    // If JSON-schema-like object is provided, do a shallow structural check for required keys
    if (schema && typeof schema === 'object' && Array.isArray((schema as any).required)) {
      const missing = (schema as any).required.filter((k: string) => (data as any)?.[k] === undefined);
      if (missing.length) return { ok: false, error: `missing: ${missing.join(',')}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'invalid_json' };
  }
}


