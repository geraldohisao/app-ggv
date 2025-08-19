import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/SimpleGoogleAuth';
import { GoogleIcon } from './ui/icons';
import { supabase } from '../services/supabaseClient';
import { isValidKey, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/config';
import { LOGO_URLS } from '../config/logos';

const GoogleLoginPage: React.FC = () => {
    const { login, loading: authLoading } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigIncomplete, setIsConfigIncomplete] = useState(false);
    const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

    // Detectar se estamos processando retorno do OAuth
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('access_token') || urlParams.has('code') || 
                             urlParams.has('error') || window.location.hash.includes('access_token');
        
        if (hasAuthParams) {
            console.log('🔄 GOOGLE LOGIN - Detectado retorno do OAuth, processando...');
            setIsProcessingOAuth(true);
        }
    }, []);
    
    useEffect(() => {
        const isIncomplete = ![SUPABASE_URL, SUPABASE_ANON_KEY].every(isValidKey);
        setIsConfigIncomplete(isIncomplete);
    }, []);

    const handleGoogleLogin = async () => {
        if (loading || isConfigIncomplete || isProcessingOAuth || authLoading) return;
        
        setLoading(true);
        setError(null);
        
        try {
            await login();
        } catch (error: any) {
            console.error('Erro no login:', error);
            setError(error.message || 'Erro ao fazer login. Tente novamente.');
            setLoading(false);
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
                                {isProcessingOAuth ? 'Processando dados do Google...' : 'Carregando informações do usuário...'}
                            </div>
                        </div>
                    )}
                    
                    {isConfigIncomplete && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left text-xs">
                            <h3 className="font-bold text-red-800 text-sm mb-2 text-center">
                                ⚠️ Configuração Necessária
                            </h3>
                            <p className="text-red-700 text-center">
                                A plataforma não está configurada corretamente. Entre em contato com o administrador.
                            </p>
                        </div>
                    )}

                    {!isConfigIncomplete && (
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
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm text-center">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setLoading(false);
                                }}
                                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {/* Informações do deal_id se presente */}
                    {new URLSearchParams(window.location.search).get('deal_id') && (
                        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            <strong>Deal ID:</strong> {new URLSearchParams(window.location.search).get('deal_id')}
                            <br />
                            <span className="text-blue-600">Os dados serão carregados após o login.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoogleLoginPage;
