-- ============================================================================
-- Safra.pro — Schema Definitivo Consolidado (Base + Migração 002)
-- PostgreSQL 15 / Supabase + RLS
-- ============================================================================
-- Script único completo: inclui a estrutura multi-tenant base, o papel
-- "gerente" e o acesso somente leitura "principal" (dono da plataforma).
-- Pode ser executado diretamente em um banco Supabase novo sem depender de
-- outro script prévio (desde que executado antes do cadastro do principal).
--
-- Garantias estruturais e de segurança implementadas:
--   1. Execução atômica em transação única (BEGIN ... COMMIT).
--   2. Verificação prévia não destrutiva: colunas, tipos, NOT NULL, PKs, FKs
--      (incluindo ações ON DELETE / ON UPDATE), UNIQUE em token_hash e
--      expressões efetivas das CHECK constraints essenciais.
--   3. Todas as funções SECURITY DEFINER usam SET search_path = '' e
--      qualificação explícita (public.*, safra_interno.*, auth.*, pg_catalog.*).
--   4. Autorizações internas de trigger usam tabela privada em schema restrito
--      (safra_interno.autorizacoes_transacao) vinculada a XID8 da transação,
--      eliminando variáveis de sessão (GUCs) que poderiam ser forjadas.
--   5. Papéis por empresa: admin | gerente | membro (convites: membro | gerente).
--   6. Principal (dono da plataforma) em safra_interno.principais: lista apenas
--      resumo agregado das empresas via listar_empresas_principal(), sem abrir
--      clientes, processos, tarefas, vendas ou financeiro.
--   7. Uso correto de expressões SQL (LEAST, GREATEST, COALESCE, NULLIF) e de
--      pg_catalog.btrim(...) no lugar de pg_catalog.trim(...).
--   8. Limpeza explícita de privilégios de tabela e de coluna para PUBLIC, anon
--      e authenticated antes de conceder somente o mínimo necessário.
--   9. Revogação de CREATE no schema public para PUBLIC, anon e authenticated.
--  10. Remoção dinâmica de todas as políticas RLS antigas/desconhecidas.
--  11. Persistência real de convites expirados em aceitar_convite_empresa() e
--      em criar_convite_empresa(), sem rollback por exceções de negócio.
--  12. Exclusão administrativa de empresa em cascata sem liberar exclusão
--      indevida do último administrador nem quebrar auditoria de convites.
--  13. Sem uso de service_role no frontend.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 0. Verificação prévia não destrutiva de compatibilidade estrutural
-- ----------------------------------------------------------------------------
-- Não apaga tabelas, colunas ou dados. Se qualquer tabela do Safra.pro já
-- existir com estrutura incompatível, a transação é abortada antes de alterar
-- políticas ou permissões.

DO $$
DECLARE
  v_reg RECORD;
  v_esperadas RECORD;
  v_tipo RECORD;
  v_nn RECORD;
  v_fk RECORD;
  v_chk RECORD;
  v_tab TEXT;
  v_faltando TEXT[];
  v_tipo_atual TEXT;
  v_attnotnull BOOLEAN;
  v_ok BOOLEAN;
BEGIN
  -- 0.1 Colunas obrigatórias por tabela existente
  FOR v_esperadas IN
    SELECT * FROM (
      VALUES
        ('public', 'empresas', ARRAY['id','nome','segmento','cnpj','plano','criado_em']),
        ('public', 'perfis', ARRAY['id','empresa_id','nome_completo','email','cargo','papel','criado_em']),
        ('public', 'convites_empresa', ARRAY['id','empresa_id','email_convidado','cargo','papel','token_hash','criado_por','status','expira_em','aceito_por','aceito_em','criado_em']),
        ('public', 'clientes', ARRAY['id','empresa_id','nome','documento','email','telefone','segmento','responsavel','status','observacoes','criado_em']),
        ('public', 'processos', ARRAY['id','empresa_id','cliente_id','titulo','categoria','responsavel','status','descricao','criado_em']),
        ('public', 'etapas_processo', ARRAY['id','empresa_id','processo_id','titulo','ordem','concluida']),
        ('public', 'tarefas', ARRAY['id','empresa_id','cliente_id','processo_id','titulo','descricao','prioridade','status','prazo','responsavel','criado_em']),
        ('public', 'vendas', ARRAY['id','empresa_id','cliente_id','titulo','responsavel','valor','etapa','data_prevista','forma_pagamento','faturada','observacoes','criado_em']),
        ('public', 'lancamentos_financeiros', ARRAY['id','empresa_id','cliente_id','venda_id','tipo','descricao','categoria','valor','data','status','forma_pagamento','criado_em']),
        ('safra_interno', 'autorizacoes_transacao', ARRAY['txid','operacao','alvo_id','detalhe','criado_em']),
        ('safra_interno', 'principais', ARRAY['user_id','criado_em'])
    ) AS t(esquema, tabela, colunas)
  LOOP
    IF pg_catalog.to_regclass(v_esperadas.esquema || '.' || v_esperadas.tabela) IS NOT NULL THEN
      SELECT pg_catalog.array_agg(col)
      INTO v_faltando
      FROM pg_catalog.unnest(v_esperadas.colunas) AS col
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns ic
        WHERE ic.table_schema = v_esperadas.esquema
          AND ic.table_name = v_esperadas.tabela
          AND ic.column_name = col
      );

      IF v_faltando IS NOT NULL AND pg_catalog.array_length(v_faltando, 1) > 0 THEN
        RAISE EXCEPTION
          'Incompatibilidade estrutural na tabela existente %.%: colunas ausentes (%). Aplique este script em um banco novo ou migre manualmente com ALTER TABLE.',
          v_esperadas.esquema,
          v_esperadas.tabela,
          pg_catalog.array_to_string(v_faltando, ', ');
      END IF;
    END IF;
  END LOOP;

  -- 0.2 Tipos de dados esperados nas colunas de tabelas existentes
  FOR v_tipo IN
    SELECT * FROM (
      VALUES
        ('public', 'empresas', 'id', ARRAY['uuid']),
        ('public', 'empresas', 'nome', ARRAY['text','varchar']),
        ('public', 'empresas', 'segmento', ARRAY['text','varchar']),
        ('public', 'empresas', 'cnpj', ARRAY['text','varchar']),
        ('public', 'empresas', 'plano', ARRAY['text','varchar']),
        ('public', 'empresas', 'criado_em', ARRAY['timestamptz']),
        ('public', 'perfis', 'id', ARRAY['uuid']),
        ('public', 'perfis', 'empresa_id', ARRAY['uuid']),
        ('public', 'perfis', 'nome_completo', ARRAY['text','varchar']),
        ('public', 'perfis', 'email', ARRAY['text','varchar']),
        ('public', 'perfis', 'cargo', ARRAY['text','varchar']),
        ('public', 'perfis', 'papel', ARRAY['text','varchar']),
        ('public', 'perfis', 'criado_em', ARRAY['timestamptz']),
        ('public', 'convites_empresa', 'id', ARRAY['uuid']),
        ('public', 'convites_empresa', 'empresa_id', ARRAY['uuid']),
        ('public', 'convites_empresa', 'email_convidado', ARRAY['text','varchar']),
        ('public', 'convites_empresa', 'cargo', ARRAY['text','varchar']),
        ('public', 'convites_empresa', 'papel', ARRAY['text','varchar']),
        ('public', 'convites_empresa', 'token_hash', ARRAY['text','varchar']),
        ('public', 'convites_empresa', 'criado_por', ARRAY['uuid']),
        ('public', 'convites_empresa', 'status', ARRAY['text','varchar']),
        ('public', 'convites_empresa', 'expira_em', ARRAY['timestamptz']),
        ('public', 'convites_empresa', 'aceito_por', ARRAY['uuid']),
        ('public', 'convites_empresa', 'aceito_em', ARRAY['timestamptz']),
        ('public', 'convites_empresa', 'criado_em', ARRAY['timestamptz']),
        ('public', 'clientes', 'id', ARRAY['uuid']),
        ('public', 'clientes', 'empresa_id', ARRAY['uuid']),
        ('public', 'clientes', 'status', ARRAY['text','varchar']),
        ('public', 'clientes', 'criado_em', ARRAY['timestamptz']),
        ('public', 'processos', 'id', ARRAY['uuid']),
        ('public', 'processos', 'empresa_id', ARRAY['uuid']),
        ('public', 'processos', 'cliente_id', ARRAY['uuid']),
        ('public', 'processos', 'status', ARRAY['text','varchar']),
        ('public', 'processos', 'criado_em', ARRAY['timestamptz']),
        ('public', 'etapas_processo', 'id', ARRAY['uuid']),
        ('public', 'etapas_processo', 'empresa_id', ARRAY['uuid']),
        ('public', 'etapas_processo', 'processo_id', ARRAY['uuid']),
        ('public', 'etapas_processo', 'ordem', ARRAY['int4','int8']),
        ('public', 'etapas_processo', 'concluida', ARRAY['bool']),
        ('public', 'tarefas', 'id', ARRAY['uuid']),
        ('public', 'tarefas', 'empresa_id', ARRAY['uuid']),
        ('public', 'tarefas', 'cliente_id', ARRAY['uuid']),
        ('public', 'tarefas', 'processo_id', ARRAY['uuid']),
        ('public', 'tarefas', 'prazo', ARRAY['date']),
        ('public', 'tarefas', 'prioridade', ARRAY['text','varchar']),
        ('public', 'tarefas', 'status', ARRAY['text','varchar']),
        ('public', 'tarefas', 'criado_em', ARRAY['timestamptz']),
        ('public', 'vendas', 'id', ARRAY['uuid']),
        ('public', 'vendas', 'empresa_id', ARRAY['uuid']),
        ('public', 'vendas', 'cliente_id', ARRAY['uuid']),
        ('public', 'vendas', 'valor', ARRAY['numeric']),
        ('public', 'vendas', 'etapa', ARRAY['text','varchar']),
        ('public', 'vendas', 'data_prevista', ARRAY['date']),
        ('public', 'vendas', 'forma_pagamento', ARRAY['text','varchar']),
        ('public', 'vendas', 'faturada', ARRAY['bool']),
        ('public', 'vendas', 'criado_em', ARRAY['timestamptz']),
        ('public', 'lancamentos_financeiros', 'id', ARRAY['uuid']),
        ('public', 'lancamentos_financeiros', 'empresa_id', ARRAY['uuid']),
        ('public', 'lancamentos_financeiros', 'cliente_id', ARRAY['uuid']),
        ('public', 'lancamentos_financeiros', 'venda_id', ARRAY['uuid']),
        ('public', 'lancamentos_financeiros', 'tipo', ARRAY['text','varchar']),
        ('public', 'lancamentos_financeiros', 'valor', ARRAY['numeric']),
        ('public', 'lancamentos_financeiros', 'data', ARRAY['date']),
        ('public', 'lancamentos_financeiros', 'status', ARRAY['text','varchar']),
        ('public', 'lancamentos_financeiros', 'forma_pagamento', ARRAY['text','varchar']),
        ('public', 'lancamentos_financeiros', 'criado_em', ARRAY['timestamptz']),
        ('safra_interno', 'autorizacoes_transacao', 'txid', ARRAY['xid8']),
        ('safra_interno', 'autorizacoes_transacao', 'operacao', ARRAY['text','varchar']),
        ('safra_interno', 'autorizacoes_transacao', 'alvo_id', ARRAY['uuid']),
        ('safra_interno', 'autorizacoes_transacao', 'detalhe', ARRAY['text','varchar']),
        ('safra_interno', 'autorizacoes_transacao', 'criado_em', ARRAY['timestamptz']),
        ('safra_interno', 'principais', 'user_id', ARRAY['uuid']),
        ('safra_interno', 'principais', 'criado_em', ARRAY['timestamptz'])
    ) AS t(esquema, tabela, coluna, tipos_validos)
  LOOP
    IF pg_catalog.to_regclass(v_tipo.esquema || '.' || v_tipo.tabela) IS NOT NULL THEN
      SELECT typ.typname
      INTO v_tipo_atual
      FROM pg_catalog.pg_attribute att
      JOIN pg_catalog.pg_class rel ON rel.oid = att.attrelid
      JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_catalog.pg_type typ ON typ.oid = att.atttypid
      WHERE nsp.nspname = v_tipo.esquema
        AND rel.relname = v_tipo.tabela
        AND att.attname = v_tipo.coluna
        AND att.attnum > 0
        AND NOT att.attisdropped;

      IF v_tipo_atual IS NULL OR NOT (v_tipo_atual = ANY(v_tipo.tipos_validos)) THEN
        RAISE EXCEPTION
          'Incompatibilidade de tipo em %.%.%: encontrado "%" (esperado: %). Aplique em banco novo ou ajuste a coluna antes.',
          v_tipo.esquema,
          v_tipo.tabela,
          v_tipo.coluna,
          COALESCE(v_tipo_atual, 'inexistente'),
          pg_catalog.array_to_string(v_tipo.tipos_validos, ', ');
      END IF;
    END IF;
  END LOOP;

  -- 0.3 Obrigatoriedade (NOT NULL) em colunas estruturais e de segurança
  FOR v_nn IN
    SELECT * FROM (
      VALUES
        ('public', 'empresas', 'id'),
        ('public', 'empresas', 'nome'),
        ('public', 'empresas', 'segmento'),
        ('public', 'empresas', 'plano'),
        ('public', 'empresas', 'criado_em'),
        ('public', 'perfis', 'id'),
        ('public', 'perfis', 'empresa_id'),
        ('public', 'perfis', 'nome_completo'),
        ('public', 'perfis', 'email'),
        ('public', 'perfis', 'cargo'),
        ('public', 'perfis', 'papel'),
        ('public', 'perfis', 'criado_em'),
        ('public', 'convites_empresa', 'id'),
        ('public', 'convites_empresa', 'empresa_id'),
        ('public', 'convites_empresa', 'email_convidado'),
        ('public', 'convites_empresa', 'cargo'),
        ('public', 'convites_empresa', 'papel'),
        ('public', 'convites_empresa', 'token_hash'),
        ('public', 'convites_empresa', 'status'),
        ('public', 'convites_empresa', 'expira_em'),
        ('public', 'convites_empresa', 'criado_em'),
        ('public', 'clientes', 'id'),
        ('public', 'clientes', 'empresa_id'),
        ('public', 'clientes', 'nome'),
        ('public', 'clientes', 'status'),
        ('public', 'clientes', 'criado_em'),
        ('public', 'processos', 'id'),
        ('public', 'processos', 'empresa_id'),
        ('public', 'processos', 'titulo'),
        ('public', 'processos', 'status'),
        ('public', 'processos', 'criado_em'),
        ('public', 'etapas_processo', 'id'),
        ('public', 'etapas_processo', 'empresa_id'),
        ('public', 'etapas_processo', 'processo_id'),
        ('public', 'etapas_processo', 'titulo'),
        ('public', 'etapas_processo', 'ordem'),
        ('public', 'etapas_processo', 'concluida'),
        ('public', 'tarefas', 'id'),
        ('public', 'tarefas', 'empresa_id'),
        ('public', 'tarefas', 'titulo'),
        ('public', 'tarefas', 'prioridade'),
        ('public', 'tarefas', 'status'),
        ('public', 'tarefas', 'prazo'),
        ('public', 'tarefas', 'criado_em'),
        ('public', 'vendas', 'id'),
        ('public', 'vendas', 'empresa_id'),
        ('public', 'vendas', 'titulo'),
        ('public', 'vendas', 'valor'),
        ('public', 'vendas', 'etapa'),
        ('public', 'vendas', 'data_prevista'),
        ('public', 'vendas', 'forma_pagamento'),
        ('public', 'vendas', 'faturada'),
        ('public', 'vendas', 'criado_em'),
        ('public', 'lancamentos_financeiros', 'id'),
        ('public', 'lancamentos_financeiros', 'empresa_id'),
        ('public', 'lancamentos_financeiros', 'tipo'),
        ('public', 'lancamentos_financeiros', 'valor'),
        ('public', 'lancamentos_financeiros', 'data'),
        ('public', 'lancamentos_financeiros', 'status'),
        ('public', 'lancamentos_financeiros', 'forma_pagamento'),
        ('public', 'lancamentos_financeiros', 'criado_em'),
        ('safra_interno', 'autorizacoes_transacao', 'txid'),
        ('safra_interno', 'autorizacoes_transacao', 'operacao'),
        ('safra_interno', 'autorizacoes_transacao', 'alvo_id'),
        ('safra_interno', 'autorizacoes_transacao', 'detalhe'),
        ('safra_interno', 'autorizacoes_transacao', 'criado_em'),
        ('safra_interno', 'principais', 'user_id'),
        ('safra_interno', 'principais', 'criado_em')
    ) AS t(esquema, tabela, coluna)
  LOOP
    IF pg_catalog.to_regclass(v_nn.esquema || '.' || v_nn.tabela) IS NOT NULL THEN
      SELECT att.attnotnull
      INTO v_attnotnull
      FROM pg_catalog.pg_attribute att
      JOIN pg_catalog.pg_class rel ON rel.oid = att.attrelid
      JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = v_nn.esquema
        AND rel.relname = v_nn.tabela
        AND att.attname = v_nn.coluna
        AND att.attnum > 0
        AND NOT att.attisdropped;

      IF v_attnotnull IS DISTINCT FROM true THEN
        RAISE EXCEPTION
          'Incompatibilidade de restrição em %.%.%: a coluna deve ser NOT NULL.',
          v_nn.esquema,
          v_nn.tabela,
          v_nn.coluna;
      END IF;
    END IF;
  END LOOP;

  -- 0.4 Chave primária (id) em cada tabela de domínio existente
  FOREACH v_tab IN ARRAY ARRAY[
    'empresas',
    'perfis',
    'convites_empresa',
    'clientes',
    'processos',
    'etapas_processo',
    'tarefas',
    'vendas',
    'lancamentos_financeiros'
  ]
  LOOP
    IF pg_catalog.to_regclass('public.' || v_tab) IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_catalog.pg_attribute att
          ON att.attrelid = rel.oid
         AND att.attnum = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = v_tab
          AND con.contype = 'p'
          AND pg_catalog.array_length(con.conkey::smallint[], 1) = 1
          AND att.attname = 'id'
      )
      INTO v_ok;

      IF NOT v_ok THEN
        RAISE EXCEPTION
          'Incompatibilidade estrutural em public.%: PRIMARY KEY (id) ausente.',
          v_tab;
      END IF;
    END IF;
  END LOOP;

  -- 0.5 Chaves estrangeiras + ações efetivas ON DELETE e ON UPDATE
  -- Códigos PostgreSQL: 'c' = CASCADE, 'n' = SET NULL, 'a' = NO ACTION
  FOR v_fk IN
    SELECT * FROM (
      VALUES
        ('public', 'perfis', 'id', 'auth', 'users', 'id', 'c', 'a'),
        ('public', 'perfis', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'convites_empresa', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'convites_empresa', 'criado_por', 'auth', 'users', 'id', 'n', 'a'),
        ('public', 'convites_empresa', 'aceito_por', 'auth', 'users', 'id', 'n', 'a'),
        ('public', 'clientes', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'processos', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'processos', 'cliente_id', 'public', 'clientes', 'id', 'n', 'a'),
        ('public', 'etapas_processo', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'etapas_processo', 'processo_id', 'public', 'processos', 'id', 'c', 'a'),
        ('public', 'tarefas', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'tarefas', 'cliente_id', 'public', 'clientes', 'id', 'n', 'a'),
        ('public', 'tarefas', 'processo_id', 'public', 'processos', 'id', 'n', 'a'),
        ('public', 'vendas', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'vendas', 'cliente_id', 'public', 'clientes', 'id', 'n', 'a'),
        ('public', 'lancamentos_financeiros', 'empresa_id', 'public', 'empresas', 'id', 'c', 'a'),
        ('public', 'lancamentos_financeiros', 'cliente_id', 'public', 'clientes', 'id', 'n', 'a'),
        ('public', 'lancamentos_financeiros', 'venda_id', 'public', 'vendas', 'id', 'n', 'a'),
        ('safra_interno', 'principais', 'user_id', 'auth', 'users', 'id', 'c', 'a')
    ) AS t(src_schema, src_table, src_col, tgt_schema, tgt_table, tgt_col, del_action, upd_action)
  LOOP
    IF pg_catalog.to_regclass(v_fk.src_schema || '.' || v_fk.src_table) IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class src ON src.oid = con.conrelid
        JOIN pg_catalog.pg_namespace snsp ON snsp.oid = src.relnamespace
        JOIN pg_catalog.pg_attribute satt
          ON satt.attrelid = src.oid
         AND satt.attnum = ANY(con.conkey)
        JOIN pg_catalog.pg_class tgt ON tgt.oid = con.confrelid
        JOIN pg_catalog.pg_namespace tnsp ON tnsp.oid = tgt.relnamespace
        JOIN pg_catalog.pg_attribute tatt
          ON tatt.attrelid = tgt.oid
         AND tatt.attnum = ANY(con.confkey)
        WHERE snsp.nspname = v_fk.src_schema
          AND src.relname = v_fk.src_table
          AND con.contype = 'f'
          AND pg_catalog.array_length(con.conkey::smallint[], 1) = 1
          AND pg_catalog.array_length(con.confkey::smallint[], 1) = 1
          AND satt.attname = v_fk.src_col
          AND tnsp.nspname = v_fk.tgt_schema
          AND tgt.relname = v_fk.tgt_table
          AND tatt.attname = v_fk.tgt_col
          AND con.confdeltype = v_fk.del_action
          AND con.confupdtype = v_fk.upd_action
      )
      INTO v_ok;

      IF NOT v_ok THEN
        RAISE EXCEPTION
          'Incompatibilidade de chave estrangeira em %.%.%: esperada referência para %.%(%) com confdeltype=% e confupdtype=%. Ajuste manualmente antes de aplicar este script.',
          v_fk.src_schema,
          v_fk.src_table,
          v_fk.src_col,
          v_fk.tgt_schema,
          v_fk.tgt_table,
          v_fk.tgt_col,
          v_fk.del_action,
          v_fk.upd_action;
      END IF;
    END IF;
  END LOOP;

  -- 0.6 Unicidade obrigatória de convites_empresa(token_hash) se a tabela já existir
  IF pg_catalog.to_regclass('public.convites_empresa') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_index idx
      JOIN pg_catalog.pg_class rel ON rel.oid = idx.indrelid
      JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_catalog.pg_attribute att
        ON att.attrelid = rel.oid
       AND att.attnum = ANY(idx.indkey)
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'convites_empresa'
        AND idx.indisunique = true
        AND idx.indpred IS NULL
        AND pg_catalog.array_length(idx.indkey::smallint[], 1) = 1
        AND att.attname = 'token_hash'
    )
    INTO v_ok;

    IF NOT v_ok THEN
      RAISE EXCEPTION
        'Incompatibilidade estrutural em public.convites_empresa: restrição UNIQUE em token_hash ausente.';
    END IF;
  END IF;

  -- 0.7 Verificação efetiva das expressões e validação (convalidated) das CHECK constraints
  FOR v_chk IN
    SELECT * FROM (
      VALUES
        ('empresas', 'plano', '^check \(\(+plano = any \(array\[''essencial''(::text)?, ''profissional''(::text)?, ''escala''(::text)?\]\)\)+$'),
        ('perfis', 'papel', '^check \(\(+papel = any \(array\[''admin''(::text)?, ''gerente''(::text)?, ''membro''(::text)?\]\)\)+$'),
        ('convites_empresa', 'email_convidado', '^check \(\(+email_convidado = (pg_catalog\.)?lower\((pg_catalog\.)?btrim\(email_convidado\)\)\)+$'),
        ('convites_empresa', 'papel', '^check \(\(+papel = any \(array\[''membro''(::text)?, ''gerente''(::text)?\]\)\)+$'),
        ('convites_empresa', 'status', '^check \(\(+status = any \(array\[''pendente''(::text)?, ''aceito''(::text)?, ''revogado''(::text)?, ''expirado''(::text)?\]\)\)+$'),
        ('clientes', 'status', '^check \(\(+status = any \(array\[''ativo''(::text)?, ''onboarding''(::text)?, ''inativo''(::text)?\]\)\)+$'),
        ('processos', 'status', '^check \(\(+status = any \(array\[''ativo''(::text)?, ''pausado''(::text)?, ''concluido''(::text)?\]\)\)+$'),
        ('tarefas', 'prioridade', '^check \(\(+prioridade = any \(array\[''baixa''(::text)?, ''media''(::text)?, ''alta''(::text)?, ''urgente''(::text)?\]\)\)+$'),
        ('tarefas', 'status', '^check \(\(+status = any \(array\[''a_fazer''(::text)?, ''em_andamento''(::text)?, ''em_revisao''(::text)?, ''concluida''(::text)?\]\)\)+$'),
        ('vendas', 'valor', '^check \(\(+valor >= \(?0\)?(::numeric)?\)+$'),
        ('vendas', 'etapa', '^check \(\(+etapa = any \(array\[''prospeccao''(::text)?, ''proposta''(::text)?, ''fechada''(::text)?, ''perdida''(::text)?\]\)\)+$'),
        ('vendas', 'forma_pagamento', '^check \(\(+forma_pagamento = any \(array\[''pix''(::text)?, ''boleto''(::text)?, ''cartao''(::text)?, ''transferencia''(::text)?\]\)\)+$'),
        ('lancamentos_financeiros', 'tipo', '^check \(\(+tipo = any \(array\[''receita''(::text)?, ''despesa''(::text)?\]\)\)+$'),
        ('lancamentos_financeiros', 'valor', '^check \(\(+valor >= \(?0\)?(::numeric)?\)+$'),
        ('lancamentos_financeiros', 'status', '^check \(\(+status = any \(array\[''pago''(::text)?, ''pendente''(::text)?, ''atrasado''(::text)?\]\)\)+$'),
        ('lancamentos_financeiros', 'forma_pagamento', '^check \(\(+forma_pagamento = any \(array\[''pix''(::text)?, ''boleto''(::text)?, ''cartao''(::text)?, ''transferencia''(::text)?\]\)\)+$')
    ) AS t(tabela, coluna, regex_esperada)
  LOOP
    IF pg_catalog.to_regclass('public.' || v_chk.tabela) IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_catalog.pg_attribute att
          ON att.attrelid = rel.oid
         AND att.attnum = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = v_chk.tabela
          AND con.contype = 'c'
          AND con.convalidated = true
          AND pg_catalog.array_length(con.conkey::smallint[], 1) = 1
          AND att.attname = v_chk.coluna
          AND pg_catalog.lower(
                pg_catalog.regexp_replace(
                  pg_catalog.pg_get_constraintdef(con.oid),
                  '\s+',
                  ' ',
                  'g'
                )
              ) ~ v_chk.regex_esperada
      )
      INTO v_ok;

      IF NOT v_ok THEN
        RAISE EXCEPTION
          'Incompatibilidade na expressão efetiva da CHECK constraint em public.%.%: regra esperada não encontrada ou não validada.',
          v_chk.tabela,
          v_chk.coluna;
      END IF;
    END IF;
  END LOOP;

  -- 0.8 Aviso não bloqueante para colunas textuais legadas anuláveis
  FOR v_reg IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'clientes' AND column_name = 'observacoes')
        OR (table_name = 'processos' AND column_name = 'descricao')
        OR (table_name = 'tarefas' AND column_name = 'descricao')
        OR (table_name = 'vendas' AND column_name = 'observacoes')
      )
      AND is_nullable = 'YES'
  LOOP
    RAISE NOTICE
      'Aviso de migração: public.%.% já existe como NULLABLE; CREATE TABLE IF NOT EXISTS não altera essa restrição automaticamente.',
      v_reg.table_name,
      v_reg.column_name;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. Schema interno privado (autorizações XID8 + principais da plataforma)
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS safra_interno;
REVOKE ALL ON SCHEMA safra_interno FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA safra_interno TO service_role;

CREATE TABLE IF NOT EXISTS safra_interno.autorizacoes_transacao (
  txid XID8 NOT NULL DEFAULT pg_catalog.pg_current_xact_id(),
  operacao TEXT NOT NULL CHECK (operacao IN ('role_change', 'invite_manage', 'delete_empresa')),
  alvo_id UUID NOT NULL,
  detalhe TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (txid, operacao, alvo_id, detalhe)
);

REVOKE ALL ON TABLE safra_interno.autorizacoes_transacao FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE safra_interno.autorizacoes_transacao TO service_role;
ALTER TABLE safra_interno.autorizacoes_transacao ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS safra_interno.principais (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL ON TABLE safra_interno.principais FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE safra_interno.principais TO service_role;
ALTER TABLE safra_interno.principais ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Tabelas estruturais e de domínio
-- ----------------------------------------------------------------------------

-- 2.1 Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  nome TEXT NOT NULL,
  segmento TEXT NOT NULL DEFAULT 'Serviços',
  cnpj TEXT,
  plano TEXT NOT NULL DEFAULT 'profissional' CHECK (plano IN ('essencial', 'profissional', 'escala')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.2 Perfis de Usuários vinculados a auth.users (Supabase Auth) e a uma empresa
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT 'Administrador(a)',
  papel TEXT NOT NULL DEFAULT 'admin' CHECK (papel IN ('admin', 'gerente', 'membro')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.3 Convites de Membros por Empresa (token SHA-256 + consentimento)
-- criado_por usa ON DELETE SET NULL para não apagar o histórico da empresa caso um
-- ex-administrador seja excluído do Supabase Auth após transferir o papel de admin.
CREATE TABLE IF NOT EXISTS public.convites_empresa (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  email_convidado TEXT NOT NULL CHECK (email_convidado = pg_catalog.lower(pg_catalog.btrim(email_convidado))),
  cargo TEXT NOT NULL DEFAULT 'Membro',
  papel TEXT NOT NULL DEFAULT 'membro' CHECK (papel IN ('membro', 'gerente')),
  token_hash TEXT NOT NULL UNIQUE,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'revogado', 'expirado')),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (pg_catalog.now() + interval '7 days'),
  aceito_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aceito_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.4 Clientes por empresa
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  segmento TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'onboarding', 'inativo')),
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.5 Processos Empresariais por empresa
CREATE TABLE IF NOT EXISTS public.processos (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'concluido')),
  descricao TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.6 Etapas dos Processos
CREATE TABLE IF NOT EXISTS public.etapas_processo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  concluida BOOLEAN NOT NULL DEFAULT false
);

-- 2.7 Tarefas por empresa
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'em_andamento', 'em_revisao', 'concluida')),
  prazo DATE NOT NULL,
  responsavel TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.8 Vendas / Pipeline comercial por empresa
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
  etapa TEXT NOT NULL DEFAULT 'proposta' CHECK (etapa IN ('prospeccao', 'proposta', 'fechada', 'perdida')),
  data_prevista DATE NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix' CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia')),
  faturada BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2.9 Lançamentos Financeiros (Renda, Faturamento e Despesas) por empresa
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
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
  criado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- ----------------------------------------------------------------------------
-- 3. Índices de performance e unicidade multi-tenant
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa_papel ON public.perfis(empresa_id, papel);
CREATE INDEX IF NOT EXISTS idx_convites_empresa_status ON public.convites_empresa(empresa_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_convite_pendente_empresa_email
  ON public.convites_empresa(empresa_id, email_convidado)
  WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_processos_empresa ON public.processos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_processos_empresa_cliente ON public.processos(empresa_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_etapas_processo ON public.etapas_processo(processo_id);
CREATE INDEX IF NOT EXISTS idx_etapas_empresa_processo ON public.etapas_processo(empresa_id, processo_id, ordem);
CREATE INDEX IF NOT EXISTS idx_tarefas_empresa_prazo ON public.tarefas(empresa_id, prazo);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.vendas(empresa_id, data_prevista);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_etapa ON public.vendas(empresa_id, etapa);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_data ON public.lancamentos_financeiros(empresa_id, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_tipo_status ON public.lancamentos_financeiros(empresa_id, tipo, status);

-- ----------------------------------------------------------------------------
-- 4. Funções auxiliares de contexto e acesso do Principal
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.empresa_id
  FROM public.perfis p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_papel()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.papel
  FROM public.perfis p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_empresa_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.papel = 'admin' FROM public.perfis p WHERE p.id = auth.uid() LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_empresa_gestor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.papel IN ('admin', 'gerente') FROM public.perfis p WHERE p.id = auth.uid() LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.sou_principal()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM safra_interno.principais pr
    JOIN auth.users u ON u.id = pr.user_id
    WHERE pr.user_id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.listar_empresas_principal()
RETURNS TABLE (
  empresa_id UUID,
  nome TEXT,
  segmento TEXT,
  cnpj TEXT,
  plano TEXT,
  criado_em TIMESTAMPTZ,
  total_usuarios BIGINT,
  total_admins BIGINT,
  total_gerentes BIGINT,
  total_membros BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.sou_principal() THEN
    RAISE EXCEPTION 'Acesso restrito ao administrador principal da plataforma.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.segmento,
    e.cnpj,
    e.plano,
    e.criado_em,
    pg_catalog.count(p.id),
    pg_catalog.count(p.id) FILTER (WHERE p.papel = 'admin'),
    pg_catalog.count(p.id) FILTER (WHERE p.papel = 'gerente'),
    pg_catalog.count(p.id) FILTER (WHERE p.papel = 'membro')
  FROM public.empresas e
  LEFT JOIN public.perfis p ON p.empresa_id = e.id
  GROUP BY e.id, e.nome, e.segmento, e.cnpj, e.plano, e.criado_em
  ORDER BY e.criado_em DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPCs seguras: provisionamento inicial, convite, aceite e papéis
-- ----------------------------------------------------------------------------

-- 5.1 Provisionamento atômico da 1ª empresa + 1º administrador
CREATE OR REPLACE FUNCTION public.provisionar_empresa_inicial(
  p_nome_empresa TEXT,
  p_segmento TEXT DEFAULT 'Serviços',
  p_cnpj TEXT DEFAULT NULL,
  p_nome_completo TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT 'Administrador(a)'
)
RETURNS TABLE (
  empresa_id UUID,
  perfil_id UUID,
  papel TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_email_confirmado TIMESTAMPTZ;
  v_nome_empresa TEXT;
  v_segmento TEXT;
  v_nome_completo TEXT;
  v_cargo TEXT;
  v_cnpj TEXT;
  v_empresa_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para provisionar uma empresa.'
      USING ERRCODE = '42501';
  END IF;

  -- Serializa provisionamento e aceite de convite simultâneos do mesmo usuário
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('perfil:' || v_uid::text, 0)
  );

  IF EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = v_uid) THEN
    RAISE EXCEPTION 'Este usuário já está vinculado a uma empresa.'
      USING ERRCODE = '23505';
  END IF;

  SELECT u.email, u.email_confirmed_at
  INTO v_email, v_email_confirmado
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR pg_catalog.length(pg_catalog.btrim(v_email)) = 0 THEN
    RAISE EXCEPTION 'E-mail do usuário autenticado não localizado em auth.users.'
      USING ERRCODE = '22023';
  END IF;

  IF v_email_confirmado IS NULL THEN
    RAISE EXCEPTION 'Confirme seu e-mail no Supabase Auth antes de provisionar a empresa.'
      USING ERRCODE = '42501';
  END IF;

  v_nome_empresa := pg_catalog.btrim(COALESCE(p_nome_empresa, ''));
  IF pg_catalog.length(v_nome_empresa) < 2 THEN
    RAISE EXCEPTION 'Informe o nome da empresa com pelo menos 2 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  v_segmento := COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_segmento, '')), ''), 'Serviços');
  v_nome_completo := COALESCE(
    NULLIF(pg_catalog.btrim(COALESCE(p_nome_completo, '')), ''),
    pg_catalog.split_part(v_email, '@', 1)
  );
  v_cargo := COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_cargo, '')), ''), 'Administrador(a)');
  v_cnpj := NULLIF(pg_catalog.btrim(COALESCE(p_cnpj, '')), '');

  INSERT INTO public.empresas (nome, segmento, cnpj, plano)
  VALUES (v_nome_empresa, v_segmento, v_cnpj, 'profissional')
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, email, cargo, papel)
  VALUES (
    v_uid,
    v_empresa_id,
    v_nome_completo,
    pg_catalog.lower(pg_catalog.btrim(v_email)),
    v_cargo,
    'admin'
  );

  RETURN QUERY
  SELECT v_empresa_id, v_uid, 'admin'::TEXT;
END;
$$;

-- 5.2 Criação de convite por administrador (membro ou gerente)
-- Atualiza convites vencidos para 'expirado' e retorna resultado estruturado
-- (sem RAISE EXCEPTION em conflitos de negócio como membro_ja_existe ou
-- convite_pendente_ativo), evitando rollback da expiração gravada.
DROP FUNCTION IF EXISTS public.criar_convite_empresa(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.criar_convite_empresa(
  p_email_convidado TEXT,
  p_cargo TEXT DEFAULT NULL,
  p_dias_validade INTEGER DEFAULT 7,
  p_papel TEXT DEFAULT 'membro'
)
RETURNS TABLE (
  convite_criado BOOLEAN,
  status_resultado TEXT,
  mensagem TEXT,
  convite_id UUID,
  empresa_id UUID,
  email_convidado TEXT,
  token_convite TEXT,
  expira_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_empresa_id UUID;
  v_email TEXT;
  v_papel TEXT;
  v_cargo TEXT;
  v_dias INTEGER;
  v_token TEXT;
  v_token_hash TEXT;
  v_expira_em TIMESTAMPTZ;
  v_convite_id UUID;
  v_txid XID8;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.empresa_id
  INTO v_empresa_id
  FROM public.perfis p
  WHERE p.id = v_uid AND p.papel = 'admin'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores da empresa podem emitir convites.'
      USING ERRCODE = '42501';
  END IF;

  v_email := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email_convidado, '')));
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Informe um e-mail válido para o convite.'
      USING ERRCODE = '22023';
  END IF;

  v_papel := COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_papel, '')), ''), 'membro');
  IF v_papel NOT IN ('membro', 'gerente') THEN
    RAISE EXCEPTION 'Papel do convite inválido. Valores permitidos: membro ou gerente.'
      USING ERRCODE = '22023';
  END IF;

  -- Serializa convites concorrentes para o mesmo (empresa, e-mail) e revalida admin
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('convite:' || v_empresa_id::text || ':' || v_email, 0)
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.id = v_uid AND p.empresa_id = v_empresa_id AND p.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Privilégio administrativo alterado durante a operação.'
      USING ERRCODE = '42501';
  END IF;

  v_txid := pg_catalog.pg_current_xact_id();

  INSERT INTO safra_interno.autorizacoes_transacao (txid, operacao, alvo_id, detalhe)
  VALUES (v_txid, 'invite_manage', v_empresa_id, v_email)
  ON CONFLICT DO NOTHING;

  UPDATE public.convites_empresa c
  SET status = 'expirado'
  WHERE c.empresa_id = v_empresa_id
    AND c.email_convidado = v_email
    AND c.status = 'pendente'
    AND c.expira_em <= pg_catalog.now();

  DELETE FROM safra_interno.autorizacoes_transacao a
  WHERE a.txid = v_txid
    AND a.operacao = 'invite_manage'
    AND a.alvo_id = v_empresa_id
    AND a.detalhe = v_email;

  -- Retornos de negócio sem RAISE EXCEPTION preservam a expiração gravada acima
  IF EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.empresa_id = v_empresa_id
      AND pg_catalog.lower(pg_catalog.btrim(p.email)) = v_email
  ) THEN
    RETURN QUERY
    SELECT
      false,
      'membro_ja_existe'::TEXT,
      'Já existe um membro com este e-mail vinculado à empresa.'::TEXT,
      NULL::UUID,
      v_empresa_id,
      v_email,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.convites_empresa c
    WHERE c.empresa_id = v_empresa_id
      AND c.email_convidado = v_email
      AND c.status = 'pendente'
  ) THEN
    RETURN QUERY
    SELECT
      false,
      'convite_pendente_ativo'::TEXT,
      'Já existe um convite pendente ativo para este e-mail.'::TEXT,
      NULL::UUID,
      v_empresa_id,
      v_email,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_cargo := COALESCE(
    NULLIF(pg_catalog.btrim(COALESCE(p_cargo, '')), ''),
    CASE WHEN v_papel = 'gerente' THEN 'Gerente' ELSE 'Membro' END
  );
  v_dias := LEAST(GREATEST(COALESCE(p_dias_validade, 7), 1), 30);
  v_expira_em := pg_catalog.now() + pg_catalog.make_interval(days => v_dias);

  -- Token retornado uma única vez ao chamador; banco armazena somente o hash SHA-256
  v_token := pg_catalog.replace(
    pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text,
    '-',
    ''
  );
  v_token_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')),
    'hex'
  );

  INSERT INTO public.convites_empresa (
    empresa_id, email_convidado, cargo, papel, token_hash, criado_por, status, expira_em
  )
  VALUES (
    v_empresa_id, v_email, v_cargo, v_papel, v_token_hash, v_uid, 'pendente', v_expira_em
  )
  RETURNING id INTO v_convite_id;

  RETURN QUERY
  SELECT
    true,
    'criado'::TEXT,
    'Convite criado com sucesso.'::TEXT,
    v_convite_id,
    v_empresa_id,
    v_email,
    v_token,
    v_expira_em;
END;
$$;

-- 5.3 Aceite consentido de convite pelo próprio usuário autenticado
-- O perfil nasce com o papel gravado no convite ('membro' ou 'gerente').
-- Convites vencidos são persistidos como status='expirado' e retornam
-- (aceito=false, status_convite='expirado') sem RAISE EXCEPTION.
CREATE OR REPLACE FUNCTION public.aceitar_convite_empresa(
  p_token TEXT,
  p_nome_completo TEXT DEFAULT NULL
)
RETURNS TABLE (
  aceito BOOLEAN,
  status_convite TEXT,
  mensagem TEXT,
  empresa_id UUID,
  perfil_id UUID,
  papel TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_email_confirmado TIMESTAMPTZ;
  v_token TEXT;
  v_token_hash TEXT;
  v_convite public.convites_empresa%ROWTYPE;
  v_nome_completo TEXT;
  v_txid XID8;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para aceitar o convite.'
      USING ERRCODE = '42501';
  END IF;

  -- Serializa contra aceite duplo ou provisionamento simultâneo do mesmo usuário
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('perfil:' || v_uid::text, 0)
  );

  IF EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = v_uid) THEN
    RAISE EXCEPTION 'Este usuário já pertence a uma empresa.'
      USING ERRCODE = '23505';
  END IF;

  SELECT u.email, u.email_confirmed_at
  INTO v_email, v_email_confirmado
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR pg_catalog.length(pg_catalog.btrim(v_email)) = 0 THEN
    RAISE EXCEPTION 'E-mail do usuário autenticado não localizado.'
      USING ERRCODE = '22023';
  END IF;

  IF v_email_confirmado IS NULL THEN
    RAISE EXCEPTION 'Confirme seu e-mail no Supabase Auth antes de aceitar o convite.'
      USING ERRCODE = '42501';
  END IF;

  v_token := pg_catalog.btrim(COALESCE(p_token, ''));
  IF pg_catalog.length(v_token) < 16 THEN
    RAISE EXCEPTION 'Token de convite inválido.'
      USING ERRCODE = '22023';
  END IF;

  v_token_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')),
    'hex'
  );

  SELECT c.id, c.empresa_id, c.email_convidado
  INTO v_convite.id, v_convite.empresa_id, v_convite.email_convidado
  FROM public.convites_empresa c
  WHERE c.token_hash = v_token_hash;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado ou inválido.'
      USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.lower(pg_catalog.btrim(v_email)) <> v_convite.email_convidado THEN
    RAISE EXCEPTION 'Este convite foi emitido para outro endereço de e-mail.'
      USING ERRCODE = '42501';
  END IF;

  -- Mesma ordem de trava de criar_convite_empresa() (advisory lock -> FOR UPDATE) evita deadlock
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('convite:' || v_convite.empresa_id::text || ':' || v_convite.email_convidado, 0)
  );

  SELECT c.*
  INTO v_convite
  FROM public.convites_empresa c
  WHERE c.id = v_convite.id
  FOR UPDATE;

  v_txid := pg_catalog.pg_current_xact_id();

  IF v_convite.status = 'pendente' AND v_convite.expira_em <= pg_catalog.now() THEN
    INSERT INTO safra_interno.autorizacoes_transacao (txid, operacao, alvo_id, detalhe)
    VALUES (v_txid, 'invite_manage', v_convite.empresa_id, v_convite.email_convidado)
    ON CONFLICT DO NOTHING;

    UPDATE public.convites_empresa
    SET status = 'expirado'
    WHERE id = v_convite.id;

    DELETE FROM safra_interno.autorizacoes_transacao a
    WHERE a.txid = v_txid
      AND a.operacao = 'invite_manage'
      AND a.alvo_id = v_convite.empresa_id
      AND a.detalhe = v_convite.email_convidado;

    RETURN QUERY
    SELECT
      false,
      'expirado'::TEXT,
      'Este convite expirou e foi encerrado. Solicite um novo convite ao administrador.'::TEXT,
      NULL::UUID,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;

  IF v_convite.status <> 'pendente' THEN
    RETURN QUERY
    SELECT
      false,
      v_convite.status,
      ('Este convite não está mais disponível (status: ' || v_convite.status || ').')::TEXT,
      NULL::UUID,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;

  v_nome_completo := COALESCE(
    NULLIF(pg_catalog.btrim(COALESCE(p_nome_completo, '')), ''),
    pg_catalog.split_part(v_email, '@', 1)
  );

  INSERT INTO public.perfis (id, empresa_id, nome_completo, email, cargo, papel)
  VALUES (
    v_uid,
    v_convite.empresa_id,
    v_nome_completo,
    pg_catalog.lower(pg_catalog.btrim(v_email)),
    v_convite.cargo,
    v_convite.papel
  );

  INSERT INTO safra_interno.autorizacoes_transacao (txid, operacao, alvo_id, detalhe)
  VALUES (v_txid, 'invite_manage', v_convite.empresa_id, v_convite.email_convidado)
  ON CONFLICT DO NOTHING;

  UPDATE public.convites_empresa
  SET status = 'aceito',
      aceito_por = v_uid,
      aceito_em = pg_catalog.now()
  WHERE id = v_convite.id;

  DELETE FROM safra_interno.autorizacoes_transacao a
  WHERE a.txid = v_txid
    AND a.operacao = 'invite_manage'
    AND a.alvo_id = v_convite.empresa_id
    AND a.detalhe = v_convite.email_convidado;

  RETURN QUERY
  SELECT
    true,
    'aceito'::TEXT,
    'Convite aceito com sucesso.'::TEXT,
    v_convite.empresa_id,
    v_uid,
    v_convite.papel;
END;
$$;

-- 5.4 Regra explícita de autorização para promoção/rebaixamento (admin | gerente | membro)
CREATE OR REPLACE FUNCTION public.autorizar_alteracao_papel_membro(
  p_alvo_usuario_id UUID,
  p_novo_papel TEXT,
  p_confirmar_autorizacao BOOLEAN DEFAULT false
)
RETURNS TABLE (
  perfil_id UUID,
  empresa_id UUID,
  papel TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_empresa_id UUID;
  v_alvo_empresa_id UUID;
  v_alvo_papel_atual TEXT;
  v_total_admins INTEGER;
  v_txid XID8;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.'
      USING ERRCODE = '42501';
  END IF;

  IF p_confirmar_autorizacao IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Autorização explícita obrigatória para alterar papel de usuário.'
      USING ERRCODE = '42501';
  END IF;

  IF p_alvo_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Informe o identificador do usuário alvo.'
      USING ERRCODE = '22023';
  END IF;

  IF p_novo_papel IS NULL OR p_novo_papel NOT IN ('admin', 'gerente', 'membro') THEN
    RAISE EXCEPTION 'Papel inválido ou nulo. Valores permitidos: admin, gerente ou membro.'
      USING ERRCODE = '22023';
  END IF;

  IF p_alvo_usuario_id = v_uid THEN
    RAISE EXCEPTION 'Um administrador não pode alterar o próprio papel por esta operação.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.empresa_id
  INTO v_empresa_id
  FROM public.perfis p
  WHERE p.id = v_uid AND p.papel = 'admin'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores da empresa podem autorizar alteração de papel.'
      USING ERRCODE = '42501';
  END IF;

  -- Serializa alterações de papéis e exclusões de admins na mesma empresa
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('empresa_admins:' || v_empresa_id::text, 0)
  );

  -- Revalida após o lock contra rebaixamento concorrente do próprio chamador
  IF NOT EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.id = v_uid AND p.empresa_id = v_empresa_id AND p.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Privilégio administrativo alterado durante a operação.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.empresa_id, p.papel
  INTO v_alvo_empresa_id, v_alvo_papel_atual
  FROM public.perfis p
  WHERE p.id = p_alvo_usuario_id
  FOR UPDATE;

  IF v_alvo_empresa_id IS NULL OR v_alvo_empresa_id <> v_empresa_id THEN
    RAISE EXCEPTION 'Usuário alvo não pertence à sua empresa.'
      USING ERRCODE = '42501';
  END IF;

  -- Qualquer saída do papel admin (para gerente ou membro) exige outro admin ativo
  IF v_alvo_papel_atual = 'admin' AND p_novo_papel <> 'admin' THEN
    SELECT pg_catalog.count(*)
    INTO v_total_admins
    FROM public.perfis p
    WHERE p.empresa_id = v_empresa_id AND p.papel = 'admin';

    IF v_total_admins <= 1 THEN
      RAISE EXCEPTION 'A empresa deve manter pelo menos um administrador ativo.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  v_txid := pg_catalog.pg_current_xact_id();

  INSERT INTO safra_interno.autorizacoes_transacao (txid, operacao, alvo_id, detalhe)
  VALUES (v_txid, 'role_change', p_alvo_usuario_id, p_novo_papel)
  ON CONFLICT DO NOTHING;

  UPDATE public.perfis
  SET papel = p_novo_papel
  WHERE id = p_alvo_usuario_id AND public.perfis.empresa_id = v_empresa_id;

  DELETE FROM safra_interno.autorizacoes_transacao a
  WHERE a.txid = v_txid
    AND a.operacao = 'role_change'
    AND a.alvo_id = p_alvo_usuario_id
    AND a.detalhe = p_novo_papel;

  RETURN QUERY
  SELECT p_alvo_usuario_id, v_empresa_id, p_novo_papel;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Triggers de proteção (empresa, cascata administrativa, perfis, convites e FKs)
-- ----------------------------------------------------------------------------

-- 6.1 Bloqueia alteração de id, criado_em e plano em empresas para clientes autenticados
CREATE OR REPLACE FUNCTION public.proteger_alteracao_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Não é permitido alterar o identificador da empresa.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
    RAISE EXCEPTION 'Não é permitido alterar a data de criação da empresa.'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL AND NEW.plano IS DISTINCT FROM OLD.plano THEN
    RAISE EXCEPTION 'A alteração do plano da empresa é exclusiva do ambiente administrativo (service_role).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_alteracao_empresa ON public.empresas;
CREATE TRIGGER trg_proteger_alteracao_empresa
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_alteracao_empresa();

-- 6.2 Registra exclusão administrativa em cascata (somente service_role/SQL Editor)
CREATE OR REPLACE FUNCTION public.preparar_exclusao_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Usuários autenticados não têm permissão para excluir empresas.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM safra_interno.autorizacoes_transacao a
  WHERE a.operacao = 'delete_empresa'
    AND a.criado_em < pg_catalog.now() - interval '1 day';

  INSERT INTO safra_interno.autorizacoes_transacao (txid, operacao, alvo_id, detalhe)
  VALUES (pg_catalog.pg_current_xact_id(), 'delete_empresa', OLD.id, '')
  ON CONFLICT DO NOTHING;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_preparar_exclusao_empresa ON public.empresas;
CREATE TRIGGER trg_preparar_exclusao_empresa
  BEFORE DELETE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.preparar_exclusao_empresa();

-- 6.3 Impede troca de id, empresa_id, email e alteração de papel sem ticket interno
CREATE OR REPLACE FUNCTION public.proteger_alteracao_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_consumido INTEGER;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Não é permitido alterar o identificador do perfil.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Não é permitido transferir um perfil para outra empresa.'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Não é permitido alterar o e-mail vinculado diretamente em perfis.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.papel IS DISTINCT FROM OLD.papel THEN
      DELETE FROM safra_interno.autorizacoes_transacao a
      WHERE a.txid = pg_catalog.pg_current_xact_id()
        AND a.operacao = 'role_change'
        AND a.alvo_id = NEW.id
        AND a.detalhe = NEW.papel
      RETURNING 1 INTO v_consumido;

      IF v_consumido IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'Alteração de papel permitida apenas via autorizar_alteracao_papel_membro().'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_alteracao_perfil ON public.perfis;
CREATE TRIGGER trg_proteger_alteracao_perfil
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_alteracao_perfil();

-- 6.4 Impede exclusão do último administrador, exceto durante exclusão administrativa da empresa
CREATE OR REPLACE FUNCTION public.impedir_exclusao_ultimo_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Libera apenas quando a própria empresa está sendo excluída administrativamente (auth.uid() IS NULL)
  IF auth.uid() IS NULL AND EXISTS (
    SELECT 1
    FROM safra_interno.autorizacoes_transacao a
    WHERE a.txid = pg_catalog.pg_current_xact_id()
      AND a.operacao = 'delete_empresa'
      AND a.alvo_id = OLD.empresa_id
  ) THEN
    RETURN OLD;
  END IF;

  IF OLD.papel = 'admin' AND EXISTS (
    SELECT 1 FROM public.empresas e WHERE e.id = OLD.empresa_id
  ) THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('empresa_admins:' || OLD.empresa_id::text, 0)
    );

    IF NOT EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.empresa_id = OLD.empresa_id
        AND p.id <> OLD.id
        AND p.papel = 'admin'
    ) THEN
      RAISE EXCEPTION 'Não é possível excluir o último administrador enquanto a empresa existir. Promova outro administrador via autorizar_alteracao_papel_membro() ou exclua primeiro a empresa em public.empresas.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_exclusao_ultimo_admin ON public.perfis;
CREATE TRIGGER trg_impedir_exclusao_ultimo_admin
  BEFORE DELETE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_exclusao_ultimo_admin();

-- 6.5 Protege transições de status e colunas imutáveis em convites_empresa
CREATE OR REPLACE FUNCTION public.proteger_atualizacao_convite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_autorizado_rpc BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
       OR NEW.email_convidado IS DISTINCT FROM OLD.email_convidado
       OR NEW.cargo IS DISTINCT FROM OLD.cargo
       OR NEW.papel IS DISTINCT FROM OLD.papel
       OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
       OR NEW.criado_por IS DISTINCT FROM OLD.criado_por
       OR NEW.expira_em IS DISTINCT FROM OLD.expira_em
       OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'Colunas estruturais do convite são imutáveis.'
        USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM safra_interno.autorizacoes_transacao a
      WHERE a.txid = pg_catalog.pg_current_xact_id()
        AND a.operacao = 'invite_manage'
        AND a.alvo_id = OLD.empresa_id
        AND a.detalhe = OLD.email_convidado
    )
    INTO v_autorizado_rpc;

    IF NOT v_autorizado_rpc THEN
      IF NEW.aceito_por IS DISTINCT FROM OLD.aceito_por
         OR NEW.aceito_em IS DISTINCT FROM OLD.aceito_em THEN
        RAISE EXCEPTION 'Apenas o status do convite pode ser revogado diretamente.'
          USING ERRCODE = '42501';
      END IF;

      IF OLD.status <> 'pendente' OR NEW.status <> 'revogado' THEN
        RAISE EXCEPTION 'Transição direta permitida apenas de pendente para revogado.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_atualizacao_convite ON public.convites_empresa;
CREATE TRIGGER trg_proteger_atualizacao_convite
  BEFORE UPDATE ON public.convites_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_atualizacao_convite();

-- 6.6 Protege imutabilidade de id e empresa_id em clientes
CREATE OR REPLACE FUNCTION public.proteger_identidade_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Não é permitido alterar o identificador do cliente.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Não é permitido alterar a empresa do cliente.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_identidade_cliente ON public.clientes;
CREATE TRIGGER trg_proteger_identidade_cliente
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_identidade_cliente();

-- 6.7 Valida integridade multi-tenant de cliente_id (processos e vendas) e ON DELETE SET NULL
CREATE OR REPLACE FUNCTION public.validar_fk_cliente_mesma_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Não é permitido alterar o identificador do registro.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a empresa do registro.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = NEW.cliente_id AND c.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'cliente_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_processo_empresa ON public.processos;
CREATE TRIGGER trg_validar_processo_empresa
  BEFORE INSERT OR UPDATE ON public.processos
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fk_cliente_mesma_empresa();

DROP TRIGGER IF EXISTS trg_validar_venda_empresa ON public.vendas;
CREATE TRIGGER trg_validar_venda_empresa
  BEFORE INSERT OR UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fk_cliente_mesma_empresa();

-- 6.8 Valida integridade multi-tenant de etapas_processo
CREATE OR REPLACE FUNCTION public.validar_fk_processo_mesma_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Não é permitido alterar o identificador da etapa.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a empresa da etapa.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = NEW.processo_id AND p.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'processo_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_etapa_empresa ON public.etapas_processo;
CREATE TRIGGER trg_validar_etapa_empresa
  BEFORE INSERT OR UPDATE ON public.etapas_processo
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fk_processo_mesma_empresa();

-- 6.9 Valida integridade multi-tenant de tarefas (compatível com ON DELETE SET NULL)
CREATE OR REPLACE FUNCTION public.validar_fks_tarefa_mesma_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Não é permitido alterar o identificador da tarefa.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a empresa da tarefa.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = NEW.cliente_id AND c.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'cliente_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.processo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = NEW.processo_id AND p.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'processo_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_tarefa_empresa ON public.tarefas;
CREATE TRIGGER trg_validar_tarefa_empresa
  BEFORE INSERT OR UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fks_tarefa_mesma_empresa();

-- 6.10 Valida integridade multi-tenant de lancamentos_financeiros (compatível com ON DELETE SET NULL)
CREATE OR REPLACE FUNCTION public.validar_fks_lancamento_mesma_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Não é permitido alterar o identificador do lançamento financeiro.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a empresa do lançamento financeiro.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = NEW.cliente_id AND c.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'cliente_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.venda_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendas v
    WHERE v.id = NEW.venda_id AND v.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'venda_id pertence a outra empresa ou não existe.'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_lancamento_empresa ON public.lancamentos_financeiros;
CREATE TRIGGER trg_validar_lancamento_empresa
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fks_lancamento_mesma_empresa();

-- ----------------------------------------------------------------------------
-- 7. Limpeza completa de privilégios antigos (tabela + coluna) e novos GRANTs
-- ----------------------------------------------------------------------------

-- Revoga CREATE no schema public para evitar criação/substituição de objetos por não confiáveis
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Limpa privilégios antigos de tabela E de todas as colunas nas 9 tabelas do Safra.pro
DO $$
DECLARE
  v_tab TEXT;
  v_cols TEXT;
BEGIN
  FOREACH v_tab IN ARRAY ARRAY[
    'empresas',
    'perfis',
    'convites_empresa',
    'clientes',
    'processos',
    'etapas_processo',
    'tarefas',
    'vendas',
    'lancamentos_financeiros'
  ]
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;',
      v_tab
    );

    SELECT pg_catalog.string_agg(pg_catalog.quote_ident(att.attname), ', ')
    INTO v_cols
    FROM pg_catalog.pg_attribute att
    JOIN pg_catalog.pg_class rel ON rel.oid = att.attrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = v_tab
      AND att.attnum > 0
      AND NOT att.attisdropped;

    IF v_cols IS NOT NULL THEN
      EXECUTE pg_catalog.format(
        'REVOKE ALL (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated;',
        v_cols,
        v_tab
      );
    END IF;
  END LOOP;
END;
$$;

-- EMPRESAS: privilégio por coluna protege plano, id e criado_em
GRANT SELECT ON TABLE public.empresas TO authenticated;
GRANT UPDATE (nome, segmento, cnpj) ON TABLE public.empresas TO authenticated;

-- PERFIS: sem INSERT direto; UPDATE somente em colunas cadastrais (protege id, empresa_id, email, papel, criado_em)
GRANT SELECT, DELETE ON TABLE public.perfis TO authenticated;
GRANT UPDATE (nome_completo, cargo) ON TABLE public.perfis TO authenticated;

-- CONVITES_EMPRESA: token_hash nunca exposto via SELECT; empresa_id e papel protegidos contra UPDATE
GRANT SELECT (id, empresa_id, email_convidado, cargo, papel, criado_por, status, expira_em, aceito_por, aceito_em, criado_em)
  ON TABLE public.convites_empresa TO authenticated;
GRANT UPDATE (status) ON TABLE public.convites_empresa TO authenticated;
GRANT DELETE ON TABLE public.convites_empresa TO authenticated;

-- Tabelas operacionais e financeiras (empresa_id e id protegidos contra alteração via triggers + RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.etapas_processo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vendas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lancamentos_financeiros TO authenticated;

-- Service role mantém controle administrativo completo (backend/billing/exclusão de empresas)
GRANT ALL ON TABLE public.empresas TO service_role;
GRANT ALL ON TABLE public.perfis TO service_role;
GRANT ALL ON TABLE public.convites_empresa TO service_role;
GRANT ALL ON TABLE public.clientes TO service_role;
GRANT ALL ON TABLE public.processos TO service_role;
GRANT ALL ON TABLE public.etapas_processo TO service_role;
GRANT ALL ON TABLE public.tarefas TO service_role;
GRANT ALL ON TABLE public.vendas TO service_role;
GRANT ALL ON TABLE public.lancamentos_financeiros TO service_role;

-- Funções auxiliares e RPCs
REVOKE ALL ON FUNCTION public.current_empresa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_papel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_papel() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_empresa_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_empresa_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_empresa_gestor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_empresa_gestor() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sou_principal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sou_principal() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.listar_empresas_principal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_empresas_principal() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.provisionar_empresa_inicial(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provisionar_empresa_inicial(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.criar_convite_empresa(TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_convite_empresa(TEXT, TEXT, INTEGER, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aceitar_convite_empresa(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceitar_convite_empresa(TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.autorizar_alteracao_papel_membro(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autorizar_alteracao_papel_membro(UUID, TEXT, BOOLEAN) TO authenticated, service_role;

-- Funções de trigger nunca podem ser chamadas diretamente via RPC
REVOKE ALL ON FUNCTION public.proteger_alteracao_empresa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preparar_exclusao_empresa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_alteracao_perfil() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.impedir_exclusao_ultimo_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_atualizacao_convite() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_identidade_cliente() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_fk_cliente_mesma_empresa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_fk_processo_mesma_empresa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_fks_tarefa_mesma_empresa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_fks_lancamento_mesma_empresa() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Habilitar Row Level Security (RLS) em todas as tabelas
-- ----------------------------------------------------------------------------

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 9. Limpeza dinâmica de TODAS as políticas prévias (antigas ou desconhecidas)
-- ----------------------------------------------------------------------------
-- Evita que políticas legadas ou criadas manualmente no painel continuem
-- concedendo acesso via combinação OR de políticas permissivas do PostgreSQL.

DO $$
DECLARE
  v_pol RECORD;
BEGIN
  FOR v_pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'empresas',
        'perfis',
        'convites_empresa',
        'clientes',
        'processos',
        'etapas_processo',
        'tarefas',
        'vendas',
        'lancamentos_financeiros'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      v_pol.policyname,
      v_pol.schemaname,
      v_pol.tablename
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. Políticas RLS granulares (SELECT, INSERT, UPDATE, DELETE) — TO authenticated
-- ----------------------------------------------------------------------------

-- 10.1 EMPRESAS (admin ou gerente podem editar nome, segmento e cnpj)
CREATE POLICY "empresas_select_propria"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (id = (SELECT public.current_empresa_id()));

CREATE POLICY "empresas_update_gestor"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (id = (SELECT public.current_empresa_id()) AND (SELECT public.is_empresa_gestor()))
  WITH CHECK (id = (SELECT public.current_empresa_id()) AND (SELECT public.is_empresa_gestor()));

-- 10.2 PERFIS
CREATE POLICY "perfis_select_mesma_empresa"
  ON public.perfis FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "perfis_update_proprio_sem_escalacao"
  ON public.perfis FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND empresa_id = (SELECT public.current_empresa_id())
    AND papel = (SELECT public.current_user_papel())
  );

-- Admin edita nome/cargo de qualquer perfil da empresa; gerente, apenas de não-admins
CREATE POLICY "perfis_update_gestor_empresa"
  ON public.perfis FOR UPDATE
  TO authenticated
  USING (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      (SELECT public.is_empresa_admin())
      OR ((SELECT public.is_empresa_gestor()) AND papel <> 'admin')
    )
  )
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      (SELECT public.is_empresa_admin())
      OR ((SELECT public.is_empresa_gestor()) AND papel <> 'admin')
    )
  );

CREATE POLICY "perfis_delete_admin_membro"
  ON public.perfis FOR DELETE
  TO authenticated
  USING (
    empresa_id = (SELECT public.current_empresa_id())
    AND (SELECT public.is_empresa_admin())
    AND id <> auth.uid()
    AND papel <> 'admin'
  );

-- 10.3 CONVITES_EMPRESA (gerente visualiza; apenas admin revoga ou exclui)
CREATE POLICY "convites_select_gestor"
  ON public.convites_empresa FOR SELECT
  TO authenticated
  USING (
    empresa_id = (SELECT public.current_empresa_id())
    AND (SELECT public.is_empresa_gestor())
  );

CREATE POLICY "convites_update_revogar_admin"
  ON public.convites_empresa FOR UPDATE
  TO authenticated
  USING (
    empresa_id = (SELECT public.current_empresa_id())
    AND (SELECT public.is_empresa_admin())
    AND status = 'pendente'
  )
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (SELECT public.is_empresa_admin())
    AND status = 'revogado'
  );

CREATE POLICY "convites_delete_admin"
  ON public.convites_empresa FOR DELETE
  TO authenticated
  USING (
    empresa_id = (SELECT public.current_empresa_id())
    AND (SELECT public.is_empresa_admin())
  );

-- 10.4 CLIENTES
CREATE POLICY "clientes_select_empresa"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "clientes_insert_empresa"
  ON public.clientes FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "clientes_update_empresa"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "clientes_delete_empresa"
  ON public.clientes FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

-- 10.5 PROCESSOS
CREATE POLICY "processos_select_empresa"
  ON public.processos FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "processos_insert_empresa"
  ON public.processos FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "processos_update_empresa"
  ON public.processos FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "processos_delete_empresa"
  ON public.processos FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

-- 10.6 ETAPAS_PROCESSO
CREATE POLICY "etapas_select_empresa"
  ON public.etapas_processo FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "etapas_insert_empresa"
  ON public.etapas_processo FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = processo_id AND p.empresa_id = (SELECT public.current_empresa_id())
    )
  );

CREATE POLICY "etapas_update_empresa"
  ON public.etapas_processo FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = processo_id AND p.empresa_id = (SELECT public.current_empresa_id())
    )
  );

CREATE POLICY "etapas_delete_empresa"
  ON public.etapas_processo FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

-- 10.7 TAREFAS
CREATE POLICY "tarefas_select_empresa"
  ON public.tarefas FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "tarefas_insert_empresa"
  ON public.tarefas FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
    AND (
      processo_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.processos p
        WHERE p.id = processo_id AND p.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "tarefas_update_empresa"
  ON public.tarefas FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
    AND (
      processo_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.processos p
        WHERE p.id = processo_id AND p.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "tarefas_delete_empresa"
  ON public.tarefas FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

-- 10.8 VENDAS
CREATE POLICY "vendas_select_empresa"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "vendas_insert_empresa"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "vendas_update_empresa"
  ON public.vendas FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "vendas_delete_empresa"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

-- 10.9 LANCAMENTOS_FINANCEIROS
CREATE POLICY "lancamentos_select_empresa"
  ON public.lancamentos_financeiros FOR SELECT
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

CREATE POLICY "lancamentos_insert_empresa"
  ON public.lancamentos_financeiros FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
    AND (
      venda_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.vendas v
        WHERE v.id = venda_id AND v.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "lancamentos_update_empresa"
  ON public.lancamentos_financeiros FOR UPDATE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()))
  WITH CHECK (
    empresa_id = (SELECT public.current_empresa_id())
    AND (
      cliente_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = cliente_id AND c.empresa_id = (SELECT public.current_empresa_id())
      )
    )
    AND (
      venda_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.vendas v
        WHERE v.id = venda_id AND v.empresa_id = (SELECT public.current_empresa_id())
      )
    )
  );

CREATE POLICY "lancamentos_delete_empresa"
  ON public.lancamentos_financeiros FOR DELETE
  TO authenticated
  USING (empresa_id = (SELECT public.current_empresa_id()));

COMMIT;
