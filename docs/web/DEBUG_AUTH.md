# 🔍 Debug de Autenticação

## Como verificar se o token está sendo salvo:

1. Abra o DevTools (F12)
2. Vá para a aba "Application" (Chrome) ou "Storage" (Firefox)
3. Clique em "Local Storage" → `http://localhost:5173`
4. Verifique se existem as chaves:
   - `accessToken`
   - `refreshToken`
   - `user`

## Como verificar se o token está sendo enviado:

1. Abra o DevTools (F12)
2. Vá para a aba "Network"
3. Faça uma requisição (ex: recarregue a página)
4. Clique em uma requisição para `/api/supervisors/...`
5. Vá para a aba "Headers"
6. Procure por "Request Headers" → "Authorization"
7. Deve aparecer: `Bearer eyJhbGc...`

## Se o token não estiver sendo enviado:

1. Verifique o console do navegador para erros
2. Verifique se o login foi bem-sucedido
3. Tente fazer logout e login novamente
4. Limpe o localStorage e tente novamente

## Comandos úteis no console:

```javascript
// Ver token atual
localStorage.getItem('accessToken')

// Ver usuário atual
localStorage.getItem('user')

// Limpar tudo
localStorage.clear()

// Verificar se o token está sendo adicionado
// (execute antes de fazer uma requisição)
localStorage.getItem('accessToken')
```


