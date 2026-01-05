import React, { useMemo, useState } from 'react';
import { Badge, Card, ProgressBar } from '../widgets';
import { PdiRecord } from '../../../types/ggv-talent';
import { ClipboardDocumentListIcon, PlusIcon } from '../../ui/icons';

interface Props {
  pdi?: PdiRecord;
  onAdd: (objective: PdiRecord['objectives'][number]) => void;
  onUpdate: (objective: PdiRecord['objectives'][number]) => void;
  onToggleKr?: (objectiveId: string, krId: string, done: boolean) => void;
  onCreatePdi?: () => void;
}

type DraftObjective = {
  title: string;
  keyResults: { text: string; target?: number }[];
};

export const TalentOkrsView: React.FC<Props> = ({ pdi, onAdd, onUpdate, onToggleKr, onCreatePdi }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftObjective>({ title: '', keyResults: [{ text: '' }] });

  const totalKr = useMemo(() => pdi?.objectives.reduce((acc, obj) => acc + obj.keyResults.length, 0) || 0, [pdi]);

  if (!pdi) {
    return (
      <Card title="OKRs" icon={<ClipboardDocumentListIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Nenhum PDI selecionado para cadastrar OKRs.</p>
          {onCreatePdi && (
            <button
              onClick={onCreatePdi}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600"
            >
              Criar PDI rápido
            </button>
          )}
        </div>
      </Card>
    );
  }

  const handleAddKr = () => setDraft((d) => ({ ...d, keyResults: [...d.keyResults, { text: '' }] }));
  const handleChangeKr = (idx: number, value: string, target?: number) =>
    setDraft((d) => ({
      ...d,
      keyResults: d.keyResults.map((kr, i) => (i === idx ? { ...kr, text: value, target } : kr)),
    }));

  const handleSave = () => {
    if (!draft.title.trim()) return;
    const cleanedKRs = draft.keyResults.filter((kr) => kr.text.trim().length > 0);
    if (!cleanedKRs.length) return;
    const objective: PdiRecord['objectives'][number] = {
      id: `obj-${Date.now()}`,
      title: draft.title.trim(),
      keyResults: cleanedKRs.map((kr, idx) => ({
        id: `kr-${Date.now()}-${idx}`,
        text: kr.text.trim(),
        done: false,
      })),
      progress: 0,
    };
    onAdd(objective);
    setIsModalOpen(false);
    setDraft({ title: '', keyResults: [{ text: '' }] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">Ciclo {pdi.cycle}</p>
          <h3 className="text-lg font-semibold text-slate-900">OKRs do PDI</h3>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600"
        >
          <PlusIcon className="w-4 h-4" />
          Novo Objetivo
        </button>
      </div>

      <Card title="Metas do Ciclo (OKRs)" icon={<ClipboardDocumentListIcon className="w-5 h-5" />} badge={<Badge tone="info">{pdi.objectives.length} objetivos</Badge>}>
        <div className="space-y-3">
          {pdi.objectives.map((obj) => (
            <div key={obj.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{obj.title}</p>
                <span className="text-sm font-semibold text-emerald-600">{obj.progress}%</span>
              </div>
              <ProgressBar value={obj.progress} />
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                {obj.keyResults.map((kr) => (
                  <li key={kr.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!kr.done}
                      onChange={(e) => onToggleKr?.(obj.id, kr.id, e.target.checked)}
                      className="h-4 w-4 text-amber-500"
                    />
                    <span className={kr.done ? 'line-through text-slate-500' : ''}>{kr.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {pdi.objectives.length === 0 && <p className="text-sm text-slate-600">Nenhum OKR cadastrado ainda.</p>}
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">Novo Objetivo</h4>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Título do Objetivo</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="Ex: Aumentar conversão de vendas outbound"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Resultados Chave (KRs)</label>
                {draft.keyResults.map((kr, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="O que será medido? (Ex: Fechar 10 contratos)"
                      value={kr.text}
                      onChange={(e) => handleChangeKr(idx, e.target.value)}
                    />
                  </div>
                ))}
                <button onClick={handleAddKr} className="text-amber-600 text-sm font-semibold flex items-center gap-1">
                  <PlusIcon className="w-4 h-4" />
                  Adicionar KR
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button className="text-slate-600 text-sm font-semibold" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600"
                onClick={handleSave}
              >
                Salvar Objetivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

