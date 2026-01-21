import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';

interface Suggestion {
  id: string;
  type: string;
  affected_user_id: string;
  current_state: any;
  proposed_state: any;
  reason: string;
  confidence_score: number;
  impact_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  analysis_context?: any;
}

interface AnalysisStats {
  pending_count: number;
  processing_count: number;
  completed_count: number;
  failed_count: number;
  last_hour_count: number;
  avg_duration_ms: number;
  last_queued_at: string;
}

export const OrgAISuggestionsPanel: React.FC = () => {
  const { user } = useUser();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

  // Buscar sugestões e estatísticas
  useEffect(() => {
    if (isAdmin) {
      fetchData();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar sugestões pendentes
      const { data: suggestionsData } = await supabase
        .from('org_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false })
        .order('created_at', { ascending: false });

      setSuggestions(suggestionsData || []);

      // Buscar estatísticas da fila
      const { data: statsData } = await supabase
        .from('v_analysis_queue_stats')
        .select('*')
        .single();

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      // Não mostrar erro na UI para fetch silencioso, mas logar
    } finally {
      setLoading(false);
    }
  };

  // Rodar análise manual
  const runManualAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-org-structure', {
        body: { analysisType: 'full' }
      });

      if (error) throw error;

      console.log('Análise concluída:', data);
      await fetchData();
    } catch (err: any) {
      console.error('Erro na análise:', err);
      setError('Falha ao executar análise: ' + (err.message || 'Erro desconhecido. Verifique se a Edge Function está ativa.'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Aprovar sugestão
  const approveSuggestion = async (suggestionId: string) => {
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      // Aplicar mudança
      const changes = [{
        type: suggestion.type,
        user_id: suggestion.affected_user_id,
        ...suggestion.proposed_state,
        reason: suggestion.reason,
        is_ai_generated: true
      }];

      const { data, error } = await supabase.rpc('batch_update_hierarchy', {
        changes: JSON.stringify(changes)
      });

      if (error) throw error;

      // Atualizar status da sugestão
      await supabase
        .from('org_suggestions')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', suggestionId);

      await fetchData();
    } catch (err: any) {
      console.error('Erro ao aprovar:', err);
      setError('Erro ao aplicar sugestão: ' + err.message);
    }
  };

  // Rejeitar sugestão
  const rejectSuggestion = async (suggestionId: string) => {
    try {
      await supabase
        .from('org_suggestions')
        .update({ 
          status: 'rejected', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', suggestionId);

      await fetchData();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-slate-500">
        Acesso restrito a administradores
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'add_reporting_line': '🔗',
      'change_cargo': '📊',
      'change_department': '🏢',
      'promote_user': '⬆️',
      'remove_reporting_line': '❌',
      'create_position': '➕'
    };
    return icons[type] || '📌';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'add_reporting_line': 'bg-blue-100 text-blue-800',
      'change_cargo': 'bg-purple-100 text-purple-800',
      'change_department': 'bg-teal-100 text-teal-800',
      'promote_user': 'bg-green-100 text-green-800',
      'remove_reporting_line': 'bg-red-100 text-red-800',
      'create_position': 'bg-amber-100 text-amber-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 underline mt-1">Fechar</button>
                </div>
            </div>
        </div>
      )}

      {/* Header com Estatísticas */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              🤖 Inteligência Organizacional
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Análise automática com IA • Atualização em tempo real
            </p>
          </div>
          <button
            onClick={runManualAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {analyzing ? '⏳ Analisando...' : '🔍 Análise Manual'}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.pending_count || 0}</div>
              <div className="text-xs text-indigo-100">Na Fila</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.last_hour_count || 0}</div>
              <div className="text-xs text-indigo-100">Última Hora</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.completed_count || 0}</div>
              <div className="text-xs text-indigo-100">Concluídas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">
                {stats.avg_duration_ms ? (stats.avg_duration_ms / 1000).toFixed(1) : '0'}s
              </div>
              <div className="text-xs text-indigo-100">Tempo Médio</div>
            </div>
          </div>
        )}
      </div>

      {/* Sugestões Pendentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            📋 Sugestões Pendentes ({suggestions.length})
          </h3>
          {suggestions.length > 0 && (
            <span className="text-xs text-slate-500">
              Ordenado por confiança (maior primeiro)
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-slate-500 text-sm">Carregando sugestões...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-slate-600 font-medium">Nenhuma sugestão pendente</p>
            <p className="text-slate-400 text-sm mt-2">
              Sua estrutura organizacional está ótima ou análises estão sendo processadas
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className={`bg-white border-2 rounded-xl p-5 shadow-sm hover:shadow-md transition-all ${
                  selectedSuggestion === suggestion.id ? 'border-indigo-400 shadow-lg' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Ícone do tipo */}
                  <div className="text-3xl">{getTypeIcon(suggestion.type)}</div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(suggestion.type)}`}>
                          {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getImpactBadge(suggestion.impact_level)}`}>
                          Impacto: {suggestion.impact_level.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          Confiança: {(suggestion.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Razão */}
                    <p className="text-slate-800 font-medium mb-3 leading-relaxed">
                      {suggestion.reason}
                    </p>

                    {/* Detalhes da mudança */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Mudança Proposta:
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Estado Atual:</div>
                          <pre className="bg-white p-2 rounded text-xs overflow-x-auto border border-slate-200">
                            {JSON.stringify(suggestion.current_state, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Estado Proposto:</div>
                          <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto border border-green-200">
                            {JSON.stringify(suggestion.proposed_state, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => approveSuggestion(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <span>✅</span>
                        <span>Aprovar e Aplicar</span>
                      </button>
                      <button
                        onClick={() => rejectSuggestion(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <span>❌</span>
                        <span>Rejeitar</span>
                      </button>
                      <button
                        onClick={() => setSelectedSuggestion(
                          selectedSuggestion === suggestion.id ? null : suggestion.id
                        )}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                      >
                        {selectedSuggestion === suggestion.id ? '🔼 Menos' : '🔽 Mais'}
                      </button>
                    </div>

                    {/* Detalhes expandidos */}
                    {selectedSuggestion === suggestion.id && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-900 space-y-2">
                          <div><strong>ID:</strong> {suggestion.id}</div>
                          <div><strong>Criado em:</strong> {new Date(suggestion.created_at).toLocaleString('pt-BR')}</div>
                          {suggestion.analysis_context && (
                            <div>
                              <strong>Contexto da Análise:</strong>
                              <pre className="mt-1 bg-white p-2 rounded text-[10px] overflow-x-auto">
                                {JSON.stringify(suggestion.analysis_context, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Como funciona:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>A IA analisa automaticamente quando usuários são atualizados</li>
              <li>Sugestões são baseadas em regras organizacionais e boas práticas</li>
              <li>Você sempre tem controle final - aprovar ou rejeitar</li>
              <li>Todas as mudanças são registradas para auditoria</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgAISuggestionsPanel;

