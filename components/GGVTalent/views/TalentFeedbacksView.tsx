import React, { useMemo, useState } from 'react';
import { Badge, Card } from '../widgets';
import { FeedbackRecord } from '../../../types/ggv-talent';
import { AcademicCapIcon, CloudArrowUpIcon, RefreshIcon } from '../../ui/icons';

const QUESTIONS = [
  'Como avalia seu desempenho este mês?',
  'Onde mais evoluiu?',
  'Onde encontrou maior dificuldade?',
  'Como vivenciou os valores da empresa?',
  'Uma atitude sua que merece reconhecimento',
  'Um ponto a melhorar + plano de ação',
  'Alinhamentos importantes do mês',
  'Revisão do PDI',
  'Tarefas do próximo mês',
];

interface FeedbacksProps {
  feedbacks: FeedbackRecord[];
  onCreate?: (fb: FeedbackRecord) => void;
  canEditManagerRating?: boolean;
}

export const TalentFeedbacksView: React.FC<FeedbacksProps> = ({ feedbacks, onCreate, canEditManagerRating }) => {
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ''));
  const [managerRating, setManagerRating] = useState<number>(0);
  const [transcription, setTranscription] = useState<string>('');
  const [filePreview, setFilePreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setTranscription(text);
      setFilePreview(text.slice(0, 5000));
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    // Mock de IA: distribui trechos da transcrição para as respostas
    const chunks = (transcription || filePreview || 'Sem transcrição fornecida.').split(/[.\n]/).map((c) => c.trim()).filter(Boolean);
    const filled = QUESTIONS.map((q, idx) => chunks[idx % chunks.length] || `Resposta sugerida para: ${q}`);
    setAnswers(filled);
    setIsProcessing(false);
  };

  const handleSave = () => {
    if (!onCreate) return;
    const content = QUESTIONS.map((q, idx) => `${q}\n${answers[idx] || '-'}`).join('\n\n');
    const feedback: FeedbackRecord = {
      id: `fb-${Date.now()}`,
      userId: 'current', // será ajustado no container
      type: 'MANAGER',
      date: new Date().toISOString().slice(0, 10),
      content,
      managerRating: canEditManagerRating ? managerRating : undefined,
    };
    onCreate(feedback);
  };

  const displayFeedbacks = useMemo(() => feedbacks, [feedbacks]);

  return (
    <div className="space-y-4">
      <Card title="Registro de Feedback Mensal (IA assistida)" icon={<AcademicCapIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Transcrição (upload ou cole o texto)</label>
              <input type="file" accept=".txt,.md,.docx,.pdf,.srt,.vtt" onChange={handleFile} className="text-sm" />
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-28"
                placeholder="Cole a transcrição aqui..."
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
              />
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
              >
                <RefreshIcon className="w-4 h-4" />
                {isProcessing ? 'Gerando...' : 'Gerar preenchimento (mock)'}
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Avaliação do gestor (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={managerRating || ''}
                onChange={(e) => setManagerRating(Number(e.target.value))}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="1-5"
                disabled={!canEditManagerRating}
              />
              <p className="text-xs text-slate-500">
                {canEditManagerRating ? 'Preencha com base no retorno do colaborador.' : 'Somente o próprio colaborador pode avaliar o gestor.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {QUESTIONS.map((q, idx) => (
              <div key={q} className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{q}</p>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  value={answers[idx]}
                  onChange={(e) => setAnswers((prev) => prev.map((ans, i) => (i === idx ? e.target.value : ans)))}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button className="text-sm font-semibold text-slate-600" onClick={() => { setAnswers(QUESTIONS.map(() => '')); setTranscription(''); setFilePreview(''); }}>
              Limpar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              <CloudArrowUpIcon className="w-4 h-4" />
              Salvar Feedback
            </button>
          </div>
        </div>
      </Card>

      <Card title="Feedbacks Mensais" icon={<AcademicCapIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          {displayFeedbacks.map((fb) => (
            <div key={fb.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{fb.date}</p>
                <Badge tone="info">{fb.type}</Badge>
              </div>
              {fb.managerRating ? <p className="text-xs text-amber-700 font-semibold">Avaliação do gestor: {fb.managerRating}/5</p> : null}
              <p className="text-sm text-slate-700 whitespace-pre-line">{fb.content}</p>
              {fb.fromUserId && <p className="text-xs text-slate-500">Gestor: {fb.fromUserId}</p>}
            </div>
          ))}
          {displayFeedbacks.length === 0 && <p className="text-sm text-slate-600">Nenhum feedback registrado.</p>}
        </div>
      </Card>
    </div>
  );
};

