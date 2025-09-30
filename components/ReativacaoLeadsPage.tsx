import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/DirectUserContext';
import { useBulkAnalysis } from '../contexts/BulkAnalysisContext';
import { UserRole } from '../types';
import { reativacaoSchema, ReativacaoPayload } from '../src/schemas/reativacao';
import { 
  triggerReativacao, 
  getAutomationHistory, 
  AutomationHistoryItem,
  getReactivatedLeadsHistory,
  ReactivatedLeadHistoryItem
} from '../services/automationService';
import { listProfiles } from '../services/supabaseService';
import { canUserExecuteAutomation, startAutomationWithQueue } from '../services/automationQueueService';
import { checkAndUpdateCompletedReactivations, startAutomationPolling } from '../services/n8nPollingService';

// Tipo para o estado do formulário (permite valores temporários durante digitação)
type FormData = Omit<ReativacaoPayload, 'numero_negocio'> & {
  numero_negocio: number | string;
};
import { LoadingSpinner } from './ui/Feedback';
import { FormSelect, FormInput } from './ui/Form';
import { CheckCircleIcon, ExclamationTriangleIcon, BoltIcon, TrashIcon, ClockIcon, EyeIcon } from './ui/icons';

const ReativacaoLeadsPage: React.FC = () => {
  const { user } = useUser();
  const { currentAnalysis, isRunning, startAnalysis, stopAnalysis, clearAnalysis } = useBulkAnalysis();
  
  // Helper function para verificar se um objeto existe e tem propriedades
  const safeGet = (obj: any, path: string, defaultValue: any = null) => {
    try {
      return path.split('.').reduce((current, key) => current && current[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [sdrs, setSdrs] = useState<Array<{ name: string; id: string }>>([]);
  const [isLoadingSdrs, setIsLoadingSdrs] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    filtro: "Lista de reativação - Topo de funil",
    proprietario: "Andressa",
    cadencia: "Reativação - Sem Retorno",
    numero_negocio: 20,
  });
  
  // Estado para histórico
  const [history, setHistory] = useState<ReactivatedLeadHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Controla quais cards têm o "Ver resposta do N8N" aberto
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  // Verificar se o usuário tem permissão
  const isAdmin = user && (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin);
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-md text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-sm">Esta funcionalidade está disponível apenas para administradores.</p>
        </div>
      </div>
    );
  }

  // Função para obter nome completo do usuário baseado no email
  const getUserFullName = (email: string): string => {
    const userMap: Record<string, string> = {
      'geraldo@grupoggv.com': 'Geraldo Hisao',
      'geraldo@ggvinteligencia.com.br': 'Geraldo Hisao',
      'andressa@grupoggv.com': 'Andressa Santos',
      'camila@grupoggv.com': 'Camila Ataliba',
      'isabel@grupoggv.com': 'Isabel Pestilho',
      'loruama@grupoggv.com': 'Lô-Ruama Oliveira',
      'mariana@grupoggv.com': 'Mariana Costa',
    };
    
    return userMap[email.toLowerCase()] || email.split('@')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      // Preparar e validar dados
      const dataToValidate = {
        ...formData,
        numero_negocio: formData.numero_negocio === '' || formData.numero_negocio === null || formData.numero_negocio === undefined 
          ? 20 
          : typeof formData.numero_negocio === 'string' 
            ? parseInt(formData.numero_negocio) || 20
            : formData.numero_negocio
      };
      const validatedData = reativacaoSchema.parse(dataToValidate);
      
      // Log no debug panel
      if ((window as any).debugLog) {
        (window as any).debugLog("reativacao:submit", "info", "AUTOMATION", validatedData);
      }

      // ✅ VERIFICAR SE PODE EXECUTAR AUTOMAÇÃO
      console.log('🔍 QUEUE - Verificando permissão para:', validatedData.proprietario);
      const permission = await canUserExecuteAutomation(validatedData.proprietario);
      
      if (!permission.can_execute) {
        setResult({
          success: false,
          message: `❌ ${permission.message}`,
          data: { 
            blocked: true, 
            reason: permission.message,
            lastExecution: permission.last_execution,
            status: permission.status 
          }
        });
        return;
      }

      // ✅ INICIAR AUTOMAÇÃO COM CONTROLE DE FILA
      console.log('🚀 QUEUE - Iniciando automação controlada...');
      const automationStart = await startAutomationWithQueue(
        validatedData.proprietario,
        validatedData.filtro,
        validatedData.cadencia
      );

      if (!automationStart.success) {
        setResult({
          success: false,
          message: `❌ ${automationStart.message}`,
          data: { blocked: true, reason: automationStart.message }
        });
        return;
      }

      // 🚀 NOVO: Usar sistema de análise em massa persistente
      await startAnalysis({
        proprietario: validatedData.proprietario,
        filtro: validatedData.filtro,
        cadencia: validatedData.cadencia,
        numero_negocio: validatedData.numero_negocio
      });

      // ✅ FEEDBACK IMEDIATO - Mostrar que foi iniciado
      setResult({
        success: true,
        message: `🚀 Reativação de leads em massa iniciada para ${validatedData.proprietario}! Processando ${validatedData.numero_negocio} leads em background...`,
        data: { status: 'starting', immediate: true, real: true, persistent: true }
      });

      // Enviar para o backend (em background) - mantém compatibilidade
      triggerReativacao(validatedData).then(response => {
        console.log('📤 N8N - Resposta do backend:', response);
        
        // Log de sucesso
        if ((window as any).debugLog) {
          (window as any).debugLog("reativacao:success", "info", "AUTOMATION", response);
        }
      }).catch(error => {
        console.error('❌ N8N - Erro no backend:', error);
        
        // Log de erro
        if ((window as any).debugLog) {
          (window as any).debugLog("reativacao:error", "error", "AUTOMATION", error);
        }
      });

      // Recarregar histórico se estiver visível
      if (showHistory) {
        loadHistory();
      }

    } catch (error: any) {
      const errorMessage = error.message || "Falha ao acionar automação.";
      setResult({
        success: false,
        message: errorMessage,
        data: error
      });

      // Log de erro
      if ((window as any).debugLog) {
        (window as any).debugLog("reativacao:error", "error", "AUTOMATION", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para carregar SDRs da tabela profiles
  const loadSdrs = async () => {
    try {
      setIsLoadingSdrs(true);
      console.log('🔄 REATIVACAO PAGE - Carregando SDRs da tabela profiles...');
      
      const profiles = await listProfiles();
      console.log('📋 REATIVACAO PAGE - Perfis carregados:', profiles);
      
      // Filtrar apenas perfis que têm nome e extrair apenas o nome
      const sdrsList = profiles
        .filter(profile => profile.name && profile.name.trim() !== '')
        .map(profile => ({
          name: profile.name!,
          id: profile.id
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabeticamente
      
      console.log('✅ REATIVACAO PAGE - SDRs processados:', sdrsList);
      setSdrs(sdrsList);
      
      // Se não há SDRs carregados ainda, manter o valor padrão
      if (sdrsList.length > 0 && !sdrsList.find(sdr => sdr.name === formData.proprietario)) {
        // Se o proprietário atual não está na lista, usar o primeiro disponível
        setFormData(prev => ({ ...prev, proprietario: sdrsList[0].name as any }));
      }
      
    } catch (error: any) {
      console.error('❌ REATIVACAO PAGE - Erro ao carregar SDRs:', error);
      // Em caso de erro, manter lista vazia e usar fallback
      setSdrs([]);
    } finally {
      setIsLoadingSdrs(false);
    }
  };

  // Função para carregar histórico da nova tabela reactivated_leads
  const loadHistory = async (page: number = 1) => {
    try {
      setIsLoadingHistory(true);
      console.log('📊 REATIVACAO PAGE - Iniciando carregamento do histórico...', { page, showHistory });
      
      const response = await getReactivatedLeadsHistory(page, 10);
      
      console.log('✅ REATIVACAO PAGE - Histórico carregado:', {
        dataLength: response.data?.length,
        pagination: response.pagination,
        firstItem: response.data?.[0]
      });
      
      if (response.data && response.data.length > 0) {
        console.log('📊 REATIVACAO PAGE - Dados encontrados, atualizando state...');
        setHistory(response.data);
        setTotalPages(response.pagination.pages);
        setCurrentPage(page);
      } else {
        console.log('⚠️ REATIVACAO PAGE - Nenhum dado encontrado!');
        setHistory([]);
        setTotalPages(0);
      }
      
    } catch (error: any) {
      console.error('❌ REATIVACAO PAGE - Erro ao carregar histórico:', error);
      setResult({
        success: false,
        message: `❌ Erro ao carregar histórico: ${error.message}`,
      });
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Carregar SDRs quando o componente for montado
  useEffect(() => {
    loadSdrs();
  }, []);

  // Carregar histórico quando mostrar
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  // Auto-refresh do histórico + polling do N8N
  useEffect(() => {
    if (!showHistory || !history) return;

    const hasActive = history.some(h => (
      h && h.status && (
        h.status === 'processing' ||
        h.status === 'pending'
      )
    ));

    // Se há registros ativos, fazer polling mais agressivo
    if (hasActive) {
      console.log('🔄 REATIVACAO PAGE - Registros ativos detectados, iniciando polling do N8N...');
      
      // Verificar N8N a cada 15 segundos quando há pendentes
      const pollingInterval = setInterval(async () => {
        try {
          const result = await checkAndUpdateCompletedReactivations();
          if (result.updated > 0) {
            console.log('🎉 REATIVACAO PAGE - Atualizações do N8N:', result.updated);
            loadHistory(currentPage); // Recarregar histórico
          }
        } catch (error) {
          console.warn('⚠️ REATIVACAO PAGE - Erro no polling:', error);
        }
      }, 15000);

      return () => {
        clearInterval(pollingInterval);
      };
    } else {
      // Refresh normal menos frequente se não há ativos
      const interval = setInterval(() => {
        loadHistory(currentPage);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [showHistory, history, currentPage]);

  // Função para formatar data (mantém horário UTC como no banco)
  const formatDate = (dateString: string) => {
    // Validar se dateString existe e não é vazio
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === null) {
      return '—';
    }
    
    try {
      console.log('🕐 FORMAT DATE - Input:', dateString, typeof dateString);
      
      // Tentar diferentes formatos de parsing
      let utcDate: Date;
      
      if (dateString.includes('T')) {
        // ISO format: 2025-09-29T19:10:07.856268+00:00
        utcDate = new Date(dateString);
      } else if (dateString.includes(' ')) {
        // Postgres format: 2025-09-29 19:10:07+00
        utcDate = new Date(dateString.replace(' ', 'T') + (dateString.includes('+') ? '' : 'Z'));
      } else {
        // Fallback
        utcDate = new Date(dateString);
      }
      
      // Verificar se a data é válida
      if (isNaN(utcDate.getTime())) {
        console.warn('⚠️ Data inválida após parsing:', dateString, utcDate);
        return '—';
      }
      
      // Extrair componentes diretamente
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const hour = String(utcDate.getUTCHours()).padStart(2, '0');
      const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
      
      const formatted = `${day}/${month}/${year}, ${hour}:${minute} UTC`;
      console.log('🕐 FORMAT DATE - Output:', formatted);
      
      return formatted;
    } catch (error) {
      // Fallback para caso de erro
      console.warn('⚠️ Erro ao formatar data:', dateString, error);
      return '—';
    }
  };

  // Controlar toggle do details por item
  const handleDetailsToggle = (id: string) => (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const open = (e.currentTarget as HTMLDetailsElement).open;
    setOpenDetails(prev => ({ ...prev, [id]: open }));
  };

  // Função para obter status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      connecting: { color: 'bg-yellow-100 text-yellow-800', text: 'Conectando' },
      starting: { color: 'bg-blue-100 text-blue-800', text: 'Iniciando' },
      started: { color: 'bg-blue-100 text-blue-800', text: 'Iniciado' },
      running: { color: 'bg-blue-100 text-blue-800', text: 'Executando' },
      fetching: { color: 'bg-purple-100 text-purple-800', text: 'Buscando' },
      processing: { color: 'bg-indigo-100 text-indigo-800', text: 'Processando' },
      finalizing: { color: 'bg-orange-100 text-orange-800', text: 'Finalizando' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Concluído' },
      success: { color: 'bg-green-100 text-green-800', text: 'Sucesso' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Falhou' },
      error: { color: 'bg-red-100 text-red-800', text: 'Erro' }
    } as const;
    const config = (statusConfig as any)[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Determina o status exibido considerando salvaguardas (ex.: N8N retornou failed mas processou leads)
  const getDisplayStatus = (item: AutomationHistoryItem): string => {
    try {
      const rawStatus = (item?.status || '').toString();
      const n8nResponse: any = (item as any)?.n8nResponse || {};
      const leadsProcessed = Number(
        safeGet(n8nResponse, 'leadsProcessed', safeGet(n8nResponse, 'data.leadsProcessed', 0))
      ) || 0;
      const errors = safeGet(n8nResponse, 'data.errors', null);
      const hasErrors = Array.isArray(errors) ? errors.length > 0 : Boolean(errors);

      // Se status já está como sucesso/concluído, mantemos
      if (rawStatus === 'success' || rawStatus === 'completed') return 'completed';

      // Salvaguarda: se retornou failed, mas processou 1+ leads e não há erros, considerar concluído
      if (rawStatus === 'failed' && leadsProcessed > 0 && !hasErrors) {
        return 'completed';
      }

      return rawStatus || 'pending';
    } catch {
      return item?.status || 'pending';
    }
  };

  // Função para renderizar progresso
  const renderProgress = (item: AutomationHistoryItem) => {
    // Verificação de segurança para n8nResponse
    const n8nResponse = item.n8nResponse as any;
    
    // Verificar se deve mostrar progresso
    const shouldShowProgress = (n8nResponse && n8nResponse.progress) || 
      item.status === 'processing' || 
      item.status === 'starting' || 
      item.status === 'finalizing' ||
      item.status === 'connecting' ||
      item.status === 'fetching';
    
    if (!shouldShowProgress) {
      return null;
    }

    const progress = safeGet(n8nResponse, 'progress', 0);
    const message = safeGet(n8nResponse, 'message', 'Processando...');
    const details = safeGet(n8nResponse, 'details', '');
    const leadsProcessed = safeGet(n8nResponse, 'leadsProcessed', 0);
    const totalLeads = safeGet(n8nResponse, 'totalLeads', item.numeroNegocio);
    const status = safeGet(n8nResponse, 'status', item.status);

    // Configuração de cores e ícones por status
    const statusConfig = {
      connecting: {
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        barColor: 'bg-yellow-500',
        bgColor: 'bg-yellow-200',
        icon: '🔌',
        label: 'Conectando'
      },
      starting: {
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        barColor: 'bg-blue-500',
        bgColor: 'bg-blue-200',
        icon: '🚀',
        label: 'Iniciando'
      },
      fetching: {
        color: 'bg-purple-50 border-purple-200 text-purple-800',
        barColor: 'bg-purple-500',
        bgColor: 'bg-purple-200',
        icon: '🔍',
        label: 'Buscando'
      },
      processing: {
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        barColor: 'bg-indigo-500',
        bgColor: 'bg-indigo-200',
        icon: '⚙️',
        label: 'Processando'
      },
      finalizing: {
        color: 'bg-orange-50 border-orange-200 text-orange-800',
        barColor: 'bg-orange-500',
        bgColor: 'bg-orange-200',
        icon: '📝',
        label: 'Finalizando'
      },
      completed: {
        color: 'bg-green-50 border-green-200 text-green-800',
        barColor: 'bg-green-500',
        bgColor: 'bg-green-200',
        icon: '✅',
        label: 'Concluído'
      },
      success: {
        color: 'bg-green-50 border-green-200 text-green-800',
        barColor: 'bg-green-500',
        bgColor: 'bg-green-200',
        icon: '✅',
        label: 'Sucesso'
      }
    } as const;

    const config = (statusConfig as any)[status] || statusConfig.processing;

    return (
      <div className={`mt-3 p-4 ${config.color} border rounded-lg`}>
        {/* Header com ícone e status */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">{config.icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{message}</span>
              <span className="text-sm font-mono">{progress}%</span>
            </div>
            {details && (
              <p className="text-sm opacity-80 mt-1">{details}</p>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-white/50 rounded-full h-3 mb-3">
          <div 
            className={`${config.barColor} h-3 rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Informações detalhadas */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
              {leadsProcessed}/{totalLeads} leads processados
            </span>
            {status !== 'completed' && status !== 'success' && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-pulse"></span>
                {config.label}
              </span>
            )}
          </div>
          
          {/* Tempo estimado */}
          {status !== 'completed' && status !== 'success' && (
            <span className="text-xs opacity-70">
              ~{Math.max(0, Math.ceil((100 - progress) / 10))}s restantes
            </span>
          )}
        </div>

        {/* Indicador de atividade */}
        {status !== 'completed' && status !== 'success' && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>Processando em tempo real...</span>
          </div>
        )}
      </div>
    );
  };

  const handleManualComplete = async (item: AutomationHistoryItem) => {
    if (!window.confirm(`Tem certeza que o workflow para ${item.proprietario} foi finalizado no N8N?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/automation/complete/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Workflow concluído manualmente para ${item.proprietario}`,
          leadsProcessed: item.numeroNegocio
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Workflow marcado como concluído:', result);
        loadHistory(); // Recarregar histórico
        alert('Workflow marcado como concluído com sucesso!');
      } else {
        throw new Error('Falha ao marcar como concluído');
      }
    } catch (error) {
      console.error('Erro ao marcar como concluído:', error);
      alert('Erro ao marcar workflow como concluído.');
    }
  };

  const handleResetHistory = async () => {
    if (window.confirm('Tem certeza que deseja reinicializar o histórico? Isso removerá todos os registros de automação anteriores.')) {
      try {
        const response = await fetch('/automation/history/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔄 Histórico reinicializado:', result);
          loadHistory(); // Recarregar histórico
          alert('Histórico reinicializado com sucesso!');
        } else {
          throw new Error('Falha ao reinicializar histórico');
        }
      } catch (error) {
        console.error('Erro ao reinicializar histórico:', error);
        alert('Erro ao reinicializar histórico.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reativação de Leads (N8N)</h1>
              <p className="text-slate-600 mt-1">
                Acione automações de reativação de leads através do N8N
              </p>
            </div>
            
            {/* Indicador de análise em andamento */}
            {isRunning && currentAnalysis && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800">
                  Análise em andamento: {currentAnalysis.progress}%
                </span>
                <button
                  onClick={stopAnalysis}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Parar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <FormSelect
            id="filtro"
            name="filtro"
            label="Filtro de Leads"
            value={formData.filtro}
            onChange={(e) => handleInputChange('filtro', e.target.value)}
            required
          >
              <option value="Lista de reativação - Topo de funil - NO SHOW">
                Lista de reativação - Topo de funil - NO SHOW
              </option>
              <option value="Lista de reativação - Topo de funil">
                Lista de reativação - Topo de funil
              </option>
              <option value="Lista de reativação - Fundo de funil">
                Lista de reativação - Fundo de funil
              </option>
            </FormSelect>

          <FormSelect
            id="proprietario"
            name="proprietario"
            label="Proprietário (SDR)"
            value={formData.proprietario}
            onChange={(e) => handleInputChange('proprietario', e.target.value)}
            required
            disabled={isLoadingSdrs}
          >
              {isLoadingSdrs ? (
                <option value="">Carregando SDRs...</option>
              ) : sdrs.length === 0 ? (
                <option value="">Nenhum SDR encontrado</option>
              ) : (
                sdrs.map((sdr) => (
                  <option key={sdr.id} value={sdr.name}>
                    {sdr.name}
                  </option>
                ))
              )}
            </FormSelect>

          <FormSelect
            id="cadencia"
            name="cadencia"
            label="Cadência"
            value={formData.cadencia}
            onChange={(e) => handleInputChange('cadencia', e.target.value)}
            required
          >
              <option value="Reativação - Sem Retorno">Reativação - Sem Retorno</option>
            </FormSelect>

          <FormInput
            id="numero_negocio"
            name="numero_negocio"
            label="Número de Negócios"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={formData.numero_negocio}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                handleInputChange('numero_negocio', '');
              } else {
                const numValue = parseInt(value);
                handleInputChange('numero_negocio', isNaN(numValue) ? 1 : Math.max(1, numValue));
              }
            }}
            required
          />
            <p className="text-xs text-slate-500 mt-1">
              Quantidade de leads/negócios para processar (1-1000)
            </p>

          {/* Result Alert */}
          {result && (
            <div className={`p-6 rounded-2xl border-2 ${
              result.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800 shadow-lg' 
                : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-800 shadow-lg'
            }`}>
              <div className="flex items-start gap-4">
                {result.success ? (
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-lg font-semibold mb-2">{result.message}</p>
                  {result.data && (
                    <details className="mt-3">
                      <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800 font-medium bg-slate-100 px-3 py-2 rounded-lg inline-block hover:bg-slate-200 transition-colors">
                        🔍 Ver detalhes técnicos
                      </summary>
                      <pre className="text-xs mt-3 bg-slate-100 p-4 rounded-lg overflow-auto border border-slate-200">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || isRunning}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span className="text-lg">Iniciando análise...</span>
                </>
              ) : isRunning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-lg">Análise em andamento...</span>
                </>
              ) : (
                <>
                  <BoltIcon className="w-6 h-6" />
                  <span className="text-lg">🚀 Ativar Automação</span>
                </>
              )}
            </button>
            
            {/* Aviso sobre análise em andamento */}
            {isRunning && currentAnalysis && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-800">
                    <strong>Análise em background:</strong> {currentAnalysis.message}
                  </span>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Você pode navegar para outras páginas - a análise continuará rodando.
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Info Panel */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-xl">ℹ️</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-900">Informações Importantes</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-sm text-blue-800">Envia dados para o webhook do N8N em produção</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-sm text-blue-800">Logs registrados no Debug Panel (AUTOMATION)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-sm text-blue-800">Acesso restrito a administradores</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-sm text-blue-800">Modo teste simula sem envio real</span>
          </div>
        </div>
      </div>

      {/* Histórico de Automações */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Histórico de Automações</h2>
              <p className="text-slate-600 mt-1">Registro de todas as automações executadas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {showHistory ? (
                  <>
                    <EyeIcon className="w-4 h-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ClockIcon className="w-4 h-4" />
                    Ver Histórico
                  </>
                )}
              </button>
              
              {showHistory && (
                <>
                  <button
                    onClick={() => {
                      console.log('🔄 REATIVACAO PAGE - Forçando reload do histórico...');
                      loadHistory(1);
                    }}
                    className="flex items-center gap-1 bg-green-100 text-green-700 font-semibold px-3 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    title="Recarregar histórico"
                  >
                    🔄
                  </button>
                  <button
                    onClick={handleResetHistory}
                    className="flex items-center gap-2 bg-orange-100 text-orange-700 font-semibold px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                    title="Reinicializar histórico com dados de teste"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="p-6">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ClockIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma automação executada ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        <div>
                          <p className="font-medium text-slate-900">{item.filter}</p>
                          <p className="text-sm text-slate-600">
                            SDR: {item.sdr} • {item.count_leads} leads
                            {item.status === 'pending' && item.n8n_data?.initial_leads_requested && (
                              <span className="text-blue-600"> (solicitados: {item.n8n_data.initial_leads_requested})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {item.status === 'completed' && item.updated_at 
                            ? formatDate(item.updated_at) + ' (Concluído)'
                            : formatDate(item.created_at) + ' (Iniciado)'
                          }
                        </p>
                        <p className="text-xs text-slate-400">Reativação automática</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Cadência:</span>
                        <span className="ml-2 text-slate-900">{item.cadence || 'N/A'}</span>
                      </div>

                    </div>

                    {item.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Erro:</strong> {item.error_message}
                        </p>
                      </div>
                    )}

                    {/* Status visual baseado no status da tabela */}
                    {item.status === 'processing' && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <p className="text-sm text-blue-800 font-medium">🔄 Processando leads no N8N</p>
                        </div>
                      </div>
                    )}

                    {/* Dados do N8N se disponíveis */}
                    {item.n8n_data && Object.keys(item.n8n_data).length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-sm text-slate-700">
                          <strong>Dados do N8N:</strong>
                        </div>
                        
                        {/* Detalhes técnicos expandíveis */}
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                            Ver detalhes técnicos
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                            {JSON.stringify(item.n8n_data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => loadHistory(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-slate-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => loadHistory(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReativacaoLeadsPage;
