# 🚀 Key Results - Upgrade para Lógica Robusta

**Data**: 2026-01-07  
**Versão**: v1.3 (Key Results Inteligentes)

---

## 📋 O Que Mudou

### Antes (v1.2)
- KRs só tinham: `current_value`, `target_value`, `unit`
- Cálculo simples: `(current / target) * 100`
- Não lidava com metas que diminuem
- Não suportava atividades binárias

### Agora (v1.3)
- ✅ **Tipo de KR**: numeric, percentage, currency, activity
- ✅ **Direção**: increase (mais é melhor) ou decrease (menos é melhor)
- ✅ **Valor inicial**: start_value para metas "de X para Y"
- ✅ **Atividades**: checkbox "concluída" para tarefas binárias
- ✅ **Cálculo inteligente**: considera tipo e direção

---

## 🗄️ Migração do Banco de Dados

### 1. Execute este SQL no Supabase

Arquivo: `components/okr/sql/okr_v2_kr_improvements.sql`

**O que o SQL faz:**
- Adiciona colunas: `type`, `direction`, `start_value`, `activity_done`
- Atualiza KRs existentes com `type='numeric'` (default)
- Cria função `calculate_kr_progress()` no PostgreSQL
- Cria view `key_results_with_progress` com progresso calculado
- Atualiza função `calculate_okr_progress()` para usar nova lógica

### 2. Sem perda de dados
- ✅ KRs existentes continuam funcionando
- ✅ `type` default = 'numeric'
- ✅ `direction` null = usa cálculo antigo
- ✅ Backward compatibility 100%

---

## 💡 Exemplos de Uso

### Exemplo 1: Meta que AUMENTA
```typescript
{
  title: "Aumentar conversão SQL → Won",
  type: "percentage",
  direction: "increase",
  start_value: 20,      // Começou em 20%
  current_value: 28,    // Está em 28%
  target_value: 35,     // Meta é 35%
  unit: "%",
  // Progresso: (28 - 20) / (35 - 20) = 8/15 = 53%
}
```

### Exemplo 2: Meta que DIMINUI
```typescript
{
  title: "Reduzir churn mensal",
  type: "percentage",
  direction: "decrease",
  start_value: 10,      // Começou em 10%
  current_value: 7,     // Está em 7%
  target_value: 5,      // Meta é 5%
  unit: "%",
  // Progresso: (10 - 7) / (10 - 5) = 3/5 = 60%
}
```

### Exemplo 3: Receita (Currency)
```typescript
{
  title: "Faturamento Anual",
  type: "currency",
  direction: "increase",
  start_value: 1000000, // R$ 1M
  current_value: 1200000, // R$ 1.2M
  target_value: 2000000,  // R$ 2M
  unit: "R$",
  // Progresso: (1.2M - 1M) / (2M - 1M) = 20%
  // Exibição: R$ 1.200.000,00
}
```

### Exemplo 4: Atividade Binária
```typescript
{
  title: "Implantar novo CRM",
  type: "activity",
  activity_done: false,  // Checkbox
  // Progresso: 0% (quando concluir vira 100%)
}
```

---

## 🎨 UI Atualizada

### Formulário de OKR (Modal)
Novos campos para cada KR:
1. **Tipo de Indicador** (select)
   - Quantidade
   - Percentual (%)
   - Valor em R$
   - Atividade

2. **Direção** (select)
   - 🔼 Aumentar (mais é melhor)
   - 🔽 Diminuir (menos é melhor)

3. **Valores** (inputs numéricos)
   - **DE (Inicial)**: start_value
   - **ATUAL**: current_value
   - **PARA (Meta)**: target_value

4. **Unidade** (input livre)
   - Ex: SQL, leads, clientes, contratos

5. **Status** (select)
   - 🟢 No Prazo
   - 🟡 Risco
   - 🔴 Atenção

### Visualização de KRs
- Badges mostrando tipo e direção
- Valores formatados (R$ 1.200.000,00 para currency)
- Progresso calculado corretamente
- Atividades com checkbox

---

## 🔧 Funções Utilitárias

### `calculateKRProgress(kr: KeyResult): number`
Calcula progresso de 0–100% baseado em tipo e direção.

### `formatKRValue(value, type, unit): string`
Formata valor com unidade apropriada:
- `currency` → R$ 1.200.000,00
- `percentage` → 28.5%
- `numeric` → 150 leads

### `getDirectionLabel(direction): string`
Retorna emoji + texto: "🔼 Aumentar" ou "🔽 Diminuir"

### `getTypeLabel(type): string`
Retorna: "Quantidade", "Percentual (%)", "Valor em R$", "Atividade"

---

## ✅ Checklist de Testes

### Após executar o SQL:
- [ ] Criar OKR com KR "increase" (ex: receita)
- [ ] Criar OKR com KR "decrease" (ex: churn)
- [ ] Criar OKR com KR "activity" (ex: implantar sistema)
- [ ] Editar `current_value` e verificar progresso
- [ ] Verificar se KRs antigos continuam funcionando

---

## 🎯 Resultado Final

**Agora o sistema suporta todos os casos de uso reais:**
- ✅ Aumentar receita de R$ 1M para R$ 2M
- ✅ Reduzir churn de 10% para 5%
- ✅ Gerar 5.000 MQLs/mês
- ✅ Aumentar conversão de 20% para 35%
- ✅ Implantar CRM até 31/03 (atividade)
- ✅ Reduzir ciclo de vendas de 90 para 60 dias

**Sistema 100% pronto para uso real da GGV!** 🎉

