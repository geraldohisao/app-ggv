import React, { useMemo, useState } from 'react';
import { formInputClass, formLabelClass, formTextareaClass } from './ui/Form';
import { useUser } from '../contexts/DirectUserContext';
import { OpportunityFeedback } from '../types';
import { saveOpportunityFeedback } from '../services/supabaseService';
import OpportunityFeedbackSuccess from './OpportunityFeedbackSuccess';

const ToggleYesNo: React.FC<{ value: boolean | null; onChange: (v: boolean) => void }>
  = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
    <button type="button" onClick={() => onChange(true)} className={`px-4 py-2 text-sm font-semibold transition-colors ${value === true ? 'bg-green-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Sim</button>
    <button type="button" onClick={() => onChange(false)} className={`px-4 py-2 text-sm font-semibold border-l border-slate-300 transition-colors ${value === false ? 'bg-red-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Não</button>
  </div>
);

const OpportunityFeedbackPage: React.FC = () => {
  const { user } = useUser();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [data, setData] = useState<OpportunityFeedback>({
    user_id: user?.id || '',
    pipedrive_deal_id: new URLSearchParams(window.location.search).get('dealId') || undefined,
    meeting_happened: undefined,
    notes: '',
    accept_as_potential_client: undefined,
    priority_now: undefined,
    has_pain: undefined,
    has_budget: undefined,
    talked_to_decision_maker: undefined,
  });

  const totalQuestionsStep2 = 5;
  const answeredStep2 = useMemo(() => [
    data.accept_as_potential_client,
    data.priority_now,
    data.has_pain,
    data.has_budget,
    data.talked_to_decision_maker
  ].filter(v => v !== undefined && v !== null).length, [data]);

  const canGoNext = () => step === 1 ? data.meeting_happened !== null : true;

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload: OpportunityFeedback = { ...data, user_id: user.id };
      await saveOpportunityFeedback(payload);
      setDone(true);
    } catch (err: any) {
      alert(`Falha ao salvar feedback: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = useMemo(() => {
    if (step === 1) return data.meeting_happened ? 50 : 15;
    return 50 + Math.round((answeredStep2 / totalQuestionsStep2) * 50);
  }, [step, data.meeting_happened, answeredStep2]);

  if (done) {
    return <OpportunityFeedbackSuccess onClose={() => window.close()} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight text-slate-800">GGV</span>
          <h1 className="text-2xl font-extrabold text-slate-900">Feedback de Oportunidade</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Preencha em menos de 1 minuto. Usaremos estes dados para ICP e Pipedrive.</p>
        <div className="mt-4 w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
          <div className="h-2 bg-blue-800 transition-all" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">1. A reunião aconteceu? <span className="text-red-600">*</span></p>
              <ToggleYesNo value={data.meeting_happened} onChange={(v) => setData({ ...data, meeting_happened: v })} />
            </div>
            <div>
              <label className={formLabelClass}>2. Observações</label>
              <textarea
                className={formTextareaClass}
                rows={5}
                value={data.notes || ''}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                placeholder="Resumo da conversa, próximos passos e objeções relevantes..."
              />
              <p className="text-xs text-slate-500 mt-1">Opcional. Sugestão: registre objeções, responsáveis e prazos.</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                className="bg-blue-900 text-white px-6 py-2 rounded-md font-semibold shadow-sm disabled:opacity-50"
                disabled={data.meeting_happened === undefined || isSubmitting}
                onClick={() => (data.meeting_happened ? setStep(2) : handleSubmit())}
              >
                {data.meeting_happened ? 'Continuar' : 'Concluir'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">Avaliação ICP</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">3. Aceita como potencial cliente? <span className="text-red-600">*</span></p>
                <ToggleYesNo value={data.accept_as_potential_client ?? null} onChange={(v) => setData({ ...data, accept_as_potential_client: v })} />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">4. É prioridade contratar agora? <span className="text-red-600">*</span></p>
                <ToggleYesNo value={data.priority_now ?? null} onChange={(v) => setData({ ...data, priority_now: v })} />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">5. Possui dores que a solução resolve? <span className="text-red-600">*</span></p>
                <ToggleYesNo value={data.has_pain ?? null} onChange={(v) => setData({ ...data, has_pain: v })} />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">6. Possui orçamento? <span className="text-red-600">*</span></p>
                <ToggleYesNo value={data.has_budget ?? null} onChange={(v) => setData({ ...data, has_budget: v })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="font-semibold text-slate-900">7. Falou com o decisor? <span className="text-red-600">*</span></p>
                <ToggleYesNo value={data.talked_to_decision_maker ?? null} onChange={(v) => setData({ ...data, talked_to_decision_maker: v })} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-slate-500">Progresso: {answeredStep2}/{totalQuestionsStep2}</p>
              <div className="flex gap-3">
                <button className="px-5 py-2 rounded-md border font-semibold" onClick={() => setStep(1)} disabled={isSubmitting}>Voltar</button>
                <button className="px-6 py-2 rounded-md bg-blue-900 text-white font-semibold shadow-sm disabled:opacity-50" onClick={handleSubmit} disabled={isSubmitting}>Concluir</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OpportunityFeedbackPage;


