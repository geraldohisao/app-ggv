import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OKRDashboard } from './pages/OKRDashboard';
import { SprintList } from './pages/SprintList';
import { SprintDetailStyled } from './pages/SprintDetailStyled';
import { CockpitPage } from './pages/CockpitPage';
import { ActivitiesView } from './pages/ActivitiesView';
import { OKRFormSimple } from './components/okr/OKRFormSimple';
import { SprintForm } from './components/sprint/SprintForm';
import { OKRsIcon, SprintsIcon } from './components/shared/NavIcons';
import { usePermissions } from './hooks/usePermissions';
import type { OKR } from './types/okr.types';
import type { Sprint } from './types/sprint.types';

type View =
  | 'home'
  | 'okr-dashboard'
  | 'okr-form'
  | 'sprint-list'
  | 'sprint-detail'
  | 'sprint-form'
  | 'cockpit'
  | 'activities';

export const OKRModule: React.FC = () => {
  const okrScrollRef = useRef<number>(0);
  const permissions = usePermissions();
  
  // Estado para Views que não dependem apenas da URL (como formulários modais ou de criação)
  const [isCreatingOKR, setIsCreatingOKR] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [selectedSprintForEdit, setSelectedSprintForEdit] = useState<Sprint | null>(null);

  // Derivar a view e IDs da URL
  const getViewStateFromUrl = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean); // ['', 'okr', 'sprints', 'id'] -> ['okr', 'sprints', 'id']

    // Se for apenas /okr - redirecionar para view padrão baseada no role
    if (segments.length === 1) {
      // Para usuários OP, default é "atividades"
      return { view: (permissions.isOP ? 'activities' : 'home') as View, id: null };
    }

    const subRoute = segments[1];
    if (subRoute === 'dashboard' || subRoute === 'okrs' || subRoute === 'inicio') return { view: 'okr-dashboard' as View, id: null };
    if (subRoute === 'atividades' || subRoute === 'minhas-tarefas') return { view: 'activities' as View, id: null };
    if (subRoute === 'sprints') {
      const id = segments[2];
      return { view: (id ? 'sprint-detail' : 'sprint-list') as View, id: id || null };
    }
    if (subRoute === 'cockpit' || subRoute === 'governanca') return { view: 'cockpit' as View, id: null };

    // Default baseado no role
    return { view: (permissions.isOP ? 'activities' : 'okr-dashboard') as View, id: null };
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

  const handleGoOKRs = () => navigateInternal('dashboard');
  const handleGoSprints = () => navigateInternal('sprints');
  const handleGoCockpit = () => navigateInternal('cockpit');
  const handleGoActivities = () => navigateInternal('atividades');

  useEffect(() => {
    if (!permissions.isOP) return;
    if (currentView === 'sprint-list' || currentView === 'sprint-detail' || currentView === 'sprint-form' || currentView === 'cockpit') {
      handleGoActivities();
    }
  }, [permissions.isOP, currentView]);

  const saveOkrScroll = () => { 
    okrScrollRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    console.log('📍 Scroll salvo:', okrScrollRef.current);
  };
  const restoreOkrScroll = () => {
    const target = okrScrollRef.current || 0;
    console.log('📍 Restaurando scroll para:', target);
    // Usar requestAnimationFrame + setTimeout para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo({ top: target, behavior: 'auto' });
      }, 100);
    });
  };

  const handleCreateOKR = () => { 
    if (!permissions.okr.canCreate) return;
    saveOkrScroll(); 
    setSelectedOKR(null); 
    setIsCreatingOKR(true); 
  };
  const handleEditOKR = (okr: OKR) => { 
    if (!permissions.okr.canEdit(okr)) return;
    saveOkrScroll(); 
    setSelectedOKR(okr); 
    setIsCreatingOKR(true); 
  };
  const handleOKRFormClose = () => { setSelectedOKR(null); setIsCreatingOKR(false); restoreOkrScroll(); };
  const handleOKRFormSuccess = () => { setSelectedOKR(null); setIsCreatingOKR(false); restoreOkrScroll(); };

  const handleCreateSprint = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(true); };
  const handleEditSprint = (sprint: Sprint) => { setSelectedSprintForEdit(sprint); setIsCreatingSprint(true); };
  const handleSprintClick = (sprintId: string) => navigateInternal(`sprints/${sprintId}`);
  const handleSprintFormClose = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(false); };
  const handleSprintFormSuccess = () => { setSelectedSprintForEdit(null); setIsCreatingSprint(false); };
  const handleBackFromSprintDetail = () => handleGoSprints();

  useEffect(() => {
    if (!isCreatingOKR) return;
    if (selectedOKR && !permissions.okr.canEdit(selectedOKR)) {
      setSelectedOKR(null);
      setIsCreatingOKR(false);
    }
    if (!selectedOKR && !permissions.okr.canCreate) {
      setIsCreatingOKR(false);
    }
  }, [isCreatingOKR, selectedOKR, permissions.okr]);

  const CockpitIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const ActivitiesIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  // Tabs dinâmicas baseadas no role do usuário
  const tabs = useMemo(() => {
    const baseTabs = [];

    // Atividades - visível para todos os usuários
    // Para OP: aparece primeiro como tab principal
    // Para CEO/HEAD: aparece junto com as outras tabs
    if (permissions.isOP) {
      baseTabs.push({ 
        id: 'activities', 
        label: 'Atividades', 
        icon: ActivitiesIcon, 
        views: ['activities', 'home'], 
        action: handleGoActivities 
      });
    }

    // OKRs - sempre visível
    baseTabs.push({ 
      id: 'okr-dashboard', 
      label: 'OKRs', 
      icon: OKRsIcon, 
      views: permissions.isOP ? ['okr-dashboard', 'okr-form'] : ['home', 'okr-dashboard', 'okr-form'], 
      action: handleGoOKRs 
    });

    // Sprints - visível apenas para não-OP (CEO/HEAD)
    if (!permissions.isOP) {
      baseTabs.push({ 
        id: 'sprint-list', 
        label: 'Sprints', 
        icon: SprintsIcon, 
        views: ['sprint-list', 'sprint-detail', 'sprint-form'], 
        action: handleGoSprints 
      });
    }

    // Cockpit - visível apenas para não-OP (CEO/HEAD)
    if (!permissions.isOP) {
      baseTabs.push({ 
        id: 'cockpit', 
        label: 'Cockpit', 
        icon: CockpitIcon, 
        views: ['cockpit'], 
        action: handleGoCockpit 
      });
    }

    // Atividades - para CEO/HEAD aparece no final
    if (!permissions.isOP) {
      baseTabs.push({ 
        id: 'activities', 
        label: 'Atividades', 
        icon: ActivitiesIcon, 
        views: ['activities'], 
        action: handleGoActivities 
      });
    }

    return baseTabs;
  }, [permissions.isOP]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
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
        {/* Atividades - para todos os usuários */}
        {currentView === 'activities' && (
          <ActivitiesView onSprintClick={permissions.isOP ? undefined : handleSprintClick} />
        )}

        {(currentView === 'home' || currentView === 'okr-dashboard') && (
          <OKRDashboard
            onCreateNew={handleCreateOKR}
            onEdit={handleEditOKR}
            onViewSprint={permissions.isOP ? undefined : handleSprintClick}
          />
        )}

        {/* Modal de Edição/Criação de OKR */}
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

        {currentView === 'cockpit' && (
          <CockpitPage onViewSprint={handleSprintClick} />
        )}
      </div>
    </div>
  );
};

export default OKRModule;
