import React, { useState, useEffect } from 'react';
import { StrategicMap } from '../../types';
import { listStrategicMaps, deleteStrategicMap, duplicateStrategicMap } from '../../services/okrAIService';
import { useUser } from '../../contexts/DirectUserContext';
import { showSuccess, showError, showLoading, updateToastSuccess } from './utils/toast';

interface OKRDashboardProps {
  onCreateNew: () => void;
  onEditMap: (map: StrategicMap) => void;
}

const OKRDashboard: React.FC<OKRDashboardProps> = ({ onCreateNew, onEditMap }) => {
  const { user } = useUser();
  const [maps, setMaps] = useState<StrategicMap[]>([]);
  const [filteredMaps, setFilteredMaps] = useState<StrategicMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMaps();
  }, [user]);

  useEffect(() => {
    // Filtrar mapas baseado na busca
    if (searchTerm.trim() === '') {
      setFilteredMaps(maps);
    } else {
      const filtered = maps.filter(map => 
        map.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        map.mission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        map.vision?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMaps(filtered);
    }
  }, [maps, searchTerm]);

  const loadMaps = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await listStrategicMaps(user.id);
      setMaps(data);
    } catch (err) {
      console.error('Erro ao carregar mapas:', err);
      setError('Erro ao carregar mapas estratégicos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mapId: string, mapName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o OKR "${mapName}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    const toastId = await showLoading('Deletando OKR...');
    
    try {
      await deleteStrategicMap(mapId, user.id);
      setMaps(maps.filter(m => m.id !== mapId));
      await updateToastSuccess(toastId, '✅ OKR deletado com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar:', err);
      await showError('Erro ao deletar OKR. Tente novamente.');
    }
  };

  const handleDuplicate = async (map: StrategicMap, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    const toastId = await showLoading('Duplicando OKR...');

    try {
      await duplicateStrategicMap(map, user.id);
      await updateToastSuccess(toastId, '✅ OKR duplicado com sucesso!');
      loadMaps();
    } catch (err) {
      console.error('Erro ao duplicar:', err);
      await showError('Erro ao duplicar OKR. Tente novamente.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getObjectivesCount = (map: StrategicMap) => {
    return map.objectives?.length || 0;
  };

  const getKpisCount = (map: StrategicMap) => {
    return map.objectives?.reduce((total, obj) => total + (obj.kpis?.length || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando mapas estratégicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestão de OKR</h1>
              <p className="text-slate-600 mt-1">Mapas Estratégicos e Objetivos</p>
            </div>
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Criar Novo OKR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Search and Filters */}
        {maps.length > 0 && (
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar OKRs por nome, missão ou visão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {filteredMaps.length === 0 && searchTerm ? (
          /* No Results */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Nenhum resultado encontrado
            </h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              Não encontramos OKRs que correspondam à sua busca "{searchTerm}".
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Limpar busca
            </button>
          </div>
        ) : maps.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Nenhum OKR Criado Ainda
              </h2>
              <p className="text-slate-600 max-w-md mx-auto mb-8">
                Comece criando seu primeiro mapa estratégico. Você pode usar a IA para gerar automaticamente ou construir do zero.
              </p>
              <button
                onClick={onCreateNew}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg inline-flex items-center gap-3"
              >
                <span className="text-2xl">✨</span>
                <span>Criar Primeiro OKR</span>
              </button>
            </div>
          </div>
        ) : (
          /* Maps Grid */
          <div>
            <div className="mb-4 text-sm text-slate-600">
              {filteredMaps.length} OKR{filteredMaps.length !== 1 ? 's' : ''} encontrado{filteredMaps.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaps.map((map) => (
              <div
                key={map.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                onClick={() => onEditMap(map)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">
                        {map.company_name || 'Sem título'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        📅 {formatDate(map.date)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleDuplicate(map, e)}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-2"
                        title="Duplicar OKR"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDelete(map.id!, map.company_name || 'OKR', e)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                        title="Deletar OKR"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Identidade Preview */}
                  {map.mission && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs font-semibold text-blue-900 mb-1">MISSÃO</div>
                      <p className="text-sm text-blue-800 line-clamp-2">{map.mission}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {getObjectivesCount(map)}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">Objetivos</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {getKpisCount(map)}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">KPIs</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {map.motors?.length || 0}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">Motores</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {map.values && map.values.length > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                        {map.values.length} Valores
                      </span>
                    )}
                    {map.roles && map.roles.length > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        {map.roles.length} Papéis
                      </span>
                    )}
                    {map.rituals && map.rituals.length > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                        {map.rituals.length} Rituais
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMap(map);
                    }}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Abrir Mapa
                  </button>
                </div>

                {/* Updated indicator */}
                {map.updated_at && (
                  <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                    Atualizado em {formatDate(map.updated_at)}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OKRDashboard;

