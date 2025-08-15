
import React, { useEffect } from 'react';
import { XMarkIcon } from '../ui/icons';

export const ModalBase: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl relative animate-fade-in-up flex flex-col">
                <header className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto mt-4">
                    {children}
                </div>
                <div className="sticky bottom-0 -mb-4 -mx-4 sm:-mx-6 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-slate-200 p-3 sm:p-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-2 rounded-md border hover:bg-slate-50 min-h-[44px]">Cancelar</button>
                    {/* Ações específicas ficam no conteúdo do modal; este footer garante acessibilidade no mobile */}
                </div>
            </div>
        </div>
    );
};
