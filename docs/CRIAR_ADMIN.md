# 🔐 Como Criar Usuário Administrador

Existem duas formas de criar o usuário administrador:

## Opção 1: Usando o Endpoint de Seed (Recomendado)

O endpoint de seed já foi atualizado para criar um usuário admin automaticamente.

### Via cURL:
```bash
curl -X POST https://promo-gestao-backend.onrender.com/api/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: temporary-seed-secret-change-me" \
  -d '{}'
```

### Ou via Postman/Insomnia:
- **URL**: `POST https://promo-gestao-backend.onrender.com/api/admin/seed`
- **Header**: `x-seed-secret: temporary-seed-secret-change-me`
- **Body**: `{}`

Isso criará:
- **Admin**: `admin@promo.com` / `admin123`
- **Supervisor**: `supervisor@teste.com` / `senha123`
- **Promotores**: `promotor1@teste.com` e `promotor2@teste.com` / `senha123`

## Opção 2: Usando o Script Local

Se você tiver acesso local ao banco de dados:

```bash
cd backend
npm run create-admin
```

Ou com variáveis de ambiente personalizadas:

```bash
ADMIN_EMAIL=seu-email@exemplo.com \
ADMIN_PASSWORD=sua-senha-segura \
ADMIN_NAME="Seu Nome" \
npm run create-admin
```

## Opção 3: Usando Prisma Studio

1. Execute: `cd backend && npx prisma studio`
2. Abra a tabela `User`
3. Clique em "Add record"
4. Preencha:
   - **email**: `admin@promo.com`
   - **name**: `Administrador`
   - **password**: (use o hash gerado pelo script ou crie via API)
   - **role**: `ADMIN`
   - **createdAt**: (automático)
   - **updatedAt**: (automático)

⚠️ **IMPORTANTE**: A senha precisa ser hasheada com bcrypt. Use o endpoint de criação de usuário ou o script para garantir que a senha seja hasheada corretamente.

## Credenciais Padrão do Admin

Após executar o seed:
- **Email**: `admin@promo.com`
- **Senha**: `admin123`
- **Role**: `ADMIN`

⚠️ **ALTERE A SENHA APÓS O PRIMEIRO LOGIN!**

## Verificar se o Admin foi Criado

Você pode verificar fazendo login no sistema web ou mobile com as credenciais acima. Se o login funcionar e você ver a opção "Administração" na sidebar (web), o admin foi criado com sucesso.

