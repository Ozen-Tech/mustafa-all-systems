# ⚡ Build Rápido do App Mobile - 5 Minutos

## 🎯 Objetivo
Gerar APK Android para distribuir aos promotores.

## 📋 Pré-requisitos

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login no Expo
eas login
# (Criar conta em https://expo.dev se necessário)
```

## ⚙️ Configurar API de Produção

```bash
cd mobile

# Criar arquivo .env
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env
```

## 🚀 Gerar APK

```bash
# Build de produção
eas build --platform android --profile production
```

**Aguarde 10-20 minutos** ⏱️

## 📥 Baixar e Distribuir

1. **Acesse**: https://expo.dev/accounts/[seu-usuario]/builds
2. **Baixe o APK**
3. **Distribua**:
   - Envie link por WhatsApp/Email
   - Ou gere QR code para download

## 📱 Instalar no Celular

1. Abrir link no Android
2. Baixar APK
3. Permitir "Fontes desconhecidas" (se pedir)
4. Instalar
5. Abrir app e fazer login

## ✅ Pronto!

Os promotores podem usar o app! 🎉

---

**📖 Guia completo**: Veja `DISTRIBUIR_APP_MOBILE.md`

