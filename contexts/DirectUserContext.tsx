import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User } from '../types';
import { DirectAuth } from '../components/auth/DirectAuth';

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
        
        // Verificar se há usuário salvo no localStorage
        const savedUser = localStorage.getItem('ggv-user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                console.log('✅ DIRECT CONTEXT - Usuário encontrado no localStorage:', user.email);
                setUser(user);
                setLoading(false);
                return;
            } catch (e) {
                console.warn('⚠️ DIRECT CONTEXT - Erro ao carregar usuário salvo:', e);
                localStorage.removeItem('ggv-user');
            }
        }

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
        
        // Salvar usuário no localStorage
        localStorage.setItem('ggv-user', JSON.stringify(authenticatedUser));
        
        setUser(authenticatedUser);
        setShowAuth(false);
        setAuthError(null);
    };

    const handleAuthError = (error: string) => {
        console.error('❌ DIRECT CONTEXT - Erro de autenticação:', error);
        setAuthError(error);
        setShowAuth(true);
    };

    const logout = () => {
        console.log('🚪 DIRECT CONTEXT - Logout');
        localStorage.removeItem('ggv-user');
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
