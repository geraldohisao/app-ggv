import { supabase } from './supabaseClient';
import {
  CheckIn,
  Alignment,
  FeedbackRecord,
  NineBoxEntry,
  PdiRecord,
  PerformanceAssessment,
  TalentRole,
  TalentTask,
  TaskStatus,
} from '../types/ggv-talent';

type ServiceResult<T> = { data?: T; error?: string };

const ensureClient = (): ServiceResult<true> => {
  if (!supabase) {
    return { error: 'Supabase não configurado (verifique SUPABASE_URL e SUPABASE_ANON_KEY)' };
  }
  return { data: true };
};

const mapRole = (role?: string): TalentRole => {
  if (!role) return 'COLLAB';
  const normalized = role.toUpperCase();
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'GESTOR' || normalized === 'LEADER') return 'LEADER';
  if (normalized === 'HR') return 'HR';
  return 'COLLAB';
};

export async function fetchTalentUsers(): Promise<ServiceResult<TalentRecord<'user'>[]>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, full_name, role, user_function')
    .limit(500);

  if (error) return { error: error.message };

  const mapped =
    data?.map((row: any) => ({
      id: row.id,
      name: row.full_name || row.name || row.email || 'Usuário',
      email: row.email,
      role: mapRole(row.role),
      position: row.position || '—',
      userFunction: row.user_function || undefined,
      leaderId: row.leader_id || undefined,
      team: row.team || undefined,
    })) || [];

  return { data: mapped };
}

// ==== Generic validators ====
const validTaskStatus: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'LATE'];
const validFeedbackTypes = ['AUTO', 'MANAGER', 'PEER'];

const checkStatus = (status: string, valid: string[]) => {
  if (!valid.includes(status)) {
    throw new Error(`Status inválido: ${status} (esperado: ${valid.join(', ')})`);
  }
};

// ==== Upserts (tabelas dedicadas ao Talent OS) ====

export async function upsertTask(task: TalentTask): Promise<ServiceResult<TalentTask>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };
  checkStatus(task.status, validTaskStatus);

  const { data, error } = await supabase
    .from('talent_tasks')
    .upsert(
      {
        id: task.id,
        user_id: task.userId,
        pdi_id: task.pdiId || null,
        title: task.title,
        description: task.description || null,
        status: task.status,
        due_date: task.dueDate || null,
        lane: task.lane || null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapTask(data) };
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<ServiceResult<TalentTask>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };
  checkStatus(status, validTaskStatus);

  const { data, error } = await supabase
    .from('talent_tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapTask(data) };
}

export async function upsertPdi(pdi: PdiRecord): Promise<ServiceResult<PdiRecord>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('talent_pdis')
    .upsert(
      {
        id: pdi.id,
        user_id: pdi.userId,
        cycle: pdi.cycle,
        diagnostic: pdi.diagnostic,
        status: pdi.status,
        objectives: pdi.objectives,
        development_plan: pdi.developmentPlan,
        progress: pdi.progress,
        history: pdi.history || [],
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapPdi(data) };
}

export async function upsertAssessment(assessment: PerformanceAssessment): Promise<ServiceResult<PerformanceAssessment>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('talent_assessments')
    .upsert(
      {
        id: assessment.id,
        user_id: assessment.userId,
        period: assessment.period,
        technical_score: assessment.technicalScore,
        behavioral_score: assessment.behavioralScore,
        total_score: assessment.totalScore,
        comments: assessment.comments || null,
        assessed_by: assessment.assessedBy || null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapAssessment(data) };
}

export async function upsertCheckIn(checkIn: CheckIn): Promise<ServiceResult<CheckIn>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('talent_checkins')
    .upsert(
      {
        id: checkIn.id,
        user_id: checkIn.userId,
        leader_id: checkIn.leaderId || null,
        date: checkIn.date,
        advances: checkIn.advances,
        blocks: checkIn.blocks,
        motivation_score: checkIn.motivationScore,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapCheckIn(data) };
}

export async function upsertAlignment(al: Alignment): Promise<ServiceResult<Alignment>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('talent_alignments')
    .upsert(
      {
        id: al.id,
        user_id: al.userId,
        leader_id: al.leaderId || null,
        date: al.date,
        topic: al.topic,
        category: al.category,
        criticality: al.criticality,
        notes: al.notes,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapAlignment(data) };
}

export async function upsertFeedback(fb: FeedbackRecord): Promise<ServiceResult<FeedbackRecord>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };
  checkStatus(fb.type, validFeedbackTypes);

  const { data, error } = await supabase
    .from('talent_feedbacks')
    .upsert(
      {
        id: fb.id,
        user_id: fb.userId,
        from_user_id: fb.fromUserId || null,
        type: fb.type,
        date: fb.date,
        content: fb.content,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapFeedback(data) };
}

export async function upsertNineBox(nb: NineBoxEntry): Promise<ServiceResult<NineBoxEntry>> {
  const ready = ensureClient();
  if (ready.error) return { error: ready.error };

  const { data, error } = await supabase
    .from('talent_ninebox')
    .upsert(
      {
        id: nb.id,
        user_id: nb.userId,
        cycle: nb.cycle,
        performance_score: nb.performanceScore,
        potential_score: nb.potentialScore,
        quadrant: nb.quadrant,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: mapNineBox(data) };
}

// ==== Mappers ====
type TalentRecord<T> = T extends 'user'
  ? {
      id: string;
      name: string;
      email?: string;
      role: TalentRole;
      position?: string;
      userFunction?: string;
      leaderId?: string;
      team?: string;
    }
  : never;

const mapTask = (row: any): TalentTask => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description || undefined,
  status: row.status as TaskStatus,
  pdiId: row.pdi_id || undefined,
  dueDate: row.due_date || undefined,
  lane: row.lane || undefined,
});

const mapPdi = (row: any): PdiRecord => ({
  id: row.id,
  userId: row.user_id,
  cycle: row.cycle,
  diagnostic: row.diagnostic,
  status: row.status,
  objectives: row.objectives || [],
  developmentPlan: row.development_plan || [],
  progress: row.progress || 0,
  history: row.history || [],
});

const mapAssessment = (row: any): PerformanceAssessment => ({
  id: row.id,
  userId: row.user_id,
  period: row.period,
  technicalScore: row.technical_score,
  behavioralScore: row.behavioral_score,
  totalScore: row.total_score,
  comments: row.comments || undefined,
  assessedBy: row.assessed_by || undefined,
});

const mapCheckIn = (row: any): CheckIn => ({
  id: row.id,
  userId: row.user_id,
  leaderId: row.leader_id || undefined,
  date: row.date,
  advances: row.advances,
  blocks: row.blocks,
  motivationScore: row.motivation_score,
});

const mapAlignment = (row: any): Alignment => ({
  id: row.id,
  userId: row.user_id,
  leaderId: row.leader_id || undefined,
  date: row.date,
  topic: row.topic,
  category: row.category,
  criticality: row.criticality,
  notes: row.notes,
});

const mapFeedback = (row: any): FeedbackRecord => ({
  id: row.id,
  userId: row.user_id,
  fromUserId: row.from_user_id || undefined,
  type: row.type,
  date: row.date,
  content: row.content,
});

const mapNineBox = (row: any): NineBoxEntry => ({
  id: row.id,
  userId: row.user_id,
  cycle: row.cycle,
  performanceScore: row.performance_score,
  potentialScore: row.potential_score,
  quadrant: row.quadrant,
});

