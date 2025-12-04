# 🔧 Solução: Erro 404 - Arquivos Não Encontrados

## 🐛 Problema Identificado

As URLs estão sendo geradas corretamente, mas os arquivos retornam **404 Not Found**:
- ✅ Presigned URLs sendo geradas
- ✅ URLs públicas sendo criadas
- ❌ Arquivos não estão no Firebase Storage (404)

**Isso significa que o upload está falhando silenciosamente!**

## 🔍 Diagnóstico

### 1. Verificar Logs do Mobile

**No console/logcat do app mobile, procure por:**

```
📤 [photoService] Upload concluído - Status: XXX
```

**Status possíveis:**
- ✅ **200 ou 201** = Upload OK (mas arquivo não aparece = problema nas regras)
- ❌ **403** = Acesso negado (regras do Firebase bloqueando)
- ❌ **400** = Requisição inválida (URL ou headers incorretos)
- ❌ **404** = URL não encontrada (presigned URL incorreta)
- ❌ **Outro** = Outro erro

### 2. Verificar Firebase Storage

1. Acesse: https://console.firebase.google.com/
2. Vá em **Storage**
3. Verifique se há arquivos em `photos/{visitId}/OTHER-...`

**Se não houver arquivos:**
- Upload não está funcionando
- Verificar logs do mobile para ver status HTTP

## ✅ Soluções

### Solução 1: Verificar Status do Upload (JÁ IMPLEMENTADO)

Adicionei logs mais detalhados no `photoService.ts` para ver exatamente o que está acontecendo.

**Próximo passo:**
1. Fazer novo upload de foto
2. Verificar logs do mobile
3. Ver qual status HTTP está sendo retornado

### Solução 2: Verificar Presigned URL

Firebase Storage pode precisar de formato específico para presigned URLs.

**Verificar:**
- A presigned URL gerada está no formato correto?
- A URL contém todos os parâmetros necessários?

### Solução 3: Verificar Método de Upload

Firebase Storage pode precisar de método diferente ou headers específicos.

**Possíveis problemas:**
- Método PUT pode não funcionar
- Headers podem estar incorretos
- Content-Type pode estar causando problema

## 🧪 Teste Manual

Você pode testar a presigned URL manualmente:

### 1. Obter Presigned URL

```bash
curl -X POST https://promo-gestao-backend.onrender.com/api/upload/photo \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitId": "9ad92514-4cb5-484f-81de-df316a47769e",
    "type": "OTHER",
    "contentType": "image/jpeg",
    "extension": "jpg"
  }'
```

### 2. Fazer Upload Manual

```bash
curl -X PUT "PRESIGNED_URL_AQUI" \
  --upload-file caminho/para/imagem.jpg \
  -H "Content-Type: image/jpeg" \
  -v
```

**O `-v` mostra detalhes da requisição e resposta.**

## 📋 Checklist de Debug

- [ ] Verificar logs do mobile (status HTTP)
- [ ] Verificar Firebase Storage (arquivos existem?)
- [ ] Testar presigned URL manualmente
- [ ] Verificar regras do Firebase Storage
- [ ] Verificar se presigned URL está correta

## 🚀 Próximos Passos

1. **Fazer novo upload** de foto OTHER
2. **Verificar logs do mobile** para ver status HTTP
3. **Compartilhar logs** para diagnóstico mais preciso

---

**🔍 O código agora tem logs mais detalhados. Faça um novo upload e verifique os logs!**

