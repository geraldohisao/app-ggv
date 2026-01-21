// Placeholder retry helper (legacy).
export async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

// Alias para chamadas legadas
export const retrySupabaseOperation = retryWithBackoff;

