# 🔧 Corrigir Foto de Check-in no Dashboard

## 🐛 Problema

A foto de check-in não aparece no painel dashboard, mesmo estando salva no banco de dados.

## 🔍 Causa Identificada

O `PhotoGallery` estava processando `checkInPhotoUrl` antes do array `photos[]`, mas:
1. A foto de check-in pode estar no array `photos[]` com tipo `FACADE_CHECKIN`
2. Pode haver conflito ou duplicação entre `checkInPhotoUrl` e foto no array
3. A ordem de processamento pode estar causando problemas

## ✅ Correção Aplicada

**Arquivo:** `web/src/components/PhotoGallery.tsx`

**Mudanças:**
1. **Processar array `photos[]` primeiro** (prioridade)
2. **Usar `checkInPhotoUrl` apenas se não houver foto `FACADE_CHECKIN` no array**
3. **Evitar duplicação** de fotos de check-in
4. **Melhorar labels** para identificar corretamente check-in, check-out e fotos adicionais

## 🧪 Como Funciona Agora

1. **Primeiro:** Processa todas as fotos do array `photos[]`
   - Se houver foto com `type: 'FACADE_CHECKIN'`, usa ela
   - Se houver foto com `type: 'FACADE_CHECKOUT'`, usa ela

2. **Depois:** Se não houver foto de check-in no array, usa `checkInPhotoUrl`
   - Apenas se não houver duplicação

3. **Resultado:** Foto de check-in aparece corretamente, sem duplicação

## 🚀 Deploy

### Frontend (Vercel)

```bash
git add web/src/components/PhotoGallery.tsx
git commit -m "fix: corrigir exibição de foto de check-in no dashboard"
git push
```

O Vercel fará deploy automático.

## 🧪 Testar

1. **Acesse o dashboard web**
2. **Vá em um promotor** e visualize uma visita
3. **Abra a galeria de fotos**
4. **Verifique:**
   - ✅ Foto de check-in aparece
   - ✅ Foto de check-out aparece (se houver)
   - ✅ Fotos adicionais aparecem
   - ✅ Sem duplicação

---

**✅ Após o deploy, a foto de check-in deve aparecer corretamente!**

