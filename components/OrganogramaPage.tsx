import React, { useState } from 'react';
import OrganogramaUnificado from './settings/OrganogramaUnificado';
import OrgAISuggestionsPanel from './settings/OrgAISuggestionsPanel';
import { PresentationChartLineIcon, CpuChipIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from './ui/icons';
import { useUser } from '../contexts/DirectUserContext';
import { UserRole } from '../types';

const OrganogramaPage: React.FC = () => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'visual' | 'ai'>('visual');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isAdmin = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
             {/* Header Principal da Página (Oculto em Fullscreen) - Versão Ultra Compacta */}
             {!isFullscreen && (
                 <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        {/* Título */}
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <PresentationChartLineIcon className="w-5 h-5 text-indigo-600" />
                            Organograma
                        </h1>

                        {/* Divisor */}
                        <div className="h-5 w-px bg-slate-200"></div>

                        {/* Abas Compactas Inline */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('visual')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                    activeTab === 'visual'
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                Visualização
                            </button>
                            
                            {isAdmin && (
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                        activeTab === 'ai'
                                            ? 'bg-purple-50 text-purple-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <CpuChipIcon className="w-4 h-4" />
                                    IA
                                    <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-[10px] font-bold">BETA</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={toggleFullscreen}
                        className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-medium"
                        title="Expandir tela"
                    >
                        <ArrowsPointingOutIcon className="w-4 h-4" />
                        Expandir
                    </button>
                </div>
             )}

            {/* Conteúdo */}
            <div className={`flex-1 overflow-hidden relative ${isFullscreen ? 'p-0' : 'p-4'}`}>
                {/* Botão flutuante para sair do fullscreen */}
                {isFullscreen && (
                    <button 
                        onClick={toggleFullscreen}
                        className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur shadow-lg border border-slate-200 text-slate-600 hover:text-red-600 p-2 rounded-full transition-all"
                        title="Sair da tela cheia"
                    >
                        <ArrowsPointingInIcon className="w-6 h-6" />
                    </button>
                )}

                {activeTab === 'visual' && (
                    <div className={`h-full bg-white shadow-sm border border-slate-200 overflow-hidden ${isFullscreen ? '' : 'rounded-xl'}`}>
                        <OrganogramaUnificado isFullscreen={isFullscreen} enableShare />
                    </div>
                )}
                
                {activeTab === 'ai' && isAdmin && (
                    <div className="h-full overflow-y-auto pr-2 pb-10">
                         <div className="max-w-5xl mx-auto pt-4">
                            <OrgAISuggestionsPanel />
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganogramaPage;
