# 🔧 Correção dos Erros

## Problemas Identificados

1. **Assets não encontrados** - `splash.png`, `icon.png`, etc.
2. **"main" has not been registered** - AppRegistry não está sendo chamado

## Correções Aplicadas

### 1. Removidas referências a assets no `app.json`
- Removido `icon: "./assets/icon.png"`
- Removido `splash.image: "./assets/splash.png"`
- Removido `adaptiveIcon.foregroundImage`
- Removido `favicon`

O Expo usará assets padrão automaticamente.

### 2. Verificado `index.js`
O arquivo `index.js` está correto e usa `registerRootComponent` do Expo.

## Próximos Passos

1. **Limpar cache do Metro:**
   ```bash
   cd mobile
   npm start -- --clear
   ```

2. **Reinstalar dependências (se necessário):**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Reiniciar o servidor:**
   ```bash
   npm start
   ```

## Se o erro persistir

O erro "main has not been registered" geralmente acontece quando:
- Há um erro de sintaxe no código que impede o registro
- Algum import está falhando silenciosamente
- O Metro precisa ser reiniciado

**Solução:**
1. Pare o Metro (Ctrl+C)
2. Limpe o cache: `npm start -- --clear`
3. Reinicie: `npm start`

