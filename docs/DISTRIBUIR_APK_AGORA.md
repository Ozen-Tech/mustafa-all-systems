# 📱 Seu APK Está Pronto! Como Distribuir

## ✅ Status do Build

- **Status**: ✅ Finished (Concluído)
- **Plataforma**: Android
- **Versão**: 1.0.0
- **Link de Download**: https://expo.dev/artifacts/eas/iyMnUjGwxTpiMQv44MjqWi.apk

---

## 🚀 Distribuir para Promotores

### Opção 1: Link Direto (Mais Fácil)

1. **Copie o link do APK**:
   ```
   https://expo.dev/artifacts/eas/iyMnUjGwxTpiMQv44MjqWi.apk
   ```

2. **Envie para os promotores**:
   - WhatsApp
   - Email
   - Mensagem de texto
   - Qualquer meio de comunicação

3. **Instruções para promotores**:
   - Abrir o link no celular Android
   - Baixar o arquivo
   - Permitir "Fontes desconhecidas" (se pedir)
   - Instalar
   - Abrir o app

### Opção 2: QR Code

1. **Gere um QR Code** com o link:
   - Use: https://www.qr-code-generator.com
   - Cole o link do APK
   - Gere o QR Code
   - Imprima ou envie por imagem

2. **Promotores escaneiam**:
   - Abrem a câmera do celular
   - Escaneiam o QR Code
   - Baixam e instalam

### Opção 3: Google Drive / Dropbox

1. **Baixe o APK** no seu computador
2. **Faça upload** no Google Drive ou Dropbox
3. **Compartilhe o link** público
4. **Envie para os promotores**

---

## 📋 Instruções para Promotores

Envie estas instruções junto com o link:

### Como Instalar:

1. **Abra o link no seu celular Android**
2. **Toque em "Download"** ou "Baixar"
3. **Aguarde o download terminar**
4. **Toque no arquivo baixado** (geralmente aparece notificação)
5. **Se aparecer aviso de segurança**:
   - Toque em "Mais detalhes" ou "Configurações"
   - Ative "Permitir desta fonte"
   - Volte e toque em "Instalar"
6. **Aguarde a instalação**
7. **Toque em "Abrir"** ou procure "Promo Gestão" nos apps

### Primeiro Uso:

1. **Abra o app "Promo Gestão"**
2. **Digite seu email e senha** (fornecidos pelo supervisor)
3. **Toque em "Entrar"**
4. **Permita as permissões**:
   - ✅ Câmera (para tirar fotos)
   - ✅ Localização (para check-in/check-out)

---

## ⚠️ Importante: Configurar API de Produção

**ANTES de distribuir**, certifique-se de que o app está configurado para usar a API de produção:

### Verificar Configuração:

1. **Verifique se o `.env` existe** na pasta `mobile/`:
   ```bash
   cd mobile
   cat .env
   ```

2. **Deve conter**:
   ```
   EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api
   ```

3. **Se não existir ou estiver errado**, crie/atualize:
   ```bash
   echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env
   ```

4. **Faça um novo build** se necessário:
   ```bash
   eas build --platform android --profile production
   ```

---

## 🔍 Verificar se Está Funcionando

### Teste Local Primeiro:

1. **Baixe o APK** no seu celular Android
2. **Instale** (permita fontes desconhecidas)
3. **Abra o app**
4. **Tente fazer login**:
   - Email: `promotor1@teste.com`
   - Senha: `senha123`
5. **Verifique se carrega as lojas**

Se funcionar, está pronto para distribuir! ✅

---

## 📱 Próximo Build (Produção)

Para um build de **produção** (não development), execute:

```bash
cd mobile

# Configurar API de produção
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env

# Build de produção
eas build --platform android --profile production
```

**Diferença**:
- **Development**: Para testar, tem mais logs
- **Production**: Otimizado, menor tamanho, sem logs de debug

---

## 🎯 Checklist de Distribuição

- [ ] APK baixado e testado localmente
- [ ] API URL configurada para produção
- [ ] Link compartilhado com promotores
- [ ] Instruções de instalação enviadas
- [ ] Testado em pelo menos 1 dispositivo real

---

## 📞 Suporte para Promotores

Se os promotores tiverem problemas:

1. **App não instala**:
   - Ativar "Fontes desconhecidas" nas configurações
   - Verificar se o Android é compatível (5.0+)

2. **Não consegue fazer login**:
   - Verificar email e senha
   - Verificar conexão com internet
   - Verificar se o backend está online

3. **App não carrega lojas**:
   - Verificar conexão com internet
   - Verificar se tem rotas atribuídas
   - Fechar e abrir o app novamente

---

## ✅ Pronto para Distribuir!

**Link do APK**: https://expo.dev/artifacts/eas/iyMnUjGwxTpiMQv44MjqWi.apk

**Envie este link para os promotores junto com as instruções acima!** 🚀

---

**💡 Dica**: Para builds futuros, use o perfil `production` para um app otimizado!

