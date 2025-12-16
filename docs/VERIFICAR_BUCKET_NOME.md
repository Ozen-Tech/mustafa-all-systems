# 🔍 Como Descobrir o Nome Correto do Bucket

## 🎯 Problema

O erro 412 pode ocorrer se o nome do bucket estiver incorreto nas variáveis de ambiente.

---

## ✅ Método 1: Firebase Console (Mais Fácil)

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **mustafabucket**
3. Vá em **Storage** > **Files**
4. Se houver arquivos, clique em um deles
5. Veja a URL - o nome do bucket está na URL

**Exemplo de URL:**
```
https://firebasestorage.googleapis.com/v0/b/mustafabucket.appspot.com/o/photos%2F...
```

O bucket é: `mustafabucket.appspot.com`

---

## ✅ Método 2: Project Settings

1. Firebase Console > **Project Settings** (⚙️)
2. Vá na aba **Storage**
3. Veja o nome do bucket listado

---

## ✅ Método 3: Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **mustafabucket**
3. Vá em **Cloud Storage** > **Buckets**
4. Veja a lista de buckets
5. Procure por um bucket com nome similar a:
   - `mustafabucket.appspot.com`
   - `mustafabucket.firebasestorage.app`

---

## ⚠️ Formatos Possíveis

### Formato Antigo:
```
mustafabucket.appspot.com
```

### Formato Novo:
```
mustafabucket.firebasestorage.app
```

**Use o formato que aparecer no Firebase Console!**

---

## 🔧 Atualizar no Render

1. Acesse: https://dashboard.render.com/web/promo-gestao-backend/env-vars
2. Encontre: `FIREBASE_STORAGE_BUCKET`
3. Atualize com o nome EXATO do bucket (sem `gs://`)
4. Salve
5. Reinicie o serviço

---

**✅ Após atualizar, o erro 412 deve ser resolvido!**

