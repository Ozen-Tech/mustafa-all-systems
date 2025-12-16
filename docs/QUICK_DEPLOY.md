# ⚡ Deploy Rápido - 3 Passos

## 1️⃣ Firebase Storage (5 min)

1. [Firebase Console](https://console.firebase.google.com/) > Criar projeto
2. Storage > Get Started
3. Project Settings > Service Accounts > Generate New Private Key
4. Baixe o JSON

## 2️⃣ Render - Backend (5 min)

1. [Render Dashboard](https://dashboard.render.com/) > New > Blueprint
2. Conecte repositório GitHub
3. Render detecta `render.yaml` automaticamente
4. Adicione variáveis Firebase (do JSON baixado):
   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="..."
   FIREBASE_STORAGE_BUCKET=...
   ```
5. Deploy automático!

## 3️⃣ Vercel - Frontend (5 min)

1. [Vercel Dashboard](https://vercel.com/dashboard) > Add New > Project
2. Importe repositório
3. Configure:
   - Root: `web`
   - Build: `npm run build`
   - Output: `dist`
4. Adicione: `VITE_API_URL=https://seu-backend.onrender.com/api`
5. Deploy!

## ✅ Pronto!

- Backend: `https://seu-backend.onrender.com`
- Frontend: `https://seu-app.vercel.app`
- Database: Automático no Render
- Storage: Firebase Storage

**Custo**: ~$14/mês (ou grátis com free tiers)

📖 **Guia completo**: Veja `DEPLOY_VERCEL_RENDER.md`

