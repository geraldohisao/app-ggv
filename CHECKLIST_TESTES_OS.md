# ✅ Checklist de Testes - Sistema de OS (Assinatura Eletrônica)

## 🚀 TESTES BÁSICOS

### 1️⃣ Criação de OS
- [ ] Abrir modal "Nova OS"
- [ ] Preencher título e número da OS
- [ ] Upload de PDF (máx 50MB)
- [ ] Botão "Anexar PDF" visível sem scroll
- [ ] Botão "Remover" funciona (limpa arquivo selecionado)
- [ ] Botão "Alterar Arquivo" funciona
- [ ] Adicionar assinantes internos (da lista)
- [ ] Adicionar assinantes externos (e-mail manual)
- [ ] Campo de data de expiração funciona
- [ ] Validação: título obrigatório
- [ ] Validação: número da OS obrigatório
- [ ] Validação: PDF obrigatório
- [ ] Validação: pelo menos 1 assinante
- [ ] Validação: e-mails válidos
- [ ] OS criada com sucesso
- [ ] E-mails de solicitação enviados para todos assinantes

### 2️⃣ E-mails (Verificar em Gmail e Hotmail)
- [ ] **Solicitação de assinatura:**
  - [ ] Logo aparece corretamente (não bloco preto/texto)
  - [ ] Assunto sem emoji
  - [ ] Layout profissional (tipo ClickSign)
  - [ ] Botão "Visualizar para assinar" funciona
  - [ ] Nome do assinante aparece
  - [ ] Título do documento correto
- [ ] **Lembrete:**
  - [ ] Logo correto
  - [ ] Mensagem clara
  - [ ] Botão funciona
- [ ] **Código de verificação:**
  - [ ] Logo correto
  - [ ] Código de 6 dígitos legível
  - [ ] Válido por tempo limitado
- [ ] **Documento finalizado:**
  - [ ] Logo correto
  - [ ] PDF anexado (com termo de assinatura)
  - [ ] Lista de assinantes
  - [ ] Enviado apenas para quem assinou
- [ ] **Documento cancelado:**
  - [ ] Logo correto
  - [ ] Motivo do cancelamento
  - [ ] Enviado para assinantes relevantes

### 3️⃣ Assinatura Individual
- [ ] Link do e-mail abre documento específico
- [ ] **Usuário logado:**
  - [ ] Vai direto para visualização (sem verificação)
- [ ] **Usuário externo:**
  - [ ] Pede verificação de e-mail
  - [ ] E-mail com código chega
  - [ ] Código aceito corretamente
  - [ ] Código inválido é rejeitado
  - [ ] SessionStorage guarda verificação
- [ ] PDF renderiza inline (sem abrir nova aba)
- [ ] Scroll do PDF funciona (não rola página de fundo)
- [ ] Botão "Assinar" fixo e sempre visível
- [ ] Sidebar mostra progresso (desktop)
- [ ] Modal de confirmação abre
- [ ] Campos prefillados (se já assinou antes):
  - [ ] Nome completo
  - [ ] CPF
  - [ ] Data de nascimento
- [ ] Validações:
  - [ ] Nome completo obrigatório
  - [ ] Nome e sobrenome (mínimo 2 palavras)
  - [ ] CPF válido (dígitos verificadores)
  - [ ] Data de nascimento válida
- [ ] Mensagem após assinar: **"Documento assinado com sucesso!"**
- [ ] Não mostra "Documento já assinado" logo após assinar
- [ ] Data/hora da assinatura exibida
- [ ] Se já assinado antes: mostra "Documento Já Assinado"

### 4️⃣ Finalização Automática
- [ ] Quando último assinante assina:
  - [ ] Status muda para "COMPLETED" automaticamente
  - [ ] PDF final com termo é gerado
  - [ ] Termo formatado profissionalmente (layout tipo Clicksign)
  - [ ] Termo contém:
    - [ ] Título "TERMO DE ASSINATURA DIGITAL"
    - [ ] Nome e hash do documento original
    - [ ] Data/hora de conclusão
    - [ ] Hash destacado em box
    - [ ] Cada assinatura em box individual:
      - [ ] Nome, e-mail, CPF
      - [ ] Data/hora de assinatura
      - [ ] IP e User Agent
      - [ ] Hash da assinatura
    - [ ] Observação legal no rodapé
    - [ ] Fuso horário (GMT-03:00)
  - [ ] `final_file_path` salvo no banco
  - [ ] `final_file_name` salvo no banco
  - [ ] `final_file_hash` salvo no banco
  - [ ] E-mails de "Documento finalizado" enviados
  - [ ] PDF final anexado no e-mail
  - [ ] Anexo é o PDF COM termo (não original)

### 5️⃣ Dashboard de Gestão
- [ ] Lista de OS carrega
- [ ] Auto-refresh a cada 12 segundos
- [ ] **Filtros:**
  - [ ] Por status (todos/aguardando/concluído/etc)
  - [ ] Por data (de/até)
  - [ ] Por assinante (e-mail)
  - [ ] Busca por título
  - [ ] Limpar filtros funciona
- [ ] **Informações exibidas:**
  - [ ] Número da OS
  - [ ] Título
  - [ ] Nome do arquivo
  - [ ] Status com badge colorida
  - [ ] Barra de progresso
  - [ ] Quantidade de assinaturas (X/Y)
  - [ ] Data de criação
  - [ ] Criado por (nome)
  - [ ] Aviso de expiração (se próximo)
- [ ] Botão "Visualizar" abre modal de detalhes

### 6️⃣ Modal de Detalhes
- [ ] **Aba "Visão Geral":**
  - [ ] Título, descrição, número da OS
  - [ ] Status e badges
  - [ ] Datas (criação, expiração, conclusão)
  - [ ] Tamanho do arquivo
  - [ ] Criado por
  - [ ] Resumo de status (Total/Assinados/Pendentes/Progresso)
- [ ] **Aba "Assinantes":**
  - [ ] Lista todos assinantes
  - [ ] Status de cada um (badge colorida)
  - [ ] Para pendentes:
    - [ ] Botão "Enviar Lembrete"
    - [ ] Último lembrete enviado
    - [ ] Botão "Remover assinante"
  - [ ] Para assinados:
    - [ ] Data/hora da assinatura
    - [ ] IP do assinante
    - [ ] Botão "Baixar comprovante (JSON)"
- [ ] **Botões de ação:**
  - [ ] "Visualizar PDF" abre preview inline
  - [ ] "Baixar PDF" baixa arquivo correto:
    - [ ] Se finalizada: PDF com termo
    - [ ] Se pendente: PDF original
  - [ ] "Cancelar OS" (se não concluída):
    - [ ] Confirmação obrigatória
    - [ ] Muda status para CANCELLED
    - [ ] Envia e-mail para assinantes
  - [ ] "Finalizar OS" (se todos assinaram):
    - [ ] Só aparece quando 100% assinado
    - [ ] Muda status para COMPLETED
    - [ ] Envia e-mails com PDF anexado
  - [ ] "Excluir OS" (se cancelada E não 100% assinada):
    - [ ] Confirmação detalhada
    - [ ] Remove arquivo original E final do storage
    - [ ] Remove signers e audit log
    - [ ] Remove registro da OS
- [ ] **Preview de PDF:**
  - [ ] Abre inline no modal (não nova aba)
  - [ ] Botão "← Voltar" funciona
  - [ ] Scroll do PDF não rola página de fundo
  - [ ] Carrega sem erros de CSP
  - [ ] Mostra PDF final se existir, senão original

### 7️⃣ Área "Minhas Assinaturas"
- [ ] Acesse: `/minhas-assinaturas/{seu-email}`
- [ ] **Usuário logado:**
  - [ ] Vai direto para lista (sem verificação)
- [ ] **Usuário externo:**
  - [ ] Pede verificação de e-mail
  - [ ] Após verificar, mostra lista
- [ ] **Aba "Pendentes":**
  - [ ] Lista documentos aguardando assinatura
  - [ ] Checkbox para selecionar
  - [ ] "Selecionar todos" funciona
  - [ ] Botão "Assinar X documento(s)"
  - [ ] Botão "Visualizar" individual
- [ ] **Aba "Assinados":**
  - [ ] Lista documentos já assinados
  - [ ] Data da assinatura
  - [ ] Botão para baixar
- [ ] **Assinatura em lote:**
  - [ ] Selecionar múltiplos documentos
  - [ ] Modal de assinatura em lote abre
  - [ ] Assina todos de uma vez
  - [ ] Progresso individual exibido

### 8️⃣ Segurança e Dados
- [ ] **Console do navegador (F12 → Console):**
  - [ ] Ao criar OS: `✅ Hash do arquivo calculado: ...`
  - [ ] Ao assinar: logs de IP, UA, hash
  - [ ] Ao finalizar: `🎉 OS FINALIZADA!`
  - [ ] Ao finalizar: `📄 Gerando PDF final...`
  - [ ] Ao finalizar: `📤 Upload do PDF final...`
  - [ ] Ao finalizar: `💾 Salvando dados no banco...`
  - [ ] Ao finalizar: `📧 Enviando e-mails...`
  - [ ] Ao baixar logo: `✅ Logo convertido para base64`
- [ ] **No Supabase:**
  - [ ] Execute: `supabase/sql/validate_os_security.sql`
  - [ ] Verifique `service_orders.file_hash` preenchido
  - [ ] Verifique `service_orders.final_file_hash` (se finalizada)
  - [ ] Verifique `os_signers.signature_hash` (se assinado)
  - [ ] Verifique `os_signers.signature_data` completo:
    - [ ] fullName, cpf, birthDate
    - [ ] ipAddress, userAgent
    - [ ] timezone, screenResolution
    - [ ] documentHash, signatureHash
  - [ ] Verifique `os_audit_log` tem eventos:
    - [ ] created, email_sent
    - [ ] signed (para cada assinatura)
    - [ ] completed (se finalizada)
    - [ ] cancelled (se cancelada)

---

## 🧪 TESTE COMPLETO E2E (End-to-End)

### Cenário 1: Fluxo Feliz (2 assinantes, ambos assinam)

**1. Criar OS**
- [ ] Vá em "Gerenciar OS" → "Nova OS"
- [ ] Título: `Contrato de Consultoria - Teste E2E`
- [ ] Número: `E2E-2026-001`
- [ ] Upload: qualquer PDF pequeno
- [ ] Assinante 1: seu e-mail principal
- [ ] Assinante 2: seu e-mail secundário (Gmail/Hotmail)
- [ ] Expira em: 30 dias
- [ ] Enviar

**2. Verificar Dashboard**
- [ ] OS aparece na lista com status "Aguardando"
- [ ] Número da OS exibido
- [ ] Progresso: 0/2 assinaturas
- [ ] Console sem erros

**3. Assinar como 1º assinante**
- [ ] Abrir e-mail de solicitação
- [ ] Logo aparece (não bloco preto)
- [ ] Clicar "Visualizar para assinar"
- [ ] PDF carrega inline
- [ ] Preencher: Nome, CPF (`111.444.777-35`), Data nascimento
- [ ] Clicar "Avançar"
- [ ] Mensagem: **"Documento assinado com sucesso!"**
- [ ] Data/hora exibida

**4. Verificar Dashboard (auto-refresh)**
- [ ] Aguardar 12 segundos
- [ ] Status muda para "Parcial" (1/2)
- [ ] Barra de progresso em 50%

**5. Assinar como 2º assinante**
- [ ] Abrir e-mail no segundo endereço
- [ ] Verificar e-mail (se externo)
- [ ] Assinar com CPF diferente (`123.456.789-09`)
- [ ] Mensagem de sucesso

**6. Verificar Finalização Automática**
- [ ] Console mostra logs:
  - [ ] `🎉 OS FINALIZADA!`
  - [ ] `📄 Gerando PDF final com termo...`
  - [ ] `✅ PDF final gerado`
  - [ ] `💾 Salvando dados do PDF final no banco...`
  - [ ] `📧 Enviando e-mails de finalização...`
  - [ ] `✅ E-mails enviados`
- [ ] Dashboard mostra status "Concluído" (2/2)

**7. Verificar E-mails de Finalização**
- [ ] Ambos assinantes receberam e-mail
- [ ] E-mail tem PDF anexado
- [ ] PDF anexado contém termo de assinatura na última página
- [ ] Termo está bem formatado (boxes, layout profissional)
- [ ] Termo contém:
  - [ ] Hash do documento original
  - [ ] Ambas assinaturas com CPF, IP, data/hora
  - [ ] Hashes individuais

**8. Verificar Downloads**
- [ ] No dashboard, abrir OS finalizada
- [ ] Clicar "Baixar PDF"
- [ ] Arquivo baixado é o PDF COM termo (nome: *-assinado.pdf)
- [ ] Última página do PDF é o termo
- [ ] Termo contém todas evidências

---

### Cenário 2: Remoção de Assinante

**1. Criar OS com 3 assinantes**
- [ ] Criar nova OS
- [ ] Adicionar 3 assinantes
- [ ] Enviar

**2. Remover 1 assinante pendente**
- [ ] Abrir OS no dashboard
- [ ] Aba "Assinantes"
- [ ] Clicar "Remover assinante" em um pendente
- [ ] Confirmação aparece
- [ ] Confirmar remoção
- [ ] Total de assinantes muda (3→2)
- [ ] Assinante removido recebe e-mail de cancelamento
- [ ] Audit log registra remoção

**3. Validar restrições**
- [ ] Assinar com um dos assinantes
- [ ] Tentar remover quem já assinou
- [ ] Deve bloquear: "Só é possível remover assinantes pendentes"

---

### Cenário 3: Cancelamento de OS

**1. Criar OS e cancelar antes de assinar**
- [ ] Criar OS com 2 assinantes
- [ ] No dashboard, abrir OS
- [ ] Clicar "Cancelar OS"
- [ ] Confirmação: "Esta ação não pode ser desfeita"
- [ ] Confirmar
- [ ] Status muda para "Cancelado"
- [ ] Ambos assinantes recebem e-mail de cancelamento

**2. Cancelar OS parcialmente assinada**
- [ ] Criar OS com 2 assinantes
- [ ] Assinar com 1 assinante
- [ ] Cancelar OS
- [ ] Ambos (assinado e pendente) recebem e-mail
- [ ] Status "Cancelado"

---

### Cenário 4: Exclusão de OS

**1. Tentar excluir OS não cancelada**
- [ ] Criar OS
- [ ] Tentar clicar "Excluir OS"
- [ ] Botão não deve aparecer (ou bloquear)

**2. Excluir OS cancelada**
- [ ] Criar OS
- [ ] Cancelar OS
- [ ] Botão "Excluir OS" aparece
- [ ] Clicar "Excluir OS"
- [ ] Confirmação detalhada aparece listando o que será removido
- [ ] Confirmar
- [ ] Console mostra logs:
  - [ ] `🗑️ Removendo arquivos do storage`
  - [ ] `🗑️ Removendo signers`
  - [ ] `🗑️ Removendo audit log`
  - [ ] `🗑️ Removendo OS`
  - [ ] `✅ OS excluída completamente`
- [ ] OS desaparece da lista
- [ ] Arquivo original removido do storage
- [ ] Arquivo final removido do storage (se existir)

**3. Validar restrição**
- [ ] Criar OS com 2 assinantes
- [ ] Assinar com ambos (OS completada)
- [ ] Cancelar OS
- [ ] Tentar excluir
- [ ] Deve bloquear: "Não é possível excluir documentos totalmente assinados"

---

## 📱 TESTES MOBILE

### iPhone/iPad (Safari)
- [ ] Página de assinatura:
  - [ ] Sidebar escondida em iPhone
  - [ ] PDF renderiza corretamente
  - [ ] Scroll do PDF suave
  - [ ] Botão "Assinar" fixo e visível
  - [ ] Inputs não dão zoom (16px font)
  - [ ] Teclado numérico para CPF/data
- [ ] Dashboard:
  - [ ] Cards legíveis
  - [ ] Botões com área de toque adequada
  - [ ] Filtros responsivos
- [ ] Modal de assinatura:
  - [ ] Scroll funciona
  - [ ] Botões acessíveis
  - [ ] Não ultrapassa altura da tela

### Android (Chrome)
- [ ] Mesmas validações do iPhone
- [ ] Botões com feedback tátil (active state)
- [ ] Touch funciona suavemente

---

## 🔍 TESTES DE VALIDAÇÃO

### CPF
- [ ] CPF válido aceito: `111.444.777-35`
- [ ] CPF válido aceito: `123.456.789-09`
- [ ] CPF inválido rejeitado: `111.111.111-11`
- [ ] CPF inválido rejeitado: `123.456.789-00`
- [ ] Formatação automática: `11144477735` → `111.444.777-35`

### Data de Nascimento
- [ ] Data válida aceita: `21/11/1991`
- [ ] Data inválida rejeitada: `32/13/2050`
- [ ] Data futura rejeitada
- [ ] Formatação automática: `21111991` → `21/11/1991`

### Upload de PDF
- [ ] PDF pequeno (< 1MB) aceito
- [ ] PDF médio (5-10MB) aceito
- [ ] PDF grande (40-50MB) aceito
- [ ] Arquivo não-PDF rejeitado
- [ ] Arquivo > 50MB rejeitado (se aplicável)

---

## 🔒 TESTES DE SEGURANÇA

### RLS (Row Level Security)
- [ ] Usuário comum não vê OS de outros
- [ ] Admin/Super Admin vê todas OS
- [ ] Assinante vê apenas OS onde foi incluído
- [ ] Não consegue deletar OS sem permissão

### Hashes e Integridade
- [ ] `file_hash` sempre preenchido ao criar OS
- [ ] `final_file_hash` preenchido ao finalizar
- [ ] `signature_hash` preenchido ao assinar
- [ ] Hashes são SHA-256 válidos (64 caracteres hex)

### Audit Log
- [ ] Execute no Supabase:
```sql
SELECT event_type, COUNT(*) as count 
FROM os_audit_log 
GROUP BY event_type 
ORDER BY count DESC;
```
- [ ] Deve ter eventos: created, email_sent, signed, completed

---

## 🎨 TESTES DE UX

### Loading States
- [ ] Lista de OS mostra skeleton enquanto carrega (não spinner)
- [ ] Skeleton animado (pulse)
- [ ] Botões mostram estado de loading
- [ ] Texto muda: "Baixando...", "Processando..."

### Feedback Visual
- [ ] Botões com hover state (desktop)
- [ ] Botões com active state (mobile)
- [ ] Cores consistentes:
  - [ ] Verde para sucesso/concluído
  - [ ] Âmbar para pendente
  - [ ] Azul para parcial/progresso
  - [ ] Vermelho para erro/cancelado
  - [ ] Cinza para expirado

### Mensagens
- [ ] Erros claros e acionáveis
- [ ] Sucessos confirmam ação realizada
- [ ] Confirmações explicam consequências
- [ ] Emojis adequados (⚠️, ✅, ❌, 🔒)

---

## 🌐 TESTES DE NAVEGADORES

### Chrome (Desktop)
- [ ] Todas funcionalidades OK
- [ ] Console sem erros
- [ ] PDF renderiza

### Firefox
- [ ] Assinatura funciona
- [ ] IP fallback OK (0.0.0.0 se bloquear)
- [ ] PDF renderiza

### Safari (Desktop)
- [ ] Todas funcionalidades OK
- [ ] PDF renderiza

### Edge
- [ ] Compatibilidade geral

---

## 📊 VALIDAÇÃO FINAL

### Execute no Supabase SQL Editor:
```sql
-- 1. Verificar OS com todos dados
SELECT 
    id, title, status, 
    file_hash IS NOT NULL as has_hash,
    final_file_hash IS NOT NULL as has_final_hash,
    signed_count, total_signers
FROM service_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar assinaturas com prova completa
SELECT 
    email, status,
    signature_hash IS NOT NULL as has_sig_hash,
    signature_data IS NOT NULL as has_sig_data,
    signature_data->>'cpf' as cpf,
    signature_data->>'ipAddress' as ip
FROM os_signers 
WHERE status = 'SIGNED'
ORDER BY signed_at DESC 
LIMIT 5;

-- 3. Verificar eventos do audit log
SELECT event_type, COUNT(*) 
FROM os_audit_log 
GROUP BY event_type;
```

### Resultados Esperados:
- [ ] Todos file_hash preenchidos
- [ ] OS finalizadas têm final_file_hash
- [ ] Assinaturas têm signature_hash e signature_data
- [ ] signature_data contém CPF e IP
- [ ] Audit log tem eventos variados

---

## 📝 CHECKLIST RESUMIDO (Teste Rápido)

- [ ] ✅ Criar OS com 2 assinantes
- [ ] ✅ Assinar com ambos
- [ ] ✅ Mensagem "sucesso" aparece
- [ ] ✅ E-mail de finalização chega
- [ ] ✅ PDF anexado tem termo
- [ ] ✅ Download baixa PDF com termo
- [ ] ✅ Termo bem formatado
- [ ] ✅ Console sem erros críticos
- [ ] ✅ Dados no banco completos
- [ ] ✅ Mobile funciona (teste em celular)

---

## 🐛 Problemas Conhecidos

**Gmail:**
- Logo pode aparecer como bloco preto (limitação do Gmail com imagens base64 grandes)
- **Solução:** Funciona perfeitamente em Outlook/Hotmail

**Se encontrar bugs, anote:**
1. O que estava fazendo
2. O que esperava que acontecesse
3. O que realmente aconteceu
4. Screenshot do console (F12)
5. Navegador e versão

