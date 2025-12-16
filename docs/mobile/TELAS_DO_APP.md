# 📱 Telas do App Mobile - Promo Gestão

## 📋 Estrutura de Navegação

O app possui duas áreas principais de navegação:

### 🔐 Área de Autenticação (AuthNavigator)
- Usuário não logado

### 🏠 Área Principal (MainNavigator)
- Usuário logado
- Navegação por abas (Bottom Tabs) + Stack Navigator

---

## 📱 Lista Completa de Telas

### 1. 🔐 **LoginScreen** (`LoginScreen.tsx`)
**Localização:** Área de Autenticação  
**Função:** Tela de login do promotor

**Funcionalidades:**
- Campo de email
- Campo de senha
- Botão de login
- Validação de credenciais
- Armazenamento de token após login bem-sucedido

**Navegação:**
- Após login bem-sucedido → HomeScreen

---

### 2. 🏠 **HomeScreen** (`HomeScreen.tsx`)
**Localização:** Aba "Início" (Bottom Tab)  
**Função:** Tela inicial do app após login

**Funcionalidades:**
- Verifica se há visita ativa
- Exibe mensagem de boas-vindas
- Botão "Iniciar Nova Visita" (se não houver visita ativa)
- Botão "Continuar Visita" (se houver visita ativa)

**Navegação:**
- "Iniciar Nova Visita" → StoresScreen
- "Continuar Visita" → ActiveVisitScreen

---

### 3. 🏪 **StoresScreen** (`IndustriesScreen.tsx`)
**Localização:** Stack Navigator (modal)  
**Função:** Seleção de loja para iniciar visita

**Funcionalidades:**
- Lista de lojas disponíveis
- Busca/filtro de lojas
- Seleção de loja
- Inicia processo de check-in

**Navegação:**
- Selecionar loja → CheckInScreen

---

### 4. ✅ **CheckInScreen** (`CheckInScreen.tsx`)
**Localização:** Stack Navigator (modal)  
**Função:** Realizar check-in na loja

**Funcionalidades:**
- Solicita permissão de câmera
- Solicita permissão de localização
- Captura foto da fachada
- Obtém coordenadas GPS
- Envia dados de check-in para o backend
- Upload da foto para S3

**Navegação:**
- Check-in bem-sucedido → ActiveVisitScreen

---

### 5. 📍 **ActiveVisitScreen** (`ActiveVisitScreen.tsx`)
**Localização:** Stack Navigator (modal)  
**Função:** Gerenciar visita em andamento

**Funcionalidades:**
- Exibe informações da visita atual
- Mostra loja visitada
- Exibe horário de check-in
- Botão para tirar fotos adicionais
- Botão para pesquisa de preços
- Botão para fazer checkout

**Navegação:**
- "Tirar Foto" → Câmera (modal)
- "Pesquisa de Preços" → PriceResearchScreen
- "Fazer Checkout" → CheckoutScreen

---

### 6. 💰 **PriceResearchScreen** (`PriceResearchScreen.tsx`)
**Localização:** Stack Navigator (modal)  
**Função:** Registrar pesquisa de preços de concorrentes

**Funcionalidades:**
- Formulário para produtos
- Campos de preço
- Comparação com preços da loja
- Salvar pesquisa no backend

**Navegação:**
- Após salvar → Volta para ActiveVisitScreen

---

### 7. 🚪 **CheckoutScreen** (`CheckoutScreen.tsx`)
**Localização:** Stack Navigator (modal)  
**Função:** Finalizar visita (checkout)

**Funcionalidades:**
- Solicita permissão de câmera
- Captura foto final
- Obtém coordenadas GPS finais
- Calcula horas trabalhadas
- Envia dados de checkout para o backend
- Upload da foto para S3

**Navegação:**
- Checkout bem-sucedido → HomeScreen

---

### 8. 📜 **HistoryScreen** (`HistoryScreen.tsx`)
**Localização:** Aba "Histórico" (Bottom Tab)  
**Função:** Visualizar histórico de visitas

**Funcionalidades:**
- Lista de visitas anteriores
- Filtros por data
- Detalhes de cada visita:
  - Loja visitada
  - Data e horário
  - Horas trabalhadas
  - Fotos tiradas
  - Status (concluída/em andamento)

**Navegação:**
- Selecionar visita → Detalhes da visita (se implementado)

---

### 9. 👤 **ProfileScreen** (`ProfileScreen.tsx`)
**Localização:** Aba "Perfil" (Bottom Tab)  
**Função:** Perfil do usuário e configurações

**Funcionalidades:**
- Exibe informações do promotor
- Estatísticas pessoais
- Botão de logout
- Configurações (se implementado)

**Navegação:**
- Logout → LoginScreen

---

### 10. 📸 **VisitScreen** (`VisitScreen.tsx`)
**Localização:** (Possivelmente não utilizada atualmente)  
**Função:** Detalhes de uma visita específica

**Nota:** Esta tela pode estar sendo usada para exibir detalhes completos de uma visita.

---

## 🗺️ Fluxo de Navegação

### Fluxo Principal (Check-in/Checkout):

```
LoginScreen
    ↓
HomeScreen
    ↓ (Iniciar Nova Visita)
StoresScreen
    ↓ (Selecionar Loja)
CheckInScreen
    ↓ (Check-in realizado)
ActiveVisitScreen
    ├─→ PriceResearchScreen (opcional)
    └─→ CheckoutScreen
        ↓ (Checkout realizado)
HomeScreen
```

### Navegação por Abas:

```
┌─────────────────────────────────────┐
│         Bottom Tab Navigator         │
├─────────────┬───────────┬────────────┤
│   Início    │ Histórico │   Perfil   │
│ (HomeScreen)│(HistoryScr)│(ProfileScr)│
└─────────────┴───────────┴────────────┘
```

---

## 📊 Resumo das Telas

| # | Tela | Tipo | Navegação | Status |
|---|------|------|-----------|--------|
| 1 | LoginScreen | Auth | Stack | ✅ Implementada |
| 2 | HomeScreen | Tab | Bottom Tab | ✅ Implementada |
| 3 | StoresScreen | Modal | Stack | ✅ Implementada |
| 4 | CheckInScreen | Modal | Stack | ✅ Implementada |
| 5 | ActiveVisitScreen | Modal | Stack | ✅ Implementada |
| 6 | PriceResearchScreen | Modal | Stack | ✅ Implementada |
| 7 | CheckoutScreen | Modal | Stack | ✅ Implementada |
| 8 | HistoryScreen | Tab | Bottom Tab | ✅ Implementada |
| 9 | ProfileScreen | Tab | Bottom Tab | ✅ Implementada |
| 10 | VisitScreen | - | - | ⚠️ Possivelmente não utilizada |

---

## 🎯 Funcionalidades Principais por Tela

### Autenticação
- ✅ Login com email/senha
- ✅ Armazenamento de token
- ✅ Logout

### Visitas
- ✅ Check-in com foto e GPS
- ✅ Checkout com foto e GPS
- ✅ Gerenciamento de visita ativa
- ✅ Histórico de visitas
- ✅ Upload de fotos para S3

### Pesquisa
- ✅ Pesquisa de preços
- ✅ Comparação com concorrentes

### Perfil
- ✅ Visualização de dados do usuário
- ✅ Logout

---

## 🔄 Próximas Melhorias Sugeridas

1. **Tela de Detalhes da Visita**
   - Visualizar todas as fotos tiradas
   - Mapa com rota percorrida
   - Estatísticas da visita

2. **Tela de Configurações**
   - Alterar senha
   - Configurações de notificações
   - Sobre o app

3. **Melhorias no Histórico**
   - Filtros avançados
   - Gráficos de desempenho
   - Exportar relatórios

4. **Tela de Notificações**
   - Notificações do supervisor
   - Lembretes de visitas

