import React, { useState } from 'react';
import { ModalBase } from './ModalBase';
import { clearAllCaches } from '../../src/utils/cacheBuster';

export const ResetCacheModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    await clearAllCaches();
    window.location.reload();
  };
  return (
    <ModalBase title="Resetar Cache">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Isso limpará localStorage, sessionStorage, IndexedDB e service workers (se houver) e recarregará o app.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-slate-200 text-slate-800">Cancelar</button>
          <button onClick={handle} disabled={busy} className="px-4 py-2 rounded bg-red-600 text-white">{busy ? 'Limpando...' : 'Limpar e Recarregar'}</button>
        </div>
      </div>
    </ModalBase>
  );
};


