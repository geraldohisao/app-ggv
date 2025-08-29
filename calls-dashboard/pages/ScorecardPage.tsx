import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Scorecard {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  active?: boolean; // Para compatibilidade
  created_at: string;
  updated_at: string;
  call_types: string[];
  criteria_count: number;
  total_weight: number;
}

interface CreateScorecardData {
  name: string;
  description: string;
  call_types: string[];
}

export default function ScorecardPage() {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableCallTypes, setAvailableCallTypes] = useState<string[]>([]);
  const [createData, setCreateData] = useState<CreateScorecardData>({
    name: '',
    description: '',
    call_types: ['outbound']
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadScorecards();
    fetchAvailableCallTypes();
  }, []);

  const loadScorecards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.rpc('get_scorecards_with_call_types');
      
      if (error) {
        console.error('Erro ao carregar scorecards:', error);
        setError('Erro ao carregar scorecards: ' + error.message);
        return;
      }
      
      setScorecards(data || []);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao carregar scorecards');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCallTypes = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_etapas_with_indefinida');
      if (error) throw error;
      // Mapear para formato compatível, incluindo indefinida
      const etapas = (data || []).map((item: any) => item.etapa_codigo || 'indefinida');
      setAvailableCallTypes(etapas);
    } catch (err) {
      console.error('Erro ao buscar etapas:', err);
    }
  };

  const toggleScorecard = async (id: string, currentStatus: boolean) => {
    try {
      setActionLoading(id);
      const { data, error } = await supabase.rpc('toggle_scorecard_status', {
        scorecard_id_param: id,
        new_status: !currentStatus
      });
      
      if (error) {
        console.error('Erro ao atualizar scorecard:', error);
        return;
      }
      
      // Recarregar lista
      loadScorecards();
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteScorecard = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o scorecard "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setActionLoading(id);
      const { data, error } = await supabase.rpc('delete_scorecard_simple', {
        scorecard_id_param: id
      });
      
      if (error) {
        console.error('Erro ao excluir scorecard:', error);
        alert('Erro ao excluir scorecard');
        return;
      }
      
      // Recarregar lista
      loadScorecards();
      alert('Scorecard excluído com sucesso!');
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao excluir scorecard');
    } finally {
      setActionLoading(null);
    }
  };

  const createScorecard = async () => {
    if (!createData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    if (createData.call_types.length === 0) {
      alert('Selecione pelo menos uma etapa da ligação');
      return;
    }

    try {
      setActionLoading('create');
      const { data, error } = await supabase.rpc('create_scorecard_with_call_types', {
        scorecard_name: createData.name,
        scorecard_description: createData.description,
        call_types_array: createData.call_types
      });
      
      if (error) {
        console.error('Erro ao criar scorecard:', error);
        alert('Erro ao criar scorecard: ' + error.message);
        return;
      }
      
      if (!data) {
        alert('Erro: Scorecard com esse nome já existe');
        return;
      }
      
      // Resetar form e fechar modal
      setCreateData({ name: '', description: '', call_types: ['outbound'] });
      setShowCreateModal(false);
      
      // Recarregar lista
      loadScorecards();
      alert('Scorecard criado com sucesso!');
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao criar scorecard');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6 text-center">
          <div className="text-slate-600">Carregando scorecards...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6 text-center">
          <div className="text-red-600">{error}</div>
          <button 
            onClick={loadScorecards}
            className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Scorecards</h2>
          <p className="text-sm text-slate-600">Gerencie os critérios de avaliação para análise das chamadas.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          Novo Scorecard
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left font-medium text-slate-700">Nome</th>
              <th className="p-4 text-left font-medium text-slate-700">Etapas</th>
              <th className="p-4 text-left font-medium text-slate-700">Critérios</th>
              <th className="p-4 text-left font-medium text-slate-700">Peso Total</th>
              <th className="p-4 text-left font-medium text-slate-700">Status</th>
              <th className="p-4 text-right font-medium text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {scorecards.map((s) => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-sm text-slate-500">{s.description}</div>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  <div className="flex flex-wrap gap-1">
                    {s.call_types.map(type => (
                      <span key={type} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">{s.criteria_count} critérios</td>
                <td className="p-4 text-sm text-slate-600">
                  <span className={`font-medium ${s.total_weight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {s.total_weight}%
                  </span>
                </td>
                <td className="p-4">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                                            checked={s.is_active || s.active || false}
                      onChange={() => toggleScorecard(s.id, s.is_active || s.active || false)}
                      disabled={actionLoading === s.id}
                    />
                    <div className={`w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 transition ${actionLoading === s.id ? 'opacity-50' : ''}`}></div>
                  </label>
                </td>
                <td className="p-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <a href={`#/scorecards/${s.id}`} className="text-indigo-600 hover:text-indigo-800">Editar</a>
                    <button 
                      onClick={() => deleteScorecard(s.id, s.name)}
                      disabled={actionLoading === s.id}
                      className={`text-red-600 hover:text-red-800 ${actionLoading === s.id ? 'opacity-50' : ''}`}
                    >
                      {actionLoading === s.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {scorecards.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Nenhum scorecard encontrado</p>
            <p className="text-xs mt-1">Crie seu primeiro scorecard para começar a avaliar chamadas</p>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Criar Novo Scorecard</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={createData.name}
                  onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Ligação - Vendas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  value={createData.description}
                  onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Descrição do scorecard..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Etapas da Ligação</label>
                <div className="space-y-2">
                  {availableCallTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createData.call_types.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateData(prev => ({ 
                              ...prev, 
                              call_types: [...prev.call_types, type] 
                            }));
                          } else {
                            setCreateData(prev => ({ 
                              ...prev, 
                              call_types: prev.call_types.filter(t => t !== type) 
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">
                        {type === 'diagnostico' ? '🔍 Diagnóstico' :
                         type === 'proposta' ? '💼 Proposta' :
                         type === 'ligacao' ? '📞 Ligação' :
                         type === 'indefinida' ? '❓ Indefinida' :
                         type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateData({ name: '', description: '', call_types: ['outbound'] });
                }}
                disabled={actionLoading === 'create'}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={createScorecard}
                disabled={actionLoading === 'create' || !createData.name.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === 'create' ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}