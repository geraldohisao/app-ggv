import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface ScorecardEditPageProps {
  scorecardId: string;
}

interface EditScorecardData {
  name: string;
  description: string;
  call_types: string[];
  pipelines: string[];
  cadences: string[];
}

interface ScorecardCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
  order_index: number;
}

export default function ScorecardEditPage({ scorecardId }: ScorecardEditPageProps) {
  const [editData, setEditData] = useState<EditScorecardData>({
    name: '',
    description: '',
    call_types: [],
    pipelines: [],
    cadences: []
  });
  const [availableCallTypes, setAvailableCallTypes] = useState<string[]>([]);
  const [availablePipelines, setAvailablePipelines] = useState<string[]>([]);
  const [availableCadences, setAvailableCadences] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<ScorecardCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCriterion, setShowAddCriterion] = useState(false);
  const [newCriterion, setNewCriterion] = useState({
    name: '',
    description: '',
    weight: 10
  });
  const [editingCriterion, setEditingCriterion] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadScorecard();
    fetchAvailableOptions();
  }, [scorecardId]);

  const loadScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar scorecard
      const { data: scorecardData, error: scorecardError } = await supabase.rpc('get_scorecard_complete', {
        scorecard_id_param: scorecardId
      });
      
      if (scorecardError) {
        console.error('Erro ao carregar scorecard:', scorecardError);
        setError('Erro ao carregar scorecard');
        return;
      }
      
      if (scorecardData && scorecardData.length > 0) {
        const scorecard = scorecardData[0];
        setEditData({
          name: scorecard.name || '',
          description: scorecard.description || '',
          call_types: scorecard.target_call_types || scorecard.call_types || [],
          pipelines: scorecard.target_pipelines || scorecard.pipelines || [],
          cadences: scorecard.target_cadences || scorecard.cadences || []
        });
      } else {
        setError('Scorecard não encontrado');
        return;
      }

      // Carregar critérios (com fallbacks para diferentes assinaturas)
      let criteriaData: any[] | null = null;
      let criteriaError: any = null;

      try {
        const resp1 = await supabase.rpc('get_scorecard_criteria', { scorecard_id_param: scorecardId });
        if (!resp1.error && Array.isArray(resp1.data)) {
          criteriaData = resp1.data;
        } else {
          criteriaError = resp1.error;
        }
      } catch (e) {
        criteriaError = e;
      }

      // Tentar assinatura alternativa p_scorecard_id
      if (!criteriaData || criteriaData.length === 0) {
        try {
          const resp2 = await supabase.rpc('get_scorecard_criteria', { p_scorecard_id: scorecardId });
          if (!resp2.error && Array.isArray(resp2.data)) {
            criteriaData = resp2.data;
            criteriaError = null;
          }
        } catch (e) {
          criteriaError = e;
        }
      }

      // Fallback final: consulta direta na tabela
      if (!criteriaData || criteriaData.length === 0) {
        try {
          const { data } = await supabase
            .from('scorecard_criteria')
            .select('id, name, description, weight, max_score, order_index')
            .eq('scorecard_id', scorecardId)
            .order('order_index', { ascending: true });
          criteriaData = data || [];
          criteriaError = null;
        } catch (e) {
          criteriaError = e;
        }
      }

      if (criteriaError) {
        console.error('Erro ao carregar critérios:', criteriaError);
      }
      setCriteria(criteriaData || []);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao carregar scorecard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_options');
      if (error) throw error;
      
      const options = Array.isArray(data) ? data[0] : data;
      setAvailableCallTypes(options?.call_types || []);
      setAvailablePipelines(options?.pipelines || []);
      setAvailableCadences(options?.cadences || []);
      
      console.log('✅ Opções carregadas:', {
        call_types: options?.call_types,
        pipelines: options?.pipelines,
        cadences: options?.cadences
      });
    } catch (error) {
      console.warn('Erro ao buscar opções:', error);
      setAvailableCallTypes(['Lead (Qualificação)', 'Oportunidade', 'Reunião Diagnóstico']);
      setAvailablePipelines(['GGV Inteligência em Vendas']);
      setAvailableCadences(['Inbound - Consultoria']);
    }
  };

  const addCriterion = async () => {
    if (!newCriterion.name.trim()) {
      alert('Nome do critério é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('add_scorecard_criterion', {
        scorecard_id_param: scorecardId,
        criterion_name: newCriterion.name,
        criterion_description: newCriterion.description,
        criterion_weight: newCriterion.weight
      });
      
      if (error) {
        console.error('Erro ao adicionar critério:', error);
        alert('Erro ao adicionar critério');
        return;
      }
      
      // Recarregar critérios
      const { data: criteriaData } = await supabase.rpc('get_scorecard_criteria', {
        scorecard_id_param: scorecardId
      });
      setCriteria(criteriaData || []);
      
      // Resetar form
      setNewCriterion({ name: '', description: '', weight: 10 });
      setShowAddCriterion(false);
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao adicionar critério');
    }
  };

  const editCriterion = async () => {
    if (!editingCriterion || !editingCriterion.name.trim()) {
      alert('Nome do critério é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('edit_scorecard_criterion', {
        criterion_id_param: editingCriterion.id,
        criterion_name: editingCriterion.name,
        criterion_description: editingCriterion.description,
        criterion_weight: editingCriterion.weight
      });
      
      if (error) {
        console.error('Erro ao editar critério:', error);
        alert('Erro ao editar critério');
        return;
      }
      
      // Recarregar critérios
      const { data: criteriaData } = await supabase.rpc('get_scorecard_criteria', {
        scorecard_id_param: scorecardId
      });
      setCriteria(criteriaData || []);
      
      // Fechar modal
      setEditingCriterion(null);
      setShowEditModal(false);
      
      alert('Critério editado com sucesso!');
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao editar critério');
    }
  };

  const deleteCriterion = async (criterionId: string, criterionName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o critério "${criterionName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('delete_scorecard_criterion', {
        criterion_id_param: criterionId
      });
      
      if (error) {
        console.error('Erro ao excluir critério:', error);
        alert('Erro ao excluir critério');
        return;
      }
      
      // Recarregar critérios
      const { data: criteriaData } = await supabase.rpc('get_scorecard_criteria', {
        scorecard_id_param: scorecardId
      });
      setCriteria(criteriaData || []);
      
      alert('Critério excluído com sucesso!');
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao excluir critério');
    }
  };

  const removeCriterion = async (criterionId: string) => {
    if (!confirm('Tem certeza que deseja remover este critério?')) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('remove_scorecard_criterion', {
        criterion_id_param: criterionId
      });
      
      if (error) {
        console.error('Erro ao remover critério:', error);
        alert('Erro ao remover critério');
        return;
      }
      
      // Atualizar lista local
      setCriteria(prev => prev.filter(c => c.id !== criterionId));
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao remover critério');
    }
  };

  const saveScorecard = async () => {
    if (saving) return;
    const trimmedName = (editData.name || '').trim();
    if (!trimmedName) {
      alert('Nome é obrigatório');
      return;
    }

    // Normalizar e deduplicar arrays
    const unique = (arr?: string[]) => Array.from(new Set((arr || []).filter(Boolean)));
    const cleanCallTypes = unique(editData.call_types);
    const cleanPipelines = unique(editData.pipelines);
    const cleanCadences = unique(editData.cadences);

    try {
      setSaving(true);
      console.log('💾 Iniciando salvamento:', {
        scorecardId,
        name: trimmedName,
        description: editData.description,
        call_types: cleanCallTypes,
        pipelines: cleanPipelines,
        cadences: cleanCadences
      });

      // Tentar RPC estendido
      const rpcResp = await supabase.rpc('edit_scorecard_with_call_types', {
        scorecard_id_param: scorecardId,
        scorecard_name: trimmedName,
        scorecard_description: editData.description || '',
        call_types_array: cleanCallTypes,
        pipelines_array: cleanPipelines,
        cadences_array: cleanCadences
      });

      console.log('📡 Resposta completa do RPC:', rpcResp);

      if (rpcResp.error) {
        console.error('❌ Erro no RPC:', rpcResp.error);
        throw new Error(`Falha no RPC: ${rpcResp.error.message || 'Erro desconhecido'}`);
      }

      if (rpcResp.data === false) {
        throw new Error('RPC retornou false - atualização falhou');
      }

      // Verificar persistência
      const { data: verifiedData, error: verifyError } = await supabase.rpc('get_scorecard_complete', { 
        scorecard_id_param: scorecardId 
      });

      if (verifyError) {
        console.warn('⚠️ Erro na verificação:', verifyError);
        throw new Error(`Falha na verificação: ${verifyError.message}`);
      }

      const verified = verifiedData?.[0];
      console.log('✅ Dados verificados:', verified);

      // Comparar valores
      const mismatches = [];
      if (verified.name !== trimmedName) mismatches.push('nome');
      if (verified.description !== (editData.description || '')) mismatches.push('descrição');
      if (!arraysEqual(verified.target_call_types || [], cleanCallTypes)) mismatches.push('call_types');
      if (!arraysEqual(verified.target_pipelines || [], cleanPipelines)) mismatches.push('pipelines');
      if (!arraysEqual(verified.target_cadences || [], cleanCadences)) mismatches.push('cadences');

      if (mismatches.length > 0) {
        throw new Error(`Dados não persistiram corretamente nos campos: ${mismatches.join(', ')}`);
      }

      alert('Scorecard salvo com sucesso! Todos os dados verificados.');
      window.location.hash = '#/scorecards';

    } catch (err: any) {
      console.error('💥 Erro ao salvar:', err);
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}\nDetalhes no console.`);
    } finally {
      setSaving(false);
    }
  };

  // Função auxiliar para comparar arrays
  function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6 text-center">
          <div className="text-slate-600">Carregando scorecard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6 text-center">
          <div className="text-red-600">{error}</div>
          <a href="#/scorecards" className="mt-2 inline-block px-3 py-1 bg-indigo-600 text-white rounded text-sm">
            Voltar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Editar Scorecard</h2>
          <p className="text-sm text-slate-600">Configure o scorecard e vincule aos tipos de chamada.</p>
        </div>
        <a href="#/scorecards" className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm">
          ← Voltar
        </a>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6 relative z-[9000]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Scorecard</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Ligação - Vendas"
            />
          </div>

          {/* Etapas da Ligação */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Etapas da Ligação</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-300 rounded-md p-3">
              {availableCallTypes.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editData.call_types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditData(prev => ({ 
                          ...prev, 
                          call_types: [...prev.call_types, type] 
                        }));
                      } else {
                        setEditData(prev => ({ 
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
            <p className="text-xs text-slate-500 mt-1">
              A IA usará este scorecard para analisar chamadas destas etapas
            </p>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
          <textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            placeholder="Descrição do scorecard e critérios de avaliação..."
          />
        </div>

        {/* Etapas selecionadas */}
        {editData.call_types.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Etapas Selecionadas</label>
            <div className="flex flex-wrap gap-2">
              {editData.call_types.map(type => (
                <span key={type} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {type === 'diagnostico' ? '🔍 Diagnóstico' :
                   type === 'proposta' ? '💼 Proposta' :
                   type === 'ligacao' ? '📞 Ligação' :
                   type === 'indefinida' ? '❓ Indefinida' :
                   type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pipelines */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Pipelines (Funis)</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2"
            onChange={(e) => {
              const value = e.target.value;
              if (value && !(editData.pipelines || []).includes(value)) {
                setEditData(prev => ({ ...prev, pipelines: [...(prev.pipelines || []), value] }));
              }
              e.target.value = '';
            }}
          >
            <option value="">Selecione um pipeline...</option>
            {availablePipelines.map(pipeline => (
              <option key={pipeline} value={pipeline}>{pipeline}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {(editData.pipelines || []).map(pipeline => (
              <span key={pipeline} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
                {pipeline}
                <button
                  onClick={() => setEditData(prev => ({ ...prev, pipelines: (prev.pipelines || []).filter(p => p !== pipeline) }))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Cadências */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Cadências</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2"
            onChange={(e) => {
              const value = e.target.value;
              if (value && !(editData.cadences || []).includes(value)) {
                setEditData(prev => ({ ...prev, cadences: [...(prev.cadences || []), value] }));
              }
              e.target.value = '';
            }}
          >
            <option value="">Selecione uma cadência...</option>
            {availableCadences.map(cadence => (
              <option key={cadence} value={cadence}>{cadence}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {(editData.cadences || []).map(cadence => (
              <span key={cadence} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
                {cadence}
                <button
                  onClick={() => setEditData(prev => ({ ...prev, cadences: (prev.cadences || []).filter(c => c !== cadence) }))}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Critérios */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Critérios de Avaliação</h3>
            <button
              onClick={() => setShowAddCriterion(true)}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              + Adicionar Critério
            </button>
          </div>

          {criteria.length > 0 ? (
            <div className="space-y-3">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-700">#{index + 1}</span>
                        <h4 className="font-medium text-slate-800">{criterion.name}</h4>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          Peso: {criterion.weight}
                        </span>

                      </div>
                      <p className="text-sm text-slate-600">{criterion.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingCriterion({
                            id: criterion.id,
                            name: criterion.name,
                            description: criterion.description || '',
                            weight: criterion.weight
                          });
                          setShowEditModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteCriterion(criterion.id, criterion.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-sm text-slate-500 text-center py-2">
                Total de peso: {criteria.reduce((sum, c) => sum + c.weight, 0)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📋</div>
              <p>Nenhum critério adicionado</p>
              <p className="text-xs mt-1">Adicione critérios para a IA avaliar as chamadas</p>
            </div>
          )}
        </div>

        {/* Modal Adicionar Critério */}
        {showAddCriterion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Adicionar Critério</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={newCriterion.name}
                    onChange={(e) => setNewCriterion(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Abertura Profissional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={newCriterion.description}
                    onChange={(e) => setNewCriterion(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Descrição do critério..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso</label>
                    <input
                      type="number"
                      value={newCriterion.weight}
                      onChange={(e) => setNewCriterion(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="1"
                      max="100"
                    />
                  </div>
                  

                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddCriterion(false);
                    setNewCriterion({ name: '', description: '', weight: 10 });
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={addCriterion}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 relative z-[9999] isolate pointer-events-auto">
          <a 
            href="#/scorecards"
            className="px-4 py-2 text-slate-600 hover:text-slate-800 relative z-[10000] pointer-events-auto"
          >
            Cancelar
          </a>
          <div 
            onClick={() => {
              console.log('🔘 Botão clicado!', { saving, editData });
              if (saving) return;
              saveScorecard();
            }}
            className={`
              w-48 h-10 
              flex items-center justify-center 
              rounded cursor-pointer select-none relative z-[10000] pointer-events-auto
              text-sm font-medium
              transition-all duration-200
              ${saving 
                ? 'bg-gray-400 text-gray-600 cursor-wait' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
              }
            `}
            style={{ 
              minWidth: '192px',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Scorecard'}
          </div>
        </div>

        {/* Modal de Edição de Critério */}
        {showEditModal && editingCriterion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Editar Critério</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingCriterion.name}
                    onChange={(e) => setEditingCriterion(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Abertura Profissional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={editingCriterion.description}
                    onChange={(e) => setEditingCriterion(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Descrição do critério..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso (1-100)</label>
                  <input
                    type="number"
                    value={editingCriterion.weight}
                    onChange={(e) => setEditingCriterion(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCriterion(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={editCriterion}
                  disabled={!editingCriterion.name.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}