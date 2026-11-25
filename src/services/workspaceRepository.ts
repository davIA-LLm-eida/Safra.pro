import {getSupabaseClient, isSupabaseConfigured} from '../lib/supabase';
import type {Cliente, Empresa, Processo, Tarefa, UsuarioPerfil} from '../types/database';

export type ModoPersistencia = 'demo' | 'supabase';

export interface EstadoIntegracaoSupabase {
  configurado: boolean;
  modoAtual: ModoPersistencia;
  urlDefinida: boolean;
  chaveAnonDefinida: boolean;
}

export function obterEstadoIntegracaoSupabase(): EstadoIntegracaoSupabase {
  const urlDefinida = Boolean(import.meta.env.VITE_SUPABASE_URL?.trim());
  const chaveAnonDefinida = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY?.trim());
  const configurado = isSupabaseConfigured();

  return {
    configurado,
    modoAtual: configurado ? 'supabase' : 'demo',
    urlDefinida,
    chaveAnonDefinida,
  };
}

/**
 * Contrato de repositório preparado para alternar entre o estado demonstrativo local
 * e consultas reais no Supabase filtradas por empresa_id + RLS.
 */
export interface WorkspaceRepository {
  modo: ModoPersistencia;
  listarClientes(empresaId: string): Promise<Cliente[]>;
  listarTarefas(empresaId: string): Promise<Tarefa[]>;
  listarProcessos(empresaId: string): Promise<Processo[]>;
}

export function criarSupabaseRepository(): WorkspaceRepository | null {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  return {
    modo: 'supabase',
    async listarClientes(empresaId: string): Promise<Cliente[]> {
      const {data, error} = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', {ascending: false});

      if (error) {
        throw new Error(`Erro ao carregar clientes no Supabase: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        empresaId: row.empresa_id,
        nome: row.nome,
        documento: row.documento,
        email: row.email,
        telefone: row.telefone,
        segmento: row.segmento,
        responsavel: row.responsavel,
        status: row.status,
        observacoes: row.observacoes,
        criadoEm: row.criado_em.slice(0, 10),
      }));
    },
    async listarTarefas(empresaId: string): Promise<Tarefa[]> {
      const {data, error} = await supabase
        .from('tarefas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('prazo', {ascending: true});

      if (error) {
        throw new Error(`Erro ao carregar tarefas no Supabase: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        empresaId: row.empresa_id,
        clienteId: row.cliente_id ?? undefined,
        processoId: row.processo_id ?? undefined,
        titulo: row.titulo,
        descricao: row.descricao,
        prioridade: row.prioridade,
        status: row.status,
        prazo: row.prazo,
        responsavel: row.responsavel,
        criadoEm: row.criado_em.slice(0, 10),
      }));
    },
    async listarProcessos(empresaId: string): Promise<Processo[]> {
      const {data, error} = await supabase
        .from('processos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', {ascending: false});

      if (error) {
        throw new Error(`Erro ao carregar processos no Supabase: ${error.message}`);
      }

      const {data: etapasData, error: etapasError} = await supabase
        .from('etapas_processo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', {ascending: true});

      if (etapasError) {
        throw new Error(`Erro ao carregar etapas no Supabase: ${etapasError.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        empresaId: row.empresa_id,
        clienteId: row.cliente_id ?? undefined,
        titulo: row.titulo,
        categoria: row.categoria,
        responsavel: row.responsavel,
        status: row.status,
        descricao: row.descricao,
        criadoEm: row.criado_em.slice(0, 10),
        etapas: (etapasData ?? [])
          .filter((e) => e.processo_id === row.id)
          .map((e) => ({
            id: e.id,
            empresaId: e.empresa_id,
            processoId: e.processo_id,
            titulo: e.titulo,
            ordem: e.ordem,
            concluida: e.concluida,
          })),
      }));
    },
  };
}

export interface SessaoAutenticada {
  usuario: UsuarioPerfil;
  empresa: Empresa;
  modo: ModoPersistencia;
}
