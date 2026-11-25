import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '../types/database';
import {
  validarConfiguracaoSupabase,
  type DiagnosticoConfiguracaoSupabase,
} from '../utils/supabaseConfig';

function lerVariaveisAmbienteSupabase(): {url: string; anonKey: string} {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return {url: '', anonKey: ''};
  }
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  return {url, anonKey};
}

export function obterDiagnosticoSupabase(): DiagnosticoConfiguracaoSupabase {
  const {url, anonKey} = lerVariaveisAmbienteSupabase();
  return validarConfiguracaoSupabase(url, anonKey);
}

export function isSupabaseConfigured(): boolean {
  return obterDiagnosticoSupabase().configurado;
}

let cachedClient: SupabaseClient<Database> | null = null;
let cachedConfigSignature = '';

/**
 * Retorna o cliente Supabase tipado quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * são válidas no ambiente. Caso contrário, retorna null com segurança para manter
 * o Modo Demonstração ativo sem quebrar a aplicação.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const {url, anonKey} = lerVariaveisAmbienteSupabase();
  const diagnostico = validarConfiguracaoSupabase(url, anonKey);
  if (!diagnostico.configurado) {
    return null;
  }

  const signature = `${url}::${anonKey.length}`;
  if (!cachedClient || cachedConfigSignature !== signature) {
    try {
      cachedClient = createClient<Database>(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      cachedConfigSignature = signature;
    } catch {
      cachedClient = null;
      cachedConfigSignature = '';
      return null;
    }
  }

  return cachedClient;
}

export type StatusTesteConexaoSupabase =
  | 'conectado'
  | 'conectado_sem_schema'
  | 'erro_configuracao'
  | 'erro_autenticacao'
  | 'erro_rede';

export interface ResultadoTesteConexaoSupabase {
  status: StatusTesteConexaoSupabase;
  conexaoHttpOk: boolean;
  schemaPronto: boolean;
  titulo: string;
  mensagem: string;
  detalheTecnico?: string;
  latenciaMs?: number;
  sessaoAtiva?: boolean;
  testadoEm: string;
}

/**
 * Executa um teste real de conectividade contra o projeto Supabase configurado
 * usando @supabase/supabase-js (consulta real à API REST + verificação de sessão).
 * Nunca simula sucesso.
 */
export async function testarConexaoSupabase(): Promise<ResultadoTesteConexaoSupabase> {
  const testadoEm = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const diagnostico = obterDiagnosticoSupabase();
  if (!diagnostico.configurado) {
    return {
      status: 'erro_configuracao',
      conexaoHttpOk: false,
      schemaPronto: false,
      titulo: 'Configuração de ambiente inválida ou incompleta',
      mensagem:
        diagnostico.motivoBloqueio ??
        'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar configuradas corretamente.',
      detalheTecnico: diagnostico.urlPreviewSeguro
        ? `URL detectada: ${diagnostico.urlPreviewSeguro}`
        : undefined,
      testadoEm,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      status: 'erro_configuracao',
      conexaoHttpOk: false,
      schemaPronto: false,
      titulo: 'Não foi possível inicializar o cliente Supabase',
      mensagem:
        'Verifique se VITE_SUPABASE_URL possui protocolo https:// válido e se VITE_SUPABASE_ANON_KEY está preenchida.',
      testadoEm,
    };
  }

  const inicio = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const [sessionResult, tableResult] = await Promise.all([
      supabase.auth.getSession(),
      supabase.from('empresas').select('id', {count: 'exact', head: true}),
    ]);

    const fim = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latenciaMs = Math.max(1, Math.round(fim - inicio));
    const sessaoAtiva = Boolean(sessionResult.data?.session);

    if (!tableResult.error) {
      return {
        status: 'conectado',
        conexaoHttpOk: true,
        schemaPronto: true,
        titulo: 'Conexão real com o Supabase confirmada',
        mensagem:
          'O endpoint da API respondeu, a chave pública foi aceita e a tabela "empresas" está acessível no schema público.',
        detalheTecnico: sessaoAtiva
          ? 'Sessão de usuário autenticada detectada no navegador.'
          : 'Conectado em acesso anônimo (RLS ativo conforme esperado antes do login).',
        latenciaMs,
        sessaoAtiva,
        testadoEm,
      };
    }

    const erro = tableResult.error;
    const codigo = erro.code ?? '';
    const statusHttp = tableResult.status;
    const msgLower = erro.message.toLowerCase();

    const tabelaNaoExiste =
      codigo === 'PGRST205' ||
      codigo === '42P01' ||
      statusHttp === 404 ||
      msgLower.includes('schema cache') ||
      msgLower.includes('does not exist');

    if (tabelaNaoExiste) {
      return {
        status: 'conectado_sem_schema',
        conexaoHttpOk: true,
        schemaPronto: false,
        titulo: 'Conectado ao Supabase, mas as tabelas ainda não foram criadas',
        mensagem:
          'A comunicação HTTPS e a chave pública funcionaram, porém a tabela "empresas" ainda não existe no projeto. Execute supabase/schema.sql no SQL Editor do Supabase.',
        detalheTecnico: `Código ${codigo || statusHttp}: ${erro.message}`,
        latenciaMs,
        sessaoAtiva,
        testadoEm,
      };
    }

    const erroAuth =
      statusHttp === 401 ||
      statusHttp === 403 ||
      codigo === 'PGRST301' ||
      msgLower.includes('invalid api key') ||
      msgLower.includes('jwt');

    if (erroAuth) {
      return {
        status: 'erro_autenticacao',
        conexaoHttpOk: false,
        schemaPronto: false,
        titulo: 'Chave pública rejeitada pelo Supabase',
        mensagem:
          'O servidor do Supabase recusou VITE_SUPABASE_ANON_KEY. Confira a Publishable / anon key em Project Settings → API Keys.',
        detalheTecnico: `HTTP ${statusHttp}${codigo ? ` (${codigo})` : ''}: ${erro.message}`,
        latenciaMs,
        testadoEm,
      };
    }

    return {
      status: 'erro_rede',
      conexaoHttpOk: false,
      schemaPronto: false,
      titulo: 'Falha ao consultar o projeto Supabase',
      mensagem:
        'A requisição retornou um erro inesperado ao consultar a API REST do Supabase.',
      detalheTecnico: `HTTP ${statusHttp}${codigo ? ` (${codigo})` : ''}: ${erro.message}`,
      latenciaMs,
      testadoEm,
    };
  } catch (err) {
    const fim = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latenciaMs = Math.max(1, Math.round(fim - inicio));
    const message =
      err instanceof Error
        ? err.message
        : 'Erro de rede desconhecido ao acessar o Supabase.';

    return {
      status: 'erro_rede',
      conexaoHttpOk: false,
      schemaPronto: false,
      titulo: 'Não foi possível alcançar o servidor Supabase',
      mensagem:
        'Verifique se a Project URL em VITE_SUPABASE_URL está acessível e se não há bloqueio de rede ou CORS.',
      detalheTecnico: message,
      latenciaMs,
      testadoEm,
    };
  }
}
