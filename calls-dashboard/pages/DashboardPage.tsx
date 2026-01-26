import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '../../services/supabaseClient';
import CallVolumeChart from '../components/CallVolumeChart';
import SdrScoreChart from '../components/SdrScoreChart';
import SdrAverageScoreChart from '../components/SdrAverageScoreChart';
import SdrUniqueLeadsChart from '../components/SdrUniqueLeadsChart';
import CallsDashboardAuditPanel from '../components/CallsDashboardAuditPanel';
import { fetchUniqueSdrs } from '../services/callsService';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

// Componente Toggle Switch
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
    <span className="text-sm text-slate-600">{label}</span>
  </label>
);

// Componente Badge para filtros ativos
const FilterBadge = ({ label, value, color = 'indigo' }: { label: string; value: string; color?: string }) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      <span className="text-slate-500">{label}:</span>
      <span>{value}</span>
    </span>
  );
};

// Labels para período
const periodLabels: Record<number, string> = {
  0: 'Personalizado',
  1: 'Hoje',
  7: '7 dias',
  14: '14 dias',
  30: '30 dias',
  90: '90 dias',
};

const DashboardPage = () => {
  const { isAdminOrSuperAdmin } = useAdminPermissions();
  const [dashboardData, setDashboardData] = useState({
    // Métricas principais
    totalCalls: -1, // Valor diferente para detectar se atualizou
    answeredCalls: -1,
    answeredRate: -1,
    avgDuration: -1,
    
    // Dados brutos para gráficos
    allCalls: [],
    sdrMetrics: [],
    volumeData: [],
    
    loading: true,
    error: null
  });

  const [selectedPeriod, setSelectedPeriod] = useState(14);
  const [selectedSdr, setSelectedSdr] = useState<string | null>(null);
  const [sdrOptions, setSdrOptions] = useState<{ email: string; name: string }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  
  // Filtros de data personalizada
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const startDateParam = startDate ? startDate.toISOString().split('T')[0] : '';
  const endDateParam = endDate ? endDate.toISOString().split('T')[0] : '';
  
  // Calcular período em dias a partir das datas customizadas
  const getEffectivePeriod = (): number => {
    if (useCustomDates && startDate && endDate) {
      const start = startDate;
      const end = endDate;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return selectedPeriod;
  };
  
  // Label do período atual
  const getPeriodLabel = (): string => {
    if (useCustomDates) {
      if (startDate && endDate) {
        const start = startDate;
        const end = endDate;
        return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
      }
      return 'Personalizado';
    }
    return periodLabels[selectedPeriod] || `${selectedPeriod} dias`;
  };

  const getDateRangeForMetrics = () => {
    if (useCustomDates && startDate && endDate) {
      const startIso = new Date(startDate.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString();
      const endIso = new Date(endDate.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString();
      return { startIso, endIso };
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - getEffectivePeriod() + 1);
    return {
      startIso: new Date(start.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      endIso: new Date(end.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString()
    };
  };

  const parseDurationSeconds = (call: any): number => {
    const formatted = call.duration_formated || call.duration_formatted;
    if (formatted && typeof formatted === 'string' && formatted !== '00:00:00') {
      const parts = formatted.split(':').map((p: string) => parseInt(p, 10));
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
      }
    }
    return Number(call.duration_seconds || call.duration || 0);
  };

  const fetchDashboardMetricsFromCalls = useCallback(async () => {
    const { startIso, endIso } = getDateRangeForMetrics();
    const pageSize = 1000;
    const maxRecords = 50000;
    let offset = 0;
    let allCalls: any[] = [];
    let totalCount = 0;

    while (offset < maxRecords) {
      const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_filters', {
        p_sdr: selectedSdr || null,
        p_status: null,
        p_type: null,
        p_start_date: startIso,
        p_end_date: endIso,
        p_limit: pageSize,
        p_offset: offset,
        p_sort_by: 'created_at',
        p_min_duration: null,
        p_max_duration: null,
        p_min_score: null
      });

      if (callsError) {
        throw callsError;
      }

      const chunk = Array.isArray(callsData) ? callsData : [];
      if (chunk.length === 0) break;

      totalCount = Number(chunk[0]?.total_count || totalCount);
      allCalls = allCalls.concat(chunk);

      if (allCalls.length >= totalCount) break;
      offset += pageSize;
    }

    if (totalCount > maxRecords) {
      console.warn('⚠️ Dashboard - Limite máximo atingido, métricas podem estar parciais.');
    }

    const totalCalls = totalCount || allCalls.length;
    const answeredCalls = allCalls.filter((call) => call.status_voip === 'normal_clearing').length;
    const answeredRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

    const answeredDurations = allCalls
      .filter((call) => call.status_voip === 'normal_clearing')
      .map(parseDurationSeconds)
      .filter((duration) => duration > 0);

    const avgDuration = answeredDurations.length > 0
      ? Math.round(answeredDurations.reduce((sum, duration) => sum + duration, 0) / answeredDurations.length)
      : 0;

    return {
      totalCalls,
      answeredCalls,
      answeredRate,
      avgDuration
    };
  }, [selectedSdr, useCustomDates, startDate, endDate, selectedPeriod]);

  // Função para atualização manual (sem reload da página)
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('🔄 Atualização manual iniciada...');
    
    try {
      if (!supabase) {
        throw new Error('Supabase não inicializado');
      }

      const metrics = await fetchDashboardMetricsFromCalls();

      setDashboardData(prev => ({
        ...prev,
        totalCalls: metrics.totalCalls,
        answeredCalls: metrics.answeredCalls,
        answeredRate: metrics.answeredRate,
        avgDuration: metrics.avgDuration,
        loading: false,
        error: null
      }));
      
      setLastUpdate(new Date());
      console.log('✅ Atualização manual concluída!');
    } catch (err: any) {
      console.error('❌ Erro na atualização manual:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fetchDashboardMetricsFromCalls]);

  // Obter nome do SDR selecionado
  const selectedSdrName = selectedSdr 
    ? sdrOptions.find(s => s.email === selectedSdr)?.name || selectedSdr 
    : 'Todos';

  // Função para converter HH:MM:SS para segundos
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Função para formatar segundos em MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Tipos auxiliares
  type SdrStats = {
    sdr_name: string;
    total_calls: number;
    answered_calls: number;
    total_duration: number;
    avg_duration: number;
  };
  type VolumeByDate = Record<string, { total: number; answered: number }>;

  // Processar dados para gráficos
  const processDataForCharts = (calls: any[]) => {
    console.log('📊 Processando dados para gráficos...');
    
    // Agrupar por data para volume chart
    const volumeByDate: VolumeByDate = {};
    const sdrStats: Record<string, SdrStats> = {};
    
    calls.forEach(call => {
      // Volume por data
      const date = call.created_at ? call.created_at.split('T')[0] : 'unknown';
      if (!volumeByDate[date]) volumeByDate[date] = { total: 0, answered: 0 };
      volumeByDate[date].total++;
      if (call.status_voip === 'normal_clearing') {
        volumeByDate[date].answered++;
      }
      
      // Stats por SDR
      const sdrName = call.sdr_name || 'Desconhecido';
      if (!sdrStats[sdrName]) sdrStats[sdrName] = {
        sdr_name: sdrName,
        total_calls: 0,
        answered_calls: 0,
        total_duration: 0,
        avg_duration: 0
      };
      
      sdrStats[sdrName].total_calls++;
      if (call.status_voip === 'normal_clearing') {
        sdrStats[sdrName].answered_calls++;
        
        // Calcular duração
        const duration = call.duration_formated ? 
          timeToSeconds(call.duration_formated) : 
          (call.duration || 0);
        
        if (duration > 0) {
          sdrStats[sdrName].total_duration += duration;
        }
      }
    });
    
    // Calcular média de duração por SDR
    (Object.values(sdrStats) as SdrStats[]).forEach((sdr) => {
      if (sdr.answered_calls > 0) {
        sdr.avg_duration = Math.round(sdr.total_duration / sdr.answered_calls);
      }
    });
    
    // Converter para arrays
    const volumeData = Object.entries(volumeByDate).map(([date, data]) => ({
      date,
      total: data.total,
      answered: data.answered
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    const sdrMetrics = (Object.values(sdrStats) as SdrStats[]).sort((a, b) => b.total_calls - a.total_calls);
    
    console.log('📊 Volume data processado:', volumeData.length, 'dias');
    console.log('📊 SDR metrics processado:', sdrMetrics.length, 'SDRs');
    
    return { volumeData, sdrMetrics };
  };

  useEffect(() => {
    // Carregar SDRs para o seletor
    const loadSdrs = async () => {
      try {
        const sdrs = await fetchUniqueSdrs();
        setSdrOptions(sdrs.map(s => ({ email: s.email, name: s.name })));
      } catch (e) {
        console.warn('Não foi possível carregar SDRs para o dashboard');
      }
    };
    loadSdrs();
  }, []);

  useEffect(() => {
    console.log('🎯🎯🎯 useEffect EXECUTADO - VERSÃO FORÇADA!');
    console.log('🔍 selectedPeriod:', selectedPeriod);
    
    const fetchAllData = async () => {
      console.log('🚀 BUSCANDO TODOS OS DADOS - UMA CONSULTA ÚNICA!');
      
      if (!supabase) {
        console.log('❌ Supabase não inicializado');
        setDashboardData(prev => ({ ...prev, loading: false, error: 'Supabase não inicializado' }));
        return;
      }

      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }));

        const metrics = await fetchDashboardMetricsFromCalls();

        // Atualizar estado (deixar gráficos para componentes próprios)
        setDashboardData(prev => ({
          ...prev,
          totalCalls: metrics.totalCalls,
          answeredCalls: metrics.answeredCalls,
          answeredRate: metrics.answeredRate,
          avgDuration: metrics.avgDuration,
          loading: false,
          error: null
        }));
        
        // Atualizar timestamp da última atualização
        setLastUpdate(new Date());

        console.log('✅ Métricas finais:', {
          totalCalls: metrics.totalCalls,
          answeredCalls: metrics.answeredCalls,
          answeredRate: metrics.answeredRate,
          avgDuration: formatDuration(metrics.avgDuration)
        });

      } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        setDashboardData(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message || 'Erro desconhecido'
        }));
      }
    };

    fetchAllData();
  }, [selectedPeriod, useCustomDates, startDate, endDate, selectedSdr, fetchDashboardMetricsFromCalls]);

  // Sistema de atualização automática
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      console.log('🔄 Atualização automática disparada');
      
      try {
        if (!supabase) return;

        // Buscar volume agregado para detectar mudanças sem refazer cálculo pesado
        const { startIso, endIso } = getDateRangeForMetrics();
        const { data: volumeData, error: volumeErr } = await supabase
          .rpc('get_calls_volume_by_day', { p_start_date: startIso, p_end_date: endIso, p_sdr: selectedSdr || null });
        if (volumeErr) throw volumeErr;

        const totalFromVolume = Array.isArray(volumeData)
          ? volumeData.reduce((sum: number, row: any) => sum + Number(row.total || 0), 0)
          : 0;
        
        // Se houver mudança na contagem, recarregar dados SEM RESETAR FILTROS
        if (totalFromVolume !== dashboardData.totalCalls) {
          console.log('📊 Novos dados detectados! Atualizando sem resetar filtros...', totalFromVolume, 'vs', dashboardData.totalCalls);
          
          // Recarregar dados preservando filtros (selectedSdr, selectedPeriod)
          const fetchAllData = async () => {
            try {
              const metrics = await fetchDashboardMetricsFromCalls();

              setDashboardData(prev => ({
                ...prev,
                totalCalls: metrics.totalCalls,
                answeredCalls: metrics.answeredCalls,
                answeredRate: metrics.answeredRate,
                avgDuration: metrics.avgDuration,
                loading: false,
                error: null
              }));
              
              setLastUpdate(new Date());
              console.log('✅ Dashboard atualizado preservando filtros!');
            } catch (err) {
              console.error('❌ Erro ao atualizar dashboard:', err);
            }
          };
          
          fetchAllData();
        } else {
          // Apenas atualizar timestamp se não houver mudanças
          setLastUpdate(new Date());
          console.log('✅ Nenhum dado novo. Última verificação:', new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('❌ Erro na atualização automática:', error);
        setLastUpdate(new Date());
      }
    }, 15000); // Verificar a cada 15 segundos
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedPeriod, useCustomDates, startDate, endDate, selectedSdr, dashboardData.totalCalls, fetchDashboardMetricsFromCalls]);

  if (dashboardData.loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg text-slate-600">Carregando dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{dashboardData.error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* === CABEÇALHO PRINCIPAL === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Dashboard de Chamadas
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <FilterBadge label="Período" value={getPeriodLabel()} color="indigo" />
            <FilterBadge label="SDR" value={selectedSdrName} color="emerald" />
            <span className="text-sm text-slate-500">
              {dashboardData.totalCalls.toLocaleString('pt-BR')} chamadas
            </span>
          </div>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {/* Botão de Auditoria (apenas SuperAdmin) */}
          {isAdminOrSuperAdmin && (
            <button 
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200 shadow-sm
                ${showAuditPanel 
                  ? 'bg-amber-600 text-white hover:bg-amber-700' 
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                }
              `}
            >
              <span>🔍</span>
              {showAuditPanel ? 'Ocultar Auditoria' : 'Auditoria'}
            </button>
          )}
          
          {/* Botão de Atualizar */}
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200 shadow-sm
              ${isRefreshing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }
            `}
          >
            <svg 
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* === BARRA DE FILTROS === */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-4">
          {/* Linha 1: Filtros principais */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Tipo de período */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Período:</label>
              <select 
                value={useCustomDates ? 0 : selectedPeriod} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val === 0) {
                    setUseCustomDates(true);
                  } else {
                    setUseCustomDates(false);
                    setSelectedPeriod(val);
                  }
                }}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           hover:border-slate-400 transition-colors cursor-pointer"
              >
                <option value="1">Hoje</option>
                <option value="7">Últimos 7 dias</option>
                <option value="14">Últimos 14 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="0">Personalizado</option>
              </select>
            </div>

            {/* Campos de data (visíveis quando personalizado) */}
            {useCustomDates && (
              <>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500 mb-1">De</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    maxDate={endDate || undefined}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/aaaa"
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500 mb-1">Até</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || undefined}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/aaaa"
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {/* SDR */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">SDR:</label>
              <select 
                value={selectedSdr || ''}
                onChange={(e) => setSelectedSdr(e.target.value || null)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           hover:border-slate-400 transition-colors cursor-pointer min-w-[180px]"
              >
                <option value="">Todos os SDRs</option>
                {sdrOptions.map(s => (
                  <option key={s.email} value={s.email}>{s.name || s.email}</option>
                ))}
              </select>
            </div>

            {/* Divisor visual */}
            <div className="hidden lg:block w-px h-8 bg-slate-300" />

            {/* Auto-refresh toggle */}
            <ToggleSwitch 
              checked={autoRefresh} 
              onChange={setAutoRefresh} 
              label="Auto-refresh (15s)" 
            />

            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* === CARDS DE MÉTRICAS === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Chamadas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-600">Total de Chamadas</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {dashboardData.totalCalls.toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Chamadas Atendidas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-600">Atendidas</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            {dashboardData.answeredCalls.toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Taxa de Atendimento */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-600">Taxa de Atendimento</span>
          </div>
          <div className="text-3xl font-bold text-amber-600">
            {dashboardData.answeredRate}%
          </div>
        </div>

        {/* Duração Média */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-600">Duração Média</span>
          </div>
          <div className="text-3xl font-bold text-violet-600">
            {formatDuration(dashboardData.avgDuration)}
          </div>
        </div>
      </div>

      {/* === GRÁFICO DE VOLUME === */}
      <div>
        <CallVolumeChart 
          selectedPeriod={getEffectivePeriod()} 
          selectedSdrEmail={selectedSdr}
          startDate={useCustomDates ? (startDateParam || undefined) : undefined}
          endDate={useCustomDates ? (endDateParam || undefined) : undefined}
        />
      </div>

      {/* === RANKINGS === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SdrScoreChart 
          selectedPeriod={getEffectivePeriod()} 
          startDate={useCustomDates ? (startDateParam || undefined) : undefined}
          endDate={useCustomDates ? (endDateParam || undefined) : undefined}
        />
        <SdrAverageScoreChart 
          selectedPeriod={getEffectivePeriod()}
          startDate={useCustomDates ? (startDateParam || undefined) : undefined}
          endDate={useCustomDates ? (endDateParam || undefined) : undefined}
        />
        <SdrUniqueLeadsChart 
          selectedPeriod={getEffectivePeriod()}
          startDate={useCustomDates ? (startDateParam || undefined) : undefined}
          endDate={useCustomDates ? (endDateParam || undefined) : undefined}
        />
      </div>

      {/* === PAINEL DE AUDITORIA (SuperAdmin) === */}
      {showAuditPanel && isAdminOrSuperAdmin && (
        <CallsDashboardAuditPanel
          dashboardData={{
            totalCalls: dashboardData.totalCalls,
            answeredCalls: dashboardData.answeredCalls,
            answeredRate: dashboardData.answeredRate,
            avgDuration: dashboardData.avgDuration
          }}
          selectedPeriod={selectedPeriod}
          selectedSdr={selectedSdr}
          useCustomDates={useCustomDates}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
};

export default DashboardPage;