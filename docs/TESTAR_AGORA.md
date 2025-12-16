# ⚡ TESTAR AGORA - Sem Esperar Build

## 🚀 Solução Mais Rápida: Expo Go (2 minutos)

### Passo a Passo Rápido

1. **Instale Expo Go no celular:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Execute estes comandos:**

```bash
cd mobile

# Verificar se .env está configurado
cat .env

# Se não estiver, configure:
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env

# Iniciar servidor
npm start
```

3. **Escaneie o QR Code:**
   - Abra o Expo Go no celular
   - Escaneie o QR code do terminal
   - **Pronto! App carrega em segundos!**

---

## ✅ Vantagens do Expo Go

- ⚡ **Instantâneo** - carrega em segundos
- 🔄 **Hot Reload** - atualiza automaticamente quando você salva código
- 📸 **Fotos funcionam** - todas as funcionalidades de foto estão disponíveis
- 🧪 **Perfeito para testes** - testa tudo sem esperar build

---

## 🎯 Testar Upload de Fotos

1. Abra o app no Expo Go
2. Faça login
3. Faça check-in em uma loja
4. Adicione fotos adicionais
5. Envie as fotos
6. Verifique no dashboard web se apareceram

**Tudo funciona igual ao build de produção!**

---

## 🔄 Enquanto Testa, Faça Build em Background

Em outro terminal:

```bash
cd mobile
eas build --platform android --profile production
```

Assim você testa AGORA e tem o APK pronto depois!

---

## 📱 Quando Usar Cada Opção

| Opção | Tempo | Quando Usar |
|-------|-------|-------------|
| **Expo Go** | 2 min | ✅ Testar funcionalidades AGORA |
| **Development Build** | 5-10 min | Testar com mais recursos nativos |
| **Production Build** | 15-20 min | Distribuir para promotores |

---

**🚀 Use Expo Go para testar AGORA e faça o build depois!**

