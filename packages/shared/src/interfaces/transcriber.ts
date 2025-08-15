export type DiarizedWord = {
  startSec: number;
  endSec: number;
  word: string;
  speaker?: string;
};

export type DiarizationSegment = {
  startSec: number;
  endSec: number;
  speaker: string;
};

export type TranscriptResult = {
  language: string;
  text: string;
  words: DiarizedWord[];
  diarization: DiarizationSegment[];
};

export interface Transcriber {
  transcribe(input: { url?: string; buffer?: Buffer; diarization: boolean; language: string }): Promise<TranscriptResult>;
}
