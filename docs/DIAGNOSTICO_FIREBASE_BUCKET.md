# 🔍 Diagnóstico Completo - Firebase Storage Bucket

## 🎯 Objetivo

Garantir que o bucket do Firebase Storage esteja **100% operacional** e conectado ao backend, web e app.

---

## ✅ Checklist de Verificação

### 1. Verificar Bucket no Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **mustafabucket**
3. Vá em **Storage**
4. Verifique se o bucket está listado e ativo

**⚠️ IMPORTANTE**: Se você ver uma mensagem sobre "re-linking" ou "re-vincular", clique nela!

---

### 2. Verificar Nome do Bucket

O Firebase pode usar dois formatos de bucket:

#### Formato Antigo (appspot.com):
```
mustafabucket.appspot.com
```

#### Formato Novo (firebasestorage.app):
```
mustafabucket.firebasestorage.app
```

**Como descobrir o nome correto:**

1. Firebase Console > **Storage** > **Files**
2. Veja a URL de qualquer arquivo (se houver)
3. Ou vá em **Project Settings** > **Storage** > veja o nome do bucket

**⚠️ IMPORTANTE**: Use o nome EXATO que aparece no Firebase Console!

---

### 3. Verificar Permissões no Google Cloud Console

#### Passo 1: Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **mustafabucket**

#### Passo 2: Verificar Service Account
1. Vá em **IAM & Admin** > **Service Accounts**
2. Procure: `firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com`
3. Clique nela

#### Passo 3: Verificar Permissões
1. Na página da service account, vá em **Permissions** (ou "Permissões")
2. Verifique se tem uma destas roles:
   - ✅ **Storage Admin** (`roles/storage.admin`)
   - ✅ **Storage Object Admin** (`roles/storage.objectAdmin`)

**Se NÃO tiver:**
1. Clique em **Grant Access** (ou "Conceder Acesso")
2. Adicione a role: **Storage Admin**
3. Clique em **Save**
4. ⏰ **Aguarde 5-10 minutos** para propagação

---

### 4. Verificar Variáveis no Render

1. Acesse: https://dashboard.render.com/web/promo-gestao-backend/env-vars
2. Verifique se TODAS estas variáveis estão configuradas:

```env
FIREBASE_PROJECT_ID=mustafabucket
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=mustafabucket.appspot.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE**:
- `FIREBASE_STORAGE_BUCKET` deve ser o nome EXATO do bucket (sem `gs://`)
- `FIREBASE_PRIVATE_KEY` deve estar entre **aspas duplas**
- Preserve os `\n` na chave privada

**Se o bucket for do formato novo, use:**
```env
FIREBASE_STORAGE_BUCKET=mustafabucket.firebasestorage.app
```

---

### 5. Verificar Logs do Backend

1. Acesse: https://dashboard.render.com/web/promo-gestao-backend
2. Vá em **Logs**
3. Procure por estas mensagens:

**✅ Se aparecer:**
```
✅ Firebase App inicializado
📦 Bucket configurado: mustafabucket.appspot.com
✅ Firebase Storage inicializado e bucket acessível
📦 Bucket: mustafabucket.appspot.com
```
→ **Tudo OK!**

**❌ Se aparecer:**
```
❌ Erro ao acessar bucket: ...
❌ Código: 403
```
ou
```
❌ Código: 412
🚨 ERRO DE PERMISSÃO: A conta de serviço não tem acesso ao bucket!
```
→ **Problema de permissões!** Veja passo 3.

**❌ Se aparecer:**
```
❌ Firebase credentials não configuradas!
```
→ **Problema de variáveis!** Veja passo 4.

---

### 6. Verificar Regras do Firebase Storage

1. Firebase Console > **Storage** > **Rules**
2. Verifique se as regras estão assim:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir acesso público completo para fotos
    match /photos/{allPaths=**} {
      allow read, write: if true;
    }
    
    // Bloquear tudo que não for photos (segurança)
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Clique em **Publish** se fez alterações

---

### 7. Testar Upload

#### No App Mobile:
1. Faça login
2. Faça check-in em uma loja
3. Tire uma foto
4. Verifique se aparece mensagem de sucesso

#### Verificar no Firebase:
1. Firebase Console > **Storage** > **Files**
2. Verifique se a foto aparece em `photos/{visitId}/`

#### Verificar no Dashboard Web:
1. Acesse o dashboard
2. Abra uma visita
3. Verifique se a foto aparece

---

## 🔧 Solução de Problemas

### Problema: Erro 412/403

**Causa**: Conta de serviço sem permissões

**Solução**:
1. Google Cloud Console > IAM & Admin > Service Accounts
2. Adicione role: **Storage Admin**
3. Aguarde 5-10 minutos
4. Reinicie o serviço no Render

---

### Problema: Bucket não encontrado

**Causa**: Nome do bucket incorreto

**Solução**:
1. Verifique o nome exato no Firebase Console
2. Atualize `FIREBASE_STORAGE_BUCKET` no Render
3. Reinicie o serviço

---

### Problema: Fotos não aparecem no web

**Causa**: Regras do Firebase Storage bloqueando acesso

**Solução**:
1. Verifique as regras (passo 6)
2. Certifique-se de que `allow read: if true` está configurado
3. Publique as regras

---

## 📋 Checklist Final

- [ ] Bucket existe e está ativo no Firebase Console
- [ ] Nome do bucket está correto nas variáveis do Render
- [ ] Service account tem role **Storage Admin**
- [ ] Todas as variáveis estão configuradas no Render
- [ ] Logs do backend mostram "✅ Firebase Storage inicializado e bucket acessível"
- [ ] Regras do Firebase Storage permitem leitura pública
- [ ] Upload funciona no app mobile
- [ ] Fotos aparecem no Firebase Console
- [ ] Fotos aparecem no dashboard web

---

## 🚀 Após Resolver

1. **Reinicie o serviço no Render**:
   - Render Dashboard > Manual Deploy > Clear build cache & deploy

2. **Aguarde 2-3 minutos** para o serviço reiniciar

3. **Teste novamente**:
   - Upload no app mobile
   - Visualização no dashboard web

---

**✅ Se todos os itens do checklist estiverem OK, o bucket deve estar 100% operacional!**

