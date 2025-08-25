# Guia do Sistema de Debug Super Admin

## 📋 Visão Geral

O Sistema de Debug Super Admin é uma ferramenta abrangente para testes, debugging e monitoramento em tempo real do sistema. Apenas usuários com role `SUPER_ADMIN` têm acesso a esta funcionalidade.

## 🔐 Controle de Acesso

- **Acesso:** Apenas usuários com `UserRole.SuperAdmin`
- **Segurança:** Verificação automática de permissões
- **Invisível:** Componentes não renderizam para usuários sem permissão

## 🚀 Como Ativar

### Método 1: Atalho de Teclado
```
Ctrl + Shift + D
```

### Método 2: Botão Flutuante
- Aparece no canto inferior direito (ícone 🛡️)
- Cor diferenciada (gradiente vermelho-roxo) para super admins

## 🎛️ Funcionalidades do Painel

### 1. **Sistema** 📊
- **Memória:** Uso de heap JavaScript
- **Rede:** Status de conectividade e tipo de conexão
- **Performance:** Métricas de navegação e renderização
- **Armazenamento:** Uso de localStorage e sessionStorage
- **Ambiente:** Informações do browser e sistema

### 2. **Logs** 📝
- **Captura automática:** Console, erros, promises rejeitadas
- **Filtros avançados:** Por nível, categoria, busca textual
- **Exportação:** Download em JSON com metadados
- **Expansão:** Visualização detalhada de dados e stack traces

### 3. **Autenticação** 🔐
- **Status da sessão:** Informações do usuário logado
- **Verificação:** Testes de sessão e tokens
- **Storage:** Inspeção de dados de auth no localStorage

### 4. **Banco de Dados** 🗄️
- **Teste de conexão:** Latência e status
- **Consultas:** Execução de queries de teste
- **Monitoramento:** Contagem de registros e tabelas

### 5. **APIs** 🔌
- **Status dos serviços:** Supabase, N8N, etc.
- **Testes de conectividade:** Latência e disponibilidade
- **Monitoramento:** Histórico de erros e performance

### 6. **Diagnóstico** 📊
- **Simulação:** Testes com dados mock
- **Validação:** Verificação de perguntas e cálculos
- **Debugging:** Rastreamento do fluxo de diagnóstico

### 7. **N8N** 🔄
- **Webhook:** Testes de integração
- **Payload:** Envio de dados de teste
- **Configuração:** Verificação de URLs e endpoints

### 8. **Testes** 🧪
- **Bateria completa:** Execução de todos os testes
- **Testes individuais:** Por sistema específico
- **Simulações:** Erros, warnings e cenários de teste

## 🛠️ Como Usar em Componentes

### Importar o Hook
```typescript
import { useSuperDebug } from '../hooks/useSuperDebug';
```

### Exemplo Básico
```typescript
const MyComponent = () => {
  const { isSuperAdmin, addDebugLog, debugWrapper } = useSuperDebug();

  const handleAction = async () => {
    return debugWrapper(async () => {
      // Sua lógica aqui
      const result = await someAsyncOperation();
      return result;
    }, 'Executar ação', 'MyComponent');
  };

  useEffect(() => {
    if (isSuperAdmin) {
      addDebugLog('info', 'MyComponent', 'Componente montado');
    }
  }, []);

  return (
    // Seu JSX aqui
  );
};
```

### Debug de Estado
```typescript
const [data, setData] = useState(null);
const { debugState } = useSuperDebug();

useEffect(() => {
  debugState('data', data, 'MyComponent');
}, [data]);
```

### Debug de API
```typescript
const { debugAPI } = useSuperDebug();

const fetchData = async () => {
  const startTime = Date.now();
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    debugAPI('GET', '/api/data', response.status, Date.now() - startTime, data);
    return data;
  } catch (error) {
    debugAPI('GET', '/api/data', undefined, Date.now() - startTime, undefined, error);
    throw error;
  }
};
```

## 🔧 Utilitários de Teste

### Geração de Dados
```typescript
const { testUtils } = useSuperDebug();

// Gerar dados de diagnóstico
const diagnosticData = testUtils.generateTestData('diagnostic');

// Gerar dados de usuário
const userData = testUtils.generateTestData('user');

// Gerar dados de empresa
const companyData = testUtils.generateTestData('company');
```

### Testes de Conectividade
```typescript
const result = await testUtils.testConnectivity('https://api.example.com');
console.log(result); // { success: boolean, status?: number, duration: number }
```

### Simulação de Erros
```typescript
// Para testes de error handling
try {
  testUtils.simulateError('Erro customizado para teste');
} catch (error) {
  // Erro será logado automaticamente no painel
}
```

### Informações do Sistema
```typescript
// Coleta e loga informações detalhadas do sistema
testUtils.logSystemInfo();
```

## 📊 Monitores Automáticos

### Monitor de Erros
```typescript
const { monitors } = useSuperDebug();

useEffect(() => {
  monitors.startErrorMonitor(); // Captura erros globais
}, []);
```

### Monitor de Performance
```typescript
useEffect(() => {
  monitors.startPerformanceMonitor(); // Monitora recursos lentos
}, []);
```

## 🎨 Personalização

### Níveis de Log
- `success` 🟢 - Operações bem-sucedidas
- `info` 🔵 - Informações gerais
- `warn` 🟡 - Avisos e situações de atenção
- `error` 🔴 - Erros e falhas
- `debug` ⚪ - Informações de debug detalhadas

### Categorias Sugeridas
- `Auth` - Autenticação e autorização
- `API` - Chamadas de API
- `Database` - Operações de banco
- `Component` - Lifecycle de componentes
- `State` - Mudanças de estado
- `Performance` - Métricas de performance
- `Test` - Testes e simulações
- `N8N` - Integrações N8N
- `Diagnostic` - Sistema de diagnóstico

## 🚨 Boas Práticas

### 1. **Não Impactar Performance**
```typescript
// ✅ Bom - verificar permissão antes
if (isSuperAdmin) {
  addDebugLog('debug', 'Component', 'Operação complexa', heavyData);
}

// ❌ Ruim - sempre executar
addDebugLog('debug', 'Component', 'Operação complexa', heavyData);
```

### 2. **Logs Informativos**
```typescript
// ✅ Bom - contexto claro
addDebugLog('info', 'UserProfile', 'Perfil carregado com sucesso', { userId, loadTime });

// ❌ Ruim - muito vago
addDebugLog('info', 'App', 'Sucesso');
```

### 3. **Usar debugWrapper para Operações Críticas**
```typescript
// ✅ Bom - captura automática de erros e timing
const result = await debugWrapper(
  () => processPayment(data),
  'Processar pagamento',
  'Payment'
);
```

### 4. **Categorizar Adequadamente**
```typescript
// ✅ Bom - categorias específicas
addDebugLog('error', 'PaymentAPI', 'Falha no processamento');
addDebugLog('info', 'UserAuth', 'Login realizado');
addDebugLog('debug', 'ComponentState', 'Estado atualizado');
```

## 🔄 Integração com Ambiente

### Desenvolvimento
- Painel sempre disponível para super admins
- Logs detalhados habilitados
- Monitores automáticos ativos

### Produção
- Apenas super admins têm acesso
- Logs otimizados para performance
- Dados sensíveis filtrados automaticamente

## 📱 Responsividade

- **Desktop:** Painel lateral de 500px
- **Mobile:** Adaptação automática
- **Minimização:** Modo compacto disponível

## 🔒 Segurança

- **Verificação de role:** A cada renderização
- **Dados sensíveis:** Truncamento automático
- **Exportação:** Apenas metadados essenciais
- **Logs:** Rotação automática (máximo 500 entradas)

## 🆘 Resolução de Problemas

### Painel Não Aparece
1. Verificar se usuário tem role `SUPER_ADMIN`
2. Tentar atalho `Ctrl+Shift+D`
3. Verificar console do browser por erros

### Logs Não Aparecem
1. Verificar se `window.superDebugLog` existe
2. Confirmar que componente está usando `useSuperDebug`
3. Verificar se há filtros ativos no painel

### Performance Lenta
1. Limpar logs antigos (botão 🗑️)
2. Reduzir frequência de logs de debug
3. Usar filtros para reduzir exibição

## 📞 Suporte

Para dúvidas ou problemas com o sistema de debug:
1. Verificar este guia primeiro
2. Consultar exemplos em `DebugExampleUsage.tsx`
3. Usar o próprio painel para debugar problemas

---

**Nota:** Este sistema é uma ferramenta poderosa. Use com responsabilidade e sempre verifique se não há vazamento de dados sensíveis em produção.
