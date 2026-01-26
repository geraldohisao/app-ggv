# 📅 Sincronização Bidirecional com Google Calendar

## Visão Geral

O sistema agora possui **sincronização bidirecional** com o Google Calendar, permitindo que alterações feitas no Calendar sejam refletidas no sistema e vice-versa.

---

## 🔄 Como Funciona a Sincronização

### Sistema → Google Calendar ✅

**1. Criar Sprint com Google Agenda Ativado**
- ✅ Cria evento recorrente no Google Calendar
- ✅ Gera link do Google Meet automaticamente
- ✅ Convida responsável da sprint por email
- ✅ Define recorrência baseada no tipo da sprint (semanal, mensal, etc.)

**2. Editar Sprint**
- ✅ Atualiza evento no Google Calendar (título, data, hora, duração, participantes)
- ✅ Sincronização automática ao salvar

**3. Desativar Toggle "Google Agenda"**
- ✅ Remove evento do Google Calendar
- ✅ Mantém histórico no sistema

**4. Excluir Sprint**
- ✅ Cancela evento no Google Calendar automaticamente
- ✅ Limpa registros relacionados

---

### Google Calendar → Sistema ⚡ (Novo!)

**Webhooks Registrados:**

Quando um evento é criado no sistema, um **webhook** é automaticamente registrado com o Google Calendar. Isso permite que o sistema receba notificações em tempo real quando:

- ✅ Evento é alterado no Calendar (data, hora, título)
- ✅ Evento é cancelado/deletado no Calendar
- ✅ Participantes aceitam/recusam convite

**O que é sincronizado automaticamente:**
- ✅ Data e hora do evento
- ✅ Duração da reunião
- ✅ Link do Meet (se alterado)
- ✅ Status (ativo/cancelado)

**Observação:** Alterações no Google Calendar podem levar alguns segundos para serem refletidas no sistema devido ao tempo de processamento do webhook.

---

## 📋 Regras de Recorrência

### Sprints Contínuas (Sem Data Fim)

Quando uma sprint é criada como **contínua** (sem data fim), o evento no Google Calendar será recorrente **infinito**.

**Exemplo:**
- Sprint Semanal, toda Segunda-feira às 9h
- → Google Calendar cria evento recorrente: `RRULE:FREQ=WEEKLY;BYDAY=MO`
- → Evento aparece **toda segunda-feira às 9h indefinidamente**

**Como parar:**
1. Desative o toggle "Google Agenda" na sprint
2. Ou edite o evento no Google Calendar e defina data de término

### Sprints com Data Fim

Sprints com data fim têm recorrência limitada até a data especificada.

**Exemplo:**
- Sprint Semanal de 01/02/2026 a 31/03/2026
- → Google Calendar cria evento recorrente até 31/03/2026

---

## 🔧 Configuração Técnica

### Webhook Endpoint

**URL:** `https://app.grupoggv.com/.netlify/functions/calendar-webhook`

Este endpoint recebe notificações do Google Calendar via **Push Notifications**.

### Expiração de Webhooks

- ⏰ Webhooks expiram após **7 dias** (limite do Google)
- 🔄 São renovados automaticamente quando a sprint é editada
- ⚠️ Se não houver renovação, a sincronização Google → Sistema para temporariamente

### Segurança

- 🔐 Webhooks são validados usando headers do Google (`x-goog-channel-id`, `x-goog-resource-state`)
- 🔐 Acesso ao Supabase usa Service Role com RLS para garantir segurança
- 🔐 Tokens de acesso são armazenados de forma segura

---

## 🧪 Testando a Sincronização

### Teste 1: Sistema → Google Calendar

1. Crie uma nova Sprint
2. Ative o toggle **"Google Agenda"**
3. Configure horário e duração
4. Salve a sprint
5. ✅ Verifique seu Google Calendar - evento deve aparecer com link do Meet

### Teste 2: Google Calendar → Sistema (Novo!)

1. Abra o evento criado no Google Calendar
2. Altere o horário (ex: 9h → 10h)
3. Salve a alteração
4. Aguarde ~30 segundos
5. ✅ Recarregue a página da sprint no sistema
6. ✅ Verifique que o horário foi atualizado

### Teste 3: Cancelamento

1. No Google Calendar, cancele o evento
2. Aguarde ~30 segundos
3. ✅ Recarregue a página da sprint
4. ✅ O badge "Evento Agenda" deve desaparecer

### Teste 4: Desativação do Toggle

1. Edite uma sprint que tem Google Agenda ativado
2. Desative o toggle "Google Agenda"
3. Salve a sprint
4. ✅ Verifique seu Google Calendar - evento foi removido

---

## ⚠️ Limitações e Observações

### Limitações Atuais

1. **Webhooks expiram em 7 dias**
   - Solução: Editar a sprint renova o webhook automaticamente

2. **Sincronização Google → Sistema pode ter atraso**
   - Normal: até 30 segundos
   - Depende da velocidade do webhook do Google

3. **Alterações complexas não são sincronizadas**
   - Ex: Mover evento para outro calendário
   - Ex: Transformar evento único em série

### Requisitos

- ✅ Usuário deve ter feito login com Google
- ✅ Permissões de Calendar, Drive e Docs devem estar aprovadas
- ✅ Google Workspace com Meet habilitado (para links do Meet)
- ✅ Google Workspace com transcrição habilitada (para importar transcrições)

### Transcrições do Google Meet

Para que transcrições apareçam na busca:
- ✅ Reunião deve ter sido gravada
- ✅ Transcrição deve estar habilitada no Google Workspace
- ✅ Arquivo de transcrição deve estar acessível no Google Drive
- ✅ Normalmente aparecem como "Transcript - Nome da Reunião - Data"

---

## 🔍 Monitoramento

### Logs do Sistema

Para depurar problemas de sincronização, verifique o console do navegador:

- `🔄 CALENDAR -` : Operações de sincronização
- `📅 WEBHOOK -` : Processamento de webhooks
- `✅` : Operação bem-sucedida
- `❌` : Erro na operação

### Logs do Netlify

Para verificar webhooks recebidos:
1. Acesse Netlify Dashboard
2. Functions → `calendar-webhook`
3. Verifique logs de execução

---

## 🚀 Próximos Passos

### Melhorias Futuras

- [ ] Renovação automática de webhooks antes da expiração (cronjob)
- [ ] Sincronização de descrição do evento
- [ ] Suporte para múltiplos participantes
- [ ] Interface para visualizar histórico de sincronizações
- [ ] Notificações em tempo real quando evento é alterado

### Contribuindo

Se encontrar problemas ou tiver sugestões, consulte os logs e reporte no canal apropriado.

---

## 📚 Referências

- [Google Calendar API - Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Google Calendar API - Events](https://developers.google.com/calendar/api/v3/reference/events)
- [RFC 5545 - iCalendar (RRULE)](https://tools.ietf.org/html/rfc5545)
