# 🚀 Deploy Simplificado - Vercel + Render + Firebase

Guia completo para fazer deploy do sistema usando serviços simples e conhecidos.

## 📋 Arquitetura

- **Frontend Web**: Vercel (React/Vite)
- **Backend API**: Render (Node.js/Express)
- **Banco de Dados**: Render PostgreSQL
- **Storage de Fotos**: Firebase Storage

## ⚡ Setup Rápido (15 minutos)

### 1. Firebase Storage (5 min)

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use existente
3. Vá em **Storage** > **Get Started**
4. Escolha modo de produção (regras de segurança)
5. Vá em **Project Settings** > **Service Accounts**
6. Clique em **Generate New Private Key**
7. Baixe o JSON com as credenciais

### 2. Render - Backend + Database (5 min)

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Conecte seu repositório GitHub
3. Clique em **New** > **Blueprint**
4. Selecione o repositório `mustafa-all-systems`
5. Render detectará automaticamente o `render.yaml`
6. Configure as variáveis de ambiente (veja abaixo)
7. Clique em **Apply**

### 3. Vercel - Frontend (5 min)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New** > **Project**
3. Importe o repositório
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Adicione variável de ambiente:
   - `VITE_API_URL`: `https://seu-backend.onrender.com/api`
6. Clique em **Deploy**

## 🔧 Configuração Detalhada

### Render - Variáveis de Ambiente

No dashboard do Render, vá em seu serviço > **Environment** e adicione:

```env
NODE_ENV=production
PORT=3000
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://seu-app.vercel.app,https://seu-app.onrender.com

# Firebase Storage
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

**Importante**: 
- `FIREBASE_PRIVATE_KEY` deve ter `\n` literal (não quebra de linha real)
- `CORS_ORIGIN` deve incluir a URL do Vercel após o deploy

### Vercel - Variáveis de Ambiente

No dashboard do Vercel, vá em **Settings** > **Environment Variables**:

```env
VITE_API_URL=https://seu-backend.onrender.com/api
```

### Firebase Storage - Regras de Segurança

No Firebase Console, vá em **Storage** > **Rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      // Permitir leitura pública
      allow read: if true;
      // Permitir upload apenas com autenticação (via presigned URL)
      allow write: if request.auth != null || request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

Para desenvolvimento, você pode usar regras mais permissivas:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 🗄️ Migrações do Banco

Após o primeiro deploy do backend no Render:

1. Acesse o **Shell** do serviço no Render
2. Execute:

```bash
cd /opt/render/project/src/backend
npx prisma migrate deploy
npx prisma generate
```

Ou configure no `render.yaml` para executar automaticamente no build.

## 📱 Configurar Mobile

Edite `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://seu-backend.onrender.com/api
```

## 🔄 Deploy Automático

### Render
- Deploy automático a cada push na branch `main`/`master`
- Configurado via `render.yaml`

### Vercel
- Deploy automático a cada push na branch `main`/`master`
- Configurado via `vercel.json`

## 🧪 Testar Deploy

### 1. Verificar Backend

```bash
curl https://seu-backend.onrender.com/health
```

Deve retornar:
```json
{"status":"ok","timestamp":"..."}
```

### 2. Verificar Frontend

Acesse: `https://seu-app.vercel.app`

### 3. Testar Upload de Foto

1. Faça login no app mobile
2. Faça check-in em uma loja
3. Tire uma foto
4. Verifique no Firebase Storage se a foto foi enviada

## 🆘 Troubleshooting

### Backend não inicia no Render

- Verifique os logs: Render Dashboard > Seu Serviço > **Logs**
- Verifique se `DATABASE_URL` está configurado (vem automaticamente do banco)
- Verifique se `JWT_SECRET` e `JWT_REFRESH_SECRET` estão configurados

### Frontend não conecta ao backend

- Verifique `VITE_API_URL` no Vercel
- Verifique `CORS_ORIGIN` no Render (deve incluir URL do Vercel)
- Verifique se o backend está rodando (health check)

### Upload de fotos não funciona

- Verifique credenciais do Firebase no Render
- Verifique regras de segurança do Firebase Storage
- Verifique logs do backend para erros

### Migrações não executam

Execute manualmente via Shell do Render:
```bash
cd backend
npx prisma migrate deploy
```

## 💰 Custos Estimados

### Render
- **Free Plan**: Grátis (backend e PostgreSQL) - Ideal para começar
- **Starter Plan**: $7/mês (backend) + $7/mês (PostgreSQL) = **$14/mês** (quando precisar de mais recursos)

### Vercel
- **Hobby Plan**: **Grátis** (para projetos pessoais)
- **Pro Plan**: $20/mês (se precisar de mais recursos)

### Firebase
- **Spark Plan**: **Grátis** (5GB storage, 1GB/day transfer)
- **Blaze Plan**: Pay-as-you-go (após limites gratuitos)

**Total estimado**: ~$14-20/mês (ou grátis com free tiers)

## 📝 Checklist de Deploy

- [ ] Firebase Storage configurado
- [ ] Credenciais Firebase adicionadas no Render
- [ ] Backend deployado no Render
- [ ] Banco de dados criado no Render
- [ ] Migrações executadas
- [ ] Frontend deployado no Vercel
- [ ] `VITE_API_URL` configurado no Vercel
- [ ] `CORS_ORIGIN` configurado no Render
- [ ] Mobile configurado com URL do backend
- [ ] Testes realizados (health check, login, upload)

## 🎉 Pronto!

Agora você tem um sistema completo rodando em:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Render PostgreSQL
- **Storage**: Firebase Storage

Tudo com deploy automático a cada push! 🚀

