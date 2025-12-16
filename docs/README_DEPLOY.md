# 🚀 Deploy Simplificado - Guia Rápido

## ⚡ Forma Mais Simples

### 1 Comando para Deploy Completo:

```bash
make deploy
```

Ou usando o script diretamente:

```bash
./deploy.sh
```

## 📋 Setup Inicial (Uma Vez)

### 1. Instalar Ferramentas

```bash
# macOS
brew install terraform awscli docker node

# Verificar instalação
terraform --version
aws --version
docker --version
node --version
```

### 2. Configurar AWS

```bash
aws configure
# Digite: Access Key, Secret Key, Region (sa-east-1), Output (json)
```

### 3. Configurar Variáveis

```bash
make setup
# Edite: infra/terraform/terraform.tfvars
```

## 🎯 Deploy Rápido

### Deploy Completo (Primeira Vez)

```bash
make deploy
# Escolha opção 1
```

### Deploy Apenas Backend

```bash
make deploy-backend
```

### Deploy Apenas Web

```bash
make deploy-web
```

### Executar Migrações

```bash
make deploy-migrations
```

## 🔍 Verificar Status

```bash
# Saúde da API
make check-health

# Status do ECS
make check-status

# Logs em tempo real
make check-logs
```

## 🔄 Deploy Automático (GitHub Actions)

### Opção 1: Manual (via GitHub UI)

1. Vá em: `Actions > Deploy All (Full Stack) > Run workflow`
2. Selecione o que deseja deployar
3. Clique em "Run workflow"

### Opção 2: Automático (via Push)

Configure os secrets no GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `VITE_API_URL` (https://api.mustafa.ozentech/api)
- `AWS_ACCOUNT_ID` (opcional, para migrações)

Faça push com mensagens especiais:
- `[deploy-backend]` - Deploy do backend
- `[deploy-web]` - Deploy do frontend
- `[deploy-infra]` - Deploy da infraestrutura
- `[migrate]` - Executar migrações

Exemplo:
```bash
git commit -m "Atualizar backend [deploy-backend]"
git push origin main
```

## 📱 Mobile

O mobile não precisa de deploy na AWS. Apenas configure:

```bash
cd mobile
# Edite .env
echo "EXPO_PUBLIC_API_URL=https://api.mustafa.ozentech/api" > .env

# Build
npm run build:preview:android  # ou ios
```

## 🆘 Problemas Comuns

### "terraform.tfvars não encontrado"
```bash
make setup
```

### "AWS CLI não configurado"
```bash
aws configure
```

### "Docker não está rodando"
```bash
# macOS: Abra o Docker Desktop
# Linux: sudo systemctl start docker
```

### Ver logs de erro
```bash
make check-logs
```

## 📊 Todos os Comandos

| Comando | Descrição |
|---------|-----------|
| `make deploy` | Deploy completo interativo |
| `make deploy-backend` | Apenas backend |
| `make deploy-web` | Apenas frontend |
| `make deploy-infra` | Apenas infraestrutura |
| `make deploy-migrations` | Executar migrações |
| `make check-health` | Verificar saúde da API |
| `make check-status` | Status dos serviços |
| `make check-logs` | Ver logs |
| `make setup` | Configuração inicial |
| `make help` | Ver todos os comandos |

## 🎉 Pronto!

Agora você tem 3 formas de fazer deploy:

1. **Mais Simples**: `make deploy`
2. **Script**: `./deploy.sh`
3. **GitHub Actions**: Via UI ou push com tags

Escolha a que preferir! 🚀

