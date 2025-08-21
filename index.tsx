
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicDiagnosticReport from './components/PublicDiagnosticReport';
import DiagnosticStandalonePage from './components/DiagnosticStandalonePage';

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
        <Route path="/" element={<App />} />
        <Route path="/assistente" element={<App />} />
        <Route path="/calculadora" element={<App />} />
        <Route path="/chamadas" element={<App />} />
        <Route path="/configuracoes" element={<App />} />
        <Route path="/feedback" element={<App />} />
        <Route path="/reativacao" element={<App />} />
        <Route path="/resultado-diagnostico" element={<App />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
