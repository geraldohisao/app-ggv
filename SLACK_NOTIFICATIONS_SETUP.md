# Sistema de Notificações para Slack

Este documento descreve como configurar e usar o sistema de notificações unificado que envia alertas de erros críticos para Slack e Google Chat simultaneamente.

## 📋 Visão Geral

O sistema foi expandido para enviar notificações de erro para múltiplos canais:
- **Google Chat** (mantido sem alterações)
- **Slack** (novo canal implementado)

### Características:
- ✅ Envio simultâneo para ambos os canais
- ✅ Rich formatting para Slack (blocks, botões, etc.)
- ✅ Fallback para canal original em caso de erro
- ✅ Deduplicação e rate limiting mantidos
- ✅ Persistência no Supabase para ambos os canais

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no painel de ambiente do Netlify:

```env
# Webhook do Google Chat (existente)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/YOUR_SPACE/messages?key=YOUR_KEY&token=YOUR_TOKEN

# Webhook do Slack (novo)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 2. Configuração do Slack Webhook

1. Acesse https://api.slack.com/apps
2. Clique em "Create New App" → "From scratch"
3. Nome: "Sistema de Alertas GGV"
4. Selecione o workspace desejado
5. Vá em "Incoming Webhooks" → Enable
6. Clique em "Add New Webhook to Workspace"
7. Selecione o canal desejado (ex: #alertas-sistema)
8. Copie a URL gerada e adicione em `SLACK_WEBHOOK_URL`

### 3. Estrutura dos Arquivos

```
netlify/functions/
├── alert.js           # Função original (Google Chat)
├── slack-alert.js     # Nova função (Slack)

src/
├── utils/
│   ├── notifications.ts   # Sistema unificado
│   └── net.ts            # Atualizado para usar novo sistema
└── debug/
    └── gateway.ts        # Atualizado para usar novo sistema
```

## 🚀 Uso

### Sistema Automático

O sistema captura automaticamente:
- ❌ Erros JavaScript não tratados
- 🌐 Falhas de requisições HTTP críticas (status ≥ 500)
- 🔥 Erros marcados como críticos no sistema de debug

### Envio Manual

```typescript
import { sendCriticalAlert } from './utils/notifications';

await sendCriticalAlert({
  title: 'Erro Crítico Detectado',
  message: 'Descrição detalhada do erro',
  context: {
    user: {
      name: 'João Silva',
      email: 'joao@empresa.com',
      role: 'admin'
    },
    url: window.location.href,
    stack: error.stack,
    userAgent: navigator.userAgent,
    appVersion: '1.0.0',
    tags: ['critical', 'payment']
  }
});
```

### Canais Específicos

```typescript
import { sendNotifications } from './utils/notifications';

// Apenas Slack
await sendNotifications(payload, ['slack']);

// Apenas Google Chat
await sendNotifications(payload, ['google-chat']);

// Ambos (padrão)
await sendNotifications(payload, ['google-chat', 'slack']);
```

## 📊 Formatação das Mensagens

### Google Chat
- Mantém formato original
- Cards com botões de ação
- Texto simples e código em blocos

### Slack
- **Rich Blocks**: Seções organizadas
- **Campos estruturados**: Informações em grid
- **Botões de ação**: Links para página e busca
- **Code blocks**: Stack traces formatados
- **Emojis**: Visual mais amigável

## 🧪 Testes

Use o arquivo `test-slack-notifications.html` para testar:

1. Abra o arquivo no navegador
2. Configure as variáveis de ambiente
3. Execute os testes disponíveis:
   - Teste simples
   - Erro crítico com stack trace
   - Teste com contexto de usuário
   - Teste em lote

### Testes Automatizados

```bash
# Via linha de comando (se configurado)
curl -X POST https://app.grupoggv.com/.netlify/functions/slack-alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste de API",
    "message": "Teste via curl",
    "context": {"url": "https://example.com"}
  }'
```

## 🔍 Monitoramento

### Logs de Sucesso/Erro

O sistema registra logs para cada canal:
- ✅ `Alert sent to slack`
- ✅ `Alert sent to google-chat`
- ❌ `Failed to send alert to slack: [erro]`

### Persistência no Supabase

Todas as notificações são salvas na tabela `error_events` com:
- Campo `notification_channel`: 'slack' ou 'google-chat'
- Todos os dados do contexto do erro
- Hash do incidente para deduplicação

## 🔧 Manutenção

### Rate Limiting

O sistema mantém rate limiting de:
- **3 alertas por minuto** por tipo de erro
- Deduplicação baseada em hash do incidente
- Cache no sessionStorage do navegador

### Fallback

Se o sistema unificado falhar:
1. Log de erro é registrado
2. Sistema volta para método original (Google Chat)
3. Usuário ainda recebe notificação

### Troubleshooting

#### Slack não recebe mensagens:
1. Verifique `SLACK_WEBHOOK_URL`
2. Confirme permissões do app Slack
3. Teste webhook manualmente

#### Google Chat para de funcionar:
1. Verifique `GOOGLE_CHAT_WEBHOOK_URL`
2. Sistema continua enviando para Slack
3. Logs mostrarão falha específica

#### Nenhum canal funciona:
1. Sistema usa fallback automático
2. Verifique logs do Netlify Functions
3. Teste com `test-slack-notifications.html`

## 🛠 Desenvolvimento

### Adicionar Novos Canais

Para adicionar um novo canal (ex: Microsoft Teams):

1. Crie função em `netlify/functions/teams-alert.js`
2. Adicione em `src/utils/notifications.ts`:
   ```typescript
   async function sendToTeams(payload): Promise<NotificationResult>
   ```
3. Inclua na função `sendNotifications()`
4. Adicione redirect no `netlify.toml`
5. Configure variável de ambiente

### Customizar Formato Slack

Edite `netlify/functions/slack-alert.js`:
- Modifique array `blocks` para layout
- Ajuste campos em `contextFields`
- Personalize botões de ação

## 📈 Métricas

O sistema permite monitoramento através de:
- Logs do Netlify Functions
- Tabela `error_events` no Supabase
- Webhooks de retorno (se configurado)

## 🔐 Segurança

- Webhooks em variáveis de ambiente (não no código)
- Sanitização de dados sensíveis mantida
- Rate limiting para evitar spam
- Deduplicação por hash de incidente

---

**Desenvolvido para GGV Inteligência**  
Sistema implementado em: Janeiro 2024