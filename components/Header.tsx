import React from 'react';
import AppBrand from './common/AppBrand';
import UserMenu from './UserMenu';
import NotificationCenter from './NotificationCenter';
import { Module } from '../types';
import ConnectionStatus from './ConnectionStatus';
import { ChartBarIcon, CpuChipIcon, CalculatorIcon, PhoneIcon, PresentationChartLineIcon } from './ui/icons';
import { navigateToModule } from '../utils/router';

interface HeaderProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    onLogout: () => void;
}

const navItems = [
    { module: Module.Diagnostico, text: "Diagnóstico", icon: <ChartBarIcon className="w-5 h-5" /> },
    { module: Module.Assistente, text: "Assistente", icon: <CpuChipIcon className="w-5 h-5" /> },
    { module: Module.Calculadora, text: "Calculadora", icon: <CalculatorIcon className="w-5 h-5" /> },
    { module: Module.Calls, text: "Chamadas", icon: <PhoneIcon className="w-5 h-5" /> },
    { module: Module.Organograma, text: "Organograma", icon: <PresentationChartLineIcon className="w-5 h-5" /> },
];

const Header: React.FC<HeaderProps> = ({ activeModule, setActiveModule, onLogout }) => {
    return (
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
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

                    {/* Right side: Notifications, Status and User Menu */}
                    <div className="flex items-center gap-3">
                       <ConnectionStatus />
                       <NotificationCenter />
                       <UserMenu activeModule={activeModule} setActiveModule={setActiveModule} onLogout={onLogout} />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;