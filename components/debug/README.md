# Sistema de Debug - GGV App

## Visão Geral

Sistema completo de debug e monitoramento desenvolvido para facilitar o desenvolvimento e troubleshooting da aplicação GGV. O sistema captura automaticamente erros, logs, métricas de performance e informações do sistema.

## Funcionalidades

### 🐛 Painel de Debug Principal
- **Localização**: Ícone flutuante no canto inferior direito
- **Ativação**: Clique no ícone ou `Ctrl+Shift+D`
- **Abas disponíveis**:
  - **Logs**: Todos os logs da aplicação com filtros avançados
  - **Sistema**: Métricas de performance e informações do ambiente
  - **Auth**: Status de autenticação e diagnósticos de sessão

### 📊 Captura Automática de Logs
- **Console intercept**: Captura automaticamente `console.log`, `console.warn`, `console.error`, `console.debug`
- **Erros globais**: Captura erros JavaScript não tratados
- **Promise rejections**: Captura promises rejeitadas
- **Erros de componente**: Integração com Error Boundaries

### ⚡ Métricas de Performance
- **Memória**: Uso de heap JavaScript
- **Rede**: Status de conexão e tipo de rede
- **Performance**: Tempos de navegação e render
- **Storage**: Uso de localStorage e sessionStorage

### 🔐 Diagnósticos de Autenticação
- **Status da sessão**: Informações detalhadas da sessão Supabase
- **Tokens**: Visualização de access e refresh tokens
- **Diagnóstico automático**: Ferramentas para debug de problemas de auth

## Como Usar

### Atalhos de Teclado
- `Ctrl+Shift+D`: Toggle do painel de debug
- `Ctrl+Shift+C`: Limpar logs (quando painel está aberto)
- `Ctrl+Shift+E`: Exportar logs (quando painel está aberto)

### Função Global `debugLog`
```javascript
// Disponível no console do browser
window.debugLog('Mensagem de teste', 'info', 'minha-categoria', { dados: 'extras' });

// Níveis disponíveis: 'info', 'warn', 'error', 'debug'
window.debugLog('Erro crítico', 'error', 'api');
window.debugLog('Aviso importante', 'warn', 'validacao');
window.debugLog('Informação', 'info', 'user-action');
window.debugLog('Debug detalhado', 'debug', 'internal');
```

### Uso Programático
```typescript
import { useDebugPanel } from '../../hooks/useDebugPanel';

const MyComponent = () => {
  const { addLog } = useDebugPanel();
  
  const handleAction = () => {
    addLog({
      level: 'info',
      message: 'Ação executada com sucesso',
      category: 'user-interaction',
      data: { userId: 123, action: 'click' }
    });
  };
  
  return <button onClick={handleAction}>Executar</button>;
};
```

### Error Boundaries Aprimorados
```typescript
import { ErrorBoundaryWrapper } from '../debug/ErrorBoundary';

const MyComponent = () => (
  <ErrorBoundaryWrapper name="MyComponent">
    <ComponenteQuePoderiaFalhar />
  </ErrorBoundaryWrapper>
);
```

## Filtros e Busca

### Filtros por Nível
- **Info**: Informações gerais
- **Warn**: Avisos
- **Error**: Erros
- **Debug**: Logs de desenvolvimento

### Filtros por Categoria
- **global-error**: Erros JavaScript globais
- **promise-rejection**: Promises rejeitadas
- **console**: Logs do console
- **debug-panel**: Logs do próprio sistema de debug
- **network**: Eventos de rede
- **app-error**: Erros capturados por Error Boundaries
- **user-interaction**: Ações do usuário
- **api**: Chamadas de API
- **auth**: Autenticação

### Busca por Texto
- Busca em tempo real nas mensagens de log
- Case-insensitive
- Busca em todo o conteúdo da mensagem

## Exportação de Logs

O sistema permite exportar todos os logs em formato JSON incluindo:
- Logs filtrados ou completos
- Métricas do sistema
- Informações do ambiente
- Timestamp da exportação
- Dados do usuário (se logado)

### Formato do Export
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "user": "usuario@exemplo.com",
  "url": "https://app.ggv.com.br/diagnostico",
  "userAgent": "Mozilla/5.0...",
  "metrics": {
    "memory": { "used": 12345678, "total": 67890123 },
    "performance": { "navigation": 1234, "render": 567 },
    "network": { "online": true, "effectiveType": "4g" },
    "storage": { "localStorage": 1024, "sessionStorage": 512 }
  },
  "logs": [
    {
      "id": "1642248600000-abc123",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "level": "error",
      "message": "Erro na API",
      "category": "api",
      "data": { "endpoint": "/users", "status": 500 },
      "source": "https://app.ggv.com.br/script.js",
      "stack": "Error: API failed\n    at fetch..."
    }
  ]
}
```

## Configuração e Personalização

### Limites de Log
- **Máximo de logs**: 500 (configurável via `maxLogs`)
- **Limpeza automática**: Remove logs antigos quando excede o limite
- **Buffer de logs**: Mantém logs mesmo quando painel está fechado

### Coleta de Métricas
- **Intervalo**: A cada 5 segundos
- **Métricas coletadas**: Memória, performance, rede, storage
- **Detecção de mudanças**: Eventos online/offline automáticos

## Integração com Desenvolvimento

### Console Global
Todas as funções de debug estão disponíveis no console:
```javascript
// Diagnóstico de autenticação
window.diagAuth();

// Log manual
window.debugLog('Teste', 'info', 'manual');

// Acesso ao estado do debug (se painel estiver ativo)
window.__debugPanelAddLog({ level: 'info', message: 'Teste', category: 'external' });
```

### Ambiente de Desenvolvimento
- **Detalhes expandidos**: Stack traces completos em desenvolvimento
- **Auto-retry**: Tentativa automática de recuperação de erros
- **Logs detalhados**: Informações técnicas adicionais

## Troubleshooting

### Painel Não Aparece
1. Verifique se pressionou `Ctrl+Shift+D`
2. Verifique o console por erros JavaScript
3. Tente recarregar a página

### Logs Não Aparecem
1. Verifique os filtros ativos
2. Verifique se a busca está vazia
3. Limpe os logs e tente novamente

### Performance
- O sistema é otimizado para produção
- Logs são limitados automaticamente
- Interceptação de console é removida ao desmontar

## Segurança

- **Produção**: Logs sensíveis são filtrados
- **Desenvolvimento**: Informações completas disponíveis
- **Exportação**: Não inclui dados sensíveis como tokens completos
- **Local**: Todos os dados ficam no browser, nada é enviado para servidores

## Compatibilidade

- **Browsers**: Todos os browsers modernos
- **React**: Versões 16.8+
- **TypeScript**: Tipagem completa
- **Mobile**: Interface responsiva
