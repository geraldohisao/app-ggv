import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_calls: number;
  processed_calls: number;
  progress_percentage: number;
  created_at: string;
  completed_at?: string;
  processing_time_seconds?: number;
}

interface BatchFilters {
  startDate: string;
  endDate: string;
  callTypes: string[];
  sdrs: string[];
  forceReprocess: boolean;
}

export default function BatchAnalysisPanelV2() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BatchFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias atrás
    endDate: new Date().toISOString().split('T')[0],
    callTypes: [],
    sdrs: [],
    forceReprocess: false
  });
  const [availableOptions, setAvailableOptions] = useState({
    callTypes: [] as string[],
    sdrs: [] as string[]
  });

  useEffect(() => {
    loadJobs();
    loadAvailableOptions();
    
    // Polling para jobs ativos
    const interval = setInterval(() => {
      if (activeJob && (activeJob.status === 'pending' || activeJob.status === 'running')) {
        loadJobs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_batch_analysis_jobs');
      if (error) throw error;
      
      setJobs(data || []);
      
      // Atualizar job ativo se existir
      if (activeJob) {
        const updatedActiveJob = data?.find(j => j.id === activeJob.id);
        if (updatedActiveJob) {
          setActiveJob(updatedActiveJob);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar jobs:', error);
    }
  };

  const loadAvailableOptions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_options');
      if (error) throw error;
      
      const options = Array.isArray(data) ? data[0] : data;
      setAvailableOptions({
        callTypes: options?.call_types || [],
        sdrs: options?.sdrs || []
      });
    } catch (error) {
      console.warn('Erro ao carregar opções:', error);
    }
  };

  const createBatchJob = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      const jobName = `Análise ${filters.forceReprocess ? 'Completa' : 'Incremental'} - ${new Date().toLocaleDateString()}`;
      
      const filtersJson = {
        start_date: filters.startDate ? new Date(filters.startDate).toISOString() : null,
        end_date: filters.endDate ? new Date(filters.endDate).toISOString() : null,
        call_types: filters.callTypes.length > 0 ? filters.callTypes.join(',') : null,
        sdrs: filters.sdrs.length > 0 ? filters.sdrs.join(',') : null,
        force_reprocess: filters.forceReprocess
      };

      console.log('🚀 Criando job de análise em lote:', { jobName, filters: filtersJson });

      const { data: jobId, error } = await supabase.rpc('create_batch_analysis_job', {
        job_name: jobName,
        filters_json: filtersJson
      });

      if (error) throw error;

      console.log('✅ Job criado com ID:', jobId);
      
      // Começar processamento
      await startProcessing(jobId);
      
      // Recarregar lista
      await loadJobs();
      
      // Definir como job ativo
      const newJob = jobs.find(j => j.id === jobId);
      if (newJob) setActiveJob(newJob);
      
    } catch (error) {
      console.error('❌ Erro ao criar job:', error);
      alert('Erro ao criar análise em lote: ' + (error as any)?.message);
    } finally {
      setLoading(false);
    }
  };

  const startProcessing = async (jobId: string) => {
    try {
      console.log('🔄 Iniciando processamento do job:', jobId);
      
      // Processar em chunks até completar
      let processing = true;
      while (processing) {
        const { data: result, error } = await supabase.rpc('process_batch_analysis_chunk', {
          p_chunk_size: 5, // Processar 5 chamadas por vez  
          p_job_id: jobId
        });

        if (error) {
          console.error('❌ Erro no processamento:', error);
          break;
        }

        console.log('📊 Chunk processado:', result);
        
        // Verificar se completou
        if (result?.progress_percentage >= 100) {
          processing = false;
          console.log('✅ Job completado!');
        }
        
        // Aguardar um pouco antes do próximo chunk
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('💥 Erro no processamento:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🚀 Análise IA em Lote
          </h3>
          <p className="text-sm text-slate-600">Analise centenas de chamadas automaticamente</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showFilters ? 'Ocultar Filtros' : 'Configurar Análise'}
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-slate-800">Configurações da Análise</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Opções avançadas */}
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.forceReprocess}
                onChange={(e) => setFilters(prev => ({ ...prev, forceReprocess: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-slate-700">
                Re-analisar chamadas já processadas
              </span>
            </label>
          </div>

          {/* Botão de iniciar */}
          <div className="flex justify-end">
            <button
              onClick={createBatchJob}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Criando...' : '🚀 Iniciar Análise em Lote'}
            </button>
          </div>
        </div>
      )}

      {/* Job ativo */}
      {activeJob && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-800 flex items-center gap-2">
              {getStatusIcon(activeJob.status)} {activeJob.name}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activeJob.status)}`}>
              {activeJob.status.toUpperCase()}
            </span>
          </div>
          
          {/* Barra de progresso */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>{activeJob.processed_calls} de {activeJob.total_calls} chamadas</span>
              <span>{activeJob.progress_percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${activeJob.progress_percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-slate-800">{activeJob.total_calls}</div>
              <div className="text-slate-600">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{activeJob.processed_calls}</div>
              <div className="text-slate-600">Processadas</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-800">
                {activeJob.processing_time_seconds ? Math.round(activeJob.processing_time_seconds) + 's' : '-'}
              </div>
              <div className="text-slate-600">Tempo</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de jobs */}
      <div>
        <h4 className="font-medium text-slate-800 mb-3">Histórico de Análises</h4>
        
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Nenhuma análise em lote executada ainda</p>
            <p className="text-xs mt-1">Configure e inicie sua primeira análise em lote</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div 
                key={job.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  activeJob?.id === job.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setActiveJob(job)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getStatusIcon(job.status)}</span>
                      <h5 className="font-medium text-slate-800">{job.name}</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {job.processed_calls} de {job.total_calls} chamadas • {job.progress_percentage}% concluído
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>{new Date(job.created_at).toLocaleDateString()}</div>
                    {job.processing_time_seconds && (
                      <div>{Math.round(job.processing_time_seconds)}s</div>
                    )}
                  </div>
                </div>
                
                {/* Barra de progresso mini */}
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        job.status === 'completed' ? 'bg-green-500' :
                        job.status === 'failed' ? 'bg-red-500' :
                        job.status === 'running' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: `${job.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão de ação rápida */}
      {!showFilters && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, forceReprocess: false }));
              createBatchJob();
            }}
            disabled={loading}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Processando...' : '⚡ Análise Rápida (Novas)'}
          </button>
          
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, forceReprocess: true }));
              createBatchJob();
            }}
            disabled={loading}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {loading ? 'Processando...' : '🔄 Re-analisar Todas'}
          </button>
        </div>
      )}
    </div>
  );
}
