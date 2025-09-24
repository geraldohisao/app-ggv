import React, { useState, useEffect } from 'react';
import { 
  getRecentEmailLogs, 
  getEmailLogStats, 
  getEmailLogErrors, 
  getEmailLogsByDeal,
  getEmailLogSummary,
  EmailLogData,
  EmailLogStats,
  EmailLogError
} from '../../services/emailLogService';

// 📧 INTERFACE DE LOGS DE E-MAIL - DIAGNÓSTICO GGV
// Página para visualizar e gerenciar logs de envio de e-mail

export const EmailLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogData[]>([]);
  const [stats, setStats] = useState<EmailLogStats[]>([]);
  const [errors, setErrors] = useState<EmailLogError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<string>('');
  const [dealLogs, setDealLogs] = useState<EmailLogData[]>([]);
  const [dealSummary, setDealSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'stats' | 'errors' | 'deal'>('recent');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [recentLogs, statsData, errorsData] = await Promise.all([
        getRecentEmailLogs(100),
        getEmailLogStats(30),
        getEmailLogErrors()
      ]);

      setLogs(recentLogs);
      setStats(statsData);
      setErrors(errorsData);
    } catch (err) {
      console.error('❌ EMAIL_LOGS - Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const loadDealLogs = async (dealId: string) => {
    if (!dealId.trim()) return;
    
    try {
      setLoading(true);
      const [logs, summary] = await Promise.all([
        getEmailLogsByDeal(dealId),
        getEmailLogSummary(dealId)
      ]);
      
      setDealLogs(logs);
      setDealSummary(summary);
      setActiveTab('deal');
    } catch (err) {
      console.error('❌ EMAIL_LOGS - Erro ao carregar logs do deal:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs do deal');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'sending': return 'text-blue-600 bg-blue-100';
      case 'retry': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'sending': return '📤';
      case 'retry': return '🔄';
      default: return '❓';
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando logs de e-mail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📧 Logs de E-mail</h1>
          <p className="mt-2 text-gray-600">
            Sistema de rastreamento de envios de e-mail do diagnóstico
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'recent', label: 'Logs Recentes', count: logs.length },
              { id: 'stats', label: 'Estatísticas', count: stats.length },
              { id: 'errors', label: 'Erros', count: errors.length },
              { id: 'deal', label: 'Por Deal', count: dealLogs.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Logs Tab */}
        {activeTab === 'recent' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📧 Logs Recentes ({logs.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destinatário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deal ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tentativas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Tentativa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Erro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.dealId + log.recipientEmail + log.lastAttemptAt}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {getStatusIcon(log.status)} {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.recipientEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.dealId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.attempts || 0}/{log.maxAttempts || 3}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.lastAttemptAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.errorMessage ? (
                            <span className="text-red-600" title={log.errorMessage}>
                              {log.errorMessage.substring(0, 50)}...
                            </span>
                          ) : (
                            <span className="text-green-600">✅</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📊 Estatísticas dos Últimos 30 Dias
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => (
                  <div key={stat.date} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900">{stat.date}</h4>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-sm font-medium">{stat.totalEmails}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Sucessos:</span>
                        <span className="text-sm font-medium text-green-600">{stat.successfulEmails}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Falhas:</span>
                        <span className="text-sm font-medium text-red-600">{stat.failedEmails}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Taxa de Sucesso:</span>
                        <span className="text-sm font-medium text-blue-600">{stat.successRatePercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tentativas Médias:</span>
                        <span className="text-sm font-medium">{stat.avgAttempts.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🚨 Erros Mais Frequentes
              </h3>
              
              <div className="space-y-4">
                {errors.map((error, index) => (
                  <div key={index} className="border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800">
                          {error.errorCode}
                        </h4>
                        <p className="mt-1 text-sm text-red-600">
                          {error.errorMessage}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Afetou {error.affectedEmails.length} e-mails
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-lg font-bold text-red-600">
                          {error.errorCount}
                        </span>
                        <p className="text-xs text-gray-500">
                          ocorrências
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deal Search Tab */}
        {activeTab === 'deal' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🔍 Buscar por Deal ID
              </h3>
              
              <div className="mb-6">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={selectedDeal}
                    onChange={(e) => setSelectedDeal(e.target.value)}
                    placeholder="Digite o Deal ID..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <button
                    onClick={() => loadDealLogs(selectedDeal)}
                    disabled={!selectedDeal.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {dealSummary && (
                <div className="mb-6 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-blue-900 mb-2">
                    📊 Resumo do Deal: {selectedDeal}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{dealSummary.totalAttempts}</div>
                      <div className="text-sm text-gray-600">Total de Tentativas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{dealSummary.successfulEmails}</div>
                      <div className="text-sm text-gray-600">Sucessos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{dealSummary.failedEmails}</div>
                      <div className="text-sm text-gray-600">Falhas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {dealSummary.lastAttempt ? new Date(dealSummary.lastAttempt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Última Tentativa</div>
                    </div>
                  </div>
                </div>
              )}

              {dealLogs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destinatário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tentativas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Erro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dealLogs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                              {getStatusIcon(log.status)} {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.recipientEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.attempts || 0}/{log.maxAttempts || 3}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.lastAttemptAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.errorMessage ? (
                              <span className="text-red-600" title={log.errorMessage}>
                                {log.errorMessage.substring(0, 50)}...
                              </span>
                            ) : (
                              <span className="text-green-600">✅</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            🔄 Atualizar Dados
          </button>
        </div>
      </div>
    </div>
  );
};
