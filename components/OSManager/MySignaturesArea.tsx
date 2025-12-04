import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import OSBatchSignatureModal from './OSBatchSignatureModal';
import OSEmailVerification from './OSEmailVerification';
import {
    DocumentTextIcon,
    CheckCircleIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    UsersIcon
} from '../ui/icons';

/**
 * Área do Assinante - Visualiza todos os documentos pendentes
 * Permite assinatura individual ou em lote
 */
const MySignaturesArea: React.FC = () => {
    const { signerEmail } = useParams<{ signerEmail: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [pendingOrders, setPendingOrders] = useState<Array<{order: ServiceOrder, signer: OSSigner}>>([]);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [tab, setTab] = useState<'pending' | 'signed'>('pending');

    useEffect(() => {
        if (signerEmail) {
            loadSignerDocuments();
        }
    }, [signerEmail, tab]);

    const loadSignerDocuments = async () => {
        try {
            setLoading(true);

            if (!signerEmail) return;

            // Decodificar e-mail (pode vir encoded na URL)
            const email = decodeURIComponent(signerEmail);

            // Buscar todos os signers deste e-mail
            const { data: signersData, error: signersError } = await supabase
                .from('os_signers')
                .select(`
                    *,
                    service_orders (*)
                `)
                .eq('email', email)
                .eq('status', tab === 'pending' ? SignerStatus.Pending : SignerStatus.Signed)
                .order('created_at', { ascending: false });

            if (signersError) throw signersError;

            const orders = (signersData || [])
                .filter((signer: any) => signer.service_orders && signer.service_orders.status !== 'CANCELLED')
                .map((signer: any) => ({
                    order: signer.service_orders,
                    signer: {
                        id: signer.id,
                        os_id: signer.os_id,
                        name: signer.name,
                        email: signer.email,
                        role: signer.role,
                        status: signer.status,
                        signed_at: signer.signed_at,
                        order_index: signer.order_index
                    }
                }));

            setPendingOrders(orders);

            if (orders.length > 0) {
                setSignerName(orders[0].signer.name);
            }

            // Verificar se e-mail já foi verificado nesta sessão
            const verified = sessionStorage.getItem(`email_verified_${email}`);
            if (verified) {
                setIsEmailVerified(true);
            } else {
                setNeedsEmailVerification(true);
            }

        } catch (err) {
            console.error('Erro ao carregar documentos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedOrderIds.size === pendingOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(pendingOrders.map(item => item.order.id!)));
        }
    };

    const toggleSelection = (orderId: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(orderId)) {
            newSet.delete(orderId);
        } else {
            newSet.add(orderId);
        }
        setSelectedOrderIds(newSet);
    };

    const handleViewDocument = (orderId: string, signerId: string) => {
        navigate(`/assinar/${orderId}/${signerId}`);
    };

    const handleDownload = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('service-orders')
                .download(filePath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erro ao baixar documento');
        }
    };

    const handleBatchSign = () => {
        if (selectedOrderIds.size === 0) {
            alert('Selecione pelo menos um documento para assinar');
            return;
        }
        setShowBatchModal(true);
    };

    const handleBatchComplete = () => {
        setShowBatchModal(false);
        setSelectedOrderIds(new Set());
        loadSignerDocuments();
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando documentos...</p>
                </div>
            </div>
        );
    }

    // Verificação de e-mail para usuários externos
    if (needsEmailVerification && !isEmailVerified && signerEmail) {
        return (
            <OSEmailVerification
                signerEmail={decodeURIComponent(signerEmail)}
                signerName={signerName}
                onVerified={() => {
                    setIsEmailVerified(true);
                    setNeedsEmailVerification(false);
                }}
            />
        );
    }

    const selectedOrders = pendingOrders.filter(item => selectedOrderIds.has(item.order.id!));

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <img 
                            src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
                            alt="Grupo GGV"
                            className="h-10"
                        />
                        <div className="flex items-center gap-4">
                            <button className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium">
                                Enviar documento para assinar
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold">{signerName.charAt(0)}</span>
                                </div>
                                <span className="text-sm text-slate-700">{signerName}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Minha área de assinatura</h1>
                <p className="text-slate-600 mb-8">Gerencie seus documentos para assinatura</p>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-slate-200 mb-6">
                    <button
                        onClick={() => setTab('pending')}
                        className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
                            tab === 'pending'
                                ? 'text-slate-900 border-orange-500'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        Pendentes
                    </button>
                    <button
                        onClick={() => setTab('signed')}
                        className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
                            tab === 'signed'
                                ? 'text-slate-900 border-orange-500'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        Assinados
                    </button>
                </div>

                {/* Toolbar */}
                {tab === 'pending' && pendingOrders.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedOrderIds.size === pendingOrders.length}
                                    onChange={handleSelectAll}
                                    className="w-5 h-5 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Selecionar todos
                                </span>
                            </label>
                            {selectedOrderIds.size > 0 && (
                                <span className="text-sm text-slate-600">
                                    {selectedOrderIds.size} documento(s) selecionado(s)
                                </span>
                            )}
                        </div>

                        {selectedOrderIds.size > 0 && (
                            <button
                                onClick={handleBatchSign}
                                className="px-8 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
                            >
                                Assinar todos ({selectedOrderIds.size})
                            </button>
                        )}
                    </div>
                )}

                {/* Lista de Documentos */}
                {pendingOrders.length === 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {tab === 'pending' ? 'Nenhum documento pendente' : 'Nenhum documento assinado'}
                        </h3>
                        <p className="text-slate-600">
                            {tab === 'pending' 
                                ? 'Você não tem documentos aguardando assinatura no momento.'
                                : 'Você ainda não assinou nenhum documento.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
                            {tab === 'pending' && <div className="col-span-1"></div>}
                            <div className={tab === 'pending' ? 'col-span-5' : 'col-span-6'}>Nome do documento</div>
                            <div className="col-span-2">Remetente</div>
                            <div className="col-span-2 text-center">Assinaturas</div>
                            <div className="col-span-2 text-right">Ações</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-200">
                            {pendingOrders.map((item) => (
                                <div
                                    key={item.signer.id}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center"
                                >
                                    {/* Checkbox */}
                                    {tab === 'pending' && (
                                        <div className="col-span-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrderIds.has(item.order.id!)}
                                                onChange={() => toggleSelection(item.order.id!)}
                                                className="w-5 h-5 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                                            />
                                        </div>
                                    )}

                                    {/* Nome do Documento */}
                                    <div className={tab === 'pending' ? 'col-span-5' : 'col-span-6'}>
                                        <div className="flex items-start gap-3">
                                            <DocumentTextIcon className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-slate-900 mb-1">
                                                    {item.order.title}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    Assinar como {item.signer.role}
                                                </p>
                                                {tab === 'signed' && item.signer.signed_at && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Assinado em {formatDate(item.signer.signed_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remetente */}
                                    <div className="col-span-2">
                                        <p className="text-sm text-slate-900">{item.order.created_by_name || 'Grupo GGV'}</p>
                                        {item.order.file_name && (
                                            <p className="text-xs text-slate-500 truncate">
                                                {item.order.file_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Assinaturas */}
                                    <div className="col-span-2 text-center">
                                        <div className="inline-flex items-center gap-1 text-sm">
                                            <UsersIcon className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium text-slate-900">
                                                {item.order.signed_count}/{item.order.total_signers}
                                            </span>
                                            <span className="text-slate-600">Assinaturas</span>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleViewDocument(item.order.id!, item.signer.id!)}
                                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                            title="Visualizar"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(item.order.file_path, item.order.file_name)}
                                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                            title="Baixar"
                                        >
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                {tab === 'pending' && pendingOrders.length > 0 && (
                    <div className="mt-6 text-sm text-slate-600 text-center">
                        Você tem <strong>{pendingOrders.length}</strong> documento(s) aguardando assinatura
                    </div>
                )}
            </div>

            {/* Modal de Assinatura em Lote */}
            {showBatchModal && selectedOrders.length > 0 && (
                <OSBatchSignatureModal
                    orders={selectedOrders}
                    onClose={() => setShowBatchModal(false)}
                    onComplete={handleBatchComplete}
                />
            )}
        </div>
    );
};

export default MySignaturesArea;

