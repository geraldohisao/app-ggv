import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DirectAuth } from '../components/auth/DirectAuth';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    logout: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        console.log('🚀 DIRECT CONTEXT - Iniciando...');
        
        const checkAuthStatus = async () => {
            // Primeiro, verificar se há uma sessão ativa no Supabase
            try {
                if (supabase) {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (session?.user && !error) {
                        console.log('✅ DIRECT CONTEXT - Sessão Supabase ativa encontrada');
                        
                        const email = session.user.email || '';
                        const name = session.user.user_metadata?.full_name || 
                                     session.user.user_metadata?.name || 
                                     email.split('@')[0] || 
                                     'Usuário';
                        
                        const isAdmin = email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br';
                        
                        const user = {
                            id: session.user.id,
                            email,
                            name: name.split(' ').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' '),
                            initials: name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
                            role: isAdmin ? UserRole.SuperAdmin : UserRole.User
                        };
                        
                        // Salvar no storage local também
                        const userJson = JSON.stringify(user);
                        const timestamp = Date.now().toString();
                        localStorage.setItem('ggv-user', userJson);
                        localStorage.setItem('ggv-user-timestamp', timestamp);
                        sessionStorage.setItem('ggv-user', userJson);
                        sessionStorage.setItem('ggv-user-timestamp', timestamp);
                        
                        setUser(user);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('⚠️ DIRECT CONTEXT - Erro ao verificar sessão Supabase:', e);
            }
            
            // Fallback: verificar localStorage/sessionStorage
            const savedUser = localStorage.getItem('ggv-user') || sessionStorage.getItem('ggv-user');
            const savedTimestamp = localStorage.getItem('ggv-user-timestamp') || sessionStorage.getItem('ggv-user-timestamp');
            
            if (savedUser && savedTimestamp) {
                try {
                    const user = JSON.parse(savedUser);
                    const timestamp = parseInt(savedTimestamp);
                    const now = Date.now();
                    const oneHour = 60 * 60 * 1000; // 1 hora em milliseconds
                    
                    // Verificar se o usuário ainda é válido (menos de 1 hora)
                    if (now - timestamp < oneHour) {
                        console.log('✅ DIRECT CONTEXT - Usuário encontrado no localStorage:', user.email);
                        setUser(user);
                        setLoading(false);
                        return;
                    } else {
                        console.log('⏰ DIRECT CONTEXT - Sessão expirada, removendo usuário salvo');
                        localStorage.removeItem('ggv-user');
                        localStorage.removeItem('ggv-user-timestamp');
                        sessionStorage.removeItem('ggv-user');
                        sessionStorage.removeItem('ggv-user-timestamp');
                    }
                } catch (e) {
                    console.warn('⚠️ DIRECT CONTEXT - Erro ao carregar usuário salvo:', e);
                    localStorage.removeItem('ggv-user');
                    localStorage.removeItem('ggv-user-timestamp');
                    sessionStorage.removeItem('ggv-user');
                    sessionStorage.removeItem('ggv-user-timestamp');
                }
            }
        };
        
        checkAuthStatus();

        // Verificar se estamos retornando do OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hasOAuthParams = urlParams.has('access_token') || hashParams.has('access_token') || 
                              urlParams.has('code') || urlParams.has('error');
        
        if (hasOAuthParams) {
            console.log('🔄 DIRECT CONTEXT - Detectado retorno OAuth, processando...');
            setShowAuth(true);
            setLoading(false);
            return;
        }

        // Nenhum usuário encontrado, mostrar tela de login
        console.log('🔐 DIRECT CONTEXT - Nenhum usuário encontrado, mostrar login');
        setShowAuth(true);
        setLoading(false);
    }, []);

    const handleAuthSuccess = (authenticatedUser: User) => {
        console.log('✅ DIRECT CONTEXT - Login bem-sucedido:', authenticatedUser.email);
        
        // Salvar usuário e timestamp no localStorage e sessionStorage para maior persistência
        const userJson = JSON.stringify(authenticatedUser);
        const timestamp = Date.now().toString();
        
        localStorage.setItem('ggv-user', userJson);
        localStorage.setItem('ggv-user-timestamp', timestamp);
        sessionStorage.setItem('ggv-user', userJson);
        sessionStorage.setItem('ggv-user-timestamp', timestamp);
        
        setUser(authenticatedUser);
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
        
        // Limpar storage local
        localStorage.removeItem('ggv-user');
        localStorage.removeItem('ggv-user-timestamp');
        sessionStorage.removeItem('ggv-user');
        sessionStorage.removeItem('ggv-user-timestamp');
        
        setUser(null);
        setShowAuth(true);
        setAuthError(null);
    };

    // Se deve mostrar autenticação
    if (showAuth) {
        return (
            <UserContext.Provider value={{ user, loading, logout }}>
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
        <UserContext.Provider value={{ user, loading, logout }}>
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
