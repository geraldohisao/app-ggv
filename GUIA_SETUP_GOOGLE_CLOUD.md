# 🔧 **GUIA COMPLETO: SETUP GOOGLE CLOUD**

---

## **🎯 OBJETIVO**

Configurar acesso à API do Google Workspace para importar usuários.

**Tempo estimado:** 30-40 minutos

---

## **📋 PASSO A PASSO**

### **PASSO 1: Acessar Google Cloud Console** ⏱️ 2min

1. Abra: **https://console.cloud.google.com**
2. **Faça login** com sua conta Google Workspace (geraldo@grupoggv.com)
3. Se pedir para aceitar termos, aceite

---

### **PASSO 2: Criar Projeto** ⏱️ 3min

1. **No topo da página**, clique no **seletor de projeto** (ao lado de "Google Cloud")
2. Clique em **"NEW PROJECT"** (ou "NOVO PROJETO")
3. Preencha:
   - **Project name:** `GGV Workspace Sync`
   - **Organization:** grupoggv.com (se aparecer)
   - **Location:** deixe como está
4. Clique em **"CREATE"** (ou "CRIAR")
5. **Aguarde** ~30 segundos (projeto sendo criado)
6. **Selecione o projeto** que acabou de criar (clique nele)

---

### **PASSO 3: Ativar Admin SDK API** ⏱️ 3min

1. No menu lateral (☰), vá em: **"APIs & Services"** → **"Library"**
   - Ou acesse direto: https://console.cloud.google.com/apis/library
   
2. Na barra de busca, digite: **"Admin SDK API"**

3. Clique em **"Admin SDK API"**

4. Clique no botão **"ENABLE"** (ou "ATIVAR")

5. Aguarde ativar (~10 segundos)

6. Deve aparecer: **"API enabled"** ✅

---

### **PASSO 4: Criar Service Account** ⏱️ 5min

1. No menu lateral, vá em: **"IAM & Admin"** → **"Service Accounts"**
   - Ou: https://console.cloud.google.com/iam-admin/serviceaccounts

2. Clique em **"+ CREATE SERVICE ACCOUNT"** (topo da página)

3. **Tela 1 - Detalhes:**
   - **Service account name:** `workspace-sync`
   - **Service account ID:** `workspace-sync` (auto-preenche)
   - **Description:** `Sincronização de usuários do Google Workspace`
   - Clique **"CREATE AND CONTINUE"**

4. **Tela 2 - Permissões:**
   - **Role:** Deixe vazio (não precisa de role no projeto)
   - Clique **"CONTINUE"**

5. **Tela 3 - Acesso:**
   - Deixe vazio
   - Clique **"DONE"**

6. ✅ Service Account criada!

---

### **PASSO 5: Baixar Credenciais JSON** ⏱️ 2min

1. Na lista de Service Accounts, **localize** `workspace-sync@...`

2. Clique nos **3 pontinhos** (⋮) à direita → **"Manage keys"**

3. Clique em **"ADD KEY"** → **"Create new key"**

4. Selecione tipo: **JSON**

5. Clique **"CREATE"**

6. **Arquivo JSON baixa automaticamente** (guarde em local seguro!)
   - Nome tipo: `ggv-workspace-sync-xxxxx.json`

7. ✅ **NÃO COMPARTILHE** esse arquivo (é a chave de acesso!)

---

### **PASSO 6: Anotar Client ID** ⏱️ 1min

1. **Abra o arquivo JSON** que baixou

2. **Procure** o campo: `"client_id"`

3. **Copie** o valor (número grande tipo: `123456789012345678901`)

4. **Cole em um bloco de notas** (vamos usar no próximo passo)

Exemplo do JSON:
```json
{
  "type": "service_account",
  "project_id": "ggv-workspace-sync",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "workspace-sync@ggv-workspace-sync.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",  ← COPIE ESTE
  "auth_uri": "...",
  "token_uri": "...",
  ...
}
```

---

### **PASSO 7: Domain-Wide Delegation** ⏱️ 10min

**Este é o passo mais importante!**

1. Abra **Google Workspace Admin Console**: https://admin.google.com

2. **Faça login** como Super Admin (geraldo@grupoggv.com)

3. No menu lateral, vá em: **"Segurança"** → **"Acesso e controle de dados"** → **"Controles de API"**
   - Ou acesse direto: https://admin.google.com/ac/owl/domainwidedelegation

4. Role para baixo até: **"Delegação em todo o domínio"**

5. Clique em **"Gerenciar delegação em todo o domínio"**

6. Clique em **"Adicionar novo"** (botão azul)

7. Preencha:
   - **ID do cliente:** `123456789012345678901` (o Client ID que você copiou)
   
   - **Escopos OAuth:** Cole isto (tudo em uma linha):
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.orgunit.readonly
   ```

8. Clique em **"Autorizar"**

9. ✅ Deve aparecer na lista de apps autorizados!

---

### **PASSO 8: Testar Credenciais** ⏱️ 5min

**Vou criar um script de teste para você verificar se funcionou!**

Me envie o arquivo JSON (ou apenas o `client_email`) e eu crio um teste rápido.

---

## **⚠️ PONTOS DE ATENÇÃO:**

### **Segurança:**
- 🔒 **NÃO compartilhe** o arquivo JSON publicamente
- 🔒 **NÃO commite** no Git
- 🔒 Guarde em local seguro

### **Permissões necessárias:**
- ✅ Precisa ser **Super Admin** no Google Workspace
- ✅ Se não for, peça para outro admin fazer

### **Escopos OAuth:**
- ✅ `.readonly` = só leitura (seguro!)
- ✅ Não pode alterar dados no Google
- ✅ Apenas busca usuários

---

## **✅ CHECKLIST:**

Ao finalizar, você deve ter:
- [ ] ✅ Projeto criado no Google Cloud
- [ ] ✅ Admin SDK API ativada
- [ ] ✅ Service Account criada
- [ ] ✅ Arquivo JSON baixado
- [ ] ✅ Client ID copiado
- [ ] ✅ Domain-wide delegation configurado
- [ ] ✅ App autorizado no Admin Console

---

## **📞 SE TIVER DÚVIDAS:**

**Problema comum 1:** "Não acho Domain-Wide Delegation"
- Solução: Acesse direto: https://admin.google.com/ac/owl/domainwidedelegation

**Problema comum 2:** "Não vejo o menu Segurança"
- Solução: Confirme que está logado como Super Admin

**Problema comum 3:** "Erro ao autorizar escopos"
- Solução: Verifique se copiou o Client ID correto (sem espaços)

---

## **🚀 APÓS CONCLUIR:**

Me avise e eu:
1. ✅ Crio script de teste das credenciais
2. ✅ Implemento Edge Function
3. ✅ Crio interface de import
4. ✅ Testamos a importação!

---

**Comece pelo Passo 1 e me avise quando chegar no Passo 8!** 🚀  
Qualquer dúvida, me pergunta! 😊

