import React, { useState } from 'react';
import { ServiceOrder, OSStatus, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { osEmailService } from '../../services/osEmailService';
import PDFViewerCanvas from './PDFViewerCanvas';
import {
    XMarkIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    DocumentTextIcon,
    ArrowDownTrayIcon,
    EnvelopeIcon,
    CalendarDaysIcon,
    UsersIcon,
    ExclamationTriangleIcon,
    EyeIcon
} from '../ui/icons';

interface OSDetailModalProps {
    order: ServiceOrder;
    onClose: () => void;
    onUpdate: () => void;
}

const OSDetailModal: React.FC<OSDetailModalProps> = ({ order, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'signers' | 'history'>('overview');
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloadLoading(true);
            
            // Priorizar PDF final (com termo) se existir
            const pathToDownload = (order as any).final_file_path || order.file_path;
            const nameToDownload = (order as any).final_file_name || order.file_name;
            
            console.log('📥 Baixando PDF:', pathToDownload);
            
            const { data, error } = await supabase.storage
                .from('service-orders')
                .download(pathToDownload);

            if (error) throw error;

            // Criar URL para download
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nameToDownload;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Download concluído:', nameToDownload);
        } catch (error: any) {
            console.error('❌ Erro ao baixar arquivo:', error);
            alert(`Erro ao baixar arquivo: ${error.message}`);
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleCancelOS = async () => {
        if (!confirm('Tem certeza que deseja cancelar esta OS? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            setActionLoading(true);

            const { error } = await supabase
                .from('service_orders')
                .update({ 
                    status: OSStatus.Cancelled,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            if (error) throw error;

            // Registrar evento
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_event_type: 'cancelled',
                p_event_description: 'OS cancelada pelo criador'
            });

            // Notificar assinantes sobre cancelamento
            let signersToNotify = order.signers;
            if (!signersToNotify || signersToNotify.length === 0) {
                const { data } = await supabase.from('os_signers').select('*').eq('os_id', order.id);
                signersToNotify = data || [];
            }
            if (signersToNotify && signersToNotify.length > 0) {
                await osEmailService.sendCancelled(order, signersToNotify);
            }

            alert('✅ OS cancelada com sucesso');
            onUpdate();
        } catch (error: any) {
            console.error('Erro ao cancelar OS:', error);
            alert(`Erro ao cancelar OS: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinalizeOS = async () => {
        if ((order.signed_count || 0) !== (order.total_signers || 0)) {
            alert('Só é possível finalizar quando todas as assinaturas estiverem concluídas.');
            return;
        }
        try {
            setLoading(true);
            const { error } = await supabase
                .from('service_orders')
                .update({ status: OSStatus.Completed, updated_at: new Date().toISOString() })
                .eq('id', order.id);
            if (error) throw error;
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_event_type: 'completed',
                p_event_description: 'OS finalizada manualmente',
                p_metadata: {}
            });

            // Enviar e-mail de finalização com PDF anexo para quem assinou
            let currentSigners = order.signers;
            if (!currentSigners || currentSigners.length === 0) {
                const { data } = await supabase.from('os_signers').select('*').eq('os_id', order.id);
                currentSigners = data || [];
            }
            const finalizedOrder = { ...order, status: OSStatus.Completed, signers: currentSigners };
            await osEmailService.sendFinalized(finalizedOrder, currentSigners || []);

            alert('✅ OS finalizada.');
            onUpdate();
        } catch (error: any) {
            console.error('Erro ao finalizar OS:', error);
            alert(`Erro ao finalizar OS: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOS = async () => {
        if (order.status !== OSStatus.Cancelled) {
            alert('⚠️ Primeiro cancele a OS para permitir exclusão.');
            return;
        }
        if ((order.signed_count || 0) >= (order.total_signers || 0)) {
            alert('⚠️ Não é possível excluir documentos totalmente assinados.');
            return;
        }
        if (!confirm('⚠️ ATENÇÃO: Excluir esta OS?\n\nEsta ação removerá:\n• Documento original e final (se existir)\n• Todos os registros de assinantes\n• Todo o histórico de auditoria\n\nEsta ação NÃO pode ser desfeita!')) {
            return;
        }

        try {
            setActionLoading(true);
            
            console.log('🗑️ Iniciando exclusão da OS...');
            
            // Remover arquivos do storage
            const filesToRemove = [order.file_path];
            if ((order as any).final_file_path) {
                filesToRemove.push((order as any).final_file_path);
            }
            
            console.log('🗑️ Removendo arquivos do storage:', filesToRemove);
            const { error: storageError } = await supabase.storage
                .from('service-orders')
                .remove(filesToRemove);
            
            if (storageError) {
                console.warn('⚠️ Aviso ao remover do storage:', storageError);
            }
            
            // Remover registros relacionados
            console.log('🗑️ Removendo signers...');
            await supabase.from('os_signers').delete().eq('os_id', order.id);
            
            console.log('🗑️ Removendo audit log...');
            await supabase.from('os_audit_log').delete().eq('os_id', order.id);
            
            console.log('🗑️ Removendo OS...');
            const { error } = await supabase.from('service_orders').delete().eq('id', order.id);
            if (error) throw error;
            
            console.log('✅ OS excluída completamente');
            alert('✅ OS excluída com sucesso');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('❌ Erro ao excluir OS:', error);
            alert(`❌ Erro ao excluir OS: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemovePendingSigner = async (signerId: string) => {
        const target = order.signers?.find(s => s.id === signerId);
        if (!target) return;
        if (target.status !== SignerStatus.Pending) {
            alert('⚠️ Só é possível remover assinantes que ainda não assinaram.');
            return;
        }
        if (!confirm(`Remover o assinante ${target.name || target.email}?\n\nEle será notificado por e-mail sobre a remoção.`)) {
            return;
        }
        
        try {
            setActionLoading(true);
            
            console.log('🗑️ Removendo assinante:', target.email);
            await supabase.from('os_signers').delete().eq('id', signerId);

            const newTotal = Math.max((order.total_signers || 0) - 1, 0);
            const newStatus =
                newTotal > 0 && (order.signed_count || 0) >= newTotal ? OSStatus.Completed : order.status;

            console.log('📝 Atualizando total de assinantes:', { newTotal, newStatus });
            await supabase
                .from('service_orders')
                .update({
                    total_signers: newTotal,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_event_type: 'signer_removed',
                p_event_description: `Assinante removido: ${target.email}`,
                p_metadata: { signer: target.email, reason: 'removed_by_admin' }
            });

            // Notificar assinante removido
            console.log('📧 Enviando e-mail de notificação para assinante removido...');
            try {
                await osEmailService.sendCancelled(order, [target], 'Você foi removido deste processo de assinatura');
                console.log('✅ E-mail de remoção enviado');
            } catch (emailErr) {
                console.error('❌ Erro ao enviar e-mail de remoção:', emailErr);
                // Não bloqueia a remoção
            }

            alert('✅ Assinante removido com sucesso');
            onUpdate();
        } catch (error: any) {
            console.error('❌ Erro ao remover assinante:', error);
            alert(`Erro ao remover: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async (signerId: string, signerEmail: string) => {
        try {
            setActionLoading(true);

            // Encontrar o assinante
            const signer = order.signers?.find(s => s.id === signerId);
            if (!signer) {
                throw new Error('Assinante não encontrado');
            }

            // Enviar e-mail de lembrete
            await osEmailService.sendReminder(order, signer);

            alert(`✅ Lembrete enviado para ${signerEmail}`);
            onUpdate();
        } catch (error: any) {
            console.error('Erro ao enviar lembrete:', error);
            alert(`Erro ao enviar lembrete: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    };

    const getStatusBadge = (status: OSStatus | SignerStatus) => {
        if (status === OSStatus.Completed || status === SignerStatus.Signed) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    <CheckCircleIcon className="w-4 h-4" />
                    {status === OSStatus.Completed ? 'Concluído' : 'Assinado'}
                </span>
            );
        }
        if (status === OSStatus.Pending || status === SignerStatus.Pending) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                    <ClockIcon className="w-4 h-4" />
                    Aguardando
                </span>
            );
        }
        if (status === OSStatus.PartialSigned) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    <ClockIcon className="w-4 h-4" />
                    Parcial
                </span>
            );
        }
        if (status === OSStatus.Cancelled || status === SignerStatus.Refused) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                    <XCircleIcon className="w-4 h-4" />
                    {status === OSStatus.Cancelled ? 'Cancelado' : 'Recusado'}
                </span>
            );
        }
        if (status === OSStatus.Expired || status === SignerStatus.Expired) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                    <XCircleIcon className="w-4 h-4" />
                    Expirado
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                Rascunho
            </span>
        );
    };

    const progress = order.total_signers ? (order.signed_count! / order.total_signers) * 100 : 0;

    const openPreview = async () => {
        setShowPreview(true);
        setPreviewLoading(true);
        const paths = [
            order.final_file_path,
            `${order.file_path}.final.pdf`,
            order.file_path
        ].filter(Boolean) as string[];
        for (const path of paths) {
            try {
                const { data: signed, error: signedError } = await supabase.storage
                    .from('service-orders')
                    .createSignedUrl(path, 3600);
                if (!signedError && signed?.signedUrl) {
                    const head = await fetch(signed.signedUrl, { method: 'HEAD' });
                    if (head.ok) {
                        setPreviewUrl(signed.signedUrl);
                        setPreviewLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('Preview signed URL falhou para', path, e);
            }
            try {
                const { data: pub } = supabase.storage.from('service-orders').getPublicUrl(path);
                if (pub?.publicUrl) {
                    const head = await fetch(pub.publicUrl, { method: 'HEAD' });
                    if (head.ok) {
                        setPreviewUrl(pub.publicUrl);
                        setPreviewLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('Preview public URL falhou para', path, e);
            }
        }
        setPreviewUrl('');
        setPreviewLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1.5">
                                <DocumentTextIcon className="w-8 h-8" />
                                <h2 className="text-xl font-bold">{order.title}</h2>
                            </div>
                            <p className="text-slate-300 text-xs">{order.file_name}</p>
                            {order.description && (
                                <p className="text-slate-300 mt-1 text-sm line-clamp-2">{order.description}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Status and Progress */}
                    <div className="mt-3 flex items-center gap-4">
                        {getStatusBadge(order.status)}
                        <div className="flex-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-200 mb-0.5">
                                <span>Progresso</span>
                                <span className="font-semibold">
                                    {order.signed_count} / {order.total_signers} assinaturas
                                </span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        progress === 100 ? 'bg-green-400' : 'bg-blue-400'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {showPreview ? (
                    /* Preview inline no mesmo modal (sem modal empilhado) */
                    <div className="flex-1 flex flex-col bg-slate-100 min-h-[70vh]">
                        {/* Toolbar Preview */}
                        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                            >
                                ← Voltar
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-500 truncate">Visualizando</p>
                                <p className="font-semibold text-slate-900 truncate">{order.file_name}</p>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Baixar
                            </button>
                        </div>

                        {/* Viewer */}
                        <div className="flex-1 overflow-auto">
                            {previewLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-slate-600">Carregando visualização...</p>
                                    </div>
                                </div>
                            ) : previewUrl ? (
                                <div className="h-full">
                                    <PDFViewerCanvas pdfUrl={previewUrl} fileName={order.file_name} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-slate-600">Erro ao carregar PDF</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 text-center shrink-0">
                            Pré-visualização no mesmo modal — sem janelas sobrepostas.
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="border-b border-slate-200 bg-slate-50">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-6 py-3 font-semibold transition-colors ${
                                        activeTab === 'overview'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    Visão Geral
                                </button>
                                <button
                                    onClick={() => setActiveTab('signers')}
                                    className={`px-6 py-3 font-semibold transition-colors ${
                                        activeTab === 'signers'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    Assinantes ({order.signers?.length || 0})
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeTab === 'overview' && (
                                <OverviewTab order={order} formatDate={formatDate} formatFileSize={formatFileSize} />
                            )}
                            {activeTab === 'signers' && (
                                <SignersTab 
                                    order={order} 
                                    formatDate={formatDate} 
                                    getStatusBadge={getStatusBadge}
                                    onSendReminder={handleSendReminder}
                                    onRemovePending={handleRemovePendingSigner}
                                    loading={actionLoading}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t bg-slate-50 p-4 flex justify-between">
                            <div className="flex gap-2 flex-wrap">
                                {order.status !== OSStatus.Completed && order.status !== OSStatus.Cancelled && (
                                <button
                                    onClick={handleCancelOS}
                                    disabled={actionLoading}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                                >
                                    Cancelar OS
                                </button>
                                )}
                                {order.status !== OSStatus.Completed &&
                                    order.status !== OSStatus.Cancelled &&
                                    (order.signed_count || 0) === (order.total_signers || 0) && (
                                    <button
                                        onClick={handleFinalizeOS}
                                        disabled={actionLoading}
                                        className="px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                                    >
                                        Finalizar OS
                                    </button>
                                    )}
                                {order.status === OSStatus.Cancelled &&
                                    (order.signed_count || 0) < (order.total_signers || 0) && (
                                    <button
                                        onClick={handleDeleteOS}
                                        disabled={actionLoading}
                                        className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                                    >
                                        Excluir OS
                                    </button>
                                    )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={openPreview}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
                                >
                                    <EyeIcon className="w-5 h-5" />
                                    Visualizar PDF
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={downloadLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    {downloadLoading ? 'Baixando...' : 'Baixar PDF'}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Overview Tab
const OverviewTab: React.FC<{
    order: ServiceOrder;
    formatDate: (date?: string) => string;
    formatFileSize: (bytes?: number) => string;
}> = ({ order, formatDate, formatFileSize }) => {
    return (
        <div className="space-y-4">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoCard
                    icon={<CalendarDaysIcon className="w-5 h-5" />}
                    label="Criado em"
                    value={formatDate(order.created_at)}
                />
                {order.os_number && (
                    <InfoCard
                        icon={<DocumentTextIcon className="w-5 h-5" />}
                        label="Número da OS"
                        value={order.os_number}
                    />
                )}
                <InfoCard
                    icon={<UsersIcon className="w-5 h-5" />}
                    label="Criado por"
                    value={order.created_by_name || 'N/A'}
                />
                <InfoCard
                    icon={<DocumentTextIcon className="w-5 h-5" />}
                    label="Tamanho do arquivo"
                    value={formatFileSize(order.file_size)}
                />
                <InfoCard
                    icon={<ClockIcon className="w-5 h-5" />}
                    label="Expira em"
                    value={formatDate(order.expires_at)}
                />
            </div>

            {/* Status Summary */}
            <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Resumo de Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatusSummaryCard
                        label="Total"
                        value={order.total_signers || 0}
                        color="bg-blue-100 text-blue-700"
                    />
                    <StatusSummaryCard
                        label="Assinados"
                        value={order.signed_count || 0}
                        color="bg-green-100 text-green-700"
                    />
                    <StatusSummaryCard
                        label="Pendentes"
                        value={(order.total_signers || 0) - (order.signed_count || 0)}
                        color="bg-amber-100 text-amber-700"
                    />
                    <StatusSummaryCard
                        label="Progresso"
                        value={`${order.total_signers ? Math.round((order.signed_count! / order.total_signers) * 100) : 0}%`}
                        color="bg-purple-100 text-purple-700"
                    />
                </div>
            </div>

            {/* Timeline (se completado) */}
            {order.completed_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        <div>
                            <h3 className="font-semibold text-green-900">Documento Concluído!</h3>
                            <p className="text-sm text-green-700">
                                Todas as assinaturas foram coletadas em {formatDate(order.completed_at)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expiration Warning */}
            {order.expires_at && order.status !== OSStatus.Completed && order.status !== OSStatus.Cancelled && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
                        <div>
                            <h3 className="font-semibold text-orange-900">Atenção ao Prazo</h3>
                            <p className="text-sm text-orange-700">
                                Este documento expira em {formatDate(order.expires_at)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Signers Tab
const SignersTab: React.FC<{
    order: ServiceOrder;
    formatDate: (date?: string) => string;
    getStatusBadge: (status: any) => JSX.Element;
    onSendReminder: (signerId: string, signerEmail: string) => Promise<void>;
    onRemovePending: (signerId: string) => Promise<void>;
    loading: boolean;
    loadingSignerId?: string;
}> = ({ order, formatDate, getStatusBadge, onSendReminder, onRemovePending, loading }) => {
    return (
        <div className="space-y-4">
            {order.signers && order.signers.length > 0 ? (
                order.signers.map((signer, index) => (
                    <div
                        key={signer.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start gap-4">
                            {/* Order Number */}
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                {index + 1}
                            </div>

                            {/* Signer Info */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{signer.name}</h4>
                                        <p className="text-sm text-slate-600">{signer.email}</p>
                                        <p className="text-xs text-slate-500 mt-1">Função: {signer.role}</p>
                                    </div>
                                    {getStatusBadge(signer.status)}
                                </div>

                                {/* Signature Info */}
                                {signer.signed_at && (
                                    <div className="mt-3 pt-3 border-t border-slate-300 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-slate-600">Assinado em:</span>
                                                <span className="ml-2 font-medium text-slate-900">
                                                    {formatDate(signer.signed_at)}
                                                </span>
                                            </div>
                                            {signer.ip_address && (
                                                <div>
                                                    <span className="text-slate-600">IP:</span>
                                                    <span className="ml-2 font-mono text-xs text-slate-900">
                                                        {signer.ip_address}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Download comprovante */}
                                        {signer.signature_data && (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        const payload = {
                                                            signer: {
                                                                name: signer.name,
                                                                email: signer.email,
                                                            },
                                                            document: {
                                                                id: order.id,
                                                                title: order.title,
                                                                file_name: order.file_name,
                                                                file_hash: order.file_hash || null
                                                            },
                                                            signature: signer.signature_data
                                                        };
                                                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `comprovante-${order.id}-${signer.id}.json`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                                                >
                                                    Baixar comprovante (JSON)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions for pending signers */}
                                {signer.status === SignerStatus.Pending && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => onSendReminder(signer.id!, signer.email)}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
                                            >
                                                <EnvelopeIcon className="w-4 h-4" />
                                                Enviar Lembrete
                                            </button>
                                            {order.status !== OSStatus.Cancelled && order.status !== OSStatus.Completed && (
                                                <button
                                                    onClick={() => onRemovePending(signer.id!)}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                                                >
                                                    Remover assinante
                                                </button>
                                            )}
                                        </div>
                                        {signer.last_reminder_sent_at && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Último lembrete: {formatDate(signer.last_reminder_sent_at)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12">
                    <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Nenhum assinante cadastrado</p>
                </div>
            )}
        </div>
    );
};

// Helper Components
const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-slate-600 mb-1">
            {icon}
            <span className="text-xs font-semibold">{label}</span>
        </div>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
);

const StatusSummaryCard: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
    <div className={`rounded-lg p-3 ${color}`}>
        <p className="text-xs font-semibold mb-1">{label}</p>
        <p className="text-lg font-bold">{value}</p>
    </div>
);

export default OSDetailModal;

