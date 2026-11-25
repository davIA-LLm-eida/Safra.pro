import type {SecaoAtiva} from '../types/database';

const PATH_TO_SECAO: Record<string, SecaoAtiva> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/financeiro': 'financeiro',
  '/tarefas': 'tarefas',
  '/clientes': 'clientes',
  '/processos': 'processos',
  '/equipe': 'equipe',
  '/principal': 'principal',
  '/assistente': 'assistente',
  '/integracao': 'integracao',
};

const SECAO_TO_PATH: Record<SecaoAtiva, string> = {
  dashboard: '/',
  financeiro: '/financeiro',
  tarefas: '/tarefas',
  clientes: '/clientes',
  processos: '/processos',
  equipe: '/equipe',
  principal: '/principal',
  assistente: '/assistente',
  integracao: '/integracao',
};

export function secaoParaPathname(secao: SecaoAtiva): string {
  return SECAO_TO_PATH[secao] ?? '/';
}

export function pathnameParaSecao(pathname: string): SecaoAtiva {
  const normalizado = pathname.replace(/\/+$/, '') || '/';
  return PATH_TO_SECAO[normalizado] ?? 'dashboard';
}

export function resolverSecaoPermitida(
  secaoDesejada: SecaoAtiva,
  opcoes: {
    autenticado: boolean;
    temEmpresa: boolean;
    isPrincipal: boolean;
  },
): SecaoAtiva {
  if (!opcoes.autenticado) {
    return 'dashboard';
  }

  if (secaoDesejada === 'principal') {
    if (opcoes.isPrincipal) return 'principal';
    return opcoes.temEmpresa ? 'dashboard' : 'integracao';
  }

  if (!opcoes.temEmpresa) {
    if (secaoDesejada === 'integracao') return 'integracao';
    return opcoes.isPrincipal ? 'principal' : 'integracao';
  }

  return secaoDesejada;
}
