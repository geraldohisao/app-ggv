# Implementação: Reativação de Leads (N8N)

## ✅ Funcionalidades Implementadas

### 1. Schema de Validação (Zod)
- **Arquivo**: `src/schemas/reativacao.ts`
- Validação rigorosa dos campos exigidos pelo N8N
- Tipos TypeScript para type safety
- Valores padrão configurados

### 2. Serviço Frontend
- **Arquivo**: `services/automationService.ts`
- Função `triggerReativacao()` para enviar dados ao backend
- Tratamento de erros e respostas

### 3. Backend Proxy Seguro
- **Arquivo**: `packages/api/src/routes/automation.ts`
- Rota `/automation/reactivation` registrada
- Validação de entrada com Zod
- Timeout configurável (15s padrão)
- Logs detalhados para debug
- Modo mock quando URL não configurada

### 4. Interface Administrativa
- **Arquivo**: `components/ReativacaoLeadsPage.tsx`
- Formulário completo com validação
- Feedback visual de sucesso/erro
- Integração com Debug Panel
- Acesso restrito a ADMIN e SUPER_ADMIN

### 5. Sistema de Módulos
- **Arquivo**: `types.ts` - Adicionado `Module.ReativacaoLeads`
- **Arquivo**: `App.tsx` - Registrado novo módulo
- **Arquivo**: `components/UserMenu.tsx` - Item de menu para admins

### 6. Debug e Telemetria
- Logs no Debug Panel (categoria AUTOMATION)
- Telemetria completa de requisições
- Detalhes técnicos em caso de erro

## 🔧 Configuração Necessária

### Variáveis de Ambiente (Backend)
```bash
# packages/api/.env
N8N_REACTIVATION_WEBHOOK_URL=https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads
N8N_TIMEOUT_MS=15000
```

## 📋 Payload Enviado ao N8N

```json
{
  "filtro": "Lista de reativação - Topo de funil",
  "proprietario": "Andressa",
  "cadencia": "Reativação - Sem Retorno",
  "numero_negocio": 20
}
```

## 🎯 Campos Disponíveis

### Filtro
- "Lista de reativação - Topo de funil - NO SHOW"
- "Lista de reativação - Topo de funil"
- "Lista de reativação - Fundo de funil"

### Proprietário (SDR)
- "Andressa"
- "Camila Ataliba"
- "Isabel Pestilho"
- "Lô-Ruama Oliveira"
- "Mariana"

### Cadência
- "Reativação - Sem Retorno" (padrão)

### Número de Negócios
- 1-1000 (padrão: 20)

## 🔒 Segurança

- ✅ Acesso restrito a ADMIN e SUPER_ADMIN
- ✅ Validação rigorosa de entrada
- ✅ Proxy seguro (não expõe credenciais)
- ✅ Timeout para evitar travamentos
- ✅ Logs para auditoria

## 🚀 Como Usar

1. **Configure as variáveis de ambiente** no backend
2. **Acesse como ADMIN/SUPER_ADMIN**
3. **Vá para "Reativação de Leads (N8N)"** no menu do usuário
4. **Preencha o formulário** com os dados desejados
5. **Clique em "Ativar Automação"**
6. **Monitore os logs** no Debug Panel (categoria AUTOMATION)

## 📊 Debug e Monitoramento

### Logs no Debug Panel
- `reativacao:submit` - Dados enviados
- `reativacao:success` - Sucesso da operação
- `reativacao:error` - Erros ocorridos

### Logs no Backend
- `[AUTOMATION] reactivation -> forwarding` - Envio para N8N
- `[AUTOMATION] reactivation -> success` - Sucesso
- `[AUTOMATION] error` - Erros

## 🧪 Modo Teste

Quando a variável `N8N_REACTIVATION_WEBHOOK_URL` não estiver configurada:
- A interface exibe "modo teste"
- Nenhum dado é enviado ao N8N
- Retorna `{ ok: true, mock: true }`

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- `src/schemas/reativacao.ts`
- `services/automationService.ts`
- `packages/api/src/routes/automation.ts`
- `components/ReativacaoLeadsPage.tsx`
- `N8N_INTEGRATION_SETUP.md`

### Arquivos Modificados
- `types.ts` - Adicionado Module.ReativacaoLeads
- `App.tsx` - Registrado novo módulo
- `components/UserMenu.tsx` - Adicionado item de menu
- `packages/api/src/routes.ts` - Registrada rota de automação

## ✅ Critérios de Aceite Atendidos

- ✅ Form valida e envia nomes de campos idênticos aos do N8N
- ✅ Backend proxy recebe e encaminha ao webhook configurado
- ✅ Retorna `{ ok: true, forwarded: true }` em sucesso
- ✅ Em ausência de URL, retorna `{ ok: true, mock: true }`
- ✅ Logs aparecem no Debug Panel (AUTOMATION)
- ✅ CORS não bloqueia o fluxo (chamada é do front → backend → N8N)
- ✅ Visível somente para ADMIN e SUPER_ADMIN
- ✅ Toasts de sucesso/erro implementados
- ✅ Resumo do envio com detalhes técnicos
