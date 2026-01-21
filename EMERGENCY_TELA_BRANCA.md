# 🚨 EMERGÊNCIA: SISTEMA COM TELA BRANCA

## **🔴 PROBLEMA:**
Sistema parou de funcionar após criar cargos novos que não existiam na tabela `cargos`.

---

## **⚡ SOLUÇÃO RÁPIDA (5 MIN):**

### **PASSO 1: Executar SQL de Emergência** (2 min)

```bash
# Supabase Dashboard → SQL Editor
# Executar: emergency_fix_cargos.sql
```

### **PASSO 2: Limpar Cache do Navegador** (1 min)

**Opção A - Hard Refresh:**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Opção B - Limpar Storage:**
```
1. F12 (DevTools)
2. Application → Storage
3. Clear site data
4. F5 (Refresh)
```

### **PASSO 3: Verificar Console** (2 min)

Se ainda estiver com tela branca:
```
1. F12 (DevTools)
2. Console tab
3. Ver mensagem de erro
4. Me enviar o erro exato
```

---

## **🔍 O QUE ACONTECEU:**

```javascript
// Frontend tentou renderizar:
user.cargo = "Analista de Inteligência de Mercado"

// Mas na tabela cargos:
SELECT * FROM cargos WHERE name = "Analista de Inteligência de Mercado"
// ❌ Não existe!

// Resultado:
OrganogramaUnificado.tsx → usuariosComNivel.map()
  → cargoInfo?.level || 5  // cargoInfo é NULL
  → Componente quebra
  → Tela branca 💥
```

---

## **✅ SOLUÇÃO IMPLEMENTADA:**

O SQL `emergency_fix_cargos.sql` adiciona:

```sql
INSERT INTO cargos (name, level) VALUES
  ('Analista de Inteligência de Mercado', 6),
  ('Assistente de Inteligência de Mercado', 6);
```

---

## **🛡️ PREVENÇÃO FUTURA:**

### **Regra de Ouro:**
> **SEMPRE criar cargo na tabela `cargos` ANTES de atribuir a um usuário!**

### **Ordem Correta:**
```
1. ✅ Criar cargo em Settings → Gerenciar Cargos
2. ✅ Atribuir cargo ao usuário
```

### **Ordem Errada (causa tela branca):**
```
1. ❌ Atribuir cargo novo ao usuário
2. ❌ Sistema quebra (cargo não existe)
```

---

## **🎯 APÓS RESOLVER:**

1. **Executar `fix_cargo_hierarchy.sql`** (corrige todos os níveis)
2. **Criar departamento "Inteligência de Mercado"** (opcional)
3. **Mover Katiuscia e Natália** para o novo departamento

---

## **📞 SE AINDA NÃO FUNCIONAR:**

Me envie:
1. Screenshot da tela branca
2. Console do navegador (F12 → Console)
3. Erro exato (se houver)

**Respondo em 30 segundos!** 🚀

