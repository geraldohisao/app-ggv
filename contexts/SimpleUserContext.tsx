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
    loading: true,
    login: async () => {},
    logout: () => {},
    loginAsTestUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔐 AUTH - Iniciando contexto simples...');
        
        if (!supabase) {
            console.log('🔐 AUTH - Supabase não configurado');
            setLoading(false);
            return;
        }

        // Timeout de segurança para evitar loading infinito
        const safetyTimeout = setTimeout(() => {
            console.log('⚠️ SIMPLE AUTH - Timeout de segurança ativado, parando loading...');
            setLoading(false);
        }, 10000); // 10 segundos

        // Verificação simples de sessão
        const checkSession = async () => {
            try {
                console.log('🔍 SIMPLE AUTH - Iniciando verificação de sessão...');
                
                // Primeiro verificar se há usuário de emergência
                const emergencyUser = localStorage.getItem('ggv-emergency-user');
                if (emergencyUser) {
                    try {
                        const user = JSON.parse(emergencyUser);
                        console.log('🚨 SIMPLE AUTH - Usuário de emergência encontrado:', user.email);
                        setUser(user);
                        setLoading(false);
                        clearTimeout(safetyTimeout);
                        return;
                    } catch (e) {
                        console.warn('⚠️ SIMPLE AUTH - Erro ao carregar usuário de emergência:', e);
                        localStorage.removeItem('ggv-emergency-user');
                    }
                }

                console.log('🔍 SIMPLE AUTH - Verificando sessão do Supabase...');
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('❌ SIMPLE AUTH - Erro ao obter sessão:', error);
                    setUser(null);
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                    return;
                }
                
                console.log('🔐 AUTH - Sessão:', session ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
                
                if (session?.user) {
                    console.log('👤 SIMPLE AUTH - Processando dados do usuário...');
                    // Criar usuário simples
                    const email = session.user.email || '';
                    const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
                      ? UserRole.SuperAdmin
                      : UserRole.User;
                    const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
                    const properName = rawName
                      .split(' ')
                      .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
                      .join(' ');
                    const simpleUser: User = {
                        id: session.user.id,
                        email,
                        name: properName,
                        initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase(),
                        role: forcedRole,
                    };
                    console.log('✅ SIMPLE AUTH - Usuário criado:', simpleUser.email, 'Role:', simpleUser.role);
                    setUser(simpleUser);
                } else {
                    console.log('🔐 SIMPLE AUTH - Nenhuma sessão encontrada');
                    setUser(null);
                }
            } catch (error) {
                console.error('❌ AUTH - Erro na verificação:', error);
                setUser(null);
            } finally {
                console.log('🏁 SIMPLE AUTH - Finalizando verificação, parando loading...');
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        checkSession();

        // Listener para mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 AUTH - Mudança:', event);
            if (session?.user) {
                const email = session.user.email || '';
                const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
                  ? UserRole.SuperAdmin
                  : UserRole.User;
                const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
                const properName = rawName
                  .split(' ')
                  .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
                  .join(' ');
                const simpleUser: User = {
                    id: session.user.id,
                    email,
                    name: properName,
                    initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase(),
                    role: forcedRole,
                };
                console.log('🔐 SIMPLE AUTH - Usuário atualizado:', simpleUser.email, 'Role:', simpleUser.role);
                setUser(simpleUser);
            } else {
                console.log('🔐 SIMPLE AUTH - Usuário desconectado');
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async () => {
        if (!supabase) return;
        
        try {
            // Forçar uso do domínio correto em produção
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const redirectOrigin = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            console.log('🔐 SIMPLE LOGIN - Domínio detectado:', {
                hostname: window.location.hostname,
                isProduction,
                redirectOrigin
            });
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectOrigin
                }
            });
            
            if (error) {
                console.error('Erro no login:', error);
            }
        } catch (error) {
            console.error('Erro no login:', error);
        }
    };

    const logout = () => {
        // Limpar usuário de emergência se existir
        localStorage.removeItem('ggv-emergency-user');
        
        if (!supabase) return;
        
        supabase.auth.signOut().then(() => {
            setUser(null);
            window.location.reload();
        });
    };

    const loginAsTestUser = () => {
        const testUser: User = {
            id: 'test-user-id',
            email: 'test@ggv.com.br',
            name: 'Usuário Teste',
            initials: 'UT',
            role: UserRole.User
        };
        setUser(testUser);
        setLoading(false);
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
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
