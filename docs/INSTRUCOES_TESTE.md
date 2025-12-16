# 📋 Instruções para Testar

## ✅ Passo 1: Configurar o arquivo .env

O arquivo `.env` precisa ser configurado no diretório `backend/`.

**Opção A - Copiar template:**
```bash
cd backend
cp env.template .env
```

**Opção B - Criar manualmente:**

Crie o arquivo `backend/.env` com o seguinte conteúdo:

```env
PORT=3000
NODE_ENV=development

# IMPORTANTE: Configure com suas credenciais do PostgreSQL
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/promo_gestao?schema=public"

# IMPORTANTE: Use strings secretas diferentes
JWT_SECRET=qualquer-string-secreta-aqui
JWT_REFRESH_SECRET=outra-string-secreta-aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (pode deixar vazio para testes iniciais)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=promo-gestao-photos

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:19006
```

## ✅ Passo 2: Criar o banco de dados

```bash
# Criar banco PostgreSQL
createdb promo_gestao

# OU via psql:
psql -U postgres
CREATE DATABASE promo_gestao;
\q
```

## ✅ Passo 3: Executar migrações e seed

```bash
cd backend

# Gerar Prisma Client (já feito)
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Popular dados de teste
npm run seed
```

## ✅ Passo 4: Iniciar o servidor

```bash
cd backend
npm run dev
```

Você deve ver: `Server running on port 3000`

## ✅ Passo 5: Testar a API

### Teste rápido com curl:

```bash
# Health check
curl http://localhost:3000/health

# Login como Supervisor
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@teste.com","password":"senha123"}'

# Login como Promotor
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"promotor1@teste.com","password":"senha123"}'
```

## ✅ Passo 6: Testar Frontend Web

```bash
cd web
npm install
npm run dev
```

Acesse: `http://localhost:5173`

**Login:**
- Email: `supervisor@teste.com`
- Senha: `senha123`

## 🔍 Usuários de Teste

| Email | Senha | Role |
|-------|-------|------|
| supervisor@teste.com | senha123 | SUPERVISOR |
| promotor1@teste.com | senha123 | PROMOTER |
| promotor2@teste.com | senha123 | PROMOTER |

## ⚠️ Problemas Comuns

**Erro: "Cannot connect to database"**
- Verifique se PostgreSQL está rodando: `pg_isready`
- Confirme DATABASE_URL no `.env`
- Teste conexão: `psql -U usuario -d promo_gestao`

**Erro: "JWT_SECRET not configured"**
- Adicione JWT_SECRET e JWT_REFRESH_SECRET no `.env`

**Erro: "Prisma Client not generated"**
- Execute: `npm run prisma:generate`

