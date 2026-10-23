# Promotor PWA v2

App do Promotor Mustafá - PWA offline-first com React, Vite e IndexedDB.

## Rodar Localmente

### Pré-requisitos

- Node.js 18+
- Backend rodando em `http://localhost:3000`

### Instalação

```bash
cd promotor-pwa
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O app estará disponível em `http://localhost:5174`.

O proxy do Vite encaminha requisições `/api/*` para o backend automaticamente.

### Testes

```bash
npm run test:run    # Rodar uma vez
npm run test        # Watch mode
```

### Build

```bash
npm run build
```

Os arquivos ficam em `dist/`.

## Preview HTTPS para Testar no Celular

GPS e câmera exigem HTTPS. Para testar no celular físico:

### Opção 1: Vercel / Firebase Preview (recomendado)

1. Suba o código para uma branch
2. Configure deploy preview no Vercel ou Firebase Hosting
3. Defina `VITE_API_URL` apontando para um backend de **teste** (nunca produção)
4. Acesse a URL HTTPS no Chrome do celular
5. Toque em "Adicionar à tela inicial"

### Opção 2: Túnel local (desenvolvimento rápido)

```bash
# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: PWA com host exposto
cd promotor-pwa && npm run dev -- --host

# Terminal 3: túnel HTTPS (escolha um)
npx localtunnel --port 5174
# ou
ngrok http 5174
```

Configure o túnel também para o backend (porta 3000) e ajuste `VITE_API_URL`.

### Opção 3: Cloudflare Pages

1. Faça fork/push do repo
2. Conecte ao Cloudflare Pages
3. Build command: `cd promotor-pwa && npm run build`
4. Output directory: `promotor-pwa/dist`
5. Variável de ambiente: `VITE_API_URL=https://seu-backend-teste.com`

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base da API | `/api` (usa proxy em dev) |

## Estrutura

```
promotor-pwa/
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas do app
│   ├── services/       # API client, IndexedDB, sync
│   ├── stores/         # Zustand stores
│   └── test/           # Setup de testes
├── public/             # Assets estáticos (ícones PWA)
└── dist/               # Build de produção
```

## Tecnologias

- React 18 + TypeScript
- Vite + vite-plugin-pwa
- Zustand (state management)
- IndexedDB via idb (offline storage)
- Tailwind CSS
- Vitest (testes)
