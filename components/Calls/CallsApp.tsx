import React, { useEffect, useMemo, useState } from 'react';
import CallsDashboardPage from './pages/DashboardPage';
import CallsListPage from './pages/CallsPage';
import CallDetailPage from './pages/CallDetailPage';
import CallAnalyzePage from './pages/CallAnalyzePage';
import ScorecardPage from './pages/ScorecardPage';
import ScorecardEditPage from './pages/ScorecardEditPage';
import SdrDetailPage from './pages/SdrDetailPage';

type Route =
  | { name: 'dashboard' }
  | { name: 'calls' }
  | { name: 'call', id: string }
  | { name: 'analyze', id: string }
  | { name: 'scorecards' }
  | { name: 'scorecard', id: string }
  | { name: 'sdr', id: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard' };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'calls' && parts[1]) return { name: 'call', id: parts[1] };
  if (parts[0] === 'calls' && parts[2] === 'analyze') return { name: 'analyze', id: parts[1] };
  if (parts[0] === 'calls') return { name: 'calls' };
  if (parts[0] === 'scorecards' && parts[1]) return { name: 'scorecard', id: parts[1] };
  if (parts[0] === 'scorecards') return { name: 'scorecards' };
  if (parts[0] === 'sdr' && parts[1]) return { name: 'sdr', id: parts[1] };
  return { name: 'dashboard' };
}

export default function CallsApp() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const active = useMemo(() => route.name, [route]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Chamadas</h2>
          <p className="text-sm text-slate-600">Métricas e análise de ligações da sua equipe.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-3 pt-2">
          <nav className="flex gap-1">
            <a href="#/dashboard" className={`px-3 py-2 text-sm rounded-t ${active==='dashboard'?'bg-white border-x border-t border-slate-200 -mb-px text-indigo-700 font-medium':'text-slate-600 hover:text-slate-900'}`}>Dashboard</a>
            <a href="#/calls" className={`px-3 py-2 text-sm rounded-t ${active==='calls'||active==='call'?'bg-white border-x border-t border-slate-200 -mb-px text-indigo-700 font-medium':'text-slate-600 hover:text-slate-900'}`}>Chamadas</a>
            <a href="#/scorecards" className={`px-3 py-2 text-sm rounded-t ${active==='scorecards'||active==='scorecard'?'bg-white border-x border-t border-slate-200 -mb-px text-indigo-700 font-medium':'text-slate-600 hover:text-slate-900'}`}>Scorecard</a>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-200">
          {route.name === 'dashboard' && <CallsDashboardPage />}
          {route.name === 'calls' && <CallsListPage />}
          {route.name === 'call' && <CallDetailPage callId={route.id} />}
          {route.name === 'scorecards' && <ScorecardPage />}
          {route.name === 'scorecard' && <ScorecardEditPage scorecardId={route.id} />}
          {route.name === 'sdr' && <SdrDetailPage sdrId={route.id} />}
          {route.name === 'analyze' && <CallAnalyzePage callId={route.id} />}
        </div>
      </div>
    </div>
  );
}


