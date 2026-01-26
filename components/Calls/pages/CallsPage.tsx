import React, { useEffect, useMemo, useState } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, SDRS, secondsToHuman } from '../../../calls-dashboard/constants';
import { fetchCalls, fetchRealUsers } from '../../../services/callsService';
import RelativeDateRange from '../RelativeDateRange';
import FilterChips from '../FilterChips';
import SavedFilters from '../SavedFilters';
import { listFavoriteSdrs, toggleFavoriteSdr } from '../../../services/preferences';
import { useAdminFeatures } from '../../../hooks/useAdminPermissions';

export default function CallsPage() {
  const { canAccessManualAnalysis } = useAdminFeatures();
  const [query, setQuery] = useState('');
  const [sdr, setSdr] = useState('');
  const [status, setStatus] = useState('');
  const [callType, setCallType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');

  // Persistir filtros no localStorage
  const saveFiltersToStorage = () => {
    const filters = { query, sdr, status, callType, start, end, minDuration, maxDuration };
    localStorage.setItem('calls-filters', JSON.stringify(filters));
  };

  const loadFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem('calls-filters');
      if (saved) {
        const filters = JSON.parse(saved);
        setQuery(filters.query || '');
        setSdr(filters.sdr || '');
        setStatus(filters.status || '');
        setCallType(filters.callType || '');
        setStart(filters.start || '');
        setEnd(filters.end || '');
        setMinDuration(filters.minDuration || '');
        setMaxDuration(filters.maxDuration || '');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar filtros salvos:', error);
    }
  };

  const clearAllFilters = () => {
    setQuery('');
    setSdr('');
    setStatus('');
    setCallType('');
    setStart('');
    setEnd('');
    setMinDuration('');
    setMaxDuration('');
    localStorage.removeItem('calls-filters');
  };

  const [remote, setRemote] = useState<any[] | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const setPreset = (days: number) => {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - (days - 1));
    setStart(fmt(startD));
    setEnd(fmt(endD));
  };

  // Carregar usuários reais uma vez
  useEffect(() => {
    const loadUsers = async () => {
      console.log('🔄 CallsPage - Iniciando carregamento de usuários...');
      try {
        const realUsers = await fetchRealUsers();
        console.log('👥 CallsPage - Usuários reais carregados:', realUsers);
        console.log('👥 CallsPage - Quantidade de usuários:', realUsers.length);
        console.log('👥 CallsPage - Estrutura do primeiro usuário:', realUsers[0]);
        setUsers(realUsers);
      } catch (error) {
        console.error('❌ CallsPage - Erro ao carregar usuários:', error);
        setUsers([]); // Fallback para array vazio
      }
    };
    loadUsers();
  }, []);

  // Carregar filtros salvos e sincronizar com URL
  useEffect(() => {
    const applyFromHash = () => {
      const hash = window.location.hash || '';
      const [path, qs] = hash.split('?');
      if (!path?.startsWith('#/calls')) return;
      const params = new URLSearchParams(qs || '');
      setSdr(params.get('sdr') || '');
      setStatus(params.get('status') || '');
      setCallType(params.get('callType') || '');
      setStart(params.get('start') || '');
      setEnd(params.get('end') || '');
      setMinDuration(params.get('minDuration') || '');
      setMaxDuration(params.get('maxDuration') || '');
      setQuery(params.get('q') || '');
      setPage(Number(params.get('page') || 1));
    };
    
    // Primeiro carrega do localStorage, depois aplica URL (URL tem prioridade)
    loadFiltersFromStorage();
    applyFromHash();
    
    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Buscando chamadas com filtros:', { sdr, status, callType, start, end, page });
        const { items, total } = await fetchCalls({
          sdrId: sdr || undefined,
          status: status || undefined,
          callType: callType || undefined,
          start: start || undefined,
          end: end || undefined,
          minDuration: minDuration ? parseInt(minDuration, 10) : undefined,
          maxDuration: maxDuration ? parseInt(maxDuration, 10) : undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        console.log('📞 Chamadas encontradas:', items, 'Total:', total);
        setRemote(items);
        setTotal(total || items.length);
      } catch (e: any) {
        console.error('❌ Erro ao buscar chamadas:', e);
        setError(e?.message || 'Falha ao buscar chamadas');
        setRemote(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sdr, status, callType, start, end, page, minDuration, maxDuration]);

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    saveFiltersToStorage();
  }, [query, sdr, status, callType, start, end, minDuration, maxDuration]);

  useEffect(() => { setPage(1); }, [sdr, status, callType, start, end, query, minDuration, maxDuration]);

  const filtered = useMemo(() => {
    // FORÇAR USO DOS DADOS REAIS - NÃO USAR FALLBACK
    const source = remote || []; // Usar apenas dados reais do banco
    console.log('🔍 CallsPage - Dados para filtrar:', source);
    console.log('🔍 CallsPage - Filtros ativos:', { query, sdr, status, callType, start, end });
    console.log('🔍 CallsPage - Usuários disponíveis:', users);
    
    return source.filter((c: any) => {
      // Debug da estrutura de cada chamada
      console.log('🔍 Chamada individual:', {
        id: c.id,
        company: c.company,
        sdr_id: c.sdr_id,
        sdr: c.sdr,
        status: c.status,
        call_type: c.call_type,
        created_at: c.created_at
      });
      const q = query.toLowerCase();
      const company = (c.company || '').toLowerCase();
      const deal = (c.dealCode || c.deal_id || '').toLowerCase();
      
      // Filtro de busca textual
      if (q && !(company.includes(q) || deal.includes(q))) {
        console.log(`❌ Filtro busca: "${q}" não encontrado em "${company}" ou "${deal}"`);
        return false;
      }
      
      // Filtro de SDR - Verificar múltiplas possibilidades de estrutura
      if (sdr) {
        const callSdrId = c.sdr?.id || c.sdr_id || c.agent_id;
        const sdrMatch = callSdrId === sdr;
        
        if (!sdrMatch) {
          console.log(`❌ Filtro SDR: esperado "${sdr}", encontrado:`, {
            'c.sdr?.id': c.sdr?.id,
            'c.sdr_id': c.sdr_id,
            'c.agent_id': c.agent_id,
            'callSdrId': callSdrId
          });
          return false;
        } else {
          console.log(`✅ Filtro SDR: match encontrado - "${sdr}"`);
        }
      }
      
      // Filtro de status
      if (status && c.status !== status) {
        console.log(`❌ Filtro status: esperado "${status}", encontrado "${c.status}"`);
        return false;
      }
      
      // Filtro de tipo de chamada
      if (callType && c.call_type !== callType) {
        console.log(`❌ Filtro call_type: esperado "${callType}", encontrado "${c.call_type}"`);
        return false;
      }
      
      // Filtro de data
      if (start && new Date(c.date || c.created_at) < new Date(start)) {
        console.log(`❌ Filtro data início: ${c.date || c.created_at} < ${start}`);
        return false;
      }
      if (end && new Date(c.date || c.created_at) > new Date(end)) {
        console.log(`❌ Filtro data fim: ${c.date || c.created_at} > ${end}`);
        return false;
      }

      // Filtro de duração
      const duration = c.durationSec || c.duration || 0;
      if (minDuration && duration < parseInt(minDuration, 10)) {
        console.log(`❌ Filtro duração mínima: ${duration} segundos < ${minDuration} segundos`);
        return false;
      }
      if (maxDuration && duration > parseInt(maxDuration, 10)) {
        console.log(`❌ Filtro duração máxima: ${duration} segundos > ${maxDuration} segundos`);
        return false;
      }
      
      return true;
    });
  }, [remote, query, sdr, status, callType, start, end, minDuration, maxDuration]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-3 lg:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 lg:grid-cols-6 gap-2 lg:gap-3">
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            className="flex-1 border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            placeholder="Empresa ou Deal ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {(query || sdr || status || callType || start || end || minDuration || maxDuration) && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
              title="Limpar todos os filtros"
            >
              🗑️ Limpar
            </button>
          )}
        </div>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={sdr} onChange={(e) => setSdr(e.target.value)}>
          <option value="">Todos os Usuários ({users.length})</option>
          {users.map((s) => {
            console.log('🎯 Renderizando usuário no dropdown:', s);
            return (
              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
            );
          })}
        </select>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="processed">Processada</option>
          <option value="processing">Processando</option>
          <option value="failed">Falhou</option>
          <option value="received">Recebida</option>
        </select>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={callType} onChange={(e) => setCallType(e.target.value)}>
          <option value="">Todos os Tipos</option>
          <option value="diagnostico">Diagnóstico</option>
          <option value="ligacao">Ligação</option>
          <option value="proposta">Proposta</option>
        </select>
        <div className="shrink">
          <RelativeDateRange onChange={(r) => { setStart(r.start); setEnd(r.end); }} />
        </div>
        <div className="shrink">
          <div className="flex items-center gap-1">
            <input
              type="number"
              className="w-16 md:w-20 border border-slate-300 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="Min"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
            />
            <span className="text-slate-500 text-sm">-</span>
            <input
              type="number"
              className="w-16 md:w-20 border border-slate-300 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="Max"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
            />
            <span className="text-slate-500 text-xs hidden sm:inline">seg</span>
          </div>
        </div>
      </div>

      <FilterChips
        chips={[
          ...(query ? [{ key: 'q', label: `Busca: ${query}` }] : []),
          ...(sdr ? [{ key: 'sdr', label: `Usuário: ${users.find(x=>x.id===sdr)?.name || sdr}` }] : []),
          ...(status ? [{ key: 'status', label: `Status: ${status}` }] : []),
          ...(callType ? [{ key: 'callType', label: `Tipo: ${callType}` }] : []),
          ...((start||end) ? [{ key: 'date', label: `Período: ${start || '...'} a ${end || '...'}` }] : []),
          ...(minDuration || maxDuration ? [{ key: 'duration', label: `Duração: ${minDuration || '0'}s - ${maxDuration || '∞'}s` }] : []),
        ]}
        onClear={(k) => {
          if (k==='q') setQuery('');
          if (k==='sdr') setSdr('');
          if (k==='status') setStatus('');
          if (k==='callType') setCallType('');
          if (k==='date') { setStart(''); setEnd(''); }
          if (k==='duration') { setMinDuration(''); setMaxDuration(''); }
        }}
        onClearAll={clearAllFilters}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Filtros salvos</div>
        <SavedFilters
          view="calls"
          params={{ ...(sdr?{sdr}:{}) , ...(status?{status}:{}) , ...(callType?{callType}:{}) , ...(start?{start}:{}) , ...(end?{end}:{}) , ...(query?{q:query}:{}) , ...(minDuration?{minDuration}:{}) , ...(maxDuration?{maxDuration}:{}) }}
          onApply={(p) => {
            setSdr(p.sdr || ''); setStatus(p.status || ''); setCallType(p.callType || ''); setStart(p.start || ''); setEnd(p.end || ''); setQuery(p.q || ''); setMinDuration(p.minDuration || ''); setMaxDuration(p.maxDuration || '');
          }}
        />
        <div className="mt-3 text-xs text-slate-500">Usuários Favoritos</div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {users.map((s) => {
            const favs = listFavoriteSdrs();
            const active = favs.includes(s.id);
            return (
              <button 
                key={s.id} 
                onClick={() => { 
                  const updated = toggleFavoriteSdr(s.id); 
                  setSdr(active ? '' : s.id); 
                }} 
                className={`px-2 py-1 text-xs rounded border ${
                  active ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && <div className="p-4 text-slate-600">Carregando chamadas...</div>}
        {error && <div className="p-4 text-rose-700 bg-rose-50 border-b border-rose-200">{error}</div>}
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-600 border-b">
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium">SDR</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Duração</th>
              <th className="p-4 font-medium">Tipo</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Recursos</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((call: any) => (
              <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{call.company}</div>
                  <div className="text-xs text-slate-500">{call.dealCode || call.deal_id}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {call.sdr?.avatarUrl ? (
                      <img className="w-8 h-8 rounded-full" src={call.sdr.avatarUrl} alt="avatar" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium text-xs">
                          {call.sdr?.name?.charAt(0).toUpperCase() || call.sdr_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-slate-700">
                      {call.sdr?.name || call.sdr_name || call.sdr_id || '-'}
                      {call.sdr_email && <div className="text-xs text-slate-500">{call.sdr_email}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {call.date || call.created_at ? (
                    <>
                      {DATE_FORMATTER.format(new Date(call.date || call.created_at))}
                      <span className="text-slate-400"> • </span>
                      {TIME_FORMATTER.format(new Date(call.date || call.created_at))}
                    </>
                  ) : (
                    'Data não disponível'
                  )}
                </td>
                <td className="p-4">{secondsToHuman(call.durationSec ?? call.duration ?? 0)}</td>
                <td className="p-4">
                  <div className="text-sm">
                    {call.call_type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {call.call_type}
                      </span>
                    )}
                    {call.direction && (
                      <div className="text-xs text-slate-500 mt-1">
                        {call.direction === 'inbound' ? '📞 Recebida' : '📱 Feita'}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      call.status === 'processed' ? 'bg-green-100 text-green-800' :
                      call.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      call.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {call.status}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {/* Áudio */}
                    {(call.recording_url || call.audio_path) && (
                      <span 
                        className="inline-flex items-center justify-center w-6 h-6 text-green-600 hover:text-green-700 transition-colors cursor-help" 
                        title="🎵 Áudio disponível"
                      >
                        🎵
                      </span>
                    )}
                    
                    {/* Transcrição */}
                    {call.transcription && call.transcription.trim() && (
                      <span 
                        className="inline-flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-700 transition-colors cursor-help" 
                        title="📝 Transcrição disponível"
                      >
                        📝
                      </span>
                    )}
                    
                    {/* Análise IA */}
                    {canAccessManualAnalysis && (call.scorecard && Object.keys(call.scorecard).length > 0) && (
                      <span 
                        className="inline-flex items-center justify-center w-6 h-6 text-purple-600 hover:text-purple-700 transition-colors cursor-help" 
                        title="🤖 Análise IA realizada"
                      >
                        🤖
                      </span>
                    )}
                    
                    {/* Insights */}
                    {(call.insights && Object.keys(call.insights).length > 0) && (
                      <span 
                        className="inline-flex items-center justify-center w-6 h-6 text-orange-600 hover:text-orange-700 transition-colors cursor-help" 
                        title="🧠 Insights disponíveis"
                      >
                        🧠
                      </span>
                    )}
                    
                    {/* Indicador quando não há recursos */}
                    {!call.recording_url && !call.audio_path && !call.transcription && !call.scorecard && !call.insights && (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <a href={`#/calls/${call.id}`} className="text-slate-600 hover:text-slate-900 text-sm">Detalhes</a>
                    {canAccessManualAnalysis && (
                      <a href={`#/calls/${call.id}/analyze`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Analisar</a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">Nenhuma chamada encontrada com os filtros atuais.</div>
        )}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 text-sm text-slate-600">
          <div>
            Mostrando {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} de {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded border ${page===1?'border-slate-200 text-slate-300':'border-slate-300 hover:bg-slate-50'}`}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p-1))}
            >Anterior</button>
            <button
              className={`px-3 py-1 rounded border ${page*pageSize>=total?'border-slate-200 text-slate-300':'border-slate-300 hover:bg-slate-50'}`}
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p+1)}
            >Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}


