# 🔧 Correção: Erro "Host unreachable"

## Problema Identificado

O erro "Host unreachable" acontecia porque:
1. ❌ **IP incorreto no `.env`**: Estava configurado como `192.168.15.20` mas o IP atual é `192.168.1.125`
2. ⚠️ **Backend pode não estar acessível na rede**: Precisa escutar em `0.0.0.0` para aceitar conexões de outros dispositivos

## ✅ Correções Aplicadas

### 1. Atualizado `.env` do mobile
- ✅ IP corrigido: `192.168.1.125`
- ✅ Arquivo: `mobile/.env`
- ✅ Conteúdo: `EXPO_PUBLIC_API_URL=http://192.168.1.125:3000/api`

### 2. Backend configurado para escutar em todas as interfaces
- ✅ Alterado `app.listen(PORT)` para `app.listen(PORT, '0.0.0.0')`
- ✅ Isso permite que o backend aceite conexões de outros dispositivos na rede

### 3. CORS atualizado
- ✅ Configurado para permitir requisições em desenvolvimento
- ✅ Mobile apps não têm restrições CORS, mas a configuração ajuda

## 🚀 Próximos Passos

### 1. Reiniciar o Backend

```bash
cd backend

# Parar o backend (Ctrl+C se estiver rodando)

# Reiniciar
npm run dev
```

Você deve ver:
```
Server running on port 3000
Accessible at http://localhost:3000 and http://192.168.1.125:3000
```

### 2. Reiniciar o Expo

```bash
cd mobile

# Parar o Metro (Ctrl+C)

# Limpar cache
rm -rf .expo
rm -rf node_modules/.cache

# Reiniciar
npm start -- --clear
```

### 3. Verificar os Logs

No console do Metro, você deve ver:
```
🔧 Configuração da API:
   EXPO_PUBLIC_API_URL: http://192.168.1.125:3000/api
   API_URL final: http://192.168.1.125:3000/api
```

### 4. Testar o Login

Use as credenciais:
- Email: `promotor1@teste.com`
- Senha: `senha123`

## 🔍 Verificações

### Testar se o backend está acessível na rede:

```bash
# Do computador
curl http://192.168.1.125:3000/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

### Se o IP mudar novamente:

1. Descobrir o novo IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Atualizar o `.env`:
   ```bash
   cd mobile
   echo "EXPO_PUBLIC_API_URL=http://NOVO_IP:3000/api" > .env
   ```

3. Reiniciar o Expo

## ⚠️ Importante

- O backend agora escuta em `0.0.0.0`, o que significa que aceita conexões de qualquer IP na rede
- Certifique-se de que o firewall não está bloqueando a porta 3000
- Celular e computador devem estar na mesma rede Wi-Fi

## 🐛 Se Ainda Não Funcionar

1. **Verificar firewall:**
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   ```

2. **Testar conectividade:**
   - No celular, abra o navegador e tente acessar: `http://192.168.1.125:3000/health`
   - Se não funcionar, o problema é de rede/firewall

3. **Verificar se estão na mesma rede:**
   - Celular e computador devem estar conectados à mesma rede Wi-Fi
   - Não use dados móveis no celular

