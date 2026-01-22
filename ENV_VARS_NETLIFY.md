# Variáveis de Ambiente - Netlify

Configure estas variáveis em **Netlify Dashboard > Site Settings > Environment Variables**:

## Obrigatórias

### Supabase
```
VITE_SUPABASE_URL=https://mwlekwyxbfbxfxskywgx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Opcionais (mas recomendadas)

### OpenAI (para análise de check-ins com IA)
```
VITE_OPENAI_API_KEY=sk-...
```
Alternativa: configurar via banco em `app_settings.openai_api_key`

### Gemini (alternativa ao OpenAI)
```
VITE_GEMINI_API_KEY=AIza...
```

### Gmail OAuth (se usar integração Gmail)
```
VITE_GMAIL_CLIENT_ID=...apps.googleusercontent.com
```

## Build Variables (já configuradas em netlify.toml)
```
NODE_VERSION=20.18.0
NODE_OPTIONS=--max-old-space-size=4096
NPM_CONFIG_PRODUCTION=false
```

## Fallbacks Implementados

Se as env vars não estiverem configuradas:
- **Supabase**: fallback para `window.APP_CONFIG` (não recomendado)
- **OpenAI/Gemini**: busca em `app_settings` table primeiro, depois env vars
- **Gmail**: funcionalidade desabilitada se não configurado

## Verificação

Após configurar, force um redeploy no Netlify para aplicar as variáveis.
