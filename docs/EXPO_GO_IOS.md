# 📱 Guia de Instalação - Expo Go (iOS/Android)

Este guia explica como instalar e usar o aplicativo Promo Gestão através do Expo Go, uma forma gratuita e sem necessidade de publicação na App Store.

---

## 🚀 Passo a Passo

### 1. Instalar o Expo Go

#### iOS (iPhone/iPad)
1. Abra a **App Store** no seu dispositivo
2. Busque por **"Expo Go"**
3. Instale o aplicativo (gratuito)

#### Android
1. Abra a **Google Play Store**
2. Busque por **"Expo Go"**
3. Instale o aplicativo (gratuito)

---

### 2. Acessar o Aplicativo

Existem duas formas de acessar o aplicativo:

#### Opção A: Escaneando QR Code
1. Abra o Expo Go no seu dispositivo
2. Toque em "Scan QR Code"
3. Escaneie o QR Code fornecido pelo administrador

#### Opção B: Via Link Direto
1. O administrador enviará um link no formato:
   ```
   exp://u.expo.dev/update/[ID_DO_PROJETO]
   ```
2. Clique no link no seu dispositivo
3. O aplicativo abrirá automaticamente no Expo Go

---

## 📋 Requisitos

### iOS
- iPhone ou iPad com iOS 13.0 ou superior
- Conexão com internet (Wi-Fi ou dados móveis)

### Android
- Dispositivo Android com versão 6.0 ou superior
- Conexão com internet

---

## ⚙️ Permissões Necessárias

O aplicativo solicitará as seguintes permissões:

| Permissão | Motivo |
|-----------|--------|
| 📷 **Câmera** | Tirar fotos das fachadas e produtos |
| 📍 **Localização** | Verificar check-in/checkout e rastrear rotas |
| 📁 **Galeria** | Selecionar fotos da galeria |

> **Importante**: Todas as permissões são necessárias para o funcionamento correto do aplicativo.

---

## 🔧 Solução de Problemas

### O aplicativo não carrega
1. Verifique sua conexão com a internet
2. Feche e reabra o Expo Go
3. Limpe o cache do Expo Go (Configurações > Apps > Expo Go > Limpar Cache)

### Erro de permissão
1. Vá em Ajustes/Configurações do dispositivo
2. Encontre o Expo Go na lista de aplicativos
3. Habilite todas as permissões necessárias

### QR Code não funciona
1. Certifique-se de que está usando a versão mais recente do Expo Go
2. Tente usar o link direto em vez do QR Code
3. Entre em contato com o administrador para obter um novo código

---

## 📲 Para Desenvolvedores

### Publicar Atualização

```bash
# Fazer login no Expo
npx expo login

# Publicar atualização (desenvolvimento)
npx expo publish

# Publicar para produção com EAS
eas update --branch production --message "Nova versão com seleção de indústrias"
```

### Gerar QR Code

Após publicar, o QR Code estará disponível em:
- https://expo.dev/accounts/[SUA_CONTA]/projects/promo-gestao-mobile

### Compartilhar com Promotores

1. Acesse o painel do Expo Dev
2. Copie o link do projeto
3. Envie para os promotores via WhatsApp ou email

---

## 🔐 Segurança

- Os dados são transmitidos via HTTPS
- As credenciais são armazenadas de forma segura no dispositivo
- A localização só é rastreada durante visitas ativas
- As fotos são enviadas diretamente para servidores seguros

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Email: suporte@promogestao.com.br
- WhatsApp: (XX) XXXXX-XXXX

---

## ✅ Checklist para Promotores

- [ ] Instalei o Expo Go
- [ ] Escaneei o QR Code ou acessei o link
- [ ] Permiti acesso à câmera
- [ ] Permiti acesso à localização
- [ ] Fiz login com minhas credenciais
- [ ] Testei tirar uma foto

---

*Última atualização: Dezembro 2024*


