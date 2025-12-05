import React, { useState } from 'react';
import { ServiceOrder, OSStatus, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { osEmailService } from '../../services/osEmailService';
import OSPreviewModal from './OSPreviewModal';
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
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const handleDownload = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase.storage
                .from('service-orders')
                .download(order.file_path);

            if (error) throw error;

            // Criar URL para download
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = order.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Erro ao baixar arquivo:', error);
            alert(`Erro ao baixar arquivo: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOS = async () => {
        if (!confirm('Tem certeza que deseja cancelar esta OS? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            setLoading(true);

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

            alert('✅ OS cancelada com sucesso');
            onUpdate();
        } catch (error: any) {
            console.error('Erro ao cancelar OS:', error);
            alert(`Erro ao cancelar OS: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async (signerId: string, signerEmail: string) => {
        try {
            setLoading(true);

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
            setLoading(false);
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <DocumentTextIcon className="w-8 h-8" />
                                <h2 className="text-2xl font-bold">{order.title}</h2>
                            </div>
                            <p className="text-slate-300 text-sm">{order.file_name}</p>
                            {order.description && (
                                <p className="text-slate-300 mt-2">{order.description}</p>
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
                    <div className="mt-4 flex items-center gap-4">
                        {getStatusBadge(order.status)}
                        <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
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
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <OverviewTab order={order} formatDate={formatDate} formatFileSize={formatFileSize} />
                    )}
                    {activeTab === 'signers' && (
                        <SignersTab 
                            order={order} 
                            formatDate={formatDate} 
                            getStatusBadge={getStatusBadge}
                            onSendReminder={handleSendReminder}
                            loading={loading}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t bg-slate-50 p-6 flex justify-between">
                    <div className="flex gap-2">
                        {order.status !== OSStatus.Completed && order.status !== OSStatus.Cancelled && (
                            <button
                                onClick={handleCancelOS}
                                disabled={loading}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                            >
                                Cancelar OS
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
                        >
                            <EyeIcon className="w-5 h-5" />
                            Visualizar PDF
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            {loading ? 'Baixando...' : 'Baixar PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Preview */}
            {showPreview && (
                <OSPreviewModal
                    order={order}
                    onClose={() => setShowPreview(false)}
                />
            )}
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
        <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                    icon={<CalendarDaysIcon className="w-5 h-5" />}
                    label="Criado em"
                    value={formatDate(order.created_at)}
                />
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
            <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumo de Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    loading: boolean;
}> = ({ order, formatDate, getStatusBadge, onSendReminder, loading }) => {
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
                                    <div className="mt-3 pt-3 border-t border-slate-300">
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
                                    </div>
                                )}

                                {/* Actions for pending signers */}
                                {signer.status === SignerStatus.Pending && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => onSendReminder(signer.id!, signer.email)}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            <EnvelopeIcon className="w-4 h-4" />
                                            Enviar Lembrete
                                        </button>
                                        {signer.last_reminder_sent_at && (
                                            <p className="text-xs text-slate-500 mt-2">
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
    <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-600 mb-1">
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
);

const StatusSummaryCard: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
    <div className={`rounded-lg p-4 ${color}`}>
        <p className="text-sm font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);

export default OSDetailModal;

