import React, { useMemo, useState } from 'react';
import { listSavedFilters, saveFilter, removeFilter, SavedFilter } from '../../services/preferences';

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function SavedFilters({ view, params, onApply }: { view: 'calls' | 'dashboard'; params: Record<string,string>; onApply: (p: Record<string,string>) => void }) {
  const [items, setItems] = useState<SavedFilter[]>(() => listSavedFilters().filter((x) => x.view === view));
  const [name, setName] = useState('');

  const canSave = useMemo(() => Object.keys(params || {}).length > 0 && name.trim().length >= 2, [params, name]);

  const handleSave = () => {
    if (!canSave) return;
    const item: SavedFilter = { id: uuid(), name: name.trim(), view, params, createdAt: new Date().toISOString() };
    saveFilter(item);
    setItems(listSavedFilters().filter((x) => x.view === view));
    setName('');
  };

  const handleRemove = (id: string) => {
    removeFilter(id);
    setItems(listSavedFilters().filter((x) => x.view === view));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Salvar filtro como..." className="px-2 py-1 text-xs border border-slate-300 rounded" />
        <button disabled={!canSave} onClick={handleSave} className={`px-2 py-1 text-xs rounded ${canSave?'bg-indigo-600 text-white hover:bg-indigo-700':'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>Salvar</button>
      </div>
      {items.map((it) => (
        <button key={it.id} onClick={() => onApply(it.params)} title={new Date(it.createdAt).toLocaleString()} className="group inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-slate-300 text-slate-700 hover:bg-slate-50">
          {it.name}
          <span onClick={(e) => { e.stopPropagation(); handleRemove(it.id); }} className="text-slate-400 group-hover:text-slate-600">✕</span>
        </button>
      ))}
    </div>
  );
}


