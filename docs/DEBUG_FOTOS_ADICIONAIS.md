# 🔍 Debug - Fotos Adicionais Não Estão Sendo Enviadas

## 🐛 Problema

Apenas fotos de check-in e check-out estão sendo enviadas para o Firebase. Fotos adicionais (tipo `OTHER`) não estão sendo enviadas.

## ✅ Correções Aplicadas

### 1. Logs Detalhados Adicionados

Agora o código mostra:
- Quantas fotos existem no total
- Quantas fotos serão enviadas
- Detalhes de cada foto (URI, tipo, etc.)
- Status de cada upload
- Erros detalhados

### 2. Filtro Melhorado

Agora filtra corretamente:
- ✅ Fotos com `uri` (novas, não enviadas)
- ❌ Fotos que já têm `url` mas não têm `uri` (já foram enviadas)

### 3. Tratamento de Erros Melhorado

- Usa `Promise.allSettled` em vez de `Promise.all`
- Se uma foto falhar, as outras continuam
- Mostra quantas fotos foram enviadas com sucesso

---

## 🧪 Como Testar e Debug

### 1. Abra o Console/Logcat

No app mobile, abra o console para ver os logs.

### 2. Adicione Fotos Adicionais

1. Faça check-in em uma loja
2. Na tela de visita ativa, clique em "Adicionar Foto"
3. Tire uma foto ou selecione da galeria
4. Clique em "Enviar Fotos"

### 3. Verifique os Logs

Procure por estas mensagens:

```
📸 [ActiveVisit] Total de fotos: X
📸 [ActiveVisit] Fotos para upload: Y
📸 [ActiveVisit] Foto 1: { hasUri: true, type: 'OTHER', ... }
📸 [ActiveVisit] Iniciando upload de foto adicional...
📸 [ActiveVisit] Presigned URL obtida: Sim
📸 [ActiveVisit] Fazendo upload da foto para Firebase...
✅ [ActiveVisit] Upload da foto concluído com sucesso
✅ [ActiveVisit] URL da foto: https://...
```

### 4. Se Houver Erro

Procure por:
- `❌ [ActiveVisit] Upload da foto falhou`
- `⚠️ [ActiveVisit] Presigned URL ou photoUri não disponível`
- `❌ [ActiveVisit] Erro no upload da foto:`

---

## 🔍 Possíveis Problemas

### Problema 1: Fotos não estão sendo filtradas

**Sintoma**: Log mostra `Fotos para upload: 0` mas você adicionou fotos

**Solução**: Verifique se as fotos têm `uri` começando com `file://`

### Problema 2: Presigned URL não está sendo gerada

**Sintoma**: Log mostra `Presigned URL obtida: Não`

**Solução**: 
- Verifique se o backend está rodando
- Verifique se Firebase está configurado no Render
- Verifique logs do backend

### Problema 3: Upload falha silenciosamente

**Sintoma**: Log mostra `Upload da foto falhou` mas não mostra erro

**Solução**: 
- Verifique se Firebase Storage está configurado
- Verifique regras do Firebase Storage
- Verifique se o bucket está correto

---

## 📋 Checklist de Debug

- [ ] Fotos aparecem na lista antes de enviar?
- [ ] Log mostra `Fotos para upload: X` (onde X > 0)?
- [ ] Log mostra `Presigned URL obtida: Sim`?
- [ ] Log mostra `Upload da foto concluído com sucesso`?
- [ ] Foto aparece no Firebase Storage?
- [ ] Foto aparece no dashboard web?

---

## 🚀 Próximos Passos

1. **Teste com Expo Go** (mais rápido)
2. **Verifique os logs** no console
3. **Compartilhe os logs** se ainda não funcionar

---

**✅ Com os novos logs, será mais fácil identificar o problema!**

