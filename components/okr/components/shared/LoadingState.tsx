import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Carregando...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-[#5B5FF5] border-t-transparent animate-spin"></div>
      </div>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{message}</p>
    </div>
  );
};
