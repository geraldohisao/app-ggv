import React, { useState, useEffect, useRef } from 'react';
import { Module, UserRole } from '../types';
import { 
    MagnifyingGlassIcon,
    PhoneIcon,
    CalculatorIcon,
    ChartBarSquareIcon,
    DocumentSignatureIcon,
    OrgChartIcon,
    SparklesIcon,
    BoltIcon,
    FlagIcon
} from './ui/icons';
import { useUser } from '../contexts/DirectUserContext';
import { navigateToModule } from '../utils/router';
import { canAccessCalculadora, canAccessCalls } from '../utils/access';

interface AppLauncherProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
}

interface AppItem {
    module: Module;
    name: string;
    icon: React.ReactNode;
    iconBgColor: string;
    visible: boolean;
}

const AppLauncher: React.FC<AppLauncherProps> = ({ activeModule, setActiveModule }) => {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const dropdown = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!dropdown.current || !trigger.current) return;
            if (!isOpen || dropdown.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
            setIsOpen(false);
        };
        document.addEventListener('click', clickHandler);
        return () => document.removeEventListener('click', clickHandler);
    });

    // Close if the esc key is pressed
    useEffect(() => {
        const keyHandler = ({ keyCode }: KeyboardEvent) => {
            if (!isOpen || keyCode !== 27) return;
            setIsOpen(false);
        };
        document.addEventListener('keydown', keyHandler);
        return () => document.removeEventListener('keydown', keyHandler);
    });
    
    const handleSelectModule = (module: Module) => {
        navigateToModule(module);
        setActiveModule(module);
        setIsOpen(false);
    }
    
    if (!user) {
        return null;
    }

    // Permission checks (same logic from UserMenu)
    const isGestor = user.user_function === 'Gestor';
    const allowOKRLocal = import.meta.env.DEV || import.meta.env.VITE_ALLOW_OKR_LOCAL === 'true';
    const canSeeSettings = user.role === UserRole.SuperAdmin || user.role === UserRole.Admin || isGestor;
    const canSeeOSManager = user.role === UserRole.SuperAdmin || user.role === UserRole.Admin || isGestor || user.user_function === 'Gestor';
    const canSeeFeedback = user.role === UserRole.SuperAdmin || 
                          user.user_function === 'Closer' || 
                          user.user_function === 'Gestor';
    const canSeeOKRManager = allowOKRLocal || user.role === UserRole.SuperAdmin || user.role === UserRole.Admin;
    const canSeeGGVTalent = user.role !== UserRole.User;
    const canSeeCalculadora = canAccessCalculadora(user);
    const canSeeCalls = canAccessCalls(user);

    const apps: AppItem[] = [
        { 
            module: Module.Diagnostico, 
            name: 'Diagnóstico', 
            icon: <MagnifyingGlassIcon className="w-6 h-6" />,
            iconBgColor: 'bg-blue-100 text-blue-600',
            visible: true 
        },
        { 
            module: Module.Calls, 
            name: 'Chamadas', 
            icon: <PhoneIcon className="w-6 h-6" />,
            iconBgColor: 'bg-green-100 text-green-600',
            visible: canSeeCalls 
        },
        { 
            module: Module.Calculadora, 
            name: 'Calculadora', 
            icon: <CalculatorIcon className="w-6 h-6" />,
            iconBgColor: 'bg-purple-100 text-purple-600',
            visible: canSeeCalculadora 
        },
        { 
            module: Module.OKRManager, 
            name: 'Gestão de OKR', 
            icon: <ChartBarSquareIcon className="w-6 h-6" />,
            iconBgColor: 'bg-indigo-100 text-indigo-600',
            visible: canSeeOKRManager 
        },
        { 
            module: Module.Organograma, 
            name: 'Organograma', 
            icon: <OrgChartIcon className="w-6 h-6" />,
            iconBgColor: 'bg-cyan-100 text-cyan-600',
            visible: true 
        },
        { 
            module: Module.OSManager, 
            name: 'Gerenciar OS', 
            icon: <DocumentSignatureIcon className="w-6 h-6" />,
            iconBgColor: 'bg-orange-100 text-orange-600',
            visible: canSeeOSManager 
        },
        { 
            module: Module.GGVTalent, 
            name: 'GGV Talent', 
            icon: <SparklesIcon className="w-6 h-6" />,
            iconBgColor: 'bg-amber-100 text-amber-500',
            visible: canSeeGGVTalent 
        },
        { 
            module: Module.ReativacaoLeads, 
            name: 'Reativação', 
            icon: <BoltIcon className="w-6 h-6" />,
            iconBgColor: 'bg-emerald-100 text-emerald-600',
            visible: canSeeSettings 
        },
        { 
            module: Module.OpportunityFeedback, 
            name: 'Feedback', 
            icon: <FlagIcon className="w-6 h-6" />,
            iconBgColor: 'bg-rose-100 text-rose-500',
            visible: canSeeFeedback 
        },
    ];

    const visibleApps = apps.filter(app => app.visible);

    return (
        <div className="relative inline-flex">
            <button
                ref={trigger}
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-colors ${
                    isOpen 
                        ? 'bg-slate-100 text-slate-700' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                title="Apps GGV"
            >
                {/* Grid icon (9 dots) */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="5" r="2" />
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <circle cx="12" cy="19" r="2" />
                    <circle cx="19" cy="19" r="2" />
                </svg>
            </button>

            {isOpen && (
                <div
                    ref={dropdown}
                    className="origin-top-right z-50 absolute top-full right-0 min-w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden mt-2"
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-800 text-sm">Apps GGV</h3>
                    </div>
                    
                    {/* Apps Grid */}
                    <div className="p-3">
                        <div className="grid grid-cols-3 gap-2">
                            {visibleApps.map((app) => (
                                <button
                                    key={app.module}
                                    onClick={() => handleSelectModule(app.module)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-slate-50 group ${
                                        activeModule === app.module 
                                            ? 'bg-blue-50 ring-1 ring-blue-200' 
                                            : ''
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${app.iconBgColor}`}>
                                        {app.icon}
                                    </div>
                                    <span className={`text-xs font-medium text-center leading-tight ${
                                        activeModule === app.module 
                                            ? 'text-blue-700' 
                                            : 'text-slate-600'
                                    }`}>
                                        {app.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLauncher;
