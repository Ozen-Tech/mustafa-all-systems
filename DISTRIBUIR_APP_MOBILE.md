# 📱 Como Distribuir o App Mobile para Promotores

## 🎯 Visão Geral

O app está configurado com **Expo** e **EAS Build**. Você tem 3 opções de distribuição:

1. **APK Android** (Mais fácil) - Distribuição direta
2. **Google Play Store** (Recomendado) - Loja oficial
3. **Apple App Store** (iOS) - Requer conta de desenvolvedor

---

## ⚙️ Passo 1: Configurar API URL de Produção

### 1.1 Atualizar Configuração da API

O app precisa apontar para o backend em produção:

1. **Crie arquivo `.env` na pasta `mobile/`**:
   ```bash
   cd mobile
   touch .env
   ```

2. **Adicione a URL do backend**:
   ```env
   EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api
   ```

3. **Atualize `app.json`** (opcional, para garantir):
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "https://promo-gestao-backend.onrender.com/api"
       }
     }
   }
   ```

---

## 📦 Passo 2: Instalar EAS CLI

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Fazer login na conta Expo
eas login

# (Criar conta em https://expo.dev se não tiver)
```

---

## 🤖 Opção 1: Build Android APK (Mais Rápido)

### 2.1 Gerar APK para Distribuição

```bash
cd mobile

# Build de produção (APK)
eas build --platform android --profile production
```

Isso vai:
- ✅ Gerar um APK instalável
- ✅ Fazer upload para Expo
- ✅ Fornecer link de download

### 2.2 Baixar e Distribuir APK

1. **Aguarde o build** (10-20 minutos)
2. **Acesse**: https://expo.dev/accounts/[seu-usuario]/builds
3. **Baixe o APK**
4. **Distribua**:
   - Envie por email
   - Upload no Google Drive
   - QR Code para download
   - Link direto

### 2.3 Instalar no Celular Android

**Opção A: Via Link**
1. Envie o link do build para os promotores
2. Eles abrem no celular
3. Baixam e instalam

**Opção B: Via QR Code**
1. Expo gera QR code automaticamente
2. Promotores escaneiam
3. Baixam direto

**Opção C: APK Manual**
1. Baixe o APK no computador
2. Envie por WhatsApp/Email
3. Promotores instalam manualmente
   - Android pode pedir "Permitir instalação de fontes desconhecidas"

---

## 🏪 Opção 2: Google Play Store (Recomendado)

### 3.1 Preparar para Play Store

1. **Criar conta Google Play Console**:
   - https://play.google.com/console
   - Custa $25 (taxa única)

2. **Atualizar `app.json`**:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.promogestao.mobile",
         "versionCode": 1,
         "permissions": [...]
       }
     }
   }
   ```

3. **Gerar AAB (Android App Bundle)**:
   ```bash
   # Atualizar eas.json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "app-bundle"  // Mudar de "apk" para "app-bundle"
         }
       }
     }
   }
   ```

4. **Fazer build**:
   ```bash
   eas build --platform android --profile production
   ```

### 3.2 Submeter para Play Store

```bash
# Submeter automaticamente
eas submit --platform android

# Ou fazer upload manual no Play Console
```

### 3.3 Configurar na Play Store

1. **Criar app** no Play Console
2. **Upload do AAB**
3. **Preencher informações**:
   - Nome: "Promo Gestão"
   - Descrição
   - Screenshots
   - Ícone
4. **Publicar** (pode levar algumas horas/dias para aprovação)

---

## 🍎 Opção 3: Apple App Store (iOS)

### 4.1 Requisitos

- Conta Apple Developer ($99/ano)
- Mac (para builds iOS)
- Certificados configurados

### 4.2 Build iOS

```bash
# Build para App Store
eas build --platform ios --profile production
```

### 4.3 Submeter

```bash
eas submit --platform ios
```

---

## 🚀 Método Rápido: Build Preview (Teste)

Para testar antes de distribuir:

```bash
# Build preview (mais rápido)
eas build --platform android --profile preview

# Ou development (para testar localmente)
eas build --platform android --profile development
```

---

## 📋 Checklist de Distribuição

### Antes do Build:
- [ ] API URL configurada para produção
- [ ] `app.json` atualizado com nome/versão corretos
- [ ] Ícone e splash screen configurados
- [ ] Permissões configuradas

### Build:
- [ ] EAS CLI instalado e logado
- [ ] Build executado com sucesso
- [ ] APK/AAB baixado

### Distribuição:
- [ ] Link de download compartilhado
- [ ] Instruções enviadas aos promotores
- [ ] Testado em pelo menos 1 dispositivo

---

## 🔧 Configurações Importantes

### Variáveis de Ambiente

Crie `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api
```

### Atualizar app.json

```json
{
  "expo": {
    "name": "Promo Gestão",
    "slug": "promo-gestao-mobile",
    "version": "1.0.0",
    "android": {
      "package": "com.promogestao.mobile",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

---

## 📱 Instruções para Promotores

### Android (APK):

1. **Receber o link** do APK
2. **Abrir no celular Android**
3. **Baixar o arquivo**
4. **Instalar**:
   - Pode pedir "Permitir instalação de fontes desconhecidas"
   - Aceitar e instalar
5. **Abrir o app**
6. **Fazer login** com credenciais fornecidas

### iOS (App Store):

1. **Abrir App Store**
2. **Buscar "Promo Gestão"**
3. **Instalar**
4. **Abrir e fazer login**

---

## 🆘 Troubleshooting

### Build falha
- Verifique se está logado: `eas whoami`
- Verifique se tem créditos no Expo (builds são gratuitos até certo limite)

### APK não instala
- Verifique se "Fontes desconhecidas" está habilitado
- Verifique se o Android é compatível (Android 5.0+)

### App não conecta ao backend
- Verifique `EXPO_PUBLIC_API_URL` no `.env`
- Verifique se o backend está online
- Verifique CORS no backend (deve permitir requisições mobile)

### Erro de permissões
- Verifique `app.json` tem as permissões corretas
- Promotores devem aceitar permissões quando solicitadas

---

## 🎯 Recomendação

**Para começar rápido:**
1. ✅ Use **APK Android** (Opção 1)
2. ✅ Distribua via link/QR code
3. ✅ Teste com alguns promotores
4. ✅ Depois migre para Play Store

**Para produção:**
1. ✅ Publique na **Google Play Store**
2. ✅ Mais profissional
3. ✅ Atualizações automáticas
4. ✅ Mais seguro

---

## 📚 Links Úteis

- **Expo Dashboard**: https://expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Google Play Console**: https://play.google.com/console
- **Apple Developer**: https://developer.apple.com

---

**🚀 Pronto para distribuir! Comece com APK e depois migre para as lojas!**

