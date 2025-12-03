# 📱 Como Usar o Aplicativo - Guia Completo

## 🚀 Primeiro Acesso

### 1. Acesse o Frontend
Abra no navegador: `https://mustafa-all-systems-web.vercel.app` (sua URL do Vercel)

### 2. Faça Login
- **Email**: `supervisor@teste.com`
- **Senha**: `senha123`

### 3. Você verá o Dashboard
A tela inicial mostra estatísticas e visão geral do sistema.

---

## 📊 Entendendo o Menu Lateral

O aplicativo tem 5 seções principais:

### 🏠 **Dashboard** (Página Inicial)
- Visão geral do sistema
- Estatísticas de visitas
- KPIs principais
- Lista de promotores ativos
- Status das rotas

### 🏪 **Gerenciar Lojas**
- Cadastrar novas lojas
- Editar lojas existentes
- Ver lista de todas as lojas
- Definir localização (latitude/longitude)

### 🗺️ **Configurar Rotas**
- Atribuir lojas aos promotores
- Definir ordem das visitas
- Gerenciar rotas de cada promotor
- Arrastar e soltar para reordenar

### 📈 **Relatórios**
- Exportar dados em PDF, Excel, PowerPoint
- Filtrar por período
- Relatórios de visitas
- Análises de desempenho

### ⚙️ **Configurações**
- Configurações do sistema
- Perfil do usuário
- Preferências

---

## 🎯 Fluxo de Trabalho Básico

### Passo 1: Cadastrar Lojas
1. Clique em **"Gerenciar Lojas"** no menu
2. Clique em **"Adicionar Loja"** ou **"Nova Loja"**
3. Preencha:
   - Nome da loja
   - Endereço completo
   - Localização (latitude/longitude) - pode usar Google Maps
4. Salve

### Passo 2: Configurar Rotas
1. Clique em **"Configurar Rotas"**
2. Selecione um **Promotor** no dropdown
3. Arraste as lojas da lista "Lojas Disponíveis" para "Rota do Promotor"
4. Reordene arrastando as lojas na rota
5. Salve a configuração

### Passo 3: Monitorar Visitas
1. No **Dashboard**, veja as visitas em tempo real
2. Clique em um promotor para ver detalhes
3. Veja fotos, horários de check-in/check-out
4. Acompanhe o progresso das rotas

### Passo 4: Gerar Relatórios
1. Vá em **"Relatórios"**
2. Selecione o período
3. Escolha o formato (PDF, Excel, PowerPoint)
4. Baixe o relatório

---

## 👥 Funcionalidades por Perfil

### 👨‍💼 **Supervisor** (Você está logado como)
- ✅ Ver todos os promotores
- ✅ Gerenciar lojas
- ✅ Configurar rotas
- ✅ Ver relatórios completos
- ✅ Acessar todas as funcionalidades

### 👷 **Promotor** (via app mobile)
- ✅ Ver suas rotas atribuídas
- ✅ Fazer check-in nas lojas
- ✅ Tirar fotos
- ✅ Fazer check-out
- ✅ Ver histórico de visitas

---

## 🎨 Interface do Dashboard

O Dashboard mostra:

### Cards de Estatísticas:
- **Total de Visitas**: Quantidade de visitas realizadas
- **Promotores Ativos**: Quantos promotores estão trabalhando
- **Lojas Visitadas**: Quantas lojas foram visitadas
- **Taxa de Conclusão**: Percentual de rotas completadas

### Lista de Promotores:
- Nome e email
- Status (ativo/inativo)
- Visitas do dia
- Horas trabalhadas
- Clique para ver detalhes

### Gráficos:
- Visitas por dia
- Desempenho por promotor
- Status das rotas

---

## 🏪 Gerenciar Lojas

### Adicionar Nova Loja:
1. Clique em **"Adicionar Loja"** ou botão **"+"**
2. Preencha o formulário:
   ```
   Nome: Loja ABC
   Endereço: Rua Exemplo, 123 - São Paulo, SP
   Latitude: -23.5505
   Longitude: -46.6333
   ```
3. **Dica**: Use Google Maps para pegar coordenadas:
   - Abra Google Maps
   - Clique com botão direito no local
   - Copie as coordenadas

### Editar Loja:
1. Clique na loja na lista
2. Clique em **"Editar"**
3. Modifique os dados
4. Salve

### Deletar Loja:
1. Clique na loja
2. Clique em **"Deletar"** ou ícone de lixeira
3. Confirme

---

## 🗺️ Configurar Rotas

### Atribuir Lojas a um Promotor:
1. Selecione o **Promotor** no dropdown
2. Veja as lojas disponíveis à esquerda
3. **Arraste** as lojas para a área "Rota do Promotor"
4. **Reordene** arrastando as lojas na rota
5. Clique em **"Salvar Rota"**

### Dicas:
- A ordem importa! A primeira loja será visitada primeiro
- Você pode adicionar várias lojas
- Pode remover lojas da rota arrastando de volta

---

## 📈 Relatórios

### Gerar Relatório:
1. Vá em **"Relatórios"**
2. Selecione:
   - **Período**: Data inicial e final
   - **Formato**: PDF, Excel, PowerPoint ou HTML
   - **Filtros**: Promotores específicos, lojas, etc.
3. Clique em **"Gerar Relatório"**
4. Aguarde o processamento
5. Baixe o arquivo

### Tipos de Relatórios:
- **Visitas**: Lista todas as visitas no período
- **Desempenho**: Análise de produtividade
- **Fotos**: Relatório com fotos das visitas
- **Rotas**: Status das rotas configuradas

---

## 🔍 Ver Detalhes de um Promotor

1. No **Dashboard**, clique no card de um promotor
2. Ou vá em **"Promotores"** e clique em um nome
3. Você verá:
   - Informações pessoais
   - Histórico de visitas
   - Fotos tiradas
   - Horários de check-in/check-out
   - Mapa com localizações
   - Estatísticas pessoais

---

## 📱 App Mobile (Para Promotores)

Os promotores usam o app mobile para:
- Ver suas rotas atribuídas
- Fazer check-in ao chegar na loja
- Tirar fotos obrigatórias
- Fazer check-out ao sair
- Ver histórico de visitas

**Nota**: O app mobile precisa ser configurado separadamente.

---

## 🆘 Problemas Comuns

### Não consigo fazer login
- Verifique se o seed foi executado
- Confirme email e senha: `supervisor@teste.com` / `senha123`

### Erro ao carregar dados
- Verifique se o backend está online: `https://promo-gestao-backend.onrender.com/health`
- Verifique o console do navegador (F12)

### Lojas não aparecem
- Certifique-se de ter cadastrado lojas em "Gerenciar Lojas"
- Verifique se há lojas no banco de dados

### Rotas não salvam
- Verifique se há promotores cadastrados
- Verifique se há lojas disponíveis
- Veja os logs do backend no Render

---

## 🎯 Próximos Passos

1. ✅ **Cadastre suas lojas reais**
2. ✅ **Crie mais promotores** (se necessário)
3. ✅ **Configure as rotas** para cada promotor
4. ✅ **Configure o app mobile** para os promotores
5. ✅ **Teste o fluxo completo**

---

## 📚 Recursos Adicionais

- **Backend API**: `https://promo-gestao-backend.onrender.com/api`
- **Health Check**: `https://promo-gestao-backend.onrender.com/health`
- **Documentação API**: Veja os controllers no código

---

**🎉 Pronto para começar! Explore o aplicativo e configure conforme sua necessidade!**

