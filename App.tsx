
import React, { useState, useEffect } from 'react';
import { Module } from './types';
import { DiagnosticoComercial } from './components/DiagnosticoComercial';
import DealIdManager from './components/diagnostico/DealIdManager';
import AssistenteIA from './components/AssistenteIA';
import AppErrorBoundary, { AppErrorBoundaryEnhanced } from './components/common/AppErrorBoundary';
import CalculadoraOTE from './components/CalculadoraOTE';
import OpportunityFeedbackPage from './components/OpportunityFeedbackPage';
import Header from './components/Header';
import CallsList from './components/Calls/CallsList';
import CallsPlaceholder from './components/Calls/CallsPlaceholder';
import CallsApp from './components/Calls/CallsApp';
import LoginPage from './components/LoginPage';
import SettingsPage from './components/SettingsPage';
import ReativacaoLeadsPage from './components/ReativacaoLeadsPage';
import PublicResultPage from './components/PublicResultPage';
import PublicDiagnosticReport from './components/PublicDiagnosticReport';
import { UserProvider, useUser } from './contexts/DirectUserContext';
import { LoadingSpinner } from './components/ui/Feedback';
import { initializeLogos } from './utils/fetchLogosFromDatabase';
import UserMenu from './components/UserMenu';
import AppBrand from './components/common/AppBrand';
import FinalLoginPage from './components/FinalLoginPage';
import { getModuleFromPath, isStandalonePage } from './utils/router';
import { enableCriticalFetchAlerts } from './src/utils/net';
// Debug Panel sempre visível e robusto
import AlwaysVisibleDebugPanel from './components/debug/AlwaysVisibleDebugPanel';
// Utilitários de debug globais
import './utils/debugHelpers';
// Widget de feedback para usuários
import FeedbackWidget from './components/ui/FeedbackWidget';

// Debug Panel sempre visível - não depende de permissões
const DebugPanelWrapper: React.FC<{ user: any }> = ({ user }) => {
  return <AlwaysVisibleDebugPanel />;
};


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
  
  // Verificar se é a página de admin de incidentes (temporariamente desabilitada)
  const isErrorEventsAdminPage = false;
  // Verificar se é a página de admin de logs (temporariamente desabilitada)
  const isDebugLogsAdminPage = false;
  
  // Verificar se é uma página standalone (sem header)
  const isStandalone = isStandalonePage(window.location.pathname);

  // Inicialização do app
  useEffect(() => {
    console.log('📱 APP - Inicializado');
  }, []);

  // Habilitar alertas críticos de fetch (erros 5xx/rede em rotas críticas)
  useEffect(() => {
    enableCriticalFetchAlerts();
  }, []);

  // Captura global de erros e rejeições para alertas críticos
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const error = event.error || new Error(event.message);
        // @ts-ignore lazy import to avoid cycle
        const { postCriticalAlert } = require('./src/utils/net');
        
        // Fallback seguro se postCriticalAlert falhar
        const safePostAlert = (data: any) => {
          try {
            postCriticalAlert(data);
          } catch (alertError) {
            console.warn('🔒 Erro ao enviar alerta crítico:', alertError);
            // Log local como fallback
            console.error('🚨 Erro global capturado:', {
              title: data.title,
              message: data.message,
              timestamp: new Date().toISOString()
            });
          }
        };
        
        safePostAlert({
          title: 'Erro global não tratado',
          message: error?.message || String(error),
          context: {
            url: window.location.href,
            stack: error?.stack || '',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      } catch (fallbackError) {
        console.warn('🔒 Erro no handler de erro global:', fallbackError);
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        // @ts-ignore lazy import to avoid cycle
        const { postCriticalAlert } = require('./src/utils/net');
        
        // Fallback seguro se postCriticalAlert falhar
        const safePostAlert = (data: any) => {
          try {
            postCriticalAlert(data);
          } catch (alertError) {
            console.warn('🔒 Erro ao enviar alerta crítico:', alertError);
            // Log local como fallback
            console.error('🚨 Promise rejeitada capturada:', {
              title: data.title,
              message: data.message,
              timestamp: new Date().toISOString()
            });
          }
        };
        
        safePostAlert({
          title: 'Promise rejeitada não tratada',
          message: String(event.reason),
          context: {
            url: window.location.href,
            reason: event.reason
          }
        });
      } catch (fallbackError) {
        console.warn('🔒 Erro no handler de promise rejeitada:', fallbackError);
      }
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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
  
  // Se for página de admin de incidentes (temporariamente desabilitada)
  if (isErrorEventsAdminPage) {
    return <div>Página temporariamente indisponível</div>;
  }
  // Se for página de admin de logs persistidos
  if (isDebugLogsAdminPage) {
    // @ts-ignore lazy import to avoid type resolution issues during build
    const DebugLogsAdminPage = require('./components/DebugLogsAdminPage').default;
    return <DebugLogsAdminPage />;
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
          {(() => {
            console.log('🔄 APP - Renderizando DealIdManager para diagnóstico');
            return <DealIdManager />;
          })()}
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
          <AssistenteIA />
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
        // Nova UX dentro do app principal com roteamento via hash
        return <CallsApp />;
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
      
      {/* Widget de feedback para usuários */}
      <FeedbackWidget />
      
      {/* SuperAdmin Debug Panel com logs globais e Google Chat */}
      <DebugPanelWrapper user={user} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <AppErrorBoundaryEnhanced>
        <AppContent />
      </AppErrorBoundaryEnhanced>
    </UserProvider>
  );
};

export default App;
