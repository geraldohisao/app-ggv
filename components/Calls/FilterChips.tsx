import React from 'react';

interface Chip {
  key: string;
  label: string;
}

export default function FilterChips({ chips, onClear, onClearAll }: { chips: Chip[]; onClear: (key: string) => void; onClearAll?: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex items-center flex-wrap gap-2 px-1">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => onClear(c.key)}
          className="group inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-slate-300 text-slate-700 hover:bg-slate-50"
          title="Remover filtro"
        >
          <span>{c.label}</span>
          <span className="text-slate-400 group-hover:text-slate-600">✕</span>
        </button>
      ))}
      {onClearAll && (
        <button onClick={onClearAll} className="ml-1 text-xs text-slate-600 hover:text-slate-900 underline">
          Limpar filtros
        </button>
      )}
    </div>
  );
}


