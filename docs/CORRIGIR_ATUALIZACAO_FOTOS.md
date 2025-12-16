# 🔧 Corrigir Atualização de Fotos no Banco

## 🐛 Problema Identificado

O banco de dados tinha URLs de placeholder (`https://placeholder.com/checkin.jpg`) porque:

1. Check-in cria registro com URL temporária
2. Upload da foto acontece depois
3. `uploadPhotos` **criava um novo registro** em vez de atualizar o existente
4. Resultado: 2 registros (placeholder + correto)
5. PhotoGallery mostrava ambos, mas filtrava o placeholder

## ✅ Correção Aplicada

### Backend (`uploadPhotos`)

**Antes:**
- Sempre criava novos registros
- Não atualizava registros existentes

**Depois:**
- Verifica se já existe foto do mesmo tipo
- **Atualiza** se existir (substitui URL placeholder)
- **Cria** apenas se não existir
- Atualiza também `checkInPhotoUrl` e `checkOutPhotoUrl` na tabela `Visit`

---

## 🧪 Como Funciona Agora

1. **Check-in:**
   - Cria visita com URL placeholder
   - Cria registro Photo com URL placeholder

2. **Upload:**
   - Faz upload da foto para Firebase
   - Chama `uploadPhotos` com URL correta
   - **Atualiza** o registro existente (não cria novo!)
   - Atualiza `checkInPhotoUrl` na tabela Visit

3. **Resultado:**
   - ✅ Apenas 1 registro com URL correta
   - ✅ Foto aparece no dashboard

---

## 🚀 Deploy

### Backend (Render)

```bash
git add backend/src/controllers/promoter.controller.ts
git commit -m "fix: atualizar fotos existentes em vez de criar duplicatas"
git push
```

O Render fará deploy automático.

---

## 🧪 Testar

### 1. Faça um novo check-in

1. Abra o app mobile
2. Faça check-in em uma loja
3. Verifique:
   - ✅ Foto no Firebase Storage
   - ✅ URL correta no banco (não placeholder)
   - ✅ Foto aparece no dashboard

### 2. Verifique o banco

No Render, acesse o banco e verifique:
- Tabela `Photo`: deve ter apenas 1 registro por tipo (não duplicados)
- Tabela `Visit`: `checkInPhotoUrl` deve ter URL do Firebase (não placeholder)

---

## 📋 Checklist

- [x] Backend atualiza fotos existentes
- [x] Backend atualiza checkInPhotoUrl/checkOutPhotoUrl
- [ ] Deploy do backend feito
- [ ] Teste de check-in realizado
- [ ] Fotos aparecem no dashboard
- [ ] Sem URLs placeholder no banco

---

**✅ Após o deploy, as fotos serão atualizadas corretamente no banco!**

