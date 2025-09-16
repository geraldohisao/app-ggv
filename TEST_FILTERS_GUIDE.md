# 🧪 GUIA DE TESTE - TODOS OS FILTROS

## **Filtros Corrigidos e Testáveis:**

### **1. 📅 Filtro de Data (CORRIGIDO)**
- **Como testar**: Selecione data início e fim
- **Comportamento**: Filtra do início do dia (00:00) ao fim do dia (23:59)
- **Log esperado**: `🔍 CALLS SERVICE - Filtros de data aplicados`

### **2. 👤 Filtro por SDR**
- **Como testar**: Selecione um SDR específico no dropdown
- **Comportamento**: Filtra chamadas por `agent_id` (usando ILIKE)
- **Status**: ✅ Funcionando

### **3. 📞 Filtro por Status (CORRIGIDO)**
- **Como testar**: Selecione status no dropdown
- **Opções disponíveis**:
  - `normal_clearing` → Atendida
  - `no_answer` → Não atendida  
  - `originator_cancel` → Cancelada pela SDR
  - `number_changed` → Numero mudou
  - `recovery_on_timer_expire` → Tempo esgotado
  - `unallocated_number` → Número não encontrado
- **Status**: ✅ Corrigido

### **4. ⏱️ Filtros de Duração (CORRIGIDOS)**
- **Como testar**: Digite valores em "Duração mín." e "Duração máx."
- **Formato**: Segundos (ex: 60 = 1 minuto)
- **Comportamento**: Filtra por `duration` no banco
- **Status**: ✅ Corrigido - agora são enviados para o backend

### **5. 🔍 Busca por Texto**
- **Campo**: "Buscar por nome, empresa..."
- **Comportamento**: Filtro local (frontend) por empresa, deal, SDR, pessoa
- **Status**: ✅ Funcionando

### **6. 📊 Ordenação**
- **Opções**:
  - 📅 Mais Recentes (created_at)
  - ⏱️ Maior Duração (duration)
  - ⭐ Maior Nota (score)
  - 🏢 Empresa A-Z (company)
- **Status**: ✅ Funcionando

### **7. 🎯 Filtro por Score**
- **Campo**: "Score mín."
- **Comportamento**: Filtro local (frontend) por nota mínima
- **Status**: ✅ Funcionando

## **Logs de Debug Implementados:**

### **Frontend (CallsPage):**
```
🔍 CALLS PAGE - Carregando calls com filtros: {
  sdr, status, type, start, end, minDuration, maxDuration, sortBy, currentPage
}
```

### **Backend (callsService):**
```
🔍 CALLS SERVICE - Filtros de data aplicados: {
  start, end, startTimestamp, endTimestamp
}
🔍 CALLS SERVICE - Filtro início aplicado: [timestamp]
🔍 CALLS SERVICE - Filtro fim aplicado: [timestamp]
```

## **Como Testar Cada Filtro:**

### **Teste 1 - Filtro de Data:**
1. Selecione data início: 08/09/2025
2. Selecione data fim: 08/09/2025
3. Verifique console: deve mostrar timestamps corretos
4. Resultado: apenas chamadas do dia 08/09

### **Teste 2 - Filtro de Status:**
1. Selecione "Atendida" no dropdown de status
2. Resultado: apenas chamadas com status_voip = 'normal_clearing'

### **Teste 3 - Filtro de Duração:**
1. Digite "60" em duração mínima
2. Digite "300" em duração máxima  
3. Resultado: apenas chamadas entre 1-5 minutos

### **Teste 4 - Combinação de Filtros:**
1. Selecione um SDR específico
2. Selecione uma data específica
3. Selecione "Atendida" como status
4. Resultado: chamadas atendidas daquele SDR naquela data

### **Teste 5 - Ordenação:**
1. Selecione "⏱️ Maior Duração"
2. Resultado: chamadas ordenadas por duração (maior primeiro)

## **Indicadores Visuais:**

- **📊 Contador**: Mostra "X de Y chamadas" 
- **🔄 Loading**: "Carregando..." durante busca
- **📅 Filtro ativo**: Badge verde quando data específica aplicada
- **🗑️ Limpar**: Botão para resetar todos os filtros

## **Problemas Corrigidos:**

1. ✅ Status usava valores incorretos → Agora usa status_voip corretos
2. ✅ Duração não era enviada → Agora enviada como number
3. ✅ Data fim não incluía dia inteiro → Agora vai até 23:59:59
4. ✅ Filtros não resetavam página → Agora reseta para página 1
5. ✅ Dependências do useEffect incompletas → Agora inclui todos os filtros

