# 🔧 Corrigir Fotos no Dashboard Web

## 🐛 Problema Identificado

As fotos não aparecem no dashboard web, mesmo estando no Firebase Storage.

**Causa**: No check-in, a foto estava sendo enviada DEPOIS do check-in, mas a URL correta não estava sendo salva no banco de dados.

## ✅ Correção Aplicada

### 1. Check-in Corrigido

**Antes:**
- Fazia check-in com URL temporária
- Depois fazia upload da foto
- **Nunca atualizava a visita com a URL correta!**

**Depois:**
- Faz upload da foto PRIMEIRO
- Obtém a URL correta do Firebase
- Faz check-in com a URL correta
- **URL é salva corretamente no banco!**

### 2. Check-out Já Estava Correto

O check-out já estava enviando a URL corretamente.

---

## 🧪 Como Testar

### 1. Teste com Expo Go

```bash
cd mobile
npm start
```

### 2. Teste o Fluxo Completo

1. **Faça login** no app mobile
2. **Faça check-in** em uma loja (tire foto)
3. **Verifique no Firebase Storage**: Foto deve aparecer
4. **Verifique no dashboard web**: Foto deve aparecer na galeria

### 3. Verifique os Logs

No console do app, procure por:
```
✅ [CheckIn] Upload da foto concluído com sucesso
✅ [CheckIn] Check-in criado com sucesso
```

No console do navegador (dashboard web), procure por:
```
[PhotoGallery] Processando fotos: { checkInPhotoUrl: {...}, ... }
```

---

## 🔍 Debug

### Se as fotos ainda não aparecerem:

1. **Verifique o Firebase Storage:**
   - Acesse: https://console.firebase.google.com/
   - Vá em Storage
   - Verifique se as fotos estão lá

2. **Verifique o banco de dados:**
   - No Render, acesse o banco
   - Verifique a tabela `Visit`
   - Veja se `checkInPhotoUrl` e `checkOutPhotoUrl` têm valores

3. **Verifique a API:**
   - Acesse: `https://promo-gestao-backend.onrender.com/api/supervisors/promoters/{id}/visits`
   - Veja se `checkInPhotoUrl` e `checkOutPhotoUrl` estão nas respostas

4. **Verifique o console do navegador:**
   - Abra F12 no dashboard web
   - Veja se há erros de CORS ou de carregamento de imagens
   - Veja os logs do `PhotoGallery`

---

## 📋 Checklist

- [x] Check-in corrigido para enviar URL correta
- [x] Check-out já estava correto
- [ ] Teste de check-in realizado
- [ ] Foto aparece no Firebase Storage
- [ ] Foto aparece no dashboard web
- [ ] Fotos adicionais também funcionam

---

## 🚀 Próximos Passos

1. **Teste com Expo Go** (mais rápido)
2. **Faça um novo check-in** com a correção
3. **Verifique se a foto aparece** no dashboard

---

**✅ Após a correção, as fotos devem aparecer no dashboard!**

