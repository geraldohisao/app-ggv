import { Transcriber, TranscriptResult } from '@calls-mvp/shared';
import { env } from '@calls-mvp/shared';

class StubTranscriber implements Transcriber {
  async transcribe(): Promise<TranscriptResult> {
    return { language: 'pt-BR', text: 'Transcrição de exemplo', words: [], diarization: [] };
  }
}

class DeepgramTranscriber implements Transcriber {
  async transcribe(input: { url?: string; buffer?: Buffer; diarization: boolean; language: string }): Promise<TranscriptResult> {
    // Minimal call placeholder; replace with real Deepgram SDK/API usage
    return { language: input.language, text: '', words: [], diarization: [] };
  }
}

export async function createTranscriber(): Promise<Transcriber> {
  if (env.useTranscriber === 'deepgram' && env.providers.deepgramKey) return new DeepgramTranscriber();
  if (env.useTranscriber === 'whisper') return new StubTranscriber(); // replace with Whisper provider later
  return new StubTranscriber();
}
