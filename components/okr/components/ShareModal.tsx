import React, { useState, useEffect } from 'react';
import { SharePermission, shareMap, listMapShares, removeShare } from '../../../services/okrVersionService';

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
  const [shares, setShares] = useState<SharePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadShares();
  }, [mapId]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await listMapShares(mapId);
      setShares(data);
    } catch (error) {
      console.error('Erro ao carregar compartilhamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      alert('Digite um e-mail válido');
      return;
    }

    if (email.toLowerCase() === ownerEmail.toLowerCase()) {
      alert('Você não pode compartilhar com você mesmo');
      return;
    }

    setIsSharing(true);
    try {
      await shareMap(mapId, ownerEmail, email, permission);
      alert(`✅ OKR compartilhado com ${email}!`);
      setEmail('');
      loadShares();
    } catch (error: any) {
      alert(error.message || 'Erro ao compartilhar OKR');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemove = async (shareId: string, userName: string) => {
    if (!window.confirm(`Remover acesso de ${userName}?`)) {
      return;
    }

    try {
      await removeShare(shareId);
      alert('✅ Acesso removido!');
      loadShares();
    } catch (error) {
      alert('❌ Erro ao remover acesso');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Compartilhar OKR</h2>
              <p className="text-sm text-blue-100">{mapName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Add Share */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <h3 className="font-semibold text-slate-900 mb-4">Adicionar Pessoa</h3>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'viewer' | 'editor')}
                className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="viewer">👁️ Visualizador</option>
                <option value="editor">✏️ Editor</option>
              </select>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSharing ? '⏳' : '➕ Compartilhar'}
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <p className="mb-1"><strong>Visualizador:</strong> Pode apenas ver o OKR</p>
              <p><strong>Editor:</strong> Pode ver e editar o OKR</p>
            </div>
          </div>

          {/* Current Shares */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">
              Pessoas com Acesso ({shares.length})
            </h3>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum compartilhamento ativo.
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {share.shared_with_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {share.shared_with_name || 'Usuário'}
                        </p>
                        <p className="text-sm text-slate-600">{share.shared_with_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        share.permission === 'editor'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {share.permission === 'editor' ? '✏️ Editor' : '👁️ Visualizador'}
                      </span>
                      <button
                        onClick={() => handleRemove(share.id!, share.shared_with_name || 'usuário')}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

