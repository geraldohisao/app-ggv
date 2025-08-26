import React from 'react';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Dashboard de Análise de Chamadas</h1>
        <p className="text-xs text-slate-500">Métricas e insights para sua equipe de SDR</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Usuário Demo</span>
        <img className="w-8 h-8 rounded-full" src="https://i.pravatar.cc/64?img=12" alt="avatar" />
      </div>
    </header>
  );
}


