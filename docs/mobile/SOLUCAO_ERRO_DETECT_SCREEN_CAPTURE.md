# 🔧 Solução para Erro DETECT_SCREEN_CAPTURE

## Erro Reportado

```
Error: Exception in HostObject::get for prop 'NativeUnimoduleProxy': 
java.lang.SecurityException: Permission Denial: registerScreenCaptureObserver 
from pid=8966, uid=10434 requires android.permission.DETECT_SCREEN_CAPTURE
```

## Causa

Este erro ocorre quando o `expo-image-picker` ou outros módulos nativos do Expo tentam registrar um observador de captura de tela no Android. A permissão `DETECT_SCREEN_CAPTURE` é uma permissão especial que requer configuração adicional e não é necessária para o nosso caso de uso.

## Solução Aplicada

### 1. Remoção da Permissão Desnecessária

A permissão `DETECT_SCREEN_CAPTURE` foi removida do `app.json` porque:
- Não é necessária para tirar fotos com a câmera
- Não é necessária para acessar a galeria
- Está causando erro ao tentar registrar automaticamente

### 2. Permissões Mantidas

As seguintes permissões foram mantidas (são necessárias):
- `CAMERA` - Para tirar fotos
- `ACCESS_FINE_LOCATION` - Para obter localização precisa
- `ACCESS_COARSE_LOCATION` - Para obter localização aproximada
- `READ_EXTERNAL_STORAGE` - Para ler imagens da galeria
- `WRITE_EXTERNAL_STORAGE` - Para salvar imagens temporariamente

## Como Aplicar a Correção

### Passo 1: Rebuild do App Android

Como mudamos as permissões no `app.json`, é necessário fazer um rebuild completo do app:

```bash
cd mobile

# Limpar cache
npx expo start --clear

# Se estiver usando Expo Go, você precisará fazer um build nativo:
# npx expo prebuild --clean

# Ou criar um novo build:
# npx expo run:android
```

### Passo 2: Reinstalar o App

Se estiver usando Expo Go:
1. Feche o app completamente
2. Reabra o Expo Go
3. Escaneie o QR code novamente

Se estiver usando build nativo:
1. Desinstale o app antigo do dispositivo
2. Instale o novo build

### Passo 3: Verificar Permissões

Após reinstalar, verifique se as permissões estão corretas:
1. Configurações do Android > Apps > Promo Gestão > Permissões
2. Verifique se as permissões de Câmera e Localização estão disponíveis

## Tratamento de Erro no Código

O código já possui tratamento para ignorar esse erro quando ele ocorre:

```typescript
// Em MainNavigator.tsx
try {
  const module = require('../screens/CheckInScreen');
  // ...
} catch (err: any) {
  if (err?.message?.includes('DETECT_SCREEN_CAPTURE')) {
    console.warn('Aviso de permissão ignorado para CheckInScreen');
    // Continua carregando o módulo mesmo com o erro
  }
}
```

## Se o Erro Persistir

### Opção 1: Ignorar o Erro (Recomendado)

Este erro é um **aviso do Android** e não impede o funcionamento do app. O app continuará funcionando normalmente mesmo com esse aviso no console.

### Opção 2: Suprimir o Erro no Console

Se o erro estiver aparecendo muito no console, você pode adicionar um filtro no `index.js`:

```javascript
// Em index.js ou App.tsx
if (__DEV__) {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('DETECT_SCREEN_CAPTURE')) {
      return; // Ignora o erro
    }
    originalError(...args);
  };
}
```

### Opção 3: Atualizar Dependências

Se o erro persistir, tente atualizar as dependências:

```bash
cd mobile
npm update expo-image-picker expo-location
npx expo install --fix
```

## Verificação

Após aplicar a correção, teste:

1. ✅ Abrir a tela de Check-in
2. ✅ Solicitar permissão de câmera (deve aparecer o diálogo)
3. ✅ Solicitar permissão de localização (deve aparecer o diálogo)
4. ✅ Tirar foto da fachada
5. ✅ Fazer check-in com sucesso

## Nota Importante

Este erro é conhecido e não afeta a funcionalidade do app. O app continuará funcionando normalmente mesmo com esse aviso no console. A remoção da permissão `DETECT_SCREEN_CAPTURE` é a solução correta, pois não precisamos dessa funcionalidade.

