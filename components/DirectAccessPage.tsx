import React, { useState } from 'react';
import { useUser } from '../contexts/RobustUserContext';
import { DiagnosticoComercial } from './DiagnosticoComercial';
import { GoogleIcon } from './ui/icons';
import AppBrand from './common/AppBrand';
import { LOGO_URLS } from '../config/logos';

const DirectAccessPage: React.FC = () => {
    const { user, loading, login, loginAsTestUser } = useUser();
    const [showDirectAccess, setShowDirectAccess] = useState(false);
    const [accessAttempts, setAccessAttempts] = useState(0);

    // Se usuário já está logado, mostrar diagnóstico
    if (user) {
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
                                    Olá, {user.name}
                                </span>
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.reload();
                                    }}
                                    className="text-sm text-red-600 hover:text-red-800"
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

    const handleDirectAccess = () => {
        console.log('🚀 DIRECT ACCESS - Forçando acesso direto...');
        
        const directUser = {
            id: 'direct-access-' + Date.now(),
            email: 'acesso@grupoggv.com',
            name: 'Acesso Direto',
            initials: 'AD',
            role: 'SUPER_ADMIN',
        };
        
        localStorage.setItem('ggv-emergency-user', JSON.stringify(directUser));
        window.location.reload();
    };

    const handleGoogleLogin = async () => {
        setAccessAttempts(prev => prev + 1);
        
        try {
            await login();
        } catch (error) {
            console.error('Erro no login:', error);
            
            // Se falhar 2 vezes, mostrar acesso direto
            if (accessAttempts >= 1) {
                setShowDirectAccess(true);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="mb-6 flex items-center justify-center">
                        <img
                            src={LOGO_URLS.grupoGGVLogoUrl}
                            alt="Grupo GGV"
                            className="h-12 w-auto object-contain"
                            loading="eager"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-slate-800">Diagnóstico Comercial</h1>
                    <p className="text-slate-500 mt-1 mb-6">Acesso Simplificado</p>
                    
                    {loading && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-center gap-2 text-blue-700">
                                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm">Redirecionando para Google...</span>
                            </div>
                        </div>
                    )}

                    {/* Botão principal do Google */}
                    <div className="flex justify-center my-6">
                        <button 
                            onClick={handleGoogleLogin} 
                            disabled={loading}
                            className="w-full max-w-xs inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-full shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            {loading ? 'Redirecionando...' : 'Continuar com Google'}
                        </button>
                    </div>

                    {/* Mostrar acesso direto após falhas */}
                    {(showDirectAccess || accessAttempts >= 1) && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="text-sm font-bold text-yellow-800 mb-2">
                                Problemas com o login?
                            </h3>
                            <p className="text-xs text-yellow-700 mb-3">
                                Use o acesso direto para entrar rapidamente no diagnóstico.
                            </p>
                            <button
                                onClick={handleDirectAccess}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                🚀 Acesso Direto ao Diagnóstico
                            </button>
                        </div>
                    )}

                    {/* Acesso de teste */}
                    <div className="mt-6 border-t border-slate-200 pt-4">
                        <div className="text-center">
                            <button
                                onClick={loginAsTestUser}
                                className="text-sm text-slate-500 hover:text-slate-700 hover:underline focus:outline-none"
                            >
                                Acessar como Teste (Admin)
                            </button>
                        </div>
                    </div>

                    {/* Informações do deal_id */}
                    {new URLSearchParams(window.location.search).get('deal_id') && (
                        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            <strong>Deal ID detectado:</strong> {new URLSearchParams(window.location.search).get('deal_id')}
                            <br />
                            <span className="text-blue-600">Os dados serão pré-carregados após o login.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DirectAccessPage;
