import React from 'react';
import { GGVLogo } from './ui/GGVLogo';

const OpportunityFeedbackSuccess: React.FC<{ onClose?: () => void } > = ({ onClose }) => {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <div className="flex items-center justify-center mb-8">
          <GGVLogo size="small" variant="horizontal" />
        </div>
        <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Feedback enviado com sucesso</h2>
        <p className="text-slate-500 mt-2">Seu feedback foi registrado e será sincronizado com o Pipedrive.</p>
        <div className="mt-8">
          <button onClick={onClose} className="px-6 py-2 rounded-md bg-blue-900 text-white font-semibold shadow-sm">Concluir</button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityFeedbackSuccess;


