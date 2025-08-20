# App GGV - Sistema de Assistente IA e Diagnóstico Comercial

Sistema completo de Assistente IA e Diagnóstico Comercial desenvolvido para GGV.

## Funcionalidades

- 🤖 **Assistente IA** com múltiplas personas (SDR, Closer, Gestor)
- 📊 **Diagnóstico Comercial** completo com análise de resultados
- 📈 **Calculadora OTE** para análise de oportunidades
- 🔗 **Integração Pipedrive** para CRM
- 📞 **Sistema de Calls** com transcrição e análise (via Supabase)
- 🎯 **RAG (Retrieval Augmented Generation)** com base de conhecimento

## Como Executar Localmente

**Pré-requisitos:** Node.js 18+

### 🚀 Início Rápido

1. **Clone e instale dependências:**
```bash
git clone <repo-url>
cd app-ggv
npm install
```

2. **Execute o servidor de desenvolvimento:**
```bash
npm run dev
```

3. **Acesse a aplicação:**
- Local: http://localhost:5173
- Produção: https://app.grupoggv.com

### 🏗️ Arquitetura Simplificada

- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **IA**: Google Gemini API
- **Deploy**: Netlify
- **CRM**: Pipedrive API
- **Automação**: N8N Webhooks

## Configuração

1. **Configure as variáveis de ambiente:**
   - Defina `GEMINI_API_KEY` via Settings → Gerenciar Chaves de API
   - Configure outras variáveis conforme necessário

2. **Configuração do Supabase:**
   - Execute os scripts SQL em `supabase/sql/` para configurar as tabelas
   - Configure as chaves no arquivo `index.html` ou via Settings

## Busca Web (Opcional)

Para permitir que o assistente busque informações da web, configure via Settings → Preferências:

- `USE_WEB_SEARCH`: true/false
- `WEB_CONTEXT_HINT`: contexto como "vendas B2B Brasil, 2024, SaaS"
- `WEB_TOPK`: número de resultados (padrão: 2)
- `WEB_TIMEOUT_MS`: timeout da requisição (padrão: 5000)
- `G_CSE_API_KEY` e `G_CSE_CX`: credenciais do Google Programmable Search

## Arquitetura

O projeto utiliza uma arquitetura serverless moderna:
- **Frontend**: React/TypeScript com Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **Deploy**: Netlify com integração contínua
- **IA**: Google Gemini API para chat e embeddings
- **Integrações**: Pipedrive (CRM) e N8N (automação)

## Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build local
- `npm run test` - Executar testes

## Estrutura do Projeto

```
app-ggv/
├── components/          # Componentes React
├── services/           # Serviços (Supabase, APIs)
├── hooks/             # Custom hooks
├── contexts/          # React contexts
├── supabase/sql/      # Scripts SQL do banco
├── src/               # Utilitários e configurações
└── public/            # Arquivos estáticos
```

## Suporte

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com a equipe de desenvolvimento.