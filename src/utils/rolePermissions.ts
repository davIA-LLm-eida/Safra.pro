import type {PapelEmpresa, PlanoEmpresa, StatusConvite} from '../types/database';
import {formatarMesCurto} from './workspaceLogic';

export function podeEditarEmpresa(papel?: PapelEmpresa | null): boolean {
  return papel === 'admin' || papel === 'gerente';
}

export function podeVerConvites(papel?: PapelEmpresa | null): boolean {
  return papel === 'admin' || papel === 'gerente';
}

export function podeGerenciarConvites(papel?: PapelEmpresa | null): boolean {
  return papel === 'admin';
}

export function podeAlterarPapel(papel?: PapelEmpresa | null): boolean {
  return papel === 'admin';
}

export function podeEditarPerfilAlvo(
  papelAtor: PapelEmpresa | null | undefined,
  atorId: string,
  alvoId: string,
  alvoPapel: PapelEmpresa,
): boolean {
  if (!papelAtor) return false;
  if (atorId === alvoId) return true;
  if (papelAtor === 'admin') return true;
  if (papelAtor === 'gerente') return alvoPapel !== 'admin';
  return false;
}

export function podeExcluirPerfilAlvo(
  papelAtor: PapelEmpresa | null | undefined,
  atorId: string,
  alvoId: string,
  alvoPapel: PapelEmpresa,
): boolean {
  if (papelAtor !== 'admin') return false;
  if (atorId === alvoId) return false;
  return alvoPapel !== 'admin';
}

export const LABEL_PAPEL_EMPRESA: Record<PapelEmpresa, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  membro: 'Membro',
};

export const LABEL_PLANO_EMPRESA: Record<PlanoEmpresa, string> = {
  essencial: 'Essencial',
  profissional: 'Profissional',
  escala: 'Escala',
};

export const LABEL_STATUS_CONVITE: Record<StatusConvite, string> = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  revogado: 'Revogado',
  expirado: 'Expirado',
};

export interface OpcaoPeriodo {
  valor: string;
  label: string;
}

const NOMES_MESES_COMPLETOS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatarMesLongo(mesISO: string): string {
  const [ano, mes] = mesISO.split('-');
  const idx = Number(mes) - 1;
  if (!ano || Number.isNaN(idx) || idx < 0 || idx > 11) return formatarMesCurto(mesISO);
  return `${NOMES_MESES_COMPLETOS[idx]} ${ano}`;
}

export function gerarOpcoesPeriodo(
  mesReferencia: string,
  datasExistentes: string[],
): OpcaoPeriodo[] {
  const mesesSet = new Set<string>();
  if (/^\d{4}-\d{2}$/.test(mesReferencia)) {
    mesesSet.add(mesReferencia);

    const [anoStr, mesStr] = mesReferencia.split('-');
    let ano = Number(anoStr);
    let mes = Number(mesStr);
    for (let i = 1; i <= 5; i++) {
      mes -= 1;
      if (mes < 1) {
        mes = 12;
        ano -= 1;
      }
      mesesSet.add(`${ano}-${String(mes).padStart(2, '0')}`);
    }
  }

  for (const d of datasExistentes) {
    const ym = d.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(ym)) {
      mesesSet.add(ym);
    }
  }

  const ordenados = Array.from(mesesSet).sort((a, b) => b.localeCompare(a));

  return [
    ...ordenados.map((valor) => ({
      valor,
      label: formatarMesLongo(valor),
    })),
    {valor: 'todos', label: 'Todos os períodos'},
  ];
}

export function traduzirErroSupabase(erro: unknown, fallback = 'Operação não concluída.'): string {
  const mensagemBruta =
    erro instanceof Error
      ? erro.message
      : typeof erro === 'object' && erro !== null && 'message' in erro
        ? String((erro as {message?: unknown}).message ?? '')
        : String(erro ?? '');

  const lower = mensagemBruta.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail no link enviado pelo Supabase Auth antes de entrar.';
  }
  if (lower.includes('user already registered')) {
    return 'Já existe uma conta cadastrada com este e-mail. Tente entrar ou recuperar sua senha.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (lower.includes('new password should be different') || lower.includes('same_password')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }
  if (lower.includes('signup_disabled') || lower.includes('signups not allowed')) {
    return 'O cadastro de novos usuários está desabilitado nas configurações do Supabase Auth.';
  }
  if (
    lower.includes('otp_expired') ||
    lower.includes('token has expired') ||
    lower.includes('email link is invalid')
  ) {
    return 'O link de verificação ou recuperação expirou ou já foi utilizado. Solicite um novo link.';
  }
  if (
    lower.includes('invalid refresh token') ||
    lower.includes('refresh token not found') ||
    lower.includes('user from sub claim in jwt does not exist') ||
    lower.includes('auth session missing')
  ) {
    return 'Sua sessão expirou ou não é mais válida. Faça login novamente.';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved')
  ) {
    return 'Não foi possível conectar ao servidor Supabase. Verifique sua conexão e as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
  }
  if (lower.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Você não tem permissão para executar esta operação nesta empresa.';
  }
  if (mensagemBruta.trim().length > 0) {
    return mensagemBruta;
  }
  return fallback;
}
