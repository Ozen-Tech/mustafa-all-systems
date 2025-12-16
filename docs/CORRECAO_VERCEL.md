# ✅ Correção do Vercel

## Problema

O `vercel.json` estava referenciando um secret `@api_url` que não existe:

```json
"env": {
  "VITE_API_URL": "@api_url"
}
```

## Solução

Removida a referência ao secret. Agora você deve configurar a variável diretamente no dashboard do Vercel.

## Como Configurar no Vercel

### Opção 1: Via Dashboard (Recomendado)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Clique em **Add New**
5. Adicione:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://seu-backend.onrender.com/api` (substitua pela URL real do seu backend no Render)
   - **Environments**: Selecione Production, Preview e Development
6. Clique em **Save**

### Opção 2: Via CLI

```bash
vercel env add VITE_API_URL
# Digite: https://seu-backend.onrender.com/api
# Selecione os ambientes: Production, Preview, Development
```

## Importante

⚠️ **Substitua `seu-backend.onrender.com` pela URL real do seu backend no Render!**

Para encontrar a URL:
1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Vá no seu serviço `promo-gestao-backend`
3. A URL estará no topo, algo como: `promo-gestao-backend-xxxx.onrender.com`
4. Use: `https://promo-gestao-backend-xxxx.onrender.com/api`

## Após Configurar

1. Faça um novo deploy no Vercel (ou aguarde o deploy automático)
2. A variável `VITE_API_URL` estará disponível no build
3. O frontend conseguirá se conectar ao backend

## Verificação

Após o deploy, verifique se está funcionando:
1. Abra o console do navegador (F12)
2. Verifique se não há erros de conexão com a API
3. Tente fazer login

---

✅ **Correção aplicada!** Configure a variável no dashboard do Vercel.

