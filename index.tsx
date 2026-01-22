
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicDiagnosticReport from './components/PublicDiagnosticReport';
import DiagnosticStandalonePage from './components/DiagnosticStandalonePage';
import OSSignaturePageClickSign from './components/OSManager/OSSignaturePageClickSign';
import MySignaturesArea from './components/OSManager/MySignaturesArea';
import { LogoTest } from './components/OSManager/LogoTest';
import { OSReprocessing } from './components/OSManager/OSReprocessing';

// Initialize Sentry before app renders
import { initSentry } from './src/sentry';
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/r/:token" element={<PublicDiagnosticReport />} />
        <Route path="/diagnostico" element={<DiagnosticStandalonePage />} />
        <Route path="/diagnostico/*" element={<DiagnosticStandalonePage />} />
        <Route path="/assinar/:orderId/:signerId" element={<OSSignaturePageClickSign />} />
        <Route path="/minhas-assinaturas/:signerEmail" element={<MySignaturesArea />} />
        <Route path="/logo-test" element={<LogoTest />} />
        <Route path="/os-reprocessing" element={<OSReprocessing />} />
        <Route path="/" element={<App />} />
        <Route path="/assistente" element={<App />} />
        <Route path="/calculadora" element={<App />} />
        <Route path="/chamadas" element={<App />} />
        <Route path="/configuracoes" element={<App />} />
        <Route path="/feedback" element={<App />} />
        <Route path="/reativacao" element={<App />} />
        <Route path="/ordens-servico" element={<App />} />
        <Route path="/resultado-diagnostico" element={<App />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
