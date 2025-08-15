# App GGV - Sistema de Assistente IA e Diagnóstico Comercial

Sistema completo de Assistente IA e Diagnóstico Comercial desenvolvido para GGV.

## Funcionalidades

- 🤖 **Assistente IA** com múltiplas personas (SDR, Closer, Gestor)
- 📊 **Diagnóstico Comercial** completo com análise de resultados
- 📈 **Calculadora OTE** para análise de oportunidades
- 🔗 **Integração Pipedrive** para CRM
- 📞 **Sistema de Calls** com transcrição e análise
- 🎯 **RAG (Retrieval Augmented Generation)** com base de conhecimento

## Como Executar Localmente

**Pré-requisitos:** Node.js

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   - Defina `GEMINI_API_KEY` no arquivo `.env.local`
   - Configure outras variáveis conforme necessário

3. **Execute a aplicação:**
   ```bash
   npm run dev
   ```

## Busca Web (Opcional)

Para permitir que o assistente busque informações da web, configure via Settings → Preferências:

- `USE_WEB_SEARCH`: true/false
- `WEB_CONTEXT_HINT`: contexto como "vendas B2B Brasil, 2024, SaaS"
- `WEB_TOPK`: número de resultados (padrão: 2)
- `WEB_TIMEOUT_MS`: timeout da requisição (padrão: 5000)
- `G_CSE_API_KEY` e `G_CSE_CX`: credenciais do Google Programmable Search

## Arquitetura

O projeto utiliza uma arquitetura modular com:
- Frontend em React/TypeScript
- Backend API com roteamento inteligente
- Integração com Supabase
- Sistema de embeddings para RAG
- Múltiplos provedores de IA (Gemini, DeepSeek)
