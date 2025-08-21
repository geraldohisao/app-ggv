import React from 'react';
import { Module } from '../../types';
import { navigateToModule, getModuleUrl } from '../../utils/router';

interface InternalLinkProps {
    module: Module;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Componente para criar links internos no sistema
 * Utiliza o sistema de roteamento customizado para navegação
 */
const InternalLink: React.FC<InternalLinkProps> = ({ 
    module, 
    children, 
    className = '',
    onClick 
}) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        navigateToModule(module);
        onClick?.();
    };

    return (
        <a 
            href={getModuleUrl(module)}
            onClick={handleClick}
            className={className}
        >
            {children}
        </a>
    );
};

export default InternalLink;
