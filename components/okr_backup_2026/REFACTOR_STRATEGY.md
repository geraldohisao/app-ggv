# 🚀 Estratégia de Implementação - Sistema OKR + Sprints GGV 2026

## 📊 Análise do Plano Proposto

### ✅ Pontos Fortes do Plano

1. **Hierarquia Clara de Níveis**
   - Estratégico → Setorial → Operacional
   - Resolve o problema atual de "um mapa único"
   - Alinhamento top-down bem definido

2. **Sprints Integradas**
   - **NOVO**: Sistema atual não tem sprints
   - Diferenciação clara (semanal/mensal/trimestral)
   - Liga ação (sprint) com resultado (OKR)

3. **Permissões Bem Definidas**
   - CEO: tudo
   - Heads: só seu setor
   - Operacional: só leitura
   - **Melhor que atual**: RLS genérico por user_id

4. **Simplicidade dos Dados**
   - Interface `OKR` é direta e clara
   - Sem campos desnecessários
   - Status simples (não iniciado/em andamento/concluído)

5. **UX Focada**
   - Dashboard por setor (atual é geral)
   - Alertas de atraso (atual não tem)
   - Timeline de roadmap (atual não tem)

### ⚠️ Pontos de Atenção

1. **Escopo Maior que Atual**
   - Atual: ~70% OKR básico
   - Proposto: OKR + Sprints + Reuniões + Timeline
   - **Risco**: Overengineering inicial

2. **IA Mencionada mas "Futuro"**
   - Sistema atual já tem integração OpenAI/Gemini
   - **Decisão**: Manter ou remover?

3. **Histórico Trimestral**
   - Atual tem `strategic_maps_history` mas não usa
   - **Pergunta**: Histórico por versão ou por trimestre?

4. **Exportação PDF**
   - Atual tem, mas com dependências não instaladas
   - **Decisão**: Priorizar ou deixar para depois?

---

## 🔄 Comparação: Atual vs Proposto

| Aspecto | Sistema Atual | Plano Proposto | Decisão |
|---------|--------------|----------------|---------|
| **Hierarquia** | Flat (1 mapa = 1 empresa) | Estratégico → Setorial → Operacional | ✅ Novo é melhor |
| **OKRs** | Múltiplos OKRs por mapa | OKR individual por área/nível | ✅ Novo é mais claro |
| **Sprints** | ❌ Não existe | Semanal/Mensal/Trimestral | ✅ Adicionar |
| **Permissões** | RLS genérico por user | Níveis (CEO/Head/Op) | ✅ Novo é mais robusto |
| **Dashboard** | Listagem de mapas | Resumo por setor + alertas | ✅ Novo é mais útil |
| **IA** | OpenAI + Gemini integrado | "Futuro" | ⚠️ Decidir |
| **Validação** | Frontend inconsistente | Zod (proposto) | ✅ Novo é melhor |
| **Estado** | useState múltiplos | Zustand (proposto) | ✅ Novo é melhor |
| **PDF** | Implementado mas bugado | Listado | ⚠️ Manter ou refazer |

---

## 🎯 Estratégia de Implementação

### Fase 0: Preparação (1 dia)

#### 0.1. Limpeza do Código Atual
```bash
# Mover código atual para backup
mv components/okr components/okr_old_backup

# Criar estrutura nova limpa
mkdir -p components/okr/{pages,components,hooks,services,types,utils}
```

#### 0.2. Configuração Base
- [ ] Instalar dependências: `zustand`, `zod`, `@tanstack/react-query`
- [ ] Configurar ESLint/Prettier para novo código
- [ ] Criar `types.ts` limpo com interfaces do plano

**Entregável**: Estrutura de pastas limpa + deps instaladas

---

### Fase 1: Core Types + Schema DB (1 dia)

#### 1.1. Definir Types (TypeScript + Zod)

```typescript
// components/okr/types/okr.types.ts
import { z } from 'zod';

export const OKRLevelSchema = z.enum(['estratégico', 'setorial', 'operacional']);
export const DepartmentSchema = z.enum(['comercial', 'marketing', 'projetos', 'geral']);
export const OKRStatusSchema = z.enum(['não iniciado', 'em andamento', 'concluído']);
export const KRStatusSchema = z.enum(['verde', 'amarelo', 'vermelho']);
export const PeriodicitySchema = z.enum(['mensal', 'trimestral']);

export const KeyResultSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  currentValue: z.number().min(0),
  targetValue: z.number().min(0),
  unit: z.string().optional(),
  status: KRStatusSchema,
  updatedAt: z.date().optional(),
});

export const OKRSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  level: OKRLevelSchema,
  department: DepartmentSchema.optional(),
  owner: z.string().min(1, 'Responsável é obrigatório'),
  objective: z.string().min(10, 'Objetivo deve ter ao menos 10 caracteres'),
  keyResults: z.array(KeyResultSchema).min(1, 'Adicione pelo menos 1 Key Result'),
  startDate: z.date(),
  endDate: z.date(),
  periodicity: PeriodicitySchema,
  status: OKRStatusSchema,
  notes: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OKR = z.infer<typeof OKRSchema>;
export type KeyResult = z.infer<typeof KeyResultSchema>;
```

#### 1.2. Schema Supabase (SQL)

```sql
-- components/okr/sql/okr_v2_schema.sql

-- Tabela principal de OKRs (individual, não mais strategic_maps)
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('estratégico', 'setorial', 'operacional')),
  department TEXT CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral')),
  owner TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  periodicity TEXT NOT NULL CHECK (periodicity IN ('mensal', 'trimestral')),
  status TEXT NOT NULL CHECK (status IN ('não iniciado', 'em andamento', 'concluído')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Key Results (separada, 1-N com OKR)
CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT NOT NULL CHECK (status IN ('verde', 'amarelo', 'vermelho')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Sprints
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('semanal', 'mensal', 'trimestral')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejada', 'em andamento', 'concluída', 'cancelada')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Itens da Sprint (iniciativas, impedimentos)
CREATE TABLE sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('iniciativa', 'impedimento', 'decisão')),
  title TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em andamento', 'concluído')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (exemplo para okrs)
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;

-- CEO vê tudo
CREATE POLICY "ceo_all_access" ON okrs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Heads veem seu departamento + estratégico
CREATE POLICY "head_dept_access" ON okrs
  FOR SELECT
  USING (
    level = 'estratégico' 
    OR department = (
      SELECT department FROM users WHERE id = auth.uid()
    )
  );

-- Operacional só leitura
CREATE POLICY "operational_read_only" ON okrs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX idx_okrs_user_id ON okrs(user_id);
CREATE INDEX idx_okrs_level ON okrs(level);
CREATE INDEX idx_okrs_department ON okrs(department);
CREATE INDEX idx_okrs_status ON okrs(status);
CREATE INDEX idx_key_results_okr_id ON key_results(okr_id);
CREATE INDEX idx_sprints_okr_id ON sprints(okr_id);
CREATE INDEX idx_sprint_items_sprint_id ON sprint_items(sprint_id);
```

**Entregável**: Types validados + Schema SQL rodando no Supabase

---

### Fase 2: State Management (1 dia)

#### 2.1. Store Zustand

```typescript
// components/okr/store/okrStore.ts
import create from 'zustand';
import { OKR, KeyResult } from '../types/okr.types';

interface OKRStore {
  // Estado
  okrs: OKR[];
  selectedOKR: OKR | null;
  filters: {
    level?: string;
    department?: string;
    status?: string;
  };
  loading: boolean;
  error: string | null;

  // Actions
  setOKRs: (okrs: OKR[]) => void;
  addOKR: (okr: OKR) => void;
  updateOKR: (id: string, updates: Partial<OKR>) => void;
  deleteOKR: (id: string) => void;
  selectOKR: (okr: OKR | null) => void;
  setFilters: (filters: Partial<OKRStore['filters']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOKRStore = create<OKRStore>((set) => ({
  okrs: [],
  selectedOKR: null,
  filters: {},
  loading: false,
  error: null,

  setOKRs: (okrs) => set({ okrs }),
  addOKR: (okr) => set((state) => ({ okrs: [...state.okrs, okr] })),
  updateOKR: (id, updates) =>
    set((state) => ({
      okrs: state.okrs.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),
  deleteOKR: (id) =>
    set((state) => ({ okrs: state.okrs.filter((o) => o.id !== id) })),
  selectOKR: (okr) => set({ selectedOKR: okr }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

#### 2.2. Services (API Layer)

```typescript
// components/okr/services/okr.service.ts
import { supabase } from '../../../services/supabaseClient';
import { OKR, OKRSchema } from '../types/okr.types';

export class OKRService {
  static async list(filters?: { level?: string; department?: string }) {
    let query = supabase
      .from('okrs')
      .select('*, key_results(*)')
      .order('created_at', { ascending: false });

    if (filters?.level) query = query.eq('level', filters.level);
    if (filters?.department) query = query.eq('department', filters.department);

    const { data, error } = await query;
    if (error) throw error;
    
    // Validar com Zod
    return data.map((okr) => OKRSchema.parse(okr));
  }

  static async create(okr: Omit<OKR, 'id'>) {
    // Validar antes de enviar
    const validated = OKRSchema.omit({ id: true }).parse(okr);
    
    const { data, error } = await supabase
      .from('okrs')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return OKRSchema.parse(data);
  }

  static async update(id: string, updates: Partial<OKR>) {
    const { data, error } = await supabase
      .from('okrs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return OKRSchema.parse(data);
  }

  static async delete(id: string) {
    const { error } = await supabase.from('okrs').delete().eq('id', id);
    if (error) throw error;
  }
}
```

**Entregável**: Estado global funcionando + CRUD completo

---

### Fase 3: Componentes Base (2 dias)

#### 3.1. Estrutura de Componentes

```
components/okr/
├── pages/
│   ├── OKRDashboard.tsx        # Dashboard principal
│   ├── OKRList.tsx             # Lista filtrada de OKRs
│   ├── OKRDetail.tsx           # Detalhe/edição de 1 OKR
│   └── SprintBoard.tsx         # Board de sprints
├── components/
│   ├── OKRCard.tsx             # Card visual do OKR
│   ├── KeyResultItem.tsx       # Item de KR (com progresso)
│   ├── OKRForm.tsx             # Formulário criar/editar
│   ├── KeyResultForm.tsx       # Form de KR
│   ├── StatusBadge.tsx         # Badge de status
│   ├── LevelBadge.tsx          # Badge de nível
│   ├── ProgressBar.tsx         # Barra de progresso
│   └── Filters.tsx             # Filtros do dashboard
```

#### 3.2. Exemplo de Componente Base

```typescript
// components/okr/components/OKRCard.tsx
import { OKR } from '../types/okr.types';
import { StatusBadge } from './StatusBadge';
import { LevelBadge } from './LevelBadge';
import { ProgressBar } from './ProgressBar';

interface OKRCardProps {
  okr: OKR;
  onClick?: () => void;
}

export const OKRCard: React.FC<OKRCardProps> = ({ okr, onClick }) => {
  const progress = calculateProgress(okr.keyResults);
  const krsGreen = okr.keyResults.filter((kr) => kr.status === 'verde').length;
  const krsYellow = okr.keyResults.filter((kr) => kr.status === 'amarelo').length;
  const krsRed = okr.keyResults.filter((kr) => kr.status === 'vermelho').length;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <LevelBadge level={okr.level} />
            {okr.department && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                {okr.department}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {okr.objective}
          </h3>
          <p className="text-sm text-slate-600">
            👤 {okr.owner} • 📅 {formatPeriod(okr.startDate, okr.endDate)}
          </p>
        </div>
        <StatusBadge status={okr.status} />
      </div>

      {/* Progress */}
      <div className="mb-4">
        <ProgressBar value={progress} className="mb-2" />
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            {krsGreen} verde
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            {krsYellow} amarelo
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            {krsRed} vermelho
          </span>
        </div>
      </div>

      {/* Key Results Preview */}
      <div className="space-y-2">
        {okr.keyResults.slice(0, 3).map((kr) => (
          <div key={kr.id} className="text-sm text-slate-700 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${kr.status === 'verde' ? 'green' : kr.status === 'amarelo' ? 'yellow' : 'red'}-500`} />
            <span className="flex-1 truncate">{kr.title}</span>
            <span className="font-semibold">
              {kr.currentValue}/{kr.targetValue} {kr.unit}
            </span>
          </div>
        ))}
        {okr.keyResults.length > 3 && (
          <p className="text-xs text-slate-500">
            +{okr.keyResults.length - 3} Key Results
          </p>
        )}
      </div>
    </div>
  );
};

function calculateProgress(keyResults: KeyResult[]): number {
  if (keyResults.length === 0) return 0;
  const total = keyResults.reduce((acc, kr) => {
    return acc + (kr.currentValue / kr.targetValue) * 100;
  }, 0);
  return Math.min(100, total / keyResults.length);
}

function formatPeriod(start: Date, end: Date): string {
  return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
}
```

**Entregável**: Componentes visuais funcionando + Storybook (opcional)

---

### Fase 4: Dashboard + Listagem (1 dia)

#### 4.1. Dashboard com Métricas

```typescript
// components/okr/pages/OKRDashboard.tsx
import { useOKRStore } from '../store/okrStore';
import { OKRCard } from '../components/OKRCard';
import { Filters } from '../components/Filters';
import { useEffect } from 'react';
import { OKRService } from '../services/okr.service';

export const OKRDashboard: React.FC = () => {
  const { okrs, filters, loading, setOKRs, setLoading, setError } = useOKRStore();

  useEffect(() => {
    loadOKRs();
  }, [filters]);

  const loadOKRs = async () => {
    try {
      setLoading(true);
      const data = await OKRService.list(filters);
      setOKRs(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Métricas
  const stats = {
    total: okrs.length,
    concluidos: okrs.filter((o) => o.status === 'concluído').length,
    emAndamento: okrs.filter((o) => o.status === 'em andamento').length,
    atrasados: okrs.filter((o) => isOverdue(o)).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            OKRs GGV 2026
          </h1>
          <p className="text-slate-600">
            Gestão de Objetivos e Resultados-Chave por Área
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total de OKRs" value={stats.total} icon="🎯" />
          <StatCard label="Concluídos" value={stats.concluidos} icon="✅" color="green" />
          <StatCard label="Em Andamento" value={stats.emAndamento} icon="🔄" color="blue" />
          <StatCard label="Atrasados" value={stats.atrasados} icon="⚠️" color="red" />
        </div>

        {/* Filters */}
        <Filters />

        {/* OKRs Grid */}
        {loading ? (
          <LoadingState />
        ) : okrs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {okrs.map((okr) => (
              <OKRCard key={okr.id} okr={okr} onClick={() => navigateToDetail(okr.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Entregável**: Dashboard funcional com cards e métricas

---

### Fase 5: CRUD de OKR (1 dia)

#### 5.1. Formulário de Criação/Edição

```typescript
// components/okr/components/OKRForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OKRSchema, OKR } from '../types/okr.types';
import { KeyResultForm } from './KeyResultForm';

interface OKRFormProps {
  initialData?: OKR;
  onSubmit: (data: OKR) => Promise<void>;
  onCancel: () => void;
}

export const OKRForm: React.FC<OKRFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<OKR>({
    resolver: zodResolver(OKRSchema),
    defaultValues: initialData || {
      level: 'setorial',
      department: 'comercial',
      periodicity: 'trimestral',
      status: 'não iniciado',
      keyResults: [],
    },
  });

  const keyResults = watch('keyResults');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nível e Departamento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nível
          </label>
          <select
            {...register('level')}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          >
            <option value="estratégico">Estratégico</option>
            <option value="setorial">Setorial</option>
            <option value="operacional">Operacional</option>
          </select>
          {errors.level && <p className="text-red-500 text-sm mt-1">{errors.level.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Departamento
          </label>
          <select
            {...register('department')}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          >
            <option value="geral">Geral</option>
            <option value="comercial">Comercial</option>
            <option value="marketing">Marketing</option>
            <option value="projetos">Projetos</option>
          </select>
        </div>
      </div>

      {/* Objetivo e Responsável */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Objetivo
        </label>
        <textarea
          {...register('objective')}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg"
          rows={3}
          placeholder="Ex: Aumentar a taxa de conversão do funil comercial"
        />
        {errors.objective && <p className="text-red-500 text-sm mt-1">{errors.objective.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Responsável
        </label>
        <input
          {...register('owner')}
          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          placeholder="Nome do responsável"
        />
        {errors.owner && <p className="text-red-500 text-sm mt-1">{errors.owner.message}</p>}
      </div>

      {/* Período e Periodicidade */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Data Início
          </label>
          <input
            type="date"
            {...register('startDate')}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Data Fim
          </label>
          <input
            type="date"
            {...register('endDate')}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Periodicidade
          </label>
          <select
            {...register('periodicity')}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg"
          >
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
          </select>
        </div>
      </div>

      {/* Key Results */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Key Results
        </label>
        <KeyResultForm
          keyResults={keyResults}
          onChange={(krs) => setValue('keyResults', krs)}
        />
        {errors.keyResults && <p className="text-red-500 text-sm mt-1">{errors.keyResults.message}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar OKR'}
        </button>
      </div>
    </form>
  );
};
```

**Entregável**: CRUD completo de OKR funcionando

---

### Fase 6: Módulo Sprint (2 dias)

#### 6.1. Estrutura Sprint

```typescript
// Sprint types, services, components
// Similar ao OKR, mas com foco em sprints
```

#### 6.2. Sprint Board

- Lista de sprints ativas
- Kanban de itens (iniciativas/impedimentos)
- Link com OKRs
- Timeline visual

**Entregável**: Módulo Sprint básico funcional

---

### Fase 7: Permissões + RLS (1 dia)

#### 7.1. Adicionar Campo Role em Users

```sql
ALTER TABLE users ADD COLUMN role TEXT CHECK (role IN ('CEO', 'HEAD', 'OPERATIONAL'));
ALTER TABLE users ADD COLUMN department TEXT CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral'));
```

#### 7.2. Policies Completas

- CEO: acesso total
- HEAD: seu departamento + estratégico
- OPERATIONAL: apenas leitura

#### 7.3. Frontend Guards

```typescript
// components/okr/hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useUser();

  const canEdit = (okr: OKR) => {
    if (user.role === 'CEO') return true;
    if (user.role === 'HEAD' && okr.department === user.department) return true;
    return false;
  };

  const canCreate = () => {
    return user.role === 'CEO' || user.role === 'HEAD';
  };

  return { canEdit, canCreate, canView: true };
};
```

**Entregável**: Permissões funcionando end-to-end

---

### Fase 8: Tela de Usuário (1 dia)

- OKRs onde é responsável
- Sprints onde participa
- Histórico de atualizações

**Entregável**: Perfil de usuário funcional

---

### Fase 9: Exportação + Relatórios (1 dia)

- PDF básico de OKR
- Dashboard de métricas
- Histórico trimestral

**Entregável**: Relatórios exportáveis

---

### Fase 10: Polish + Testes (2 dias)

- Testes unitários críticos
- Testes E2E básicos
- Ajustes de UX
- Documentação

**Entregável**: Sistema testado e polido

---

## 📅 Roadmap Sugerido

### Sprint 1 (5 dias úteis - Semana 1)
- ✅ Fase 0: Preparação
- ✅ Fase 1: Core Types + Schema DB
- ✅ Fase 2: State Management
- ✅ Fase 3: Componentes Base
- ✅ Fase 4: Dashboard + Listagem

**Entregável**: Dashboard funcionando com cards de OKR (sem CRUD ainda)

### Sprint 2 (5 dias úteis - Semana 2)
- ✅ Fase 5: CRUD de OKR
- ✅ Fase 6: Módulo Sprint (início)

**Entregável**: Sistema OKR completo (criar, editar, listar, deletar)

### Sprint 3 (5 dias úteis - Semana 3)
- ✅ Fase 6: Módulo Sprint (conclusão)
- ✅ Fase 7: Permissões + RLS
- ✅ Fase 8: Tela de Usuário

**Entregável**: Sistema completo com Sprints e Permissões

### Sprint 4 (3 dias úteis - Última semana)
- ✅ Fase 9: Exportação + Relatórios
- ✅ Fase 10: Polish + Testes

**Entregável**: Sistema pronto para produção

---

## ⚡ Total Estimado: 18 dias úteis (~3.5 semanas)

---

## 🎯 Decisões Pendentes

### 1. IA - Manter ou Remover?

**Opção A: Manter OpenAI/Gemini**
- ✅ Sistema atual já tem integração
- ✅ Pode gerar OKRs com base em metas
- ❌ Complexidade adicional
- ❌ Custo de API

**Opção B: Remover por enquanto**
- ✅ Foco no core (OKR + Sprint)
- ✅ Menos complexidade
- ✅ Adicionar depois como feature
- ❌ Perde funcionalidade "legal"

**Recomendação**: **Remover por enquanto**, adicionar em v2.0

---

### 2. Exportação PDF - Prioridade?

**Opção A: Implementar na Fase 9**
- ✅ Funcionalidade útil
- ❌ Requer deps (html2canvas, jspdf)
- ❌ Complexo de fazer bonito

**Opção B: Deixar para v2.0**
- ✅ Foco no core
- ❌ Usuários podem querer imprimir

**Recomendação**: **Implementar simples** (sem design rebuscado) ou **deixar para v2.0**

---

### 3. Histórico - Por Versão ou Trimestre?

**Atual**: `strategic_maps_history` por versão  
**Proposto**: Histórico trimestral

**Opção A: Manter versionamento**
- ✅ Restaurar versões antigas
- ❌ Mais complexo

**Opção B: Histórico trimestral simples**
- ✅ Visualizar evolução por trimestre
- ✅ Mais simples (apenas query por data)

**Recomendação**: **Histórico simples por trimestre** (filtro de data)

---

### 4. Módulo Reuniões - Incluir ou Não?

**Plano original**: "Vincular reuniões com OKRs"

**Opção A: Incluir**
- ✅ Feature interessante
- ❌ Complexidade adicional
- ❌ Foge do core (OKR + Sprint)

**Opção B: Deixar para v2.0**
- ✅ Foco no essencial
- ✅ Pode ser adicionado depois

**Recomendação**: **Deixar para v2.0** - foco em OKR + Sprint apenas

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Escopo creep (features extras) | Alta | Alto | Seguir roadmap estrito, v1.0 mínimo |
| RLS policies complexas | Média | Alto | Testar exaustivamente com usuários reais |
| Performance com muitos OKRs | Baixa | Médio | Paginação, índices, React.memo |
| Migração de dados antigos | Baixa | Baixo | Criar script de migração se necessário |
| Falta de testes | Alta | Alto | Dedicar Fase 10 inteira para testes |

---

## ✅ Checklist de Aprovação

Antes de começar, confirme:

- [ ] Escopo do plano está aprovado (OKR + Sprint, sem IA/Reuniões na v1)
- [ ] Wireframes/mockups estão prontos (ou aceita UI básica funcional primeiro)
- [ ] Decisões pendentes foram tomadas (IA, PDF, etc.)
- [ ] Time de gestão validou a estrutura (níveis, departamentos)
- [ ] RLS policies estão alinhadas com a estrutura da empresa
- [ ] Tenho 18 dias úteis (~3.5 semanas) disponíveis
- [ ] Banco Supabase está pronto para rodar nova estrutura
- [ ] Backup do código atual foi feito (`okr_old_backup/`)

---

## 🎯 Próximo Passo Imediato

**Aguardando decisão**: Qual abordagem seguir?

1. ✅ **Aprovar estratégia** → Começar Fase 0 agora
2. ⚠️ **Ajustar escopo** → Discutir mudanças antes de começar
3. ❌ **Reconsiderar refatoração** → Voltar para plano incremental

---

**Estratégia criada em**: 2026-01-07  
**Autor**: Claude AI (Cursor Agent)  
**Status**: Aguardando aprovação para início

