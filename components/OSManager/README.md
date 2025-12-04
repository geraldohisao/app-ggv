# 📋 Sistema de Gerenciamento de Ordens de Serviço (OS Manager)

## 📌 Visão Geral

Sistema completo de gerenciamento de Ordens de Serviço com **assinatura eletrônica digital**, inspirado em plataformas como **ClickSign** e **Autentique**. 

Permite upload de PDFs, seleção de múltiplos assinantes, acompanhamento de status em tempo real e controle completo do ciclo de vida das assinaturas.

---

## ✨ Funcionalidades Principais

### 🎯 Para Gestores/Admins:

✅ **Upload de Documentos PDF**
- Interface drag-and-drop intuitiva
- Validação automática de tipo de arquivo
- Armazenamento seguro no Supabase Storage

✅ **Gestão de Assinantes**
- Seleção rápida de colaboradores do sistema
- Adição manual de assinantes externos
- Definição de papéis (Colaborador, Gestor, Testemunha, Aprovador)
- Ordenação de assinatura (ordem sequencial)

✅ **Painel de Controle Completo**
- Visualização de todas as OS em tempo real
- Filtros avançados por:
  - Status (Aguardando, Parcial, Concluído, Cancelado)
  - Data de criação
  - Colaborador
  - Busca textual
- Cards com estatísticas (Total, Pendentes, Parciais, Concluídas)

✅ **Acompanhamento Detalhado**
- Status individual de cada assinante
- Progresso visual com barra de conclusão
- Histórico de ações (auditoria)
- Informações de IP e dispositivo nas assinaturas
- Envio de lembretes para assinantes pendentes

✅ **Controles Administrativos**
- Download do PDF original
- Cancelamento de OS
- Definição de prazo de validade (7, 15, 30, 60, 90 dias)
- Sistema de auditoria completo

### 👥 Para Assinantes:

✅ **Recebimento de Notificação**
- E-mail automático com link para assinatura (a implementar)
- Interface dedicada para visualização e assinatura

✅ **Histórico**
- Consulta de documentos assinados
- Comprovante com hash de integridade

---

## 🏗️ Arquitetura Técnica

### **Componentes Frontend:**

```
components/OSManager/
├── OSManagerPage.tsx        # Página principal com dashboard
├── OSUploadModal.tsx        # Modal de upload e seleção de assinantes
├── OSListPanel.tsx          # Listagem com filtros avançados
├── OSDetailModal.tsx        # Visualização detalhada da OS
└── README.md               # Documentação (este arquivo)
```

### **Banco de Dados (Supabase):**

```sql
Tabelas:
- service_orders         # Ordens de serviço principais
- os_signers            # Assinantes de cada OS
- os_audit_log          # Log de auditoria completo

Views:
- os_list_view          # View otimizada para listagem

Storage:
- Bucket: service-orders # Armazenamento seguro de PDFs
```

### **Segurança (RLS):**

✅ **Row Level Security (RLS)** habilitado em todas as tabelas
✅ **Políticas de acesso:**
- Admins: acesso completo
- Usuários: visualizam apenas suas próprias OS
- Assinantes: visualizam apenas OS onde estão incluídos
- Service role: gestão completa via backend

---

## 🚀 Como Usar

### **1️⃣ Acessar o Sistema:**

1. Faça login no sistema
2. Clique no **avatar do usuário** no canto superior direito
3. Selecione **"Gerenciar OS"** no menu

### **2️⃣ Criar Nova OS:**

1. Clique no botão **"Nova OS"** no canto superior direito
2. **Passo 1 - Documento:**
   - Preencha o título da OS
   - Adicione uma descrição (opcional)
   - Faça upload do PDF (arrastar ou selecionar)
3. **Passo 2 - Assinantes:**
   - Selecione colaboradores do sistema OU
   - Adicione manualmente (nome, e-mail, função)
   - Configure o prazo de validade
4. Clique em **"Enviar para Assinatura"**

### **3️⃣ Acompanhar OS:**

1. No painel principal, visualize todas as OS
2. Use os **filtros** para encontrar documentos específicos
3. Clique em uma OS para ver **detalhes completos**
4. Na tela de detalhes:
   - Tab **"Visão Geral"**: resumo e informações gerais
   - Tab **"Assinantes"**: status detalhado de cada pessoa
   - Envie lembretes para pendentes
   - Baixe o PDF original
   - Cancele a OS se necessário

### **4️⃣ Status das OS:**

| Status | Descrição |
|--------|-----------|
| 🟡 **Rascunho** | OS criada mas não enviada |
| 🟠 **Aguardando** | Enviada, nenhuma assinatura ainda |
| 🔵 **Parcialmente Assinado** | Algumas pessoas assinaram |
| 🟢 **Concluído** | Todos assinaram |
| 🔴 **Cancelado** | OS cancelada manualmente |
| ⚫ **Expirado** | Prazo de validade expirou |

---

## 📊 Estatísticas do Dashboard

O painel principal exibe cards com métricas em tempo real:

- **Total de OS**: Quantidade total de documentos
- **Aguardando**: OS sem nenhuma assinatura
- **Parcialmente Assinadas**: OS com assinaturas pendentes
- **Concluídas**: OS totalmente assinadas

---

## 🛠️ Configuração Inicial

### **1️⃣ Executar Schema SQL:**

Execute o arquivo `supabase/sql/os_manager_schema.sql` no **SQL Editor do Supabase** para criar:
- Tabelas
- Índices
- Políticas de segurança (RLS)
- Funções automatizadas
- Views otimizadas

### **2️⃣ Criar Bucket de Storage:**

```sql
-- Execute no SQL Editor do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-orders', 'service-orders', false)
ON CONFLICT (id) DO NOTHING;
```

### **3️⃣ Configurar Políticas de Storage:**

```sql
-- Permitir admins fazerem upload
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

-- Permitir usuários autenticados baixarem
CREATE POLICY "Users can download service orders"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'service-orders');
```

---

## 🔐 Segurança e Auditoria

### **Recursos de Segurança:**

✅ **Criptografia**: PDFs armazenados com segurança no Supabase Storage
✅ **Hash de Integridade**: SHA-256 do arquivo para detectar alterações
✅ **Assinatura Digital**: Hash da assinatura para validação
✅ **Rastreamento**: IP e User Agent de cada assinatura
✅ **RLS (Row Level Security)**: Acesso controlado por políticas
✅ **Auditoria Completa**: Log de todas as ações

### **Log de Auditoria:**

Todos os eventos são registrados na tabela `os_audit_log`:
- Criação da OS
- Envio para assinantes
- Visualização do documento
- Assinatura realizada
- Lembretes enviados
- Cancelamentos
- Downloads

---

## 🎨 UX/UI Highlights

### **Design Inspirado em ClickSign/Autentique:**

✨ **Interface Moderna e Limpa**
- Gradientes sutis e sombras elegantes
- Cards informativos com ícones
- Cores semânticas (verde = sucesso, âmbar = pendente, etc)

✨ **Feedback Visual**
- Barras de progresso animadas
- Badges de status coloridos
- Loading states e animações suaves

✨ **Usabilidade**
- Drag-and-drop para upload
- Seleção rápida de colaboradores
- Filtros avançados expansíveis
- Atalhos visuais e tooltips

---

## 🚧 Próximas Implementações

### **Em Desenvolvimento:**

🔄 **Sistema de E-mails:**
- Notificação automática para assinantes
- Lembretes programados
- Confirmação de assinatura

🔄 **Assinatura Eletrônica:**
- Interface de assinatura para os assinantes
- Captura de assinatura digital (canvas)
- Validação biométrica (opcional)

🔄 **Certificado Digital:**
- Geração de PDF com certificado de assinaturas
- QR Code para validação
- Selo de autenticidade

🔄 **Webhooks:**
- Integração com sistemas externos
- Notificações em tempo real

---

## 📞 Suporte

Para dúvidas ou sugestões sobre o sistema de OS Manager:
- Acesse **"Melhorias e Bugs"** no menu do avatar
- Ou entre em contato com o time de desenvolvimento

---

## 📝 Changelog

### **v1.0.0 (Dezembro 2025)**
- ✅ Upload de PDFs com drag-and-drop
- ✅ Seleção múltipla de assinantes
- ✅ Painel de controle com filtros avançados
- ✅ Visualização detalhada por documento
- ✅ Sistema de auditoria completo
- ✅ Row Level Security (RLS)
- ✅ Estatísticas em tempo real
- ✅ Controle de prazos e expiração

---

**🎉 Sistema de OS Manager - Gestão Profissional de Assinaturas Digitais**

