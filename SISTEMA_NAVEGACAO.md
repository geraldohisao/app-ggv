# Sistema de Navegação Interna

Este documento descreve o novo sistema de navegação interna implementado no sistema.

## Visão Geral

O sistema de navegação permite navegar entre páginas usando URLs específicas, mantendo o estado da aplicação e proporcionando uma experiência mais intuitiva para os usuários.

## Rotas Disponíveis

### Páginas Principais (com Header)
- `/` - Diagnóstico Comercial (página inicial)
- `/assistente` - Assistente IA
- `/calculadora` - Calculadora OTE
- `/chamadas` - Sistema de Chamadas
- `/configuracoes` - Configurações (apenas Admin/SuperAdmin)
- `/feedback` - Feedback de Oportunidade
- `/reativacao` - Reativação de Leads (apenas Admin/SuperAdmin)

### Páginas Standalone (sem Header)
- `/diagnostico` - Diagnóstico Standalone
- `/resultado-diagnostico` - Resultado Público
- `/r/:token` - Relatório Diagnóstico Público

## Componentes Disponíveis

### 1. InternalLink
Componente para criar links internos no sistema.

```tsx
import InternalLink from './common/InternalLink';
import { Module } from '../types';

// Exemplo de uso
<InternalLink 
    module={Module.Assistente}
    className="text-blue-600 hover:text-blue-800"
>
    Ir para Assistente IA
</InternalLink>
```

### 2. Breadcrumb
Componente para navegação hierárquica.

```tsx
import Breadcrumb from './common/Breadcrumb';
import { Module } from '../types';

// Exemplo de uso
<Breadcrumb 
    items={[
        { module: Module.Diagnostico, label: 'Início' },
        { module: Module.Settings, label: 'Configurações' }
    ]} 
    className="mb-4"
/>
```

### 3. Hook useNavigation
Hook para gerenciar navegação programaticamente.

```tsx
import { useNavigation } from '../hooks/useNavigation';

const MyComponent = () => {
    const { navigate, currentModule, isCurrentModule } = useNavigation();
    
    const handleNavigate = () => {
        navigate(Module.Assistente);
    };
    
    return (
        <div>
            <p>Módulo atual: {currentModule}</p>
            <button 
                onClick={handleNavigate}
                className={isCurrentModule(Module.Assistente) ? 'active' : ''}
            >
                Ir para Assistente
            </button>
        </div>
    );
};
```

## Funções Utilitárias

### router.ts
Arquivo com funções utilitárias para navegação:

```tsx
import { navigateToModule, getModuleUrl, getModuleFromPath } from '../utils/router';

// Navegar programaticamente
navigateToModule(Module.Assistente);

// Obter URL de um módulo
const url = getModuleUrl(Module.Calculadora); // retorna '/calculadora'

// Obter módulo da URL atual
const currentModule = getModuleFromPath(window.location.pathname);
```

## Implementação em Páginas Existentes

### Adicionando Breadcrumb
1. Importe os componentes necessários:
```tsx
import Breadcrumb from './common/Breadcrumb';
import { Module } from '../types';
```

2. Adicione o breadcrumb no header da página:
```tsx
<header className="p-6">
    <div className="mb-4">
        <Breadcrumb 
            items={[
                { module: Module.Diagnostico, label: 'Início' },
                { module: Module.MinhaPage, label: 'Minha Página' }
            ]} 
        />
    </div>
    <h1>Título da Página</h1>
</header>
```

### Adicionando Links de Navegação
```tsx
<div className="flex gap-4">
    <InternalLink 
        module={Module.Diagnostico}
        className="btn btn-primary"
    >
        Voltar ao Diagnóstico
    </InternalLink>
    
    <InternalLink 
        module={Module.Settings}
        className="btn btn-secondary"
    >
        Configurações
    </InternalLink>
</div>
```

## Benefícios

1. **URLs Amigáveis**: Cada página tem uma URL específica que pode ser compartilhada
2. **Navegação por Browser**: Botões voltar/avançar funcionam corretamente
3. **Bookmarks**: Usuários podem marcar páginas específicas
4. **SEO Friendly**: URLs semânticas melhoram a indexação
5. **Experiência Consistente**: Navegação uniforme em todo o sistema
6. **Breadcrumbs**: Facilita orientação do usuário no sistema

## Exemplos de Uso

### Página com Navegação Rápida
```tsx
const MinhaPage = () => {
    return (
        <div>
            <header>
                <Breadcrumb items={[...]} />
                <h1>Minha Página</h1>
            </header>
            
            <nav className="quick-nav">
                <h3>Navegação Rápida</h3>
                <div className="flex gap-2">
                    <InternalLink module={Module.Diagnostico}>
                        Diagnóstico
                    </InternalLink>
                    <InternalLink module={Module.Assistente}>
                        Assistente IA
                    </InternalLink>
                    <InternalLink module={Module.Calculadora}>
                        Calculadora
                    </InternalLink>
                </div>
            </nav>
            
            <main>
                {/* Conteúdo da página */}
            </main>
        </div>
    );
};
```

### Navegação Programática
```tsx
const MyComponent = () => {
    const { navigate } = useNavigation();
    
    const handleCompleteTask = () => {
        // Fazer alguma ação
        // ...
        
        // Navegar para outra página
        navigate(Module.Settings);
    };
    
    return (
        <button onClick={handleCompleteTask}>
            Completar e ir para Configurações
        </button>
    );
};
```

## Notas Técnicas

- O sistema usa `window.history.pushState` para navegação sem reload
- Eventos customizados (`routeChange`) notificam componentes sobre mudanças de rota
- O estado da aplicação é preservado durante a navegação
- Compatível com React Router (usado apenas para páginas standalone)
- Funciona com botões voltar/avançar do browser
