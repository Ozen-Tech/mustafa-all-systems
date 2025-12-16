# 🧪 Teste do Firebase Storage

## 📋 Como Usar

Este script testa todas as operações do Firebase Storage para verificar se está funcionando corretamente.

### 1. Configurar Variáveis de Ambiente Local

Crie um arquivo `.env` na pasta `backend/` com as variáveis do Render:

```env
FIREBASE_PROJECT_ID=mustafabucket
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=mustafabucket.firebasestorage.app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDT/cuApM39Hd7w\nz4WwcY43LxX73pdXDJ2/9PYSiKATSVd8aFzDquPtpcJacOgOGwAHe6Ik05zW75Up\nIJ+yqe/Dyz/OOsgRcPpswMiGy0i6qT96j2vGZNfxv+cAVUzihX6UqUN3M5Z5Jm50\n8TwzPrD3rUEi3TlkXVhbnp5JzKZZ7C9BRID8a1cyyJ2OJ5nFSiWRAtCVIBfb9QxJ\nS+kupblKH0UIAp0uFEaw8Wd52js9mKsSe35jXfBhgQpNLQMah5TzFRO8dSSm6zuF\n/TBmOk2z8rO49UCrCRvPbN4/ULv8KSZwAV1ufUgz58XBLzXmSS0oSAtVbw1V8pzB\nUfuxzvAzAgMBAAECggEAFzRcVowzoWA9VgixLpDPgLTeaCqDpbCo19PdgkaC7HmG\nYloeGquVtXQDzoM2CM07IevjjLppHDyEtvLDkvqiVxaOuRPwGxCjKM0AENkm8Ipe\n0MXq2yrmBFKoMNN6zf96IpWrNTISvNd7FxaM1g3SWy9oxi3cVA3FAopd8zVmhB3G\nPo87/TiEe2mgiW1Seg+OtLFOUY9Inh3hW+0ClHKIKKLBuYZ+tzXPCP+IVC2Z1RBd\nX76gYfpwHL40KKtlbF3+gTRqEqk014+LJNQxUMk7qRKNFYu2ouvggXaLWWPlzF5S\ncVPa16IC5B+XYpzP9Q1azOQfjcJLdEnmUQG36K/eOQKBgQDx3AptdB7spV4YPtAP\nD9WbSD4quUR9DNadYjCeE0Y0eoJ1zF+EgNx15QpEQAP07BIOq2/w9nNMe8otF2Wp\no75Xiln9LEOrOdcMkmwPkoyk/l/5WHVCqSfLhq3Pam1LtcQyId4mZ7ORMzz7OufJ\nEcQ6eYqCXX9oYD8UDxNRmZew3wKBgQDgYrY1ZOdUA2DjJoWp33Teox/32K8fJHxp\n0YbzvjRmeMqU9Zz5PF8xQD42O67sqchID37KRb1Z8wadNKcS9O7w2voKVQcVyXfd\neo4pP+H7j7n6JP6lwb7uxAo4Ma/syT0u18evnbu+Lr6UJ8yMrcnvNlaZu7cfNhof\nKftyX8lHLQKBgE9c1esenHsotFyeV+VpW71tkkCwtIGYMeBI9Q0Z5AKaZK7E1l8D\nbdQdySWmH+ZBhJdduAjIxgLF6AytzcVBntbY5jiGStony6IrddwSSaZmdhW66hdq\nrE1Dr0sNcDnUtkGBDYVqp+iweIUzyhUXiF1rvoCSr5kPZANwAvXWwYjfAoGADCXL\n74AS9f1o1WNUgSnTzenO5UAZ2vnCsofhYni9pX6MmRvi76tRC/2KYK1CfxWB/kS4\nfILiCWiaxw/+q4wPE4MHXl/UDl3l21uzLpCCz3esfdpa3uZqS8rZMsmd2JfcdBjC\nesNzUox9TNAKxuLxt72dWp1LAKmRKHbBYiPFZdECgYALday8JHkB5MwCZTjv4GSh\nKhFJ+zoSE1B64V/W9o5ulaUzf9glZnojeXTkrZCEJoMtiIjJzzP56RKJIS8YsAhL\n54sLYf0Ys0sUy9bS4HrsgQrXNti+3EuoMWkeVsP5g31WyRLBecuiUh0LJ5s8+5GD\nBM1vR5uONY5nc7pvjbz3cw==\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE**: 
- A `FIREBASE_PRIVATE_KEY` deve estar entre **aspas duplas**
- Preserve todos os `\n` (não substitua por quebras de linha reais)

### 2. Executar o Teste

```bash
cd backend
npm run test:firebase
```

### 3. O Que o Teste Faz

O script testa:

1. ✅ Verificação de variáveis de ambiente
2. ✅ Inicialização do Firebase Admin
3. ✅ Acesso ao bucket
4. ✅ Geração de presigned URL
5. ✅ Upload de arquivo de teste
6. ✅ Verificação de existência do arquivo
7. ✅ Download do arquivo
8. ✅ Geração de URL pública
9. ✅ Limpeza (deleta arquivo de teste)

### 4. Resultados Esperados

**✅ Se tudo estiver OK:**
```
🧪 Iniciando teste do Firebase Storage...
📋 Verificando variáveis de ambiente...
   FIREBASE_PROJECT_ID: ✅ mustafabucket
   FIREBASE_CLIENT_EMAIL: ✅ firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY: ✅ (1234 caracteres)
   FIREBASE_STORAGE_BUCKET: ✅ mustafabucket.firebasestorage.app

🔥 Inicializando Firebase Admin...
✅ Firebase App inicializado com sucesso!

📦 Obtendo Storage...
✅ Storage obtido

🔍 Testando acesso ao bucket...
✅ Bucket acessível!
   Nome: mustafabucket.firebasestorage.app
   Localização: us-central1

🔗 Testando geração de presigned URL...
✅ Presigned URL gerada com sucesso!

📤 Testando upload de arquivo...
✅ Arquivo enviado com sucesso!

🔍 Verificando se arquivo existe...
✅ Arquivo encontrado no bucket!

📥 Testando download do arquivo...
✅ Arquivo baixado com sucesso!

🌐 Testando geração de URL pública...
✅ URL pública gerada

🧹 Limpando arquivo de teste...
✅ Arquivo de teste removido

🎉 TODOS OS TESTES PASSARAM!
✅ Firebase Storage está funcionando corretamente!
```

**❌ Se houver erro 412:**
```
❌ Erro ao gerar presigned URL:
   Código: 412
   Mensagem: A required service account is missing necessary permissions...

🚨 ERRO DE PERMISSÃO!
   A service account não tem permissões para gerar presigned URLs
   Adicione a role "Storage Admin" no Google Cloud Console
```

### 5. Interpretando os Resultados

- **✅ Todos os testes passaram**: Firebase Storage está funcionando corretamente!
- **❌ Erro 412/403**: Problema de permissões - adicione Storage Admin no Google Cloud
- **❌ Erro na inicialização**: Verifique se a chave privada está correta (com aspas duplas)
- **❌ Bucket não encontrado**: Verifique se o nome do bucket está correto

---

**✅ Use este script para diagnosticar problemas do Firebase Storage!**

