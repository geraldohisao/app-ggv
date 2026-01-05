export type TalentRole = 'COLLAB' | 'LEADER' | 'HR' | 'ADMIN';

export type PdiStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'IN_PROGRESS' | 'DONE';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'LATE';

export interface TalentUser {
  id: string;
  name: string;
  email?: string;
  role: TalentRole;
  position: string;
  userFunction?: string;
  leaderId?: string;
  team?: string;
}

export interface PdiObjective {
  id: string;
  title: string;
  keyResults: {
    id: string;
    text: string;
    done?: boolean;
    target?: number;
  }[];
  progress: number; // 0-100
}

export interface DevelopmentAction {
  id: string;
  type: 'SOFT' | 'HARD';
  title: string;
  owner: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
}

export interface PdiRecord {
  id: string;
  userId: string;
  cycle: string;
  diagnostic: string;
  status: PdiStatus;
  objectives: PdiObjective[];
  developmentPlan: DevelopmentAction[];
  progress: number;
  history?: string[];
}

export interface TalentTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  pdiId?: string;
  dueDate?: string;
  lane?: 'backlog' | 'doing' | 'done' | 'late';
}

export interface PerformanceAssessment {
  id: string;
  userId: string;
  period: string; // e.g. 2025-01
  technicalScore: number; // 0-50
  behavioralScore: number; // 0-50
  totalScore: number; // 0-100
  comments?: string;
  assessedBy?: string;
}

export interface NineBoxEntry {
  id: string;
  userId: string;
  cycle: string;
  performanceScore: 1 | 2 | 3;
  potentialScore: 1 | 2 | 3;
  quadrant: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  leaderId?: string;
  date: string;
  advances: string;
  blocks: string;
  motivationScore: number;
  emotionalState?: 'Baixo' | 'Médio' | 'Alto' | string;
  indicators?: string;
  tasksReview?: string;
  planNext15?: string;
}

export interface Alignment {
  id: string;
  userId: string;
  leaderId?: string;
  date: string;
  topic: string;
  category: 'Técnico' | 'Processo' | 'Comportamental' | 'Estratégico';
  criticality: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  fromUserId?: string;
  type: 'AUTO' | 'MANAGER' | 'PEER';
  date: string;
  content: string;
  managerRating?: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SurveyAnalysis {
  id: string;
  surveyId: string;
  createdAt: string;
  summary: string;
  kpis: Record<string, number>;
  sentimentDistribution: SentimentDistribution;
  strengths: string[];
  weaknesses: string[];
  quotes: string[];
  recommendations: string[];
}

export interface TalentState {
  users: TalentUser[];
  pdis: PdiRecord[];
  tasks: TalentTask[];
  assessments: PerformanceAssessment[];
  checkIns: CheckIn[];
  alignments: Alignment[];
  feedbacks: FeedbackRecord[];
  surveyAnalysis?: SurveyAnalysis;
  nineBox: NineBoxEntry[];
  currentCycle: string;
}

