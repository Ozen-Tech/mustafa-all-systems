# 🚀 Como Usar o Aplicativo Após o Deploy

## 📍 URLs do Aplicativo

Após o deploy, você terá:

- **Frontend (Web)**: `https://seu-app.vercel.app`
- **Backend (API)**: `https://promo-gestao-backend.onrender.com`
- **Health Check**: `https://promo-gestao-backend.onrender.com/health`

## ✅ 1. Verificar se Está Funcionando

### Teste o Backend:
```bash
# Teste o health check
curl https://promo-gestao-backend.onrender.com/health

# Deve retornar:
# {"status":"ok","timestamp":"2024-..."}
```

### Teste o Frontend:
1. Acesse a URL do Vercel no navegador
2. Você deve ver a tela de login

## 🔐 2. Criar Primeiro Usuário (Supervisor)

O banco de dados está vazio. Você precisa criar o primeiro usuário. Duas opções:

### Opção A: Usar Script de Seed (Recomendado)

1. **Clone o repositório localmente** (se ainda não tiver):
   ```bash
   git clone https://github.com/Ozen-Tech/mustafa-all-systems.git
   cd mustafa-all-systems
   ```

2. **Configure o `.env` no backend**:
   ```bash
   cd backend
   cp .env.example .env
   ```

3. **Adicione a DATABASE_URL do Render**:
   - Vá em [Render Dashboard](https://dashboard.render.com/)
   - Clique no banco de dados `promo-gestao-db`
   - Copie a "Internal Database URL" ou "Connection String"
   - Cole no `.env`:
     ```
     DATABASE_URL="postgresql://..."
     ```

4. **Execute o seed**:
   ```bash
   npm install
   npx prisma generate
   npm run seed
   ```

   Isso criará:
   - **Supervisor**: `supervisor@teste.com` / `senha123`
   - **Promotores**: `promotor1@teste.com` / `senha123` e `promotor2@teste.com` / `senha123`

### Opção B: Criar Manualmente via API

1. **Crie um endpoint temporário** ou use o Prisma Studio:
   ```bash
   cd backend
   npx prisma studio
   ```

2. Ou faça uma requisição direta ao banco (mais complexo)

## 🌐 3. Configurar CORS no Backend

**IMPORTANTE**: Configure o CORS no Render para permitir requisições do frontend:

1. Vá em [Render Dashboard](https://dashboard.render.com/)
2. Clique no serviço `promo-gestao-backend`
3. Vá em **Environment**
4. Adicione/Edite a variável `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://seu-app.vercel.app,https://seu-app.onrender.com
   ```
   (Substitua `seu-app.vercel.app` pela URL real do seu frontend)

5. Clique em **Save Changes** (isso vai fazer um redeploy)

## 📱 4. Acessar o Aplicativo

1. **Abra o navegador** e acesse a URL do Vercel
2. **Faça login** com:
   - Email: `supervisor@teste.com`
   - Senha: `senha123`

3. **Você verá o Dashboard** do supervisor

## 🔧 5. Verificar Configurações

### Frontend (Vercel):
- ✅ `VITE_API_URL` deve estar configurada como: `https://promo-gestao-backend.onrender.com/api`

### Backend (Render):
- ✅ `CORS_ORIGIN` deve incluir a URL do frontend
- ✅ `DATABASE_URL` está conectado automaticamente
- ✅ Firebase Storage está configurado (se você adicionou as variáveis)

## 🐛 Troubleshooting

### Erro: "Network Error" ou CORS
- Verifique se `CORS_ORIGIN` no Render inclui a URL do Vercel
- Verifique se `VITE_API_URL` no Vercel está correta

### Erro: "Invalid credentials"
- Execute o seed para criar usuários
- Verifique se o banco de dados está conectado

### Erro: "Cannot connect to API"
- Verifique se o backend está online: `https://promo-gestao-backend.onrender.com/health`
- Verifique os logs no Render Dashboard

### Frontend não carrega
- Verifique os logs no Vercel Dashboard
- Verifique se o build foi bem-sucedido

## 📝 Próximos Passos

1. ✅ Criar usuários (seed)
2. ✅ Configurar CORS
3. ✅ Fazer login
4. ✅ Criar lojas (Stores)
5. ✅ Criar promotores
6. ✅ Configurar rotas
7. ✅ Testar funcionalidades

## 🎯 URLs Importantes

- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Firebase Console**: https://console.firebase.google.com/
- **Backend Health**: https://promo-gestao-backend.onrender.com/health

---

**Dica**: Mantenha essas URLs salvas para acesso rápido! 🚀

