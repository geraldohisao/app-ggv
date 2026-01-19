import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DirectAuth } from '../components/auth/DirectAuth';
import { supabase } from '../services/supabaseClient';
import { useSessionKeepAlive } from '../hooks/useSessionKeepAlive';
import { isSessionValid, clearSession, saveSession, getSessionInfo } from '../utils/sessionUtils';

interface UserContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    logout: () => {},
    refreshUser: async () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    
    // Ativar keep-alive da sessão apenas quando usuário estiver logado
    useSessionKeepAlive();

    useEffect(() => {
        console.log('🚀 DIRECT CONTEXT - Iniciando...');
        
        const checkAuthStatus = async () => {
            // Primeiro, verificar se há uma sessão válida usando os utilitários
            const sessionInfo = getSessionInfo();
            
            if (sessionInfo.isLoggedIn && sessionInfo.isValid) {
                console.log('✅ DIRECT CONTEXT - Usuário válido encontrado no localStorage:', sessionInfo.user.email);
                console.log(`🕐 DIRECT CONTEXT - Sessão válida por mais ${sessionInfo.remainingHours} horas`);
                
                // Salvar novamente para renovar timestamp automaticamente
                saveSession(sessionInfo.user);
                
                setUser(sessionInfo.user);
                setLoading(false);
                setShowAuth(false);
                // Auto-refresh não bloqueante se função comercial estiver ausente/antiga
                try {
                    const needsFunction = !sessionInfo.user.user_function;
                    if (needsFunction && supabase) {
                        (async () => {
                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session?.user) {
                                    const { data: profile } = await supabase
                                        .from('profiles')
                                        .select('role, department, cargo, user_function')
                                        .eq('id', session.user.id)
                                        .single();
                                    if (profile && (profile.role || profile.department || profile.cargo)) {
                                        const updatedUser = {
                                            ...sessionInfo.user,
                                            role: (profile.role as UserRole) || sessionInfo.user.role,
                                            department: profile.department || sessionInfo.user.department,
                                            cargo: profile.cargo || sessionInfo.user.cargo,
                                            user_function: (profile.user_function as any) || sessionInfo.user.user_function,
                                        } as User;
                                        setUser(updatedUser);
                                        saveSession(updatedUser);
                                        console.log('🔄 DIRECT CONTEXT - Função/role atualizados em background do profiles:', { role: updatedUser.role, user_function: updatedUser.user_function });
                                    }
                                }
                            } catch (bgErr) {
                                console.warn('⚠️ DIRECT CONTEXT - Refresh silencioso de função falhou (ok continuar):', bgErr);
                            }
                        })();
                    }
                } catch {}
                return;
            } else if (sessionInfo.isLoggedIn && !sessionInfo.isValid) {
                console.log('⏰ DIRECT CONTEXT - Sessão expirada (>100h), limpando dados');
                clearSession();
                
                // Limpar também a sessão do Supabase se existir
                if (supabase) {
                    try {
                        await supabase.auth.signOut();
                        console.log('🧹 DIRECT CONTEXT - Sessão Supabase também limpa');
                    } catch (e) {
                        console.warn('⚠️ DIRECT CONTEXT - Erro ao limpar sessão Supabase:', e);
                    }
                }
            }

            // Segundo, verificar se há uma sessão ativa no Supabase (como backup)
            try {
                if (supabase) {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (session?.user && !error) {
                        console.log('✅ DIRECT CONTEXT - Sessão Supabase encontrada como backup');
                        
                        const email = session.user.email || '';
                        const name = session.user.user_metadata?.full_name || 
                                     session.user.user_metadata?.name || 
                                     email.split('@')[0] || 
                                     'Usuário';
                        
                        // Consultar role, department e cargo da tabela profiles
                        let userRole = UserRole.User;
                        let userDepartment: string | undefined = undefined;
                        let userCargo: string | undefined = undefined;
                        let userFunction: 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing' | undefined = undefined;
                        
                        try {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('role, department, cargo, user_function')
                                .eq('id', session.user.id)
                                .single();
                            
                            if (profile?.role) {
                                userRole = profile.role as UserRole;
                                userDepartment = profile.department;
                                userCargo = profile.cargo;
                                userFunction = profile.user_function as 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing' | undefined;
                                console.log('✅ DIRECT CONTEXT - Role, department e cargo carregados do banco:', { role: userRole, department: userDepartment, cargo: userCargo, function: userFunction });
                            } else {
                                // Fallback para emails específicos
                                const isAdmin = email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br';
                                userRole = isAdmin ? UserRole.SuperAdmin : UserRole.User;
                                userFunction = isAdmin ? 'Gestor' : undefined; // Admin assume função de Gestor
                                console.log('⚠️ DIRECT CONTEXT - Usando role/função fallback:', { role: userRole, function: userFunction });
                            }
                        } catch (profileError) {
                            console.warn('⚠️ DIRECT CONTEXT - Erro ao buscar profile, usando fallback:', profileError);
                            const isAdmin = email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br';
                            userRole = isAdmin ? UserRole.SuperAdmin : UserRole.User;
                            userFunction = isAdmin ? 'Gestor' : undefined;
                        }
                        
                        const user = {
                            id: session.user.id,
                            email,
                            name: name.split(' ').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' '),
                            initials: name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
                            role: userRole,
                            department: userDepartment,
                            cargo: userCargo,
                            user_function: userFunction
                        };
                        
                        // Salvar no storage local para próximas sessões usando utilitário
                        saveSession(user);
                        
                        setUser(user);
                        setLoading(false);
                        setShowAuth(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('⚠️ DIRECT CONTEXT - Erro ao verificar sessão Supabase:', e);
            }

            // Se chegou aqui, não há sessão válida em nenhum mecanismo
            setShowAuth(true);
            setLoading(false);
        };
        
        // Executar verificação antes de decidir exibir login
        checkAuthStatus();

        // Verificar se estamos retornando do OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hasOAuthParams = urlParams.has('access_token') || hashParams.has('access_token') || 
                              urlParams.has('code') || urlParams.has('error');
        
        if (hasOAuthParams) {
            console.log('🔄 DIRECT CONTEXT - Detectado retorno OAuth, processando...');
            // Não forçar tela de login durante processamento do OAuth
            return;
        }

        // Listener para quando a página fica visível novamente
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('👁️ DIRECT CONTEXT - Página visível novamente, verificando sessão...');
                
                const sessionInfo = getSessionInfo();
                if (sessionInfo.isLoggedIn) {
                    if (sessionInfo.isValid) {
                        // Sessão ainda válida, renovar timestamp
                        saveSession(sessionInfo.user);
                        console.log('🔄 DIRECT CONTEXT - Timestamp renovado ao voltar para a página');
                    } else {
                        // Sessão expirou, fazer logout
                        console.log('⏰ DIRECT CONTEXT - Sessão expirou enquanto página estava oculta');
                        logout();
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // A decisão de mostrar login é tomada em checkAuthStatus
        console.log('🔐 DIRECT CONTEXT - Aguardando verificação de sessão antes de mostrar login');

        // Cleanup do listener
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleAuthSuccess = async (authenticatedUser: User) => {
        console.log('✅ DIRECT CONTEXT - Login bem-sucedido:', authenticatedUser.email);
        
        // Atualizar role e função do usuário consultando a tabela profiles
        let finalUser = authenticatedUser;
        try {
            if (supabase) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, department, cargo, user_function')
                    .eq('id', authenticatedUser.id)
                    .single();
                
                if (profile) {
                    finalUser = {
                        ...authenticatedUser,
                        role: profile.role as UserRole,
                        department: profile.department,
                        cargo: profile.cargo,
                        user_function: profile.user_function as 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing' | undefined
                    };
                    console.log('✅ DIRECT CONTEXT - Role, department e cargo atualizados do banco:', { role: profile.role, department: profile.department, cargo: profile.cargo, function: profile.user_function });
                }
            }
        } catch (profileError) {
            console.warn('⚠️ DIRECT CONTEXT - Erro ao atualizar role/department/cargo:', profileError);
        }
        
        // Salvar usuário usando utilitário de sessão
        saveSession(finalUser);
        
        setUser(finalUser);
        setShowAuth(false);
        setAuthError(null);
    };

    const handleAuthError = (error: string) => {
        console.error('❌ DIRECT CONTEXT - Erro de autenticação:', error);
        setAuthError(error);
        setShowAuth(true);
    };

    const logout = async () => {
        console.log('🚪 DIRECT CONTEXT - Logout');
        
        // Limpar sessão Supabase se existir
        try {
            if (supabase) {
                await supabase.auth.signOut();
                console.log('✅ DIRECT CONTEXT - Sessão Supabase limpa');
            }
        } catch (e) {
            console.warn('⚠️ DIRECT CONTEXT - Erro ao limpar sessão Supabase:', e);
        }
        
        // Limpar storage local usando utilitário
        clearSession();
        
        setUser(null);
        setShowAuth(true);
        setAuthError(null);
    };

    const refreshUser = async () => {
        console.log('🔄 DIRECT CONTEXT - Atualizando dados do usuário...');
        
        if (!supabase || !user) {
            console.warn('⚠️ DIRECT CONTEXT - Não é possível atualizar: sem Supabase ou usuário');
            return;
        }

        try {
            // Buscar role, department e cargo atualizados do banco
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, department, cargo, user_function')
                .eq('id', user.id)
                .single();
            
            if (profile && (profile.role !== user.role || profile.department !== user.department || profile.cargo !== user.cargo || profile.user_function !== user.user_function)) {
                const updatedUser = {
                    ...user,
                    role: profile.role as UserRole,
                    department: profile.department,
                    cargo: profile.cargo,
                    user_function: profile.user_function as 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing' | undefined
                };
                
                console.log('✅ DIRECT CONTEXT - Role/department/cargo atualizados:', 
                    { role: user.role, department: user.department, cargo: user.cargo, function: user.user_function }, 
                    '→', 
                    { role: profile.role, department: profile.department, cargo: profile.cargo, function: profile.user_function }
                );
                
                // Atualizar estado
                setUser(updatedUser);
                
                // Atualizar storage usando utilitário
                saveSession(updatedUser);
            } else {
                console.log('ℹ️ DIRECT CONTEXT - Role/department/cargo não mudaram:', { role: user.role, department: user.department, cargo: user.cargo, function: user.user_function });
            }
        } catch (error) {
            console.error('❌ DIRECT CONTEXT - Erro ao atualizar usuário:', error);
        }
    };

    const isPublicOrganograma = typeof window !== 'undefined' && window.location.pathname.startsWith('/organograma-publico');

    // Se deve mostrar autenticação
    if (showAuth && !isPublicOrganograma) {
        return (
            <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
                <DirectAuth 
                    onAuthSuccess={handleAuthSuccess}
                    onAuthError={handleAuthError}
                />
                {authError && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm shadow">
                        {authError}
                    </div>
                )}
            </UserContext.Provider>
        );
    }

    return (
        <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
