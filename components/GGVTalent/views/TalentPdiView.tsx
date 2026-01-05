import React from 'react';
import { Badge, Card, ProgressBar } from '../widgets';
import { PdiRecord } from '../../../types/ggv-talent';
import { ClipboardDocumentListIcon, SparklesIcon } from '../../ui/icons';

interface PdiProps {
  pdi?: PdiRecord;
  onToggleKr?: (objectiveId: string, krId: string, done: boolean) => void;
}

export const TalentPdiView: React.FC<PdiProps> = ({ pdi, onToggleKr }) => {
  if (!pdi) {
    return <p className="text-sm text-slate-600">Nenhum PDI encontrado para este usuário.</p>;
  }

  return (
    <div className="space-y-4">
      <Card title="Metas do Ciclo (OKRs)" icon={<ClipboardDocumentListIcon className="w-5 h-5" />} badge={<Badge tone="info">{pdi.cycle}</Badge>}>
        <div className="space-y-3">
          {pdi.objectives.map((obj) => (
            <div key={obj.id} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{obj.title}</p>
                <span className="text-sm font-semibold text-emerald-600">{obj.progress}%</span>
              </div>
              <ProgressBar value={obj.progress} />
              <ul className="text-sm text-slate-700 space-y-2">
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
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Plano de Desenvolvimento" icon={<SparklesIcon className="w-5 h-5" />}>
          <div className="space-y-2 text-sm text-slate-800">
            {pdi.developmentPlan.map((action) => (
              <div key={action.id} className="flex items-start justify-between gap-2 border border-slate-200 rounded-lg p-2 bg-white">
                <div>
                  <p className="font-semibold">{action.title}</p>
                  <p className="text-xs text-slate-500">
                    {action.type === 'HARD' ? 'Hard skill' : 'Soft skill'} · Owner: {action.owner}
                  </p>
                </div>
                <Badge tone={action.status === 'DONE' ? 'success' : action.status === 'IN_PROGRESS' ? 'info' : 'muted'}>
                  {action.status}
                </Badge>
              </div>
            ))}
            {pdi.developmentPlan.length === 0 && <p className="text-sm text-slate-600">Sem ações cadastradas.</p>}
          </div>
        </Card>

        <Card title="Competências Foco">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Comportamental</p>
            <Badge tone="info">Comunicação Assertiva</Badge>
            <p className="font-semibold text-slate-800 mt-2">Técnica</p>
            <Badge tone="muted">React com TypeScript</Badge>
          </div>
        </Card>

        <Card title="Plano de Carreira">
          <div className="space-y-1 text-sm text-slate-700">
            <p>Nível Atual: <span className="font-semibold text-slate-900">Pleno</span></p>
            <p>Próximo Nível: <span className="font-semibold text-slate-900">Sênior</span></p>
            <p className="text-xs text-slate-500">Critérios de progressão: autonomia em features de média/alta complexidade, mentoria e code reviews.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

