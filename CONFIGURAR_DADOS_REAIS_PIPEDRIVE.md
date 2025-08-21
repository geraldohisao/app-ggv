# 🔧 Como Configurar Dados Reais do Pipedrive

Este guia explica como configurar o sistema para usar dados reais do Pipedrive em vez de dados simulados.

## 📋 **Status Atual**

✅ **Implementado:**
- Função Netlify para webhook (`diag-ggv-register`)
- Roteamento correto `/api/webhook/diag-ggv-register`
- Sistema de fallback para dados simulados
- Logs detalhados para debug

⚠️ **Pendente de Configuração:**
- URL do workflow N8N real
- Variáveis de ambiente de produção
- Teste com deal_id real do Pipedrive

## 🚀 **Passos para Ativar Dados Reais**

### 1. **Configurar N8N Workflow**

Você precisa criar/configurar um workflow no N8N que:

- **Receba:** GET request com `?deal_id=XXXXX`
- **Busque:** Dados do deal no Pipedrive via API
- **Retorne:** JSON com os dados formatados

**Exemplo de resposta esperada:**
```json
{
  "companyName": "Empresa Real Ltda",
  "email": "contato@empresareal.com.br",
  "ramo_de_atividade": "Tecnologia",
  "setor_de_atuação": "Tecnologia / Desenvolvimento / Sites",
  "faturamento_mensal": "R$ 101 a 300 mil/mês",
  "tamanho_equipe_comercial": "De 4 a 10 colaboradores"
}
```

### 2. **Configurar Variáveis de Ambiente na Netlify**

No painel da Netlify (Site settings > Environment variables):

```bash
N8N_PIPEDRIVE_WEBHOOK_URL=https://seu-n8n-server.com/webhook/pipedrive-deal
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
```

### 3. **Testar a Integração**

Após configurar, teste com:

```bash
curl -X GET "https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=SEU_DEAL_ID_REAL"
```

## 🔍 **Como o Sistema Funciona**

### **Fluxo de Dados Reais:**
1. **Frontend** → Faz requisição com `deal_id` real
2. **Netlify Function** → Recebe requisição
3. **N8N Webhook** → Busca dados no Pipedrive
4. **Pipedrive API** → Retorna dados do deal
5. **Frontend** → Preenche formulário automaticamente

### **Fluxo de Fallback (Atual):**
1. **Frontend** → Faz requisição com `deal_id`
2. **Netlify Function** → Tenta conectar com N8N
3. **N8N Indisponível** → Retorna erro específico
4. **Frontend** → Mostra mensagem de erro com orientação

## 🛠️ **Estrutura dos Arquivos**

```
netlify/functions/
  ├── diag-ggv-register.js     # Webhook principal (✅ criado)
  └── n8n-callback.js          # Callback do N8N (✅ existente)

netlify.toml                   # Roteamento configurado (✅)
hooks/usePipedriveData.ts      # Hook atualizado (✅)
```

## 📊 **Logs e Debug**

Para monitorar o funcionamento:

1. **Netlify Functions Logs:** Ver requisições e erros
2. **Browser Console:** Logs detalhados do frontend
3. **N8N Logs:** Status dos workflows

## 🔧 **Configuração Rápida para Testes**

Se quiser usar o servidor mock local durante desenvolvimento:

1. **Descomente a linha no `hooks/usePipedriveData.ts`:**
```typescript
const PIPEDRIVE_WEBHOOK_URL = isDevelopment ? 'http://localhost:8080/webhook/diag-ggv-register' : 'https://app.grupoggv.com/api/webhook/diag-ggv-register';
```

2. **Inicie o servidor mock:**
```bash
node mock-diagnostic-server.js
```

## ⚡ **Próximos Passos**

1. **Configure a URL do N8N** na variável `N8N_PIPEDRIVE_WEBHOOK_URL`
2. **Teste com um deal_id real** do seu Pipedrive
3. **Ajuste o mapeamento de campos** se necessário
4. **Remova o servidor mock** quando não precisar mais

## 🆘 **Resolução de Problemas**

### **Erro: "Serviço de integração indisponível"**
- Verifique se a URL do N8N está correta
- Confirme se o workflow N8N está ativo
- Teste a URL do N8N diretamente

### **Erro: "Deal ID não encontrado"**
- Verifique se o deal_id existe no Pipedrive
- Confirme se o workflow N8N tem acesso ao Pipedrive
- Verifique as credenciais da API do Pipedrive

### **Dados não preenchem no formulário**
- Verifique se os nomes dos campos estão corretos
- Confirme se os valores estão nas constantes do sistema
- Veja os logs do browser console

---

**📞 Precisa de ajuda?** Verifique os logs da Netlify Function e do browser console para mais detalhes sobre erros específicos.
