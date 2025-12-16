# 🔍 Verificar Configuração do Firebase Storage

## 🐛 Problema

As imagens não estão sendo salvas no Firebase Storage e aparecem como "Imagem não disponível" no dashboard.

## ✅ Solução Passo a Passo

### 1. Verificar Logs do Backend no Render

1. Acesse: https://dashboard.render.com/web/promo-gestao-backend
2. Clique em **Logs**
3. Procure por uma destas mensagens:

**✅ Se aparecer:**
```
✅ Firebase Storage inicializado
📦 Bucket: seu-bucket.appspot.com
```
→ Firebase está configurado corretamente!

**❌ Se aparecer:**
```
❌ Firebase credentials não configuradas!
❌ Variáveis necessárias:
   - FIREBASE_PROJECT_ID: ❌
   - FIREBASE_CLIENT_EMAIL: ❌
   - FIREBASE_PRIVATE_KEY: ❌
   - FIREBASE_STORAGE_BUCKET: ❌
⚠️  Usando URLs mockadas - uploads NÃO funcionarão!
```
→ **Precisa configurar as credenciais!**

---

### 2. Configurar Credenciais Firebase no Render

1. Acesse: https://dashboard.render.com/web/promo-gestao-backend/env-vars
2. Adicione estas variáveis:

#### FIREBASE_PROJECT_ID
- **Valor**: O ID do seu projeto Firebase
- **Como encontrar**: Firebase Console > Project Settings > General > Project ID

#### FIREBASE_CLIENT_EMAIL
- **Valor**: O email da service account
- **Formato**: `firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com`
- **Como encontrar**: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

#### FIREBASE_PRIVATE_KEY
- **Valor**: A chave privada completa (entre aspas!)
- **Formato**: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- **⚠️ IMPORTANTE**: 
  - Deve estar entre **aspas duplas**
  - Preserve os `\n` (não substitua por quebras de linha reais)
  - Exemplo completo:
    ```
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
    ```

#### FIREBASE_STORAGE_BUCKET
- **Valor**: O nome do bucket (sem o prefixo `gs://`)
- **Formato**: `mustafabucket.firebasestorage.app` ou `seu-projeto.appspot.com`
- **Exemplo**: Se o bucket é `gs://mustafabucket.firebasestorage.app`, use apenas: `mustafabucket.firebasestorage.app`
- **Como encontrar**: Firebase Console > Storage > Settings > Bucket name

---

### 3. Configurar Regras do Firebase Storage

1. Acesse: https://console.firebase.google.com/
2. Vá em **Storage** > **Rules**
3. Configure:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      // Permitir uploads (temporário para testes)
      allow write: if true;
      // Permitir leitura pública
      allow read: if true;
    }
  }
}
```

**⚠️ ATENÇÃO**: Essas regras permitem acesso total! Para produção, configure autenticação adequada.

4. Clique em **Publish**

---

### 4. Fazer Deploy do Backend

Após configurar as variáveis:

1. No Render Dashboard, clique em **Manual Deploy** > **Deploy latest commit**
2. Aguarde o deploy terminar
3. Verifique os logs novamente

---

### 5. Testar Upload

1. Abra o app mobile
2. Faça login
3. Faça check-in em uma loja e tire uma foto
4. Verifique:
   - **No Firebase Console**: Storage > Ver se a foto apareceu
   - **No Dashboard Web**: Ver se a imagem aparece

---

## 🔍 Debug

### Verificar se Upload Está Funcionando

1. **No app mobile**, abra o console/logcat
2. Procure por:
   - `📤 [photoService] Iniciando upload...`
   - `✅ [photoService] Upload bem-sucedido` ou `❌ [photoService] Upload falhou`

### Verificar URLs no Backend

Nos logs do Render, procure por:
- `📸 Gerando presigned URL para upload: photos/...`
- `✅ Presigned URL gerada com sucesso` ou `❌ Erro ao gerar presigned URL`

---

## ✅ Checklist Final

- [ ] Credenciais Firebase configuradas no Render
- [ ] Backend mostra `✅ Firebase Storage inicializado` nos logs
- [ ] Regras do Firebase Storage configuradas
- [ ] Deploy do backend feito
- [ ] Teste de upload realizado
- [ ] Foto aparece no Firebase Console > Storage
- [ ] Imagem aparece no dashboard web

---

## 🆘 Ainda com Problemas?

### Erro: "Firebase credentials não configuradas"
→ Verifique se todas as 4 variáveis estão configuradas no Render

### Erro: "Erro ao inicializar Firebase Storage"
→ Verifique se o `FIREBASE_PRIVATE_KEY` está entre aspas e com `\n`

### Upload falha no mobile
→ Verifique os logs do backend para ver se a presigned URL está sendo gerada

### Imagem não aparece no dashboard
→ Verifique se a URL pública está correta e se o arquivo existe no Firebase Storage

---

**🚀 Após configurar tudo, as imagens devem funcionar!**

