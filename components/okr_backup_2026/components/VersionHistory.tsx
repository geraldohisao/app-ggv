import React, { useState, useEffect } from 'react';
import { MapVersion, listMapVersions, restoreMapVersion, generateVersionComparison } from '../../../services/okrVersionService';
import { StrategicMap } from '../../../types';

interface VersionHistoryProps {
  mapId: string;
  currentMap: StrategicMap;
  userId: string;
  onVersionRestored: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  mapId,
  currentMap,
  userId,
  onVersionRestored
}) => {
  const [versions, setVersions] = useState<MapVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<MapVersion | null>(null);

  useEffect(() => {
    loadVersions();
  }, [mapId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await listMapVersions(mapId);
      setVersions(data);
    } catch (error) {
      console.error('Erro ao carregar versões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!window.confirm('Tem certeza que deseja restaurar esta versão? As alterações atuais serão substituídas.')) {
      return;
    }

    try {
      await restoreMapVersion(mapId, versionId, userId);
      alert('✅ Versão restaurada com sucesso!');
      onVersionRestored();
    } catch (error) {
      alert('❌ Erro ao restaurar versão');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-slate-600">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h3 className="text-xl font-bold text-slate-900 mb-4">
        Histórico de Versões ({versions.length})
      </h3>

      {versions.length === 0 ? (
        <div className="text-center py-8 text-slate-600">
          <p className="mb-2">Nenhuma versão anterior encontrada.</p>
          <p className="text-sm text-slate-500">Versões são criadas automaticamente a cada salvamento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                      v{version.version_number}
                    </span>
                    <span className="text-sm text-slate-600">
                      {formatDate(version.created_at)}
                    </span>
                  </div>

                  {version.created_by_name && (
                    <p className="text-sm text-slate-700 mb-2">
                      Por: <span className="font-semibold">{version.created_by_name}</span>
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Objetivos:</span>
                      <span className="ml-2 font-semibold">{version.snapshot.objectives?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">KPIs:</span>
                      <span className="ml-2 font-semibold">
                        {version.snapshot.objectives?.reduce((sum, obj) => sum + (obj.kpis?.length || 0), 0) || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Motores:</span>
                      <span className="ml-2 font-semibold">{version.snapshot.motors?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Valores:</span>
                      <span className="ml-2 font-semibold">{version.snapshot.values?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedVersion(version)}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
                  >
                    👁️ Ver
                  </button>
                  <button
                    onClick={() => handleRestore(version.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                  >
                    ↻ Restaurar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Version Detail Modal */}
      {selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ position: 'fixed', top: 0, left: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Versão {selectedVersion.version_number}</h2>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-white hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-2">Mudanças:</h3>
                <div className="text-sm text-blue-800 whitespace-pre-line">
                  {generateVersionComparison(currentMap, selectedVersion.snapshot)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Missão:</h4>
                  <p className="text-slate-700">{selectedVersion.snapshot.mission || 'Não definida'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Visão:</h4>
                  <p className="text-slate-700">{selectedVersion.snapshot.vision || 'Não definida'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Objetivos:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedVersion.snapshot.objectives?.map((obj, i) => (
                      <li key={i} className="text-slate-700">{obj.title}</li>
                    )) || <li className="text-slate-500">Nenhum objetivo</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVersion(null)}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setSelectedVersion(null);
                  handleRestore(selectedVersion.id);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                ↻ Restaurar Esta Versão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;

