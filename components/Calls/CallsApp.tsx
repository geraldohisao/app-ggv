import React, { useEffect, useMemo, useState } from 'react';
// IMPORTANTE: Usar os componentes da pasta calls-dashboard que têm dados REAIS
import CallsDashboardPage from '../../calls-dashboard/pages/DashboardPage';
import CallsListPage from '../../calls-dashboard/pages/CallsPage';
import CallDetailPage from '../../calls-dashboard/pages/CallDetailPage';
import CallAnalyzePage from './pages/CallAnalyzePage'; // Este arquivo não existe em calls-dashboard
import ScorecardPage from '../../calls-dashboard/pages/ScorecardPage';
import ScorecardEditPage from '../../calls-dashboard/pages/ScorecardEditPage';
import SdrDetailPage from '../../calls-dashboard/pages/SdrDetailPage';
import { ChartBarIcon, PhoneIcon, ClipboardDocumentListIcon } from '../ui/icons';
import { useAdminFeatures } from '../../hooks/useAdminPermissions';

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

const tabs = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: ChartBarIcon, 
    href: '#/dashboard',
    activeOn: ['dashboard'] 
  },
  { 
    id: 'calls', 
    label: 'Chamadas', 
    icon: PhoneIcon, 
    href: '#/calls',
    activeOn: ['calls', 'call', 'analyze', 'sdr'] 
  },
  { 
    id: 'scorecards', 
    label: 'Scorecard', 
    icon: ClipboardDocumentListIcon, 
    href: '#/scorecards',
    activeOn: ['scorecards', 'scorecard'] 
  },
];

export default function CallsApp() {
  const { canAccessManualAnalysis } = useAdminFeatures();
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const active = useMemo(() => route.name, [route]);

  return (
    <div className="bg-slate-100 min-h-full">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              // Ocultar aba Scorecard para usuários não-admin
              if (tab.id === 'scorecards' && !canAccessManualAnalysis) {
                return null;
              }
              
              const isActive = tab.activeOn.includes(active);
              const Icon = tab.icon;
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  className={`
                    px-5 py-3.5 font-semibold text-sm flex items-center gap-2 border-b-[3px] transition-all
                    ${isActive
                      ? 'border-[#5B5FF5] text-[#5B5FF5]'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto p-6">
        {route.name === 'dashboard' && <CallsDashboardPage />}
        {route.name === 'calls' && <CallsListPage />}
        {route.name === 'call' && <CallDetailPage callId={route.id} />}
        {route.name === 'scorecards' && <ScorecardPage />}
        {route.name === 'scorecard' && <ScorecardEditPage scorecardId={route.id} />}
        {route.name === 'sdr' && <SdrDetailPage sdrId={route.id} />}
        {route.name === 'analyze' && <CallAnalyzePage callId={route.id} />}
      </div>
    </div>
  );
}


