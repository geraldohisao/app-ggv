# 🔍 **TESTAR EDGE FUNCTION MANUALMENTE**

---

## **🧪 TESTE VIA CURL:**

Abra o terminal e execute:

```bash
curl -X POST \
  'https://mwlekwyxbfbxfxskywgx.supabase.co/functions/v1/fetch-workspace-users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGVrd3l4YmZieGZ4c2t5d2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTIzMjEsImV4cCI6MjA2NTY4ODMyMX0.rFX9H2pcGLNX7n3vKLYGi72JKwjUw6oG38IZGjO90HE'
```

**Resultado esperado:**
```json
{
  "success": true,
  "users": [...],
  "total": 37
}
```

**Se der erro:**
- Verificar logs no Supabase Dashboard
- Edge Functions → fetch-workspace-users → Logs

---

## **🔍 VER LOGS NO SUPABASE:**

1. Dashboard → Edge Functions
2. Clique em `fetch-workspace-users`
3. Aba **"Logs"**
4. Veja os erros (se houver)

---

**Teste e me mostre o resultado!** 🔍

