# Scorecard Follow Up (pt-BR)

Entrada: transcript + template (JSON com itens e pesos).
Saída: JSON com `items` e `totalScore`. Cada item tem `key`, `weight` (1..3) e `score` (0..3).

## Critérios de Avaliação:

### 1. Abertura Follow Up (peso 1)
- **3 pontos**: Abertura calorosa, referência à conversa anterior, contexto claro
- **2 pontos**: Abertura adequada, alguma referência ao histórico
- **1 ponto**: Abertura básica, pouca conexão com o passado
- **0 pontos**: Abertura genérica, sem referência ao contexto

### 2. Reconexão e Rapport (peso 2)
- **3 pontos**: Excelente reconexão, rapport forte, confiança estabelecida
- **2 pontos**: Boa reconexão, rapport adequado
- **1 ponto**: Reconexão básica, rapport limitado
- **0 pontos**: Pouca ou nenhuma reconexão, rapport fraco

### 3. Revisão de Necessidades (peso 3)
- **3 pontos**: Revisão completa das necessidades, validação de mudanças, aprofundamento
- **2 pontos**: Revisão adequada das necessidades principais
- **1 ponto**: Revisão superficial das necessidades
- **0 pontos**: Pouca ou nenhuma revisão das necessidades

### 4. Apresentação da Proposta (peso 3)
- **3 pontos**: Apresentação clara, benefícios específicos, ROI demonstrado, customizada
- **2 pontos**: Apresentação adequada com benefícios claros
- **1 ponto**: Apresentação básica, benefícios genéricos
- **0 pontos**: Apresentação confusa ou inadequada

### 5. Tratamento de Objeções (peso 2)
- **3 pontos**: Excelente tratamento, objeções resolvidas, confiança mantida
- **2 pontos**: Tratamento adequado das objeções principais
- **1 ponto**: Tratamento básico, algumas objeções não resolvidas
- **0 pontos**: Tratamento inadequado ou evasão das objeções

### 6. Fechamento e Ação (peso 2)
- **3 pontos**: Fechamento claro, próximos passos definidos, compromisso obtido
- **2 pontos**: Fechamento adequado com próximos passos
- **1 ponto**: Fechamento básico, próximos passos vagos
- **0 pontos**: Fechamento inadequado ou sem ação definida

### 7. Próximos Passos (peso 1)
- **3 pontos**: Próximos passos claros, prazos definidos, responsabilidades acordadas
- **2 pontos**: Próximos passos adequados com prazos
- **1 ponto**: Próximos passos básicos, prazos vagos
- **0 pontos**: Próximos passos indefinidos ou inadequados

## Exemplo de saída:
```json
{
  "items": [
    {"key":"abertura_followup","weight":1,"score":3},
    {"key":"reconexao_rapport","weight":2,"score":2},
    {"key":"revisao_necessidades","weight":3,"score":3},
    {"key":"apresentacao_proposta","weight":3,"score":2},
    {"key":"tratamento_objeccoes","weight":2,"score":1},
    {"key":"fechamento_acao","weight":2,"score":2},
    {"key":"proximos_passos","weight":1,"score":3}
  ],
  "totalScore": 25
}
```

## Pontuação Total:
- **Máximo**: 36 pontos
- **Excelente**: 30-36 pontos
- **Bom**: 24-29 pontos
- **Adequado**: 18-23 pontos
- **Necessita Melhoria**: 0-17 pontos
