import React from 'react';
import { GGVLogo } from './ui/GGVLogo';

interface AccessDeniedProps {
  title: string;
  message: string;
  requiredRoles?: string[];
  userRole?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  title, 
  message, 
  requiredRoles = [],
  userRole 
}) => {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-4">
          <GGVLogo size="small" variant="horizontal" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 text-center">{title}</h1>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
          <p className="text-red-700 text-base leading-relaxed">{message}</p>
        </div>

        {requiredRoles.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-red-200">
            <h3 className="font-semibold text-slate-900 mb-2">Acesso permitido para:</h3>
            <div className="flex justify-center gap-2 flex-wrap">
              {requiredRoles.map((role, index) => (
                <span 
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
            
            {userRole && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm text-slate-600">
                  Sua função atual: <span className="font-medium text-red-700">{userRole}</span>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-slate-600">
          <p>Se você acredita que deveria ter acesso a esta funcionalidade, entre em contato com o administrador do sistema.</p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="bg-slate-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-slate-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
