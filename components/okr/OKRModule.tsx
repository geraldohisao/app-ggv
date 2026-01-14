import React from 'react';

/**
 * Placeholder do módulo de OKR.
 * Mantém a aplicação compilando enquanto o módulo completo não está disponível.
 */
export const OKRModule: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Gestão de OKR</h1>
      <p className="text-slate-600">
        O módulo de OKR está temporariamente indisponível nesta build.
      </p>
    </div>
  );
};

export default OKRModule;
import React, { useState, useEffect, useMemo } from 'react';
import { OKRDashboard } from './pages/OKRDashboard';
import { SprintList } from './pages/SprintList';
import { SprintDetailStyled } from './pages/SprintDetailStyled';
import { DecisionsPage } from './pages/DecisionsPage';
import { OKRFormSimple } from './components/okr/OKRFormSimple';
import { SprintForm } from './components/sprint/SprintForm';
import { InicioIcon, OKRsIcon, SprintsIcon, DecisionsIcon } from './components/shared/NavIcons';
import type { OKR } from './types/okr.types';
import type { Sprint } from './types/sprint.types';

type View =
  | 'home'
  | 'okr-dashboard'
  | 'okr-form'
  | 'sprint-list'
  | 'sprint-detail'
  | 'sprint-form'
  | 'decisions';

export const OKRModule: React.FC = () => {
  // Estado para Views que não dependem apenas da URL (como formulários modais ou de criação)
  const [isCreatingOKR, setIsCreatingOKR] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [selectedSprintForEdit, setSelectedSprintForEdit] = useState<Sprint | null>(null);

  // Derivar a view e IDs da URL
  const getViewStateFromUrl = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean); // ['', 'okr', 'sprints', 'id'] -> ['okr', 'sprints', 'id']

    // Se for apenas /okr
    if (segments.length === 1) return { view: 'home' as View, id: null };

    const subRoute = segments[1];
    if (subRoute === 'dashboard' || subRoute === 'okrs') return { view: 'okr-dashboard' as View, id: null };
    if (subRoute === 'sprints') {
      const id = segments[2];
      return { view: (id ? 'sprint-detail' : 'sprint-list') as View, id: id || null };
    }
    if (subRoute === 'decisoes') return { view: 'decisions' as View, id: null };
    if (subRoute === 'inicio') return { view: 'home' as View, id: null };

    return { view: 'home' as View, id: null };
  };

  const [{ view: currentView, id: selectedSprintId }, setRouteState] = useState(getViewStateFromUrl());

  // Sincronizar com PopState (botão voltar do navegador)
  useEffect(() => {
    const handlePopState = () => {
      setRouteState(getViewStateFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Helpers de Navegação Interna
  const navigateInternal = (subPath: string) => {
    const newPath = subPath.startsWith('/') ? `/okr${subPath}` : `/okr/${subPath}`;
    window.history.pushState(null, '', newPath);
    setRouteState(getViewStateFromUrl());
  };

  const handleGoHome = () => navigateInternal('inicio');
  const handleGoOKRs = () => navigateInternal('dashboard');
  const handleGoSprints = () => navigateInternal('sprints');
  const handleGoDecisions = () => navigateInternal('decisoes');

  const handleCreateOKR = () => { setSelectedOKR(null); setIsCreatingOKR(true); };
  const handleEditOKR = (okr: OKR) => { setSelectedOKR(okr); setIsCreatingOKR(true); };
  const handleOKRFormClose = () => { setSelectedOKR(null); setIsCreatingOKR(false); };
  const handleOKRFormSuccess = () => { setSelectedOKR(null); setIsCreatingOKR(false); };

  const handleCreateSprint = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(true); };
  const handleEditSprint = (sprint: Sprint) => { setSelectedSprintForEdit(sprint); setIsCreatingSprint(true); };
  const handleSprintClick = (sprintId: string) => navigateInternal(`sprints/${sprintId}`);
  const handleSprintFormClose = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(false); };
  const handleSprintFormSuccess = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(false); };
  const handleBackFromSprintDetail = () => handleGoSprints();

  const tabs = [
    { id: 'home', label: 'Início', icon: InicioIcon, views: ['home'], action: handleGoHome },
    { id: 'okr-dashboard', label: 'OKRs', icon: OKRsIcon, views: ['okr-dashboard', 'okr-form'], action: handleGoOKRs },
    { id: 'sprint-list', label: 'Sprints', icon: SprintsIcon, views: ['sprint-list', 'sprint-detail', 'sprint-form'], action: handleGoSprints },
    { id: 'decisions', label: 'Decisões', icon: DecisionsIcon, views: ['decisions'], action: handleGoDecisions },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const isActive = tab.views.includes(currentView);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.action}
                  className={`
                    px-6 py-4 font-bold text-sm flex items-center gap-3 border-b-4 transition-all
                    ${isActive
                      ? 'border-[#5B5FF5] text-[#5B5FF5]'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[calc(100vh-73px)]">
        {currentView === 'home' && (
          <OKRDashboard
            onCreateNew={handleCreateOKR}
            onEdit={handleEditOKR}
            onViewSprint={handleGoSprints}
            hideList
          />
        )}

        {currentView === 'okr-dashboard' && !isCreatingOKR && (
          <OKRDashboard onCreateNew={handleCreateOKR} onEdit={handleEditOKR} />
        )}

        {isCreatingOKR && (
          <OKRFormSimple
            okr={selectedOKR || undefined}
            onClose={handleOKRFormClose}
            onSuccess={handleOKRFormSuccess}
          />
        )}

        {currentView === 'sprint-list' && !isCreatingSprint && (
          <SprintList
            onCreateNew={handleCreateSprint}
            onEdit={handleEditSprint}
            onSprintClick={handleSprintClick}
          />
        )}

        {currentView === 'sprint-detail' && selectedSprintId && (
          <SprintDetailStyled
            sprintId={selectedSprintId}
            onBack={handleBackFromSprintDetail}
          />
        )}

        {isCreatingSprint && (
          <SprintForm
            sprint={selectedSprintForEdit || undefined}
            onClose={handleSprintFormClose}
            onSuccess={handleSprintFormSuccess}
          />
        )}

        {currentView === 'decisions' && <DecisionsPage />}
      </div>
    </div>
  );
};
