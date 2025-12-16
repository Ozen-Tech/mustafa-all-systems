# Infraestrutura AWS - Promo Gestão

Este diretório contém toda a infraestrutura como código (IaC) usando Terraform para implantar o sistema Promo Gestão na AWS.

## 📋 Pré-requisitos

1. **Terraform** >= 1.5 instalado
   ```bash
   terraform version
   ```

2. **AWS CLI** configurado com credenciais
   ```bash
   aws configure
   aws sts get-caller-identity
   ```

3. **Domínio configurado no Route 53**
   - O domínio `ozentech` deve estar configurado no Route 53
   - O subdomínio `mustafa.ozentech` será criado automaticamente

4. **Bucket S3 para Terraform State** (opcional, mas recomendado)
   - Criar manualmente: `promo-gestao-terraform-state` na região `sa-east-1`
   - Habilitar versionamento
   - Configurar no `main.tf` (backend S3)

## 🏗️ Arquitetura

A infraestrutura inclui:

- **VPC** com subnets públicas e privadas em 3 AZs
- **RDS PostgreSQL** em subnets privadas
- **ECS Fargate** para execução do backend
- **Application Load Balancer** para roteamento
- **S3** para fotos e assets web
- **CloudFront** para CDN do frontend web
- **Route 53** para DNS
- **ACM** para certificados SSL
- **Secrets Manager** para credenciais sensíveis
- **CloudWatch** para logs e monitoramento

## 🚀 Deploy

### 1. Configurar Variáveis

Copie o arquivo de exemplo e edite com seus valores:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edite `terraform.tfvars` com:
- Senha do banco de dados (forte)
- Configurações de instância RDS
- Configurações de ECS

### 2. Inicializar Terraform

```bash
cd infra/terraform
terraform init
```

### 3. Validar Configuração

```bash
terraform validate
terraform plan
```

### 4. Aplicar Infraestrutura

**Opção A: Usando o script**
```bash
cd infra/scripts
./deploy.sh
```

**Opção B: Manualmente**
```bash
cd infra/terraform
terraform plan -out=tfplan
terraform apply tfplan
```

### 5. Configurar Secrets

Após o deploy, configure os secrets no AWS Secrets Manager:

1. **JWT Secrets** (`promo-gestao-jwt-secret-prod`):
   ```json
   {
     "jwt_secret": "GERE_UMA_STRING_ALEATORIA_AQUI",
     "jwt_refresh_secret": "GERE_OUTRA_STRING_ALEATORIA_AQUI"
   }
   ```

2. **Database Credentials** já são configurados automaticamente, mas você pode atualizar se necessário.

### 6. Build e Push da Imagem Docker

```bash
cd backend

# Login no ECR
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com

# Build
docker build -t promo-gestao-backend .

# Tag
docker tag promo-gestao-backend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com/promo-gestao-backend:latest

# Push
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com/promo-gestao-backend:latest
```

### 7. Deploy do Frontend Web

```bash
cd web

# Configurar variável de ambiente
export VITE_API_URL=https://api.mustafa.ozentech/api

# Build
npm run build

# Deploy para S3
aws s3 sync dist/ s3://promo-gestao-web-prod/ --delete

# Invalidar CloudFront
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

## 🔧 Configuração de CI/CD

### GitHub Actions

Configure os seguintes secrets no GitHub:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID` (obtido após deploy do Terraform)
- `VITE_API_URL` (para builds do frontend)

Os workflows estão em `.github/workflows/`:
- `deploy-backend.yml` - Deploy automático do backend
- `deploy-web.yml` - Deploy automático do frontend

## 📊 Outputs Importantes

Após o deploy, execute `terraform output` para obter:

- `web_url` - URL do frontend web
- `api_url` - URL da API backend
- `ecr_repository_url` - URL do repositório ECR
- `rds_endpoint` - Endpoint do banco de dados
- `cloudfront_distribution_id` - ID da distribuição CloudFront

## 🔍 Verificação

### Health Check da API

```bash
curl https://api.mustafa.ozentech/health
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
  --region sa-east-1
```

## 🗑️ Destruir Infraestrutura

⚠️ **CUIDADO**: Isso irá deletar todos os recursos!

```bash
cd infra/terraform
terraform destroy
```

## 📝 Notas Importantes

1. **Custos**: A infraestrutura inclui recursos que geram custos:
   - RDS (db.t4g.small)
   - NAT Gateways (3x)
   - ECS Fargate tasks
   - ALB
   - CloudFront
   - S3 storage

2. **Backups**: O RDS está configurado com backup automático de 7 dias.

3. **SSL**: Os certificados ACM podem levar alguns minutos para serem validados via DNS.

4. **Auto Scaling**: O ECS está configurado com auto-scaling baseado em CPU (70%) e memória (80%).

5. **Região**: Toda a infraestrutura está na região `sa-east-1` (São Paulo), exceto o certificado CloudFront que deve estar em `us-east-1`.

## 🆘 Troubleshooting

### Erro: "Certificate validation failed"
- Verifique se os registros DNS foram criados no Route 53
- Aguarde alguns minutos para propagação

### Erro: "Task failed to start"
- Verifique os logs do CloudWatch
- Verifique se os secrets estão configurados corretamente
- Verifique se a imagem Docker foi enviada para o ECR

### Erro: "Cannot connect to database"
- Verifique o Security Group do RDS
- Verifique se o ECS está nas subnets privadas corretas
- Verifique as credenciais no Secrets Manager

## 📚 Recursos Adicionais

- [Documentação Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)



