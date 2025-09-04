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
  const [searchTerm, setSearchTerm] = useState('');
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
        const uniqueSdrs = await fetchUniqueSdrs();
        setSdrs(uniqueSdrs);
      } catch (err) {
        console.error('Erro ao carregar SDRs:', err);
      }
    };
    loadSdrs();
  }, []);

  // Resetar página e limpar dados quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
    setCalls([]); // Limpar dados antigos
    setTotalCount(0);
  }, [sdr, status, type, start, end, sortBy]);

  // Carregar calls com filtros (com debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const loadCalls = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Carregando calls com filtros:', {
          sdr, status, type, start, end, sortBy, currentPage
        });
        
        const response = await fetchCalls({
          sdr_email: sdr || undefined,
          status: status || undefined,
          call_type: type || undefined,
          start: start || undefined,
          end: end || undefined,
          limit: sortBy === 'duration' ? 1000 : itemsPerPage, // Buscar mais dados quando ordenar por duração
          offset: sortBy === 'duration' ? 0 : (currentPage - 1) * itemsPerPage, // Reset offset para ordenação por duração
          sortBy: sortBy
        });

        console.log('✅ Calls carregadas:', response.calls.length, 'Max duration:', Math.max(...response.calls.map(c => c.duration || 0)));

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

      loadCalls();
    }, 300); // Delay de 300ms para evitar múltiplas chamadas

    return () => clearTimeout(timeoutId);
  }, [sdr, status, type, start, end, currentPage, itemsPerPage, sortBy]); // Adicionar sortBy às dependências

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

  // Auto-gerar nota para chamadas > 3min sem score visível
  useEffect(() => {
    const run = async () => {
      const pageStart = (currentPage - 1) * itemsPerPage;
      const pageEnd = currentPage * itemsPerPage;
      const visible = calls.slice(pageStart, pageEnd);
      for (const c of visible) {
        if (typeof c.score === 'number' || getRealDuration(c) < 180) continue;
        try {
          const existing = await getCallAnalysisFromDatabase(c.id);
          if (existing && typeof existing.final_grade === 'number') {
            const score100 = Math.round(existing.final_grade * 10);
            setCalls(prev => prev.map(pc => pc.id === c.id ? { ...pc, score: score100 } : pc));
            continue;
          }
          if (c.transcription && c.transcription.length > 50) {
            const res = await processCallAnalysis(c.id, c.transcription, c.sdr.name, c.person_name);
            if (res && typeof res.final_grade === 'number') {
              const score100 = Math.round(res.final_grade * 10);
              setCalls(prev => prev.map(pc => pc.id === c.id ? { ...pc, score: score100 } : pc));
            }
          }
        } catch (e) {
          console.warn('Auto-score falhou', c.id, e);
        }
      }
    };
    if (calls.length > 0) run();
  }, [calls, currentPage, itemsPerPage]);

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
            sdr_email: sdr,
            status,
            call_type: type,
            start: start,
            end: end,
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

  // Filtros locais combinados
  const filtered = useMemo(() => {
    let result = calls;
    
    // Filtro por query (empresa/deal)
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((c) => 
        c.company.toLowerCase().includes(q) || 
        c.dealCode.toLowerCase().includes(q)
      );
    }
    
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
    
    // Filtro por score mínimo
    if (minScore.trim()) {
      const minScoreNum = parseInt(minScore);
      if (!isNaN(minScoreNum)) {
        result = result.filter((c) => c.score && c.score >= minScoreNum);
      }
    }
    
    // Filtro por termo de busca (nome da empresa, pessoa, etc.)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => 
        c.company.toLowerCase().includes(term) || 
        c.dealCode.toLowerCase().includes(term) ||
        c.sdr.name.toLowerCase().includes(term) ||
        (c.person_name && c.person_name.toLowerCase().includes(term))
      );
    }
    
    // Aplicar ordenação local se necessário (fallback)
    switch (sortBy) {
      case 'duration':
        result = result.sort((a, b) => getRealDuration(b) - getRealDuration(a));
        break;
      case 'score':
        result = result.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'company':
        result = result.sort((a, b) => a.company.localeCompare(b.company));
        break;
      default: // created_at
        result = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    
    return result;
  }, [calls, query, minDuration, maxDuration, minScore, searchTerm, sortBy]);

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard de Qualidade */}
      {calls.length > 0 && (
        <AudioQualityDashboard calls={calls} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Chamadas</h2>
          <p className="text-sm text-slate-600">
            Visualize, filtre e analise as ligações dos seus SDRs. 
            {totalCount > 0 && <span className="font-medium"> ({totalCount} chamadas encontradas)</span>}
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
            <option value="">Status</option>
            <option value="received">Recebida</option>
            <option value="processing">Processando</option>
            <option value="processed">Processada</option>
            <option value="failed">Falhou</option>
          </select>
          <input className="border border-slate-300 rounded px-3 py-2 text-sm" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <input className="border border-slate-300 rounded px-3 py-2 text-sm" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        
        {/* Segunda linha - Filtros avançados */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 pt-2 border-t border-slate-200">
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            placeholder="Buscar por nome, empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="border border-slate-300 rounded px-3 py-2 text-sm" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">📅 Mais Recentes</option>
            <option value="duration">⏱️ Maior Duração</option>
            <option value="score">⭐ Maior Nota</option>
            <option value="company">🏢 Empresa A-Z</option>
          </select>
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            type="number"
            placeholder="Duração mín. (seg)"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
            min="0"
          />
          <input
            className="border border-slate-300 rounded px-3 py-2 text-sm"
            type="number"
            placeholder="Duração máx. (seg)"
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
            min="0"
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
              setSearchTerm('');
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
                    limit: sortBy === 'duration' ? 1000 : itemsPerPage,
                    offset: sortBy === 'duration' ? 0 : (currentPage - 1) * itemsPerPage,
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
          <div className="flex items-center text-xs text-slate-500">
            <span>📊 {filtered.length} de {calls.length} chamadas</span>
            {loading && (
              <span className="ml-2 text-orange-600">🔄 Carregando...</span>
            )}
            {!loading && sortBy === 'duration' && (
              <span className="ml-2 text-green-600">⏱️ Ordenado por duração</span>
            )}
            {!loading && sortBy === 'score' && (
              <span className="ml-2 text-purple-600">⭐ Ordenado por nota</span>
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
                {filtered.map((call) => (
                  <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
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
                          onClick={() => setEditingEtapa(call.id)}
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
                        call.status_voip_friendly === 'Número mudou' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status_voip_friendly || call.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <div>
                          {typeof call.score === 'number' ? (
                            <span className={`${call.score >= 85 ? 'text-emerald-600' : call.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{call.score}</span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </div>

                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <a href={`#/calls/${call.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Ver Detalhes</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="text-center py-10 text-slate-500">
                {calls.length === 0 ? 'Nenhuma chamada encontrada.' : 'Nenhuma chamada encontrada com os filtros atuais.'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Paginação */}
      {totalCount > itemsPerPage && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} chamadas
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
              {Array.from({ length: Math.min(5, Math.ceil(totalCount / itemsPerPage)) }, (_, i) => {
                const totalPages = Math.ceil(totalCount / itemsPerPage);
                let pageNumber;
                
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
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
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima ➡️
            </button>
            
            <button
              onClick={() => setCurrentPage(Math.ceil(totalCount / itemsPerPage))}
              disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
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


