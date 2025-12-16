# ⚡ Testar Rápido SEM Fazer Build Completo

## 🚀 Opção 1: Usar Expo Go (MAIS RÁPIDO - 2 minutos)

### Passo a Passo

1. **Instale o Expo Go no celular:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   cd mobile
   npm start
   ```

3. **Escaneie o QR Code:**
   - Abra o Expo Go no celular
   - Escaneie o QR code que aparece no terminal
   - O app carrega em segundos!

4. **Configure a URL da API:**
   ```bash
   # Crie/edite o arquivo .env
   echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env
   ```

5. **Reinicie o servidor:**
   - Pressione `r` no terminal para recarregar

**✅ Pronto! Você pode testar as fotos imediatamente!**

---

## 🔧 Opção 2: Build Local (Mais Rápido que EAS - 5-10 min)

### Pré-requisitos

```bash
# Instalar EAS CLI globalmente (se ainda não tiver)
npm install -g eas-cli

# Fazer login
eas login
```

### Build Local Android

```bash
cd mobile

# Build local (usa sua máquina, não a nuvem)
eas build --platform android --profile production --local
```

**⚠️ Requer:**
- Android SDK instalado
- Java JDK
- Mais rápido, mas usa recursos do seu computador

---

## 📱 Opção 3: Development Build (Mais Rápido que Production)

```bash
cd mobile

# Build de desenvolvimento (mais rápido)
eas build --platform android --profile development
```

**Diferença:**
- Development: ~5-10 minutos
- Production: ~15-20 minutos

---

## ⚡ Opção 4: Usar Build Anterior (Se já tiver um)

Se você já tem um APK anterior:

1. **Instale o APK antigo**
2. **Teste as funcionalidades básicas**
3. **Faça o build de produção em background** enquanto testa

---

## 🎯 Recomendação: Use Expo Go AGORA

Para testar as fotos **AGORA MESMO**:

```bash
cd mobile

# 1. Configure a API
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env

# 2. Inicie o servidor
npm start

# 3. Escaneie o QR code com Expo Go
```

**Vantagens:**
- ✅ Instantâneo (segundos)
- ✅ Atualiza automaticamente quando você salva código
- ✅ Perfeito para testar funcionalidades
- ✅ Não precisa esperar build

**Desvantagens:**
- ⚠️ Algumas funcionalidades nativas podem não funcionar
- ⚠️ Não é o app final (mas para testar fotos funciona!)

---

## 🔄 Workflow Recomendado

1. **AGORA**: Use Expo Go para testar rapidamente
2. **Enquanto isso**: Inicie o build de produção em background
3. **Depois**: Use o APK de produção para testes finais

---

## 📋 Comandos Rápidos

```bash
# Testar com Expo Go (AGORA)
cd mobile
npm start

# Build de produção em background (enquanto testa)
cd mobile
eas build --platform android --profile production
```

---

**🚀 Use Expo Go para testar AGORA e faça o build de produção depois!**

