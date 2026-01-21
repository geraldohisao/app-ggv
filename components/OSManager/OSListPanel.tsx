import React, { useState } from 'react';
import { ServiceOrder, OSStatus, OSFilters, OSSigner } from '../../types';
import { OSListSkeleton } from '../ui/LoadingSkeleton';
import {
    FilterIcon,
    MagnifyingGlassIcon,
    RefreshIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    EyeIcon,
    CalendarDaysIcon,
    UsersIcon,
    DocumentTextIcon,
    DocumentSignatureIcon
} from '../ui/icons';

interface OSListPanelProps {
    orders: ServiceOrder[];
    loading: boolean;
    filters: OSFilters;
    onFiltersChange: (filters: OSFilters) => void;
    onViewOrder: (order: ServiceOrder) => void;
    onRefresh: () => void;
}

const OSListPanel: React.FC<OSListPanelProps> = ({
    orders,
    loading,
    filters,
    onFiltersChange,
    onViewOrder,
    onRefresh
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (key: keyof OSFilters, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({
            status: 'ALL',
            dateFrom: undefined,
            dateTo: undefined,
            signerId: undefined,
            search: ''
        });
    };

    const hasActiveFilters = () => {
        return (
            filters.status !== 'ALL' ||
            filters.dateFrom ||
            filters.dateTo ||
            filters.search ||
            filters.signerEmail
        );
    };

    // Lista de assinantes únicos (para filtro por e-mail)
    const signerOptions = React.useMemo(() => {
        const map = new Map<string, { email: string; name?: string }>();
        orders.forEach(order => {
            (order.signers || []).forEach(s => {
                if (s.email && !map.has(s.email)) {
                    map.set(s.email, { email: s.email, name: s.name || undefined });
                }
            });
        });
        return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
    }, [orders]);

    return (
        <div className="bg-white rounded-xl shadow-lg">
            {/* Toolbar */}
            <div className="border-b border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={filters.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Buscar por título ou nome do arquivo..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                hasActiveFilters()
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <FilterIcon className="w-5 h-5" />
                            Filtros
                            {hasActiveFilters() && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    ativo
                                </span>
                            )}
                        </button>

                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium disabled:opacity-50"
                        >
                            <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={filters.status || 'ALL'}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="ALL">Todos</option>
                                    <option value={OSStatus.Pending}>Aguardando</option>
                                    <option value={OSStatus.PartialSigned}>Parcialmente Assinado</option>
                                    <option value={OSStatus.Completed}>Concluído</option>
                                    <option value={OSStatus.Draft}>Rascunho</option>
                                    <option value={OSStatus.Cancelled}>Cancelado</option>
                                    <option value={OSStatus.Expired}>Expirado</option>
                                </select>
                            </div>

                            {/* Assinante (e-mail) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Assinante (e-mail)
                                </label>
                                <select
                                    value={filters.signerEmail || ''}
                                    onChange={(e) => handleFilterChange('signerEmail', e.target.value || undefined)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todos</option>
                                    {signerOptions.map((s) => (
                                        <option key={s.email} value={s.email}>
                                            {s.name ? `${s.name} (${s.email})` : s.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {hasActiveFilters() && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Limpar Filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="divide-y divide-slate-200">
                {loading ? (
                    <OSListSkeleton count={3} />
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-700 mb-2">
                            Nenhuma OS encontrada
                        </p>
                        <p className="text-slate-500">
                            {hasActiveFilters()
                                ? 'Tente ajustar os filtros ou limpe-os para ver todas as OS'
                                : 'Crie sua primeira ordem de serviço clicando em "Nova OS"'}
                        </p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <OSListItem
                            key={order.id}
                            order={order}
                            onView={onViewOrder}
                        />
                    ))
                )}
            </div>

            {/* Pagination Info */}
            {!loading && orders.length > 0 && (
                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                    <p className="text-sm text-slate-600 text-center">
                        Exibindo <span className="font-semibold">{orders.length}</span> ordem(ns) de serviço
                    </p>
                </div>
            )}
        </div>
    );
};

interface OSListItemProps {
    order: ServiceOrder;
    onView: (order: ServiceOrder) => void;
}

const OSListItem: React.FC<OSListItemProps> = ({ order, onView }) => {
    const getStatusBadge = (status: OSStatus) => {
        switch (status) {
            case OSStatus.Completed:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        <CheckCircleIcon className="w-4 h-4" />
                        Concluído
                    </span>
                );
            case OSStatus.Pending:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                        <ClockIcon className="w-4 h-4" />
                        Aguardando
                    </span>
                );
            case OSStatus.PartialSigned:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                        <ClockIcon className="w-4 h-4" />
                        Parcial
                    </span>
                );
            case OSStatus.Cancelled:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        <XCircleIcon className="w-4 h-4" />
                        Cancelado
                    </span>
                );
            case OSStatus.Expired:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                        <XCircleIcon className="w-4 h-4" />
                        Expirado
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                        Rascunho
                    </span>
                );
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const progress = order.total_signers ? (order.signed_count! / order.total_signers) * 100 : 0;

    return (
        <div className="p-3 md:p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onView(order)}>
            <div className="flex items-start gap-3 md:gap-4">
                {/* Icon - Menor em mobile */}
                <div className="shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 truncate">
                                {order.title}
                            </h3>
                            <p className="text-sm text-slate-500 truncate">
                                {order.file_name}
                            </p>
                            {order.os_number && (
                                <p className="text-xs text-slate-600 mt-1">
                                    OS nº <span className="font-semibold">{order.os_number}</span>
                                </p>
                            )}
                        </div>
                        <div className="shrink-0">
                            {getStatusBadge(order.status)}
                        </div>
                    </div>

                    {order.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {order.description}
                        </p>
                    )}

                    {/* Progress Bar */}
                    {order.status !== OSStatus.Draft && order.status !== OSStatus.Cancelled && (
                        <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                <span>Progresso de Assinaturas</span>
                                <span className="font-semibold">
                                    {order.signed_count} / {order.total_signers}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-4 h-4" />
                            <span>Criado em {formatDate(order.created_at!)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <UsersIcon className="w-4 h-4" />
                            <span>{order.total_signers} assinante(s)</span>
                        </div>
                        {order.created_by_name && (
                            <div className="flex items-center gap-1">
                                <span>Por {order.created_by_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Expires at warning */}
                    {order.expires_at && order.status !== OSStatus.Completed && order.status !== OSStatus.Cancelled && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                            <ClockIcon className="w-4 h-4" />
                            <span>
                                Expira em {formatDate(order.expires_at)}
                            </span>
                        </div>
                    )}
                </div>

                {/* View Button */}
                <div className="shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(order);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors font-semibold text-sm touch-manipulation"
                        title="Visualizar OS"
                    >
                        <DocumentSignatureIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Visualizar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OSListPanel;

