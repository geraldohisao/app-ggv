export interface CRMClient {
  pushCall(callId: string): Promise<{ status: 'sent' | 'error'; errorMsg?: string }>;
}
