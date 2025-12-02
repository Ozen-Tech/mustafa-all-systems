# 🔧 Corrigir Erro CORS e 404

## 🐛 Problemas Identificados

1. **CORS Error**: Frontend bloqueado pelo CORS
2. **404 Error**: Rota não encontrada (`/auth/login` ao invés de `/api/auth/login`)

## ✅ Solução Rápida

### 1. Configurar CORS no Render (2 min)

1. Vá em [Render Dashboard](https://dashboard.render.com/)
2. Clique no serviço **`promo-gestao-backend`**
3. Vá em **Environment** (menu lateral)
4. Procure ou adicione a variável **`CORS_ORIGIN`**
5. Adicione a URL do seu frontend:
   ```
   https://mustafa-all-systems-web.vercel.app
   ```
   (Substitua pela URL real do seu Vercel)
6. Clique em **Save Changes** (vai fazer redeploy automático)

### 2. Configurar URL da API no Vercel (1 min)

1. Vá em [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique no seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Procure ou adicione **`VITE_API_URL`**
5. Configure como:
   ```
   https://promo-gestao-backend.onrender.com/api
   ```
   ⚠️ **IMPORTANTE**: Deve terminar com `/api`
6. Clique em **Save**
7. Vá em **Deployments** e faça um **Redeploy** (ou aguarde o próximo commit)

## 🔍 Verificar se Está Correto

### Backend (Render):
- ✅ `CORS_ORIGIN` = `https://mustafa-all-systems-web.vercel.app`
- ✅ Redeploy feito

### Frontend (Vercel):
- ✅ `VITE_API_URL` = `https://promo-gestao-backend.onrender.com/api`
- ✅ Redeploy feito

## 🧪 Testar

1. Abra o console do navegador (F12)
2. Acesse o frontend
3. Tente fazer login
4. Não deve mais aparecer erro de CORS

## 📝 URLs Corretas

- **Backend API**: `https://promo-gestao-backend.onrender.com/api`
- **Login Endpoint**: `https://promo-gestao-backend.onrender.com/api/auth/login`
- **Frontend**: `https://mustafa-all-systems-web.vercel.app`

## 🆘 Ainda com Problemas?

### Erro CORS persiste:
- Verifique se o redeploy foi concluído
- Verifique se a URL no `CORS_ORIGIN` está exatamente igual (sem `/` no final)
- Limpe o cache do navegador (Ctrl+Shift+R)

### Erro 404 persiste:
- Verifique se `VITE_API_URL` termina com `/api`
- Verifique se o frontend foi redeployado após mudar a variável

---

**Após essas configurações, o aplicativo deve funcionar!** ✅

