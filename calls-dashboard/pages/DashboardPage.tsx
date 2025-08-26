import React from 'react';
import CallVolumeChart from '../components/CallVolumeChart';
import SdrScoreChart from '../components/SdrScoreChart';
import { CALLS } from '../constants';

export default function DashboardPage() {
  const totalCalls = CALLS.length;
  const answered = CALLS.filter((c) => c.status !== 'missed').length;
  const answeredRate = totalCalls ? Math.round((answered / totalCalls) * 100) : 0;
  const avgDuration = CALLS.reduce((a, c) => a + c.durationSec, 0) / (totalCalls || 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-600">Métricas e visão geral do desempenho da equipe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Total de Chamadas</div>
          <div className="text-2xl font-bold text-slate-800">{totalCalls}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Chamadas Atendidas</div>
          <div className="text-2xl font-bold text-slate-800">{answered}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Taxa de Atendimento</div>
          <div className="text-2xl font-bold text-slate-800">{answeredRate}%</div>
        </div>
      </div>

      <CallVolumeChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Duração Média</div>
          <div className="text-3xl font-bold text-slate-800">{Math.round(avgDuration/60)}m {Math.round(avgDuration%60)}s</div>
        </div>
        <SdrScoreChart />
      </div>
    </div>
  );
}


