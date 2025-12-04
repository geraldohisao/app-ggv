# 🚀 Setup Rápido - OS Manager

## ✅ Sistema Implementado com Sucesso!

**O que foi criado:**

### **1. Frontend Completo ✨**
- ✅ Página principal com dashboard (`OSManagerPage.tsx`)
- ✅ Modal de upload com drag-and-drop (`OSUploadModal.tsx`)
- ✅ Painel de listagem com filtros (`OSListPanel.tsx`)
- ✅ Modal de detalhes por documento (`OSDetailModal.tsx`)
- ✅ Integração no menu do avatar (UserMenu)
- ✅ Roteamento configurado (`/ordens-servico`)

### **2. Backend/Banco de Dados 🗄️**
- ✅ Schema SQL completo (`supabase/sql/os_manager_schema.sql`)
- ✅ Tabelas: `service_orders`, `os_signers`, `os_audit_log`
- ✅ Índices otimizados para performance
- ✅ Row Level Security (RLS) configurado
- ✅ Funções automatizadas (triggers)
- ✅ View otimizada para listagem

### **3. Types TypeScript 📝**
- ✅ `ServiceOrder`, `OSSigner`, `OSStatus`, `SignerStatus`
- ✅ Enums e interfaces completas
- ✅ Tipagem forte em todos os componentes

### **4. Documentação 📚**
- ✅ README completo com instruções de uso
- ✅ Este guia de setup

---

## 🔧 Configuração no Supabase (5 minutos)

### **PASSO 1: Executar Schema SQL** ⚙️

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **"New Query"**
4. Copie todo o conteúdo de `supabase/sql/os_manager_schema.sql`
5. Cole no editor e clique em **"Run"**

**✅ Isso criará:**
- 3 tabelas principais
- Índices de performance
- Políticas de segurança (RLS)
- Triggers automáticos
- Funções auxiliares
- View otimizada

---

### **PASSO 2: Criar Bucket de Storage** 📦

No **SQL Editor**, execute:

```sql
-- Criar bucket para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-orders', 'service-orders', false)
ON CONFLICT (id) DO NOTHING;
```

---

### **PASSO 3: Configurar Políticas de Storage** 🔐

No **SQL Editor**, execute:

```sql
-- Política 1: Admins podem fazer upload
CREATE POLICY "Admins can upload service orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'service-orders' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- Política 2: Usuários autenticados podem baixar
CREATE POLICY "Users can download service orders"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'service-orders');

-- Política 3: Admins podem deletar
CREATE POLICY "Admins can delete service orders"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'service-orders' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
);
```

---

### **PASSO 4: Verificar Permissões** ✔️

Execute para verificar se está tudo OK:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%service%' OR table_name LIKE '%signer%';

-- Verificar bucket criado
SELECT * FROM storage.buckets WHERE id = 'service-orders';

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('service_orders', 'os_signers', 'os_audit_log');
```

---

## 🎯 Como Acessar no Sistema

### **Para Admins/Gestores:**

1. **Faça login no sistema**
2. **Clique no seu avatar** (canto superior direito)
3. **Selecione "Gerenciar OS"** no menu dropdown
4. **Pronto!** Você será direcionado para `/ordens-servico`

### **Estrutura do Menu:**

```
Avatar (Canto superior direito)
├── 💬 Melhorias e Bugs
├── 🏳️  Feedback de Oportunidade
├── 📋 Gerenciar OS  ← NOVO!
├── ⚡ Reativação de Leads (N8N)
└── ⚙️  Configurações
```

**Nota:** A opção "Gerenciar OS" aparece apenas para **ADMIN** e **SUPER_ADMIN**.

---

## 🧪 Testando o Sistema

### **1. Criar Primeira OS:**

1. Clique em **"Nova OS"**
2. Preencha:
   - **Título:** "Teste - Contrato de Prestação de Serviços"
   - **Descrição:** "Documento de teste"
   - **PDF:** Selecione qualquer PDF de teste
3. Clique em **"Próximo"**
4. Adicione assinantes:
   - Selecione colaboradores do sistema OU
   - Adicione manualmente (seu próprio e-mail para teste)
5. Escolha prazo: **30 dias**
6. Clique em **"Enviar para Assinatura"**

### **2. Verificar Dashboard:**

✅ Deve aparecer na listagem
✅ Cards de estatísticas devem atualizar
✅ Status: **Aguardando**
✅ Progresso: **0%**

### **3. Testar Filtros:**

✅ Buscar por título
✅ Filtrar por status
✅ Filtrar por data
✅ Limpar filtros

### **4. Ver Detalhes:**

✅ Clicar na OS criada
✅ Ver aba "Visão Geral"
✅ Ver aba "Assinantes"
✅ Baixar PDF
✅ Enviar lembrete

---

## 🎨 Fluxo Completo

### **Fluxo do Gestor:**

```
1. Criar OS
   ↓
2. Upload PDF + Adicionar Assinantes
   ↓
3. Enviar para Assinatura
   ↓
4. Acompanhar Status no Dashboard
   ↓
5. Enviar Lembretes (se necessário)
   ↓
6. Baixar Documento Assinado (quando completo)
```

### **Fluxo do Assinante (Futuro):**

```
1. Receber E-mail com Link
   ↓
2. Acessar Documento
   ↓
3. Revisar PDF
   ↓
4. Assinar Digitalmente
   ↓
5. Confirmação
```

**Nota:** O fluxo de assinatura para assinantes será implementado em uma próxima fase.

---

## 📊 Status e Cores

| Status | Cor | Badge |
|--------|-----|-------|
| **Rascunho** | Cinza | `bg-slate-100` |
| **Aguardando** | Âmbar | `bg-amber-100` |
| **Parcialmente Assinado** | Azul | `bg-blue-100` |
| **Concluído** | Verde | `bg-green-100` |
| **Cancelado** | Vermelho | `bg-red-100` |
| **Expirado** | Cinza Escuro | `bg-slate-100` |

---

## 🔒 Segurança Implementada

### **RLS (Row Level Security):**

✅ **Admins:** Acesso total a todas as OS
✅ **Usuários:** Veem apenas OS que criaram
✅ **Assinantes:** Veem apenas OS onde estão incluídos
✅ **Storage:** Upload apenas para admins, download para autenticados

### **Auditoria:**

✅ Todos os eventos são registrados em `os_audit_log`
✅ IP e User Agent capturados
✅ Timestamps precisos
✅ Metadados flexíveis (JSONB)

### **Integridade:**

✅ Hash SHA-256 dos arquivos
✅ Hash das assinaturas
✅ Validação de tipos de arquivo (apenas PDF)
✅ Triggers automáticos para contadores

---

## ⚠️ Importante

### **Permissões Necessárias:**

Para acessar o OS Manager, o usuário precisa ter:
- **role:** `ADMIN` ou `SUPER_ADMIN` na tabela `profiles`

### **Adicionar Admin via SQL:**

```sql
UPDATE profiles 
SET role = 'ADMIN' 
WHERE email = 'seu-email@exemplo.com';
```

---

## 🚧 Próximas Fases

### **Fase 2 - Sistema de E-mails:**
- Notificações automáticas
- Lembretes programados
- Templates personalizados

### **Fase 3 - Interface de Assinatura:**
- Página pública para assinantes
- Canvas para assinatura digital
- Validação e confirmação

### **Fase 4 - Certificado Digital:**
- PDF com certificado de assinaturas
- QR Code para validação
- Selo de autenticidade

---

## 📞 Suporte

**Tudo funcionando?** 🎉

Se encontrar problemas:
1. Verifique se executou todos os passos do PASSO 1-4
2. Confirme que seu usuário é ADMIN ou SUPER_ADMIN
3. Veja os logs do navegador (F12 > Console)
4. Acesse "Melhorias e Bugs" no menu do avatar

---

## ✅ Checklist de Validação

Marque conforme for completando:

- [ ] Schema SQL executado no Supabase
- [ ] Bucket `service-orders` criado
- [ ] Políticas de storage configuradas
- [ ] Usuário configurado como ADMIN
- [ ] Menu "Gerenciar OS" aparece no avatar
- [ ] Página `/ordens-servico` acessível
- [ ] Criou primeira OS de teste
- [ ] Dashboard exibindo estatísticas
- [ ] Filtros funcionando
- [ ] Detalhes da OS abrindo corretamente
- [ ] Download de PDF funcionando

---

**🎉 Sistema de OS Manager está pronto para uso!**

**Desenvolvido com ❤️ seguindo as melhores práticas de UX dos líderes de mercado.**

