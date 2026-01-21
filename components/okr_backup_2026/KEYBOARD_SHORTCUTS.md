# **⌨️ Atalhos de Teclado - Módulo OKR**

## **🎯 Atalhos Globais**

| Atalho | Ação |
|--------|------|
| `Ctrl/Cmd + S` | Salvar OKR |
| `Ctrl/Cmd + K` | Buscar OKRs |
| `Esc` | Fechar modal/Voltar |
| `Ctrl/Cmd + N` | Novo OKR |

---

## **📝 No Editor**

| Atalho | Ação |
|--------|------|
| `Ctrl/Cmd + S` | Salvar mapa |
| `Ctrl/Cmd + E` | Exportar PDF |
| `Ctrl/Cmd + H` | Abrir histórico |
| `Ctrl/Cmd + Shift + S` | Compartilhar |
| `Ctrl/Cmd + A` | Análise avançada |

---

## **🔢 Na Tabela de Tracking**

| Atalho | Ação |
|--------|------|
| `Tab` | Próxima célula |
| `Shift + Tab` | Célula anterior |
| `Enter` | Próxima linha |
| `Ctrl/Cmd + +` | Adicionar linha |

---

## **📋 Nos Campos**

| Atalho | Ação |
|--------|------|
| `Ctrl/Cmd + Z` | Desfazer |
| `Ctrl/Cmd + Y` | Refazer |
| `Ctrl/Cmd + C` | Copiar |
| `Ctrl/Cmd + V` | Colar |

---

## **🎯 Implementação (Futuro)**

Para adicionar atalhos ao código:

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl/Cmd + S para salvar
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    
    // Ctrl/Cmd + N para novo
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      handleCreateNew();
    }
    
    // Esc para fechar
    if (e.key === 'Escape') {
      handleClose();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

**Status:** 📋 Documentado (implementação opcional)

