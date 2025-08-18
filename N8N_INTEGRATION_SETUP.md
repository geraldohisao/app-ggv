# Configuração da Integração N8N

## Variáveis de Ambiente Necessárias

Para que a funcionalidade de reativação de leads funcione corretamente, configure as seguintes variáveis de ambiente no backend:

### Backend (packages/api/.env)

```bash
# N8N Configuration
N8N_REACTIVATION_WEBHOOK_URL=https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads
N8N_TIMEOUT_MS=15000

# Redis Configuration (if needed)
REDIS_URL=redis://localhost:6379

# Other API configurations
PORT_API=8080
```

## Funcionalidades Implementadas

### 1. Schema de Validação (Zod)
- Validação dos campos exatos exigidos pelo N8N
- Tipos TypeScript para type safety
- Valores padrão configurados

### 2. Backend Proxy Seguro
- Rota `/automation/reactivation` no backend
- Validação de entrada com Zod
- Timeout configurável (15s padrão)
- Logs detalhados para debug
- Modo mock quando URL não configurada

### 3. Frontend
- Interface administrativa com formulário
- Validação em tempo real
- Feedback visual de sucesso/erro
- Integração com Debug Panel
- Acesso restrito a ADMIN e SUPER_ADMIN

### 4. Debug e Logs
- Logs no Debug Panel (categoria AUTOMATION)
- Telemetria completa de requisições
- Detalhes técnicos em caso de erro

## Payload Enviado ao N8N

```json
{
  "filtro": "Lista de reativação - Topo de funil",
  "proprietario": "Andressa",
  "cadencia": "Reativação - Sem Retorno",
  "numero_negocio": 20
}
```

## Como Usar

1. Configure as variáveis de ambiente no backend
2. Acesse como ADMIN/SUPER_ADMIN
3. Vá para "Reativação de Leads (N8N)" no menu do usuário
4. Preencha o formulário e clique em "Ativar Automação"
5. Monitore os logs no Debug Panel

## Segurança

- Acesso restrito a administradores
- Validação rigorosa de entrada
- Proxy seguro (não expõe credenciais)
- Timeout para evitar travamentos
- Logs para auditoria
