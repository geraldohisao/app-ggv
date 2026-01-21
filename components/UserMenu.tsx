import React, { useState, useEffect, useRef } from 'react';
import { Module, UserRole } from '../types';
import { 
    ArrowLeftOnRectangleIcon,
    Cog6ToothIcon,
    ChatBubbleLeftRightIcon
} from './ui/icons';
import { useUser } from '../contexts/DirectUserContext';
import { navigateToModule } from '../utils/router';
import FeedbackSidebar from './ui/FeedbackSidebar';


interface UserMenuProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ activeModule, setActiveModule, onLogout }) => {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [imgError, setImgError] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const dropdown = useRef<HTMLDivElement>(null);

    // Reset image error when avatar_url changes
    useEffect(() => {
        setImgError(false);
    }, [user?.avatar_url]);

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
        if (module === Module.Organograma) {
            // Fallback em produção: garantir navegação mesmo se o evento não disparar
            window.location.href = '/organograma';
        }
    }

    const handleLogoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setIsOpen(false);
        onLogout();
    }

    const openFeedback = () => {
        setShowFeedback(true);
        setIsOpen(false);
    }
    
    if (!user) {
        return null;
    }

    const isGestor = user.user_function === 'Gestor';
    const canSeeSettings = user.role === UserRole.SuperAdmin || user.role === UserRole.Admin || isGestor;

    return (
        <div className="relative inline-flex">
            <button
                ref={trigger}
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex justify-center items-center group"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                    {user.avatar_url && !imgError ? (
                        <img 
                            src={user.avatar_url} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        user.initials
                    )}
                </div>
            </button>

            {isOpen && (
                <div
                    ref={dropdown}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    className="origin-top-right z-50 absolute top-full right-0 min-w-64 bg-white border border-slate-200 py-1.5 rounded-lg shadow-lg overflow-hidden mt-2"
                >
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                            {user.avatar_url && !imgError ? (
                                <img 
                                    src={user.avatar_url} 
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                user.initials
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 italic truncate">{user.email}</p>
                        </div>
                    </div>
                    
                    <ul className="py-1">
                        <MenuItem 
                            icon={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} 
                            text="Melhorias e Bugs" 
                            isActive={false}
                            onClick={openFeedback}
                        />
                        {canSeeSettings && (
                            <MenuItem 
                                icon={<Cog6ToothIcon className="w-5 h-5"/>} 
                                text="Configurações" 
                                isActive={activeModule === Module.Settings}
                                onClick={() => handleSelectModule(Module.Settings)}
                            />
                        )}
                    </ul>
                    
                     <div className="border-t border-slate-200 my-1"></div>
                     <ul>
                          <li className="font-medium text-sm text-red-600 hover:bg-red-50">
                            <a className="flex items-center py-2 px-4" href="#0" onClick={handleLogoutClick}>
                                <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                                <span>Sair</span>
                            </a>
                        </li>
                     </ul>
                </div>
            )}

            {/* Feedback Sidebar */}
            <FeedbackSidebar 
                isOpen={showFeedback} 
                onClose={() => setShowFeedback(false)} 
            />
        </div>
    );
};

const MenuItem: React.FC<{icon: React.ReactNode, text: string, isActive: boolean, onClick: () => void}> = ({ icon, text, isActive, onClick}) => (
    <li className={`font-medium text-sm ${isActive ? 'text-blue-800' : 'text-slate-700 hover:text-slate-800'}`}>
        <a 
            className={`flex items-center py-2 px-4 ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`} 
            href="#0" 
            onClick={(e) => { e.preventDefault(); onClick(); }}
        >
            <span className="mr-2">{icon}</span>
            <span>{text}</span>
        </a>
    </li>
);

export default UserMenu;