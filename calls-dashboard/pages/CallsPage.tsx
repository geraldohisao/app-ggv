import React, { useMemo, useState, useEffect } from 'react';
import { DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../constants';
import { Link } from 'react-router-dom';
import { fetchCalls, fetchUniqueSdrs, convertToCallItem } from '../services/callsService';
import { supabase } from '../../services/supabaseClient';
import { CallItem, SdrUser } from '../types';
import { downloadCSV, downloadExcel, downloadSummaryReport } from '../utils/exportUtils';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import { AudioQualityDashboard } from '../components/AudioStatusIndicator';
import { processCallAnalysis, getCallAnalysisFromDatabase } from '../services/callAnalysisBackendService';
import { getRealDuration, formatDurationDisplay } from '../utils/durationUtils';
import UnifiedBatchAnalysisPanel from '../components/UnifiedBatchAnalysisPanel';
import AdminPermissionsDebug from '../../components/debug/AdminPermissionsDebug';

// Função para verificar se URL de áudio é válida
function hasValidAudio(recording_url?: string): boolean {
  if (!recording_url) return false;
  
  return recording_url.includes('ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com') ||
         recording_url.includes('listener.api4com.com') ||
         recording_url.includes('.mp3') ||
         recording_url.includes('.wav');
}

// Função para formatar número de telefone brasileiro
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, '');
  
  // Se tem 13 dígitos (com código do país)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const firstPart = cleaned.substring(4, 9);
    const secondPart = cleaned.substring(9);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Se tem 11 dígitos (sem código do país)
  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const firstPart = cleaned.substring(2, 7);
    const secondPart = cleaned.substring(7);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Se tem 10 dígitos (telefone fixo)
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const firstPart = cleaned.substring(2, 6);
    const secondPart = cleaned.substring(6);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Retorna o original se não conseguir formatar
  return phone;
}

export default function CallsPage() {
  const [query, setQuery] = useState('');
  const [sdr, setSdr] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [minScore, setMinScore] = useState('');
  const [editingEtapa, setEditingEtapa] = useState<string | null>(null);
  const [newEtapa, setNewEtapa] = useState('');
  const [availableEtapas, setAvailableEtapas] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('created_at'); // Novo estado para ordenação
  
  // Estados para dados reais
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [sdrs, setSdrs] = useState<SdrUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // 50 itens por página

  // Carregar SDRs únicos
  useEffect(() => {
    const loadSdrs = async () => {
      try {
        console.log('🔍 CALLS PAGE - Carregando SDRs únicos...');
        const uniqueSdrs = await fetchUniqueSdrs();
        console.log('✅ CALLS PAGE - SDRs carregados:', uniqueSdrs);
        setSdrs(uniqueSdrs);
      } catch (err) {
        console.error('❌ CALLS PAGE - Erro ao carregar SDRs:', JSON.stringify(err, null, 2));
      }
    };
    loadSdrs();
  }, []);

  // Resetar página e limpar dados quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
    setCalls([]); // Limpar dados antigos
    setTotalCount(0);
  }, [sdr, status, type, start, end, minDuration, maxDuration, minScore, sortBy, query]);

  // Controle de requisições para evitar loops
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  // Carregar calls com filtros (com debounce mais agressivo)
  useEffect(() => {
    // Se já há uma requisição em andamento, cancelar
    if (isRequestInProgress) {
      console.log('⏸️ Requisição já em andamento, pulando...');
      return;
    }

    const timeoutId = setTimeout(() => {
      const loadCalls = async () => {
      try {
        setIsRequestInProgress(true);
        setLoading(true);
        setError(null);
        
        console.log('🔍 CALLS PAGE - Carregando calls com filtros:', {
          sdr, 
          status, 
          type, 
          start, 
          end, 
          minDuration, 
          maxDuration, 
          sortBy, 
          currentPage
        });

        console.log('🔍 CALLS PAGE - Valores convertidos que serão enviados:', {
          min_duration: minDuration ? parseInt(minDuration) : undefined,
          max_duration: maxDuration ? parseInt(maxDuration) : undefined,
          min_duration_type: typeof (minDuration ? parseInt(minDuration) : undefined),
          max_duration_type: typeof (maxDuration ? parseInt(maxDuration) : undefined)
        });
        
        // USAR A RPC COM FILTROS E ORDENAÇÃO (get_calls_with_filters)
        console.log('🔍 CALLS PAGE - Usando get_calls_with_filters (com filtros e ordenação)');
        const offset = (currentPage - 1) * itemsPerPage;
        const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_filters', {
          p_sdr: sdr || null,
          p_status: status || null,
          p_type: type || null,
          p_start_date: start ? new Date(start + 'T00:00:00.000Z').toISOString() : null,
          p_end_date: end ? new Date(end + 'T23:59:59.999Z').toISOString() : null,
          p_limit: itemsPerPage,
          p_offset: offset,
          p_sort_by: sortBy || 'created_at',
          p_min_duration: minDuration ? parseInt(minDuration) : null,
          p_max_duration: maxDuration ? parseInt(maxDuration) : null,
          p_min_score: minScore ? parseFloat(minScore) : null,
          p_search_query: query.trim() || null  // NOVO: filtro de empresa/deal no backend
        });
        
        if (callsError) {
          throw new Error(`Erro ao buscar calls: ${callsError.message}`);
        }
        
        console.log('🔍 DADOS BRUTOS DO SUPABASE:');
        console.log('Enterprise:', callsData?.[0]?.enterprise);
        console.log('Deal ID:', callsData?.[0]?.deal_id);
        console.log('Person:', callsData?.[0]?.person);
        console.log('Agent ID:', callsData?.[0]?.agent_id);
        console.log('SDR Email:', callsData?.[0]?.sdr_email);
        console.log('Primeiro registro completo:', callsData?.[0]);
        
        // Mapear dados completos da tabela calls
        const response = {
          calls: (callsData || []).map((call: any) => ({
            id: call.id,
            // Empresa: usar EXCLUSIVAMENTE o campo enterprise retornado pela RPC
            company: call.enterprise,
            dealCode: call.deal_id || 'N/A', // ✅ DEAL_ID
            sdr: {
              id: call.agent_id || 'N/A', // ✅ AGENT_ID
              // SDR: usar EXCLUSIVAMENTE agent_id como nome exibido
              name: call.agent_id || 'SDR não identificado',
              email: call.sdr_email || '',
              avatarUrl: `https://i.pravatar.cc/64?u=${call.agent_id || 'default'}`
            },
            date: call.created_at,
            created_at: call.created_at,
            duration_formated: call.duration_formated || '00:00:00',
            durationSec: 0,
            status: call.status,
            status_voip: call.status_voip,
            // Usar friendly do backend; fallback para status_voip; por fim, status processual
            status_voip_friendly: call.status_voip_friendly || call.status_voip || call.status,
            call_type: call.call_type,
            recording_url: call.recording_url,
            transcription: call.transcription,
            // Contato: usar EXCLUSIVAMENTE o campo person
            person_name: call.person,
            cadence: call.cadence,
            pipeline: call.pipeline,
            from_number: call.from_number,
            to_number: call.to_number,
            direction: call.direction,
            // SCORE: usar calculated_score da RPC (já vem do banco)
            score: call.calculated_score > 0 ? call.calculated_score : null,
            // Campos extras para debug
            enterprise_debug: call.enterprise,
            deal_id_debug: call.deal_id,
            person_debug: call.person,
            agent_id_debug: call.agent_id
          })),
          totalCount: callsData?.[0]?.total_count || 0, // Total real da query
          hasMore: offset + itemsPerPage < (callsData?.[0]?.total_count || 0)
        };

        console.log('✅ Calls carregadas:', response.calls.length);

        // USAR OS DADOS DIRETAMENTE (sem convertToCallItem que está estragando)
        // Usar total_count da função RPC para paginação correta
        const totalFromRpc = callsData?.[0]?.total_count || callsData?.length || 0;
        setCalls(response.calls);
        setTotalCount(totalFromRpc);
        
        console.log('📊 DADOS FINAIS ENVIADOS PARA A LISTA:');
        console.log('Primeira chamada final:', response.calls[0]);
        console.log('Company final:', response.calls[0]?.company);
        console.log('SDR final:', response.calls[0]?.sdr);
        console.log('Deal final:', response.calls[0]?.dealCode);
      } catch (err: any) {
        console.error('Erro ao carregar calls:', JSON.stringify(err, null, 2));
        
        if (err.message?.includes('Timeout')) {
          setError('⏱️ Busca demorou muito. Tente usar filtros mais específicos (SDR, data, etc.).');
        } else if (err.message?.includes('AbortError') || err.message?.includes('aborted')) {
          setError('🔌 Conexão interrompida. Verifique sua internet e tente novamente.');
        } else {
          setError('❌ Erro ao carregar chamadas. Tente novamente em alguns segundos.');
        }
      } finally {
        setLoading(false);
        setIsRequestInProgress(false);
      }
    };

      loadCalls();
    }, 1000); // Delay AUMENTADO para 1000ms para evitar múltiplas chamadas

    return () => {
      clearTimeout(timeoutId);
      setIsRequestInProgress(false); // Limpar flag ao desmontar
    };
  }, [sdr, status, type, start, end, minDuration, maxDuration, minScore, currentPage, itemsPerPage, sortBy, query]); // Adicionar query às dependências

  // Carregar etapas disponíveis
  useEffect(() => {
    const loadAvailableEtapas = async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_etapas_with_indefinida');
        if (error) throw error;
        const etapas = (data || []).map((item: any) => item.etapa_codigo || 'indefinida');
        setAvailableEtapas(etapas);
      } catch (err) {
        console.error('Erro ao buscar etapas:', err);
      }
    };
    loadAvailableEtapas();
  }, []);

  // DESABILITADO: As notas já vêm da RPC (calculated_score)
  // useEffect(() => {
  //   // Busca individual desabilitada - usar calculated_score da RPC
  // }, []);

  const editCallEtapa = async () => {
    if (!editingEtapa) return;
    
    try {
      const etapaValue = newEtapa === 'indefinida' ? null : newEtapa;
      const { data, error } = await supabase.rpc('edit_call_etapa', {
        call_id_param: editingEtapa,
        new_etapa: etapaValue
      });
      
      if (error) throw error;
      
      // Recarregar chamadas
      const loadCalls = async () => {
        try {
          setLoading(true);
          const response = await fetchCalls({
            sdr_email: sdr || undefined,
            status: status || undefined,
            call_type: type || undefined,
            start: start || undefined,
            end: end || undefined,
            min_duration: minDuration ? parseInt(minDuration) : undefined,
            max_duration: maxDuration ? parseInt(maxDuration) : undefined,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
            sortBy: sortBy
          });
          const callItems = response.calls.map(convertToCallItem);
          setCalls(callItems);
          setTotalCount(response.totalCount);
        } catch (err) {
          console.error('Erro ao carregar calls:', err);
          setError('Erro ao carregar chamadas. Tente novamente.');
        } finally {
          setLoading(false);
        }
      };
      await loadCalls();
      
      // Fechar modal
      setEditingEtapa(null);
      setNewEtapa('');
      
      alert('Etapa da chamada atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao editar etapa:', err);
      alert('Erro ao atualizar etapa da chamada');
    }
  };

  // Constante para paginação
  const ITEMS_PER_PAGE = 50;
  // REMOVIDO: isScoreSort - agora toda ordenação é feita no backend
  
  // Filtros locais combinados
  const filtered = useMemo(() => {
    let result = calls;
    
    // REMOVIDO: Filtro por query (empresa/deal) - agora é feito no backend
    
    // Filtro por duração mínima (em segundos) - usando duração real
    if (minDuration.trim()) {
      const minDurationSec = parseInt(minDuration);
      if (!isNaN(minDurationSec)) {
        result = result.filter((c) => getRealDuration(c) >= minDurationSec);
      }
    }
    
    // Filtro por duração máxima (em segundos) - usando duração real
    if (maxDuration.trim()) {
      const maxDurationSec = parseInt(maxDuration);
      if (!isNaN(maxDurationSec)) {
        result = result.filter((c) => getRealDuration(c) <= maxDurationSec);
      }
    }
    
    // Filtro por score mínimo agora é feito no backend via get_calls_with_filters
    
    // REMOVIDO: searchTerm - usar apenas o filtro "Empresa ou Deal ID" que já funciona no backend
    
    // Aplicar ordenação local se necessário (fallback)
    switch (sortBy) {
      case 'duration':
        result = result.sort((a, b) => getRealDuration(b) - getRealDuration(a));
        break;
      case 'score': {
        // Helper para converter score para número válido
        const getScoreValue = (call: any): number => {
          if (call.score === null || call.score === undefined) return -1;
          if (typeof call.score === 'number') return call.score;
          if (typeof call.score === 'string') {
            const parsed = parseFloat(call.score);
            return isNaN(parsed) ? -1 : parsed;
          }
          return -1;
        };
        
        const withScore = result
          .filter(c => getScoreValue(c) >= 0)
          .sort((a, b) => getScoreValue(b) - getScoreValue(a));
        const withoutScore = result.filter(c => getScoreValue(c) < 0);
        result = [...withScore, ...withoutScore];
        break;
      }
      case 'score_asc': {
        // Helper para converter score para número válido
        const getScoreValue = (call: any): number => {
          if (call.score === null || call.score === undefined) return -1;
          if (typeof call.score === 'number') return call.score;
          if (typeof call.score === 'string') {
            const parsed = parseFloat(call.score);
            return isNaN(parsed) ? -1 : parsed;
          }
          return -1;
        };
        
        const withScore = result
          .filter(c => getScoreValue(c) >= 0)
          .sort((a, b) => getScoreValue(a) - getScoreValue(b));
        const withoutScore = result.filter(c => getScoreValue(c) < 0);
        result = [...withScore, ...withoutScore];
        break;
      }
      default: // created_at
        result = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    
    return result;
  }, [calls, query, minDuration, maxDuration, minScore, sortBy]);

  // Paginação: toda ordenação é feita no backend, usar dados direto da RPC
  const paginatedCalls = filtered;
  const totalItems = totalCount;

  return (
    <div className="p-6 space-y-6">
      {/* Debug de Permissões (temporário) */}
      <AdminPermissionsDebug />
      
      {/* Painel de Análise IA em Lote */}
      <UnifiedBatchAnalysisPanel />

      {/* Abas já existentes no shell - removido menu duplicado */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Chamadas</h2>
          <p className="text-sm text-slate-600">
            Visualize, filtre e analise as ligações dos seus SDRs. 
            {totalCount > 0 && (
              <span className="font-medium">
                {" "}({totalCount} chamadas encontradas
                {(minDuration || maxDuration) && (
                  <span className="text-blue-600">
                    {" "}• Duração: {minDuration && `≥${minDuration}s`}{minDuration && maxDuration && " e "}{maxDuration && `≤${maxDuration}s`}
                  </span>
                )}
                )
              </span>
            )}
            {start && end && start === end && (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                📅 Filtrado por: {new Date(start + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        
        {/* Botões de Exportação */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 flex items-center gap-1">
              📊 Exportar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button 
                onClick={() => downloadCSV(filtered, 'chamadas')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                📄 Exportar CSV
              </button>
              <button 
                onClick={() => downloadExcel(filtered, 'chamadas')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                📊 Exportar Excel
              </button>
              <button 
                onClick={() => downloadSummaryReport(filtered, 'relatorio_chamadas')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                📋 Relatório Resumido
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        {/* Primeira linha - Filtros principais */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm col-span-2"
            placeholder="Empresa ou Deal ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={sdr} onChange={(e) => setSdr(e.target.value)}>
            <option value="">Todos os SDRs</option>
            {sdrs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.callCount && `(${s.callCount})`}
              </option>
            ))}
          </select>
          <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os Status</option>
            <option value="normal_clearing">Atendida</option>
            <option value="no_answer">Não atendida</option>
            <option value="originator_cancel">Cancelada pela SDR</option>
            <option value="number_changed">Numero mudou</option>
            <option value="recovery_on_timer_expire">Tempo esgotado</option>
            <option value="unallocated_number">Número não encontrado</option>
          </select>
          <input 
            className="border border-slate-300 rounded px-3 py-2 text-sm" 
            type="date" 
            value={start} 
            onChange={(e) => setStart(e.target.value)}
            placeholder="Data início"
          />
          <input 
            className="border border-slate-300 rounded px-3 py-2 text-sm" 
            type="date" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)}
            placeholder="Data fim"
          />
        </div>
        
        {/* Segunda linha - Filtros avançados */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-200">
          <select 
            className="border border-slate-300 rounded px-3 py-2 text-sm" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">📅 Mais Recentes</option>
            <option value="duration">⏱️ Maior Duração</option>
            <option value="score">⭐ Maior Nota</option>
            <option value="score_asc">⬇️ Menor Nota</option>
          </select>
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            type="number"
            placeholder="Duração mín. (seg)"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
            min="0"
            title="Duração mínima em segundos"
          />
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            type="number"
            placeholder="Duração máx. (seg)"
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
            min="0"
            title="Duração máxima em segundos"
          />
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            type="number"
            placeholder="Score mín."
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="0"
            max="100"
          />
          <button
            onClick={() => {
              setQuery('');
              setMinDuration('');
              setMaxDuration('');
              setMinScore('');
              setSdr('');
              setStatus('');
              setType('');
              setStart('');
              setEnd('');
              setSortBy('created_at'); // Resetar ordenação
              setCurrentPage(1); // Resetar para primeira página
            }}
            className="border border-slate-300 rounded px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 text-slate-600"
          >
            🗑️ Limpar Filtros
          </button>
          <button
            onClick={() => {
              console.log('🔄 Forçando reload das calls...');
              setCalls([]);
              setTotalCount(0);
              setLoading(true);
              // Forçar reload dos dados sem recarregar a página
              const forceReload = async () => {
                try {
                  const response = await fetchCalls({
                    sdr_email: sdr || undefined,
                    status: status || undefined,
                    call_type: type || undefined,
                    start: start || undefined,
                    end: end || undefined,
                    min_duration: minDuration ? parseInt(minDuration) : undefined,
                    max_duration: maxDuration ? parseInt(maxDuration) : undefined,
                    limit: (sortBy === 'duration' || minDuration.trim() || maxDuration.trim()) ? 1000 : itemsPerPage,
                    offset: (sortBy === 'duration' || minDuration.trim() || maxDuration.trim()) ? 0 : (currentPage - 1) * itemsPerPage,
                    sortBy: sortBy
                  });
                  const callItems = response.calls.map(convertToCallItem);
                  setCalls(callItems);
                  setTotalCount(response.totalCount);
                  console.log('✅ Reload forçado concluído:', callItems.length, 'calls');
                } catch (err) {
                  console.error('❌ Erro no reload forçado:', err);
                  setError('Erro ao recarregar chamadas');
                } finally {
                  setLoading(false);
                }
              };
              forceReload();
            }}
            className="border border-blue-300 rounded px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600"
          >
            🔄 Recarregar
          </button>
          <div className="flex items-center text-xs text-slate-500 flex-wrap gap-2">
            <span>
              📊 {calls.length} de {totalItems} chamadas
            </span>
            {loading && (
              <span className="text-orange-600">🔄 Carregando...</span>
            )}
            {!loading && sortBy === 'duration' && (
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">⏱️ Ordenado por duração</span>
            )}
            {!loading && sortBy === 'score' && (
              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">⭐ Ordenado por nota</span>
            )}
            {!loading && sortBy === 'score_asc' && (
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">⬇️ Ordenado por menor nota</span>
            )}
            {!loading && (minDuration.trim() || maxDuration.trim()) && (
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                🔍 Duração: {minDuration && `≥${minDuration}s`}{minDuration && maxDuration && " • "}{maxDuration && `≤${maxDuration}s`}
                <button
                  onClick={() => {setMinDuration(''); setMaxDuration('');}}
                  className="text-blue-400 hover:text-blue-600 ml-1"
                  title="Limpar filtros de duração"
                >
                  ✕
                </button>
              </span>
            )}
            {!loading && totalCount > 0 && (minDuration.trim() || maxDuration.trim()) && (
              <span className="text-green-600 text-xs">
                ✅ {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-slate-600">Carregando chamadas...</p>
          </div>
        ) : (
          <>
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-600 border-b">
                  <th className="p-4 font-medium">Empresa</th>
                  <th className="p-4 font-medium">Contato</th>
                  <th className="p-4 font-medium">SDR</th>
                  <th className="p-4 font-medium">Etapa</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium">Duração</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Nota</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCalls.map((call) => (
                  <tr 
                    key={call.id} 
                    data-call-id={call.id}
                    className="border-b hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => window.location.hash = `/calls/${call.id}`}
                    title="Clique para ver detalhes da chamada"
                  >
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{call.company}</div>
                      <div className="text-xs text-slate-500">{call.dealCode}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{call.person_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">
                        📞 {formatPhoneNumber(call.to_number)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{call.sdr.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          call.call_type === 'diagnostico' ? 'bg-blue-100 text-blue-800' :
                          call.call_type === 'proposta' ? 'bg-green-100 text-green-800' :
                          call.call_type === 'ligacao' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {call.call_type === 'diagnostico' ? '🔍 Diagnóstico' :
                           call.call_type === 'proposta' ? '💼 Proposta' :
                           call.call_type === 'ligacao' ? '📞 Ligação' :
                           call.call_type || '❓ Indefinida'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setEditingEtapa(call.id);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Editar etapa"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {DATE_FORMATTER.format(new Date(call.date))}
                      <span className="text-slate-400"> • </span>
                      {TIME_FORMATTER.format(new Date(call.date))}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getRealDuration(call) > 300 ? 'text-green-600' : getRealDuration(call) > 60 ? 'text-yellow-600' : 'text-slate-600'}`}>
                          {formatDurationDisplay(call)}
                        </span>
                        {hasValidAudio(call.recording_url) && getRealDuration(call) > 180 && (
                          <MiniAudioPlayer 
                            audioUrl={call.recording_url}
                            duration={getRealDuration(call)}
                            callId={call.id}
                          />
                        )}
                        {/* Indicadores de mídia */}
                        <div className="flex gap-1">
                          {call.transcription && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Tem transcrição">
                              📝
                            </span>
                          )}
                          {hasValidAudio(call.recording_url) && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Tem áudio">
                              🎵
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        call.status_voip_friendly === 'Atendida' ? 'bg-green-100 text-green-800' :
                        call.status_voip_friendly === 'Não atendida' ? 'bg-red-100 text-red-800' :
                        call.status_voip_friendly === 'Cancelada pela SDR' ? 'bg-yellow-100 text-yellow-800' :
                        call.status_voip_friendly === 'Numero mudou' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status_voip_friendly || call.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <div>
                          {typeof call.score === 'number' ? (
                            <span 
                              className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${
                                call.score >= 8.0 ? 'bg-green-100 text-green-800' : 
                                call.score >= 7.0 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              {call.score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </div>

                      </div>
                    </td>
                    <td className="p-4 text-right">
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="text-center py-10 text-slate-500">
                <p className="text-lg mb-3">🔍 Nenhuma chamada encontrada</p>
                {(minDuration.trim() || maxDuration.trim()) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 max-w-md mx-auto">
                    <div className="font-medium mb-2">💡 Filtros de duração ativos</div>
                    <div className="text-sm space-y-1">
                      {minDuration && <div>• <strong>Duração mínima:</strong> {minDuration} segundos</div>}
                      {maxDuration && <div>• <strong>Duração máxima:</strong> {maxDuration} segundos</div>}
                      <div>• Tente ajustar os valores ou remover os filtros</div>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => {setMinDuration(''); setMaxDuration('');}}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
                      >
                        Limpar filtros de duração
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Paginação */}
      {(totalItems || 0) > itemsPerPage && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} chamadas
            {minScore && (
              <span className="ml-2 text-blue-600">• Score ≥ {minScore}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏮️ Primeira
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬅️ Anterior
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                const maxPages = Math.ceil(totalItems / itemsPerPage);
                let pageNumber;
                
                if (maxPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= maxPages - 2) {
                  pageNumber = maxPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === pageNumber
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima ➡️
            </button>
            
            <button
              onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
              disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Última ⏭️
            </button>
          </div>
        </div>
      )}

      {/* Modal para editar etapa */}
      {editingEtapa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Editar Etapa da Chamada</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nova Etapa</label>
                <select
                  value={newEtapa}
                  onChange={(e) => setNewEtapa(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione uma etapa</option>
                  {availableEtapas.map(etapa => (
                    <option key={etapa} value={etapa}>
                      {etapa === 'diagnostico' ? '🔍 Diagnóstico' :
                       etapa === 'proposta' ? '💼 Proposta' :
                       etapa === 'ligacao' ? '📞 Ligação' :
                       etapa === 'indefinida' ? '❓ Indefinida' :
                       etapa}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditingEtapa(null);
                  setNewEtapa('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editCallEtapa}
                disabled={!newEtapa}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


