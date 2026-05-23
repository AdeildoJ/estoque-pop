# Configurar banco na Vercel (obrigatório)

A Vercel **não grava arquivos**. Sem banco, o n8n recebe erro 500.

Escolha **UMA** opção abaixo.

---

## Opção A — Redis na Vercel (mais rápido)

1. [vercel.com](https://vercel.com) → projeto **estoque-pop**
2. Aba **Storage** → **Create Database** → **Upstash Redis**
3. **Connect to Project** → selecione **estoque-pop**
4. **Deployments** → ⋯ → **Redeploy**
5. Teste o n8n de novo

---

## Opção B — Supabase (alternativa grátis)

### 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) → **Start your project**
2. Crie um projeto novo (grátis)

### 2. Criar tabela

1. No Supabase: **SQL Editor** → **New query**
2. Cole o conteúdo do arquivo `supabase/schema.sql` deste repositório
3. Clique **Run**

### 3. Copiar chaves

1. **Project Settings** → **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Colar na Vercel

1. Projeto **estoque-pop** → **Settings** → **Environment Variables**
2. Adicione:

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` |

3. Marque **Production**, **Preview**, **Development**
4. **Save** → **Deployments** → **Redeploy**

### 5. Testar

Rode o fluxo no n8n. Deve retornar **201** com `"sucesso": true`.

---

## URLs do n8n

| Uso | URL |
|-----|-----|
| Tela | https://estoque-pop.vercel.app/ |
| POST n8n | https://estoque-pop.vercel.app/api/webhook |
