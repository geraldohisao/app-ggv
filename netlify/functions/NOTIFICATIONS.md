# 🚨 Sistema de Notificações de Erro

Este sistema envia notificações de erro críticos para **Google Chat** e **Slack** simultaneamente.

## ⚙️ Configuração

### 1. Google Chat (Já configurado)
```bash
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/XXXXXX/messages?key=XXXXXX&token=XXXXXX
```

### 2. Slack (Nova integração)
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## 🔧 Como obter o webhook do Slack

1. Acesse https://api.slack.com/apps
2. Clique em "Create New App" → "From scratch"
3. Nomeie a app (ex: "Error Notifications") e selecione o workspace
4. No menu lateral, vá em "Incoming Webhooks"
5. Ative os "Incoming Webhooks" (toggle ON)
6. Clique em "Add New Webhook to Workspace"
7. Selecione o canal onde deseja receber as notificações
8. Copie a URL do webhook

## 🎯 Funcionamento

- ✅ **Resiliente**: Se um canal falhar, o outro continua funcionando
- ⚡ **Paralelo**: Ambas as notificações são enviadas simultaneamente  
- 📊 **Detalhado**: Retorna status individual de cada plataforma
- 🔄 **Compatível**: Mantém toda funcionalidade existente do Google Chat

## 📨 Formato das Mensagens

### Google Chat
Mantém o formato original em texto com cards interativos.

### Slack  
Usa Slack Blocks para formatação rica:
- 🚨 Header com emoji
- 📋 Campos organizados em seções
- 💻 Stack trace formatado em código
- 🔘 Botões de ação (Abrir página, Pesquisar incidente)

## 🧪 Teste

Para testar, você pode forçar um erro no frontend:
```javascript
// No console do navegador
throw new Error('Teste de notificação');
```

Ou usar a função de alerta direto:
```javascript
postCriticalAlert({
  title: 'Teste de integração Slack',
  message: 'Verificando se ambos os canais recebem a notificação',
  context: { url: window.location.href }
});
```

## 📝 Logs de Debug

A função retorna detalhes de status para debug:
```json
{
  "ok": true,
  "notifications": [
    { "platform": "Google Chat", "status": "success" },
    { "platform": "Slack", "status": "success" }
  ],
  "successCount": 2,
  "errorCount": 0
}
```