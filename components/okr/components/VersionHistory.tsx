import React from 'react';

interface VersionHistoryProps {
  mapId: string;
  currentMap: any;
  userId: string;
  onVersionRestored: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  mapId,
  currentMap,
  userId,
  onVersionRestored
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🕐</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">
        Histórico de Versões
      </h3>
      <p className="text-slate-600 mb-6">
        Funcionalidade em desenvolvimento.
      </p>
      <p className="text-sm text-slate-500">
        Em breve você poderá ver e restaurar versões anteriores do seu OKR.
      </p>
    </div>
  );
};

export default VersionHistory;

