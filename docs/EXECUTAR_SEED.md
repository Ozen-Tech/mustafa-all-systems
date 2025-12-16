# 🌱 Como Executar o Seed no Render

O banco de dados do Render **não é acessível diretamente** do seu computador. Use uma das opções abaixo:

## ✅ Opção 1: Via API Endpoint (MAIS FÁCIL) ⭐

Criei um endpoint temporário para executar o seed via API:

1. **Configure a variável de ambiente no Render**:
   - Render Dashboard > `promo-gestao-backend` > **Environment**
   - Adicione: `SEED_SECRET=temporary-seed-secret-change-me`
   - **Save Changes** (vai fazer redeploy)

2. **Faça commit e push** das mudanças:
   ```bash
   git add .
   git commit -m "Add: Endpoint temporário para seed"
   git push
   ```

3. **Aguarde o deploy** no Render

4. **Execute o seed via curl ou Postman**:
   ```bash
   curl -X POST https://promo-gestao-backend.onrender.com/api/admin/seed \
     -H "Content-Type: application/json" \
     -H "x-seed-secret: temporary-seed-secret-change-me" \
     -d '{"secret": "temporary-seed-secret-change-me"}'
   ```

   Ou use Postman/Insomnia:
   - **URL**: `POST https://promo-gestao-backend.onrender.com/api/admin/seed`
   - **Header**: `x-seed-secret: temporary-seed-secret-change-me`
   - **Body** (JSON): `{"secret": "temporary-seed-secret-change-me"}`

5. **Verifique a resposta**:
   ```json
   {
     "success": true,
     "message": "Database seeded successfully",
     "users": {
       "supervisor": "supervisor@teste.com",
       "promoters": ["promotor1@teste.com", "promotor2@teste.com"]
     }
   }
   ```

✅ **Pronto!** Os usuários foram criados.

⚠️ **IMPORTANTE**: Após criar os usuários, remova ou proteja este endpoint!

## ✅ Opção 2: Render Shell

1. Vá em [Render Dashboard](https://dashboard.render.com/)
2. Clique no serviço **`promo-gestao-backend`**
3. Vá em **Shell** (menu lateral)
4. Execute:
   ```bash
   cd backend
   npm run seed
   ```

**Pronto!** Os usuários serão criados no banco de dados.

## ✅ Opção 2: Usar External Connection String

Se o Render fornecer uma "External Connection String", você pode usá-la:

1. Render Dashboard > `promo-gestao-db` > **Connections**
2. Procure por **"External Connection String"** ou **"Public Connection String"**
3. Se existir, copie e cole no seu `.env` local:
   ```
   DATABASE_URL="postgresql://..."
   ```
4. Execute localmente:
   ```bash
   npm run seed
   ```

⚠️ **Nota**: Bancos gratuitos do Render geralmente **não têm** conexão externa por segurança.

## ✅ Opção 3: Criar Usuário via API (Temporário)

Crie um endpoint temporário de registro ou use o Prisma Studio:

1. Render Dashboard > `promo-gestao-backend` > **Shell**
2. Execute:
   ```bash
   cd backend
   npx prisma studio
   ```
3. Isso abrirá uma interface web para gerenciar o banco
4. Crie manualmente os usuários

## ✅ Opção 4: Script via Render API

Você pode criar um script que roda no próprio Render:

1. Crie um endpoint temporário no backend:
   ```typescript
   // backend/src/routes/admin.routes.ts (temporário)
   router.post('/seed', async (req, res) => {
     // Execute o seed aqui
   });
   ```

2. Chame via curl ou Postman após fazer deploy

## 🎯 Recomendação: Use Render Shell

A **Opção 1 (Render Shell)** é a mais simples e direta:

```bash
# No Render Shell
cd backend
npm run seed
```

Isso executará o seed diretamente no ambiente do Render, com acesso ao banco de dados.

## 🔍 Verificar se Funcionou

Após executar o seed, teste o login:

1. Acesse o frontend
2. Tente fazer login com:
   - Email: `supervisor@teste.com`
   - Senha: `senha123`

Se funcionar, o seed foi executado com sucesso! ✅

---

**Dica**: Após criar os usuários, você pode remover o acesso ao seed ou protegê-lo com autenticação.

