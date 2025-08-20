import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/DirectUserContext';
import { UserRole } from '../types';
import { reativacaoSchema, ReativacaoPayload } from '../src/schemas/reativacao';
import { triggerReativacao, getAutomationHistory, AutomationHistoryItem } from '../services/automationService';

// Tipo para o estado do formulário (permite valores temporários durante digitação)
type FormData = Omit<ReativacaoPayload, 'numero_negocio'> & {
  numero_negocio: number | string;
};
import { LoadingSpinner } from './ui/Feedback';
import { FormSelect, FormInput } from './ui/Form';
import { CheckCircleIcon, ExclamationTriangleIcon, BoltIcon, TrashIcon, ClockIcon, EyeIcon } from './ui/icons';

const ReativacaoLeadsPage: React.FC = () => {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    filtro: "Lista de reativação - Topo de funil",
    proprietario: "Andressa",
    cadencia: "Reativação - Sem Retorno",
    numero_negocio: 20,
  });
  
  // Estado para histórico
  const [history, setHistory] = useState<AutomationHistoryItem[]>([]);
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

      // Enviar para o backend
      const response = await triggerReativacao(validatedData);
      
      // Verificar se houve erro no N8N
      if (response.status === 'error' || response.httpStatus === 500) {
        setResult({
          success: false,
          message: `⚠️ Automação iniciada mas com problema no N8N: ${response.message || 'Erro interno do workflow'}. O processamento pode estar em andamento mesmo assim.`,
          data: response
        });
      } else {
        setResult({
          success: true,
          message: "Automação solicitada com sucesso.",
          data: response
        });
      }

      // Recarregar histórico se estiver visível
      if (showHistory) {
        loadHistory();
      }

      // Log de sucesso
      if ((window as any).debugLog) {
        (window as any).debugLog("reativacao:success", "info", "AUTOMATION", response);
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

  const handleClear = () => {
    setFormData({
      filtro: "Lista de reativação - Topo de funil",
      proprietario: "Andressa",
      cadencia: "Reativação - Sem Retorno",
      numero_negocio: 20,
    });
    setResult(null);
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para carregar histórico (faz merge para reduzir flicker)
  const loadHistory = async (page: number = 1) => {
    try {
      setIsLoadingHistory(true);
      const response = await getAutomationHistory(page, 10);

      setHistory(prev => {
        // Mantém a ordem vinda do servidor, mas reaproveita objetos já existentes quando possível
        const prevById = new Map(prev.map(p => [p.id, p] as const));
        return response.data.map(item => {
          const existing = prevById.get(item.id);
          if (!existing) return item;
          // Se não houve mudança relevante, preserve a mesma referência
          const unchanged =
            existing.status === item.status &&
            existing.updatedAt === item.updatedAt &&
            JSON.stringify(existing.n8nResponse) === JSON.stringify(item.n8nResponse);
          return unchanged ? existing : item;
        });
      });

      setTotalPages(response.pagination.pages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Carregar histórico quando mostrar
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  // Auto-refresh do histórico com frequência muito reduzida para evitar flicker
  useEffect(() => {
    if (!showHistory) return;

    const hasActive = history.some(h => (
      h.status === 'processing' ||
      h.status === 'starting' ||
      h.status === 'finalizing' ||
      h.status === 'connecting' ||
      h.status === 'fetching'
    ));

    // Frequência muito reduzida: 10s para ativos, 30s para inativos
    const intervalMs = hasActive ? 10000 : 30000;
    const interval = setInterval(() => {
      loadHistory(currentPage);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [showHistory, history, currentPage]);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      fetching: { color: 'bg-purple-100 text-purple-800', text: 'Buscando' },
      processing: { color: 'bg-indigo-100 text-indigo-800', text: 'Processando' },
      finalizing: { color: 'bg-orange-100 text-orange-800', text: 'Finalizando' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Concluído' },
      success: { color: 'bg-green-100 text-green-800', text: 'Sucesso' },
      error: { color: 'bg-red-100 text-red-800', text: 'Erro' }
    } as const;
    const config = (statusConfig as any)[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Função para renderizar progresso
  const renderProgress = (item: AutomationHistoryItem) => {
    const n8nResponse = item.n8nResponse as any;
    
    // Verificar se deve mostrar progresso
    const shouldShowProgress = n8nResponse?.progress || 
      item.status === 'processing' || 
      item.status === 'starting' || 
      item.status === 'finalizing' ||
      item.status === 'connecting' ||
      item.status === 'fetching';
    
    if (!shouldShowProgress) {
      return null;
    }

    const progress = n8nResponse?.progress || 0;
    const message = n8nResponse?.message || 'Processando...';
    const details = n8nResponse?.details || '';
    const leadsProcessed = n8nResponse?.leadsProcessed || 0;
    const totalLeads = n8nResponse?.totalLeads || item.numeroNegocio;
    const status = n8nResponse?.status || item.status;

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
      const workflowId = item.n8nResponse?.workflowId;
      if (!workflowId) {
        alert('Workflow ID não encontrado');
        return;
      }
      
      const response = await fetch(`/automation/complete/${workflowId}`, {
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
          <h1 className="text-2xl font-bold text-slate-900">Reativação de Leads (N8N)</h1>
          <p className="text-slate-600 mt-1">
            Acione automações de reativação de leads através do N8N
          </p>
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
          >
              <option value="Andressa">Andressa</option>
              <option value="Camila Ataliba">Camila Ataliba</option>
              <option value="Isabel Pestilho">Isabel Pestilho</option>
              <option value="Lô-Ruama Oliveira">Lô-Ruama Oliveira</option>
              <option value="Mariana">Mariana</option>
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
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-3">
                {result.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{result.message}</p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer hover:underline">
                        Ver detalhes técnicos
                      </summary>
                      <pre className="text-xs mt-2 bg-black/5 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <LoadingSpinner />
              ) : (
                <BoltIcon className="w-5 h-5" />
              )}
              {isSubmitting ? 'Ativando...' : 'Ativar Automação'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 font-semibold px-6 py-3 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
              Limpar
            </button>
          </div>
        </form>
      </div>

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Informações</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Esta funcionalidade envia dados para o webhook do N8N em produção</li>
          <li>• Os logs são registrados no Debug Panel (AUTOMATION)</li>
          <li>• Apenas administradores têm acesso a esta funcionalidade</li>
          <li>• Em modo teste, a automação é simulada sem envio real</li>
        </ul>
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
                <button
                  onClick={handleResetHistory}
                  className="flex items-center gap-2 bg-orange-100 text-orange-700 font-semibold px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                  title="Reinicializar histórico com dados de teste"
                >
                  <TrashIcon className="w-4 h-4" />
                  Reset
                </button>
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
                          <p className="font-medium text-slate-900">{item.filtro}</p>
                          <p className="text-sm text-slate-600">
                            SDR: {item.proprietario} • {item.numeroNegocio} leads
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                        <p className="text-xs text-slate-400">{item.userEmail}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Cadência:</span>
                        <span className="ml-2 text-slate-900">{item.cadencia}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Executado por:</span>
                        <span className="ml-2 text-slate-900">{getUserFullName(item.userEmail)}</span>
                      </div>
                    </div>

                    {item.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Erro:</strong> {item.errorMessage}
                        </p>
                      </div>
                    )}

                    {/* Progresso em tempo real */}
                    {renderProgress(item)}

                    {/* Botão para marcar como concluído manualmente */}
                    {item.status !== 'completed' && item.status !== 'error' && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-800 font-medium">Workflow finalizado no N8N?</p>
                            <p className="text-xs text-blue-600">Se o N8N já terminou, clique para marcar como concluído</p>
                          </div>
                          <button
                            onClick={() => handleManualComplete(item)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Marcar Concluído
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status visual direto - similar ao print */}
                    {item.n8nResponse && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-sm text-slate-700">
                          <strong>Status N8N:</strong>
                        </div>
                        <div className="mt-2 font-mono text-xs bg-white p-2 rounded border">
                          {item.status === 'success' || item.status === 'completed' ? (
                            <div className="text-green-600">
                              ✅ Workflow executado com sucesso
                            </div>
                          ) : item.status === 'processing' || item.status === 'starting' || item.status === 'finalizing' || item.status === 'connecting' || item.status === 'fetching' ? (
                            <div className="text-blue-600">
                              🔄 Workflow em execução...
                            </div>
                          ) : item.status === 'error' ? (
                            <div className="text-red-600">
                              ❌ Erro na execução do workflow
                            </div>
                          ) : (
                            <div className="text-yellow-600">
                              ⏳ Workflow pendente
                            </div>
                          )}
                        </div>
                        
                        {/* Mensagem específica do N8N */}
                        {item.n8nResponse.message && (
                          <div className="mt-2 text-xs text-slate-600">
                            <strong>Resposta:</strong> {item.n8nResponse.message}
                          </div>
                        )}
                        
                        {/* Detalhes técnicos expandíveis */}
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                            Ver detalhes técnicos
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                            {JSON.stringify(item.n8nResponse, null, 2)}
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
