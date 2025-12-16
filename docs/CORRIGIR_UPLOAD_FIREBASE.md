# 🔧 Corrigir Upload de Fotos - Firebase Storage

## 🐛 Problemas Identificados

1. **Firebase Storage não configurado no Render** - Retornando URLs mockadas
2. **Método de upload incorreto** - Firebase Storage não aceita PUT direto como S3
3. **Arquivos não estão sendo salvos no bucket**

## ✅ Solução

### 1. Verificar Credenciais Firebase no Render

Acesse: https://dashboard.render.com/web/promo-gestao-backend/env-vars

Verifique se estas variáveis estão configuradas:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (com `\n` preservados)
- `FIREBASE_STORAGE_BUCKET`

**⚠️ IMPORTANTE**: O `FIREBASE_PRIVATE_KEY` deve estar entre aspas e com `\n` para quebras de linha.

### 2. Configurar Regras do Firebase Storage

No Firebase Console:
1. Vá em **Storage** > **Rules**
2. Configure as regras para permitir uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      // Permitir uploads autenticados
      allow write: if request.auth != null;
      // Permitir leitura pública
      allow read: if true;
    }
  }
}
```

**⚠️ ATENÇÃO**: Para produção, use autenticação adequada!

### 3. Corrigir Método de Upload

O Firebase Storage precisa de um método diferente. Vou atualizar o código.

---

## 🔍 Verificar Logs do Backend

No Render Dashboard, verifique os logs:
- Procure por: `✅ Firebase Storage inicializado`
- Se aparecer: `⚠️ Firebase credentials não configuradas` = problema de credenciais

---

## 📋 Checklist

- [ ] Credenciais Firebase configuradas no Render
- [ ] Regras do Firebase Storage configuradas
- [ ] Backend mostra `✅ Firebase Storage inicializado` nos logs
- [ ] Testar upload de foto no app mobile
- [ ] Verificar se arquivo aparece no Firebase Console > Storage
- [ ] Verificar se imagem aparece no dashboard web

---

## 🚀 Próximos Passos

Após configurar as credenciais, faça um novo deploy do backend e teste novamente.

