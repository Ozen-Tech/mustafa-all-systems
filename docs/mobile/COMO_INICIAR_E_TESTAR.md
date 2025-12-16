# 📱 Como Iniciar e Testar o App Mobile

## 📋 Pré-requisitos

1. **Node.js** instalado (versão 18 ou superior)
2. **Expo CLI** instalado globalmente:
   ```bash
   npm install -g expo-cli
   ```
3. **Expo Go** instalado no seu celular:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 🚀 Passo a Passo

### 1. Instalar Dependências

```bash
cd mobile
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na pasta `mobile`:

```bash
cd mobile
cp env-template.txt .env
```

Edite o arquivo `.env` com a URL correta da API:

**Para dispositivo físico (celular real):**
```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000/api
```

**Para descobrir seu IP local:**
- **macOS/Linux:**
  ```bash
  ifconfig | grep "inet " | grep -v 127.0.0.1
  ```
- **Windows:**
  ```bash
  ipconfig
  ```
  Procure por "IPv4 Address" na seção da sua conexão Wi-Fi/Ethernet

**Exemplo:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

**Para emulador Android:**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

**Para emulador iOS:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Garantir que o Backend está Rodando

Em outro terminal, inicie o backend:

```bash
cd backend
npm run dev
```

O backend deve estar rodando em `http://localhost:3000`

### 4. Iniciar o App Mobile

```bash
cd mobile
npm start
```

Isso abrirá o Expo DevTools no navegador e mostrará um QR code.

### 5. Conectar o Dispositivo

**Opção A: Dispositivo Físico (Recomendado)**
1. Abra o app **Expo Go** no seu celular
2. Escaneie o QR code exibido no terminal ou no navegador
3. O app será carregado no seu celular

**Opção B: Emulador**
- **Android:** Pressione `a` no terminal ou clique em "Run on Android device/emulator"
- **iOS:** Pressione `i` no terminal (apenas no macOS) ou clique em "Run on iOS simulator"

### 6. Testar o App

#### Login
Use as credenciais de teste:
- **Email:** `promotor1@teste.com`
- **Senha:** `senha123`

#### Fluxo de Teste Completo

1. **Login**
   - Abra o app
   - Faça login com as credenciais acima

2. **Home Screen**
   - Você verá a tela inicial com opções de navegação
   - Clique em "Iniciar Nova Visita"

3. **Selecionar Loja**
   - Uma lista de lojas será exibida
   - Selecione uma loja

4. **Check-in**
   - Permita acesso à câmera e localização quando solicitado
   - Tire uma foto da fachada
   - Confirme o check-in

5. **Visita Ativa**
   - Você verá a tela de visita ativa
   - Pode tirar mais fotos durante a visita
   - Pode fazer pesquisa de preços

6. **Check-out**
   - Quando terminar, faça o check-out
   - Tire uma foto final
   - Confirme o check-out

7. **Histórico**
   - Veja suas visitas anteriores
   - Visualize fotos e detalhes

## 🔧 Comandos Úteis

```bash
# Iniciar o app
npm start

# Limpar cache e reiniciar
npm start -- --clear

# Iniciar apenas para Android
npm run android

# Iniciar apenas para iOS
npm run ios

# Iniciar para web (navegador)
npm run web
```

## 🐛 Solução de Problemas

### Erro: "Network request failed"
- Verifique se o backend está rodando
- Confirme que o IP no `.env` está correto
- Certifique-se de que o celular e o computador estão na mesma rede Wi-Fi
- Desative o firewall temporariamente para testar

### Erro: "Cannot connect to Metro"
- Feche o terminal e reinicie com `npm start`
- Limpe o cache: `npm start -- --clear`

### App não carrega
- Verifique se todas as dependências foram instaladas: `npm install`
- Reinicie o Expo: `npm start -- --clear`
- Reinicie o Expo Go no celular

### Câmera não funciona
- Verifique se as permissões foram concedidas
- No Android, verifique as permissões nas configurações do app
- No iOS, verifique em Configurações > Expo Go > Câmera

### Localização não funciona
- Verifique se o GPS está ativado no celular
- Conceda permissão de localização quando solicitado
- No Android, verifique as permissões nas configurações do app

## 📝 Notas Importantes

1. **Rede Local:** O celular e o computador devem estar na mesma rede Wi-Fi
2. **Backend:** O backend deve estar rodando antes de iniciar o mobile
3. **Variáveis de Ambiente:** Após alterar o `.env`, reinicie o Expo (`npm start`)
4. **Hot Reload:** O app atualiza automaticamente quando você salva arquivos
5. **Logs:** Use `console.log()` para debug - os logs aparecem no terminal do Expo

## 🎯 Próximos Passos

Após testar o fluxo básico:
- Teste upload de múltiplas fotos
- Teste pesquisa de preços
- Verifique se as visitas aparecem no dashboard web
- Teste em diferentes dispositivos

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no terminal do Expo
2. Verifique os logs do backend
3. Confirme que todas as configurações estão corretas
4. Tente limpar o cache e reiniciar

