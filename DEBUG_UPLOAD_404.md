# 🔍 Debug: Erro 404 - Arquivos Não Encontrados

## 🐛 Problema

As URLs estão sendo geradas corretamente, mas os arquivos retornam 404:
- URL gerada: `https://firebasestorage.googleapis.com/v0/b/.../OTHER-...jpg?alt=media`
- Erro: `404 Not Found`

**Isso significa que o upload está falhando silenciosamente!**

## 🔍 Possíveis Causas

### 1. Upload Falhando Silenciosamente

O `FileSystem.uploadAsync` pode estar retornando status diferente de 200/201, mas o código não está detectando.

**Verificar logs do mobile:**
- Procure por: `📤 [photoService] Upload concluído - Status: XXX`
- Se status não for 200 ou 201, o upload falhou

### 2. Método PUT Pode Não Funcionar

Firebase Storage pode precisar de método diferente ou headers específicos.

### 3. Presigned URL Pode Estar Incorreta

A URL assinada pode estar sendo gerada, mas não está funcionando para upload.

## 🧪 Como Debugar

### 1. Verificar Logs do Mobile

No console/logcat do app, procure por:

```
📤 [photoService] Upload concluído - Status: XXX
```

**Se aparecer:**
- Status 200/201 = Upload OK (mas arquivo não aparece = problema nas regras)
- Status 403 = Acesso negado (regras do Firebase)
- Status 400 = Requisição inválida (URL ou headers incorretos)
- Status diferente = Outro erro

### 2. Verificar Firebase Storage

1. Acesse: https://console.firebase.google.com/
2. Vá em Storage
3. Verifique se há arquivos em `photos/{visitId}/OTHER-...`

**Se não houver arquivos:**
- Upload não está funcionando
- Verificar logs do mobile para ver status HTTP

### 3. Testar Upload Manualmente

Você pode testar a presigned URL manualmente usando curl:

```bash
# Obter presigned URL do backend
curl -X POST https://promo-gestao-backend.onrender.com/api/upload/photo \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visitId":"...","type":"OTHER","contentType":"image/jpeg","extension":"jpg"}'

# Usar a presignedUrl retornada para fazer upload
curl -X PUT "PRESIGNED_URL_AQUI" \
  --upload-file caminho/para/imagem.jpg \
  -H "Content-Type: image/jpeg"
```

## ✅ Soluções Possíveis

### Solução 1: Verificar Status do Upload

Adicionar mais logs para ver exatamente o que está acontecendo.

### Solução 2: Usar Método Diferente

Firebase Storage pode precisar de método POST em vez de PUT, ou headers diferentes.

### Solução 3: Verificar Regras do Firebase

Mesmo com regras corretas, pode haver problema de CORS ou outras configurações.

---

**🔍 Próximo passo: Verificar os logs do mobile para ver o status HTTP do upload!**

