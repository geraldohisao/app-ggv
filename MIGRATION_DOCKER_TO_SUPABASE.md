# Migração: Removendo Docker e Usando Apenas Supabase

## 📋 Análise Realizada

### ✅ Sistema Principal (Já funciona apenas com Supabase)
- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **IA**: Google Gemini API
- **CRM**: Pipedrive API
- **Automação**: N8N Webhooks
- **Deploy**: Netlify

### ❌ Sistema Calls MVP (Docker - NÃO IMPLEMENTADO)
- **Arquitetura**: Fastify + BullMQ + Redis + MinIO + PostgreSQL
- **Status**: Apenas configuração Docker, sem código real implementado
- **Decisão**: REMOVER - não está sendo usado

## 🎯 Plano de Migração

### Fase 1: Remover Arquivos Docker ✅
- [x] Identificar arquivos Docker desnecessários
- [ ] Remover docker-compose.yml
- [ ] Remover Dockerfiles
- [ ] Limpar referências no código

### Fase 2: Migrar Calls para Supabase ✅
- [x] Analisar CallsList.tsx
- [ ] Criar tabelas no Supabase para calls
- [ ] Implementar API calls via Supabase Functions
- [ ] Atualizar componente CallsList

### Fase 3: Limpar Documentação ✅
- [ ] Atualizar README.md
- [ ] Remover referências Docker na documentação
- [ ] Simplificar guias de instalação

## 🔧 Funcionalidades que Precisam de Migração

### 1. Sistema de Calls (CallsList.tsx)
**Atual**: Chama `https://app.grupoggv.com/api/calls`
**Novo**: Usar Supabase + Edge Functions

### 2. Webhooks API
**Atual**: Referências a `/api/webhook/diag-ggv-register`
**Status**: Já funcionando via Netlify Functions

### 3. Automação N8N
**Status**: Já configurado corretamente

## 📊 Benefícios da Migração

1. **Simplicidade**: Apenas Supabase + Netlify
2. **Custo**: Sem infraestrutura Docker
3. **Manutenção**: Menos complexidade
4. **Escalabilidade**: Supabase gerencia automaticamente
5. **Desenvolvimento**: Apenas `npm run dev`

## ⚠️ Riscos Identificados

1. **CallsList**: Precisa ser reimplementado
2. **Webhooks**: Verificar se todos funcionam
3. **Funcionalidades**: Testar tudo após migração

## 🚀 Próximos Passos

1. Remover arquivos Docker
2. Criar schema calls no Supabase
3. Implementar Edge Function para calls
4. Testar todas funcionalidades
5. Atualizar documentação

