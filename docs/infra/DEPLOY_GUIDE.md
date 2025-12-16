# 🚀 Guia de Deploy - Promo Gestão AWS

Este guia fornece instruções passo a passo para implantar o sistema Promo Gestão na AWS.

## 📋 Checklist Pré-Deploy

- [ ] Terraform >= 1.5 instalado
- [ ] AWS CLI configurado (`aws configure`)
- [ ] Credenciais AWS com permissões adequadas
- [ ] Domínio `ozentech` configurado no Route 53
- [ ] GitHub Actions secrets configurados (para CI/CD)
- [ ] Docker instalado (para build local)

## 🏗️ Passo 1: Criar Bucket S3 para Terraform State (Opcional mas Recomendado)

```bash
aws s3 mb s3://promo-gestao-terraform-state --region sa-east-1
aws s3api put-bucket-versioning \
  --bucket promo-gestao-terraform-state \
  --versioning-configuration Status=Enabled
```

Depois, descomente e configure o backend no `infra/terraform/main.tf`:

```hcl
backend "s3" {
  bucket = "promo-gestao-terraform-state"
  key    = "terraform.tfstate"
  region = "sa-east-1"
}
```

## 🔧 Passo 2: Configurar Variáveis do Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edite `terraform.tfvars` com seus valores:

```hcl
aws_region = "sa-east-1"
environment = "prod"
project_name = "promo-gestao"
domain_name = "mustafa.ozentech"

# Database - USE UMA SENHA FORTE!
db_master_username = "postgres"
db_master_password = "SUA_SENHA_FORTE_AQUI"

# Ajuste conforme necessário
db_instance_class = "db.t4g.small"
ecs_desired_count = 2
```

## 🚀 Passo 3: Deploy da Infraestrutura

```bash
cd infra/terraform

# Inicializar
terraform init

# Validar
terraform validate

# Ver o plano
terraform plan

# Aplicar (ou usar o script)
terraform apply
# OU
cd ../scripts
./deploy.sh
```

⏱️ **Tempo estimado**: 15-20 minutos

## 🔐 Passo 4: Configurar Secrets

Após o deploy, configure os JWT secrets:

```bash
cd infra/scripts
./setup-secrets.sh
```

Ou manualmente no AWS Console:
1. Acesse AWS Secrets Manager
2. Abra `promo-gestao-jwt-secret-prod`
3. Edite e adicione:
   ```json
   {
     "jwt_secret": "GERE_UMA_STRING_ALEATORIA_64_CHARS",
     "jwt_refresh_secret": "GERE_OUTRA_STRING_ALEATORIA_64_CHARS"
   }
   ```

## 🐳 Passo 5: Build e Push da Imagem Docker

```bash
cd backend

# Obter URL do ECR
ECR_URL=$(aws ecr describe-repositories --repository-names promo-gestao-backend --query 'repositories[0].repositoryUri' --output text --region sa-east-1)

# Login no ECR
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin ${ECR_URL%/*}

# Build
docker build -t promo-gestao-backend .

# Tag
docker tag promo-gestao-backend:latest ${ECR_URL}:latest

# Push
docker push ${ECR_URL}:latest
```

## 🗄️ Passo 6: Executar Migrações do Banco

Você precisa executar as migrações do Prisma no banco RDS. Opções:

### Opção A: Via ECS Task (Recomendado)

Crie um script temporário ou use o container:

```bash
# Obter endpoint do RDS
RDS_ENDPOINT=$(terraform -chdir=infra/terraform output -raw rds_endpoint)

# Executar migração via container local (conectando ao RDS)
cd backend
docker run --rm \
  -e DATABASE_URL="postgresql://postgres:SUA_SENHA@${RDS_ENDPOINT}:5432/promo_gestao?schema=public" \
  -v $(pwd):/app \
  -w /app \
  node:18-alpine \
  sh -c "npm install && npx prisma migrate deploy"
```

### Opção B: Via Bastion Host (se necessário)

Crie uma instância EC2 temporária na mesma VPC para acessar o RDS.

## 🌐 Passo 7: Deploy do Frontend Web

```bash
cd web

# Configurar variável de ambiente
export VITE_API_URL=https://api.mustafa.ozentech/api

# Build
npm install
npm run build

# Deploy para S3
aws s3 sync dist/ s3://promo-gestao-web-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# HTML files com cache curto
aws s3 sync dist/ s3://promo-gestao-web-prod/ \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "index.html" \
  --include "*.html"

# Invalidar CloudFront
DIST_ID=$(terraform -chdir=../infra/terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id ${DIST_ID} \
  --paths "/*"
```

## ✅ Passo 8: Verificação

### Health Check da API

```bash
curl https://api.mustafa.ozentech/health
```

Deve retornar:
```json
{"status":"ok","timestamp":"..."}
```

### Verificar Logs do ECS

```bash
aws logs tail /ecs/promo-gestao-backend --follow --region sa-east-1
```

### Verificar Status do ECS Service

```bash
aws ecs describe-services \
  --cluster promo-gestao-cluster \
  --services promo-gestao-backend-service \
  --region sa-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

### Acessar o Frontend

Abra no navegador: `https://mustafa.ozentech`

## 🔄 Passo 9: Configurar CI/CD (Opcional)

### GitHub Secrets

Configure no GitHub (Settings > Secrets and variables > Actions):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID` (obtido via `terraform output`)
- `VITE_API_URL` (https://api.mustafa.ozentech/api)

Os workflows já estão configurados em `.github/workflows/`:
- `deploy-backend.yml` - Deploy automático do backend
- `deploy-web.yml` - Deploy automático do frontend

## 📱 Passo 10: Configurar Mobile App

No arquivo `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://api.mustafa.ozentech/api
```

## 🔍 Troubleshooting

### Erro: "Certificate validation failed"
- Verifique se os registros DNS foram criados no Route 53
- Aguarde 5-10 minutos para propagação DNS
- Verifique: `aws route53 list-resource-record-sets --hosted-zone-id <ZONE_ID>`

### Erro: "Task failed to start"
- Verifique logs: `aws logs tail /ecs/promo-gestao-backend --follow`
- Verifique secrets: `aws secretsmanager get-secret-value --secret-id promo-gestao-jwt-secret-prod`
- Verifique se a imagem existe: `aws ecr describe-images --repository-name promo-gestao-backend`

### Erro: "Cannot connect to database"
- Verifique Security Groups (RDS deve permitir tráfego do ECS)
- Verifique se o ECS está nas subnets privadas
- Teste conectividade: `aws rds describe-db-instances --db-instance-identifier promo-gestao-db`

### Erro: "403 Forbidden" no S3
- Verifique bucket policy
- Verifique IAM roles do ECS
- Verifique CORS no bucket (se necessário)

## 📊 Monitoramento

### CloudWatch Dashboards

Crie dashboards no CloudWatch para monitorar:
- CPU/Memória do ECS
- Requisições do ALB
- Conexões do RDS
- Erros 4xx/5xx

### Alertas

Configure alertas para:
- CPU > 80%
- Memória > 80%
- Erros 5xx > 10/min
- RDS connections > 80%

## 💰 Estimativa de Custos

Com os recursos configurados (região sa-east-1):

- **RDS db.t4g.small**: ~$50-70/mês
- **NAT Gateways (3x)**: ~$135/mês
- **ECS Fargate (2 tasks)**: ~$60-80/mês
- **ALB**: ~$20-25/mês
- **CloudFront**: ~$5-15/mês (depende do tráfego)
- **S3**: ~$1-5/mês (depende do storage)
- **Total estimado**: ~$270-330/mês

⚠️ **Nota**: Com $1k em créditos, você tem aproximadamente 3 meses de operação.

## 🗑️ Limpeza (Destruir Infraestrutura)

⚠️ **CUIDADO**: Isso deleta TUDO!

```bash
cd infra/terraform
terraform destroy
```

## 📚 Próximos Passos

1. Configurar backup automático do RDS
2. Implementar monitoramento avançado (CloudWatch Dashboards)
3. Configurar alertas proativos
4. Implementar testes automatizados no CI/CD
5. Configurar staging environment
6. Implementar blue/green deployments

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs do CloudWatch
2. Verifique os Security Groups
3. Verifique as configurações do Terraform
4. Consulte a documentação AWS

---

**Última atualização**: $(date)



