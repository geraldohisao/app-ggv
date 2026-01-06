# **Módulo de Gestão de OKR** 🎯

## **Funcionalidades**

- ✅ Dashboard de OKRs
- ✅ Criar com IA ou do Zero
- ✅ Editar mapa estratégico
- ✅ Salvar no Supabase
- ✅ Busca e filtros
- ✅ Duplicar e deletar
- ✅ Validação de dados
- ✅ Auto-save local
- ✅ Análise de IA

## **Estrutura**

```
components/okr/
├── OKRPage.tsx              # Roteamento principal
├── OKRDashboard.tsx         # Lista de OKRs
├── OKRContextForm.tsx       # Formulário IA
├── StrategicMapBuilder.tsx  # Editor
├── utils/
│   ├── validation.ts
│   └── retryWithBackoff.ts
├── hooks/
│   ├── useAutoSave.ts
│   └── useThrottledSave.ts
└── README.md
```

## **Setup**

1. Executar SQL: `supabase/sql/okr_schema.sql`
2. Configurar OpenAI Key em `app_settings`
3. Acessar: Avatar → "Gestão de OKR"

## **Permissões**

- ✅ Admin
- ✅ Super Admin
- ❌ Usuários comuns

