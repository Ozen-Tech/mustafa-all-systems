# 🚀 Deploy Simplificado - Promo Gestão

Este guia mostra a forma mais simples de fazer deploy de todo o sistema.

## ⚡ Deploy Rápido (1 Comando)

### Opção 1: Script Interativo

```bash
./deploy.sh
```

O script irá perguntar o que você deseja fazer:
1. Deploy completo (Infra + Backend + Web)
2. Apenas Backend
3. Apenas Web
4. Apenas Infraestrutura
5. Executar migrações do banco

### Opção 2: Makefile (Ainda Mais Simples)

```bash
# Deploy completo
make deploy

# Apenas backend
make deploy-backend

# Apenas web
make deploy-web

# Apenas infraestrutura
make deploy-infra

# Executar migrações
make deploy-migrations
```

## 📋 Pré-requisitos (Uma Vez)

### 1. Instalar Ferramentas

```bash
# macOS
brew install terraform awscli docker node

# Linux (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y terraform awscli docker.io nodejs npm

# Ou use o instalador oficial de cada ferramenta
```

### 2. Configurar AWS

```bash
aws configure
# Digite suas credenciais AWS
```

### 3. Configurar Terraform (Primeira Vez)

```bash
# Criar arquivo de configuração
make setup

# Editar com seus valores
nano infra/terraform/terraform.tfvars
```

Edite `infra/terraform/terraform.tfvars`:
```hcl
aws_region = "sa-east-1"
environment = "prod"
project_name = "promo-gestao"
domain_name = "mustafa.ozentech"
db_master_password = "SUA_SENHA_FORTE_AQUI"
```

## 🎯 Fluxo de Deploy Completo

### Primeira Vez (Setup Inicial)

```bash
# 1. Configurar variáveis
make setup
# Edite infra/terraform/terraform.tfvars

# 2. Deploy completo (infra + backend + web)
make deploy
# Escolha opção 1 quando perguntado
```

Isso irá:
- ✅ Criar toda a infraestrutura na AWS
- ✅ Configurar secrets automaticamente
- ✅ Build e push da imagem Docker
- ✅ Deploy do backend no ECS
- ✅ Executar migrações do banco
- ✅ Build e deploy do frontend
- ✅ Invalidar cache do CloudFront

### Deploys Subsequentes

#### Atualizar Backend

```bash
make deploy-backend
# ou
./deploy.sh  # Escolha opção 2
```

#### Atualizar Frontend

```bash
make deploy-web
# ou
./deploy.sh  # Escolha opção 3
```

#### Apenas Migrações

```bash
make deploy-migrations
# ou
./deploy.sh  # Escolha opção 5
```

## 🔍 Comandos Úteis

### Verificar Status

```bash
# Saúde da API
make check-health

# Status do ECS
make check-status

# Logs em tempo real
make check-logs
```

### Outros Comandos

```bash
# Ver ajuda
make help

# Limpar arquivos temporários
make clean
```

## 🔄 Deploy Automático via GitHub Actions

Para deploy automático a cada push:

### 1. Configurar Secrets no GitHub

Vá em: `Settings > Secrets and variables > Actions`

Adicione:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID` (obtido após primeiro deploy)
- `VITE_API_URL` (https://api.mustafa.ozentech/api)

### 2. Push para Main/Master

```bash
git push origin main
```

Os workflows em `.github/workflows/` irão:
- **deploy-backend.yml**: Deploy automático quando `backend/` muda
- **deploy-web.yml**: Deploy automático quando `web/` muda

## 📱 Deploy do Mobile

O mobile (React Native/Expo) não precisa de deploy na AWS, mas precisa ser configurado:

### 1. Configurar URL da API

Edite `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://api.mustafa.ozentech/api
```

### 2. Build e Publicar

```bash
cd mobile

# Desenvolvimento
npm start

# Build para produção (Android)
npm run build:preview:android

# Build para produção (iOS)
npm run build:preview:ios
```

Os builds são feitos via EAS (Expo Application Services) e não requerem infraestrutura AWS.

## 🆘 Troubleshooting Rápido

### Erro: "terraform.tfvars não encontrado"
```bash
make setup
# Edite o arquivo criado
```

### Erro: "AWS CLI não configurado"
```bash
aws configure
```

### Erro: "Docker não está rodando"
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### Erro: "Não foi possível obter outputs do Terraform"
```bash
# Execute o deploy da infraestrutura primeiro
make deploy-infra
```

### Ver logs do backend
```bash
make check-logs
```

### Verificar status
```bash
make check-status
```

## 📊 Resumo dos Comandos

| Ação | Comando |
|------|---------|
| Deploy completo | `make deploy` |
| Apenas backend | `make deploy-backend` |
| Apenas web | `make deploy-web` |
| Apenas infra | `make deploy-infra` |
| Migrações | `make deploy-migrations` |
| Verificar saúde | `make check-health` |
| Ver logs | `make check-logs` |
| Ver status | `make check-status` |
| Configurar | `make setup` |
| Ajuda | `make help` |

## 🎉 Pronto!

Agora você tem uma forma super simples de fazer deploy:

```bash
make deploy
```

E escolha a opção desejada! 🚀

