import React, { useState } from 'react';
import { useUser } from '../contexts/FinalAuth';
import { GoogleIcon } from './ui/icons';
import { LOGO_URLS } from '../config/logos';

const FinalLoginPage: React.FC = () => {
    const { login, loading } = useUser();
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        try {
            setError(null);
            await login();
        } catch (error: any) {
            console.error('Erro no login:', error);
            setError(error.message || 'Erro ao fazer login');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    {/* Logo */}
                    <div className="mb-6 flex items-center justify-center">
                        <img
                            src={LOGO_URLS.grupoGGVLogoUrl}
                            alt="Grupo GGV"
                            className="h-12 w-auto object-contain"
                            loading="eager"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    
                    {/* Título */}
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Diagnóstico Comercial</h1>
                    <p className="text-slate-500 mb-6">Faça login para continuar</p>
                    
                    {/* Loading */}
                    {loading && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-center gap-2 text-blue-700">
                                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm">Redirecionando para Google...</span>
                            </div>
                        </div>
                    )}

                    {/* Botão de Login */}
                    <button 
                        onClick={handleLogin} 
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <GoogleIcon className="w-5 h-5 mr-3" />
                        {loading ? 'Redirecionando...' : 'Continuar com Google'}
                    </button>

                    {/* Erro */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {/* Deal ID Info */}
                    {new URLSearchParams(window.location.search).get('deal_id') && (
                        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            <strong>Deal ID:</strong> {new URLSearchParams(window.location.search).get('deal_id')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinalLoginPage;
