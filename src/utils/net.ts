export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number; // number of retries after the first attempt (idempotent only)
  retryBackoffMs?: number; // base backoff
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 5000, retries = 0, retryBackoffMs = 400, ...init } = options;

  const attempt = async (attemptIndex: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!res.ok && attemptIndex < retries) {
        // Quick exponential backoff for transient errors
        const delay = retryBackoffMs * Math.pow(2, attemptIndex) + Math.round(Math.random() * 150);
        await new Promise(r => setTimeout(r, delay));
        return attempt(attemptIndex + 1);
      }
      return res;
    } catch (err: any) {
      if ((err?.name === 'AbortError' || String(err?.message || '').includes('timeout')) && attemptIndex < retries) {
        const delay = retryBackoffMs * Math.pow(2, attemptIndex) + Math.round(Math.random() * 150);
        await new Promise(r => setTimeout(r, delay));
        return attempt(attemptIndex + 1);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  return attempt(0);
}


