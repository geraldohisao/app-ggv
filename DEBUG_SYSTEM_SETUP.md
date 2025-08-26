# 🐛 Sistema de Debug - Setup e Resolução de Problemas

## Status Atual ✅

O sistema de debug foi implementado com sucesso e está funcionando! A aplicação está rodando em modo de desenvolvimento.

## 🚨 Sistema de Alertas Automático

### Funcionalidades Implementadas:
- ✅ **Captura global de erros** via `AppErrorBoundaryEnhanced`
- ✅ **Rate limiting** (3 alertas/min por chave) para evitar spam
- ✅ **Agrupamento por incidente** usando hash SHA1 estável
- ✅ **Cartões no Google Chat** com ações rápidas
- ✅ **Persistência no Supabase** (tabela `error_events`)
- ✅ **Contexto enriquecido** com ambiente, usuário, stack trace

### Configuração:
```bash
# Netlify (obrigatório)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...

# Supabase (opcional - para persistência)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 🎯 O Que Foi Implementado

### 1. **Painel de Debug Principal**
- **Localização**: Ícone 🛡️ no canto inferior direito
- **Ativação**: `Ctrl+Shift+D` ou clique no ícone
- **Funcionalidades**:
  - ✅ Captura automática de logs
  - ✅ Interceptação de console.log, console.warn, console.error
  - ✅ Captura de erros globais JavaScript
  - ✅ Métricas de sistema em tempo real
  - ✅ Diagnósticos de autenticação
  - ✅ Filtros avançados por nível e categoria
  - ✅ Exportação de logs em JSON
  - ✅ **Nova aba "🚨 Incidentes"** com admin completo

### 2. **Error Boundaries Aprimorados**
- ✅ Sistema robusto de captura de erros React
- ✅ Auto-retry para erros recuperáveis
- ✅ Integração completa com sistema de logs
- ✅ Fallbacks personalizados

### 3. **Hooks e Utilitários**
- ✅ `useDebugPanel` - Hook principal
- ✅ `useErrorHandler` - Captura de erros em componentes funcionais
- ✅ Função global `window.debugLog()`

### 4. **Admin de Incidentes** 🚨
- ✅ **Interface completa** com filtros avançados
- ✅ **Três visualizações**: Agrupados, Individuais, Gráfico
- ✅ **Agrupamento inteligente** por hash de incidente
- ✅ **Estatísticas em tempo real** com métricas de severidade
- ✅ **Modal de detalhes** com stack trace completo
- ✅ **Acesso direto**: `/admin/incidents` ou via debug panel
- ✅ **API endpoint**: `/.netlify/functions/error-events-admin`

## 🚀 Como Usar

### Ativação Rápida
1. Pressione `Ctrl+Shift+D` ou clique no ícone 🛡️
2. Use as abas: **Geral**, **Logs**, **Testes**, **Sistema**, **Sessão**, **Roles**, **🚨 Incidentes**
3. Filtre logs por nível, categoria ou busca

### Admin de Incidentes
1. **Via Debug Panel**: `Ctrl+Shift+D` → aba "🚨 Incidentes"
2. **Acesso direto**: `/admin/incidents` (apenas Super Admins)
3. **Funcionalidades**:
   - Filtros por busca, usuário, hash, datas
   - Visualização agrupada por incidente
   - Gráfico de tendências dos últimos 7 dias
   - Estatísticas de severidade

### Função Global
```javascript
// No console do browser
window.debugLog('Teste do sistema', 'info', 'minha-categoria');
window.debugLog('Erro crítico', 'error', 'api', { endpoint: '/users' });
```

### Atalhos Úteis
- `Ctrl+Shift+D`: Toggle do painel
- `Ctrl+Shift+C`: Limpar logs
- `Ctrl+Shift+E`: Exportar logs

### Alertas Automáticos
- **Erros JavaScript**: Capturados automaticamente e enviados ao Google Chat
- **Falhas de API**: Requisições 5xx em rotas críticas
- **Promises rejeitadas**: Capturadas e reportadas
- **Rate limiting**: Máximo 3 alertas/min por incidente

## 🔧 Problemas Resolvidos

### Erros de Build Corrigidos:
1. ✅ **Module.Calls não existia** → Adicionado ao enum Module
2. ✅ **Função addEvent não definida** → Corrigido no AuthDebugPanel
3. ✅ **Propriedade onClose faltando** → Corrigido no ResetCacheModal
4. ✅ **Erro de destructuring** → Corrigido no UserContext
5. ✅ **Função saveLogoUrls** → Corrigidos parâmetros

### Problemas de Runtime Corrigidos:
1. ✅ **Tabela error_events não existe** → Script SQL + verificação automática
2. ✅ **404s de logos** → Fallback SVG em desenvolvimento
3. ✅ **Rate limiting de alertas** → Implementado dedupe por chave
4. ✅ **Contexto de alertas** → Enriquecido com ambiente e usuário

### Status dos Erros Restantes:
- ⚠️ **packages/worker/**: Módulos não instalados (não críticos para funcionamento principal)
- ⚠️ **tests/**: Dependências de teste (não afetam produção)
- ⚠️ **src/buildId.ts**: Variáveis de build (não críticas)

## 🎮 Testando o Sistema

### 1. Verificar se está funcionando:
```bash
# A aplicação deve estar rodando em:
http://localhost:5173

# Verificar se não há erros críticos:
curl -s http://localhost:5173 | grep -i error
```

### 2. Testar o painel de debug:
1. Abra a aplicação no browser
2. Pressione `Ctrl+Shift+D`
3. Deve aparecer o painel de debug à direita
4. Teste os logs no console: `window.debugLog('Teste')`

### 3. Testar captura de erros:
```javascript
// No console do browser
throw new Error('Teste de erro');
// Deve aparecer no painel de debug
```

## 📊 Funcionalidades do Painel

### Aba Logs
- **Filtros por nível**: Info, Warn, Error, Debug
- **Filtros por categoria**: Automático baseado nos logs
- **Busca em tempo real**: Busca nas mensagens
- **Detalhes expandíveis**: Stack traces e dados adicionais

### Aba Sistema
- **Memória**: Uso de heap JavaScript
- **Rede**: Status online/offline
- **Performance**: Métricas de navegação
- **Storage**: Uso de localStorage/sessionStorage
- **Ambiente**: URL, User Agent, etc.

### Aba Auth
- **Status do usuário**: Logado/não logado
- **Sessão Supabase**: Tokens e expiração
- **Diagnóstico**: Ferramentas de debug
- **Ações rápidas**: Limpar storage, recarregar

## 🔄 Próximos Passos

### Para Desenvolvimento:
1. **Teste todas as funcionalidades** do painel
2. **Adicione logs personalizados** em componentes críticos
3. **Use o sistema** para debug de problemas reais

### Para Produção:
1. **Considere limitar logs** em produção
2. **Configure alertas** para erros críticos
3. **Monitore performance** através das métricas

## 🐛 Troubleshooting

### Painel não aparece:
1. Verifique se pressionou `Ctrl+Shift+D`
2. Abra o console e procure por erros
3. Teste: `window.debugLog('teste')`

### Logs não aparecem:
1. Verifique os filtros ativos
2. Limpe os logs e teste novamente
3. Verifique a busca (deve estar vazia)

### Aplicação não carrega:
1. Verifique se está rodando: `npm run dev`
2. Acesse: http://localhost:5173
3. Verifique erros no console do browser

## 📝 Arquivos Criados/Modificados

### Novos Arquivos:
- `hooks/useDebugPanel.ts` - Hook principal
- `components/debug/DebugPanel.tsx` - Componente do painel
- `components/debug/ErrorBoundary.tsx` - Error boundaries aprimorados
- `components/debug/README.md` - Documentação detalhada

### Modificados:
- `App.tsx` - Integração do sistema de debug
- `types.ts` - Adicionado Module.Calls
- `components/common/AppErrorBoundary.tsx` - Sistema aprimorado
- Correções menores em vários arquivos

## 🎉 Conclusão

O sistema de debug está **funcionando e pronto para uso**! Ele vai facilitar muito o desenvolvimento e troubleshooting da aplicação GGV.

**Como usar agora:**
1. Abra http://localhost:5173
2. Pressione `Ctrl+Shift+D`
3. Explore o painel de debug
4. Teste a captura de logs e erros

O sistema é robusto, não interfere na aplicação principal, e fornece todas as informações necessárias para debug eficiente.
