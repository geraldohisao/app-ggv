import React from 'react';
import { SCORECARDS } from '../../../calls-dashboard/constants';

export default function ScorecardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-sm text-slate-600">
            <tr>
              <th className="text-left p-4">Nome</th>
              <th className="text-left p-4">Tipo de Conversa</th>
              <th className="text-left p-4">Atualizado em</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {SCORECARDS.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-4 text-slate-800">{s.name}</td>
                <td className="p-4 text-slate-600">{s.conversationType}</td>
                <td className="p-4 text-slate-600">{new Date(s.updatedAt).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={s.active} onChange={() => {}} />
                    <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 transition"></div>
                  </label>
                </td>
                <td className="p-4 text-right text-sm">
                  <a href={`#/scorecards/${s.id}`} className="text-indigo-600">Editar</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


