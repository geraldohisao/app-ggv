import React, { useState, useEffect } from 'react';
import { ServiceOrder, OSStatus, OSFilters } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { supabase } from '../../services/supabaseClient';
import OSUploadModal from './OSUploadModal';
import OSListPanel from './OSListPanel';
import OSDetailModal from './OSDetailModal';
import { 
    PlusIcon, 
    DocumentSignatureIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from '../ui/icons';

const OSManagerPage: React.FC = () => {
    const { user } = useUser();
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
    const [filters, setFilters] = useState<OSFilters>({
        status: 'ALL',
        dateFrom: undefined,
        dateTo: undefined,
        signerId: undefined,
        search: ''
    });

    // Estatísticas
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        completed: 0,
        partial: 0
    });

    useEffect(() => {
        loadOrders();
    }, [filters]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            
            let query = supabase
                .from('service_orders')
                .select(`
                    *,
                    signers:os_signers(*)
                `)
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters.status && filters.status !== 'ALL') {
                query = query.eq('status', filters.status);
            }

            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }

            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            setOrders(data || []);
            calculateStats(data || []);
        } catch (error) {
            console.error('Erro ao carregar OS:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: ServiceOrder[]) => {
        setStats({
            total: data.length,
            pending: data.filter(o => o.status === OSStatus.Pending).length,
            completed: data.filter(o => o.status === OSStatus.Completed).length,
            partial: data.filter(o => o.status === OSStatus.PartialSigned).length
        });
    };

    const handleOrderCreated = () => {
        setShowUploadModal(false);
        loadOrders();
    };

    const handleOrderUpdated = () => {
        setSelectedOrder(null);
        loadOrders();
    };

    const handleViewOrder = (order: ServiceOrder) => {
        setSelectedOrder(order);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <DocumentSignatureIcon className="w-8 h-8 text-blue-600" />
                            Gerenciar Ordens de Serviço
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Envie documentos para assinatura digital e acompanhe o status
                        </p>
                    </div>
                    
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova OS
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Total de OS"
                        value={stats.total}
                        icon={<DocumentSignatureIcon className="w-6 h-6" />}
                        color="bg-blue-500"
                        textColor="text-blue-500"
                    />
                    <StatCard
                        title="Aguardando"
                        value={stats.pending}
                        icon={<ClockIcon className="w-6 h-6" />}
                        color="bg-amber-500"
                        textColor="text-amber-500"
                    />
                    <StatCard
                        title="Parcialmente Assinadas"
                        value={stats.partial}
                        icon={<ExclamationTriangleIcon className="w-6 h-6" />}
                        color="bg-orange-500"
                        textColor="text-orange-500"
                    />
                    <StatCard
                        title="Concluídas"
                        value={stats.completed}
                        icon={<CheckCircleIcon className="w-6 h-6" />}
                        color="bg-green-500"
                        textColor="text-green-500"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
                <OSListPanel
                    orders={orders}
                    loading={loading}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onViewOrder={handleViewOrder}
                    onRefresh={loadOrders}
                />
            </div>

            {/* Modals */}
            {showUploadModal && (
                <OSUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={handleOrderCreated}
                />
            )}

            {selectedOrder && (
                <OSDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={handleOrderUpdated}
                />
            )}
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    textColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, textColor }) => {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
                </div>
                <div className={`${color} p-3 rounded-lg text-white`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default OSManagerPage;

