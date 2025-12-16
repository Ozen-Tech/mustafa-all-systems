# 📱 Teste Mobile - Guia Completo

## ✅ Status da Configuração

### O que foi implementado:
- ✅ Estrutura do app React Native com Expo
- ✅ Tela de login funcional
- ✅ Autenticação JWT integrada
- ✅ Navegação entre telas
- ✅ Configuração de API
- ✅ Loading screen
- ✅ Context de autenticação

## 🚀 Como Testar

### Passo 1: Instalar Dependências

```bash
cd mobile
npm install
```

### Passo 2: Configurar URL da API

Crie o arquivo `.env` no diretório `mobile/`:

```bash
cp .env.example .env
```

**Edite o arquivo `.env` com seu IP local:**

Seu IP local detectado: `192.168.1.188`

```env
EXPO_PUBLIC_API_URL=http://192.168.1.188:3000/api
```

**Para emulador:**
- Android: `http://10.0.2.2:3000/api`
- iOS: `http://localhost:3000/api`

### Passo 3: Instalar Expo Go

No seu celular, instale o Expo Go:
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Passo 4: Iniciar o Backend

**IMPORTANTE:** O backend precisa estar rodando!

```bash
cd backend
npm run dev
```

Você deve ver: `Server running on port 3000`

### Passo 5: Iniciar o App Mobile

```bash
cd mobile
npm start
```

Isso abrirá o Expo Dev Tools no navegador. Você verá um QR code.

### Passo 6: Conectar o Dispositivo

1. Abra o Expo Go no seu celular
2. Escaneie o QR code exibido no terminal/navegador
3. O app será carregado no seu dispositivo

### Passo 7: Testar Login

1. Você verá a tela de login
2. Use as credenciais de teste:

**Promotor:**
- Email: `promotor1@teste.com`
- Senha: `senha123`

3. Após o login, você verá a tela inicial

## 📝 Credenciais de Teste

| Email | Senha | Role |
|-------|-------|------|
| promotor1@teste.com | senha123 | PROMOTER |
| promotor2@teste.com | senha123 | PROMOTER |

## 🔍 Verificar se Está Funcionando

### Teste 1: Backend está acessível?

No navegador do seu celular (mesma rede Wi-Fi), acesse:
```
http://192.168.1.188:3000/health
```

Você deve ver: `{"status":"ok","timestamp":"..."}`

### Teste 2: API responde?

No navegador:
```
http://192.168.1.188:3000/api/auth/login
```

Deve retornar um erro (esperado, pois precisa de POST), mas confirma que a API está acessível.

## ⚠️ Troubleshooting

### Erro: "Network request failed"
- ✅ Verifique se o backend está rodando
- ✅ Confirme que o IP no `.env` está correto
- ✅ Certifique-se de que o celular e computador estão na mesma rede Wi-Fi
- ✅ Teste a API no navegador do celular: `http://SEU_IP:3000/health`

### Erro: "Cannot connect to Metro"
- Feche o Expo e reinicie: `npm start`
- Limpe o cache: `expo start -c`

### App não carrega
- Verifique se o backend está acessível na URL configurada
- Teste a API no navegador do celular

### QR code não funciona
- Certifique-se de que o celular e computador estão na mesma rede Wi-Fi
- Tente digitar manualmente a URL no Expo Go

## 📱 Estrutura do App

### Telas Implementadas:
- ✅ **LoginScreen** - Tela de login funcional
- ✅ **HomeScreen** - Tela inicial (placeholder)
- ✅ **HistoryScreen** - Histórico (placeholder)
- ✅ **ProfileScreen** - Perfil do usuário
- ✅ **VisitScreen** - Tela de visita (placeholder)

### Funcionalidades:
- ✅ Login com autenticação JWT
- ✅ Armazenamento de tokens
- ✅ Navegação entre telas
- ✅ Loading states

### Próximas Implementações:
- ⏳ Check-in com foto e GPS
- ⏳ Checkout com foto e GPS
- ⏳ Upload de fotos
- ⏳ Pesquisa de preços
- ⏳ Câmera integrada

## 🎯 Próximos Passos

Após testar o login, podemos implementar:
1. Tela de check-in com câmera
2. Captura de GPS
3. Upload de fotos para S3
4. Formulário de pesquisa de preços
5. Tela de checkout

