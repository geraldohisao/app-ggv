import React from 'react';

/**
 * Placeholder temporário do módulo OKR.
 * Mantém a aplicação compilando sem expor a funcionalidade completa.
 */
export const OKRModule: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Módulo OKR</h1>
        <p className="text-lg text-slate-600 mb-6">
          O módulo de Gestão de OKR está temporariamente indisponível nesta versão.
        </p>
        <p className="text-sm text-slate-500">
          Entre em contato com o administrador do sistema para mais informações.
        </p>
      </div>
    </div>
  );
};

export default OKRModule;
