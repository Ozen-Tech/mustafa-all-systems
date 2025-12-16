# 🚀 Quick Start - Mobile

## Passo 1: Instalar Dependências

```bash
cd mobile
npm install
```

## Passo 2: Configurar URL da API

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

**Para dispositivo físico**, edite `.env` com seu IP local:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000/api
```

**Descobrir seu IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Passo 3: Iniciar o App

```bash
npm start
```

Escaneie o QR code com o Expo Go no seu celular.

## Passo 4: Testar Login

**Credenciais:**
- Email: `promotor1@teste.com`
- Senha: `senha123`

## ⚠️ Importante

Certifique-se de que o backend está rodando:

```bash
cd backend
npm run dev
```

E que a URL no `.env` do mobile aponta para o IP correto do seu computador na rede local.

