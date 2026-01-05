import React from 'react';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  PresentationChartLineIcon,
  UsersIcon,
} from '../ui/icons';

type Section =
  | 'dashboard'
  | 'pdi'
  | 'tasks'
  | 'performance'
  | 'alignments'
  | 'checkins'
  | 'feedbacks'
  | 'okrs';

interface TalentSidebarProps {
  activeSection: Section;
  onSelect: (section: Section) => void;
}

const items: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="w-5 h-5" /> },
  { id: 'pdi', label: 'Meu PDI', icon: <ClipboardDocumentListIcon className="w-5 h-5" /> },
  { id: 'tasks', label: 'Minhas Tarefas', icon: <CalendarDaysIcon className="w-5 h-5" /> },
  { id: 'performance', label: 'Minha Performance', icon: <PresentationChartLineIcon className="w-5 h-5" /> },
  { id: 'alignments', label: 'Alinhamentos', icon: <UsersIcon className="w-5 h-5" /> },
  { id: 'checkins', label: 'Check-ins', icon: <HeartIcon className="w-5 h-5" /> },
  { id: 'feedbacks', label: 'Feedbacks', icon: <AcademicCapIcon className="w-5 h-5" /> },
  { id: 'okrs', label: "OKR's", icon: <ClipboardDocumentListIcon className="w-5 h-5" /> },
];

export const TalentSidebar: React.FC<TalentSidebarProps> = ({ activeSection, onSelect }) => {
  return (
    <aside className="w-full md:w-60 bg-slate-900 text-slate-100 rounded-2xl p-4 md:p-5 shadow-lg border border-slate-800">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.08em] text-amber-400 font-semibold">GGV Talent</p>
        <p className="text-sm text-slate-300">Clima, PDI e Performance</p>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition border
              ${activeSection === item.id
                ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-inner'
                : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              }`}
          >
            <span className="text-amber-200">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export type TalentSection = Section;

