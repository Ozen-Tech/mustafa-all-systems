# 🔧 Solução: Erro 412 - Permissões do Firebase Storage

## 🐛 Problema

Você está recebendo o erro:
```json
{
  "error": {
    "code": 412,
    "message": "A required service account is missing necessary permissions. Please resolve by visiting the Storage page of the Firebase Console and re-linking your Firebase bucket or see this FAQ for more info: https://firebase.google.com/support/faq#storage-accounts."
  }
}
```

Este erro indica que a **conta de serviço do Firebase não tem as permissões necessárias** para acessar o Storage.

---

## ✅ Solução Passo a Passo

### 1. Verificar e Configurar Permissões no Google Cloud Console

#### Passo 1: Acessar o Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: `mustafabucket` (ou seu projeto Firebase)

#### Passo 2: Verificar a Conta de Serviço

1. Vá em **IAM & Admin** > **Service Accounts**
2. Procure pela conta de serviço: `firebase-adminsdk-xxxxx@mustafabucket.iam.gserviceaccount.com`
3. Clique nela para ver os detalhes

#### Passo 3: Adicionar Permissões Necessárias

1. Na página da conta de serviço, clique em **"Permissions"** (ou "Permissões")
2. Clique em **"Grant Access"** (ou "Conceder Acesso")
3. Adicione estas **roles** (papéis):
   - ✅ **Storage Admin** (ou `roles/storage.admin`)
   - ✅ **Storage Object Admin** (ou `roles/storage.objectAdmin`)
   - ✅ **Storage Object Creator** (ou `roles/storage.objectCreator`)
   - ✅ **Storage Object Viewer** (ou `roles/storage.objectViewer`)

4. Clique em **"Save"** (ou "Salvar")

**⚠️ IMPORTANTE**: A role **Storage Admin** é a mais completa e deve resolver o problema.

---

### 2. Re-vincular o Bucket no Firebase Console

#### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: `mustafabucket`

#### Passo 2: Ir para Storage

1. No menu lateral, clique em **Storage**
2. Se você ver uma mensagem sobre "re-linking" ou "re-vincular", clique nela
3. Se não aparecer, vá para **Settings** (⚙️) > **Project Settings** > **Storage**

#### Passo 3: Verificar o Bucket

1. Verifique se o bucket está listado: `mustafabucket.appspot.com` ou `mustafabucket.firebasestorage.app`
2. Se não estiver vinculado, clique em **"Link bucket"** ou **"Re-link bucket"**
3. Selecione o bucket correto e confirme

---

### 3. Verificar Configuração no Render

#### Passo 1: Verificar Variáveis de Ambiente

Acesse: https://dashboard.render.com/web/promo-gestao-backend/env-vars

Verifique se estas variáveis estão configuradas corretamente:

- ✅ `FIREBASE_PROJECT_ID=mustafabucket`
- ✅ `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mustafabucket.iam.gserviceaccount.com`
- ✅ `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- ✅ `FIREBASE_STORAGE_BUCKET=mustafabucket.appspot.com`

**⚠️ IMPORTANTE**: 
- O `FIREBASE_PRIVATE_KEY` deve estar entre **aspas duplas**
- Preserve os `\n` (não substitua por quebras de linha reais)

#### Passo 2: Reiniciar o Serviço

Após configurar as permissões:

1. No Render Dashboard, vá para seu serviço
2. Clique em **"Manual Deploy"** > **"Clear build cache & deploy"**
3. Aguarde o deploy completar

---

### 4. Aguardar Propagação

**⚠️ IMPORTANTE**: Após fazer mudanças nas permissões:

- Aguarde **5-10 minutos** para as mudanças se propagarem
- As permissões do Google Cloud podem levar alguns minutos para serem aplicadas

---

## 🔍 Verificação

### 1. Verificar Logs do Backend

No Render Dashboard > Logs, procure por:

**✅ Se aparecer:**
```
✅ Firebase Storage inicializado
📦 Bucket: mustafabucket.appspot.com
```
→ Firebase está configurado corretamente!

**❌ Se aparecer:**
```
❌ Erro ao gerar presigned URL do Firebase: [Error 412]
```
→ Ainda há problema de permissões. Verifique novamente o passo 1.

### 2. Testar Upload

1. Tente fazer upload de uma foto pelo app mobile
2. Verifique se não aparece mais o erro 412
3. Verifique se a foto aparece no Firebase Console > Storage

### 3. Verificar Fotos no Dashboard Web

1. Acesse o dashboard web
2. Abra uma visita que tem fotos
3. Verifique se as fotos aparecem corretamente

---

## 🚨 Se Ainda Não Funcionar

### Opção 1: Gerar Nova Chave Privada

1. Firebase Console > **Project Settings** > **Service Accounts**
2. Clique em **"Generate New Private Key"**
3. Baixe o arquivo JSON
4. Use o script `scripts/setup-firebase.sh` para extrair as credenciais:
   ```bash
   ./scripts/setup-firebase.sh ~/Downloads/mustafabucket-firebase-adminsdk.json
   ```
5. Atualize as variáveis no Render com as novas credenciais

### Opção 2: Verificar Bucket Name

Certifique-se de que o `FIREBASE_STORAGE_BUCKET` está correto:

- Formato antigo: `mustafabucket.appspot.com`
- Formato novo: `mustafabucket.firebasestorage.app`

Tente ambos os formatos se um não funcionar.

---

## 📋 Checklist Final

- [ ] Permissões da conta de serviço configuradas no Google Cloud Console
- [ ] Bucket re-vinculado no Firebase Console
- [ ] Variáveis de ambiente verificadas no Render
- [ ] Serviço reiniciado no Render
- [ ] Aguardado 5-10 minutos para propagação
- [ ] Logs do backend mostram "✅ Firebase Storage inicializado"
- [ ] Upload de foto funciona no app mobile
- [ ] Fotos aparecem no dashboard web

---

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Storage FAQ](https://firebase.google.com/support/faq#storage-accounts)
- [Render Dashboard](https://dashboard.render.com/)

---

**✅ Após seguir esses passos, o erro 412 deve ser resolvido!**

