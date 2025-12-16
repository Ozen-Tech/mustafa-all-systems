# 🔧 Corrigir Erro de Conexão no App Mobile

## 🐛 Problema

**Erro**: "Não foi possível conectar ao servidor"

## ✅ Solução: Configurar Variável de Ambiente no EAS

O problema é que o `.env` local **NÃO é incluído** no build do EAS. Você precisa configurar a variável de ambiente diretamente no EAS.

### Opção 1: Configurar no EAS (Recomendado)

```bash
cd mobile

# Configurar variável de ambiente no EAS
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://promo-gestao-backend.onrender.com/api --type string
```

### Opção 2: Configurar no app.json (Alternativa)

Atualize o `app.json` para incluir a URL diretamente:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://promo-gestao-backend.onrender.com/api",
      "EXPO_PUBLIC_API_URL": "https://promo-gestao-backend.onrender.com/api"
    }
  }
}
```

**⚠️ Nota**: Isso expõe a URL no código, mas funciona.

### Opção 3: Atualizar api.ts para usar app.json

Modifique `mobile/src/config/api.ts`:

```typescript
import Constants from 'expo-constants';

const API_URL = 
  process.env?.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'https://promo-gestao-backend.onrender.com/api';
```

---

## 🔄 Fazer Novo Build

Após configurar, faça um **novo build de produção**:

```bash
cd mobile

# Opção 1: Build de produção (recomendado)
eas build --platform android --profile production

# Opção 2: Build preview (se preferir)
eas build --platform android --profile preview
```

**Importante**: Use `production` ou `preview`, não `development`!

---

## ✅ Verificar Backend

Antes de fazer o build, verifique se o backend está online:

```bash
curl https://promo-gestao-backend.onrender.com/health
```

Deve retornar: `{"status":"ok","timestamp":"..."}`

---

## 🧪 Testar Localmente (Desenvolvimento)

Se quiser testar localmente antes de fazer build:

1. **Inicie o backend localmente**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Configure .env local**:
   ```bash
   cd mobile
   echo 'EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000/api' > .env
   # Substitua SEU_IP_LOCAL pelo IP do seu computador na rede
   ```

3. **Execute com Expo**:
   ```bash
   npm start
   ```

---

## 🔍 Debug: Verificar URL no App

Para ver qual URL o app está usando, adicione logs:

O app já tem logs no `authService.ts`. Verifique o console/logcat quando fizer login.

---

## 📋 Checklist

- [ ] Backend está online (`/health` responde)
- [ ] Variável de ambiente configurada no EAS OU no app.json
- [ ] Novo build feito com perfil `production` ou `preview`
- [ ] APK baixado e instalado no celular
- [ ] Celular tem conexão com internet
- [ ] Testado login novamente

---

## 🚀 Solução Rápida (3 Passos)

```bash
# 1. Configurar variável no EAS
cd mobile
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://promo-gestao-backend.onrender.com/api --type string

# 2. Fazer novo build de produção
eas build --platform android --profile production

# 3. Aguardar build e baixar novo APK
```

---

## 🆘 Ainda com Problemas?

### Backend não responde
- Verifique se está online: https://promo-gestao-backend.onrender.com/health
- Verifique logs no Render Dashboard

### App ainda não conecta
- Verifique se o novo build foi instalado (desinstale o antigo primeiro)
- Verifique logs do app (React Native Debugger ou logcat)
- Verifique se a URL está correta no build

### CORS Error
- Verifique se `CORS_ORIGIN` no Render inclui requisições mobile
- Mobile apps geralmente não têm problema de CORS, mas verifique

---

**✅ Após configurar e fazer novo build, o app deve conectar corretamente!**

