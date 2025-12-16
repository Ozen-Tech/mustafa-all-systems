# ⚡ Seed Rápido - 2 Minutos

## 🎯 Método Mais Rápido: Via API

### 1. Configure no Render (30 seg)

1. [Render Dashboard](https://dashboard.render.com/) > `promo-gestao-backend` > **Environment**
2. Adicione: `SEED_SECRET=temporary-seed-secret-change-me`
3. **Save Changes**

### 2. Faça Deploy (1 min)

```bash
git add .
git commit -m "Add: Endpoint para seed"
git push
```

Aguarde o deploy no Render (2-3 minutos)

### 3. Execute o Seed (30 seg)

```bash
curl -X POST https://promo-gestao-backend.onrender.com/api/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: temporary-seed-secret-change-me" \
  -d '{"secret": "temporary-seed-secret-change-me"}'
```

### 4. Verifique

Tente fazer login:
- Email: `supervisor@teste.com`
- Senha: `senha123`

✅ **Pronto!**

---

**⚠️ Após criar os usuários, remova o endpoint `/api/admin/seed` para segurança!**

