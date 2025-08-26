import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SCORECARDS } from '../constants';

export default function ScorecardEditPage() {
  const { id } = useParams();
  const source = useMemo(() => SCORECARDS.find((s) => s.id === id), [id]);
  const [local, setLocal] = useState(() => source);

  if (!source || !local) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6">
          <div className="text-slate-700">Scorecard não encontrado.</div>
          <Link to="/scorecards" className="text-indigo-600 text-sm">Voltar</Link>
        </div>
      </div>
    );
  }

  const total = local.criteria.reduce((a, c) => a + c.weight, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/scorecards" className="text-sm text-indigo-600">Voltar para a lista</Link>
          <h2 className="text-xl font-semibold text-slate-800 mt-1">Editando: {local.name}</h2>
        </div>
        <button className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Salvar Alterações</button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-600">Peso Total: <span className={`font-semibold ${total === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{total}%</span></div>
        <div className="mt-4 space-y-4">
          {local.criteria.map((c, idx) => (
            <div key={c.id} className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 md:col-span-4">
                <label className="text-xs text-slate-500">Nome do Critério</label>
                <input className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={c.name} onChange={(e) => {
                  const v = e.target.value; const copy = {...local}; copy.criteria[idx] = {...c, name: v}; setLocal(copy);
                }} />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className="text-xs text-slate-500">Descrição</label>
                <input className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={c.description} onChange={(e) => {
                  const v = e.target.value; const copy = {...local}; copy.criteria[idx] = {...c, description: v}; setLocal(copy);
                }} />
              </div>
              <div className="col-span-12 md:col-span-2">
                <label className="text-xs text-slate-500">Peso (%)</label>
                <input type="number" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={c.weight} onChange={(e) => {
                  const v = Number(e.target.value || 0); const copy = {...local}; copy.criteria[idx] = {...c, weight: v}; setLocal(copy);
                }} />
              </div>
            </div>
          ))}
          <button className="text-sm text-indigo-600">+ Novo critério</button>
        </div>
      </div>
    </div>
  );
}


