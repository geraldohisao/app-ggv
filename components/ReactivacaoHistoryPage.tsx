import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/DirectUserContext';
import { UserRole } from '../types';
import { 
  getReactivatedLeadsHistory, 
  ReactivatedLeadHistoryItem 
} from '../services/automationService';
import { LoadingSpinner } from './ui/Feedback';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon
} from './ui/icons';

const ReactivacaoHistoryPage: React.FC = () => {
  const { user } = useUser();
  
  // Estados
  const [history, setHistory] = useState<ReactivatedLeadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Filtros
  const [filters, setFilters] = useState({
    sdr: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Detalhes expandidos
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);

  // Verificar permissões
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role as UserRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Negado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Você precisa ser ADMIN ou SUPER_ADMIN para acessar o histórico de reativação.
          </p>
        </div>
      </div>
    );
  }

  // Carregar histórico
  const loadHistory = async (page: number = 1, resetData: boolean = false) => {
    try {
      if (resetData) {
        setLoading(true);
        setError(null);
      }
      
      const result = await getReactivatedLeadsHistory(
        page,
        pagination.limit,
        filters.sdr || undefined,
        filters.status || undefined
      );
      
      setHistory(result.data);
      setPagination(result.pagination);
      
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      setError(err.message || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadHistory(1, true);
  }, [filters]);

  // Função para recarregar
  const handleRefresh = () => {
    loadHistory(pagination.page, true);
  };

  // Função para aplicar filtros
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setFilters({ sdr: '', status: '' });
  };

  // Função para expandir/colapsar detalhes
  const toggleExpanded = (recordId: number) => {
    setExpandedRecord(expandedRecord === recordId ? null : recordId);
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'processing':
        return 'Processando';
      case 'pending':
      default:
        return 'Pendente';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 **Histórico de Reativação**
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Acompanhe todas as execuções de reativação de leads com dados do N8N
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filtros
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SDR
                </label>
                <select
                  value={filters.sdr}
                  onChange={(e) => handleFilterChange('sdr', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Todos os SDRs</option>
                  <option value="Andressa">Andressa</option>
                  <option value="Camila Ataliba">Camila Ataliba</option>
                  <option value="Isabel Pestilho">Isabel Pestilho</option>
                  <option value="Lô-Ruama Oliveira">Lô-Ruama Oliveira</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Processando</option>
                  <option value="completed">Concluído</option>
                  <option value="failed">Falhou</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Carregando histórico...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao Carregar</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Tentar Novamente
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum Registro</h3>
              <p className="mt-1 text-sm text-gray-500">
                Não há registros de reativação para os filtros selecionados.
              </p>
            </div>
          ) : (
            <>
              {/* Lista de registros */}
              <ul className="divide-y divide-gray-200">
                {history.map((record) => (
                  <li key={record.id} className="hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {record.sdr}
                              </p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusText(record.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {record.filter}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {record.count_leads} leads
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(record.created_at)}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => toggleExpanded(record.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Detalhes expandidos */}
                      {expandedRecord === record.id && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                📋 **Informações Básicas**
                              </h4>
                              <dl className="space-y-1">
                                <div className="flex justify-between">
                                  <dt className="text-sm text-gray-500">Cadência:</dt>
                                  <dd className="text-sm text-gray-900">{record.cadence || 'N/A'}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-sm text-gray-500">Workflow ID:</dt>
                                  <dd className="text-sm text-gray-900 font-mono">{record.workflow_id || 'N/A'}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-sm text-gray-500">Execution ID:</dt>
                                  <dd className="text-sm text-gray-900 font-mono">{record.execution_id || 'N/A'}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-sm text-gray-500">Atualizado:</dt>
                                  <dd className="text-sm text-gray-900">{formatDate(record.updated_at)}</dd>
                                </div>
                              </dl>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                🔧 **Dados do N8N**
                              </h4>
                              {record.error_message && (
                                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-sm text-red-700">
                                    <strong>Erro:</strong> {record.error_message}
                                  </p>
                                </div>
                              )}
                              <div className="bg-gray-50 rounded p-2">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {JSON.stringify(record.n8n_data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {/* Paginação */}
              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => loadHistory(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => loadHistory(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próximo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando{' '}
                        <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                        {' '}até{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>
                        {' '}de{' '}
                        <span className="font-medium">{pagination.total}</span>
                        {' '}resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => loadHistory(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => loadHistory(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => loadHistory(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Próximo
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactivacaoHistoryPage;
