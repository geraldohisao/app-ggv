
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
import PublicDiagnosticReport from './components/PublicDiagnosticReport';
import { UserProvider, useUser } from './contexts/DirectUserContext';
import { LoadingSpinner } from './components/ui/Feedback';
// Debug panels removidos para evitar conflitos
import { initializeLogos } from './utils/fetchLogosFromDatabase';
import UserMenu from './components/UserMenu';
import AppBrand from './components/common/AppBrand';
import FinalLoginPage from './components/FinalLoginPage';
import { getModuleFromPath, isStandalonePage } from './utils/router';
import SessionDebugPanel from './components/debug/SessionDebugPanel';
import RoleTestPanel from './components/debug/RoleTestPanel';


const AppContent: React.FC = () => {
  const { user, loading, logout } = useUser();
  const [activeModule, setActiveModule] = useState<Module>(() => getModuleFromPath(window.location.pathname));

  // Garantir que ao carregar a página, o módulo correto seja selecionado
  useEffect(() => {
    const currentModule = getModuleFromPath(window.location.pathname);
    if (currentModule !== activeModule) {
      console.log(`🔄 APP - Atualizando módulo: ${activeModule} → ${currentModule}`);
      setActiveModule(currentModule);
    }
  }, [user, activeModule]); // Reexecutar quando o usuário for carregado ou módulo mudar

  // Verificar se é uma página de resultado público
  const isPublicResultPage = window.location.pathname === '/resultado-diagnostico';
  
  // Verificar se é uma página de relatório público com token seguro (formato: /r/{token})
  const tokenMatch = window.location.pathname.match(/^\/r\/(.+)$/);
  const isPublicDiagnosticReport = tokenMatch !== null;
  
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
  
  // Se for página de relatório público com deal_id, não precisa de autenticação
  if (isPublicDiagnosticReport) {
    return <PublicDiagnosticReport />;
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
    console.log('🎯 APP - Renderizando módulo:', activeModule);
    console.log('🎯 APP - Pathname atual:', window.location.pathname);
    
    switch (activeModule) {
      case Module.Diagnostico:
        console.log('📊 APP - Renderizando Diagnóstico');
        return <DiagnosticoComercial />;
      case Module.Assistente:
        console.log('🤖 APP - Renderizando Assistente');
        return (
          <AppErrorBoundary>
            <AssistenteIA />
          </AppErrorBoundary>
        );
      case Module.Calculadora:
        console.log('🧮 APP - Renderizando Calculadora');
        return <CalculadoraOTE />;
      case Module.Settings:
        console.log('⚙️ APP - Renderizando Settings');
        return <SettingsPage />;
      case Module.OpportunityFeedback:
        console.log('📝 APP - Renderizando Opportunity Feedback');
        return <OpportunityFeedbackPage />;
      case Module.Calls:
        console.log('📞 APP - Renderizando Calls');
        return <CallsList />;
      case Module.ReativacaoLeads:
        console.log('🔄 APP - Renderizando Reativação');
        return <ReativacaoLeadsPage />;
      default:
        console.log('🏠 APP - Renderizando Default (Diagnóstico)');
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
      
      {/* Painéis de debug - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <SessionDebugPanel />
          <RoleTestPanel />
        </>
      )}
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
