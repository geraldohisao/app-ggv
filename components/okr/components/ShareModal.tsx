import React from 'react';

interface ShareModalProps {
  mapId: string;
  mapName: string;
  ownerEmail: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  mapId,
  mapName,
  ownerEmail,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full">
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Compartilhar OKR</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            Compartilhamento
          </h3>
          <p className="text-slate-600 mb-6">
            Funcionalidade em desenvolvimento.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Em breve você poderá compartilhar OKRs com sua equipe.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

