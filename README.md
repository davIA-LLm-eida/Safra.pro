# Safra.pro

Plataforma SaaS multiempresa (multi-tenant) para gestão comercial, financeira, operacional e de equipes, desenvolvida em React, TypeScript, Vite, Tailwind CSS, Express e Supabase (PostgreSQL com Row Level Security).

**Aplicação em produção (Vercel):** [https://safra-pro.vercel.app](https://safra-pro.vercel.app)

---

## Principais Recursos

- **Isolamento multiempresa (Multi-tenant + RLS):** cada empresa acessa exclusivamente seus próprios clientes, processos, tarefas, vendas e lançamentos financeiros via `empresa_id` e políticas RLS no PostgreSQL.
- **Autenticação real com Supabase Auth:** login com e-mail/senha, criação de empresa e perfil administrador, fluxo de convite com token SHA-256 (`criar_convite_empresa` / `aceitar_convite_empresa`), recuperação de senha e persistência de sessão.
- **Controle de papéis por empresa:** `admin`, `gerente` e `membro`, com proteção por privilégios de coluna e triggers no banco.
- **Administrador Principal (dono da plataforma):** acesso separado em `safra_interno.principais`, sem vínculo obrigatório com nenhuma empresa, com visão agregada e somente leitura das empresas cadastradas via `listar_empresas_principal()`.
- **Assistente estratégico com IA (opcional):** integrado via rotas de servidor (`/api/ai/status` e `/api/ai/assist`) usando a SDK `@google/genai`, mantendo a `GEMINI_API_KEY` exclusivamente no servidor.

---

## Requisitos do Sistema

- **Node.js:** versão **20.x ou 22.x LTS** (recomendado **Node.js 22 LTS**; mínimo `>=20.0.0`).
- **npm:** versão **10.x** ou superior (acompanha o Node.js).
- **Projeto Supabase** já configurado com o schema em `supabase/schema.sql` (não execute scripts destrutivos em bancos em produção).

Verifique sua versão instalada no terminal:

```bash
node -v
npm -v
```

---

## 1. Como Baixar o Projeto do GitHub

### Opção A — Baixar o arquivo ZIP

1. Acesse o repositório: `https://github.com/davialm-IAdev/Safra.pro`
2. Clique em **Code** → **Download ZIP**.
3. Extraia o arquivo ZIP para uma pasta local.
4. Abra o terminal dentro da pasta extraída.

### Opção B — Clonar com Git

```bash
git clone https://github.com/davialm-IAdev/Safra.pro.git
cd Safra.pro
```

---

## 2. Como Instalar as Dependências

Execute uma instalação limpa utilizando o `package-lock.json` versionado:

```bash
npm ci
```

> Não utilize `--force` nem `--legacy-peer-deps`. Todas as dependências (incluindo `vite` e `esbuild`) estão alinhadas no `package.json` e `package-lock.json`.

---

## 3. Como Configurar o Supabase e Variáveis de Ambiente

1. Copie o arquivo de exemplo para criar sua configuração local:

   **Linux / macOS:**
   ```bash
   cp .env.example .env.local
   ```

   **Windows (PowerShell):**
   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Preencha o `.env.local` com as chaves do seu projeto Supabase:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-publishable-ou-anon-key-publica
   GEMINI_API_KEY=
   ```

### Onde encontrar as chaves no Supabase

- **`VITE_SUPABASE_URL`**: no painel do Supabase, acesse **Project Settings → Data API** e copie a **Project URL** (`https://<id-do-projeto>.supabase.co`). Não utilize a URL do painel (`supabase.com/dashboard/...`).
- **`VITE_SUPABASE_ANON_KEY`**: em **Project Settings → API Keys**, copie a **Publishable key** (`sb_publishable_...`) ou a **anon public key**.
  - **Nunca** coloque a chave secreta (`service_role` ou `sb_secret_...`) em variáveis `VITE_*` ou no frontend. A aplicação bloqueia automaticamente chaves secretas no navegador.
- **URLs de redirecionamento do Supabase Auth**: em **Authentication → URL Configuration**, adicione:
  - **Site URL**: `http://localhost:3000` (em desenvolvimento) ou sua URL HTTPS da Vercel (em produção).
  - **Redirect URLs**: `http://localhost:3000/**` e `https://seu-dominio.vercel.app/**` para que confirmação de e-mail e recuperação de senha funcionem corretamente.
- **`GEMINI_API_KEY` (opcional)**: utilizada apenas no servidor (`/api/ai/assist`) para o Assistente de IA. Nunca é exposta ao navegador.

> Os arquivos `.env` e `.env.local` estão protegidos no `.gitignore` e nunca devem ser enviados para o GitHub.

---

## 4. Como Iniciar Localmente

Inicie o servidor de desenvolvimento (Express + Vite na porta `3000`):

```bash
npm run dev
```

Acesse no navegador:

```text
http://localhost:3000
```

- A aplicação abrirá na **tela de login**.
- Quando o Supabase estiver configurado, apenas usuários autenticados acessam o painel e nenhum dado fictício de demonstração é utilizado.
- Caso o `.env.local` não esteja configurado, a tela de login exibirá claramente o diagnóstico das variáveis ausentes ou inválidas.

---

## 5. Validação, Testes e Build de Produção Local

Execute os comandos de verificação antes de publicar:

```bash
# Verificação de tipos TypeScript
npm run lint

# Testes unitários (permissões, rotas, lógica financeira e validação Supabase)
npm test

# Build de produção (gera a pasta dist/)
npm run build

# Visualização local do build estático
npm run preview

# Execução completa local em produção (Express + dist/ + /api/ai/* na porta 3000)
npm start
```

---

## 6. Administrador Principal (Dono da Plataforma)

O **Administrador Principal** é controlado exclusivamente no backend PostgreSQL (`safra_interno.principais`) e pelas funções `SECURITY DEFINER` (`sou_principal()` e `listar_empresas_principal()`).

- Nenhum usuário recebe privilégio de Principal automaticamente ao se cadastrar.
- Alterar variáveis no frontend não concede acesso ao painel Principal: o Supabase valida `auth.uid()` e `email_confirmed_at IS NOT NULL` no servidor.
- Para autorizar um usuário específico como Principal:
  1. Crie a conta na aba **"Acesso do Administrador Principal"** na tela de login e confirme o e-mail.
  2. Copie o `UID` exibido na tela após o login.
  3. No **SQL Editor** do painel do Supabase, execute:
     ```sql
     INSERT INTO safra_interno.principais (user_id)
     VALUES ('SEU-USER-UUID-AQUI')
     ON CONFLICT (user_id) DO NOTHING;
     ```
  4. Clique em **"Já ativei no Supabase — entrar como Principal"**.

---

## 7. Como Publicar na Vercel (Endereço Fixo HTTPS)

O projeto já está preparado para implantação na Vercel através de:

- `vercel.json`: configura `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, cabeçalhos de segurança e reescrita SPA (`rewrites`) preservando `/api/*` e garantindo que qualquer rota interna (`/financeiro`, `/tarefas`, `/clientes`, `/processos`, `/equipe`, `/principal`, `/assistente`, `/integracao`) funcione ao atualizar o navegador (`F5`).
- `api/ai/status.ts` e `api/ai/assist.ts`: Serverless Functions da Vercel para manter os endpoints `/api/ai/status` e `/api/ai/assist` funcionando em produção sem expor chaves no frontend.

### Passo a passo para deploy na Vercel

1. Importe o repositório `davialm-IAdev/Safra.pro` no painel da Vercel.
2. Mantenha o preset **Vite** (ou deixe a Vercel ler o `vercel.json` automaticamente).
3. Em **Project Settings → Environment Variables**, cadastre:
   - `VITE_SUPABASE_URL` = URL do seu projeto Supabase (`https://...supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = Publishable / anon key pública do Supabase
   - `GEMINI_API_KEY` = (opcional) Chave da API Gemini para o Assistente de IA
4. Clique em **Deploy**. A Vercel fornecerá automaticamente um endereço fixo com **HTTPS**.
5. Copie a URL HTTPS gerada pela Vercel e cadastre-a em **Authentication → URL Configuration** no Supabase (**Site URL** e **Redirect URLs**).

---

## 8. Solução de Erros Comuns

| Problema | Causa provável | Como resolver |
|---|---|---|
| Erro `ERESOLVE` no `npm install` | Lockfile antigo ou cache inconsistente | Use `npm ci` na versão atualizada do repositório (o conflito entre `vite` e `esbuild` já foi corrigido no `package.json`). |
| Tela de login avisa **"Supabase não configurado"** | Arquivo `.env.local` ausente ou variáveis sem prefixo `VITE_` | Copie `.env.example` para `.env.local`, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e reinicie `npm run dev`. |
| Erro **"URL do painel, não da API"** | Foi colada a URL `https://supabase.com/dashboard/...` | Utilize a **Project URL** em **Project Settings → Data API** (`https://<ref>.supabase.co`). |
| Erro **"Chave secreta detectada"** | Foi colocada a chave `service_role` / `sb_secret_` | Substitua pela chave pública (**Publishable / anon key**). |
| Link de confirmação ou recuperação dá erro | URL da aplicação não liberada no Supabase Auth | Cadastre `http://localhost:3000/**` e/ou `https://seu-app.vercel.app/**` em **Authentication → URL Configuration → Redirect URLs**. |
| Página retorna 404 ao atualizar rota interna | Plataforma sem rewrite SPA | Na Vercel, o arquivo `vercel.json` já redireciona rotas internas para `/index.html`. |
| Usuário Principal não entra no painel central | `user_id` não cadastrado em `safra_interno.principais` ou e-mail não confirmado | Confirme o e-mail da conta e insira o UUID em `safra_interno.principais` pelo SQL Editor do Supabase. |
