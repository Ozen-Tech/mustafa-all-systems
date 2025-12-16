# 🚀 Deploy Super Simples - Vercel + Render + Firebase

## ⚡ Resumo

- **Frontend**: Vercel (grátis)
- **Backend**: Render (Free tier disponível)
- **Database**: Render PostgreSQL (Free tier disponível)
- **Storage**: Firebase Storage (grátis até 5GB)

**Total**: Grátis para começar! (ou ~$14/mês quando precisar de mais recursos)

## 🎯 3 Passos para Deploy

### 1. Firebase Storage (5 minutos)

```bash
# 1. Acesse: https://console.firebase.google.com/
# 2. Crie projeto ou use existente
# 3. Storage > Get Started
# 4. Project Settings > Service Accounts > Generate New Private Key
# 5. Baixe o JSON

# 6. Extrair credenciais (opcional, mas útil)
./scripts/setup-firebase.sh ~/Downloads/seu-projeto-firebase-adminsdk.json
```

### 2. Render - Backend (5 minutos)

1. Acesse: https://dashboard.render.com/
2. **New** > **Blueprint**
3. Conecte repositório GitHub
4. Render detecta `render.yaml` automaticamente
5. Adicione variáveis Firebase:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (com `\n` literal)
   - `FIREBASE_STORAGE_BUCKET`
6. Deploy automático!

### 3. Vercel - Frontend (5 minutos)

1. Acesse: https://vercel.com/dashboard
2. **Add New** > **Project**
3. Importe repositório
4. Configure:
   - **Root Directory**: `web`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Adicione variável:
   - `VITE_API_URL`: `https://seu-backend.onrender.com/api`
6. Deploy!

## ✅ Pronto!

- Backend: `https://seu-backend.onrender.com`
- Frontend: `https://seu-app.vercel.app`
- Database: Automático no Render
- Storage: Firebase Storage

## 🔄 Deploy Automático

Ambos Render e Vercel fazem deploy automático a cada push em `main`/`master`.

## 📱 Mobile

Configure `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://seu-backend.onrender.com/api
```

## 🆘 Problemas?

### Backend não inicia
- Verifique logs no Render Dashboard
- Verifique se `DATABASE_URL` está configurado (automático)
- Verifique credenciais Firebase

### Frontend não conecta
- Verifique `VITE_API_URL` no Vercel
- Verifique `CORS_ORIGIN` no Render (adicione URL do Vercel)

### Upload não funciona
- Verifique credenciais Firebase
- Verifique regras do Firebase Storage (dev: permitir tudo)

## 📚 Documentação Completa

- `DEPLOY_VERCEL_RENDER.md` - Guia detalhado
- `QUICK_DEPLOY.md` - Resumo rápido

---

**Tempo total**: ~15 minutos
**Dificuldade**: ⭐⭐ (Fácil)

