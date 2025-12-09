# 🔧 Corrigir Logo/Ícone do App

## Problema

O logo atual (`assets/images/logo.png`) não é quadrado (4689x4095), mas o Expo requer que os ícones sejam quadrados para funcionar corretamente no Android.

## Solução Rápida

### Opção 1: Criar Logo Quadrado Manualmente

1. Abra o logo atual em um editor de imagens (Photoshop, GIMP, Canva, etc.)
2. Redimensione para 1024x1024 pixels (ou qualquer tamanho quadrado)
3. Centralize o logo e adicione padding/background se necessário
4. Salve como `assets/images/logo-square.png`
5. Atualize o `app.json`:

```json
"icon": "./assets/images/logo-square.png",
"android": {
  "icon": "./assets/images/logo-square.png",
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/logo-square.png",
    "backgroundColor": "#ffffff"
  }
}
```

### Opção 2: Usar Ferramenta Online

1. Acesse https://www.iloveimg.com/resize-image ou similar
2. Faça upload do logo atual
3. Redimensione para 1024x1024 (mantendo proporção ou preenchendo com fundo branco)
4. Baixe e substitua o arquivo

### Opção 3: Usar Expo Icon Generator (Temporário)

Por enquanto, podemos usar um ícone padrão do Expo para o build funcionar:

```bash
# Gerar ícones automaticamente (requer imagem quadrada)
npx expo install @expo/vector-icons
```

## Tamanhos Recomendados

- **Ícone principal**: 1024x1024 pixels
- **Adaptive Icon (Android)**: 1024x1024 pixels (foreground)
- **Splash Screen**: 1242x2436 pixels (ou proporcional)

## Após Corrigir

1. Execute `npx expo-doctor` para verificar
2. Tente o build novamente: `eas build --platform android --profile preview`

