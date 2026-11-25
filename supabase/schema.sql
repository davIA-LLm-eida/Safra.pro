-- Schema multi-tenant (por empresa) preparado para Supabase PostgreSQL + Row Level Security (RLS)
-- Execute este script no SQL Editor do seu projeto Supabase.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  segmento TEXT NOT NULL DEFAULT 'Serviços',
  cnpj TEXT,
  plano TEXT NOT NULL DEFAULT 'profissional' CHECK (plano IN ('essencial', 'profissional', 'escala')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Perfis de Usuários vinculados a auth.users e a uma empresa
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT 'Gestor',
  papel TEXT NOT NULL DEFAULT 'admin' CHECK (papel IN ('admin', 'membro')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Clientes por empresa
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  segmento TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'onboarding', 'inativo')),
  observacoes TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Processos Empresariais por empresa
CREATE TABLE IF NOT EXISTS public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'concluido')),
  descricao TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Etapas dos Processos
CREATE TABLE IF NOT EXISTS public.etapas_processo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  concluida BOOLEAN NOT NULL DEFAULT false
);

-- 6. Tarefas por empresa
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'em_andamento', 'em_revisao', 'concluida')),
  prazo DATE NOT NULL,
  responsavel TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance por tenant
CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_processos_empresa ON public.processos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_etapas_processo ON public.etapas_processo(processo_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_empresa_prazo ON public.tarefas(empresa_id, prazo);

-- Função auxiliar para recuperar a empresa do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

-- Habilitar Row Level Security (RLS) em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento estrito por empresa (Multi-tenant)
CREATE POLICY "Empresas: ler apenas a própria empresa"
  ON public.empresas FOR SELECT
  USING (id = public.current_empresa_id());

CREATE POLICY "Perfis: gerenciar perfis da mesma empresa"
  ON public.perfis FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Clientes: isolamento por empresa"
  ON public.clientes FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Processos: isolamento por empresa"
  ON public.processos FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Etapas: isolamento por empresa"
  ON public.etapas_processo FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Tarefas: isolamento por empresa"
  ON public.tarefas FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

-- 7. Vendas / Pipeline comercial por empresa
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
  etapa TEXT NOT NULL DEFAULT 'proposta' CHECK (etapa IN ('prospeccao', 'proposta', 'fechada', 'perdida')),
  data_prevista DATE NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix' CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia')),
  faturada BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Lançamentos Financeiros (Renda, Faturamento e Despesas) por empresa
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
  data DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'atrasado')),
  forma_pagamento TEXT NOT NULL DEFAULT 'pix' CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.vendas(empresa_id, data_prevista);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_data ON public.lancamentos_financeiros(empresa_id, data);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendas: isolamento por empresa"
  ON public.vendas FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

CREATE POLICY "Lancamentos: isolamento por empresa"
  ON public.lancamentos_financeiros FOR ALL
  USING (empresa_id = public.current_empresa_id())
  WITH CHECK (empresa_id = public.current_empresa_id());

