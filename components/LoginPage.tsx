import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/SimpleUserContext';
import { GoogleIcon, ExclamationTriangleIcon } from './ui/icons';
import { supabase } from '../services/supabaseClient';
import { isValidKey, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/config';
import { GGVLogo } from './ui/GGVLogo';

const LoginPage: React.FC = () => {
    const { login, loading: authLoading } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigIncomplete, setIsConfigIncomplete] = useState(false);
    
    // Detectar se estamos processando retorno do OAuth
    const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
    
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('access_token') || urlParams.has('code') || 
                             urlParams.has('error') || window.location.hash.includes('access_token');
        
        if (hasAuthParams) {
            console.log('🔄 LOGIN PAGE - Detectado retorno do OAuth, processando...');
            setIsProcessingOAuth(true);
        }
    }, []);
    
    useEffect(() => {
        const isIncomplete = ![SUPABASE_URL, SUPABASE_ANON_KEY].every(isValidKey);
        setIsConfigIncomplete(isIncomplete);
    }, []);


    const handleGoogleLogin = async () => {
        console.log('🔐 LOGIN PAGE - Iniciando login com Google...');
        
        setLoading(true);
        setError(null);
        
        try {
            await login();
            console.log('🔐 LOGIN PAGE - Redirecionamento iniciado');
        } catch (err: any) {
            console.error('🚨 LOGIN PAGE - Erro no login:', err);
            setError('Erro no login. Verifique sua conexão e tente novamente.');
            setLoading(false);
        }
    };



    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="mb-6 flex items-center justify-center">
                        <img
                            src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
                            alt="Grupo GGV"
                            className="h-16 w-auto object-contain"
                            loading="eager"
                            onError={(e) => {
                                console.warn('🖼️ Logo do Grupo GGV falhou, usando fallback');
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwXzEpIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSI1MCIgeT0iNDciIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwZDk0ODgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiPkc8L3RleHQ+Cjx0ZXh0IHg9IjUwIiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPkdSVVBPIEdHVjwvdGV4dD4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwXzEiIHgxPSIwIiB5MT0iMCIgeDI9IjEwMCIgeTI9IjEwMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMGQ5NDg4Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBmNzY2ZSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=';
                            }}
                        />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-slate-800">Bem-vindo(a)</h1>
                    <p className="text-slate-500 mt-1 mb-6">Acesse sua conta GGV</p>
                    
                    {/* Status de processamento OAuth */}
                    {(isProcessingOAuth || authLoading) && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-center gap-2 text-blue-700">
                                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm">
                                    {isProcessingOAuth ? 'Finalizando login...' : 'Verificando autenticação...'}
                                </span>
                            </div>
                            <div className="mt-2 text-center text-xs text-blue-600">
                                {isProcessingOAuth ? 'Processando tokens do Google...' : 'Carregando dados do usuário...'}
                            </div>
                            
                            {/* Botão de limpeza apenas */}
                            <div className="mt-3">
                                <button
                                    onClick={() => {
                                        console.log('🧹 LIMPEZA - Limpando cache e recarregando...');
                                        localStorage.clear();
                                        sessionStorage.clear();
                                        const dealId = new URLSearchParams(window.location.search).get('deal_id');
                                        window.location.href = window.location.origin + window.location.pathname + 
                                            (dealId ? `?deal_id=${dealId}` : '');
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                    Problema? Clique para limpar cache e tentar novamente
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {isConfigIncomplete && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-xs">
                            <h3 className="font-bold text-yellow-800 text-sm mb-2 text-center flex items-center justify-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5" />
                                Configuração Necessária
                            </h3>
                            <p className="text-yellow-700 text-center">
                                A plataforma não está configurada.
                            </p>
                            <p className="text-yellow-600 mt-3 text-center">
                                Um administrador deve usar o <strong>"Acesso como Teste"</strong> para entrar no painel de <strong>Configurações</strong> e inserir as chaves do Supabase.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-center my-6">
                         <button 
                            onClick={handleGoogleLogin} 
                            disabled={loading || isProcessingOAuth || authLoading}
                            className="w-full max-w-xs inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-full shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            {loading && 'Redirecionando...'}
                            {isProcessingOAuth && 'Processando...'}
                            {authLoading && !isProcessingOAuth && 'Carregando...'}
                            {!loading && !isProcessingOAuth && !authLoading && 'Continuar com o Google'}
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-600 text-xs mt-4 text-center">{error}</p>
                    )}




                </div>
            </div>
        </div>
    );
};

export default LoginPage;