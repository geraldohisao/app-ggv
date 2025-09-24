import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import CallVolumeChart from '../components/CallVolumeChart';
import SdrScoreChart from '../components/SdrScoreChart';
import SdrAverageScoreChart from '../components/SdrAverageScoreChart';
import { fetchUniqueSdrs } from '../services/callsService';

const DashboardPage = () => {
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

  // LOG IMEDIATO PARA TESTE
  console.log('🔥🔥🔥 DASHBOARD REFATORADO COMPLETO - NOVA ARQUITETURA!');

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

        console.log('📊 Buscando contagens via RPC (com filtro de período)...');

        // Usar RPC com intervalo amplo (timestamptz) para garantir retorno
        const startISO = '2023-01-01T00:00:00.000Z';
        const endISO = '2030-01-01T00:00:00.000Z';
        
        console.log('📅 Período filtrado:', { startISO, endISO, selectedPeriod });

        // USAR A NOVA RPC QUE CRIAMOS (get_dashboard_totals)
        console.log('📊 Buscando métricas via get_dashboard_totals (função existente)');
        const { data: totalsData, error: totalsErr } = await supabase.rpc('get_dashboard_totals');
        
        if (totalsErr) throw totalsErr;
        
        const metrics = Array.isArray(totalsData) ? totalsData[0] : totalsData;
        const totalCount = Number(metrics?.total_calls || 0);
        const answeredCount = Number(metrics?.answered_calls || 0);
        const avgDurationFromRpc = Math.round(Number(metrics?.avg_duration_answered || 0));

        console.log('✅ Contagens (via get_dashboard_totals):', { 
          totalCount, 
          answeredCount, 
          avgDurationFromRpc,
          dadosBrutos: metrics
        });

        // Duração média vinda da própria função quando disponível
        const avgDurationFromRpcLocal = Number(avgDurationFromRpc || 0);

        // Calcular taxa
        const answeredRate = totalCount && totalCount > 0
          ? Math.round(((answeredCount || 0) / totalCount) * 100)
          : 0;

        // Calcular média de duração
        let avgDuration = Math.round(avgDurationFromRpcLocal || 0);

        // Atualizar estado (deixar gráficos para componentes próprios)
        setDashboardData(prev => ({
          ...prev,
          totalCalls: totalCount || 0,
          answeredCalls: answeredCount || 0,
          answeredRate,
          avgDuration,
          loading: false,
          error: null
        }));
        
        // Atualizar timestamp da última atualização
        setLastUpdate(new Date());

        console.log('✅ Métricas finais:', {
          totalCalls: totalCount,
          answeredCalls: answeredCount,
          answeredRate,
          avgDuration: formatDuration(avgDuration)
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
  }, [selectedPeriod]);

  // Sistema de atualização automática
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      console.log('🔄 Atualização automática disparada');
      
      try {
        if (!supabase) return;

        // Buscar total via RPC para comparar
        const { data: metricsData, error: metricsErr } = await supabase
          .rpc('get_dashboard_metrics_v2', { p_days: selectedPeriod });
        if (metricsErr) throw metricsErr;
        const metrics = Array.isArray(metricsData) ? metricsData[0] : metricsData;
        const newTotalCount = Number(metrics?.total_calls || 0);
        
        // Se houver mudança na contagem, recarregar dados SEM RESETAR FILTROS
        if (newTotalCount !== dashboardData.totalCalls) {
          console.log('📊 Novos dados detectados! Atualizando sem resetar filtros...', newTotalCount, 'vs', dashboardData.totalCalls);
          
          // Recarregar dados preservando filtros (selectedSdr, selectedPeriod)
          const fetchAllData = async () => {
            try {
              const { data: totalsData, error: totalsErr } = await supabase.rpc('get_dashboard_totals');
              if (totalsErr) throw totalsErr;
              
              const metrics = Array.isArray(totalsData) ? totalsData[0] : totalsData;
              const totalCount = Number(metrics?.total_calls || 0);
              const answeredCount = Number(metrics?.answered_calls || 0);
              const avgDurationFromRpc = Math.round(Number(metrics?.avg_duration_answered || 0));
              const answeredRate = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

              setDashboardData(prev => ({
                ...prev,
                totalCalls: totalCount,
                answeredCalls: answeredCount,
                answeredRate,
                avgDuration: avgDurationFromRpc,
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
  }, [autoRefresh, selectedPeriod, dashboardData.totalCalls]);

  if (dashboardData.loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{ fontSize: '18px' }}>🔄 Carregando dados do dashboard...</div>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{ fontSize: '18px', color: 'red' }}>❌ Erro: {dashboardData.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Dashboard - Dados Diretos 🚀
        </h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Métricas dos últimos {selectedPeriod} dias (Total: {dashboardData.totalCalls} chamadas)
        </p>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '8px', fontSize: '14px', color: '#666' }}>Período:</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="1">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="14">Últimos 14 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
          <div>
            <label style={{ marginRight: '8px', fontSize: '14px', color: '#666' }}>SDR:</label>
            <select 
              value={selectedSdr || ''}
              onChange={(e) => setSelectedSdr(e.target.value || null)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Todos os SDRs</option>
              {sdrOptions.map(s => (
                <option key={s.email} value={s.email}>{s.name || s.email}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#666' }}>
              <input 
                type="checkbox" 
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ marginRight: '4px' }}
              />
              Atualização automática (15s)
            </label>
          </div>
          
          <div style={{ fontSize: '12px', color: '#888' }}>
            🕐 Última atualização: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '8px 16px', 
              border: '1px solid #3b82f6', 
              borderRadius: '4px', 
              backgroundColor: '#3b82f6', 
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Atualizar Agora
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            📞 Total de Chamadas
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
            {dashboardData.totalCalls}
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            ✅ Chamadas Atendidas
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {dashboardData.answeredCalls}
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            📈 Taxa de Atendimento
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
            {dashboardData.answeredRate}%
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            ⏱️ Duração Média
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {formatDuration(dashboardData.avgDuration)}
          </div>
        </div>
      </div>

      {/* Informações de Debug */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '12px', 
        borderRadius: '6px', 
        marginBottom: '24px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        🔍 Debug: {dashboardData.volumeData.length} dias de dados | {dashboardData.sdrMetrics.length} SDRs | 
        Última atualização: {new Date().toLocaleTimeString()}
      </div>

      {/* Gráfico de volume - largura total */}
      <div style={{ marginBottom: '24px' }}>
        <CallVolumeChart 
          selectedPeriod={selectedPeriod} 
          selectedSdrEmail={selectedSdr}
        />
      </div>

      {/* Rankings lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        <SdrScoreChart selectedPeriod={selectedPeriod} />
        <SdrAverageScoreChart selectedPeriod={selectedPeriod} />
      </div>
    </div>
  );
};

export default DashboardPage;