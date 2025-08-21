import { useState, useEffect } from 'react';
import { Module } from '../types';
import { getModuleFromPath, navigateToModule, getModuleUrl } from '../utils/router';

/**
 * Hook personalizado para gerenciar navegação no sistema
 */
export const useNavigation = () => {
    const [currentModule, setCurrentModule] = useState<Module>(() => 
        getModuleFromPath(window.location.pathname)
    );

    useEffect(() => {
        const handleRouteChange = (event: CustomEvent) => {
            const { module } = event.detail;
            setCurrentModule(module);
        };

        const handlePopState = () => {
            const newModule = getModuleFromPath(window.location.pathname);
            setCurrentModule(newModule);
        };

        window.addEventListener('routeChange', handleRouteChange as EventListener);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('routeChange', handleRouteChange as EventListener);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const navigate = (module: Module) => {
        navigateToModule(module);
    };

    const getUrl = (module: Module): string => {
        return getModuleUrl(module);
    };

    const isCurrentModule = (module: Module): boolean => {
        return currentModule === module;
    };

    return {
        currentModule,
        navigate,
        getUrl,
        isCurrentModule,
    };
};
