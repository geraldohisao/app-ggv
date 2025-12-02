
// Adiciona a definição de tipo para o objeto de configuração global
// que será injetado no index.html
declare global {
  interface Window {
    APP_CONFIG: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    }
  }
}

export enum Module {
  Login = 'LOGIN',
  Diagnostico = 'DIAGNOSTICO',
  Assistente = 'ASSISTENTE',
  Calculadora = 'CALCULADORA',
  Settings = 'SETTINGS',
  OpportunityFeedback = 'OPPORTUNITY_FEEDBACK',
  Calls = 'CALLS',
  ReativacaoLeads = 'REATIVACAO_LEADS',
}

export enum UserRole {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  User = 'USER',
}

export interface User {
  id: string; // From Supabase Auth
  email: string;
  name: string;
  initials: string;
  role: UserRole;
  user_function?: 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing'; // Função comercial do usuário
}

export interface CompanyData {
    companyName: string;
    email: string;
    activityBranch: string; // This will now hold the segment name
    monthlyBilling: string;
    salesTeamSize: string;
    salesChannels: string[];
    activitySector?: string; // Setor de atuação
    // 🆕 NOVOS CAMPOS DO PIPEDRIVE
    situacao?: string;        // Situação atual da empresa
    problema?: string;        // Problema identificado
    perfil_do_cliente?: string; // Perfil do cliente
}

export interface MarketSegment {
    id: string; // UUID from Supabase
    name: string;
    benchmarkMedio: number;
    topPerformers: number;
    characteristics: string;
    trends: string;
    challenges: string;
    successFactors: string;
    aiFocusAreas: string[];
    aiCustomPrompt: string;
    aiRevenueInsights: string;
    aiChannelInsights: {
        b2b: string;
        b2c: string;
        hibrido: string;
    };
    created_at?: string;
}

export interface AIPersona {
    id: AIMode; // This will remain the primary key
    name: string;
    description: string;
    tone: string;
    wordLimit: number;
    systemPrompt: string;
    directives: string;
    personalityTraits: string[];
    created_at?: string;
}

export interface StoredKnowledgeDocument {
    id: string; // UUID from Supabase
    user_id?: string;
    name: string;
    content: string;
    embedding: number[];
    created_at?: string;
}

export interface KnowledgeFAQ {
  id: string;
  user_id?: string;
  question: string;
  answer: string;
  embedding: number[];
  created_at?: string;
}

export interface KnowledgeOverview {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  embedding: number[];
  created_at?: string;
}

export interface OpportunityFeedback {
  id?: string;
  user_id: string;
  pipedrive_deal_id?: string;
  meeting_happened?: boolean; // permitido indefinido até envio
  notes?: string;
  accept_as_potential_client?: boolean;
  priority_now?: boolean;
  has_pain?: boolean;
  has_budget?: boolean;
  talked_to_decision_maker?: boolean;
  created_at?: string;
}

export type Answers = {
  [key: number]: number;
};


export enum AIMode {
    SDR = "SDR",
    Closer = "Closer",
    Gestor = "Gestor",
}

export interface AIMessage {
  role: 'user' | 'model';
  content: string;
}

export type ConversationHistories = {
    [key in AIMode]?: AIMessage[];
};

export enum OTEProfile {
    SDR = 'SDR',
    Closer = 'Closer',
    Coordenador = 'Coordenador',
    AnalistaMarketing = 'Analista de Marketing',
}

export interface SummaryInsights {
    specialistInsight: string;
    marketBenchmark: string;
}

export type DiagnosticArea = 
    | "Processos"
    | "Tecnologia"
    | "Padronização"
    | "Pessoas"
    | "Gestão"
    | "Monitoramento"
    | "Desenvolvimento"
    | "Relacionamento"
    | "Prospecção";

export interface StrategicRecommendation {
    priority: "Alta" | "Média" | "Baixa";
    area: DiagnosticArea;
    timeline: string;
    recommendation: string;
    expectedImpact: string;
}

export interface DetailedAIAnalysis {
    executiveSummary: string;
    strengths: string[];
    criticalGaps: string[];
    strategicRecommendations: StrategicRecommendation[];
    quickWins: string[];
    riskAssessment: string;
    sectorInsights: string;
    maturityRoadmap: string;
    nextSteps: string[];
}

export interface MaturityResult {
    level: 'Baixa' | 'Média' | 'Alta';
    color: string;
    bgColor: string;
    description: string;
}