import React, { useEffect, useState } from 'react';
import CallVolumeChart from '../components/CallVolumeChart';
import SdrScoreChart from '../components/SdrScoreChart';
import SdrAverageScoreChart from '../components/SdrAverageScoreChart';
import { supabase } from '../../services/supabaseClient';

interface DashboardMetrics {
  totalCalls: number;
  answered: number;
  answeredRate: number;
  avgDuration: number;
  loading: boolean;
  error: string | null;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCalls: 0,
    answered: 0,
    answeredRate: 0,
    avgDuration: 0,
    loading: true,
    error: null
  });
  
  // Estado compartilhado para período
  const [selectedPeriod, setSelectedPeriod] = useState(14); // Padrão: 14 dias

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!supabase) {
        console.log('⚠️ Supabase não inicializado');
        setMetrics(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        console.log('🔍 Buscando métricas do dashboard...');
        
        // Usar período selecionado
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - selectedPeriod);

        const { data, error } = await supabase
          .from('calls')
          .select('status_voip, duration')
          .gte('created_at', daysAgo.toISOString());

        if (error) {
          console.error('❌ Erro ao buscar métricas:', error);
          setMetrics(prev => ({ 
            ...prev, 
            loading: false, 
            error: error.message 
          }));
          return;
        }

        console.log('✅ Dados de métricas carregados:', data?.length || 0);

        const calls = data || [];
        const totalCalls = calls.length;
        
        // Apenas 'normal_clearing' conta como atendida
        const answeredCalls = calls.filter(c => c.status_voip === 'normal_clearing');
        const answered = answeredCalls.length;
        const answeredRate = totalCalls ? Math.round((answered / totalCalls) * 100) : 0;
        
        // Duração média APENAS das chamadas atendidas (normal_clearing)
        const answeredDurations = answeredCalls
          .filter(c => c.duration && c.duration > 0)
          .map(c => c.duration);
        const avgDuration = answeredDurations.length > 0 
          ? answeredDurations.reduce((a, b) => a + b, 0) / answeredDurations.length 
          : 0;

        setMetrics({
          totalCalls,
          answered,
          answeredRate,
          avgDuration,
          loading: false,
          error: null
        });

      } catch (err: any) {
        console.error('❌ Erro geral ao buscar métricas:', err);
        setMetrics(prev => ({ 
          ...prev, 
          loading: false, 
          error: err?.message || 'Erro ao carregar métricas' 
        }));
      }
    };

    fetchMetrics();
  }, [selectedPeriod]); // Re-executar quando período mudar

  if (metrics.loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-600">Métricas e visão geral do desempenho da equipe.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header com filtro de período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-600">Métricas e visão geral do desempenho da equipe.</p>
        </div>
        
        {/* Filtro de período unificado */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Período:</span>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded px-3 py-1 bg-white"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total de Chamadas</p>
              <p className="text-2xl font-semibold text-slate-800">{metrics.totalCalls}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Chamadas Atendidas</p>
              <p className="text-2xl font-semibold text-slate-800">{metrics.answered}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Taxa de Atendimento</p>
              <p className="text-2xl font-semibold text-slate-800">{metrics.answeredRate}%</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Duração Média</p>
              <p className="text-2xl font-semibold text-slate-800">
                {Math.round(metrics.avgDuration / 60)}m {Math.round(metrics.avgDuration % 60)}s
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Volume - Largura completa */}
      <div className="w-full">
        <CallVolumeChart selectedPeriod={selectedPeriod} />
      </div>

      {/* Rankings - Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SdrScoreChart selectedPeriod={selectedPeriod} />
        <SdrAverageScoreChart selectedPeriod={selectedPeriod} />
      </div>
    </div>
  );
}


