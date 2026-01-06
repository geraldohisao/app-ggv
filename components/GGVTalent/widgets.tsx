import React from 'react';

export const ProgressBar: React.FC<{ value: number; color?: string }> = ({ value, color = 'bg-amber-500' }) => (
  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
    <div
      className={`${color} h-2 rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

type Tone = 'info' | 'success' | 'danger' | 'muted';

const toneClasses: Record<Tone, string> = {
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-rose-100 text-rose-800',
  muted: 'bg-slate-100 text-slate-700',
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string; tone?: Tone }> = ({
  children,
  className = '',
  tone = 'muted',
}) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${toneClasses[tone]} ${className}`}>
    {children}
  </span>
);

export const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; badge?: React.ReactNode; accent?: boolean }> = ({
  title,
  children,
  icon,
  badge,
  accent = false,
}) => (
  <div className={`rounded-2xl border shadow-sm p-4 lg:p-5 bg-white ${accent ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-200'}`}>
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-amber-500">{icon}</span>}
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {badge}
    </div>
    {children}
  </div>
);



