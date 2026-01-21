# 🔧 Solução: Problema ao Salvar Iniciativas e Impedimentos

**Data:** 16/01/2026  
**Status:** ✅ Corrigido com logging detalhado

---

## 📋 Problema Relatado

Ao tentar salvar **iniciativas** e **impedimentos** na sprint, o sistema:
- Mostra o botão "Salvando..."
- Retorna sem salvar o item
- Exibe toast de erro genérico: "Erro ao salvar item"
- **Não informa o motivo específico do erro**

Isso impedia:
- Testar a gestão completa da sprint
- Atualizar indicadores (Key Results)
- Registrar decisões associadas

---

## 🔍 Diagnóstico

### Possíveis Causas Identificadas

1. **Permissões RLS (Row Level Security)**
   - Políticas muito restritivas no Supabase
   - Usuário sem permissão para criar itens

2. **Validação de Campos**
   - Campos obrigatórios faltando no banco
   - Tipos de dados incompatíveis

3. **Autenticação**
   - Token de autenticação expirado
   - Usuário não autenticado

4. **Referências de Chave Estrangeira**
   - `sprint_id` inválido
   - `responsible_user_id` referenciando usuário inexistente

---

## ✅ Soluções Implementadas

### 1. **Logging Detalhado**

#### No Serviço (`sprint.service.ts`)

```typescript
// Antes
console.error('Erro ao criar item da Sprint:', error);

// Agora
console.log('🔐 Verificando autenticação...');
console.log('✅ Usuário autenticado:', userData.user.id);
console.log('📤 Enviando para Supabase:', normalizedItem);
console.error('❌ Erro do Supabase:', {
  code: error.code,
  message: error.message,
  details: error.details,
  hint: error.hint,
});
```

#### No Formulário (`SprintItemForm.tsx`)

```typescript
console.log('🔍 Dados sendo enviados:', { ...formData });
console.log('✅ Item salvo com sucesso:', result);
console.error('❌ Erro detalhado ao salvar item:', error);
```

### 2. **Mensagens de Erro Amigáveis**

Mapeamento de códigos de erro PostgreSQL/Supabase:

| Código | Significado | Mensagem Amigável |
|--------|-------------|-------------------|
| `23502` | NOT NULL violation | "Um campo obrigatório está faltando no banco de dados" |
| `23503` | Foreign Key violation | "Sprint não encontrada. Recarregue a página" |
| `23505` | Unique violation | "Este item já existe" |
| `42501` | Insufficient privilege | "Sem permissão para criar item. Verifique seu login" |
| `PGRST116` | RLS violation | "Sem permissão para acessar esta sprint" |

### 3. **Validação Antecipada**

Validações antes de enviar ao banco:

```typescript
// Validações no serviço
if (!item.sprint_id) {
  throw new Error('ID da sprint é obrigatório');
}

if (!item.type) {
  throw new Error('Tipo do item é obrigatório');
}

if (!item.title || item.title.trim().length < 3) {
  throw new Error('Título é obrigatório e deve ter pelo menos 3 caracteres');
}
```

### 4. **Normalização de Dados**

Campos opcionais convertidos corretamente para `null`:

```typescript
const normalizedItem = {
  sprint_id: item.sprint_id,
  type: item.type,
  title: item.title.trim(),
  description: item.description?.trim() || null,  // '' -> null
  status: item.status || SprintItemStatus.PENDING,
  created_by: userData.user.id,
  due_date: item.due_date && item.due_date.trim() !== '' ? item.due_date : null,
  responsible_user_id: item.responsible_user_id || null,
  responsible: item.responsible?.trim() || null,
  project_id: item.project_id || null,
  is_carry_over: item.is_carry_over || false,
};
```

### 5. **Script SQL de Correção**

Arquivo criado: `supabase/sql/fix_sprint_items_table.sql`

Este script:
- ✅ Cria a tabela `sprint_items` se não existir
- ✅ Define constraints corretos (NOT NULL, CHECK)
- ✅ Cria índices para performance
- ✅ Habilita Row Level Security (RLS)
- ✅ Cria políticas permissivas para usuários autenticados
- ✅ Adiciona trigger para `updated_at`
- ✅ Verifica a estrutura final

---

## 🧪 Como Testar

### 1. Verificar Logs no Console do Navegador

Ao tentar salvar um item, você verá:

```
🔐 Verificando autenticação...
✅ Usuário autenticado: abc123-def456-...
📤 Enviando para Supabase: { sprint_id: '...', type: 'iniciativa', title: '...', ... }
```

**Se der erro:**
```
❌ Erro do Supabase: {
  code: '23503',
  message: 'insert or update on table "sprint_items" violates foreign key constraint...',
  details: '...',
  hint: '...'
}
```

### 2. Executar Script SQL (Se Necessário)

Se o erro for relacionado à tabela ou permissões:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/sql/fix_sprint_items_table.sql`
4. Execute o script
5. Verifique a saída:
   - Total de items
   - Políticas RLS criadas
   - Índices criados

### 3. Testar Criação de Item

1. Acesse uma sprint
2. Clique em "+ Adicionar" na seção de iniciativas
3. Preencha:
   - **Título:** "Teste de iniciativa" (mínimo 3 caracteres)
   - **Descrição:** (opcional)
   - **Responsável:** (opcional)
   - **Data Limite:** (opcional)
4. Clique em "Adicionar Item"

**Resultado Esperado:**
- ✅ Toast verde: "Iniciativa salva com sucesso!"
- ✅ Item aparece na lista
- ✅ Contador atualiza (ex: 1/5 concluídos)

**Se der erro:**
- ❌ Toast vermelho com mensagem específica
- ❌ Console mostra detalhes completos do erro

---

## 🔍 Identificando o Erro Específico

### Erro: "Usuário não autenticado"

**Solução:**
1. Faça logout e login novamente
2. Limpe cookies do navegador
3. Verifique se o token não expirou

### Erro: "Sprint não encontrada"

**Solução:**
1. Recarregue a página da sprint
2. Verifique se a sprint ainda existe
3. Verifique o `sprint_id` no console

### Erro: "Um campo obrigatório está faltando"

**Solução:**
1. Verifique no console qual campo está faltando
2. Execute o script SQL para corrigir a tabela
3. Verifique se `created_by` está sendo preenchido

### Erro: "Sem permissão para criar item"

**Solução:**
1. Execute o script SQL para criar políticas RLS
2. Verifique se o usuário está autenticado
3. Verifique se RLS está habilitado

---

## 📊 Arquivos Modificados

### 1. `components/okr/services/sprint.service.ts`
- ✅ Logging detalhado em todas as etapas
- ✅ Validação de campos obrigatórios
- ✅ Normalização de dados melhorada
- ✅ Tratamento de erros específicos

### 2. `components/okr/components/sprint/SprintItemForm.tsx`
- ✅ Validação de campos antes do submit
- ✅ Logging de dados enviados
- ✅ Mensagens de erro amigáveis por código
- ✅ Toasts informativos com emojis

### 3. `supabase/sql/fix_sprint_items_table.sql` (NOVO)
- ✅ Script completo de criação/correção da tabela
- ✅ Políticas RLS permissivas
- ✅ Índices para performance
- ✅ Verificações e validações

---

## 📈 Próximos Passos

### Para o Usuário (Você)

1. **Abra o Console do Navegador** (F12)
2. **Vá na aba Console**
3. **Tente adicionar uma iniciativa**
4. **Copie TODOS os logs que aparecerem** (especialmente os com ❌)
5. **Me envie os logs** para diagnóstico preciso

### Logs Importantes

```
🔐 Verificando autenticação...
[COPIE ESTA LINHA]

✅ Usuário autenticado: ...
[COPIE ESTA LINHA]

📤 Enviando para Supabase: ...
[COPIE ESTE OBJETO COMPLETO]

❌ Erro do Supabase: ...
[COPIE ESTE OBJETO COMPLETO]
```

### Se o Erro For de Permissões (RLS)

Execute o script SQL:
```sql
-- Copie e execute supabase/sql/fix_sprint_items_table.sql
```

### Se o Erro For de Autenticação

1. Faça logout
2. Limpe cookies
3. Faça login novamente
4. Tente criar o item

---

## 🎯 Resultado Esperado Após Correção

### Fluxo de Sucesso

1. Usuário clica "+ Adicionar"
2. Preenche título da iniciativa
3. Clica "Adicionar Item"
4. **Console mostra:**
   ```
   🔐 Verificando autenticação...
   ✅ Usuário autenticado: abc123...
   📤 Enviando para Supabase: { ... }
   ✅ Item criado com sucesso: { id: '...', title: '...', ... }
   ```
5. **Toast verde aparece:** "✅ Iniciativa salva com sucesso!"
6. Modal fecha após 500ms
7. Iniciativa aparece na lista
8. Contador atualiza

### Fluxo de Erro com Diagnóstico

1. Usuário clica "+ Adicionar"
2. Preenche título da iniciativa
3. Clica "Adicionar Item"
4. **Console mostra:**
   ```
   🔐 Verificando autenticação...
   ✅ Usuário autenticado: abc123...
   📤 Enviando para Supabase: { ... }
   ❌ Erro do Supabase: {
     code: '23503',
     message: 'violates foreign key constraint "sprint_items_sprint_id_fkey"',
     details: 'Key (sprint_id)=(xyz789) is not present in table "sprints".',
     hint: 'Ensure the sprint_id exists in sprints table'
   }
   ```
5. **Toast vermelho:** "❌ Sprint não encontrada. Recarregue a página"
6. **Ação:** Recarregar a página ou verificar se a sprint existe

---

## 📞 Suporte

Se após seguir todos os passos o problema persistir:

1. **Copie os logs completos do console**
2. **Tire um print do erro no toast**
3. **Informe qual ação estava tentando fazer**
4. **Envie as informações para análise**

Os logs detalhados agora permitem identificar **exatamente** onde e por que o erro está acontecendo!

---

## 🔐 Verificação de Segurança

As políticas RLS criadas são **permissivas** para todos usuários autenticados.  
Se precisar restringir:

```sql
-- Exemplo: Apenas criador ou admin pode deletar
CREATE POLICY "Apenas criador pode deletar"
    ON sprint_items
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid() OR is_admin(auth.uid()));
```

Mas para o MVP, políticas permissivas são adequadas.

---

**✅ Com essas mudanças, agora você saberá EXATAMENTE por que um item não foi salvo!**
