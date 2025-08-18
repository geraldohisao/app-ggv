import React, { useState } from 'react';
import { UserProvider, useUser } from '../contexts/SimpleUserContext';
import { DiagnosticoComercial } from './DiagnosticoComercial';
import UserMenu from './UserMenu';
import { Module } from '../types';
import { LoadingSpinner } from './ui/Feedback';
import LoginPage from './LoginPage';
import AppBrand from './common/AppBrand';

const DiagnosticContent: React.FC = () => {
    const { user, loading, logout } = useUser();
    const [activeModule, setActiveModule] = useState<Module>(Module.Diagnostico);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) return <LoginPage />;

    return (
        <div className="flex flex-col h-full font-sans">
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex-shrink-0">
                            <AppBrand className="h-12" />
                        </div>
                        <UserMenu activeModule={activeModule} setActiveModule={setActiveModule} onLogout={logout} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-slate-100">
                <DiagnosticoComercial />
            </main>
        </div>
    );
};

const DiagnosticStandalonePage: React.FC = () => (
    <UserProvider>
        <DiagnosticContent />
    </UserProvider>
);

export default DiagnosticStandalonePage;


