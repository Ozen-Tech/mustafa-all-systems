# 🐛 Debug: Por que aparece apenas "App funcionando"

## Diagnóstico

Se você está vendo apenas "✅ App funcionando! Se você vê isso, o registro está funcionando", significa que:

1. ✅ O registro do componente está funcionando (por isso você vê a mensagem)
2. ❌ O `App.tsx` real não está sendo carregado
3. ⚠️ O `App.test.tsx` (versão de teste) está sendo usado

## Verificação Rápida

### 1. Verificar qual App está sendo usado

No console do Metro, procure por:
- `✅ App.test.tsx carregado com sucesso!` → Está usando App.test.tsx
- `🚀 App.tsx carregado e renderizando...` → Está usando App.tsx (correto)

### 2. Verificar se há erros

No console do Metro, procure por:
- Erros em vermelho
- Mensagens de "Cannot find module"
- Erros de importação

### 3. Verificar arquivos

```bash
cd mobile
ls -la App*.tsx
```

Você deve ver:
- `App.tsx` - O app real (deve existir)
- `App.test.tsx.backup` - Versão de teste (renomeada)

## Solução

### Passo 1: Limpar tudo

```bash
cd mobile

# Parar o Metro (Ctrl+C)

# Limpar cache completamente
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro
rm -rf android/app/build
rm -rf android/.gradle

# Renomear App.test.tsx para não ser usado
mv App.test.tsx App.test.tsx.backup 2>/dev/null || true
```

### Passo 2: Verificar index.js

O `index.js` deve estar assim:

```javascript
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('main', () => App);
```

### Passo 3: Verificar App.tsx

O `App.tsx` deve começar com:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// ... outros imports

export default function App() {
  console.log('🚀 App.tsx carregado e renderizando...');
  // ...
}
```

### Passo 4: Reiniciar

```bash
npm start -- --clear
```

### Passo 5: Verificar Logs

No console, você deve ver:
```
📱 index.js iniciado
📦 App importado: function
✅ AppRegistry.registerComponent chamado
🚀 App.tsx carregado e renderizando...
```

## Se Ainda Não Funcionar

### Verificar Erros Específicos

1. **Erro de importação:**
   - Verifique se todos os arquivos importados existem
   - Verifique se não há erros de sintaxe

2. **Erro de módulo não encontrado:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Erro de configuração:**
   - Verifique se o `.env` existe e está correto
   - Verifique se o `app.json` está correto

### Teste com App Mínimo

Se ainda não funcionar, teste com um App mínimo:

```bash
# Criar App.minimal.tsx
cat > App.minimal.tsx << 'EOF'
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>App Mínimo Funcionando</Text>
    </View>
  );
}
EOF

# Substituir temporariamente
mv App.tsx App.full.tsx
cp App.minimal.tsx App.tsx

# Reiniciar
npm start -- --clear
```

Se o App mínimo funcionar, o problema está nos imports do App completo.

## Próximos Passos

Após corrigir, o app deve mostrar:
1. **Tela de Login** (se não estiver logado)
2. **Tela Home** (se estiver logado)

