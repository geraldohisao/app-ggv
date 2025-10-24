export type CallStatus = 'received' | 'processing' | 'processed' | 'failed' | 'answered' | 'missed' | 'voicemail' | 'analyzed';

export interface SdrUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  callCount?: number;
}

export interface CallItem {
  id: string;
  company: string;
  dealCode: string;
  sdr: SdrUser;
  date: string; // ISO
  created_at?: string; // Alias for date
  durationSec: number;
  duration_formated?: string;
  status: CallStatus;
  status_voip?: string; // Status VOIP original
  status_voip_friendly?: string; // Status VOIP amigável
  score?: number; // 0-100
  // Campos extras para funcionalidades avançadas
  audio_url?: string;
  recording_url?: string; // URL do áudio da gravação
  transcription?: string;
  person_name?: string;
  person_email?: string;
  to_number?: string; // Número de telefone do contato
  from_number?: string; // Número de origem
  call_type?: string; // Tipo de ligação
  direction?: string; // Direção da ligação
  analysis_summary?: string;
  analysis_confidence?: number;
  analysis_processed_at?: string;
}

export interface ScorecardCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage
}

export interface ScorecardDefinition {
  id: string;
  name: string;
  conversationType: string;
  callType: string; // Tipo de ligação para vinculação automática
  updatedAt: string; // ISO
  active: boolean;
  criteria: ScorecardCriterion[];
}

export interface AiInsight {
  title: string;
  content: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}


