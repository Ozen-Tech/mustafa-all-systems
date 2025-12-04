# ⚡ Configurar Firebase Storage no Render - Rápido

## 📋 Valores para Configurar

Baseado no seu bucket `gs://mustafabucket.firebasestorage.app`, configure estas variáveis no Render:

### 1. Acesse o Render Dashboard

https://dashboard.render.com/web/promo-gestao-backend/env-vars

### 2. Adicione/Atualize estas Variáveis

#### FIREBASE_STORAGE_BUCKET
```
mustafabucket.firebasestorage.app
```
**⚠️ Sem o prefixo `gs://`!**

#### FIREBASE_PROJECT_ID
```
mustafabucket
```
(ou o ID do projeto que você vê no Firebase Console)

#### FIREBASE_CLIENT_EMAIL
```
firebase-adminsdk-xxxxx@mustafabucket.iam.gserviceaccount.com
```
(do arquivo JSON que você baixou do Firebase)

#### FIREBASE_PRIVATE_KEY
```
"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
**⚠️ IMPORTANTE**:
- Entre **aspas duplas**
- Preserve os `\n` (não substitua por quebras de linha)
- Cole a chave completa do arquivo JSON

---

## 📝 Exemplo Completo

Se você tem o arquivo JSON do Firebase, os valores são:

```json
{
  "type": "service_account",
  "project_id": "mustafabucket",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@mustafabucket.iam.gserviceaccount.com",
  ...
}
```

**No Render, configure:**

| Variável | Valor |
|----------|-------|
| `FIREBASE_PROJECT_ID` | `mustafabucket` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@mustafabucket.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (com aspas!) |
| `FIREBASE_STORAGE_BUCKET` | `mustafabucket.firebasestorage.app` |

---

## ✅ Após Configurar

1. **Salve as variáveis** no Render
2. **Faça deploy**: Render Dashboard > Manual Deploy > Deploy latest commit
3. **Verifique logs**: Procure por `✅ Firebase Storage inicializado`
4. **Teste upload** no app mobile

---

## 🔍 Verificar se Funcionou

Nos logs do Render, você deve ver:

```
✅ Firebase Storage inicializado
📦 Bucket: mustafabucket.firebasestorage.app
```

Se aparecer `❌ Firebase credentials não configuradas`, verifique se todas as 4 variáveis estão configuradas corretamente.

---

**🚀 Pronto! Após configurar, as fotos devem funcionar!**

