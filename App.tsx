
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
import { UserProvider, useUser } from './contexts/SimpleGoogleAuth';
import { LoadingSpinner } from './components/ui/Feedback';
import { AuthDebugPanel, useAuthDebug } from './components/debug/AuthDebugPanel';
import { RobustDebugPanel } from './components/debug/RobustDebugPanel';
import { initializeLogos } from './utils/fetchLogosFromDatabase';
import UserMenu from './components/UserMenu';
import AppBrand from './components/common/AppBrand';
import GoogleLoginPage from './components/GoogleLoginPage';


const AppContent: React.FC = () => {
  const { user, loading, logout } = useUser();
  const [activeModule, setActiveModule] = useState<Module>(Module.Diagnostico);
  const { debugVisible } = useAuthDebug();

  // Verificar se é uma página de resultado público
  const isPublicResultPage = window.location.pathname === '/resultado-diagnostico';
  
  // Verificar se é a página de diagnóstico standalone
  const isDiagnosticPage = window.location.pathname === '/diagnostico' || window.location.pathname.startsWith('/diagnostico/');

  // Inicializa o sistema de logos uma única vez no início do app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // pequena espera para garantir supabase pronto em ambientes locais
      const timer = setTimeout(() => {
        initializeLogos();
      }, 500);
      return () => clearTimeout(timer);
    }
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

    if (!user) {
      return <GoogleLoginPage />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <GoogleLoginPage />;
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
      <AuthDebugPanel visible={debugVisible} />
      <RobustDebugPanel />
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
