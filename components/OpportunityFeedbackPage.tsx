import React, { useMemo, useState } from 'react';
import { formInputClass, formLabelClass, formTextareaClass } from './ui/Form';
import { useUser } from '../contexts/DirectUserContext';
import { OpportunityFeedback } from '../types';
import OpportunityFeedbackSuccess from './OpportunityFeedbackSuccess';
import { GGVLogo } from './ui/GGVLogo';
import { renewSessionTimestamp } from '../utils/sessionUtils';

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

  // Extrair deal_id da URL
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('deal_id') || urlParams.get('dealId');

  const [data, setData] = useState<OpportunityFeedback>({
    user_id: user?.id || '',
    pipedrive_deal_id: dealId || undefined,
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

  // Função para enviar dados para o webhook no formato SurveyMonkey
  const sendToWebhook = async (feedbackData: OpportunityFeedback) => {
    console.log('🔗 WEBHOOK - Preparando envio...');
    
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/feedback-ggv-register';
    
    // Formato simplificado que sabemos que funciona
    const surveyMonkeyFormat = [{
      id: `${Date.now()}`,
      custom_variables: {
        deal: feedbackData.pipedrive_deal_id || ""
      },
      email_address: user?.email || "",
      response_status: "completed",
      date_created: new Date().toISOString(),
      pages: [
        {
          id: "page1",
          questions: [
            {
              id: "meeting_question",
              answers: [{
                choice_id: feedbackData.meeting_happened ? "1193480653" : "1193480654",
                simple_text: feedbackData.meeting_happened ? "Sim" : "Não"
              }],
              family: "single_choice",
              subtype: "vertical",
              heading: "A reunião aconteceu?"
            },
            {
              id: "notes_question",
              answers: [{
                text: feedbackData.notes || ""
              }],
              family: "open_ended",
              subtype: "essay",
              heading: "Observações"
            }
          ]
        }
      ]
    }];

    // Se a reunião aconteceu, adicionar as perguntas do step 2
    if (feedbackData.meeting_happened) {
      surveyMonkeyFormat[0].pages.push({
        id: "page2",
        questions: [
          {
            id: "accept_client",
            answers: [{
              choice_id: feedbackData.accept_as_potential_client ? "1193540950" : "1193540951",
              simple_text: feedbackData.accept_as_potential_client ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "Você aceita essa oportunidade como um potencial cliente?"
          },
          {
            id: "priority_now",
            answers: [{
              choice_id: feedbackData.priority_now ? "1193541109" : "1193541110",
              simple_text: feedbackData.priority_now ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "É uma prioridade no momento contratar a solução?"
          },
          {
            id: "has_pain",
            answers: [{
              choice_id: feedbackData.has_pain ? "1193541386" : "1193541387",
              simple_text: feedbackData.has_pain ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "Possui dores que a sua solução resolve?"
          },
          {
            id: "has_budget",
            answers: [{
              choice_id: feedbackData.has_budget ? "1193541451" : "1193541452",
              simple_text: feedbackData.has_budget ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "Possui orçamento para contratar a solução?"
          },
          {
            id: "decision_maker",
            answers: [{
              choice_id: feedbackData.talked_to_decision_maker ? "1193541464" : "1193541465",
              simple_text: feedbackData.talked_to_decision_maker ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "Você falou com o responsável pela compra?"
          }
        ]
      });
    }

    console.log('📤 WEBHOOK - Enviando payload...');
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyMonkeyFormat)
      });

      console.log('📊 WEBHOOK - Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ WEBHOOK - Enviado com sucesso');
      return result;
    } catch (error) {
      console.error('❌ WEBHOOK - Falha na requisição:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('Usuário não encontrado');
      return;
    }
    
    console.log('🚀 WEBHOOK - Iniciando envio...');
    
    setIsSubmitting(true);
    try {
      const payload: OpportunityFeedback = { ...data, user_id: user.id };
      
      // Renovar sessão
      renewSessionTimestamp();
      
      // Enviar para webhook
      console.log('📤 WEBHOOK - Enviando dados...');
      const response = await sendToWebhook(payload);
      console.log('✅ WEBHOOK - Sucesso:', response);
      
      setDone(true);
    } catch (err: any) {
      console.error('❌ WEBHOOK - Erro:', err);
      alert(`Erro ao enviar: ${err.message || 'Falha na comunicação'}`);
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
          <GGVLogo size="small" variant="horizontal" />
          <h1 className="text-2xl font-extrabold text-slate-900">Feedback de Oportunidade</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-slate-500">Preencha em menos de 1 minuto. Usaremos estes dados para ICP e Pipedrive.</p>
          {dealId && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              Deal ID: {dealId}
            </span>
          )}
        </div>
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


