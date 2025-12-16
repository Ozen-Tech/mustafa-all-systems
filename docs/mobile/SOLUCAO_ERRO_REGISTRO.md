# 🔧 Solução: Erro "main has not been registered"

## Erro
```
ERROR  Invariant Violation: "main" has not been registered. This can happen if:
* Metro (the local dev server) is run from the wrong folder. Check if Metro is running, stop it and restart it in the current project.
* A module failed to load due to an error and `AppRegistry.registerComponent` wasn't called.
```

## Causas Comuns

1. **Metro rodando na pasta errada**
2. **Erro de importação que impede o código de executar**
3. **Cache corrompido**
4. **Problema com node_modules**

## Solução Rápida

### Opção 1: Script Automático
```bash
cd mobile
./fix-registration-error.sh
npm start -- --clear
```

### Opção 2: Manual

1. **Parar todos os processos:**
   ```bash
   # Pressione Ctrl+C no terminal do Metro
   # Ou mate os processos:
   pkill -f "expo start"
   pkill -f "metro"
   ```

2. **Limpar cache:**
   ```bash
   cd mobile
   rm -rf .expo
   rm -rf node_modules/.cache
   rm -rf .metro
   npm cache clean --force
   ```

3. **Verificar arquivos:**
   ```bash
   # Certifique-se de que index.js existe e está correto
   cat index.js
   
   # Certifique-se de que App.tsx existe
   cat App.tsx
   ```

4. **Reiniciar:**
   ```bash
   npm start -- --clear
   ```

## Verificações

### 1. Verificar index.js
O arquivo `index.js` deve conter:
```javascript
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('main', () => App);
```

### 2. Verificar App.tsx
O arquivo `App.tsx` deve exportar um componente padrão:
```typescript
export default function App() {
  return (...);
}
```

### 3. Verificar imports
Certifique-se de que todos os imports estão corretos:
- Não há imports circulares
- Todos os módulos existem
- Não há erros de sintaxe

### 4. Verificar logs
Procure por erros no console do Metro antes do erro de registro:
```bash
# Os logs devem mostrar:
📱 Registrando componente principal...
🚀 App.tsx carregado
✅ Componente registrado com sucesso!
```

## Se o erro persistir

### Teste com App Mínimo

1. **Criar App.minimal.tsx:**
   ```typescript
   import React from 'react';
   import { View, Text } from 'react-native';
   
   export default function App() {
     return (
       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <Text>App funcionando!</Text>
       </View>
     );
   }
   ```

2. **Substituir temporariamente:**
   ```bash
   mv App.tsx App.full.tsx
   cp App.minimal.tsx App.tsx
   npm start -- --clear
   ```

3. **Se funcionar:**
   - O problema está nos imports do App completo
   - Adicione os imports um por um para identificar o problema

4. **Se não funcionar:**
   - Problema mais fundamental (Metro, node_modules, etc.)
   - Tente reinstalar dependências:
     ```bash
     rm -rf node_modules
     npm install
     npm start -- --clear
     ```

## Erro Adicional: DETECT_SCREEN_CAPTURE

Se você também ver:
```
ERROR  Error: Exception in HostObject::get for prop 'NativeUnimoduleProxy': 
java.lang.SecurityException: Permission Denial: registerScreenCaptureObserver 
requires android.permission.DETECT_SCREEN_CAPTURE
```

Este é um aviso do Android e não impede o app de funcionar. Pode ser ignorado ou você pode adicionar a permissão no `app.json`:

```json
"android": {
  "permissions": [
    "CAMERA",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "DETECT_SCREEN_CAPTURE"
  ]
}
```

## Próximos Passos

Após corrigir:
1. Teste o login
2. Teste a navegação
3. Teste o check-in
4. Verifique se as visitas aparecem no dashboard web

## Ajuda Adicional

Se nada funcionar:
1. Verifique a versão do Node.js: `node --version` (deve ser 18+)
2. Verifique a versão do npm: `npm --version`
3. Tente com Expo CLI: `npx expo start -c`
4. Verifique os logs completos do Metro para outros erros

