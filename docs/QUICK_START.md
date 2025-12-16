# 🚀 Quick Start - Teste Rápido

## Passo 1: Configurar Banco de Dados

```bash
# Criar banco PostgreSQL
createdb promo_gestao
```

## Passo 2: Configurar Backend

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/promo_gestao?schema=public"
JWT_SECRET="qualquer-string-secreta-aqui"
JWT_REFRESH_SECRET="outra-string-secreta-aqui"
```

## Passo 3: Instalar e Configurar

```bash
# Na raiz
npm install

# No backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

O comando `seed` criará:
- ✅ 1 supervisor: `supervisor@teste.com` / `senha123`
- ✅ 2 promotores: `promotor1@teste.com` e `promotor2@teste.com` / `senha123`
- ✅ 2 indústrias de exemplo

## Passo 4: Iniciar Backend

```bash
cd backend
npm run dev
```

Você deve ver: `Server running on port 3000`

## Passo 5: Testar Login

### Via Terminal (curl):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@teste.com","password":"senha123"}'
```

### Via Postman/Insomnia:

1. **POST** `http://localhost:3000/api/auth/login`
2. Body (JSON):
   ```json
   {
     "email": "supervisor@teste.com",
     "password": "senha123"
   }
   ```
3. Você receberá um `accessToken` e `refreshToken`

## Passo 6: Testar Frontend Web

```bash
cd web
npm install
npm run dev
```

Acesse: `http://localhost:5173`

**Login:**
- Email: `supervisor@teste.com`
- Senha: `senha123`

## ✅ Pronto!

Agora você pode testar:
- ✅ Login de supervisor e promotor
- ✅ Autenticação JWT
- ✅ Endpoints protegidos
- ✅ Interface web básica

## 📝 Próximos Passos

Após testar, podemos continuar implementando:
- Fluxo de check-in/checkout
- Upload de fotos
- Dashboard completo
- Relatórios

