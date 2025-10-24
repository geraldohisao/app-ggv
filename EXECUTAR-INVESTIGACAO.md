# 🔍 EXECUTAR: Investigação de Telefone e Status

## 📋 **PASSO A PASSO:**

### **1. Abrir Supabase SQL Editor**
```
https://supabase.com/dashboard/project/[seu-projeto]/sql
```

### **2. Copiar Script**
Arquivo: `fix-phone-and-status-display.sql`

### **3. Executar (Run)**
Pressionar F5 ou clicar em "Run"

---

## 🎯 **O QUE O SCRIPT VAI MOSTRAR:**

### **Parte 1: Dados Recentes** 📊
```
5 chamadas mais recentes mostrando:
- Telefones (from_number, to_number)
- Status (status, status_voip, status_voip_friendly)
- Empresa e pessoa
```

### **Parte 2: Estatísticas** 📈
```
Quantas chamadas:
- Têm telefone vazio
- Têm status_voip_friendly vazio
- Porcentagem de cada problema
```

### **Parte 3: Valores de Status** 🔤
```
Lista de todos os valores de status encontrados:
- status_voip (inglês)
- status_voip_friendly (português)
- Quantidade de cada
```

### **Parte 4: Estrutura** 🏗️
```
Campos da tabela calls:
- Tipo de dados
- Se aceita NULL
```

### **Parte 5: Chamada Específica** 🎯
```
Dados da chamada J&K travesseiros:
- Todos os campos de telefone
- Todos os campos de status
- Dados em JSONB (insights)
```

---

## 🔍 **RESULTADOS ESPERADOS:**

Com base na investigação, identificaremos:

1. ✅ Se `to_number` está vazio na tabela
2. ✅ Se `status_voip_friendly` não está preenchido
3. ✅ Se dados estão em outro lugar (JSONB insights)
4. ✅ Padrão de status em inglês vs português

---

## 💡 **PRÓXIMAS AÇÕES:**

Após ver os resultados, vou:
1. Identificar a causa raiz
2. Criar script de correção
3. Aplicar fix permanente

---

**Status:** ⏳ Pronto para executar  
**Risco:** 🟢 ZERO (apenas leitura)  
**Tempo:** ⚡ ~3 segundos

