# 🚨 PLANO DE RESTAURAÇÃO COMPLETA DO SISTEMA

**Status:** EMERGÊNCIA - Tela Branca  
**Objetivo:** Restaurar sistema + Reorganizar com dados do Google Workspace

---

## 🎯 ESTRATÉGIA (3 ETAPAS)

### **ETAPA 1: RESET FORÇADO** ⏱️ 2 min
**Objetivo:** Fazer sistema voltar a funcionar (sem se preocupar com cargos corretos ainda)

#### **1.1. Executar SQL de Reset** (1 min)
```
Supabase Dashboard → SQL Editor
Arquivo: force_reset_system.sql
Executar
```

**O que faz:**
- ✅ Cria TODOS os cargos possíveis
- ✅ Força usuários problemáticos para cargo genérico "Consultor"
- ✅ Valida que NENHUM usuário tenha cargo inválido

#### **1.2. Hard Refresh** (30s)
```
Ctrl + Shift + R
```

**Resultado Esperado:**
- ✅ Sistema volta a funcionar
- ⚠️ Alguns cargos ainda estarão errados (mas funcionando)

---

### **ETAPA 2: PREPARAR IMPORTAÇÃO DO GOOGLE** ⏱️ 5 min

**Após sistema voltar:**
1. Settings → Importar do Google Workspace
2. Preview dos usuários
3. Selecionar TODOS
4. Importar

---

### **ETAPA 3: AJUSTES FINAIS** ⏱️ 2 min

**Corrigir Inteligência de Mercado:**
```sql
UPDATE profiles 
SET cargo = 'Analista de Inteligência de Mercado', 
    department = 'projetos'
WHERE email = 'katiuscia@grupoggv.com';

UPDATE profiles 
SET cargo = 'Assistente de Inteligência de Mercado', 
    department = 'projetos'
WHERE email = 'natalia@grupoggv.com';
```

---

## 🔥 EXECUTAR AGORA

**Arquivo:** `force_reset_system.sql`

**Depois me diga:**
1. Sistema voltou? Sim/Não
2. Erro no console (F12)? Qual?
3. SQL retornou "0 usuários inválidos"?

**Vou resolver em seguida!** 🚀

