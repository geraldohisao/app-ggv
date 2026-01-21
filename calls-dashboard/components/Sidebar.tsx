import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconPhone, IconScorecard } from './icons';
import { useAdminFeatures } from '../../hooks/useAdminPermissions';

export default function Sidebar() {
  const { canAccessManualAnalysis } = useAdminFeatures();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside className="w-60 border-r border-slate-200 bg-white flex-shrink-0">
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold">G</div>
        <span className="ml-2 font-semibold">ggv</span>
      </div>
      <nav className="p-3 space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <IconDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>
        <NavLink to="/calls" className={linkClass}>
          <IconPhone className="w-5 h-5" />
          Chamadas
        </NavLink>
        {canAccessManualAnalysis && (
          <NavLink to="/scorecards" className={linkClass}>
            <IconScorecard className="w-5 h-5" />
            Scorecard
          </NavLink>
        )}
      </nav>
    </aside>
  );
}


