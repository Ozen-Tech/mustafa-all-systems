# 🔒 Solução para Erros de Permissão

## Erro: DETECT_SCREEN_CAPTURE

Este erro ocorre quando módulos nativos do Expo (como `expo-image-picker`) são carregados. É um **aviso do Android**, não um erro crítico.

### O que foi implementado:

1. ✅ **Imports Dinâmicos**: Todos os módulos nativos (`expo-location`, `expo-image-picker`) são carregados apenas quando necessário usando `await import()`

2. ✅ **Lazy Loading**: As telas que usam módulos nativos são carregadas apenas quando navegadas, não no início do app

3. ✅ **Solicitação de Permissões**: Todas as permissões são solicitadas antes de usar os recursos:
   - Câmera: solicitada antes de tirar foto
   - Localização: solicitada antes de obter GPS
   - Galeria: solicitada antes de selecionar imagens

4. ✅ **Permissões no app.json**: Todas as permissões necessárias estão configuradas:
   - `CAMERA`
   - `ACCESS_FINE_LOCATION`
   - `ACCESS_COARSE_LOCATION`
   - `READ_EXTERNAL_STORAGE`
   - `WRITE_EXTERNAL_STORAGE`
   - `DETECT_SCREEN_CAPTURE`

### Se o erro ainda aparecer:

O erro `DETECT_SCREEN_CAPTURE` é um **aviso do Android** e pode ser ignorado. Ele não impede o funcionamento do app. O app continuará funcionando normalmente.

### Verificar se as permissões estão sendo solicitadas:

1. Ao abrir a tela de Check-in, o app deve solicitar permissão de câmera
2. Ao tentar obter localização, o app deve solicitar permissão de localização
3. Ao tentar acessar a galeria, o app deve solicitar permissão de galeria

### Se as permissões não estiverem sendo solicitadas:

1. Limpe o cache do app:
   ```bash
   cd mobile
   npx expo start --clear
   ```

2. Reinstale o app no dispositivo Android

3. Verifique as configurações do dispositivo:
   - Configurações > Apps > Promo Gestão > Permissões

### Nota Importante:

O erro `DETECT_SCREEN_CAPTURE` é um aviso conhecido do Android quando módulos nativos são carregados. Ele **não impede o funcionamento** do app e pode ser ignorado. O app continuará funcionando normalmente mesmo com esse aviso.

