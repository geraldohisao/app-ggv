import React, { useState, useEffect, useRef } from 'react';
import { Module, UserRole } from '../types';
import { 
    ArrowLeftOnRectangleIcon,
    Cog6ToothIcon,
    ChatBubbleLeftRightIcon,
    EyeIcon
} from './ui/icons';
import { useUser } from '../contexts/DirectUserContext';
import { navigateToModule } from '../utils/router';
import FeedbackSidebar from './ui/FeedbackSidebar';
import UserImpersonationModal from './admin/UserImpersonationModal';
import { canImpersonate } from '../utils/sessionUtils';


interface UserMenuProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ activeModule, setActiveModule, onLogout }) => {
    const { user, isImpersonating, originalUser, stopImpersonation } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showImpersonation, setShowImpersonation] = useState(false);
    const [imgError, setImgError] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const dropdown = useRef<HTMLDivElement>(null);

    // Reset image error when avatar_url changes
    useEffect(() => {
        setImgError(false);
        // #region agent log
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        if (isLocal && user?.name?.toLowerCase().includes('geraldo')) {
            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:34',message:'UserMenu avatar_url changed',data:{userName:user?.name,avatarUrl:user?.avatar_url,imgError:imgError},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
        }
        // #endregion
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

    const openImpersonation = () => {
        setShowImpersonation(true);
        setIsOpen(false);
    }

    const handleStopImpersonation = () => {
        stopImpersonation();
        setIsOpen(false);
    }
    
    if (!user) {
        return null;
    }

    const isGestor = user.user_function === 'Gestor';
    const canSeeSettings = user.role === UserRole.SuperAdmin || user.role === UserRole.Admin || isGestor;
    
    // Check if user can impersonate (use originalUser email if impersonating)
    const realUserEmail = originalUser?.email || user.email;
    const canUseImpersonation = canImpersonate(realUserEmail);

    return (
        <div className="relative inline-flex">
            <button
                ref={trigger}
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex justify-center items-center group relative"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <div className={`w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden ${
                    isImpersonating ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                }`}>
                    {/* #region agent log */}
                    {(() => {
                        const isGeraldo = user.name?.toLowerCase().includes('geraldo');
                        if (isGeraldo) {
                            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:111',message:'UserMenu top avatar render',data:{userName:user.name,hasAvatarUrl:!!user.avatar_url,avatarUrl:user.avatar_url,imgError:imgError,isImpersonating:isImpersonating},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,E'})}).catch(()=>{});
                        }
                        return null;
                    })()}
                    {/* #endregion */}
                    {user.avatar_url && !imgError ? (
                        <img 
                            src={user.avatar_url} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={() => {
                                // #region agent log
                                if (user.name?.toLowerCase().includes('geraldo')) {
                                    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:118',message:'UserMenu top avatar ERROR',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
                                }
                                // #endregion
                                setImgError(true);
                            }}
                            onLoad={(e) => {
                                // #region agent log
                                if (user.name?.toLowerCase().includes('geraldo')) {
                                    const img = e.currentTarget;
                                    const styles = getComputedStyle(img);
                                    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:124',message:'UserMenu top avatar LOADED',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
                                    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:125',message:'UserMenu top avatar metrics',data:{naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,clientWidth:img.clientWidth,clientHeight:img.clientHeight,display:styles.display,visibility:styles.visibility,opacity:styles.opacity},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
                                }
                                // #endregion
                            }}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        user.initials
                    )}
                </div>
                {isImpersonating && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <EyeIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                )}
            </button>

            {isOpen && (
                <div
                    ref={dropdown}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    className="origin-top-right z-[9999] absolute top-full right-0 min-w-64 bg-white border border-slate-200 py-1.5 rounded-lg shadow-lg overflow-hidden mt-2"
                >
                    {/* Impersonation notice in dropdown */}
                    {isImpersonating && originalUser && (
                        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                            <EyeIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="text-xs text-amber-800">
                                Visualizando como outro usuário
                            </span>
                        </div>
                    )}

                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 ${
                            isImpersonating ? 'ring-2 ring-amber-400' : ''
                        }`}>
                            {/* #region agent log */}
                            {(() => {
                                const isGeraldo = user.name?.toLowerCase().includes('geraldo');
                                if (isGeraldo) {
                                    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:151',message:'UserMenu dropdown avatar render',data:{userName:user.name,hasAvatarUrl:!!user.avatar_url,avatarUrl:user.avatar_url,imgError:imgError,isImpersonating:isImpersonating},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,E'})}).catch(()=>{});
                                }
                                return null;
                            })()}
                            {/* #endregion */}
                            {user.avatar_url && !imgError ? (
                                <img 
                                    src={user.avatar_url} 
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                        // #region agent log
                                        if (user.name?.toLowerCase().includes('geraldo')) {
                                            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:158',message:'UserMenu dropdown avatar ERROR',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
                                        }
                                        // #endregion
                                        setImgError(true);
                                    }}
                                    onLoad={(e) => {
                                        // #region agent log
                                        if (user.name?.toLowerCase().includes('geraldo')) {
                                            const img = e.currentTarget;
                                            const styles = getComputedStyle(img);
                                            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:165',message:'UserMenu dropdown avatar LOADED',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
                                            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:166',message:'UserMenu dropdown avatar metrics',data:{naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,clientWidth:img.clientWidth,clientHeight:img.clientHeight,display:styles.display,visibility:styles.visibility,opacity:styles.opacity},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
                                        }
                                        // #endregion
                                    }}
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
                        {canUseImpersonation && (
                            <MenuItem 
                                icon={<EyeIcon className="w-5 h-5"/>} 
                                text="Trocar Visão" 
                                isActive={false}
                                onClick={openImpersonation}
                            />
                        )}
                    </ul>
                    
                     {/* Stop impersonation button */}
                     {isImpersonating && originalUser && (
                        <>
                            <div className="border-t border-slate-200 my-1"></div>
                            <ul>
                                <li className="font-medium text-sm text-amber-700 hover:bg-amber-50">
                                    <a 
                                        className="flex items-center py-2 px-4" 
                                        href="#0" 
                                        onClick={(e) => { e.preventDefault(); handleStopImpersonation(); }}
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                                        </svg>
                                        <span>Voltar para {originalUser.name?.split(' ')[0]}</span>
                                    </a>
                                </li>
                            </ul>
                        </>
                     )}

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

            {/* User Impersonation Modal */}
            {canUseImpersonation && (
                <UserImpersonationModal
                    isOpen={showImpersonation}
                    onClose={() => setShowImpersonation(false)}
                />
            )}
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