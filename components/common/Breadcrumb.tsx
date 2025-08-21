import React from 'react';
import { Module } from '../../types';
import { ArrowRightIcon } from '../ui/icons';
import InternalLink from './InternalLink';

interface BreadcrumbItem {
    module: Module;
    label: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

// Mapeamento de módulos para labels amigáveis
const moduleLabels: Record<Module, string> = {
    [Module.Login]: 'Login',
    [Module.Diagnostico]: 'Diagnóstico Comercial',
    [Module.Assistente]: 'Assistente IA',
    [Module.Calculadora]: 'Calculadora OTE',
    [Module.Calls]: 'Chamadas',
    [Module.Settings]: 'Configurações',
    [Module.OpportunityFeedback]: 'Feedback de Oportunidade',
    [Module.ReativacaoLeads]: 'Reativação de Leads',
};

/**
 * Componente de breadcrumb para navegação hierárquica
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
    if (items.length === 0) return null;

    return (
        <nav className={`flex items-center space-x-1 text-sm text-slate-500 ${className}`}>
            {items.map((item, index) => (
                <React.Fragment key={item.module}>
                    {index > 0 && (
                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                    )}
                    {index === items.length - 1 ? (
                        // Último item - não é clicável
                        <span className="text-slate-800 font-medium">
                            {item.label || moduleLabels[item.module]}
                        </span>
                    ) : (
                        // Itens anteriores - são clicáveis
                        <InternalLink 
                            module={item.module}
                            className="hover:text-slate-700 transition-colors"
                        >
                            {item.label || moduleLabels[item.module]}
                        </InternalLink>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
