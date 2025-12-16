# 📱 Promo Gestão - Mobile App

App React Native para promotores fazerem check-in/checkout, tirar fotos e registrar pesquisas de preço.

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar URL da API

Crie o arquivo `.env`:

```bash
cp env-template.txt .env
```

**Para dispositivo físico**, edite `.env` com seu IP local:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.188:3000/api
```

**Para emulador:**
- Android: `http://10.0.2.2:3000/api`
- iOS: `http://localhost:3000/api`

### 3. Iniciar o App

#### Opção A: Expo Go (Desenvolvimento Rápido)

```bash
npm start
```

Escaneie o QR code com o Expo Go no seu celular.

**⚠️ Limitação:** O Expo Go não suporta módulos nativos como `expo-location`. Para usar localização, você precisa criar um development build (veja Opção B).

#### Opção B: Development Build (Recomendado para Produção)

Para usar funcionalidades nativas como localização, crie um development build:

```bash
# Fazer login no Expo (usa npx, não precisa instalar globalmente)
npx eas-cli login

# Criar development build para Android
npm run build:dev:android

# Ou para iOS
npm run build:dev:ios
```

**Nota:** Os scripts usam `npx eas-cli` automaticamente, então não é necessário instalar o EAS CLI globalmente.

Após o build, instale o app no dispositivo e use:

```bash
npm start --dev-client
```

## 📝 Credenciais de Teste

**Promotor:**
- Email: `promotor1@teste.com`
- Senha: `senha123`

## ⚠️ Importante

Certifique-se de que:
1. O backend está rodando (`cd backend && npm run dev`)
2. A URL no `.env` aponta para o IP correto do seu computador na rede local
3. Seu dispositivo e computador estão na mesma rede Wi-Fi
4. Para usar localização, é necessário um development build (não funciona no Expo Go)

## 🔧 Localização (expo-location)

O app usa um helper centralizado (`src/utils/locationHelper.ts`) para gerenciar a importação e uso do `expo-location`. Este helper:

- Tenta importar o módulo de forma robusta
- Fornece mensagens de erro claras
- Funciona tanto em development builds quanto no Expo Go (com limitações)

**No Expo Go:** O módulo retornará `undefined` e o app mostrará um alerta informando que é necessário um development build.

**Em Development Build:** O módulo funcionará normalmente e solicitará permissões de localização.

## 📚 Documentação

- `TESTE_MOBILE.md` - Guia completo de teste
- `QUICK_START_MOBILE.md` - Guia rápido
- `COMO_INICIAR_E_TESTAR.md` - Guia detalhado de início
- `SOLUCAO_PERMISSOES.md` - Solução de problemas de permissão

