# 📧 Configuração EmailJS - GGV App

## 🎯 Objetivo
Configurar EmailJS para envio de e-mails do diagnóstico sem dependências de servidor.

## 🔧 Passos de Configuração

### 1. Criar Conta EmailJS
1. Acesse: https://www.emailjs.com/
2. Crie uma conta gratuita
3. Faça login no dashboard

### 2. Configurar Serviço de E-mail
1. Vá para "Email Services"
2. Clique em "Add New Service"
3. Escolha "Gmail" 
4. Configure:
   - **Service ID**: `service_ggv_gmail`
   - **Service Name**: `GGV Gmail Service`
   - **Gmail**: Use a conta do Gmail da GGV
5. Autorize a conta Gmail

### 3. Criar Template de E-mail
1. Vá para "Email Templates"
2. Clique em "Create New Template"
3. Configure:
   - **Template ID**: `template_diagnostico`
   - **Template Name**: `Diagnóstico GGV`

**Template HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-GGV-Branca.png" 
                 alt="GGV Inteligência" 
                 style="max-width: 200px; height: auto;">
        </div>
        
        <h2>Olá, {{to_name}}!</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {{{message}}}
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
            Enviado por <strong>{{from_name}}</strong><br>
            <a href="https://ggvinteligencia.com.br" style="color: #0066cc;">ggvinteligencia.com.br</a>
        </p>
    </div>
</body>
</html>
```

**Configurações do Template:**
- **Subject**: `{{subject}}`
- **To Email**: `{{to_email}}`
- **To Name**: `{{to_name}}`
- **From Name**: `{{from_name}}`
- **Reply To**: `{{reply_to}}`

### 4. Obter Chaves
1. Vá para "Account" > "General"
2. Copie a **Public Key**
3. Atualize no arquivo `services/emailService.ts`:

```typescript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'SUA_PUBLIC_KEY_AQUI',
  SERVICE_ID: 'service_ggv_gmail',
  TEMPLATE_ID: 'template_diagnostico'
};
```

## 🧪 Teste
1. Use o template de teste no EmailJS dashboard
2. Envie um e-mail de teste
3. Verifique se chegou corretamente

## 📋 Variáveis do Template
- `{{to_email}}` - E-mail do destinatário
- `{{to_name}}` - Nome da empresa
- `{{subject}}` - Assunto do e-mail
- `{{message}}` - Conteúdo HTML do e-mail
- `{{from_name}}` - "GGV Inteligência"
- `{{reply_to}}` - "contato@grupoggv.com"

## 🎯 Vantagens
- ✅ Funciona em localhost e produção
- ✅ Não depende de servidor backend
- ✅ Não precisa de autenticação complexa
- ✅ Fallback para mailto sempre disponível
- ✅ Gratuito até 200 e-mails/mês

## 🔒 Segurança
- Public Key pode ser exposta (é seguro)
- Service ID e Template ID são públicos
- Gmail autorizado via OAuth do EmailJS
