import React, { useMemo, useState } from 'react';
import { Badge, Card } from '../widgets';
import { CheckIn, TalentUser } from '../../../types/ggv-talent';
import { HeartIcon } from '../../ui/icons';

interface CheckinsProps {
  checkIns: CheckIn[];
  user?: TalentUser;
  onCreate?: (data: Omit<CheckIn, 'id' | 'date' | 'userId'> & { userId?: string; date?: string }) => void;
}

const roleLabels: Record<string, string> = {
  COLLAB: 'Colaborador',
  LEADER: 'Gestor',
  HR: 'RH',
  ADMIN: 'Admin',
};

export const TalentCheckinsView: React.FC<CheckinsProps> = ({ checkIns, user, onCreate }) => {
  const [advances, setAdvances] = useState('');
  const [blocks, setBlocks] = useState('');
  const [indicators, setIndicators] = useState('');
  const [tasksReview, setTasksReview] = useState('');
  const [planNext15, setPlanNext15] = useState('');
  const [emotionalState, setEmotionalState] = useState<'Baixo' | 'Médio' | 'Alto'>('Médio');
  const [motivationScore, setMotivationScore] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const orderedCheckins = useMemo(
    () =>
      [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [checkIns]
  );

  const resetForm = () => {
    setAdvances('');
    setBlocks('');
    setIndicators('');
    setTasksReview('');
    setPlanNext15('');
    setEmotionalState('Médio');
    setMotivationScore(7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreate) return;

    if (!advances.trim() || !blocks.trim() || !planNext15.trim()) {
      setFeedback('Preencha avanços, obstáculos e plano.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await onCreate({
        advances: advances.trim(),
        blocks: blocks.trim(),
        indicators: indicators.trim(),
        tasksReview: tasksReview.trim(),
        planNext15: planNext15.trim(),
        emotionalState,
        motivationScore: Number(motivationScore),
      });
      setFeedback('✅ Check-in salvo com sucesso.');
      resetForm();
    } catch (error: any) {
      setFeedback(`❌ Falha ao salvar: ${error.message || 'erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Check-ins Quinzenais" icon={<HeartIcon className="w-5 h-5" />}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span>
              Logado como: <span className="font-semibold">{user?.name || '—'}</span>{' '}
              ({roleLabels[user?.role || 'COLLAB'] || user?.role || '—'})
            </span>
            <span className="text-xs text-slate-500">Novo Check-in</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">O que avançou nos últimos 15 dias?</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                value={advances}
                onChange={(e) => setAdvances(e.target.value)}
                placeholder="Resultados, entregas, aprendizados..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">O que travou? (Obstáculos)</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                value={blocks}
                onChange={(e) => setBlocks(e.target.value)}
                placeholder="Bloqueios, riscos, dependências..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Indicadores Principais</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  value={indicators}
                  onChange={(e) => setIndicators(e.target.value)}
                  placeholder="Ex.: reuniões, ligações, demos, metas..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Revisão de Tarefas</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  value={tasksReview}
                  onChange={(e) => setTasksReview(e.target.value)}
                  placeholder="O que foi concluído / pendente"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Plano para os próximos 15 dias</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                value={planNext15}
                onChange={(e) => setPlanNext15(e.target.value)}
                placeholder="Prioridades, entregas, donos e prazos"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Estado Emocional</label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  value={emotionalState}
                  onChange={(e) => setEmotionalState(e.target.value as any)}
                >
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Alto">Alto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Motivação (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={motivationScore}
                  onChange={(e) => setMotivationScore(Math.min(10, Math.max(1, Number(e.target.value))))}
                />
              </div>
            </div>

            {feedback && (
              <div className={`text-sm rounded-lg px-3 py-2 ${feedback.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {feedback}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Check-in'}
              </button>
            </div>
          </form>
        </div>
      </Card>

      <Card title="Histórico de Check-ins" icon={<HeartIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          {orderedCheckins.map((c) => (
            <div key={c.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{c.date}</p>
                <div className="flex items-center gap-2">
                  {c.emotionalState && <Badge tone="brand">Estado: {c.emotionalState}</Badge>}
                  <Badge tone="success">Motivação: {c.motivationScore}/10</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-1"><span className="font-semibold">Avanços:</span> {c.advances}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Obstáculos:</span> {c.blocks}</p>
              {c.indicators && <p className="text-sm text-slate-700"><span className="font-semibold">Indicadores:</span> {c.indicators}</p>}
              {c.tasksReview && <p className="text-sm text-slate-700"><span className="font-semibold">Revisão de Tarefas:</span> {c.tasksReview}</p>}
              {c.planNext15 && <p className="text-sm text-slate-700"><span className="font-semibold">Plano 15 dias:</span> {c.planNext15}</p>}
            </div>
          ))}
          {orderedCheckins.length === 0 && <p className="text-sm text-slate-600">Nenhum check-in registrado.</p>}
        </div>
      </Card>
    </div>
  );
};

