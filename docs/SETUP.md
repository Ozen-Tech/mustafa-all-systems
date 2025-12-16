# Guia de Setup e Teste

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- Conta AWS com S3 configurado (opcional para testes iniciais)

## Configuração Inicial

### 1. Instalar Dependências

```bash
# Na raiz do projeto
npm run install:all

# Ou manualmente em cada pasta
cd backend && npm install
cd ../mobile && npm install
cd ../web && npm install
```

### 2. Configurar Banco de Dados

1. Crie um banco PostgreSQL:
```sql
CREATE DATABASE promo_gestao;
```

2. Configure a variável de ambiente no backend:
```bash
cd backend
cp .env.example .env
```

3. Edite o `.env` e configure:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/promo_gestao?schema=public"
JWT_SECRET="seu-secret-jwt-aqui"
JWT_REFRESH_SECRET="seu-refresh-secret-aqui"
```

### 3. Executar Migrações

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 4. Popular Dados de Teste

```bash
cd backend
npm run seed
```

Isso criará:
- 1 supervisor: `supervisor@teste.com` / `senha123`
- 2 promotores: `promotor1@teste.com` e `promotor2@teste.com` / `senha123`
- 2 indústrias de exemplo

## Testando a API

### 1. Iniciar o Backend

```bash
cd backend
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### 2. Testar Login (usando curl ou Postman)

**Login como Supervisor:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supervisor@teste.com",
    "password": "senha123"
  }'
```

**Login como Promotor:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "promotor1@teste.com",
    "password": "senha123"
  }'
```

Você receberá um JSON com:
- `accessToken`: Token JWT para autenticação
- `refreshToken`: Token para renovar o access token
- `user`: Dados do usuário

### 3. Testar Endpoint Protegido

Use o token recebido no login:

```bash
curl -X GET http://localhost:3000/api/supervisors/dashboard \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN_AQUI"
```

## Testando o Frontend Web

### 1. Iniciar o Frontend

```bash
cd web
npm run dev
```

Acesse: `http://localhost:5173`

### 2. Fazer Login

Use as credenciais:
- **Supervisor:** `supervisor@teste.com` / `senha123`
- **Promotor:** `promotor1@teste.com` / `senha123`

## Testando o Mobile

### 1. Instalar Expo CLI (se ainda não tiver)

```bash
npm install -g expo-cli
```

### 2. Iniciar o App

```bash
cd mobile
npm start
```

### 3. Configurar URL da API

Crie um arquivo `.env` no diretório `mobile`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Nota:** Para testar no dispositivo físico, use o IP da sua máquina na rede local:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000/api
```

## Verificar Banco de Dados

### Usar Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Isso abrirá uma interface web em `http://localhost:5555` para visualizar e editar dados.

## Troubleshooting

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Teste a conexão: `psql -U usuario -d promo_gestao`

### Erro de JWT
- Certifique-se de que `JWT_SECRET` e `JWT_REFRESH_SECRET` estão configurados no `.env`

### Erro de CORS
- Verifique se `CORS_ORIGIN` no `.env` do backend inclui as URLs do frontend

### Mobile não conecta à API
- Use o IP da máquina na rede local, não `localhost`
- Verifique se o backend está acessível na rede

## Próximos Passos

Após testar a autenticação:
1. Implementar endpoints de visitas (check-in/checkout)
2. Implementar fluxo mobile completo
3. Implementar dashboard web
4. Adicionar funcionalidades de relatórios

