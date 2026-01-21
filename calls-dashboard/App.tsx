import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import CallsPage from './pages/CallsPage';
import CallDetailPage from './pages/CallDetailPage';
import ScorecardPage from './pages/ScorecardPage';
import ScorecardEditPage from './pages/ScorecardEditPage';
import SdrDetailPage from './pages/SdrDetailPage';
import { useAdminFeatures } from '../hooks/useAdminPermissions';

export default function App() {
  const { canAccessManualAnalysis } = useAdminFeatures();

  return (
    <HashRouter>
      <div className="h-full flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto bg-slate-100">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calls" element={<CallsPage />} />
              <Route path="/calls/:id" element={<CallDetailPage />} />
              <Route
                path="/scorecards"
                element={canAccessManualAnalysis ? <ScorecardPage /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="/scorecards/:id"
                element={canAccessManualAnalysis ? <ScorecardEditPage /> : <Navigate to="/dashboard" replace />}
              />
              <Route path="/sdr/:id" element={<SdrDetailPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}


