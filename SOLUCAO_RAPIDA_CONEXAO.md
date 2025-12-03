# ⚡ Solução Rápida - Erro de Conexão Mobile

## 🐛 Problema
App mobile não consegue conectar ao backend.

## ✅ Solução (2 Passos)

### 1. Arquivos Já Corrigidos ✅
- ✅ `api.ts` atualizado para usar URL de produção por padrão
- ✅ `app.json` atualizado com URL da API

### 2. Fazer Novo Build

```bash
cd mobile

# Build de PRODUÇÃO (não development!)
eas build --platform android --profile production
```

**⏱️ Aguarde 10-20 minutos**

### 3. Baixar e Instalar Novo APK

1. Acesse: https://expo.dev/accounts/ozentech/projects/promo-gestao-mobile/builds
2. Baixe o novo APK
3. **Desinstale o app antigo** do celular
4. Instale o novo APK
5. Teste o login

---

## ✅ O Que Foi Corrigido

1. **URL padrão**: App agora usa `https://promo-gestao-backend.onrender.com/api` por padrão
2. **app.json**: URL configurada no `extra` para builds EAS
3. **api.ts**: Verifica múltiplas fontes (env, app.json, default)

---

## 🧪 Testar

Após instalar o novo APK:
- Email: `promotor1@teste.com`
- Senha: `senha123`

Deve conectar! ✅

---

**🚀 Próximo passo: Execute `eas build --platform android --profile production`**

