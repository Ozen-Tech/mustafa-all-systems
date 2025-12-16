# ⚡ Build iOS Rápido - TestFlight

## 🎯 Objetivo
Distribuir app iOS via TestFlight (sem App Store).

## 📋 Pré-requisitos

1. **Conta Apple Developer** ($99/ano)
   - Criar em: https://developer.apple.com
   - Aguardar aprovação (1-2 dias)

2. **EAS CLI instalado e logado**
   ```bash
   npm install -g eas-cli
   eas login
   ```

## ⚙️ Configurar

### 1. Configurar Credenciais iOS

```bash
cd mobile
eas credentials
# Selecione: iOS > Production > Set up credentials
# O EAS configura automaticamente
```

### 2. Configurar API de Produção

```bash
# Criar .env
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env

# Ou configurar no EAS
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://promo-gestao-backend.onrender.com/api
```

## 🚀 Build e Submissão

```bash
# 1. Build para TestFlight
eas build --platform ios --profile preview

# 2. Aguardar build (15-30 minutos)

# 3. Submeter para TestFlight
eas submit --platform ios
```

## 📱 Configurar TestFlight

1. **Acesse**: https://appstoreconnect.apple.com
2. **Vá em**: "My Apps" > Seu App > "TestFlight"
3. **Adicione testadores**:
   - Internal: até 100 pessoas
   - External: até 10.000 pessoas
4. **Envie convites** por email

## ✅ Pronto!

Promotores recebem email, instalam TestFlight e baixam seu app!

---

**📖 Guia completo**: Veja `DISTRIBUIR_IOS_SEM_APPSTORE.md`

