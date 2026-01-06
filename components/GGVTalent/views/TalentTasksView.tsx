import React from 'react';
import { Badge, Card } from '../widgets';
import { TalentTask } from '../../../types/ggv-talent';
import { CalendarDaysIcon, CheckCircleIcon, ExclamationTriangleIcon, RefreshIcon } from '../../ui/icons';

interface TasksProps {
  tasks: TalentTask[];
  onSetStatus: (id: string, status: TalentTask['status']) => void;
}

const statusOrder: TalentTask['status'][] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'LATE'];

export const TalentTasksView: React.FC<TasksProps> = ({ tasks, onSetStatus }) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const doing = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const late = tasks.filter((t) => t.status === 'LATE').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total" value={total} tone="muted" />
        <MiniStat label="Concluídas" value={done} tone="success" />
        <MiniStat label="Em andamento" value={doing} tone="info" />
        <MiniStat label="Atrasadas" value={late} tone="danger" />
      </div>

      <Card title="Minhas Tarefas" icon={<CalendarDaysIcon className="w-5 h-5" />}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                <p className="text-xs text-slate-500">Prazo: {task.dueDate || '—'}</p>
                <Badge tone={toneForStatus(task.status)}>{task.status}</Badge>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                {statusOrder.map((status) => (
                  <button
                    key={status}
                    onClick={() => onSetStatus(task.id, status)}
                    className={`px-2 py-1 rounded-md font-semibold border ${
                      task.status === status
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-600">Nenhuma tarefa cadastrada.</p>}
        </div>
      </Card>
    </div>
  );
};

const toneForStatus = (status: TalentTask['status']) => {
  switch (status) {
    case 'DONE':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'LATE':
      return 'danger';
    default:
      return 'muted';
  }
};

const MiniStat: React.FC<{ label: string; value: number; tone: 'muted' | 'success' | 'info' | 'danger' }> = ({ label, value, tone }) => {
  const bg: Record<typeof tone, string> = {
    muted: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    info: 'bg-blue-100 text-blue-800',
    danger: 'bg-rose-100 text-rose-800',
  };
  return (
    <div className={`rounded-xl border border-slate-200 p-3 ${bg[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};



