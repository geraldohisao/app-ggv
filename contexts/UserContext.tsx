import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { fetchOrCreateUserWithRole } from '../services/supabaseService';
import type { Session } from '@supabase/supabase-js';
import { SimpleAuth } from '../components/auth/SimpleAuth';

interface UserContextType {
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    loginAsTestUser: () => void;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    login: async () => {},
    logout: () => {},
    loginAsTestUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authProcessing, setAuthProcessing] = useState(false);
    const [useSimpleAuth, setUseSimpleAuth] = useState(false);

    useEffect(() => {
        if (!supabase) {
            console.log('🔐 AUTH - Supabase não configurado');
            setLoading(false);
            return;
        }

        let mounted = true;
        let authChangeTimeout: NodeJS.Timeout;
        
        // Verificar se estamos retornando de OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const isOAuthReturn = urlParams.has('access_token') || hashParams.has('access_token') || 
                             urlParams.has('code') || urlParams.has('error');
        
        if (isOAuthReturn) {
            console.log('🔄 AUTH - Detectado retorno do OAuth, usando autenticação simples...');
            setUseSimpleAuth(true);
            return;
        }

        const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
            return await Promise.race([
                p,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout(${ms}ms)`)), ms)),
            ]);
        };

        const cleanAuthParamsFromUrl = () => {
            try {
                const url = new URL(window.location.href);
                const params = url.searchParams;
                
                // Lista de parâmetros relacionados ao OAuth que devem ser removidos
                const authParams = [
                    'access_token', 'expires_in', 'refresh_token', 'token_type',
                    'type', 'code', 'state', 'error', 'error_description',
                    '#access_token', '#expires_in', '#refresh_token', '#token_type', '#type'
                ];
                
                let hasAuthParams = false;
                authParams.forEach(param => {
                    if (params.has(param)) {
                        params.delete(param);
                        hasAuthParams = true;
                    }
                });
                
                // Limpar hash fragments também
                if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
                    hasAuthParams = true;
                }
                
                if (hasAuthParams) {
                    const cleanUrl = url.origin + url.pathname + (params.toString() ? '?' + params.toString() : '');
                    console.log('🧹 AUTH - Limpando URL de parâmetros de auth');
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            } catch (error) {
                console.warn('⚠️ AUTH - Erro ao limpar URL:', error);
            }
        };

        const processAuthState = async (session: any, source: string) => {
            if (!mounted) return;
            
            // Se já está processando, ignorar esta tentativa para evitar loop
            if (authProcessing) {
                console.log(`⏳ AUTH - Já processando, ignorando tentativa... (${source})`);
                return;
            }
            
            console.log(`🔐 AUTH - Processando estado (${source}):`, session ? 'COM sessão' : 'SEM sessão');
            setAuthProcessing(true);

            try {
                if (session) {
                    console.log('📋 AUTH - Detalhes da sessão:', {
                        userId: session.user?.id?.slice(-8),
                        email: session.user?.email,
                        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'
                    });
                    
                    // Limpar parâmetros de auth da URL após login bem-sucedido
                    if (source.includes('evento-SIGNED_IN') || source === 'inicial') {
                        cleanAuthParamsFromUrl();
                    }
                    
                    console.log('👤 AUTH - Buscando/criando perfil do usuário...');
                    const userProfile = await withTimeout(fetchOrCreateUserWithRole(), 12000);
                    
                    if (!mounted) return;
                    
                    if (userProfile) {
                        console.log('✅ AUTH - Usuário carregado:', userProfile.email, 'Role:', userProfile.role);
                        setUser(userProfile);
                    } else {
                        console.warn('⚠️ AUTH - Falha ao criar perfil do usuário');
                        // Em caso de falha, criar um perfil básico temporário
                        const basicProfile = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.full_name || 'Usuário',
                            initials: (session.user.user_metadata?.full_name || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
                            role: UserRole.User,
                        };
                        console.log('🔧 AUTH - Usando perfil básico temporário');
                        setUser(basicProfile);
                    }
                } else {
                    console.log('🚪 AUTH - Usuário desconectado');
                    setUser(null);
                }
            } catch (error: any) {
                console.error(`❌ AUTH - Erro ao processar (${source}):`, error);
                
                // Se houver sessão mas erro no processamento, tentar perfil básico
                if (session && session.user) {
                    console.log('🔧 AUTH - Tentando perfil básico após erro...');
                    try {
                        const basicProfile = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.full_name || 'Usuário',
                            initials: (session.user.user_metadata?.full_name || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
                            role: UserRole.User,
                        };
                        setUser(basicProfile);
                        console.log('✅ AUTH - Perfil básico criado após erro');
                    } catch (fallbackError) {
                        console.error('❌ AUTH - Falha até no perfil básico:', fallbackError);
                        if (mounted) setUser(null);
                    }
                } else {
                    if (mounted) setUser(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                    setAuthProcessing(false);
                }
            }
        };

        // 1) Estado inicial - verificar emergency user primeiro
        (async () => {
            try {
                // Verificar se há usuário de emergência no localStorage
                const emergencyUser = localStorage.getItem('ggv-emergency-user');
                if (emergencyUser) {
                    try {
                        const user = JSON.parse(emergencyUser);
                        console.log('🚨 AUTH - Usuário de emergência encontrado:', user.email);
                        if (mounted) {
                            setUser(user);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('⚠️ AUTH - Erro ao carregar usuário de emergência:', e);
                        localStorage.removeItem('ggv-emergency-user');
                    }
                }
                
                console.log('🔐 AUTH - Verificando sessão inicial...');
                const result = await withTimeout(supabase.auth.getSession(), 8000) as any;
                const { data: { session } } = result;
                await processAuthState(session, 'inicial');
            } catch (error) {
                console.warn('⚠️ AUTH - Falha na verificação inicial:', (error as any)?.message);
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                    setAuthProcessing(false);
                }
            }
        })();

        // 2) Reagir a mudanças de auth com debounce
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted || authProcessing) return;
            
            console.log('🔄 AUTH - Evento:', event, session ? 'COM sessão' : 'SEM sessão');
            
            // Ignorar eventos redundantes para evitar loop
            if (event === 'INITIAL_SESSION') {
                console.log('⏩ AUTH - Ignorando INITIAL_SESSION (já processado)');
                return;
            }
            
            // Debounce para evitar múltiplas execuções
            if (authChangeTimeout) {
                clearTimeout(authChangeTimeout);
            }
            
            authChangeTimeout = setTimeout(() => {
                if (!authProcessing && mounted) {
                    processAuthState(session, `evento-${event}`);
                }
            }, 500);
        });

        // 3) Timeout de segurança - se ficar mais de 15 segundos carregando, forçar conclusão
        const safetyTimeout = setTimeout(() => {
            if (mounted && (loading || authProcessing)) {
                console.warn('⏰ AUTH - Timeout de segurança ativado, forçando conclusão...');
                setLoading(false);
                setAuthProcessing(false);
                
                // Se ainda não tiver usuário, tentar uma última verificação
                if (!user) {
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session && session.user) {
                            console.log('🔧 AUTH - Última tentativa com perfil básico...');
                            const basicProfile = {
                                id: session.user.id,
                                email: session.user.email || '',
                                name: session.user.user_metadata?.full_name || 'Usuário',
                                initials: (session.user.user_metadata?.full_name || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
                                role: UserRole.User,
                            };
                            setUser(basicProfile);
                        }
                    }).catch(console.error);
                }
            }
        }, 15000);

        return () => {
            mounted = false;
            if (authChangeTimeout) clearTimeout(authChangeTimeout);
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const login = async () => {
        if (!supabase) {
            throw new Error("Login attempt failed: Supabase client is not configured.");
        }
        setLoading(true);
        
        // Limpar URL de parâmetros de auth para evitar loops
        // Forçar uso do domínio correto em produção
        const isProduction = window.location.hostname === 'app.grupoggv.com';
        const baseOrigin = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
        const baseUrl = baseOrigin + window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Preservar apenas parâmetros importantes (não relacionados ao auth)
        const preservedParams = new URLSearchParams();
        if (urlParams.has('deal_id')) {
            preservedParams.set('deal_id', urlParams.get('deal_id')!);
        }
        if (urlParams.has('dealId')) {
            preservedParams.set('dealId', urlParams.get('dealId')!);
        }
        
        const cleanUrl = baseUrl + (preservedParams.toString() ? '?' + preservedParams.toString() : '');
        
        console.log('🔐 LOGIN - Domínio detectado:', {
            hostname: window.location.hostname,
            isProduction,
            baseOrigin,
            cleanUrl
        });
        
        console.log('🔐 LOGIN - Iniciando OAuth com redirect para:', cleanUrl);
        
        try {
            await supabase.auth.signInWithOAuth({ 
                provider: 'google',
                options: {
                    redirectTo: cleanUrl,
                    scopes: 'openid email profile https://www.googleapis.com/auth/gmail.send',
                    queryParams: {
                        include_granted_scopes: 'true',
                        prompt: isProduction ? 'select_account' : 'none' // Usar 'select_account' em produção
                    }
                }
            });
        } catch (error) {
            console.error('🚨 LOGIN - Erro no OAuth:', error);
            setLoading(false);
            throw error;
        }
    };
    
    const loginAsTestUser = () => {
        const testUser: User = {
            id: 'test-user-001',
            email: 'teste@ggv.com.br',
            name: 'Usuário Teste (Admin)',
            initials: 'TE',
            role: UserRole.SuperAdmin,
        };
        setUser(testUser);
        setLoading(false);
    };

    const logout = async () => {
        // Limpar usuário de emergência se existir
        localStorage.removeItem('ggv-emergency-user');
        
        // Test user doesn't have a supabase session, handle synchronously
        if (user?.id === 'test-user-001' || user?.id?.startsWith('emergency-')) {
             setUser(null);
             setLoading(false);
             return;
        }

        // Handle real user logout
        if (!supabase) {
            console.warn("Logout attempted but Supabase client is not available.");
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error during logout:", error);
        } finally {
            setUser(null);
            setLoading(false);
        }
    };

    return (
        <UserContext.Provider value={{ user, loading, login, logout, loginAsTestUser }}>
            {useSimpleAuth && (
                <SimpleAuth 
                    onAuthSuccess={(user) => {
                        setUser(user);
                        setLoading(false);
                        setUseSimpleAuth(false);
                    }}
                    onAuthError={(error) => {
                        console.error('Simple Auth Error:', error);
                        setLoading(false);
                        setUseSimpleAuth(false);
                    }}
                />
            )}
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);