import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { GoogleIcon, ExclamationTriangleIcon } from './ui/icons';
import { supabase } from '../services/supabaseClient';
import { isValidKey, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/config';
import { EmergencyAuth } from './auth/EmergencyAuth';
import { LOGO_URLS } from '../config/logos';

const LoginPage: React.FC = () => {
    const { login, loginAsTestUser, loading: authLoading } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigIncomplete, setIsConfigIncomplete] = useState(false);
    // Usar URL fixa do logo
    const logoUrl = LOGO_URLS.grupoGGVLogoUrl;
    
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
        if (isConfigIncomplete) {
            setError("A configuração do Supabase está incompleta. Contate o administrador.");
            return;
        }
        
        setLoading(true);
        setError(null);
        
        console.log('🔐 LOGIN PAGE - Iniciando processo de login...');
        
        try {
            await login();
            // O login redireciona para o Google, então não chegamos aqui normalmente
            console.log('🔐 LOGIN PAGE - Login iniciado com sucesso');
        } catch (err: any) {
            console.error('🚨 LOGIN PAGE - Erro no login:', err);
            
            let errorMessage = 'Erro no login. Tente novamente.';
            
            if (err.error_description) {
                errorMessage = err.error_description;
            } else if (err.message) {
                if (err.message.includes('network') || err.message.includes('fetch')) {
                    errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
                } else if (err.message.includes('timeout')) {
                    errorMessage = 'Tempo esgotado. Tente novamente.';
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="mb-6 flex items-center justify-center">
                        <img
                          src={logoUrl}
                          alt="Grupo GGV"
                          className="h-12 w-auto object-contain"
                          loading="eager"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.warn('Logo falhou, usando fallback SVG');
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentNode;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.innerHTML = `
                                <div class="flex items-center gap-3">
                                  <div class="h-7 w-12 rounded-xl bg-teal-600"></div>
                                  <span class="text-2xl font-extrabold text-slate-900">Grupo GGV</span>
                                </div>
                              `;
                              parent.appendChild(fallback);
                            }
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
                            {/* Botão de emergência */}
                            <div className="mt-3 text-center">
                                <button
                                    onClick={() => {
                                        console.log('🚨 EMERGÊNCIA - Limpando e recarregando...');
                                        localStorage.clear();
                                        const dealId = new URLSearchParams(window.location.search).get('deal_id');
                                        window.location.href = window.location.origin + window.location.pathname + 
                                            (dealId ? `?deal_id=${dealId}` : '');
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                    Problema? Clique para limpar e tentar novamente
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
                            disabled={loading || isConfigIncomplete || isProcessingOAuth || authLoading}
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

                    {/* Emergency Auth para casos onde o OAuth falha */}
                    {(isProcessingOAuth || authLoading) && (
                        <EmergencyAuth 
                            onAuthSuccess={(user) => {
                                // Simular o comportamento do UserContext
                                console.log('🎉 EMERGENCY LOGIN - Usuário:', user);
                                window.location.reload(); // Força reload para resetar estados
                            }}
                        />
                    )}

                    <div className="mt-6 border-t border-slate-200 pt-4">
                        <button
                            onClick={loginAsTestUser}
                            className="text-sm text-slate-500 hover:text-slate-700 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 rounded"
                        >
                            Acessar como Teste (Admin)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;