# 🎯 **GUIA DE CORREÇÃO: SISTEMA DE CARGOS**

## **📋 RESUMO DO PROBLEMA**

**Situação anterior:**
- ❌ "Analista de Marketing" adicionado só para OTE, mas não estava na tabela de cargos
- ❌ Confusão entre "Gerência" e "Head" 
- ❌ Indefinição do nível hierárquico de "Analista"

---

## **✅ SOLUÇÃO IMPLEMENTADA**

### **1️⃣ Estrutura Hierárquica Esclarecida**

```
NÍVEL 1 - C-Level              → CEO
NÍVEL 2 - Diretoria            → Diretor
NÍVEL 3 - Head/Liderança       → Head Comercial, Head Marketing, Head Projetos
NÍVEL 4 - Gerência/Coordenação → Gerente, Coordenador
NÍVEL 5 - Operacional          → SDR, Closer, Analista, Analista de Marketing
```

### **2️⃣ Esclarecimentos Importantes**

**Gerência é o mesmo que Head?**
- ❌ **NÃO!** Head é nível 3, Gerência é nível 4
- Head = Liderança estratégica de departamento
- Gerência = Gestão tática de equipe/área

**Analista seria qual nível?**
- ✅ **Operacional (Nível 5)**
- Foco em execução de tarefas e processos

---

## **🚀 COMO IMPLEMENTAR**

### **PASSO 1: Executar Script SQL**

Execute no Supabase SQL Editor:

```bash
components/okr/sql/fix_complete_cargos_system.sql
```

**O que esse script faz:**
- ✅ Adiciona "Analista de Marketing" à tabela de cargos
- ✅ Garante que todos os cargos operacionais existem
- ✅ Ajusta níveis hierárquicos (Gerente=4, Coordenador=4)
- ✅ Migra dados existentes automaticamente
- ✅ Cria validações e índices
- ✅ Atualiza funções RPC

---

### **PASSO 2: Verificar Resultados**

Após executar o script, ele mostrará 3 relatórios:

**📊 Relatório 1: Estrutura de Cargos**
- Verifica se todos os cargos estão corretos

**⚠️ Relatório 2: Usuários sem Cargo**
- Lista usuários que precisam ter cargo definido manualmente

**📈 Relatório 3: Estatísticas**
- Mostra quantos usuários têm/não têm cargo definido

---

### **PASSO 3: Ações Manuais**

**Se houver usuários sem cargo definido:**

1. Acesse **Settings → Gerenciar Usuários**
2. Para cada usuário listado no Relatório 2:
   - Defina o **Cargo** apropriado
   - Mantenha a **Função Comercial** (se aplicável)

**Exemplo:**
- **Nome:** Maria Silva
- **Função Comercial:** Analista de Marketing *(para OTE)*
- **Cargo:** Analista de Marketing *(para hierarquia)*
- **Departamento:** Marketing

---

## **📁 ARQUIVOS CRIADOS**

1. **`fix_complete_cargos_system.sql`**
   - Script principal de correção (EXECUTAR ESTE!)

2. **`fix_cargos_analista_marketing.sql`**
   - Versão simplificada (opcional, para referência)

3. **`ESTRUTURA_CARGOS_NIVEIS.md`**
   - Documentação completa da estrutura hierárquica
   - Referência para futuros colaboradores

4. **`GUIA_CORRECAO_CARGOS.md`**
   - Este guia de implementação

---

## **🔄 DIFERENÇA: FUNÇÃO COMERCIAL vs CARGO**

O sistema GGV tem **dois campos diferentes**:

### **`user_function` (Função Comercial)**
- **Usado em:** Calculadora de OTE
- **Valores:** SDR | Closer | Gestor | Analista de Marketing
- **Objetivo:** Definir fórmulas de remuneração variável

### **`cargo` (Cargo)**
- **Usado em:** Sistema de OKR e gestão organizacional
- **Valores:** Qualquer cargo da tabela `cargos`
- **Objetivo:** Definir posição hierárquica

### **Mapeamento Recomendado:**

| Função Comercial | Cargo Sugerido | Nível |
|------------------|----------------|-------|
| SDR | SDR | 5 - Operacional |
| Closer | Closer | 5 - Operacional |
| Gestor | Coordenador ou Gerente | 4 - Gerência |
| Analista de Marketing | Analista de Marketing | 5 - Operacional |

---

## **🎨 COMO USAR O SISTEMA DEPOIS**

### **Adicionar Novo Usuário:**

1. Criar conta no sistema
2. Definir **Role** (SUPER_ADMIN / ADMIN / USER)
3. Definir **Cargo** (escolher da lista de cargos)
4. Definir **Função Comercial** (se tiver OTE)
5. Definir **Departamento**

### **Adicionar Novo Cargo:**

1. Ir em **Settings → Gerenciar Cargos**
2. Preencher:
   - Nome: ex: "Analista de BI"
   - Descrição: ex: "Analista de Business Intelligence"
   - Nível: 5 - Operacional
3. Clicar em **+ Adicionar**

---

## **⚡ PRÓXIMOS PASSOS**

### **Agora:**
1. ✅ Execute o script `fix_complete_cargos_system.sql`
2. ✅ Revise os relatórios gerados
3. ✅ Defina cargo para usuários sem cargo

### **Depois:**
1. 📖 Compartilhe `ESTRUTURA_CARGOS_NIVEIS.md` com a equipe
2. 🎓 Treine gestores sobre a diferença entre Função Comercial e Cargo
3. 🔍 Revise periodicamente se há cargos novos necessários

---

## **❓ FAQ**

### **1. Posso ter um cargo diferente da função comercial?**
✅ **SIM!** São campos independentes.

**Exemplo válido:**
- Cargo: "Coordenador Comercial" (nível 4)
- Função Comercial: "Gestor" (para calcular OTE)

### **2. Todos os usuários precisam ter função comercial?**
❌ **NÃO!** Apenas quem tem OTE calculado (SDR, Closer, Coordenador, Analista de Marketing).

### **3. Posso criar cargos personalizados?**
✅ **SIM!** Use "Gerenciar Cargos" para adicionar quantos cargos precisar.

### **4. O que acontece se eu mudar o nível de um cargo?**
⚠️ Isso afeta a hierarquia no organograma e pode impactar permissões de OKR.

### **5. Gerente pode criar OKRs para a equipe?**
Depende do sistema de permissões configurado, mas geralmente sim (nível 4 tem essa permissão).

---

## **📞 SUPORTE**

Se encontrar problemas:
1. Verifique se executou o script completo
2. Veja os logs de erro do Supabase
3. Revise a documentação em `ESTRUTURA_CARGOS_NIVEIS.md`

---

**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para implementação

