# MeetRox/Salesbud Calls MVP – Arquitetura

## Visão Geral
MVP para processar webhooks de VOIP ao fim de ligações, baixar gravação, transcrever (pt-BR) com diarização, extrair insights com LLM, calcular scorecard, persistir em PostgreSQL e expor via API e painel web. Integração opcional com CRM (Pipedrive) via feature-flag.

## Serviços
- api (Fastify): recebe webhooks, expõe leitura de chamadas e push manual para CRM.
- worker (BullMQ): pipeline `process-call` (download → transcrever → segmentar → extrair insights → scorecard → persistir → enviar CRM se habilitado).
- web (Next.js 14): lista de chamadas e detalhe com player e artefatos.
- Dependências: PostgreSQL, Redis, MinIO (S3-compatível).

## Diagrama (ASCII)
```
[VOIP] --webhook--> [api] --enqueue--> [Redis/BullMQ] --> [worker]
                                   ^                        |
                                   |                        v
                             [web - Next.js] <---- [PostgreSQL + MinIO]
```

## Fluxo ponta a ponta
1) VOIP dispara `POST /webhooks/voip` com assinatura HMAC e payload genérico.
2) api valida HMAC, idempotência por `providerCallId`, cria/atualiza `Call(status=received)` e enfileira `process-call`.
3) worker baixa áudio, armazena em `Storage` (disco→S3), transcreve (Deepgram/Whisper), segmenta, extrai insights/CRM com LLM, calcula scorecard, persiste tudo e marca `status=processed`.
4) api fornece `GET /calls` e `GET /calls/:id` para o web. `POST /calls/:id/push-crm` aciona envio manual (feature-flag).

## Decisões (ADR resumido)
- Linguagem: TypeScript em todos os serviços.
- HTTP framework: Fastify (performance). Zod para validação.
- Fila: BullMQ + Redis (maturidade, retry, backoff).
- Banco: PostgreSQL via Prisma. Prisma Client compartilhado em `packages/shared`.
- Armazenamento: abstração `Storage` (Disk e S3/MinIO). Arquivos temporários em disco antes de enviar a S3.
- STT: interface `Transcriber` com provider Deepgram (preferência) e Whisper (fallback). Seleção via env `USE_TRANSCRIBER`.
- LLM: interface `LLM` com OpenAI (gpt-4o-mini ou similar). Prompts determinísticos em `/prompts`.
- CRM: interface `CRMClient` com Pipedrive (feature-flag `ENABLE_CRM_PUSH`).
- Observabilidade: `pino` logger, métricas básicas (durations, errors) e health checks em api/worker.

## Segurança e LGPD
- HMAC: header `x-signature` verificando corpo bruto com `WEBHOOK_SECRET`.
- Validação de origem (IP allowlist/domínios, opcional via env).
- Consentimento: campo `Call.consent` e flags de retenção `RETENTION_DAYS`.
- Anonimização: opcional de telefones (`HASH_PHONE_NUMBERS=true`).
- Retenção: limpeza de mídia/transcrições após `RETENTION_DAYS` se exigido.

## Métricas
- Contadores: webhooks recebidos, jobs processados, falhas.
- Histogramas: duração de download, STT, LLM, persistência.

## Modelos (Prisma)
- Call, Recording, Transcript, Insights, Scorecard, CRMEvent, Segment.

## Contratos de API
- POST `/webhooks/voip` (sempre 200 idempotente)
- GET `/calls` (paginação básica)
- GET `/calls/:id`
- POST `/calls/:id/push-crm`

## Exemplos
Webhook genérico:
```json
{
  "event": "call.completed",
  "call_id": "abc-123",
  "from": "+551199999999",
  "to": "+551188888888",
  "agent_id": "agent-42",
  "duration": 523,
  "recording_url": "https://voip.example.com/rec/abc-123.wav",
  "timestamp": "2025-04-01T14:15:22Z",
  "consent": true,
  "meta": {"provider": "generic"}
}
```
Webhook estilo Twilio:
```json
{
  "event": "call.completed",
  "call_id": "CAe1644a7eed5088b159577c5802d8be38",
  "from": "+551199999999",
  "to": "+551188888888",
  "agent_id": "agent-42",
  "duration": 300,
  "recording_url": "https://api.twilio.com/2010-04-01/Accounts/ACxxx/Recordings/REyyy",
  "timestamp": "2025-04-01T14:15:22Z",
  "meta": {"accountSid": "ACxxx", "recordingSid": "REyyy"}
}
```

Exemplo de resposta `/calls/:id`:
```json
{
  "call": {
    "id": "cll_001",
    "providerCallId": "abc-123",
    "from": "+551199999999",
    "to": "+551188888888",
    "agentId": "agent-42",
    "startedAt": "2025-04-01T14:10:00Z",
    "endedAt": "2025-04-01T14:15:23Z",
    "durationSec": 323,
    "consent": true,
    "source": "voip",
    "status": "processed"
  },
  "recording": {
    "id": "rec_001",
    "storageKey": "recordings/rec_001.wav",
    "originalUrl": "https://voip.example.com/rec/abc-123.wav",
    "format": "wav",
    "sampleRate": 16000,
    "channels": 1
  },
  "transcript": {
    "id": "tr_001",
    "language": "pt-BR",
    "text": "...",
    "wordsJson": [],
    "diarizationJson": []
  },
  "segments": [
    {"id": "seg1", "label": "abertura", "startSec": 0, "endSec": 30, "excerpt": "..."}
  ],
  "insights": {
    "id": "ins_001",
    "summary": "Resumo executivo...",
    "painPointsJson": ["..."],
    "objectionsJson": ["..."],
    "nextActionsJson": [{"title": "Enviar proposta", "dueDate": "2025-04-03"}],
    "tags": ["lead", "qualificado"]
  },
  "scorecard": {
    "id": "sc_001",
    "templateKey": "diagnostico",
    "itemsJson": [{"item": "Dor", "weight": 3, "score": 2}],
    "totalScore": 7
  }
}
```

## Riscos
- Qualidade de STT em ambientes ruidosos; fallback entre providers.
- Custos de LLM e STT; uso de feature-flags e limites.
- Latência de pipeline; processamento assíncrono e retries.
- LGPD: consentimento, retenção, anonimização, controle de acesso aos áudios.

## Healthchecks
- api: `GET /healthz` retorna status de DB e Redis.
- worker: log periódico e endpoint opcional via Fastify light.
