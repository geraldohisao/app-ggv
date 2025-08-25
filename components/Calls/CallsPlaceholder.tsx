import React from 'react';

export default function CallsPlaceholder() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Chamadas</h1>
        <div className="text-xs text-slate-500">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Em desenvolvimento</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
        <strong>Em desenvolvimento:</strong> Estamos construindo a seção de chamadas. Em breve você verá os dados reais aqui.
      </div>

      <div className="text-center py-12 text-slate-500">
        <p>Em breve: histórico de ligações, duração, status e detalhes.</p>
      </div>
    </div>
  );
}


