# 🔥 Regras do Firebase Storage

## ⚠️ Problema

As regras atuais estão bloqueando todos os uploads:
```javascript
allow read, write: if false;
```

Isso impede que as fotos sejam enviadas para o bucket, mesmo com presigned URLs.

## ✅ Solução: Regras Corretas

### Código para Firebase Console

Acesse: https://console.firebase.google.com/ > Seu Projeto > Storage > Rules

Cole este código:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir leitura pública de todas as fotos
    match /photos/{allPaths=**} {
      allow read: if true;
      // Permitir escrita via presigned URLs (assinadas pelo backend)
      // O backend gera URLs assinadas, então não precisamos de autenticação aqui
      allow write: if true;
    }
    
    // Bloquear tudo que não for photos (segurança)
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## 📋 Passo a Passo

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com/
   - Selecione o projeto: `mustafabucket`

2. **Vá em Storage:**
   - Menu lateral > Storage
   - Aba "Rules"

3. **Cole o código acima**

4. **Clique em "Publish"**

5. **Aguarde alguns segundos** para as regras serem aplicadas

## 🔍 Verificação

Após aplicar as regras:

1. **Teste upload no app mobile**
2. **Verifique no Firebase Console > Storage:**
   - As fotos devem aparecer em `photos/{visitId}/`
3. **Verifique no dashboard web:**
   - As fotos devem aparecer corretamente

## ⚠️ Segurança

**Nota sobre segurança:**
- Essas regras permitem acesso público às fotos
- Para produção, você pode querer adicionar autenticação
- Por enquanto, isso é necessário para os presigned URLs funcionarem

## 🔄 Se Precisar de Mais Segurança Depois

Se quiser restringir acesso apenas a usuários autenticados:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      // Permitir leitura apenas para autenticados
      allow read: if request.auth != null;
      // Permitir escrita via presigned URLs (backend autenticado)
      allow write: if true;
    }
  }
}
```

**Mas isso requer configuração adicional no backend e mobile.**

---

**✅ Após aplicar essas regras, os uploads devem funcionar!**

