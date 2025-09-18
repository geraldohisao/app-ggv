import React, { useState, useEffect } from 'react';
import { syncSectorsToVectorDatabase, checkSectorsSyncStatus } from '../../services/sectorKnowledgeService';

interface SectorSyncPanelProps {
    onClose?: () => void;
}

export const SectorSyncPanel: React.FC<SectorSyncPanelProps> = ({ onClose }) => {
    const [syncStatus, setSyncStatus] = useState<{ synced: boolean; count: number }>({ synced: false, count: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState('');

    const checkStatus = async () => {
        setIsLoading(true);
        try {
            const status = await checkSectorsSyncStatus();
            setSyncStatus(status);
            if (status.synced) {
                setMessage(`✅ ${status.count} setores sincronizados no banco vetorial`);
            } else {
                setMessage('⚠️ Setores não sincronizados com o banco vetorial');
            }
        } catch (error) {
            setMessage(`❌ Erro ao verificar status: ${(error as any)?.message || error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setMessage('🔄 Sincronizando setores...');
        
        try {
            const result = await syncSectorsToVectorDatabase();
            
            if (result.success) {
                setMessage(`✅ ${result.message}`);
                await checkStatus(); // Atualizar status
            } else {
                setMessage(`❌ ${result.message}`);
            }
        } catch (error) {
            setMessage(`❌ Erro na sincronização: ${(error as any)?.message || error}`);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Sincronização de Setores - Banco Vetorial</h2>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Status Atual */}
                <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Status Atual</h3>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-slate-600">Verificando...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${syncStatus.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-slate-700">{message}</span>
                        </div>
                    )}
                </div>

                {/* Explicação */}
                <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">💡 Como Funciona</h3>
                    <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Os setores de atuação são convertidos em documentos de conhecimento</li>
                        <li>• Cada setor inclui: características, tendências, desafios, fatores de sucesso</li>
                        <li>• O Assistente IA usa essas informações para dar respostas mais contextualizadas</li>
                        <li>• A sincronização é automática, mas pode ser feita manualmente aqui</li>
                    </ul>
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isSyncing ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sincronizando...
                            </div>
                        ) : (
                            '🔄 Sincronizar Setores'
                        )}
                    </button>
                    
                    <button
                        onClick={checkStatus}
                        disabled={isLoading}
                        className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold disabled:bg-slate-100"
                    >
                        🔍 Verificar Status
                    </button>
                </div>

                {/* Informações Técnicas */}
                <div className="bg-slate-50 rounded-lg p-4 text-sm">
                    <h3 className="font-semibold text-slate-700 mb-2">ℹ️ Informações Técnicas</h3>
                    <div className="text-slate-600 space-y-1">
                        <p><strong>Banco Vetorial:</strong> PostgreSQL com extensão pgvector</p>
                        <p><strong>Embeddings:</strong> Google Embedding API (768 dimensões)</p>
                        <p><strong>Busca:</strong> Similaridade por cosseno</p>
                        <p><strong>Integração:</strong> Automática no Assistente IA</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
