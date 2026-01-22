import React from 'react';
import AppBrand from './common/AppBrand';
import UserMenu from './UserMenu';
import NotificationCenter from './NotificationCenter';
import AppLauncher from './AppLauncher';
import { Module } from '../types';
import ConnectionStatus from './ConnectionStatus';
import { MagnifyingGlassIcon, CalculatorIcon, PhoneIcon, EyeIcon } from './ui/icons';
import { navigateToModule } from '../utils/router';
import { canAccessCalculadora, canAccessCalls } from '../utils/access';
import { useUser } from '../contexts/DirectUserContext';

interface HeaderProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeModule, setActiveModule, onLogout }) => {
    const { user, isImpersonating, originalUser, stopImpersonation } = useUser();
    const canSeeCalculadora = canAccessCalculadora(user);
    const canSeeCalls = canAccessCalls(user);
    const navItems = [
        { module: Module.Diagnostico, text: "Diagnóstico", icon: <MagnifyingGlassIcon className="w-5 h-5" /> },
        ...(canSeeCalls ? [{ module: Module.Calls, text: "Chamadas", icon: <PhoneIcon className="w-5 h-5" /> }] : []),
        ...(canSeeCalculadora ? [{ module: Module.Calculadora, text: "Calculadora", icon: <CalculatorIcon className="w-5 h-5" /> }] : []),
    ];

    return (
        <>
            {/* Impersonation Banner */}
            {isImpersonating && originalUser && (
                <div className="bg-amber-500 text-white sticky top-0 z-50">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2 text-sm">
                                <EyeIcon className="w-4 h-4" />
                                <span>
                                    <strong>Modo de visualização:</strong> Você está vendo o sistema como{' '}
                                    <span className="font-semibold">{user?.name}</span>
                                    <span className="opacity-75"> ({user?.email})</span>
                                </span>
                            </div>
                            <button
                                onClick={stopImpersonation}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Voltar para {originalUser.name?.split(' ')[0]}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50" style={{ top: isImpersonating ? '44px' : '0' }}>
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left side: Logo (dinâmico via app_settings, com fallback local) */}
                        <div className="flex-shrink-0">
                            <AppBrand size="md-compact" />
                        </div>

                        {/* Center: Main Navigation */}
                        <nav className="hidden md:flex md:items-center md:gap-2">
                            {navItems.map(item => (
                                <button
                                    key={item.module}
                                    onClick={() => {
                                        navigateToModule(item.module);
                                        setActiveModule(item.module);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                        activeModule === item.module
                                            ? 'text-blue-900 bg-blue-50'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                >
                                    {item.icon}
                                    {item.text}
                                </button>
                            ))}
                        </nav>

                        {/* Right side: Status, Notifications, App Launcher and User Menu */}
                        <div className="flex items-center gap-3">
                           <ConnectionStatus />
                           <NotificationCenter />
                           <AppLauncher activeModule={activeModule} setActiveModule={setActiveModule} />
                           <UserMenu activeModule={activeModule} setActiveModule={setActiveModule} onLogout={onLogout} />
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;