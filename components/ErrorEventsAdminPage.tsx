import React from 'react';
import { UserProvider } from '../contexts/DirectUserContext';
import ErrorEventsAdmin from './debug/ErrorEventsAdmin';

const ErrorEventsAdminPage: React.FC = () => {
  return (
    <UserProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">🚨 Admin de Incidentes</h1>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="/"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ← Voltar ao App
                </a>
              </div>
            </div>
          </div>
        </div>
        <ErrorEventsAdmin />
      </div>
    </UserProvider>
  );
};

export default ErrorEventsAdminPage;
