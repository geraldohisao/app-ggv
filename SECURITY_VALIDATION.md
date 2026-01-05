# 🔒 Validação de Segurança - Sistema de OS

## ✅ Implementações de Segurança Jurídica

### 1. Hash do Documento Original
- **Campo:** `service_orders.file_hash` (SHA-256)
- **Quando:** Calculado no upload do PDF
- **Onde:** `OSUploadModal.tsx` (linha 234)
- **Propósito:** Garantir integridade do documento original

### 2. Hash do Documento Final (com termo)
- **Campo:** `service_orders.final_file_hash` (SHA-256)
- **Quando:** Calculado após gerar PDF final com termo
- **Onde:** `OSSignatureModal.tsx` (função `generateFinalPdfWithTerm`)
- **Propósito:** Garantir integridade do documento assinado

### 3. Prova de Assinatura Completa
**Campos em `os_signers`:**
- `signature_hash` (SHA-256 de todos dados abaixo)
- `signature_data` (JSON com):
  - `fullName`: Nome completo validado
  - `cpf`: CPF validado (dígitos verificadores)
  - `birthDate`: Data de nascimento (DD/MM/AAAA)
  - `signedAt`: Timestamp ISO da assinatura
  - `ipAddress`: IP do assinante (fallback: 0.0.0.0)
  - `userAgent`: Browser/device completo
  - `timezone`: Fuso horário do assinante
  - `screenResolution`: Resolução da tela
  - `documentHash`: Hash do documento que foi assinado

**Onde:** `OSSignatureModal.tsx` (linhas 178-207)

### 4. Audit Log Imutável
**Tabela:** `os_audit_log`
**Eventos registrados:**
- `created`: OS criada
- `email_sent`: E-mail de solicitação enviado
- `reminder_sent`: Lembrete enviado
- `signed`: Documento assinado
- `completed`: OS finalizada
- `cancelled`: OS cancelada
- `email_sent_finalized`: E-mail de finalização enviado
- `email_sent_cancelled`: E-mail de cancelamento enviado

**Dados salvos:**
- `os_id`, `signer_id`, `user_id`
- `event_type`, `event_description`
- `ip_address`, `user_agent`
- `metadata` (dados extras do evento)
- `created_at` (timestamp imutável)

### 5. Termo de Assinatura Anexado
**Localização:** Última página do PDF final
**Conteúdo:**
- Título do documento e hash original
- Data/hora de conclusão
- Lista de assinantes com:
  - Nome, e-mail, CPF, papel
  - Data/hora de assinatura
  - IP e User Agent
  - Hash da assinatura individual
- Observação legal
- Fuso horário

### 6. Validação de CPF
- **Algoritmo:** Validação de dígitos verificadores
- **Onde:** `OSSignatureModal.tsx` (função `validateCPF`)
- **Impacto:** Apenas CPFs válidos são aceitos

### 7. IP Fallback
- **Serviço:** api.ipify.org
- **Fallback:** 0.0.0.0 se falhar
- **CSP:** Domain adicionado em connect-src
- **Compatibilidade:** Firefox, Safari, Chrome

### 8. Row Level Security (RLS)
**Tabelas protegidas:**
- `service_orders`: Apenas admins/criadores/assinantes
- `os_signers`: Apenas relacionados à OS
- `os_audit_log`: Apenas leitura para relacionados

**Storage:**
- Bucket `service-orders`: INSERT/UPDATE/DELETE (admins), SELECT (authenticated)

---

## 🧪 Como Validar

### Execute no Supabase SQL Editor:
```sql
-- Ver arquivo: supabase/sql/validate_os_security.sql
```

### Verificar em Produção:
1. Crie uma OS com 2 assinantes
2. Assine com ambos (CPFs válidos)
3. Verifique no banco:
   - `service_orders.file_hash` preenchido?
   - `service_orders.final_file_hash` preenchido?
   - `os_signers.signature_hash` preenchido para ambos?
   - `os_signers.signature_data` completo (CPF, IP, UA, etc)?
   - `os_audit_log` tem eventos: created, sent, signed, completed?
4. Baixe PDF final
5. Abra última página (termo)
6. Verifique todos dados estão presentes

### Teste de Segurança:
1. Tente acessar OS de outro usuário (deve bloquear)
2. Tente deletar bucket sem ser admin (deve bloquear)
3. Tente modificar signature_data após assinar (deve bloquear)
4. Verifique se hash muda se PDF for alterado

---

## 📊 Conformidade Legal

✅ **Integridade:** Hashes SHA-256 garantem documento não foi alterado  
✅ **Autenticidade:** CPF validado + e-mail verificado  
✅ **Não-repúdio:** IP + User Agent + timestamp + termo assinado  
✅ **Rastreabilidade:** Audit log completo e imutável  
✅ **Prova:** Termo anexado ao PDF com todas evidências  

---

## 🎯 Melhorias Futuras (Opcional)

- [ ] Certificado digital ICP-Brasil (e-CPF/e-CNPJ)
- [ ] Biometria facial (liveness detection)
- [ ] Assinatura manuscrita digitalizada
- [ ] Carimbo de tempo (timestamp authority)
- [ ] Blockchain para imutabilidade extra
- [ ] Geolocalização precisa (além de IP)
- [ ] Backup redundante em múltiplos storages

