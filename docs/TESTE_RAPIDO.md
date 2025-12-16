# ⚡ Teste Rápido - 5 Minutos

Guia rápido para testar o sistema em 5 minutos.

## 1️⃣ Iniciar Backend (Terminal 1)

```bash
cd backend
npm install  # Se ainda não instalou
npm run dev
```

**Verificar:** Deve aparecer "Server running on port 3000"

## 2️⃣ Iniciar Web (Terminal 2)

```bash
cd web
npm install  # Se ainda não instalou
npm run dev
```

**Verificar:** Deve abrir em `http://localhost:5173`

## 3️⃣ Testar Web

1. Acesse `http://localhost:5173`
2. Login: `supervisor@teste.com` / `senha123`
3. Verifique o Dashboard (deve mostrar estatísticas)
4. Clique em um promotor → "Ver Detalhes"
5. Clique em "Ver Rota" (se houver visitas)

## 4️⃣ Iniciar Mobile (Terminal 3)

```bash
cd mobile
npm install  # Se ainda não instalou
npx expo start
```

**Verificar:** Deve aparecer QR code

## 5️⃣ Testar Mobile

1. Escaneie o QR code com Expo Go
2. Login: `promotor1@teste.com` / `senha123`
3. Clique em "Iniciar Nova Visita"
4. Selecione uma indústria
5. Faça check-in (simulado)
6. Adicione fotos
7. Faça checkout

## ✅ Verificar Resultado

Volte ao web e verifique:
- Dashboard atualizado
- Nova visita nos detalhes do promotor
- Rota no mapa

**Pronto!** Sistema funcionando! 🎉
