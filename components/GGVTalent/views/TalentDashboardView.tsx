import React from 'react';
import { Badge, Card, ProgressBar } from '../widgets';
import { TalentTask, PdiRecord, CheckIn } from '../../../types/ggv-talent';
import { CalendarDaysIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../../ui/icons';

interface DashboardProps {
  currentPdi?: PdiRecord;
  tasks: TalentTask[];
  checkIns: CheckIn[];
}

export const TalentDashboardView: React.FC<DashboardProps> = ({ currentPdi, tasks, checkIns }) => {
  const lateTasks = tasks.filter((t) => t.status === 'LATE');
  const nextActions = tasks.filter((t) => t.status !== 'DONE').slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Meu PDI Atual" accent>
          {currentPdi ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentPdi.cycle}</p>
                  <p className="text-xs text-slate-600">Status do ciclo</p>
                </div>
                <Badge tone="info">{currentPdi.status}</Badge>
              </div>
              <ProgressBar value={currentPdi.progress} color="bg-amber-500" />
              <p className="text-xs text-slate-500">{currentPdi.progress}% concluído · fluxo: Rascunho → Revisão → Aprovado → Em andamento → Concluído</p>
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800">Ver PDI Completo</button>
                <button className="px-3 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-slate-900 hover:bg-amber-600">Registrar Progresso</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Nenhum PDI cadastrado para este ciclo.</p>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Alinhamentos Pendentes">
            <p className="text-sm text-slate-600">Nenhum alinhamento pendente.</p>
          </Card>
          <Card title="Tarefas Atrasadas" badge={<Badge tone="danger">{lateTasks.length} atrasadas</Badge>}>
            {lateTasks.length === 0 && <p className="text-sm text-slate-600">Sem tarefas atrasadas.</p>}
            <ul className="space-y-2 text-sm text-slate-800">
              {lateTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-slate-500">Prazo: {task.dueDate || '—'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <Card title="Acesso Rápido">
          <div className="flex flex-col gap-2">
            <QuickButton label="Minhas Tarefas" />
            <QuickButton label="Feedback Mensal" />
            <QuickButton label="Check-in Quinzenal" />
          </div>
        </Card>

        <Card title="Próximas Ações">
          {nextActions.length === 0 && <p className="text-sm text-slate-600">Sem próximas ações.</p>}
          <ul className="space-y-2 text-sm text-slate-800">
            {nextActions.map((task) => (
              <li key={task.id} className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-xs text-slate-500">{task.dueDate || 'Sem prazo'}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Check-ins Recentes" badge={<Badge tone="info">{checkIns.length}</Badge>}>
          {checkIns.length === 0 && <p className="text-sm text-slate-600">Nenhum check-in recente.</p>}
          <ul className="space-y-2 text-sm text-slate-800">
            {checkIns.slice(0, 3).map((c) => (
              <li key={c.id} className="border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.date}</p>
                  <p className="text-xs text-slate-500">{c.advances}</p>
                </div>
                <Badge tone="success">Motivação {c.motivationScore}/10</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

const QuickButton: React.FC<{ label: string }> = ({ label }) => (
  <button className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 flex items-center gap-2">
    <CalendarDaysIcon className="w-4 h-4 text-amber-500" />
    {label}
  </button>
);



