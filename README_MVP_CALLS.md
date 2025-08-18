# MVP Calls - Documentação da API

## 📞 Endpoints da API

### **Desenvolvimento**
- POST `http://localhost:8080/webhooks/voip`
- GET `http://localhost:8080/calls`
- GET `http://localhost:8080/calls/:id`
- POST `http://localhost:8080/calls/:id/push-crm`

### **Produção**
- POST `https://app.grupoggv.com/api/webhooks/voip`
- GET `https://app.grupoggv.com/api/calls`
- GET `https://app.grupoggv.com/api/calls/:id`
- POST `https://app.grupoggv.com/api/calls/:id/push-crm`

## 🧪 Teste de Webhook

```bash
curl -X POST http://localhost:8080/webhooks/voip \
  -H "Content-Type: application/json" \
  -d '{"call_id": "123", "status": "completed"}'
```

## 📱 Interface Web

### **Desenvolvimento**
3) Abrir `http://localhost:3000` e visualizar a chamada listada.

### **Produção**
3) Abrir `https://app.grupoggv.com/calls` e visualizar a chamada listada.
