import React, { useState } from 'react';
import OrganogramaUnificado from './settings/OrganogramaUnificado';
import { OrgChartIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from './ui/icons';

const OrganogramaPage: React.FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
             {/* Header Principal da Página (Oculto em Fullscreen) - Versão Ultra Compacta */}
             {!isFullscreen && (
                 <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm z-10 flex items-center justify-between gap-4">
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <OrgChartIcon className="w-5 h-5 text-cyan-600" />
                            Organograma
                        </h1>

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

                    <div className={`h-full bg-white shadow-sm border border-slate-200 overflow-hidden ${isFullscreen ? '' : 'rounded-xl'}`}>
                    <OrganogramaUnificado isFullscreen={isFullscreen} enableShare />
                    </div>
            </div>
        </div>
    );
};

export default OrganogramaPage;
