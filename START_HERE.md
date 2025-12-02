# 🚀 COMEÇAR AQUI - Aplicativo Deployado

## ✅ Status do Deploy

- ✅ **Backend**: `https://promo-gestao-backend.onrender.com`
- ✅ **Frontend**: `https://seu-app.vercel.app` (sua URL)
- ✅ **Database**: Conectado no Render
- ✅ **Storage**: Firebase configurado

## 🎯 3 Passos para Começar

### 1️⃣ Criar Usuários (2 min)

Execute o seed localmente:

```bash
# Clone o repo (se ainda não tiver)
git clone https://github.com/Ozen-Tech/mustafa-all-systems.git
cd mustafa-all-systems/backend

# Instale dependências
npm install

# Configure .env com DATABASE_URL do Render
# (pegue em: Render Dashboard > promo-gestao-db > Internal Database URL)
echo 'DATABASE_URL="postgresql://..."' > .env

# Execute o seed
npx prisma generate
npm run seed
```

**Usuários criados:**
- 👤 Supervisor: `supervisor@teste.com` / `senha123`
- 👤 Promotor 1: `promotor1@teste.com` / `senha123`
- 👤 Promotor 2: `promotor2@teste.com` / `senha123`

### 2️⃣ Configurar CORS (1 min)

**CRÍTICO**: Sem isso, o frontend não funciona!

1. [Render Dashboard](https://dashboard.render.com/) > `promo-gestao-backend`
2. **Environment** > Edite `CORS_ORIGIN`
3. Adicione sua URL do Vercel:
   ```
   https://seu-app.vercel.app
   ```
4. **Save Changes**

### 3️⃣ Acessar o App (30 seg)

1. Abra: `https://seu-app.vercel.app`
2. Login: `supervisor@teste.com` / `senha123`
3. ✅ Pronto!

## 🔍 Verificar se Está Funcionando

### Backend:
```bash
curl https://promo-gestao-backend.onrender.com/health
# Deve retornar: {"status":"ok",...}
```

### Frontend:
- Abra a URL do Vercel
- Deve aparecer a tela de login

## 📚 Documentação Completa

- **Guia Rápido**: `PRIMEIRO_ACESSO.md`
- **Guia Completo**: `COMO_USAR.md`
- **Deploy**: `QUICK_DEPLOY.md`

## 🆘 Problemas?

### "Network Error"
→ CORS não configurado (passo 2)

### "Invalid credentials"
→ Seed não executado (passo 1)

### Backend não responde
→ Verifique logs no Render Dashboard

---

**🎉 Tudo pronto? Faça login e comece a usar!**

