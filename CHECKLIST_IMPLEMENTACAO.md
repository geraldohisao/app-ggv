# ✅ **CHECKLIST DE IMPLEMENTAÇÃO - CORREÇÃO DE CARGOS**

---

## **📋 ANTES DE COMEÇAR**

- [ ] Ler o `RESUMO_CORRECAO_CARGOS.md` (2 min)
- [ ] Ler o `GUIA_CORRECAO_CARGOS.md` (5 min)
- [ ] Fazer backup do banco (recomendado)

---

## **🚀 IMPLEMENTAÇÃO**

### **FASE 1: Executar Script SQL** ⏱️ ~2min

- [ ] Abrir Supabase SQL Editor
- [ ] Copiar conteúdo de `components/okr/sql/fix_complete_cargos_system.sql`
- [ ] Colar no editor
- [ ] Clicar em **Run**
- [ ] Aguardar conclusão
- [ ] Verificar se não há erros vermelhos

**📊 Relatórios gerados:**
- [ ] Relatório 1: Estrutura de Cargos (verificar se "Analista de Marketing" aparece)
- [ ] Relatório 2: Usuários sem Cargo (anotar quantos são)
- [ ] Relatório 3: Estatísticas (anotar números)

---

### **FASE 2: Verificar Resultados** ⏱️ ~3min

**Verificar na interface:**
- [ ] Ir em **Settings → Gerenciar Cargos**
- [ ] Confirmar que "Analista de Marketing" aparece na lista
- [ ] Confirmar que está marcado como **Ativo**
- [ ] Confirmar que o nível é **5 - Operacional**

**Verificar estrutura completa:**
- [ ] Nível 1 (C-Level): CEO existe?
- [ ] Nível 2 (Diretoria): Diretor existe?
- [ ] Nível 3 (Head): Head Comercial, Head Marketing, Head Projetos existem?
- [ ] Nível 4 (Gerência): Gerente, Coordenador existem?
- [ ] Nível 5 (Operacional): SDR, Closer, Analista, Analista de Marketing existem?

---

### **FASE 3: Ajustar Usuários** ⏱️ ~5-10min

- [ ] Ir em **Settings → Gerenciar Usuários**
- [ ] Identificar usuários sem cargo definido (coluna "Cargo" vazia)

**Para cada usuário sem cargo:**
- [ ] Clicar em editar
- [ ] Definir **Cargo** apropriado
- [ ] Verificar se **Função Comercial** está correta (se aplicável)
- [ ] Verificar se **Departamento** está correto
- [ ] Salvar

**Casos comuns:**
- [ ] SDRs → Cargo: "SDR" | Função: "SDR" | Depto: "Comercial"
- [ ] Closers → Cargo: "Closer" | Função: "Closer" | Depto: "Comercial"
- [ ] Analistas de Marketing → Cargo: "Analista de Marketing" | Função: "Analista de Marketing" | Depto: "Marketing"
- [ ] Coordenadores → Cargo: "Coordenador" | Função: "Gestor" | Depto: (definir)

---

### **FASE 4: Testar Calculadora OTE** ⏱️ ~2min

- [ ] Ir em **Calculadora OTE**
- [ ] Selecionar perfil **"Analista de Marketing"**
- [ ] Verificar se carrega os campos corretos
- [ ] Preencher dados de teste
- [ ] Verificar se cálculo funciona normalmente

---

### **FASE 5: Documentação e Comunicação** ⏱️ ~5min

- [ ] Compartilhar `ESTRUTURA_CARGOS_NIVEIS.md` com gestores
- [ ] Comunicar à equipe sobre a nova estrutura de cargos
- [ ] Explicar diferença entre **Função Comercial** e **Cargo**
- [ ] Explicar que **Gerência ≠ Head**

---

## **✅ VALIDAÇÃO FINAL**

### **Testes de Integridade:**

- [ ] Todos os usuários ativos têm cargo definido?
- [ ] "Analista de Marketing" aparece na lista de cargos?
- [ ] Calculadora OTE funciona para "Analista de Marketing"?
- [ ] Organograma exibe usuários corretamente?
- [ ] Não há erros no console do navegador?

### **Testes Funcionais:**

- [ ] Criar novo usuário com cargo "Analista de Marketing" → OK?
- [ ] Editar cargo de um usuário existente → OK?
- [ ] Adicionar novo cargo personalizado via interface → OK?
- [ ] Calcular OTE para "Analista de Marketing" → OK?

---

## **📊 MÉTRICAS DE SUCESSO**

Após implementação, confirme:

- [ ] **100%** dos usuários ativos têm cargo definido
- [ ] **5 níveis** hierárquicos claramente definidos
- [ ] **4 funções comerciais** disponíveis para OTE (SDR, Closer, Gestor, Analista de Marketing)
- [ ] **Pelo menos 10 cargos** cadastrados na tabela `cargos`
- [ ] **0 erros** no sistema após implementação

---

## **🐛 TROUBLESHOOTING**

### **Problema: Script SQL dá erro**
- [ ] Verificar se já executou `okr_v2_custom_lists.sql` antes
- [ ] Verificar permissões do usuário no Supabase
- [ ] Executar apenas as partes que deram erro

### **Problema: "Analista de Marketing" não aparece**
- [ ] Verificar se executou o script completo
- [ ] Verificar se está marcado como `is_active = TRUE`
- [ ] Atualizar página (Ctrl+F5)

### **Problema: Usuários não têm cargo após migração**
- [ ] Normal! Defina manualmente via interface
- [ ] Consulte Relatório 2 para ver quem precisa

### **Problema: OTE não calcula para "Analista de Marketing"**
- [ ] Verificar se `ANALISTA_MARKETING_REMUNERATION` existe em `constants.ts`
- [ ] Verificar se campo `user_function` está definido como "Analista de Marketing"

---

## **📝 ANOTAÇÕES**

**Número de usuários sem cargo encontrados:** ___________

**Cargos adicionais necessários:** 
- [ ] ___________________________
- [ ] ___________________________
- [ ] ___________________________

**Problemas encontrados:**
- [ ] ___________________________
- [ ] ___________________________

**Tempo total gasto:** ___________

---

## **🎉 CONCLUSÃO**

Quando todos os itens estiverem marcados:

- [ ] ✅ **IMPLEMENTAÇÃO COMPLETA!**
- [ ] 🎯 Sistema de cargos organizado
- [ ] 📊 Hierarquia clara
- [ ] 💰 OTE funcionando para todos os perfis
- [ ] 📚 Documentação completa
- [ ] 👥 Equipe informada

---

**Data de implementação:** ___/___/2026  
**Responsável:** _____________________  
**Status final:** ☐ Completo ☐ Parcial ☐ Pendente

---

**Próxima revisão:** (recomendado: 30 dias após implementação)

