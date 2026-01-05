import React, { useEffect, useMemo, useState } from 'react';
import { GGVTalentProvider, useTalent } from '../../contexts/GGVTalentContext';
import { TalentRole, TalentTask } from '../../types/ggv-talent';
import { useUser } from '../../contexts/DirectUserContext';
import { TalentSidebar, TalentSection } from './TalentSidebar';
import { TalentDashboardView } from './views/TalentDashboardView';
import { TalentPdiView } from './views/TalentPdiView';
import { TalentTasksView } from './views/TalentTasksView';
import { TalentPerformanceView } from './views/TalentPerformanceView';
import { TalentAlignmentsView } from './views/TalentAlignmentsView';
import { TalentCheckinsView } from './views/TalentCheckinsView';
import { TalentFeedbacksView } from './views/TalentFeedbacksView';
import { TalentOkrsView } from './views/TalentOkrsView';
import { Badge, Card } from './widgets';
import { CloudArrowUpIcon, RefreshIcon, SparklesIcon } from '../ui/icons';

const roleLabels: Record<TalentRole, string> = {
  COLLAB: 'Colaborador',
  LEADER: 'Gestor',
  HR: 'RH',
  ADMIN: 'Admin',
};

const RoleSelector: React.FC<{ value: TalentRole; roles: TalentRole[]; onChange: (role: TalentRole) => void }> = ({ value, roles, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
            value === role ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          {roleLabels[role]}
        </button>
      ))}
    </div>
  );
};

const UploadCard: React.FC<{
  filePreview: string;
  setFilePreview: (v: string) => void;
  isProcessing: boolean;
  onProcess: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ filePreview, setFilePreview, isProcessing, onProcess, onFileChange }) => (
  <Card title="Upload para análise (xlsx/csv/txt)" icon={<CloudArrowUpIcon className="w-5 h-5" />}>
    <div className="space-y-2 text-sm text-slate-700">
      <input type="file" accept=".xlsx,.csv,.txt" onChange={onFileChange} className="text-sm" />
      <textarea
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24"
        placeholder="Pré-visualização ou colagem rápida do conteúdo"
        value={filePreview}
        onChange={(e) => setFilePreview(e.target.value)}
      />
      <button
        onClick={onProcess}
        disabled={isProcessing}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
      >
        <RefreshIcon className="w-4 h-4" />
        {isProcessing ? 'Processando...' : 'Gerar análise (mock)'}
      </button>
      <p className="text-xs text-slate-500">
        Fluxo preparado para o Gemini 2.5 Flash via @google/genai. Exibe fallback seguro se a VITE_GEMINI_API_KEY não estiver configurada.
      </p>
    </div>
  </Card>
);

const GgvTalentView: React.FC = () => {
  const { user: currentUser } = useUser();
  const {
    state,
    impersonatedRole,
    setImpersonatedRole,
    updateTaskStatus,
    upsertSurveyAnalysis,
    addObjective,
    updateObjective,
    toggleKeyResult,
    createQuickPdi,
    addFeedback,
    addCheckIn,
  } = useTalent();
  const defaultUserId = state.users.find((u) => u.role === 'COLLAB')?.id || state.users[0]?.id;
  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUserId || '');
  const [activeSection, setActiveSection] = useState<TalentSection>('dashboard');
  const [filePreview, setFilePreview] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const availableRoles = useMemo<TalentRole[]>(() => {
    const unique = Array.from(new Set(state.users.map((u) => u.role))) as TalentRole[];
    return unique.length ? unique : ['COLLAB'];
  }, [state.users]);

  // Ajustar role selecionado se não existir no conjunto disponível
  useEffect(() => {
    if (!availableRoles.includes(impersonatedRole)) {
      setImpersonatedRole(availableRoles[0]);
    }
  }, [availableRoles, impersonatedRole, setImpersonatedRole]);

  const selectedUser = useMemo(() => state.users.find((u) => u.id === selectedUserId) || state.users[0], [state.users, selectedUserId]);

  const currentPdi = useMemo(() => state.pdis.find((p) => p.userId === selectedUser?.id), [state.pdis, selectedUser]);
  const tasks = useMemo(() => state.tasks.filter((t) => t.userId === selectedUser?.id), [state.tasks, selectedUser]);
  const assessments = useMemo(
    () => state.assessments.filter((assessment) => assessment.userId === selectedUser?.id).sort((a, b) => (a.period < b.period ? 1 : -1)),
    [state.assessments, selectedUser]
  );
  const checkIns = useMemo(() => state.checkIns.filter((c) => c.userId === selectedUser?.id), [state.checkIns, selectedUser]);
  const alignments = useMemo(() => state.alignments.filter((a) => a.userId === selectedUser?.id), [state.alignments, selectedUser]);
  const feedbacks = useMemo(() => state.feedbacks.filter((f) => f.userId === selectedUser?.id), [state.feedbacks, selectedUser]);

  const sentiment = state.surveyAnalysis?.sentimentDistribution || { positive: 0, neutral: 0, negative: 0 };
  const climaKPIs = state.surveyAnalysis?.kpis || { participantes: 0, escuta: 0, climaGeral: 0 };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(String(reader.result || '').slice(0, 2000));
    };
    reader.readAsText(file);
  };

  const handleProcessFile = async () => {
    setIsProcessingFile(true);
    const now = new Date().toISOString();
    const summaryText =
      filePreview.trim() ||
      'Nenhum arquivo enviado. Use este espaço para testar o fluxo de análise com IA assim que a VITE_GEMINI_API_KEY estiver configurada.';

    upsertSurveyAnalysis({
      id: `sa-${Date.now()}`,
      surveyId: 'uploaded',
      createdAt: now,
      summary: summaryText.slice(0, 280),
      kpis: {
        participantes: climaKPIs.participantes || 15,
        escuta: climaKPIs.escuta || 75,
        climaGeral: climaKPIs.climaGeral || 72,
      },
      sentimentDistribution: {
        positive: sentiment.positive || 55,
        neutral: sentiment.neutral || 25,
        negative: sentiment.negative || 20,
      },
      strengths: ['Comunicação clara', 'Gestores próximos', 'Treinamentos frequentes'],
      weaknesses: ['Carga de trabalho em picos', 'Feedbacks demorados'],
      quotes: ['"Precisamos de mais automação na prospecção."', '"Me sinto ouvido pelo meu gestor."'],
      recommendations: ['Revisar capacidade do time', 'Rodar piloto de automações', 'Simplificar fluxo de feedback'],
    });
    setIsProcessingFile(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <TalentDashboardView currentPdi={currentPdi} tasks={tasks} checkIns={checkIns} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <UploadCard
                filePreview={filePreview}
                setFilePreview={setFilePreview}
                isProcessing={isProcessingFile}
                onProcess={handleProcessFile}
                onFileChange={handleFileChange}
              />
              <Card title="Insights e recomendações">
                <div className="space-y-2 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{state.surveyAnalysis?.summary || 'Geraremos aqui o resumo do clima.'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(state.surveyAnalysis?.recommendations || ['Revisar capacidade do time', 'Rodar piloto de automações', 'Simplificar fluxo de feedback']).map(
                      (rec, idx) => (
                        <Badge key={idx} tone="muted">
                          {rec}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      case 'pdi':
        return <TalentPdiView pdi={currentPdi} onToggleKr={(objectiveId, krId, done) => currentPdi && toggleKeyResult(currentPdi.id, objectiveId, krId, done)} />;
      case 'tasks':
        return <TalentTasksView tasks={tasks} onSetStatus={(id, status) => updateTaskStatus(id, status as TalentTask['status'])} />;
      case 'performance':
        return <TalentPerformanceView assessments={assessments} />;
      case 'alignments':
        return <TalentAlignmentsView alignments={alignments} />;
      case 'checkins':
        return (
          <TalentCheckinsView
            checkIns={checkIns}
            user={selectedUser}
            onCreate={(payload) =>
              addCheckIn({
                ...payload,
                userId: selectedUserId,
                leaderId: selectedUser?.leaderId,
              })
            }
          />
        );
      case 'feedbacks':
        return (
          <TalentFeedbacksView
            feedbacks={feedbacks}
            canEditManagerRating={selectedUserId === currentUser?.id}
            onCreate={(fb) =>
              addFeedback({
                ...fb,
                userId: selectedUserId,
              })
            }
          />
        );
      case 'okrs':
        return (
          <TalentOkrsView
            pdi={currentPdi}
            onAdd={(objective) => addObjective(currentPdi?.id || '', objective)}
            onUpdate={(objective) => updateObjective(currentPdi?.id || '', objective)}
            onToggleKr={(objectiveId, krId, done) => currentPdi && toggleKeyResult(currentPdi.id, objectiveId, krId, done)}
            onCreatePdi={() => createQuickPdi(selectedUserId)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 text-white rounded-2xl p-6 lg:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold">
                <SparklesIcon className="w-4 h-4" />
                GGV Talent OS · Clima, PDI, Performance
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold">Visão unificada para times comerciais</h1>
              <p className="text-sm text-slate-100 max-w-3xl">
                RBAC simples (Colaborador, Gestor, RH, Admin), persistência em localStorage e pronto para Gemini 2.5 Flash no front.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <RoleSelector value={impersonatedRole} roles={availableRoles} onChange={setImpersonatedRole} />
              <select
                className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none"
                value={selectedUser?.id}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {state.users
                  .filter((u) => u.role === impersonatedRole)
                  .map((user) => (
                    <option key={user.id} value={user.id} className="text-slate-900">
                      {user.name} · {roleLabels[user.role]}{user.userFunction ? ` · ${user.userFunction}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <TalentSidebar activeSection={activeSection} onSelect={setActiveSection} />
          <main className="flex-1 space-y-4">{renderSection()}</main>
        </div>
      </div>
    </div>
  );
};

const GGVTalentPage: React.FC = () => (
  <GGVTalentProvider>
    <GgvTalentView />
  </GGVTalentProvider>
);

export default GGVTalentPage;

