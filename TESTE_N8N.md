# 🧪 Como Testar a Integração N8N/Pipedrive

## ✅ Integração Implementada

A integração com o N8N/Pipedrive está implementada e pronta para teste:

### 📍 **Endpoint**
```
https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register
```

### 🔧 **Como Funciona**
1. Detecta `deal_id` na URL: `?deal_id=569934`
2. Faz requisição GET: `GET /webhook-test/diag-ggv-register?deal_id=569934`
3. Mapeia dados recebidos para os campos do diagnóstico
4. Preenche formulário automaticamente

## 🧪 Métodos de Teste

### **1. Teste no Console do Navegador**
```javascript
// Copie e cole no console:
copy(fetch('https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register?deal_id=569934'))
```

### **2. Teste com Script Completo**
1. Abra o DevTools (F12)
2. Vá para Console
3. Cole o conteúdo do arquivo `test-n8n-integration.js`
4. Execute: `testN8nIntegration()`

### **3. Teste com Página HTML**
1. Abra o arquivo `test-pipedrive.html` no navegador
2. Digite um deal_id
3. Clique em "Testar Requisição GET"

### **4. Teste em Produção**
1. Acesse: `http://localhost:5173/diagnostico?deal_id=569934`
2. Verifique os logs no console
3. Observe se os campos são preenchidos automaticamente

## 📋 **Campos Mapeados**

A integração mapeia os seguintes campos do Pipedrive:

```javascript
{
  companyName: 'Nome da Empresa',
  email: 'Email de Contato', 
  activityBranch: 'Ramo de Atividade',
  activitySector: 'Setor de Atividade',
  monthlyBilling: 'Faturamento Mensal',
  salesTeamSize: 'Tamanho da Equipe de Vendas',
  salesChannels: ['Canais', 'de', 'Vendas']
}
```

### **Variações de Nomes Suportadas**
- `companyName` ou `company_name` ou `org_name`
- `email` ou `contact_email` ou `person_email`
- `activityBranch` ou `activity_branch` ou `ramo`
- `activitySector` ou `activity_sector` ou `setor`
- `monthlyBilling` ou `monthly_billing` ou `faturamento_mensal`
- `salesTeamSize` ou `sales_team_size` ou `tamanho_equipe_vendas`
- `salesChannels` ou `sales_channels` ou `canais_vendas`

## 🔍 **Logs de Debug**

Quando a integração roda, você verá logs como:
```
🔄 PIPEDRIVE - Buscando dados para deal_id: 569934
📍 PIPEDRIVE - URL completa: https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register?deal_id=569934
📊 PIPEDRIVE - Status da resposta: 200
📄 PIPEDRIVE - Resposta raw: {"companyName": "..."}
✅ PIPEDRIVE - Dados JSON recebidos: {...}
✅ PIPEDRIVE - Dados mapeados: {...}
🔄 PREFILL - Aplicando dados do Pipedrive: {...}
```

## ⚠️ **Possíveis Problemas**

### **CORS Error**
Se aparecer erro de CORS, o servidor N8N precisa adicionar headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
```

### **404 Not Found**
- Verificar se o endpoint está ativo
- Confirmar URL correta

### **JSON Parse Error** 
- Servidor está retornando HTML em vez de JSON
- Verificar resposta raw nos logs

## 🎯 **Status da Integração**

- ✅ Hook `usePipedriveData` implementado
- ✅ Integrado no `DiagnosticoComercial`
- ✅ Logs detalhados para debug
- ✅ Tratamento de erros robusto
- ✅ Mapeamento flexível de campos
- ✅ Fallback para N8N legado
- ✅ Interface visual com status

**A integração está pronta! Agora é só testar com dados reais do N8N.**
