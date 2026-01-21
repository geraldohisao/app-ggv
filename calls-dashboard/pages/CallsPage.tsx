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
import { startAutoAnalysis, getAutoAnalysisStats } from '../services/autoAnalysisWorker';
import { useAdminFeatures } from '../../hooks/useAdminPermissions';

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

// Função para obter telefone correto baseado na direção da chamada
function getDisplayPhone(call: any): string {
  // Prioridade: to_number > from_number > insights
  if (call.to_number && call.to_number !== 'api4com') {
    return call.to_number;
  }
  
  if (call.from_number && call.from_number !== 'api4com') {
    return call.from_number;
  }
  
  // Tentar extrair de insights se existir
  if (call.insights) {
    if (call.insights.to_number) return call.insights.to_number;
    if (call.insights.from_number) return call.insights.from_number;
    if (call.insights.phone) return call.insights.phone;
    if (call.insights.person_phone) return call.insights.person_phone;
  }
  
  return '';
}

// Função para traduzir status VOIP para português
function translateStatus(status: string | null | undefined): string {
  if (!status) return 'Status desconhecido';
  
  // Normalizar para minúsculas para comparação
  const normalized = status.toLowerCase();
  
  switch (normalized) {
    case 'normal_clearing':
    case 'completed':
      return 'Atendida';
    case 'no_answer':
      return 'Não atendida';
    case 'originator_cancel':
      return 'Cancelada pela SDR';
    case 'number_changed':
      return 'Numero mudou';
    case 'recovery_on_timer_expire':
      return 'Tempo esgotado';
    case 'unallocated_number':
      return 'Número não encontrado';
    case 'busy':
      return 'Ocupado';
    case 'failed':
      return 'Falhou';
    default:
      // Se já está em português, retornar como está
      if (status.includes('tendida') || status.includes('Cancelada') || status.includes('mudou')) {
        return status;
      }
      return status;
  }
}

export default function CallsPage() {
  const { canAccessManualAnalysis } = useAdminFeatures();
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

  // Garantir que filtros de score não apareçam para não-admin
  useEffect(() => {
    if (!canAccessManualAnalysis) {
      if (minScore) setMinScore('');
      if (sortBy === 'score' || sortBy === 'score_asc') {
        setSortBy('created_at');
      }
    }
  }, [canAccessManualAnalysis, minScore, sortBy]);

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
    
    const initAutoAnalysis = async () => {
      try {
        console.log('🤖 CALLS PAGE - Iniciando worker de análise automática...');
        await startAutoAnalysis();
        console.log('✅ CALLS PAGE - Worker automático iniciado');
      } catch (err) {
        console.warn('⚠️ CALLS PAGE - Falha ao iniciar worker automático:', err);
      }
    };
    
    loadSdrs();
    initAutoAnalysis();
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
        
        // ✅ USAR A RPC get_calls_with_filters (corrigida)
        console.log('🔍 CALLS PAGE - Usando get_calls_with_filters (RPC corrigida)');
        const offset = (currentPage - 1) * itemsPerPage;
        // 🔍 DEBUG: Verificar filtros enviados
        const rpcParams = {
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
          p_search_query: query.trim() || null
        };
        
        console.log('🔍 CALLS PAGE - Parâmetros enviados para RPC:', rpcParams);
        console.log('🔍 CALLS PAGE - minDuration original:', minDuration, 'convertido:', minDuration ? parseInt(minDuration) : null);
        
        const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_filters', rpcParams);
        
        if (callsError) {
          throw new Error(`Erro ao buscar calls: ${callsError.message}`);
        }
        
        // ✅ Log simples
        console.log(`✅ Dados recebidos: ${callsData?.length || 0} chamadas | Sort: ${sortBy} | Página: ${currentPage}`);
        console.log('DEBUG-DURATION:', callsData?.slice(0, 5).map((c: any) => c.duration));
        console.log('DEBUG-FORMATTED:', callsData?.slice(0, 5).map((c: any) => c.duration_formated));
        
        // ✅ MAPEAMENTO DEFINITIVO: Usar EXATAMENTE os nomes que a RPC retorna
        const response = {
          calls: (callsData || []).map((call: any) => ({
            id: call.id,
            // ✅ RPC retorna: company_name, person_name, deal_id, sdr_name, etc.
            company: call.company_name || call.enterprise || 'Empresa não informada',
            dealCode: call.deal_id || 'N/A',
            sdr: {
              id: call.sdr_id || call.agent_id || 'desconhecido',
              name: call.sdr_name || call.agent_id || 'SDR',
              email: call.sdr_email || undefined,
              avatarUrl: call.sdr_avatar_url || undefined
            },
            date: call.created_at,
            created_at: call.created_at,
            durationSec: call.duration_seconds || call.duration || 0,
            duration_formated: call.duration_formated,
            status: call.status,
            status_voip: call.status_voip,
            status_voip_friendly: call.status_voip_friendly || call.status_voip || call.status,
            call_type: call.call_type,
            recording_url: call.recording_url || call.audio_url,
            transcription: call.transcription,
            person_name: call.person_name || call.person,
            person_email: call.person_email,
            cadence: call.cadence,
            pipeline: call.pipeline,
            from_number: call.from_number,
            to_number: call.to_number,
            direction: call.direction,
            score: call.score,
            insights: call.insights,
            // ✅ Campos adicionais para compatibilidade com convertToCallItem
            enterprise: call.company_name || call.enterprise,
            person: call.person_name || call.person,
            deal_id: call.deal_id,
            agent_id: call.agent_id
          })),
          totalCount: callsData?.[0]?.total_count || 0,
          hasMore: offset + itemsPerPage < (callsData?.[0]?.total_count || 0)
        };

        // ✅ CONVERTER para CallItem (garante campos corretos)
        const callItems = response.calls.map(convertToCallItem);
        
        // Usar total_count da função RPC para paginação correta
        const totalFromRpc = callsData?.[0]?.total_count || callsData?.length || 0;
        setCalls(callItems);
        setTotalCount(totalFromRpc);
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
  
  // ✅ TODOS os filtros e ordenação são 100% NO BACKEND
  // Frontend apenas exibe os dados como vieram, sem filtrar ou ordenar
  const filtered = useMemo(() => {
    return calls;  // Dados já vêm filtrados, ordenados e paginados do backend
  }, [calls]);

  // Paginação: toda ordenação é feita no backend, usar dados direto da RPC
  const paginatedCalls = filtered;
  const totalItems = totalCount;

  // Função para recarregar chamadas
  const handleReload = async () => {
    console.log('🔄 Forçando reload das calls...');
    setCalls([]);
    setTotalCount(0);
    setLoading(true);
    try {
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
      console.log('✅ Reload forçado concluído:', callItems.length, 'calls');
    } catch (err) {
      console.error('❌ Erro no reload forçado:', err);
      setError('Erro ao recarregar chamadas');
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setQuery('');
    setMinDuration('');
    setMaxDuration('');
    setMinScore('');
    setSdr('');
    setStatus('');
    setType('');
    setStart('');
    setEnd('');
    setSortBy('created_at');
    setCurrentPage(1);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = sdr || status || start || end || minDuration || maxDuration || (canAccessManualAnalysis ? minScore : '') || query;

  // Presets de duração em segundos
  const durationPresets = [
    { label: 'Qualquer', value: '' },
    { label: '> 1 min', value: '60' },
    { label: '> 3 min', value: '180' },
    { label: '> 5 min', value: '300' },
    { label: '> 10 min', value: '600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Painel de Análise IA em Lote */}
      <UnifiedBatchAnalysisPanel />

      {/* === CABEÇALHO DA SEÇÃO DE CHAMADAS === */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header com título, contadores e ações */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título e contadores */}
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Chamadas</h2>
                <p className="text-sm text-slate-500">
                  {loading ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Carregando...
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium text-slate-700">{totalCount.toLocaleString('pt-BR')}</span> chamadas encontradas
                    </span>
                  )}
                </p>
              </div>

              {/* Badges de filtros ativos */}
              {hasActiveFilters && (
                <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
                  {sdr && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                      SDR: {sdrs.find(s => s.id === sdr)?.name || sdr}
                      <button onClick={() => setSdr('')} className="hover:text-indigo-900">×</button>
                    </span>
                  )}
                  {status && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                      {status === 'normal_clearing' ? 'Atendidas' : status === 'no_answer' ? 'Não atendidas' : status}
                      <button onClick={() => setStatus('')} className="hover:text-emerald-900">×</button>
                    </span>
                  )}
                  {(start || end) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                      {start && end && start === end 
                        ? new Date(start + 'T00:00:00').toLocaleDateString('pt-BR')
                        : `${start ? new Date(start + 'T00:00:00').toLocaleDateString('pt-BR') : '...'} - ${end ? new Date(end + 'T00:00:00').toLocaleDateString('pt-BR') : '...'}`
                      }
                      <button onClick={() => { setStart(''); setEnd(''); }} className="hover:text-amber-900">×</button>
                    </span>
                  )}
                  {minDuration && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs">
                      {`> ${Math.floor(parseInt(minDuration) / 60)} min`}
                      <button onClick={() => setMinDuration('')} className="hover:text-violet-900">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              {/* Limpar filtros */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar
                </button>
              )}

              {/* Recarregar */}
              <button
                onClick={handleReload}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Atualizar
              </button>

              {/* Exportar */}
              <div className="relative group">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button 
                    onClick={() => downloadCSV(filtered, 'chamadas')}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 first:rounded-t-lg"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </button>
                  <button 
                    onClick={() => downloadExcel(filtered, 'chamadas')}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Excel
                  </button>
                  <button 
                    onClick={() => downloadSummaryReport(filtered, 'relatorio_chamadas')}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 last:rounded-b-lg"
                  >
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Relatório
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === BARRA DE FILTROS UNIFICADA === */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col gap-3">
            {/* Linha 1: Todos os filtros principais em grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              {/* Busca */}
              <div className="relative col-span-2 md:col-span-1 lg:col-span-2">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Buscar empresa ou Deal ID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* SDR */}
              <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                value={sdr} 
                onChange={(e) => setSdr(e.target.value)}
              >
                <option value="">Todos os SDRs</option>
                {sdrs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.callCount ? `(${s.callCount})` : ''}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select 
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="normal_clearing">Atendida</option>
                <option value="no_answer">Não atendida</option>
                <option value="originator_cancel">Cancelada</option>
                <option value="number_changed">Número mudou</option>
                <option value="recovery_on_timer_expire">Tempo esgotado</option>
                <option value="unallocated_number">Não encontrado</option>
              </select>

              {/* Data De */}
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">De</label>
                <input 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  type="date" 
                  value={start} 
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              {/* Data Até */}
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">Até</label>
                <input 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  type="date" 
                  value={end} 
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Linha 2: Ordenação, Duração e Score */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Ordenar:</label>
                <select 
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="created_at">Mais recentes</option>
                  <option value="duration">Maior duração</option>
                  {canAccessManualAnalysis && <option value="score">Maior nota</option>}
                  {canAccessManualAnalysis && <option value="score_asc">Menor nota</option>}
                </select>
              </div>

              {/* Duração mínima (presets) */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Duração:</label>
                <select 
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  value={minDuration} 
                  onChange={(e) => setMinDuration(e.target.value)}
                >
                  {durationPresets.map(preset => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </div>

              {/* Score mínimo */}
              {canAccessManualAnalysis && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Nota mín:</label>
                  <input
                    className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    type="number"
                    placeholder="0-10"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
              )}

              {/* Indicador de ordenação ativa */}
              {sortBy !== 'created_at' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs">
                  {sortBy === 'duration' && 'Por duração'}
                  {sortBy === 'score' && canAccessManualAnalysis && 'Por maior nota'}
                  {sortBy === 'score_asc' && canAccessManualAnalysis && 'Por menor nota'}
                </span>
              )}
            </div>
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
                  {canAccessManualAnalysis && <th className="p-4 font-medium">Nota</th>}
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
                        📞 {formatPhoneNumber(getDisplayPhone(call))}
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
                        {translateStatus(call.status_voip_friendly || call.status_voip || call.status)}
                      </span>
                    </td>
                    {canAccessManualAnalysis && (
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
                    )}
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
            {canAccessManualAnalysis && minScore && (
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


