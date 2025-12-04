# ✅ CHECKLIST - Corrigir Notificações de Feedback

## 📊 DIAGNÓSTICO (Já feito ✅)
- ✅ Query de chamadas executada
- ✅ Query de feedbacks executada
- ✅ Problema identificado: 50% dos feedbacks sem sdr_id

---

## 🔧 EXECUÇÃO (Fazer agora 👇)

### □ **ETAPA 1: Instalar Trigger**
Arquivo: `INSTALAR_TRIGGER_FEEDBACK.sql`

**Ações:**
- [ ] Abrir Supabase SQL Editor
- [ ] Copiar conteúdo do arquivo
- [ ] Colar no SQL Editor
- [ ] Clicar em "Run"
- [ ] Verificar mensagem: "✅ TRIGGER INSTALADO COM SUCESSO!"

**Tempo estimado:** 5 segundos

---

### □ **ETAPA 2: Corrigir Dados Existentes**
Arquivo: `CORRIGIR_SDR_ID_MASSIVO.sql`

**Ações:**
- [ ] Nova query no SQL Editor
- [ ] Copiar conteúdo do arquivo
- [ ] Colar no SQL Editor
- [ ] Clicar em "Run"
- [ ] Aguardar conclusão (20-30s)

**Verificar resultados:**
- [ ] "📞 CHAMADAS (APÓS)" mostra 95%+ com sdr_id
- [ ] "💬 FEEDBACKS (APÓS)" mostra 100% com sdr_id
- [ ] "🎯 FEEDBACK DA HIARA" mostra "✅ OK"

**Tempo estimado:** 30 segundos

---

### □ **ETAPA 3: Testar no Frontend**

**Login como Hiara:**
- [ ] Hiara faz login (ou recarrega página)
- [ ] Verificar sino 🔔 no canto superior direito
- [ ] Deve mostrar badge com "1" notificação
- [ ] Clicar no sino
- [ ] Deve listar: "teste feedback"
- [ ] Clicar na notificação
- [ ] Deve abrir a chamada da Hiara Saienne
- [ ] Badge deve sumir (notificação marcada como lida)

**Tempo estimado:** 2 minutos

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ SQL Editor
- [x] Script 1 executado sem erros
- [x] Script 2 executado sem erros
- [x] Feedback da Hiara com sdr_id preenchido
- [x] 100% dos feedbacks com sdr_id

### ✅ Frontend
- [x] Notificação aparece para Hiara
- [x] Badge vermelho no sino 🔔
- [x] Clicar leva para chamada correta
- [x] Notificação marcada como lida após clicar

---

## 📝 NOTAS

### Estatísticas Atuais:
```
CHAMADAS:
- Total: 5372
- Com sdr_id: 608 (11%)
- Sem sdr_id: 4764 (89%)

FEEDBACKS:
- Total: 10
- Com sdr_id: 5 (50%) ❌
- Sem sdr_id: 5 (50%) ❌
```

### Estatísticas Esperadas (Após Correção):
```
CHAMADAS:
- Total: 5372
- Com sdr_id: ~5300 (98%+) ✅
- Sem sdr_id: ~72 (2%)

FEEDBACKS:
- Total: 10
- Com sdr_id: 10 (100%) ✅
- Sem sdr_id: 0 (0%) ✅
```

---

## 🐛 TROUBLESHOOTING

### Problema: Notificação ainda não aparece
- [ ] Verificar se o script 2 foi executado completamente
- [ ] Executar: `TESTE_RAPIDO_NOTIFICACOES.sql`
- [ ] Verificar teste 5: "NOTIFICAÇÕES DA HIARA"
- [ ] Verificar teste 6: "DETALHES DAS NOTIFICAÇÕES"

### Problema: Feedbacks ainda sem sdr_id
- [ ] Verificar se chamadas têm `agent_id`
- [ ] Verificar se email existe na tabela `profiles`
- [ ] Executar seção "PARTE 10" do script de correção

---

## 📞 CONTATO

Se precisar de ajuda:
1. Enviar screenshot dos resultados do SQL
2. Enviar screenshot do sino de notificações
3. Copiar mensagens de erro (se houver)

---

**Status:** ⏳ Aguardando Execução
**Data:** 24/10/2025
**Prioridade:** 🔴 Alta

---

## 📦 ARQUIVOS CRIADOS

Todos os arquivos estão na raiz do projeto:

1. ⭐ **INSTALAR_TRIGGER_FEEDBACK.sql** (Executar PRIMEIRO)
2. ⭐ **CORRIGIR_SDR_ID_MASSIVO.sql** (Executar SEGUNDO)
3. 📖 **GUIA_EXECUCAO_RAPIDA.md** (Ler antes de executar)
4. ✅ **CHECKLIST_EXECUCAO.md** (Este arquivo)
5. 🧪 **TESTE_RAPIDO_NOTIFICACOES.sql** (Para validar depois)
6. 📚 **DOCUMENTACAO_FEEDBACK_NOTIFICACOES.md** (Referência completa)
7. 🔧 **FIX_FEEDBACK_NOTIFICACOES_COMPLETO.sql** (Alternativa completa)

---

## 🎉 QUANDO TUDO ESTIVER ✅

Marque todos os checkboxes acima e considere este problema:

**RESOLVIDO! 🎊**

A partir de agora:
- ✅ Novos feedbacks terão sdr_id automaticamente
- ✅ Notificações chegarão corretamente para os SDRs
- ✅ Sistema funcionará sem intervenção manual


