
import React, { useState, useEffect } from 'react';
import { Module } from './types';
import { DiagnosticoComercial } from './components/DiagnosticoComercial';
import AssistenteIA from './components/AssistenteIA';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import CalculadoraOTE from './components/CalculadoraOTE';
import OpportunityFeedbackPage from './components/OpportunityFeedbackPage';
import Header from './components/Header';
import CallsList from './components/Calls/CallsList';
import LoginPage from './components/LoginPage';
import SettingsPage from './components/SettingsPage';
import ReativacaoLeadsPage from './components/ReativacaoLeadsPage';
import PublicResultPage from './components/PublicResultPage';
import { UserProvider, useUser } from './contexts/DirectUserContext';
import { LoadingSpinner } from './components/ui/Feedback';
// Debug panels removidos para evitar conflitos
import { initializeLogos } from './utils/fetchLogosFromDatabase';
import UserMenu from './components/UserMenu';
import AppBrand from './components/common/AppBrand';
import FinalLoginPage from './components/FinalLoginPage';
import { getModuleFromPath, isStandalonePage } from './utils/router';


const AppContent: React.FC = () => {
  const { user, loading, logout } = useUser();
  const [activeModule, setActiveModule] = useState<Module>(() => getModuleFromPath(window.location.pathname));

  // Verificar se é uma página de resultado público
  const isPublicResultPage = window.location.pathname === '/resultado-diagnostico';
  
  // Verificar se é a página de diagnóstico standalone
  const isDiagnosticPage = window.location.pathname === '/diagnostico' || window.location.pathname.startsWith('/diagnostico/');
  
  // Verificar se é uma página standalone (sem header)
  const isStandalone = isStandalonePage(window.location.pathname);

  // Logos desabilitados temporariamente para evitar erros 404
  useEffect(() => {
    console.log('📱 APP - Inicializado sem buscar logos (evitando erros 404)');
  }, []);

  // Listener para mudanças de rota
  useEffect(() => {
    const handleRouteChange = (event: CustomEvent) => {
      const { module } = event.detail;
      setActiveModule(module);
    };

    const handlePopState = () => {
      const newModule = getModuleFromPath(window.location.pathname);
      setActiveModule(newModule);
    };

    window.addEventListener('routeChange', handleRouteChange as EventListener);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('routeChange', handleRouteChange as EventListener);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Se for página de resultado público, não precisa de autenticação
  if (isPublicResultPage) {
    return <PublicResultPage />;
  }
  
  // Se for página de diagnóstico, usar componente específico
  if (isDiagnosticPage) {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      );
    }

    // O login é gerenciado pelo DirectUserContext
    if (!user) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full font-sans">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0">
                <AppBrand className="h-12" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-100">
          <DiagnosticoComercial />
        </main>
      </div>
    );
  }

  // A tela de login é renderizada pelo DirectUserContext quando não há usuário
  if (loading || !user) {
    return null;
  }

  const renderModule = () => {
    switch (activeModule) {
      case Module.Diagnostico:
        return <DiagnosticoComercial />;
      case Module.Assistente:
        return (
          <AppErrorBoundary>
            <AssistenteIA />
          </AppErrorBoundary>
        );
      case Module.Calculadora:
        return <CalculadoraOTE />;
      case Module.Settings:
        return <SettingsPage />;
      case Module.OpportunityFeedback:
        return <OpportunityFeedbackPage />;
      case Module.Calls:
        return <CallsList />;
      case Module.ReativacaoLeads:
        return <ReativacaoLeadsPage />;
      default:
        return <DiagnosticoComercial />;
    }
  };

  const isFullScreen = activeModule === Module.OpportunityFeedback;

  return (
    <div className="flex flex-col h-full font-sans">
      {!isFullScreen && (
        <Header activeModule={activeModule} setActiveModule={setActiveModule} onLogout={logout} />
      )}
      <main className={`flex-1 overflow-y-auto ${isFullScreen ? 'bg-white' : 'bg-slate-100'}`}>
        {renderModule()}
      </main>

    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;
