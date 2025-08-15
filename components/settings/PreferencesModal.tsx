import React, { useEffect, useState } from 'react';
import { ModalBase } from './ModalBase';
import { getAutoApplySuggestions, setAutoApplySuggestions, isAutoApplyConfirmed, setAutoApplyConfirmed } from '../../services/preferences';

export const PreferencesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [autoApply, setAutoApply] = useState(false);
  const [showOneTimeConfirm, setShowOneTimeConfirm] = useState(false);

  useEffect(() => {
    setAutoApply(getAutoApplySuggestions());
  }, []);

  const handleToggle = (value: boolean) => {
    setAutoApply(value);
    setAutoApplySuggestions(value);
    if (value && !isAutoApplyConfirmed()) {
      setShowOneTimeConfirm(true);
    }
  };

  const confirmOnce = () => {
    setAutoApplyConfirmed();
    setShowOneTimeConfirm(false);
  };

  return (
    <ModalBase title="Preferências" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 border rounded-xl bg-white">
          <input
            id="auto-apply"
            type="checkbox"
            checked={autoApply}
            onChange={(e) => handleToggle(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="auto-apply" className="cursor-pointer">
            <div className="font-semibold text-slate-800">Auto-aplicar sugestões</div>
            <div className="text-sm text-slate-500">
              Quando habilitado, as sugestões do Assistente IA serão aplicadas automaticamente sem pedir confirmação a cada ação.
            </div>
          </label>
        </div>

        {showOneTimeConfirm && (
          <div className="p-4 rounded-xl border bg-amber-50 text-amber-900">
            <div className="font-semibold mb-1">Confirmação única</div>
            <div className="text-sm mb-3">
              Ativar esta opção fará com que ações sugeridas pela IA sejam aplicadas automaticamente. Você pode desfazer manualmente no histórico da tela correspondente.
            </div>
            <button onClick={confirmOnce} className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
              Entendi
            </button>
          </div>
        )}

        <div className="text-xs text-slate-500">
          Caminho: Configurações → Preferências → "Auto-aplicar sugestões". Ao ativar, o Assistente IA aplicará as sugestões diretamente quando possível.
        </div>
      </div>
    </ModalBase>
  );
};

export default PreferencesModal;


