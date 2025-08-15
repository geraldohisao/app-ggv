# Calls MVP (MeetRox/Salesbud)

## Como rodar (local)
1) Copie `.env.example` para `.env` e ajuste as chaves.
2) Suba serviços:
```bash
docker compose up --build
```
3) Rode migrações Prisma (em outro terminal):
```bash
# dentro do container api ou local com DATABASE_URL apontando para docker
npx prisma migrate deploy --schema packages/shared/prisma/schema.prisma
```

## Endpoints
- POST `http://localhost:8080/webhooks/voip`
- GET `http://localhost:8080/calls`
- GET `http://localhost:8080/calls/:id`
- POST `http://localhost:8080/calls/:id/push-crm`

## Simular webhook
```bash
curl -X POST http://localhost:8080/webhooks/voip \
 -H 'content-type: application/json' \
 -d '{
  "event":"call.completed",
  "call_id":"abc-123",
  "from":"+551199999999",
  "to":"+551188888888",
  "agent_id":"agent-42",
  "duration":300,
  "recording_url":"https://example.com/audio.wav",
  "timestamp":"2025-04-01T14:15:22Z",
  "consent":true
 }'
```

## Guia de Teste Manual
1) Disparar o webhook acima (ou com `x-signature` válido se `WEBHOOK_SECRET` setado).
2) Ver no log do worker o job `process-call` sendo executado.
3) Abrir `http://localhost:3000` e visualizar a chamada listada.
4) Entrar no detalhe e clicar em “Enviar para CRM” (se `ENABLE_CRM_PUSH=true`).
