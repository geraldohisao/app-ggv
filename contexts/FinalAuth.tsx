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
    loading: false, // Começar sem loading
    login: async () => {},
    logout: () => {},
    loginAsTestUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false); // Começar sem loading
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

    // Inicialização única e simples - SEM LOOPS
    useEffect(() => {
        if (initialized) return; // Evitar múltiplas inicializações
        
        console.log('🔐 FINAL AUTH - Inicializando uma única vez...');
        setInitialized(true);

        if (!supabase) {
            console.log('🔐 FINAL AUTH - Supabase não configurado');
            return;
        }

        // Verificação inicial simples
        const initAuth = async () => {
            try {
                setLoading(true);
                console.log('🔍 FINAL AUTH - Verificando sessão...');
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('❌ FINAL AUTH - Erro:', error);
                    setUser(null);
                    return;
                }

                if (session?.user) {
                    const user = createUserFromSession(session);
                    console.log('✅ FINAL AUTH - Usuário encontrado:', user.email);
                    setUser(user);
                } else {
                    console.log('🔐 FINAL AUTH - Sem sessão');
                    setUser(null);
                }
            } catch (error) {
                console.error('❌ FINAL AUTH - Erro na verificação:', error);
                setUser(null);
            } finally {
                setLoading(false);
                console.log('🏁 FINAL AUTH - Inicialização concluída');
            }
        };

        initAuth();

        // Listener simples - SEM LOOPS
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 FINAL AUTH - Evento:', event);
            
            // Apenas reagir a eventos importantes
            if (event === 'SIGNED_IN' && session?.user) {
                const user = createUserFromSession(session);
                console.log('✅ FINAL AUTH - Login:', user.email);
                setUser(user);
                setLoading(false);
            } else if (event === 'SIGNED_OUT') {
                console.log('🔐 FINAL AUTH - Logout');
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            console.log('🔄 FINAL AUTH - Limpando subscription');
            subscription.unsubscribe();
        };
    }, [initialized]); // Dependência apenas de initialized

    const login = async () => {
        if (!supabase) {
            throw new Error('Supabase não configurado');
        }
        
        try {
            setLoading(true);
            console.log('🔐 FINAL AUTH - Iniciando login...');
            
            // URL de redirect simples
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const redirectUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            console.log('🔐 FINAL AUTH - Redirect:', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    scopes: 'openid email profile'
                }
            });

            if (error) {
                console.error('❌ FINAL AUTH - Erro OAuth:', error);
                setLoading(false);
                throw new Error(`Erro no login: ${error.message}`);
            }

            console.log('🔄 FINAL AUTH - Redirecionando...');
        } catch (error) {
            console.error('❌ FINAL AUTH - Erro no login:', error);
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('🔐 FINAL AUTH - Logout...');
            
            if (supabase) {
                await supabase.auth.signOut();
            }
            setUser(null);
            setLoading(false);
        } catch (error) {
            console.error('❌ FINAL AUTH - Erro no logout:', error);
            setUser(null);
            setLoading(false);
        }
    };

    const loginAsTestUser = () => {
        // Função vazia - não implementar
        console.log('⚠️ FINAL AUTH - Teste desabilitado');
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
