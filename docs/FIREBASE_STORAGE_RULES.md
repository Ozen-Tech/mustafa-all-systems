# 🔥 Regras do Firebase Storage - Versão Final

## ✅ Código Correto para Firebase Console

Acesse: https://console.firebase.google.com/ > Seu Projeto > Storage > Rules

**Cole este código (versão simplificada e garantida):**

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

