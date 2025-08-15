import React from 'react';
import { ExclamationTriangleIcon } from './icons';

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-800 rounded-full animate-spin"></div>
        {text && <p className="mt-4 text-slate-600">{text}</p>}
    </div>
);

export const ErrorDisplay: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-red-700 bg-red-50 rounded-lg p-6 border border-red-200">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
        <p className="font-bold text-lg text-slate-800">Ocorreu um Erro</p>
        <p className="text-sm mt-1">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-6 bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
                Tentar Novamente
            </button>
        )}
    </div>
);
