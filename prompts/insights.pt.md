# Insights (pt-BR)

Instruções: Dado um transcript diarizado com timestamps, extraia JSON estrito com:
- summary: string breve (<=120 palavras)
- painPoints: string[]
- objections: string[]
- nextActions: { title, dueDate?, owner? }[] (datas ISO se presentes)
- tags: string[] (máx 6)

Formato de saída (JSON apenas, sem comentários):
```json
{
  "summary": "...",
  "painPoints": ["..."],
  "objections": ["..."],
  "nextActions": [{"title":"...","dueDate":"2025-04-03"}],
  "tags": ["lead","qualificado"]
}
```

Exemplo de entrada (trecho):
```
[00:00 Speaker A] Olá, tudo bem? ...
[00:45 Speaker B] Nossa dor é o retrabalho no processo...
```
Exemplo de saída:
```json
{
  "summary": "Cliente relata retrabalho e deseja automatizar.",
  "painPoints": ["retrabalho", "falta de automação"],
  "objections": ["custo"],
  "nextActions": [{"title":"Enviar proposta","dueDate":"2025-04-05"}],
  "tags": ["automacao","qualificado"]
}
```
