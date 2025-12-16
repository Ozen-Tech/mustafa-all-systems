# 📱 Distribuir App iOS sem App Store

## 🎯 Opções Disponíveis

Para distribuir apps iOS sem usar a App Store, você tem 3 opções principais:

### 1. **TestFlight** (Recomendado) ⭐
- ✅ Mais fácil de configurar
- ✅ Até 10.000 testadores
- ✅ Atualizações automáticas
- ⚠️ Requer conta Apple Developer ($99/ano)
- ⚠️ Apps expiram após 90 dias (mas podem ser renovados)

### 2. **Ad Hoc Distribution**
- ✅ Não precisa da App Store
- ✅ Instalação direta no iPhone
- ⚠️ Limitado a 100 dispositivos
- ⚠️ Requer conta Apple Developer ($99/ano)
- ⚠️ Precisa registrar UDID de cada iPhone

### 3. **Enterprise Distribution**
- ✅ Sem limite de dispositivos
- ✅ Instalação direta
- ⚠️ Requer conta Enterprise ($299/ano)
- ⚠️ Apenas para empresas

---

## 🚀 Opção 1: TestFlight (Mais Fácil)

### Pré-requisitos

1. **Conta Apple Developer** ($99/ano)
   - Criar em: https://developer.apple.com
   - Pode levar 1-2 dias para aprovação

2. **Configurar no EAS**

### Passo a Passo

#### 1. Configurar Certificados iOS

```bash
cd mobile

# Configurar credenciais iOS
eas credentials
# Selecione: iOS > Production > Set up credentials
# O EAS vai configurar automaticamente
```

#### 2. Atualizar eas.json

```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

#### 3. Fazer Build para TestFlight

```bash
# Build para TestFlight (internal distribution)
eas build --platform ios --profile preview

# Ou build de produção
eas build --platform ios --profile production
```

#### 4. Submeter para TestFlight

```bash
# Submeter automaticamente
eas submit --platform ios

# Ou fazer upload manual no App Store Connect
```

#### 5. Configurar TestFlight

1. **Acesse**: https://appstoreconnect.apple.com
2. **Vá em**: "My Apps" > Seu App > "TestFlight"
3. **Adicione testadores**:
   - Internal Testing: até 100 pessoas da sua equipe
   - External Testing: até 10.000 pessoas (requer revisão da Apple)
4. **Envie convites** por email

#### 6. Instalar no iPhone

1. **Promotores recebem email** de convite
2. **Instalam o app TestFlight** da App Store (gratuito)
3. **Aceitam o convite** no TestFlight
4. **Baixam seu app** pelo TestFlight

---

## 📲 Opção 2: Ad Hoc Distribution

### Quando Usar

- Você tem menos de 100 iPhones
- Não quer usar TestFlight
- Quer instalação direta sem app intermediário

### Passo a Passo

#### 1. Obter UDID dos iPhones

**No iPhone:**
1. Vá em **Configurações** > **Geral** > **Sobre**
2. Role até **Identificador** (UDID)
3. Toque e segure para copiar
4. Envie para você

**Ou use um site:**
- https://udid.tech (mais fácil)
- Promotores acessam no iPhone
- Mostra o UDID automaticamente

#### 2. Registrar UDIDs no Apple Developer

1. Acesse: https://developer.apple.com/account/resources/devices/list
2. Clique em **"+"** para adicionar dispositivo
3. Cole o UDID
4. Dê um nome (ex: "iPhone do João")
5. Repita para todos os iPhones

#### 3. Criar Perfil de Provisionamento Ad Hoc

```bash
# O EAS pode fazer isso automaticamente
eas credentials
# Selecione: iOS > Ad Hoc > Set up
```

#### 4. Fazer Build Ad Hoc

Atualize `eas.json`:
```json
{
  "build": {
    "ad-hoc": {
      "distribution": "internal",
      "ios": {
        "buildType": "archive",
        "simulator": false
      }
    }
  }
}
```

```bash
# Build Ad Hoc
eas build --platform ios --profile ad-hoc
```

#### 5. Instalar no iPhone

**Método 1: Via Link**
1. Baixe o arquivo `.ipa` do build
2. Envie para os promotores
3. Eles abrem no iPhone
4. Instalam (pode precisar confiar no certificado)

**Método 2: Via iTunes/Finder**
1. Conecte iPhone ao Mac
2. Abra Finder (ou iTunes)
3. Arraste o `.ipa` para o iPhone
4. Instala automaticamente

**Método 3: Via Site**
1. Faça upload do `.ipa` em um servidor
2. Crie link de download
3. Promotores acessam no iPhone
4. Instalam

---

## 🏢 Opção 3: Enterprise Distribution

### Quando Usar

- Você tem mais de 100 dispositivos
- É uma empresa
- Quer distribuição interna sem limites

### Requisitos

- Conta Apple Developer Enterprise ($299/ano)
- Apenas para empresas (não desenvolvedores individuais)

### Processo

Similar ao Ad Hoc, mas sem limite de dispositivos e sem precisar registrar UDIDs.

---

## ⚡ Método Rápido: TestFlight

### Resumo de 5 Minutos

```bash
# 1. Configurar credenciais (primeira vez)
cd mobile
eas credentials

# 2. Build para TestFlight
eas build --platform ios --profile preview

# 3. Submeter
eas submit --platform ios

# 4. Adicionar testadores no App Store Connect
# 5. Enviar convites
```

---

## 📋 Comparação das Opções

| Método | Custo | Limite | Facilidade | Renovação |
|--------|-------|--------|------------|-----------|
| **TestFlight** | $99/ano | 10.000 | ⭐⭐⭐⭐⭐ | 90 dias |
| **Ad Hoc** | $99/ano | 100 | ⭐⭐⭐ | 1 ano |
| **Enterprise** | $299/ano | Ilimitado | ⭐⭐ | 1 ano |

---

## 🎯 Recomendação

**Para começar: Use TestFlight**

✅ Mais fácil
✅ Até 10.000 testadores
✅ Atualizações automáticas
✅ Interface amigável
✅ Não precisa registrar UDIDs

**Limitação**: Apps expiram após 90 dias, mas podem ser renovados facilmente.

---

## 🔧 Configuração Detalhada

### 1. Atualizar eas.json para iOS

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### 2. Configurar app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.promogestao.mobile",
      "buildNumber": "1"
    }
  }
}
```

### 3. Variáveis de Ambiente

```bash
# Criar .env
echo 'EXPO_PUBLIC_API_URL=https://promo-gestao-backend.onrender.com/api' > .env

# Ou configurar no EAS
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://promo-gestao-backend.onrender.com/api
```

---

## 📱 Instruções para Promotores (TestFlight)

1. **Instalar TestFlight**:
   - Abra App Store
   - Busque "TestFlight"
   - Instale (gratuito)

2. **Aceitar Convite**:
   - Abra o email de convite
   - Toque em "View in TestFlight"
   - Ou abra TestFlight e aceite

3. **Instalar App**:
   - Toque em "Install" no app Promo Gestão
   - Aguarde instalação
   - Abra o app

4. **Fazer Login**:
   - Use suas credenciais
   - Permita permissões (câmera, localização)

---

## 🆘 Problemas Comuns

### Build falha
- Verifique se tem conta Apple Developer ativa
- Verifique se os certificados estão configurados
- Execute `eas credentials` para verificar

### Não consigo instalar
- Verifique se o UDID está registrado (Ad Hoc)
- Verifique se o certificado está válido
- Tente reinstalar o perfil de provisionamento

### App expira (TestFlight)
- Renove no App Store Connect
- Ou faça um novo build e submeta

### Erro de confiança
- Vá em Configurações > Geral > Gerenciar Perfis
- Confie no desenvolvedor

---

## 📚 Links Úteis

- **Apple Developer**: https://developer.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight Docs**: https://developer.apple.com/testflight/
- **EAS Build iOS**: https://docs.expo.dev/build/introduction/

---

## ✅ Checklist

### TestFlight:
- [ ] Conta Apple Developer criada
- [ ] Certificados configurados (`eas credentials`)
- [ ] Build executado com sucesso
- [ ] App submetido para TestFlight
- [ ] Testadores adicionados no App Store Connect
- [ ] Convites enviados

### Ad Hoc:
- [ ] UDIDs coletados de todos os iPhones
- [ ] UDIDs registrados no Apple Developer
- [ ] Perfil de provisionamento criado
- [ ] Build Ad Hoc executado
- [ ] `.ipa` distribuído

---

**🚀 Recomendação: Comece com TestFlight - é o mais fácil e prático!**

