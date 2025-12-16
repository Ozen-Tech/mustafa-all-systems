# ✅ Correção do Vercel - Root Directory

## Problema

O `vercel.json` estava usando `rootDirectory` que não é uma propriedade válida do schema do Vercel.

## Solução

Removida a propriedade `rootDirectory` do `vercel.json`. 

**O Vercel detecta automaticamente o diretório raiz do projeto**, mas para projetos em monorepo, você precisa configurar no dashboard.

## Como Configurar no Dashboard do Vercel

### Opção 1: Durante a Importação (Recomendado)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New** > **Project**
3. Importe o repositório
4. Na seção **Configure Project**, encontre **Root Directory**
5. Selecione ou digite: `web`
6. Configure as outras opções:
   - **Framework Preset**: Vite (ou detectar automaticamente)
   - **Build Command**: `npm run build` (já está no vercel.json)
   - **Output Directory**: `dist` (já está no vercel.json)
7. Adicione a variável de ambiente:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://seu-backend.onrender.com/api`
8. Clique em **Deploy**

### Opção 2: Após a Importação

1. Acesse seu projeto no Vercel Dashboard
2. Vá em **Settings** > **General**
3. Role até **Root Directory**
4. Clique em **Edit**
5. Digite: `web`
6. Clique em **Save**

## Arquivo Corrigido

O `vercel.json` agora está sem a propriedade inválida. O Vercel usará as configurações do arquivo, mas o **Root Directory deve ser configurado no dashboard**.

## Verificação

Após configurar:
1. O Vercel executará os comandos dentro do diretório `web/`
2. O build será executado corretamente
3. Os arquivos serão servidos de `web/dist/`

---

✅ **Correção aplicada!** Configure o Root Directory no dashboard do Vercel.

