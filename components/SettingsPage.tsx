import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { UserRole, Module } from '../types';
import { canAccessCalculadora } from '../utils/access';
import { useUser } from '../contexts/DirectUserContext';
import { CpuChipIcon, ChartBarIcon, BookOpenIcon, ExclamationTriangleIcon, KeyIcon, CheckCircleIcon, PhotoIcon, SignalIcon, UsersIcon, UserGroupIcon, CloudArrowDownIcon, BuildingOfficeIcon, IdentificationIcon, ServerIcon, ArrowsRightLeftIcon, ClipboardDocumentListIcon, ArrowPathIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, BuildingOffice2Icon, ClipboardDocumentIcon, TrashIcon } from './ui/icons';
import { EnvelopeIcon } from './ui/icons';
import { DiagnosticSettingsModal } from './settings/DiagnosticSettingsModal';
import { AssistantSettingsModal } from './settings/AssistantSettingsModal';
import { KnowledgeSettingsModal } from './settings/KnowledgeSettingsModal';
import { ApiSettingsModal } from './settings/ApiSettingsModal';
import { ApiKeyManagerModal } from './settings/ApiKeyManagerModal';
import { ServerKeyManagerModal } from './settings/ServerKeyManagerModal';
import { ResetCacheModal } from './settings/ResetCacheModal';
import { UserManagerModal } from './settings/UserManagerModal';
import { DepartmentsManager } from './settings/DepartmentsManager';
import { CargosManager } from './settings/CargosManager';
import WorkspaceImportModal from './settings/WorkspaceImportModal';
import OrgAISuggestionsPanel from './settings/OrgAISuggestionsPanel';
import { SectorSyncPanel } from './settings/SectorSyncPanel';
import { EmailLogsPage } from './admin/EmailLogsPage';
import Breadcrumb from './common/Breadcrumb';
import InternalLink from './common/InternalLink';
const Preferences = React.lazy(() => import('./settings/Preferences'));

const SettingsPage: React.FC = () => {
    const { user } = useUser();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [query, setQuery] = useState<string>('');
    const searchRef = useRef<HTMLInputElement>(null);

    if (!user) return null;

    const isSuperAdmin = user.role === UserRole.SuperAdmin;
    const isAdmin = user.role === UserRole.Admin;
    const canSeeCalculadora = canAccessCalculadora(user);

    const canManageDiagnostic = isSuperAdmin || isAdmin;
    const canManageAssistant = isSuperAdmin;
    const canManageKnowledge = isSuperAdmin || isAdmin;
    const canManageApis = isSuperAdmin;

    if (!canManageDiagnostic && !canManageAssistant && !canManageKnowledge && !canManageApis) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                 <div className="bg-white p-12 rounded-2xl shadow-lg">
                    <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
                    <p className="text-slate-500 mt-2 max-w-sm">Você não tem permissão para visualizar ou editar as configurações da plataforma.</p>
                </div>
            </div>
        );
    }

    // Definição de cards (para facilitar filtro e atalhos)
    const cards = useMemo(() => {
        const all = [
            canManageDiagnostic ? {
                id: 'diagnostic',
                title: 'Configurações do Diagnóstico',
                description: 'Gerencie os segmentos de mercado para análise do diagnóstico comercial.',
                icon: <ClipboardDocumentListIcon className="w-6 h-6 text-blue-800"/>,
                kbd: 'Alt+1',
            } : null,
            canManageAssistant ? {
                id: 'assistant',
                title: 'Configurações do Assistente IA',
                description: 'Gerencie as personas e comportamentos do assistente de IA.',
                icon: <ChatBubbleLeftRightIcon className="w-6 h-6 text-teal-600"/>,
                kbd: 'Alt+2',
            } : null,
            canManageKnowledge ? {
                id: 'knowledge',
                title: 'Gerenciar Cérebro da IA',
                description: 'Adicione ou remova documentos da base de conhecimento que o assistente utiliza.',
                icon: <BookOpenIcon className="w-6 h-6 text-purple-800"/>,
                kbd: 'Alt+3',
            } : null,
            canManageKnowledge ? {
                id: 'sectorSync',
                title: 'Sincronizar Setores - Banco Vetorial',
                description: 'Sincronize os setores de atuação com o banco vetorial para melhorar as respostas da IA.',
                icon: <ArrowsRightLeftIcon className="w-6 h-6 text-blue-600"/>,
                kbd: 'Alt+S',
            } : null,
            {
                id: 'preferences',
                title: 'Preferências',
                description: 'Ajustes rápidos da interface, como auto-aplicar sugestões.',
                icon: <Cog6ToothIcon className="w-6 h-6 text-emerald-700"/>,
                kbd: 'Alt+4',
            },
            canManageApis ? {
                id: 'apiStatus',
                title: 'Diagnóstico de Conexões',
                description: 'Verifique a conectividade com os serviços essenciais (Proxy Gemini, Supabase).',
                icon: <SignalIcon className="w-6 h-6 text-green-600"/>,
                kbd: 'Alt+5',
            } : null,
            canManageApis ? {
                id: 'userManager',
                title: 'Gerenciar Usuários',
                description: 'Defina roles (SUPER_ADMIN, ADMIN, USER), departamentos e cargos dos usuários.',
                icon: <UsersIcon className="w-6 h-6 text-slate-700"/>,
                kbd: 'Alt+6',
            } : null,
            (isSuperAdmin || isAdmin) ? {
                id: 'workspaceImport',
                title: 'Importar do Google Workspace',
                description: 'Sincronize usuários, cargos e departamentos do Google Workspace automaticamente.',
                icon: <CloudArrowDownIcon className="w-6 h-6 text-purple-600"/>,
                kbd: 'Alt+W',
            } : null,
            (isSuperAdmin || isAdmin) ? {
                id: 'serverKeyManager',
                title: 'Gerenciar Chave do Servidor (Gemini)',
                description: 'Insira e salve a chave de API do Google Gemini para o servidor usar.',
                icon: <ServerIcon className="w-6 h-6 text-red-600"/>,
                kbd: 'Alt+7',
            } : null,
            canManageApis ? {
                id: 'apiKeyManager',
                title: 'Gerenciar Chaves Públicas',
                description: 'Insira e salve as chaves para os serviços da plataforma (Supabase, Google).',
                icon: <ClipboardDocumentIcon className="w-6 h-6 text-orange-600"/>,
                kbd: 'Alt+8',
            } : null,
            canManageApis ? {
                id: 'resetCache',
                title: 'Resetar Cache',
                description: 'Limpa caches locais e recarrega o app.',
                icon: <TrashIcon className="w-6 h-6 text-red-600"/>,
                kbd: 'Alt+9',
            } : null,
            canManageApis ? {
                id: 'emailLogs',
                title: 'Logs de E-mail',
                description: 'Rastreamento completo de envios de e-mail do diagnóstico.',
                icon: <EnvelopeIcon className="w-6 h-6 text-blue-600"/>,
                kbd: 'Alt+E',
            } : null,
        ].filter(Boolean) as Array<{ id: string; title: string; description: string; icon: React.ReactNode; kbd?: string }>;
        if (!query.trim()) return all;
        const q = query.toLowerCase();
        return all.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }, [canManageDiagnostic, canManageAssistant, canManageKnowledge, canManageApis, query]);

    // Atalhos de teclado para acelerar navegação
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Focar busca: Cmd+K / Ctrl+K / barra
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.key === '/') {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            // Abrir modais via Alt+1..9 e Alt+E
            if (e.altKey && !e.metaKey && !e.ctrlKey) {
                const map: Record<string, string> = {
                    '1': 'diagnostic',
                    '2': 'assistant',
                    '3': 'knowledge',
                    '4': 'preferences',
                    '5': 'apiStatus',
                    '6': 'userManager',
                    '7': 'serverKeyManager',
                    '8': 'apiKeyManager',
                    '9': 'resetCache',
                    'w': 'workspaceImport',
                    'W': 'workspaceImport',
                    'e': 'emailLogs',
                    'E': 'emailLogs',
                };
                const id = map[e.key];
                if (id) {
                    e.preventDefault();
                    setActiveModal(id);
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const openFirstMatch = () => {
        if (cards.length > 0) setActiveModal(cards[0].id);
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-6 text-center">
                <div className="mb-4">
                    <Breadcrumb 
                        items={[
                            { module: Module.Diagnostico, label: 'Início' },
                            { module: Module.Settings, label: 'Configurações' }
                        ]} 
                        className="justify-center"
                    />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
                <div className="mt-3 max-w-2xl mx-auto relative">
                    <input
                        ref={searchRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') openFirstMatch();
                            if (e.key === 'Escape') { setQuery(''); (e.currentTarget as HTMLInputElement).blur(); }
                        }}
                        placeholder="Busque por configuração (⌘K ou /). Enter abre o primeiro resultado"
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        aria-label="Buscar configurações"
                    />
                    {query && (
                        <button
                            aria-label="Limpar busca"
                            onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 px-2 py-1"
                        >
                            ×
                        </button>
                    )}
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Navegação Rápida */}
                    {!query && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Navegação Rápida</h3>
                            <div className="flex flex-wrap gap-2">
                                <InternalLink 
                                    module={Module.Diagnostico} 
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                                >
                                    <ChartBarIcon className="w-4 h-4" />
                                    Diagnóstico
                                </InternalLink>
                                <InternalLink 
                                    module={Module.Assistente} 
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                                >
                                    <CpuChipIcon className="w-4 h-4" />
                                    Assistente IA
                                </InternalLink>
                                {canSeeCalculadora && (
                                    <InternalLink 
                                        module={Module.Calculadora} 
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                                    >
                                        <KeyIcon className="w-4 h-4" />
                                        Calculadora OTE
                                    </InternalLink>
                                )}
                                {(isSuperAdmin || isAdmin) && (
                                    <InternalLink 
                                        module={Module.ReativacaoLeads} 
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                                    >
                                        <BookOpenIcon className="w-4 h-4" />
                                        Reativação de Leads
                                    </InternalLink>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {cards.length === 0 && (
                        <div className="text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl p-6">
                            Nenhuma configuração encontrada para "{query}". Pressione Esc para limpar a busca.
                        </div>
                    )}
                    <SettingsSection title="Conteúdo e Inteligência Artificial">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cards.filter(c => ['diagnostic','assistant','knowledge','sectorSync','preferences'].includes(c.id)).map(c => (
                                <SettingsCard key={c.id} icon={c.icon} title={c.title} description={c.description} onClick={() => setActiveModal(c.id)} />
                            ))}
                        </div>
                    </SettingsSection>

                    {canManageApis && (
                        <SettingsSection title="Sistema e Administração">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cards.filter(c => ['apiStatus','userManager','workspaceImport','departments','cargos','serverKeyManager','apiKeyManager','resetCache','emailLogs'].includes(c.id)).map(c => (
                                    <SettingsCard key={c.id} icon={c.icon} title={c.title} description={c.description} onClick={() => setActiveModal(c.id)} />
                                ))}
                            </div>
                        </SettingsSection>
                    )}
                </div>
            </div>
            {activeModal === 'diagnostic' && <DiagnosticSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'assistant' && <AssistantSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'knowledge' && <KnowledgeSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'sectorSync' && <SectorSyncPanel onClose={() => setActiveModal(null)} />}
            {activeModal === 'apiStatus' && <ApiSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'apiKeyManager' && <ApiKeyManagerModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'resetCache' && <ResetCacheModal onClose={() => setActiveModal(null)} />}
            
            {activeModal === 'serverKeyManager' && <ServerKeyManagerModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'userManager' && <UserManagerModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'workspaceImport' && <WorkspaceImportModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'emailLogs' && <EmailLogsPage onClose={() => setActiveModal(null)} />}
            {activeModal === 'preferences' && (
                <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando Preferências...</div>}>
                    <Preferences onClose={() => setActiveModal(null)} />
                </Suspense>
            )}
        </div>
    );
};

const SettingsSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold text-slate-600 mb-4 pb-2 border-b border-slate-200">{title}</h2>
        {children}
    </div>
);

const SettingsCard: React.FC<{title: string, description: string, icon: React.ReactNode, onClick: () => void}> = ({ title, description, icon, onClick}) => (
    <button onClick={onClick} className="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-left space-y-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200">
        <div className="flex items-center gap-4">
            {icon}
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
        <p className="text-slate-500 text-sm">{description}</p>
    </button>
);

export default SettingsPage;