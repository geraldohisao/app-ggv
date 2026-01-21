# 🎯 Módulo OKR + Sprints v1.0

**Data de Release**: 2026-01-07  
**Status**: ✅ **PRONTO PARA USO**

## 🚀 Como usar via interface (v1.1)

### Criar/editar OKR (UI)
1) Acesse `/okr` (menu Avatar → Gestão de OKR).  
2) Clique em **“+ Novo OKR”** (ou “Editar” em um card).  
3) Preencha objetivo, nível, departamento, responsável, datas, status.  
4) Adicione 1+ Key Results (título, valor atual, meta, unidade, status).  
5) Salve: o OKR aparece/atualiza no dashboard imediatamente.

### Criar/editar Sprint (UI)
1) Aba **Sprints** → **“+ Nova Sprint”** (ou “Editar” no card).  
2) Selecione tipo, departamento, título, datas, status.  
3) (Opcional) Vincule a um OKR pelo dropdown.  
4) Salve: a lista atualiza na hora.

### Itens da Sprint (durante a reunião)
1) Abra a Sprint → botões **Adicionar Iniciativa/Impedimento/Decisão**.  
2) Preencha título, responsável, status, data limite (opcional).  
3) Edite status inline (pendente → em andamento → concluído).  
4) Itens podem ser editados ou removidos na hora.

### Permissões na UI
- **CEO (SuperAdmin):** vê e edita tudo.  
- **HEAD (Admin):** cria/edita OKRs e Sprints só do próprio departamento; vê estratégicos read-only.  
- **OPERATIONAL (User):** apenas leitura; não vê botões de ação.

---

## 📖 Visão Geral

Sistema completo de gestão de OKRs (Objectives and Key Results) e Sprints, focado em simplicidade e eficiência para uso em reuniões semanais, mensais e trimestrais.

### Características Principais

- ✅ **OKRs**: Estratégicos (CEO) e Setoriais (Heads de Departamento)
- ✅ **Key Results**: Métricas numéricas com status visual (verde/amarelo/vermelho)
- ✅ **Sprints**: Semanais, Mensais e Trimestrais
- ✅ **Itens de Sprint**: Iniciativas, Impedimentos e Decisões
- ✅ **Permissões**: CEO, HEAD, OPERATIONAL (via RLS no Supabase)
- ✅ **Dashboard**: Visão consolidada com filtros e métricas
- ✅ **100% TypeScript**: Tipagem completa com Zod

---

## 🚀 Como Usar

### 1. Acessar o Módulo

1. Faça login como **Admin** ou **Super Admin**
2. Clique no **avatar** no canto superior direito
3. Selecione **"Gestão de OKR"**

### 2. Criar um OKR (Via Console - Temporário)

```javascript
// Abra o console do navegador (F12)
import * as okrService from './components/okr/services/okr.service';

const novoOKR = await okrService.createOKRWithKeyResults(
  {
    level: 'estratégico',
    department: 'geral',
    owner: 'João Silva (CEO)',
    objective: 'Aumentar receita recorrente em 30% no Q1 2026',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    periodicity: 'trimestral',
    status: 'em andamento',
    notes: 'Foco em expansão de mercado e retenção de clientes',
  },
  [
    {
      title: 'Gerar R$ 1.5M em ARR',
      current_value: 0,
      target_value: 1500000,
      unit: 'R$',
      status: 'vermelho',
    },
    {
      title: 'Fechar 50 novos contratos',
      current_value: 0,
      target_value: 50,
      unit: 'contratos',
      status: 'vermelho',
    },
    {
      title: 'Taxa de retenção de 95%',
      current_value: 0,
      target_value: 95,
      unit: '%',
      status: 'vermelho',
    },
  ]
);

console.log('✅ OKR criado:', novoOKR);
```

### 3. Criar uma Sprint (Via Console - Temporário)

```javascript
import * as sprintService from './components/okr/services/sprint.service';

const novaSprint = await sprintService.createSprintWithItems(
  {
    type: 'semanal',
    department: 'comercial',
    title: 'Sprint Comercial - Semana 2/2026',
    description: 'Foco em prospecção ativa e follow-up de propostas',
    start_date: '2026-01-06',
    end_date: '2026-01-10',
    status: 'em andamento',
    okr_id: 'UUID_DO_OKR', // Opcional: vincular a um OKR
  },
  [
    {
      type: 'iniciativa',
      title: 'Campanha de cold email para segmento tecnologia',
      responsible: 'Maria Santos (SDR)',
      status: 'em andamento',
      due_date: '2026-01-08',
    },
    {
      type: 'impedimento',
      title: 'CRM fora do ar na segunda-feira',
      responsible: 'TI',
      status: 'concluído',
    },
    {
      type: 'decisão',
      title: 'Aprovar desconto de 15% para contratos anuais',
      responsible: 'Gerente Comercial',
      status: 'concluído',
    },
  ]
);

console.log('✅ Sprint criada:', novaSprint);
```

### 4. Atualizar um Key Result (Reunião Semanal)

```javascript
import * as okrService from './components/okr/services/okr.service';

await okrService.updateKeyResult('UUID_DO_KEY_RESULT', {
  current_value: 450000, // R$ 450k alcançados
  status: 'amarelo', // Mudou de vermelho para amarelo
});

console.log('✅ Key Result atualizado!');
```

---

## 📊 Estrutura de Dados

### OKR
```typescript
{
  level: 'estratégico' | 'setorial',
  department: 'geral' | 'comercial' | 'marketing' | 'projetos',
  owner: string,
  objective: string,
  start_date: Date,
  end_date: Date,
  periodicity: 'mensal' | 'trimestral',
  status: 'não iniciado' | 'em andamento' | 'concluído',
  notes?: string,
  key_results: KeyResult[]
}
```

### Key Result
```typescript
{
  title: string,
  current_value: number,
  target_value: number,
  unit: string,
  status: 'verde' | 'amarelo' | 'vermelho'
}
```

### Sprint
```typescript
{
  type: 'semanal' | 'mensal' | 'trimestral',
  department: 'geral' | 'comercial' | 'marketing' | 'projetos',
  title: string,
  description?: string,
  start_date: Date,
  end_date: Date,
  status: 'planejada' | 'em andamento' | 'concluída' | 'cancelada',
  okr_id?: UUID,
  items: SprintItem[]
}
```

### Sprint Item
```typescript
{
  type: 'iniciativa' | 'impedimento' | 'decisão',
  title: string,
  description?: string,
  responsible?: string,
  status: 'pendente' | 'em andamento' | 'concluído',
  due_date?: Date
}
```

---

## 🔒 Permissões

### CEO (SUPER_ADMIN)
- ✅ Ver todos os OKRs (estratégicos + setoriais)
- ✅ Criar/editar/deletar qualquer OKR
- ✅ Ver todas as Sprints
- ✅ Criar/editar/deletar qualquer Sprint

### HEAD (ADMIN)
- ✅ Ver OKRs estratégicos (read-only)
- ✅ Ver OKRs do próprio departamento
- ✅ Criar/editar/deletar OKRs do próprio departamento
- ✅ Ver Sprints gerais
- ✅ Ver Sprints do próprio departamento
- ✅ Criar/editar/deletar Sprints do próprio departamento
- ❌ Não pode acessar OKRs/Sprints de outros departamentos

### OPERATIONAL (USER)
- ✅ Ver todos os OKRs (read-only)
- ✅ Ver todas as Sprints (read-only)
- ❌ Não pode criar/editar/deletar nada

**Nota**: As permissões são garantidas por **RLS (Row Level Security)** no Supabase, então mesmo que o frontend seja hackeado, o backend bloqueia acessos não autorizados.

---

## 🎨 Telas Disponíveis

### 1. Dashboard de OKRs (`/okr`)
- Cards visuais de OKRs
- Métricas: total, concluídos, em andamento, atrasados
- Filtros: nível, departamento, status
- Busca por texto

### 2. Lista de Sprints (`/okr` → Tab "Sprints")
- Cards visuais de Sprints
- Métricas: total, planejadas, em andamento, concluídas
- Filtros: tipo, departamento, status
- Busca por texto

### 3. Detalhe de Sprint
- Itens agrupados por tipo (Iniciativas, Impedimentos, Decisões)
- Atualização de status inline
- Progresso visual
- Link para OKR vinculado

---

## 📁 Estrutura de Arquivos

```
components/okr/
├── OKRModule.tsx              # Ponto de entrada principal
├── pages/
│   ├── OKRDashboard.tsx       # Dashboard de OKRs
│   ├── SprintList.tsx         # Lista de Sprints
│   └── SprintDetail.tsx       # Detalhe de Sprint
├── components/
│   ├── okr/
│   │   ├── OKRCard.tsx        # Card visual de OKR
│   │   └── KeyResultItem.tsx  # Item de Key Result
│   ├── sprint/
│   │   ├── SprintCard.tsx     # Card visual de Sprint
│   │   └── SprintItemRow.tsx  # Linha de item de Sprint
│   └── shared/
│       ├── Badge.tsx          # Badge genérico
│       ├── ProgressBar.tsx    # Barra de progresso
│       ├── EmptyState.tsx     # Estado vazio
│       └── LoadingState.tsx   # Estado de loading
├── services/
│   ├── okr.service.ts         # API de OKRs
│   └── sprint.service.ts      # API de Sprints
├── store/
│   ├── okrStore.ts            # Zustand store de OKRs
│   └── sprintStore.ts         # Zustand store de Sprints
├── types/
│   ├── okr.types.ts           # Types + Zod schemas de OKR
│   └── sprint.types.ts        # Types + Zod schemas de Sprint
└── sql/
    └── okr_v2_schema.sql      # Schema SQL completo
```

---

## 🗄️ Database

### Tabelas Criadas
- `okrs` - OKRs estratégicos e setoriais
- `key_results` - Key Results dos OKRs
- `sprints` - Sprints semanais, mensais, trimestrais
- `sprint_items` - Itens das Sprints

### Views
- `okrs_with_progress` - OKRs com progresso calculado
- `sprints_with_metrics` - Sprints com métricas de itens

### Funções
- `calculate_okr_progress(uuid)` - Calcula progresso de um OKR

### RLS Policies
- Configuradas para CEO, HEAD e OPERATIONAL
- Baseadas em `profiles.role` e `profiles.department`

---

## 🔧 Dependências

### Instaladas
- `zustand` - State management
- `zod` - Validation
- `@hookform/resolvers` - Form validation (futuro)

### Já Existentes
- `react` / `react-dom`
- `typescript`
- `supabase`

---

## 📝 Próximas Versões

### v1.1 - Formulários (Estimativa: 4-6 horas)
- OKRForm (criar/editar OKR via UI)
- SprintForm (criar/editar Sprint via UI)
- SprintItemForm (adicionar item inline)

### v1.2 - UX Avançado
- Confirmações de delete com modal
- Toast notifications
- Atalhos de teclado
- Drag & drop para reordenar

### v2.0 - Recursos Avançados
- IA para sugerir OKRs baseado no histórico
- Histórico de versões (snapshots automáticos)
- Exportação PDF profissional
- Gráficos e dashboards avançados
- Integração com Pipedrive/CRM

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch"
- Verifique se o Supabase está acessível
- Confirme que o SQL foi executado corretamente
- Verifique as políticas RLS

### Erro: "Permission denied"
- Verifique o `role` do usuário em `profiles`
- Confirme que `department` está preenchido para HEADs
- Revise as políticas RLS no Supabase

### OKRs não aparecem no dashboard
- Confirme que existem OKRs criados no banco
- Verifique os filtros aplicados
- Abra o console e procure por erros JavaScript

---

## 📞 Suporte

**Documentação Completa**: `STATUS.md`  
**Schema SQL**: `sql/okr_v2_schema.sql`  
**Tipos**: `types/okr.types.ts` e `types/sprint.types.ts`

---

**🎉 Sistema pronto para uso! Boa sorte com seus OKRs 2026!**

