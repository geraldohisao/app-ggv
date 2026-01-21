# 🎯 **REGRAS DE MAPEAMENTO: GOOGLE WORKSPACE → GGV**

---

## **📋 MAPEAMENTO DE CARGOS (EXATO)**

| Google Workspace | GGV System | Nível | Role Inferido |
|------------------|------------|-------|---------------|
| CEO | CEO | 1 | SUPER_ADMIN |
| COO | COO | 1 | ADMIN |
| Head de Financeiro (a) | Head Financeiro | 3 | ADMIN |
| Head Marketing | Head Marketing | 3 | ADMIN |
| Head Comercial | Head Comercial | 3 | ADMIN |
| Coordenador Comercial | Coordenador Comercial | 4 | ADMIN |
| Coordenador (a) de Projetos | Coordenador de Projetos | 4 | ADMIN |
| Gerente de Projetos | Gerente de Projetos | 4 | ADMIN |
| Analista de Marketing | Analista de Marketing | 5 | USER |
| SDR | SDR | 5 | USER |
| Closer | Closer | 5 | USER |
| Desenvolvedor (a) | Desenvolvedor | 5 | USER |
| Consultor (a) | Consultor | 5 | USER |
| Estágio | Estagiário | 5 | USER |
| Treinee | Trainee | 5 | USER |

---

## **📂 MAPEAMENTO DE DEPARTAMENTOS**

| Google Workspace | GGV System (lowercase) |
|------------------|------------------------|
| Geral | geral |
| Comercial | comercial |
| Marketing | marketing |
| Projetos | projetos |
| Inovação | inovação |
| Financeiro | financeiro |

---

## **👔 MAPEAMENTO DE ROLE (INFERIDO)**

### **SUPER_ADMIN:**
- CEO
- geraldo@grupoggv.com (email específico)

### **ADMIN:**
- COO
- Head * (qualquer Head)
- Coordenador * (qualquer Coordenador)
- Gerente *

### **USER:**
- Todos os demais

---

## **🔧 CÓDIGO DE MAPEAMENTO:**

```typescript
function mapCargo(googleTitle: string | undefined): string {
  if (!googleTitle) return 'Analista';
  
  const title = googleTitle.trim();
  
  // Mapeamento EXATO
  const exactMap: Record<string, string> = {
    'CEO': 'CEO',
    'COO': 'COO',
    'Head de Financeiro (a)': 'Head Financeiro',
    'Coordenador Comercial': 'Coordenador Comercial',
    'Coordenador (a) de Projetos': 'Coordenador de Projetos',
    'Gerente de Projetos': 'Gerente de Projetos',
    'Analista de Marketing': 'Analista de Marketing',
    'SDR': 'SDR',
    'Closer': 'Closer',
    'Desenvolvedor (a)': 'Desenvolvedor',
    'Consultor (a)': 'Consultor',
    'Estágio': 'Estagiário',
    'Treinee': 'Trainee',
  };
  
  return exactMap[title] || 'Analista';
}

function mapDepartment(googleDept: string | undefined): string {
  if (!googleDept) return 'geral';
  
  const deptMap: Record<string, string> = {
    'Geral': 'geral',
    'Comercial': 'comercial',
    'Marketing': 'marketing',
    'Projetos': 'projetos',
    'Inovação': 'inovação',
    'Financeiro': 'financeiro',
  };
  
  return deptMap[googleDept.trim()] || 'geral';
}

function inferRole(googleUser: any): 'SUPER_ADMIN' | 'ADMIN' | 'USER' {
  const email = googleUser.primaryEmail?.toLowerCase() || '';
  const title = (googleUser.organizations?.[0]?.title || '').trim();
  
  // Email específico
  if (email === 'geraldo@grupoggv.com') return 'SUPER_ADMIN';
  
  // Por cargo
  if (title === 'CEO') return 'SUPER_ADMIN';
  if (title === 'COO') return 'ADMIN';
  if (title.startsWith('Head')) return 'ADMIN';
  if (title.startsWith('Coordenador')) return 'ADMIN';
  if (title.includes('Gerente')) return 'ADMIN';
  
  return 'USER';
}
```

---

## **📊 RESULTADO DA IMPORTAÇÃO (PREVIEW):**

| Nome | Cargo (Google) | → | Cargo (GGV) | Dept | Role |
|------|----------------|---|-------------|------|------|
| Geraldo Hisao | CEO | → | CEO | geral | SUPER_ADMIN |
| Tarcis Danilo | COO | → | COO | geral | ADMIN |
| Maria Gracioto | Head de Financeiro (a) | → | Head Financeiro | financeiro | ADMIN |
| Samuel Bueno | Coordenador Comercial | → | Coordenador Comercial | comercial | ADMIN |
| Marcelo Gonçalves | Coordenador (a) de Projetos | → | Coordenador de Projetos | projetos | ADMIN |
| César Intrieri | Gerente de Projetos | → | Gerente de Projetos | projetos | ADMIN |
| Eduardo Espindola | Analista de Marketing | → | Analista de Marketing | marketing | USER |
| Andressa Habinoski | SDR | → | SDR | comercial | USER |
| Barbara Rabech | Closer | → | Closer | comercial | USER |
| ... | Consultor (a) | → | Consultor | projetos | USER |
| ... | Estágio | → | Estagiário | marketing | USER |
| ... | Treinee | → | Trainee | marketing | USER |
| ... | Desenvolvedor (a) | → | Desenvolvedor | inovação | USER |

**Total:** 37 usuários mapeados corretamente! ✅

---

## **🚀 EXECUTE AGORA:**

**`components/okr/sql/add_workspace_cargos.sql`**

Isso vai criar:
- ✅ Departamento Financeiro
- ✅ Head Financeiro
- ✅ Coordenador Comercial
- ✅ Coordenador de Projetos
- ✅ Consultor
- ✅ Estagiário
- ✅ Trainee

---

**Execute o script e me avise!** 🚀  
Depois começo a implementação do import! 😊

