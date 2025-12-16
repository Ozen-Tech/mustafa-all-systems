# 📱 Guia de Teste - Mobile

## Pré-requisitos

1. **Node.js** instalado
2. **Expo CLI** instalado globalmente:
   ```bash
   npm install -g expo-cli
   ```
3. **Expo Go** instalado no seu dispositivo:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Configuração Inicial

### 1. Instalar Dependências

```bash
cd mobile
npm install
```

### 2. Configurar URL da API

Crie o arquivo `.env` no diretório `mobile/`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com a URL correta da API:

**Para emulador Android:**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

**Para emulador iOS:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Para dispositivo físico:**
```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000/api
```

**Como descobrir seu IP local:**
- macOS/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`

Exemplo: `http://192.168.1.100:3000/api`

### 3. Criar Assets Básicos (Opcional)

O Expo precisa de alguns assets. Se não existirem, o Expo criará placeholders automaticamente.

## Iniciar o App

### Opção 1: Usando Expo Go (Recomendado para testes)

```bash
cd mobile
npm start
```

Isso abrirá o Expo Dev Tools no navegador. Você pode:
- Escanear o QR code com o Expo Go no seu celular
- Pressionar `i` para abrir no emulador iOS
- Pressionar `a` para abrir no emulador Android

### Opção 2: Build de Desenvolvimento

```bash
# iOS
npm run ios

# Android
npm run android
```

## Testar Login

1. Abra o app no seu dispositivo/emulador
2. Você verá a tela de login
3. Use as credenciais de teste:

**Promotor:**
- Email: `promotor1@teste.com`
- Senha: `senha123`

**OU**

- Email: `promotor2@teste.com`
- Senha: `senha123`

4. Após o login, você verá a tela inicial

## Estrutura do App Mobile

### Telas Implementadas:
- ✅ **LoginScreen** - Tela de login
- ✅ **HomeScreen** - Tela inicial (placeholder)
- ✅ **HistoryScreen** - Histórico de visitas (placeholder)
- ✅ **ProfileScreen** - Perfil do usuário
- ✅ **VisitScreen** - Tela de visita (placeholder)

### Funcionalidades Implementadas:
- ✅ Autenticação JWT
- ✅ Navegação entre telas
- ✅ Context de autenticação
- ✅ Armazenamento local de tokens

### Próximas Implementações:
- ⏳ Check-in com foto e GPS
- ⏳ Checkout com foto e GPS
- ⏳ Upload de fotos
- ⏳ Pesquisa de preços
- ⏳ Câmera integrada

## Troubleshooting

### Erro: "Network request failed"
- Verifique se o backend está rodando
- Confirme a URL no arquivo `.env`
- Para dispositivo físico, use o IP da sua máquina, não `localhost`

### Erro: "Cannot connect to Metro"
- Feche o Expo e reinicie: `npm start`
- Limpe o cache: `expo start -c`

### Erro: "Module not found"
- Reinstale as dependências: `rm -rf node_modules && npm install`

### App não carrega
- Verifique se o backend está acessível na URL configurada
- Teste a API no navegador: `http://SEU_IP:3000/health`

## Testar API do Backend

Antes de testar o mobile, certifique-se de que o backend está rodando:

```bash
cd backend
npm run dev
```

Teste a API:
```bash
curl http://localhost:3000/health
```

## Próximos Passos

Após testar o login, podemos implementar:
1. Tela de check-in com câmera
2. Captura de GPS
3. Upload de fotos
4. Formulário de pesquisa de preços
5. Tela de checkout

