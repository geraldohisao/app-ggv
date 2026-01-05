# **Módulo de Gestão de OKR** 🎯

## **Visão Geral**

O módulo de Gestão de OKR (Objectives and Key Results) permite que administradores criem mapas estratégicos completos para suas empresas, utilizando IA ou construindo do zero.

---

## **Funcionalidades Principais**

### **✨ Geração com IA**
- **Contexto Inteligente:** O usuário fornece informações sobre a empresa, objetivos e desafios
- **IA Generativa:** Utiliza GPT-4 para criar um mapa estratégico completo e estruturado
- **Personalização:** O mapa gerado pode ser editado e ajustado conforme necessário

### **📋 Construção Manual**
- **Quadro em Branco:** Opção para criar mapas estratégicos do zero
- **Interface Drag & Drop:** Adicionar, editar e remover elementos facilmente
- **Estrutura Flexível:** Adapte o mapa às necessidades específicas da empresa

### **🗺️ Estrutura do Mapa Estratégico**

O mapa estratégico é composto por:

1. **Identidade**
   - Missão
   - Visão
   - Valores

2. **Estratégias**
   - Motores de crescimento
   - Estratégias específicas por motor

3. **Objetivos**
   - Objetivos estratégicos
   - KPIs (Key Performance Indicators)
   - Frequência de medição
   - Metas

4. **Plano de Ação**
   - Ações trimestrais (Q1, Q2, Q3, Q4)
   - Iniciativas específicas

5. **Execução**
   - Papéis e responsabilidades
   - Métricas por papel
   - Metas individuais

6. **Rituais**
   - Reuniões e cerimônias
   - Frequência (Diário, Semanal, Mensal, etc.)

7. **Acompanhamento**
   - Métricas de performance
   - Dados reais vs metas
   - Visualização de progresso

---

## **Permissões de Acesso**

**Quem pode acessar:**
- ✅ Super Administradores
- ✅ Administradores
- ❌ Usuários comuns

O módulo aparece no menu do avatar apenas para usuários com permissões administrativas.

---

## **Como Usar**

### **1. Acessar o Módulo**
- Clique no avatar do usuário no canto superior direito
- Selecione **"Gestão de OKR"** no menu

### **2. Criar um Novo Mapa**

**Opção A: Gerar com IA**
1. Clique em **"Gerar Plano com IA"**
2. Descreva sua empresa, objetivos e desafios
   - Quanto mais detalhes, melhor o resultado
   - Mínimo: 50 caracteres
   - Recomendado: 300+ caracteres
3. Aguarde a IA gerar o mapa (10-30 segundos)
4. Revise e ajuste o mapa gerado

**Opção B: Construir do Zero**
1. Clique em **"Construir do Zero"**
2. Preencha cada seção manualmente
3. Adicione elementos conforme necessário

### **3. Editar o Mapa**
- Clique em qualquer campo para editar
- Use os botões **"+ Adicionar"** para incluir novos elementos
- Clique no **"✕"** para remover elementos

### **4. Salvar**
- Clique no botão **"💾 Salvar Versão"**
- O mapa será salvo no banco de dados
- Você pode criar múltiplas versões

---

## **Arquitetura Técnica**

### **Componentes**

```
components/okr/
├── OKRPage.tsx              # Página principal (roteamento de views)
├── OKRContextForm.tsx       # Formulário de contexto para IA
├── StrategicMapBuilder.tsx  # Editor do mapa estratégico
└── README.md               # Esta documentação
```

### **Serviços**

```typescript
// services/okrAIService.ts

// Gera mapa estratégico usando IA
generateStrategicMapWithAI(context: string): Promise<StrategicMap>

// Salva mapa no banco de dados
saveStrategicMap(map: StrategicMap, userId: string): Promise<string>

// Lista mapas do usuário
listStrategicMaps(userId: string): Promise<StrategicMap[]>
```

### **Banco de Dados**

**Tabela:** `strategic_maps`

```sql
CREATE TABLE strategic_maps (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    company_name TEXT,
    date DATE,
    mission TEXT,
    vision TEXT,
    values JSONB,
    motors JSONB,
    objectives JSONB,
    action_plans JSONB,
    roles JSONB,
    rituals JSONB,
    tracking JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Executar schema:**
```bash
psql -h <SUPABASE_DB_HOST> -U postgres -d postgres -f supabase/sql/okr_schema.sql
```

### **Roteamento**

- **URL:** `/okr`
- **Módulo:** `Module.OKRManager`
- **Proteção:** Apenas Admin/SuperAdmin

---

## **Integração com IA**

O módulo utiliza a **OpenAI API (GPT-4-mini)** para gerar mapas estratégicos.

### **Prompt System:**
```
Você é um especialista em planejamento estratégico empresarial da GGV Inteligência em Vendas.
Crie mapas estratégicos completos baseados no contexto fornecido.
```

### **Configuração:**
1. A chave da API OpenAI deve estar configurada em `app_settings`
2. Key: `openai_api_key`
3. O sistema busca automaticamente a chave do banco

### **Fallback:**
Se a API falhar, o sistema exibe mensagem de erro e permite construção manual.

---

## **Próximas Melhorias**

### **Dashboard de OKRs**
- [ ] Visualização de múltiplos mapas
- [ ] Comparação entre versões
- [ ] Exportação em PDF
- [ ] Compartilhamento de mapas

### **Acompanhamento**
- [ ] Atualização de métricas em tempo real
- [ ] Gráficos de progresso
- [ ] Alertas de desvios
- [ ] Relatórios executivos

### **Colaboração**
- [ ] Múltiplos usuários editando
- [ ] Comentários e feedback
- [ ] Histórico de alterações
- [ ] Aprovações de gestores

---

## **Troubleshooting**

### **"API Key não configurada"**
- Verifique se a chave OpenAI está em `app_settings`
- Teste em Settings → API Settings

### **"Contexto muito curto"**
- Forneça pelo menos 50 caracteres de contexto
- Recomendado: 300+ caracteres para melhores resultados

### **Mapa não salva**
- Verifique se o schema foi executado no Supabase
- Verifique permissões RLS no banco

### **Acesso negado**
- Apenas Admin/SuperAdmin podem acessar
- Verifique o role do usuário em `profiles.role`

---

## **Suporte**

Para dúvidas ou problemas:
- **Email:** suporte@grupoggv.com
- **Slack:** #okr-modulo
- **Docs:** [Documentação Completa](https://docs.grupoggv.com/okr)

---

**Desenvolvido com 💙 por GGV Inteligência em Vendas**

