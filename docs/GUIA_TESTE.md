# 🧪 Guia de Teste - Promo Gestão

Este guia explica como testar todas as funcionalidades implementadas.

## 📋 Pré-requisitos

1. **PostgreSQL** rodando e banco de dados criado
2. **Node.js** instalado (v18 ou superior)
3. **Variáveis de ambiente** configuradas (`.env` no backend)
4. **AWS S3** configurado (ou use um bucket de teste)

## 🚀 Passo 1: Configurar e Iniciar o Backend

### 1.1. Instalar dependências
```bash
cd backend
npm install
```

### 1.2. Configurar banco de dados
```bash
# Verificar se o banco existe
psql -U seu_usuario -l | grep promo_gestao

# Se não existir, criar:
createdb promo_gestao

# Executar migrações
npm run prisma:migrate

# Popular com dados de teste
npm run seed
```

### 1.3. Verificar variáveis de ambiente
Certifique-se de que o arquivo `backend/.env` existe e contém:
```env
PORT=3000
DATABASE_URL="postgresql://seu_usuario@localhost:5432/promo_gestao?schema=public"
JWT_SECRET="seu_jwt_secret_aqui"
JWT_REFRESH_SECRET="seu_refresh_secret_aqui"
AWS_ACCESS_KEY_ID="sua_chave"
AWS_SECRET_ACCESS_KEY="sua_secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="seu_bucket"
CORS_ORIGIN="http://localhost:5173"
```

### 1.4. Iniciar o servidor
```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:3000`

### 1.5. Testar endpoints básicos
```bash
# Health check
curl http://localhost:3000/health

# Login (use as credenciais do seed)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@teste.com","password":"senha123"}'
```

**Usuários de teste criados pelo seed:**
- Supervisor: `supervisor@teste.com` / `senha123`
- Promotor 1: `promotor1@teste.com` / `senha123`
- Promotor 2: `promotor2@teste.com` / `senha123`

## 🌐 Passo 2: Testar a Interface Web

### 2.1. Instalar dependências
```bash
cd web
npm install
```

### 2.2. Configurar variáveis de ambiente
Crie `web/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 2.3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

A aplicação deve abrir em `http://localhost:5173`

### 2.4. Testar fluxo web

1. **Login**
   - Acesse `http://localhost:5173`
   - Faça login com: `supervisor@teste.com` / `senha123`

2. **Dashboard**
   - Verifique os cards de estatísticas
   - Verifique o gráfico de visitas por promotor
   - Verifique a lista de promotores

3. **Detalhes do Promotor**
   - Clique em "Ver Detalhes" em um promotor
   - Verifique estatísticas, gráfico e histórico de visitas
   - Clique em "Ver Rota" para ver o mapa

4. **Rota no Mapa**
   - Verifique os marcadores de check-in/checkout
   - Verifique a linha conectando os pontos
   - Teste o filtro de data

5. **Relatórios**
   - Acesse a página de Relatórios
   - Selecione um período
   - Escolha o formato (PowerPoint)
   - Clique em "Exportar Relatório"
   - Aguarde o processamento (polling automático)
   - Baixe o relatório quando estiver pronto

6. **Configurações**
   - Acesse Configurações
   - Configure quota de fotos para um promotor

## 📱 Passo 3: Testar o App Mobile

### 3.1. Instalar dependências
```bash
cd mobile
npm install
```

### 3.2. Configurar variáveis de ambiente
Crie `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Nota:** Se estiver testando em dispositivo físico, use o IP da sua máquina:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000/api
```

### 3.3. Iniciar o Expo
```bash
npx expo start
```

Escaneie o QR code com o app Expo Go (iOS) ou Expo Go (Android).

### 3.4. Testar fluxo mobile

1. **Login**
   - Faça login com: `promotor1@teste.com` / `senha123`

2. **Home**
   - Verifique se aparece "Iniciar Nova Visita" ou "Continuar Visita"

3. **Lista de Indústrias**
   - Clique em "Iniciar Nova Visita"
   - Veja a lista de indústrias (dados mockados por enquanto)
   - Selecione uma indústria

4. **Check-in**
   - Permita acesso à câmera e localização
   - Tire uma foto da fachada (simulado)
   - Clique em "Fazer Check-in"

5. **Visita Ativa**
   - Adicione fotos (galeria ou câmera)
   - Envie as fotos
   - Acesse "Pesquisa de Preços"
   - Preencha o formulário de pesquisa
   - Adicione concorrentes
   - Registre a pesquisa

6. **Checkout**
   - Volte para a visita ativa
   - Clique em "Fazer Checkout"
   - Tire foto da fachada
   - Finalize o checkout

7. **Histórico**
   - Acesse a aba "Histórico"
   - Verifique as visitas anteriores

## 🔄 Passo 4: Testar Fluxo Completo

### 4.1. Criar uma visita completa

1. **No Mobile (Promotor):**
   - Faça login
   - Inicie uma nova visita
   - Faça check-in com foto
   - Adicione fotos durante a visita
   - Faça pesquisa de preços
   - Faça checkout

2. **No Web (Supervisor):**
   - Faça login
   - Verifique o dashboard (deve mostrar a nova visita)
   - Acesse os detalhes do promotor
   - Verifique as fotos e dados da visita
   - Visualize a rota no mapa
   - Gere um relatório em PowerPoint

## 🧪 Testes de API (Postman/Insomnia)

### Endpoints de Autenticação

```bash
# Login
POST http://localhost:3000/api/auth/login
Body: {
  "email": "promotor1@teste.com",
  "password": "senha123"
}

# Refresh Token
POST http://localhost:3000/api/auth/refresh
Body: {
  "refreshToken": "token_aqui"
}
```

### Endpoints de Promotor (requer token)

```bash
# Check-in
POST http://localhost:3000/api/promoters/checkin
Headers: Authorization: Bearer {token}
Body: {
  "industryId": "id_da_industria",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "photoUrl": "https://exemplo.com/foto.jpg"
}

# Checkout
POST http://localhost:3000/api/promoters/checkout
Headers: Authorization: Bearer {token}
Body: {
  "visitId": "id_da_visita",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "photoUrl": "https://exemplo.com/foto.jpg"
}

# Upload de fotos
POST http://localhost:3000/api/promoters/photos
Headers: Authorization: Bearer {token}
Body: {
  "visitId": "id_da_visita",
  "photos": [
    {
      "url": "https://exemplo.com/foto1.jpg",
      "type": "OTHER",
      "latitude": -23.5505,
      "longitude": -46.6333
    }
  ]
}

# Pesquisa de preços
POST http://localhost:3000/api/promoters/price-research
Headers: Authorization: Bearer {token}
Body: {
  "visitId": "id_da_visita",
  "industryId": "id_da_industria",
  "productName": "Produto XYZ",
  "price": 99.90,
  "competitorPrices": [
    {
      "competitorName": "Concorrente A",
      "price": 95.00
    }
  ]
}

# Visita atual
GET http://localhost:3000/api/promoters/current-visit
Headers: Authorization: Bearer {token}
```

### Endpoints de Supervisor (requer token de supervisor)

```bash
# Dashboard
GET http://localhost:3000/api/supervisors/dashboard
Headers: Authorization: Bearer {token}

# Lista de promotores
GET http://localhost:3000/api/supervisors/promoters
Headers: Authorization: Bearer {token}

# Desempenho do promotor
GET http://localhost:3000/api/supervisors/promoters/{id}/performance?startDate=2024-01-01&endDate=2024-01-31
Headers: Authorization: Bearer {token}

# Visitas do promotor
GET http://localhost:3000/api/supervisors/promoters/{id}/visits?page=1&limit=20
Headers: Authorization: Bearer {token}

# Rota do promotor
GET http://localhost:3000/api/supervisors/promoters/{id}/route?date=2024-01-15
Headers: Authorization: Bearer {token}

# Fotos faltantes
GET http://localhost:3000/api/supervisors/missing-photos?startDate=2024-01-01&endDate=2024-01-31
Headers: Authorization: Bearer {token}

# Configurar quota
PUT http://localhost:3000/api/supervisors/promoters/{id}/photo-quota
Headers: Authorization: Bearer {token}
Body: {
  "expectedPhotos": 10
}

# Exportar relatório
POST http://localhost:3000/api/supervisors/export/report
Headers: Authorization: Bearer {token}
Body: {
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "pptx"
}

# Status do export
GET http://localhost:3000/api/supervisors/export/status/{jobId}
Headers: Authorization: Bearer {token}

# Download do export
GET http://localhost:3000/api/supervisors/export/download/{jobId}
Headers: Authorization: Bearer {token}
```

## 🐛 Troubleshooting

### Backend não inicia
- Verifique se o PostgreSQL está rodando
- Verifique se o banco de dados existe
- Verifique as variáveis de ambiente
- Verifique se a porta 3000 está livre

### Web não conecta ao backend
- Verifique se o backend está rodando
- Verifique a variável `VITE_API_URL` no `.env`
- Verifique o CORS no backend

### Mobile não conecta ao backend
- Se estiver usando emulador Android: use `http://10.0.2.2:3000/api`
- Se estiver usando dispositivo físico: use o IP da sua máquina
- Verifique se o dispositivo e o computador estão na mesma rede
- Verifique o firewall

### Erro de autenticação
- Verifique se o token está sendo enviado corretamente
- Verifique se o token não expirou
- Tente fazer login novamente

### Erro ao gerar relatório
- Verifique se há visitas com fotos no período selecionado
- Verifique se as URLs das fotos no S3 estão acessíveis
- Verifique os logs do backend

## ✅ Checklist de Teste

- [ ] Backend inicia sem erros
- [ ] Login funciona (supervisor e promotor)
- [ ] Dashboard web carrega estatísticas
- [ ] Lista de promotores aparece
- [ ] Detalhes do promotor funcionam
- [ ] Mapa de rotas carrega
- [ ] Exportação de relatório funciona
- [ ] Mobile faz login
- [ ] Check-in funciona
- [ ] Upload de fotos funciona
- [ ] Pesquisa de preços funciona
- [ ] Checkout funciona
- [ ] Histórico aparece no mobile
- [ ] Dados aparecem no web após ações no mobile

## 📝 Notas Importantes

1. **Dados Mockados no Mobile:**
   - A lista de indústrias está usando dados mockados
   - Implemente o endpoint `/api/promoters/industries` no backend para dados reais

2. **Upload de Fotos:**
   - O upload real para S3 ainda precisa ser implementado
   - Por enquanto, as URLs são simuladas

3. **Câmera:**
   - A captura de foto real precisa ser implementada
   - Por enquanto, é apenas simulado

4. **Relatórios:**
   - PowerPoint está implementado
   - PDF, Excel e HTML são placeholders

Bom teste! 🚀

