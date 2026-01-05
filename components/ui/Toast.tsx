import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, XMarkIcon } from './icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

/**
 * Toast Notification Component
 * Substitui alerts com feedback visual moderno
 */
export const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const config = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            icon: <XCircleIcon className="w-5 h-5 text-red-600" />
        },
        warning: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            text: 'text-orange-800',
            icon: <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            icon: <CheckCircleIcon className="w-5 h-5 text-blue-600" />
        }
    };

    const { bg, border, text, icon } = config[type];

    return (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300">
            <div className={`${bg} border ${border} rounded-lg shadow-lg p-4 pr-12 max-w-sm`}>
                <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                        {icon}
                    </div>
                    <p className={`${text} text-sm font-medium flex-1`}>
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className={`absolute top-2 right-2 ${text} hover:opacity-70 transition-opacity touch-manipulation`}
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Hook para gerenciar toasts
 */
export const useToast = () => {
    const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: ToastType }>>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const ToastContainer = () => (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );

    return {
        showToast,
        success: (message: string) => showToast(message, 'success'),
        error: (message: string) => showToast(message, 'error'),
        warning: (message: string) => showToast(message, 'warning'),
        info: (message: string) => showToast(message, 'info'),
        ToastContainer
    };
};

