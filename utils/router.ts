import { Module } from '../types';

// Mapeamento entre URLs e módulos
export const moduleRoutes: Record<string, Module> = {
    '/': Module.Diagnostico,
    '/diagnostico-comercial': Module.Diagnostico,
    '/assistente': Module.Assistente,
    '/calculadora': Module.Calculadora,
    '/chamadas': Module.Calls,
    '/configuracoes': Module.Settings,
    '/feedback': Module.OpportunityFeedback,
    '/reativacao': Module.ReativacaoLeads,
    '/ordens-servico': Module.OSManager,
};

// Mapeamento reverso: módulo para URL
export const routeModules: Record<Module, string> = {
    [Module.Login]: '/login',
    [Module.Diagnostico]: '/',
    [Module.Assistente]: '/assistente',
    [Module.Calculadora]: '/calculadora',
    [Module.Calls]: '/chamadas',
    [Module.Settings]: '/configuracoes',
    [Module.OpportunityFeedback]: '/feedback',
    [Module.ReativacaoLeads]: '/reativacao',
    [Module.OSManager]: '/ordens-servico',
};

// Função para obter o módulo baseado na URL atual
export const getModuleFromPath = (pathname: string): Module => {
    console.log('🔍 ROUTER - Resolvendo pathname:', pathname);
    console.log('🔍 ROUTER - Módulos disponíveis:', Object.keys(moduleRoutes));
    
    // Normalizar pathname removendo barra final se existir
    const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    console.log('🔍 ROUTER - Pathname normalizado:', normalizedPathname);
    
    const module = moduleRoutes[normalizedPathname] || Module.Diagnostico;
    console.log('🔍 ROUTER - Módulo resolvido:', module);
    
    return module;
};

// Função para navegar para um módulo específico
export const navigateToModule = (module: Module) => {
    const path = routeModules[module];
    if (path && window.location.pathname !== path) {
        window.history.pushState(null, '', path);
        // Disparar evento customizado para notificar componentes sobre mudança de rota
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { module, path } }));
    }
};

// Função para obter URL de um módulo
export const getModuleUrl = (module: Module): string => {
    return routeModules[module] || '/';
};

// Hook personalizado para gerenciar navegação
export const useRouter = () => {
    const getCurrentModule = (): Module => {
        return getModuleFromPath(window.location.pathname);
    };

    const navigate = (module: Module) => {
        navigateToModule(module);
    };

    const getUrl = (module: Module): string => {
        return getModuleUrl(module);
    };

    return {
        getCurrentModule,
        navigate,
        getUrl,
    };
};

// Função para verificar se uma rota é standalone (sem header)
export const isStandalonePage = (pathname: string): boolean => {
    const standaloneRoutes = ['/diagnostico', '/resultado-diagnostico'];
    return standaloneRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/r/');
};
