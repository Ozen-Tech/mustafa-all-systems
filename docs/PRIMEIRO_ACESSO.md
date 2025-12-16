# 🎯 Primeiro Acesso - Passo a Passo

## ⚡ Rápido (5 minutos)

### 1. Verificar URLs
- **Backend**: `https://promo-gestao-backend.onrender.com`
- **Frontend**: `https://seu-app.vercel.app` (sua URL do Vercel)

### 2. Testar Backend
Abra no navegador: `https://promo-gestao-backend.onrender.com/health`

Deve aparecer: `{"status":"ok","timestamp":"..."}`

### 3. Criar Primeiro Usuário

**Método Local (Recomendado)**:

1. **Clone o repositório** (se ainda não tiver):
   ```bash
   git clone https://github.com/Ozen-Tech/mustafa-all-systems.git
   cd mustafa-all-systems/backend
   ```

2. **Instale dependências**:
   ```bash
   npm install
   ```

3. **Configure `.env`**:
   - Crie um arquivo `.env` na pasta `backend`
   - Vá em [Render Dashboard](https://dashboard.render.com/) > `promo-gestao-db`
   - Copie a **Internal Database URL** ou **Connection String**
   - Cole no `.env`:
     ```
     DATABASE_URL="postgresql://promo_gestao_user:...@dpg-xxx-a/promo_gestao"
     ```

4. **Execute o seed**:
   ```bash
   npx prisma generate
   npm run seed
   ```

   Isso criará:
   - ✅ Supervisor: `supervisor@teste.com` / `senha123`
   - ✅ Promotor 1: `promotor1@teste.com` / `senha123`
   - ✅ Promotor 2: `promotor2@teste.com` / `senha123`
   - ✅ Lojas de teste

**Alternativa**: Usar Render Shell (se disponível):

1. Clone o repositório
2. Configure `.env` com a `DATABASE_URL` do Render
3. Execute `npm run seed`

### 4. Configurar CORS

**CRÍTICO**: Sem isso, o frontend não consegue acessar o backend!

1. Render Dashboard > `promo-gestao-backend` > **Environment**
2. Adicione/Edite `CORS_ORIGIN`:
   ```
   https://seu-app.vercel.app
   ```
   (Substitua pela URL real do seu frontend)
3. **Save Changes** (vai fazer redeploy)

### 5. Verificar Frontend

1. Vercel Dashboard > Seu projeto > **Settings** > **Environment Variables**
2. Verifique se `VITE_API_URL` está:
   ```
   https://promo-gestao-backend.onrender.com/api
   ```

### 6. Fazer Login

1. Acesse a URL do Vercel
2. Login:
   - **Email**: `supervisor@teste.com`
   - **Senha**: `senha123`

## ✅ Checklist

- [ ] Backend respondendo (`/health`)
- [ ] Usuários criados (seed executado)
- [ ] CORS configurado no Render
- [ ] `VITE_API_URL` configurado no Vercel
- [ ] Login funcionando

## 🆘 Problemas Comuns

### "Network Error" no frontend
→ CORS não configurado ou URL errada

### "Invalid credentials"
→ Seed não executado ou banco vazio

### Backend não responde
→ Verifique logs no Render Dashboard

---

**Pronto!** Agora você pode usar o aplicativo! 🎉

