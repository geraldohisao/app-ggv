import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    loginAsTestUser: () => void;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: false, // Começar com false para evitar loading infinito
    login: async () => {},
    logout: () => {},
    loginAsTestUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false); // Começar com false
    const [initialized, setInitialized] = useState(false);

    // Função para criar usuário a partir da sessão
    const createUserFromSession = (session: any): User => {
        const email = session.user.email || '';
        const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
            ? UserRole.SuperAdmin
            : UserRole.User;
        const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
        const properName = rawName
            .split(' ')
            .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
        
        return {
            id: session.user.id,
            email,
            name: properName,
            initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
            role: forcedRole,
        };
    };

    // Inicialização única e simples
    useEffect(() => {
        if (initialized) return;
        
        console.log('🔐 ROBUST AUTH - Inicializando...');
        setInitialized(true);

        if (!supabase) {
            console.log('🔐 ROBUST AUTH - Supabase não configurado');
            return;
        }

        // Verificar usuário de emergência primeiro
        const emergencyUser = localStorage.getItem('ggv-emergency-user');
        if (emergencyUser) {
            try {
                const user = JSON.parse(emergencyUser);
                console.log('🚨 ROBUST AUTH - Usuário de emergência encontrado:', user.email);
                setUser(user);
                return;
            } catch (e) {
                console.warn('⚠️ ROBUST AUTH - Erro ao carregar usuário de emergência:', e);
                localStorage.removeItem('ggv-emergency-user');
            }
        }

        // Verificação simples de sessão
        const checkAuth = async () => {
            try {
                setLoading(true);
                console.log('🔍 ROBUST AUTH - Verificando sessão...');
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('❌ ROBUST AUTH - Erro ao obter sessão:', error);
                    setUser(null);
                    return;
                }

                if (session?.user) {
                    const user = createUserFromSession(session);
                    console.log('✅ ROBUST AUTH - Usuário autenticado:', user.email, 'Role:', user.role);
                    setUser(user);
                } else {
                    console.log('🔐 ROBUST AUTH - Nenhuma sessão encontrada');
                    setUser(null);
                }
            } catch (error) {
                console.error('❌ ROBUST AUTH - Erro na verificação:', error);
                setUser(null);
            } finally {
                setLoading(false);
                console.log('🏁 ROBUST AUTH - Verificação concluída');
            }
        };

        // Timeout de segurança
        const safetyTimeout = setTimeout(() => {
            console.log('⚠️ ROBUST AUTH - Timeout de segurança ativado');
            setLoading(false);
        }, 5000); // 5 segundos

        checkAuth().finally(() => {
            clearTimeout(safetyTimeout);
        });

        // Listener simples para mudanças
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 ROBUST AUTH - Mudança de estado:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                const user = createUserFromSession(session);
                console.log('✅ ROBUST AUTH - Login realizado:', user.email);
                setUser(user);
            } else if (event === 'SIGNED_OUT') {
                console.log('🔐 ROBUST AUTH - Logout realizado');
                setUser(null);
                localStorage.removeItem('ggv-emergency-user');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [initialized]);

    const login = async () => {
        if (!supabase) return;
        
        try {
            setLoading(true);
            console.log('🔐 ROBUST AUTH - Iniciando login...');
            
            // Determinar URL de redirect
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const redirectUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            console.log('🔐 ROBUST AUTH - Redirect para:', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    scopes: 'openid email profile',
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                console.error('❌ ROBUST AUTH - Erro no OAuth:', error);
                throw error;
            }
        } catch (error) {
            console.error('❌ ROBUST AUTH - Erro no login:', error);
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('🔐 ROBUST AUTH - Fazendo logout...');
            
            // Limpar usuário de emergência
            localStorage.removeItem('ggv-emergency-user');
            
            if (user?.id?.startsWith('emergency-') || user?.id === 'test-user-001') {
                // Logout local apenas
                setUser(null);
                return;
            }

            if (supabase) {
                await supabase.auth.signOut();
            }
            setUser(null);
        } catch (error) {
            console.error('❌ ROBUST AUTH - Erro no logout:', error);
            setUser(null);
        }
    };

    const loginAsTestUser = () => {
        console.log('🧪 ROBUST AUTH - Login como usuário de teste');
        const testUser: User = {
            id: 'test-user-001',
            email: 'teste@ggv.com.br',
            name: 'Usuário Teste (Admin)',
            initials: 'TE',
            role: UserRole.SuperAdmin,
        };
        setUser(testUser);
    };

    return (
        <UserContext.Provider value={{
            user,
            loading,
            login,
            logout,
            loginAsTestUser
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser deve ser usado dentro de UserProvider');
    }
    return context;
};
