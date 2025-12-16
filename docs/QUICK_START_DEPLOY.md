# ⚡ Quick Start - Deploy Simplificado

## 🎯 3 Formas de Fazer Deploy

### 1️⃣ Makefile (Mais Simples) ⭐

```bash
# Deploy completo
make deploy

# Apenas backend
make deploy-backend

# Apenas web  
make deploy-web
```

### 2️⃣ Script Interativo

```bash
./deploy.sh
# Escolha a opção desejada no menu
```

### 3️⃣ GitHub Actions (Automático)

- Via UI: `Actions > Deploy All > Run workflow`
- Via Push: `git commit -m "update [deploy-backend]" && git push`

## 📋 Setup Inicial (Uma Vez)

```bash
# 1. Instalar ferramentas
brew install terraform awscli docker node  # macOS
# ou equivalente para seu OS

# 2. Configurar AWS
aws configure

# 3. Configurar variáveis
make setup
# Edite: infra/terraform/terraform.tfvars
```

## 🚀 Primeiro Deploy

```bash
make deploy
# Escolha opção 1 (Deploy completo)
```

Pronto! Em ~15-20 minutos tudo estará no ar.

## 📱 Mobile

Não precisa de deploy na AWS. Apenas:

```bash
cd mobile
echo "EXPO_PUBLIC_API_URL=https://api.mustafa.ozentech/api" > .env
npm run build:preview:android
```

## ✅ Verificar

```bash
make check-health    # API funcionando?
make check-status    # Status dos serviços
make check-logs      # Ver logs
```

## 🆘 Ajuda

```bash
make help           # Ver todos os comandos
```

---

**Documentação Completa**: Veja `DEPLOY_SIMPLES.md` ou `README_DEPLOY.md`

