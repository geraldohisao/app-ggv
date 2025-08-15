export interface Storage {
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<{ key: string; url?: string }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
