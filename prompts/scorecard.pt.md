# Scorecard (pt-BR)

Entrada: transcript + template (JSON com itens e pesos).
Saída: JSON com `items` e `totalScore`. Cada item tem `key`, `weight` (1..3) e `score` (0..3).

Exemplo de saída:
```json
{
  "items": [
    {"key":"situacao","weight":1,"score":2},
    {"key":"dor","weight":3,"score":3}
  ],
  "totalScore": 11
}
```
