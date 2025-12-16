# 🔧 Solução: Erro Contínuo no Login

## Problema Identificado

O erro "Erro ao fazer login" estava acontecendo porque:
1. ❌ **Arquivo `.env` não existia** - A API estava usando `localhost` que não funciona no dispositivo físico
2. ❌ **Tratamento de erro genérico** - Não mostrava a causa real do problema

## ✅ Correções Aplicadas

### 1. Criado arquivo `.env`
- ✅ IP detectado automaticamente: `192.168.15.20`
- ✅ Arquivo criado em: `mobile/.env`
- ✅ Conteúdo: `EXPO_PUBLIC_API_URL=http://192.168.15.20:3000/api`

### 2. Melhorado tratamento de erro
- ✅ Mensagens de erro mais específicas
- ✅ Logs detalhados no console
- ✅ Diferenciação entre erros de rede e erros da API

### 3. Adicionados logs de debug
- ✅ Log da URL da API sendo usada
- ✅ Log das requisições
- ✅ Log dos erros detalhados

## 🚀 Próximos Passos

### 1. Reiniciar o Expo

```bash
cd mobile

# Parar o Metro (Ctrl+C se estiver rodando)

# Limpar cache
rm -rf .expo
rm -rf node_modules/.cache

# Reiniciar
npm start -- --clear
```

### 2. Verificar se o Backend está Rodando

Em outro terminal:

```bash
cd backend
npm run dev
```

O backend deve estar rodando em `http://localhost:3000`

### 3. Verificar os Logs

No console do Metro, você deve ver:

```
🔧 Configuração da API:
   EXPO_PUBLIC_API_URL: http://192.168.15.20:3000/api
   API_URL final: http://192.168.15.20:3000/api
```

Quando tentar fazer login:

```
🔐 Tentando fazer login...
📧 Email: promotor1@teste.com
🌐 URL da API: http://192.168.15.20:3000/api/auth/login
📤 Enviando requisição de login...
✅ Resposta recebida: 200
✅ Login bem-sucedido!
```

## 🔍 Verificações

### Se ainda der erro, verifique:

1. **Backend está rodando?**
   ```bash
   curl http://localhost:3000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"promotor1@teste.com","password":"senha123"}'
   ```
   Deve retornar um JSON com `accessToken`.

2. **IP está correto?**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Verifique se o IP no `.env` está correto.

3. **Mesma rede Wi-Fi?**
   - Celular e computador devem estar na mesma rede
   - Não use dados móveis no celular

4. **Firewall bloqueando?**
   - Desative temporariamente o firewall para testar
   - Ou permita conexões na porta 3000

## 📝 Credenciais de Teste

- **Email:** `promotor1@teste.com`
- **Senha:** `senha123`

## 🐛 Erros Comuns e Soluções

### "Network request failed"
- ✅ Verifique se o backend está rodando
- ✅ Verifique se o IP no `.env` está correto
- ✅ Verifique se estão na mesma rede Wi-Fi
- ✅ Reinicie o Expo após alterar o `.env`

### "Invalid credentials"
- ✅ Verifique se o seed foi executado: `cd backend && npm run seed`
- ✅ Use as credenciais corretas: `promotor1@teste.com` / `senha123`

### "Cannot connect"
- ✅ Verifique se o backend está rodando
- ✅ Verifique o firewall
- ✅ Teste a URL no navegador: `http://192.168.15.20:3000/api/auth/login`

## 📊 Logs de Debug

Agora os logs mostram:
- ✅ URL da API sendo usada
- ✅ Tipo de erro (rede, API, etc.)
- ✅ Mensagens específicas do erro

Verifique o console do Metro para ver os logs detalhados!

