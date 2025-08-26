export type CallStatus = 'answered' | 'missed' | 'voicemail' | 'processing' | 'analyzed';

export interface SdrUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CallItem {
  id: string;
  company: string;
  dealCode: string;
  sdr: SdrUser;
  date: string; // ISO
  durationSec: number;
  status: CallStatus;
  score?: number; // 0-100
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
  updatedAt: string; // ISO
  active: boolean;
  criteria: ScorecardCriterion[];
}

export interface AiInsight {
  title: string;
  content: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}


