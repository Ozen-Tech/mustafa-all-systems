#!/bin/bash

# Script para build rápido do Android APK

echo "🚀 Iniciando build do app Android..."
echo ""

# Verificar se está na pasta mobile
if [ ! -f "app.json" ]; then
    echo "❌ Erro: Execute este script na pasta mobile/"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Criando .env com URL de produção..."
    echo "EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api" > .env
    echo "✅ .env criado!"
fi

# Verificar se EAS CLI está instalado
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI não encontrado!"
    echo "📦 Instalando EAS CLI..."
    npm install -g eas-cli
fi

# Verificar login
echo "🔐 Verificando login no Expo..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Não está logado no Expo!"
    echo "🔑 Faça login:"
    eas login
fi

echo ""
echo "📦 Iniciando build..."
echo "⏱️  Isso pode levar 10-20 minutos..."
echo ""

# Build de produção
eas build --platform android --profile production

echo ""
echo "✅ Build iniciado!"
echo "📱 Acompanhe o progresso em: https://expo.dev"
echo "🔗 Quando terminar, você receberá um link para download"

