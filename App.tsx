
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
import { UserProvider, useUser } from './contexts/UserContext';
import { LoadingSpinner } from './components/ui/Feedback';
import { AuthDebugPanel, useAuthDebug } from './components/debug/AuthDebugPanel';
import { initializeLogos } from './utils/fetchLogosFromDatabase';

const AppContent: React.FC = () => {
  const { user, loading, logout } = useUser();
  const [activeModule, setActiveModule] = useState<Module>(Module.Diagnostico);
  const { debugVisible } = useAuthDebug();

  // Inicializar sistema de logos
  useEffect(() => {
    initializeLogos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <AuthDebugPanel visible={debugVisible} />
      </>
    );
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
