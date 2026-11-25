import {useState, type FormEvent} from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react';
import type {Empresa, UsuarioPerfil} from '../types/database';
import type {DiagnosticoConfiguracaoSupabase} from '../utils/supabaseConfig';
import {BrandWordmark, SafraIcon} from './BrandMark';

export interface UsuarioAuthPendente {
  id: string;
  email: string;
  emailConfirmado: boolean;
}

interface AuthViewProps {
  modoSupabase: boolean;
  diagnosticoSupabase: DiagnosticoConfiguracaoSupabase;
  erroSessao?: string | null;
  modoRedefinicaoSenha?: boolean;
  empresasDisponiveis: Empresa[];
  usuarioAuthPendente?: UsuarioAuthPendente | null;
  onEntrarDemo: (empresaId: string) => void;
  onEntrarComCredenciais: (email: string) => boolean;
  onCadastrarEmpresaEUsuario: (dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
    email: string;
  }) => {empresa: Empresa; usuario: UsuarioPerfil};
  onSupabaseLogin?: (email: string, senha: string) => Promise<void>;
  onSupabaseCadastrarConta?: (dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
    email: string;
    senha: string;
  }) => Promise<{precisaConfirmarEmail: boolean}>;
  onSupabaseAceitarConviteCadastro?: (dados: {
    email: string;
    senha: string;
    nomeCompleto: string;
    tokenConvite: string;
    jaAutenticado?: boolean;
  }) => Promise<{precisaConfirmarEmail: boolean}>;
  onSupabaseProvisionarEmpresa?: (dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
  }) => Promise<void>;
  onSupabaseCadastrarPrincipal?: (dados: {
    nomeCompleto: string;
    email: string;
    senha: string;
  }) => Promise<{precisaConfirmarEmail: boolean}>;
  onSupabaseRecuperarSenha?: (email: string) => Promise<void>;
  onSupabaseAtualizarSenha?: (novaSenha: string) => Promise<void>;
  onSupabaseRecarregarSessao?: () => Promise<void>;
  onSupabaseSair?: () => Promise<void>;
}

export function AuthView({
  modoSupabase,
  diagnosticoSupabase,
  erroSessao,
  modoRedefinicaoSenha = false,
  empresasDisponiveis,
  usuarioAuthPendente,
  onEntrarDemo,
  onCadastrarEmpresaEUsuario,
  onSupabaseLogin,
  onSupabaseCadastrarConta,
  onSupabaseAceitarConviteCadastro,
  onSupabaseProvisionarEmpresa,
  onSupabaseCadastrarPrincipal,
  onSupabaseRecuperarSenha,
  onSupabaseAtualizarSenha,
  onSupabaseRecarregarSessao,
  onSupabaseSair,
}: AuthViewProps) {
  const [aba, setAba] = useState<'entrar' | 'cadastrar' | 'convite' | 'principal'>('entrar');
  const [abaOnboarding, setAbaOnboarding] = useState<'empresa' | 'convite' | 'principal'>('empresa');
  const [modoRecuperacao, setModoRecuperacao] = useState(false);

  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarDemoLocal, setMostrarDemoLocal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [logoImgErro, setLogoImgErro] = useState(false);

  // Campos de cadastro de empresa e usuário
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [segmento, setSegmento] = useState('Serviços');
  const [cnpj, setCnpj] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cargo, setCargo] = useState('Diretor(a) / Sócio(a)');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');

  // Campos de convite
  const [tokenConvite, setTokenConvite] = useState('');
  const [nomeConvite, setNomeConvite] = useState('');
  const [emailConvite, setEmailConvite] = useState('');
  const [senhaConvite, setSenhaConvite] = useState('');

  // Campos de Administrador Principal
  const [nomePrincipal, setNomePrincipal] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [senhaPrincipal, setSenhaPrincipal] = useState('');
  const [sqlCopiado, setSqlCopiado] = useState(false);

  function limparMensagens() {
    setErro(null);
    setSucesso(null);
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();

    if (!modoSupabase) {
      setErro(
        'Autenticação real indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local e reinicie a aplicação. Para explorar dados fictícios offline, utilize a opção "Modo Demonstração Local" abaixo.',
      );
      return;
    }

    if (!emailLogin.trim() || (!modoRecuperacao && !senhaLogin.trim())) {
      setErro('Preencha e-mail e senha para continuar.');
      return;
    }

    if (modoRecuperacao) {
      if (!onSupabaseRecuperarSenha) return;
      setEnviando(true);
      try {
        await onSupabaseRecuperarSenha(emailLogin.trim());
        setSucesso(
          'Se houver uma conta cadastrada com este e-mail, você receberá um link para redefinir sua senha.',
        );
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.');
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (!onSupabaseLogin) return;
    setEnviando(true);
    try {
      await onSupabaseLogin(emailLogin.trim(), senhaLogin);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRedefinirSenhaSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();
    if (!onSupabaseAtualizarSenha) return;

    if (novaSenha.trim().length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErro('A confirmação de senha não confere.');
      return;
    }

    setEnviando(true);
    try {
      await onSupabaseAtualizarSenha(novaSenha);
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setSucesso('Senha redefinida com sucesso!');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleCadastroSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();

    if (
      !nomeEmpresa.trim() ||
      !nomeCompleto.trim() ||
      !emailCadastro.trim() ||
      senhaCadastro.trim().length < 6
    ) {
      setErro(
        'Preencha nome da empresa, nome completo, e-mail válido e senha com ao menos 6 caracteres.',
      );
      return;
    }

    if (!modoSupabase) {
      onCadastrarEmpresaEUsuario({
        nomeEmpresa: nomeEmpresa.trim(),
        segmento: segmento.trim() || 'Serviços',
        cnpj: cnpj.trim(),
        nomeCompleto: nomeCompleto.trim(),
        cargo: cargo.trim() || 'Gestor',
        email: emailCadastro.trim(),
      });
      return;
    }

    if (!onSupabaseCadastrarConta) return;
    setEnviando(true);
    try {
      const res = await onSupabaseCadastrarConta({
        nomeEmpresa: nomeEmpresa.trim(),
        segmento: segmento.trim() || 'Serviços',
        cnpj: cnpj.trim(),
        nomeCompleto: nomeCompleto.trim(),
        cargo: cargo.trim() || 'Administrador(a)',
        email: emailCadastro.trim(),
        senha: senhaCadastro,
      });

      if (res.precisaConfirmarEmail) {
        setSucesso(
          'Conta criada no Supabase Auth! Confirme o e-mail enviado para sua caixa de entrada e depois faça login para concluir a criação da sua empresa.',
        );
        setSenhaCadastro('');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleAceitarConviteCadastroSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();

    if (!onSupabaseAceitarConviteCadastro) return;

    if (!tokenConvite.trim() || !emailConvite.trim() || senhaConvite.trim().length < 6) {
      setErro('Informe o e-mail convidado, senha (mínimo 6 caracteres) e o token do convite.');
      return;
    }

    setEnviando(true);
    try {
      const res = await onSupabaseAceitarConviteCadastro({
        email: emailConvite.trim(),
        senha: senhaConvite,
        nomeCompleto: nomeConvite.trim(),
        tokenConvite: tokenConvite.trim(),
        jaAutenticado: false,
      });
      if (res.precisaConfirmarEmail) {
        setSucesso(
          'Conta criada! Confirme o link enviado para o seu e-mail e depois entre na sua conta para inserir o token do convite.',
        );
        setSenhaConvite('');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível validar o convite.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleProvisionarOnboardingSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();
    if (!onSupabaseProvisionarEmpresa) return;

    if (nomeEmpresa.trim().length < 2) {
      setErro('Informe um nome válido com ao menos 2 caracteres para a empresa.');
      return;
    }

    setEnviando(true);
    try {
      await onSupabaseProvisionarEmpresa({
        nomeEmpresa: nomeEmpresa.trim(),
        segmento: segmento.trim() || 'Serviços',
        cnpj: cnpj.trim(),
        nomeCompleto: nomeCompleto.trim(),
        cargo: cargo.trim() || 'Administrador(a)',
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao provisionar empresa.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleAceitarConviteOnboardingSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();
    if (!onSupabaseAceitarConviteCadastro) return;

    if (!tokenConvite.trim()) {
      setErro('Informe o token de convite recebido do administrador.');
      return;
    }

    setEnviando(true);
    try {
      await onSupabaseAceitarConviteCadastro({
        email: usuarioAuthPendente?.email ?? '',
        senha: '',
        nomeCompleto: nomeConvite.trim(),
        tokenConvite: tokenConvite.trim(),
        jaAutenticado: true,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível aceitar o convite.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleCadastrarPrincipalSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();
    if (!onSupabaseCadastrarPrincipal) return;

    if (!nomePrincipal.trim() || !emailPrincipal.trim() || senhaPrincipal.trim().length < 6) {
      setErro('Informe seu nome, e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      setAbaOnboarding('principal');
      const res = await onSupabaseCadastrarPrincipal({
        nomeCompleto: nomePrincipal.trim(),
        email: emailPrincipal.trim(),
        senha: senhaPrincipal,
      });
      if (res.precisaConfirmarEmail) {
        setSucesso(
          'Conta de acesso criada! Confirme o e-mail enviado pelo Supabase e depois entre na aba "Entrar" para concluir a ativação do acesso Principal.',
        );
        setSenhaPrincipal('');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar conta de acesso.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleCopiarSqlPrincipal(userId: string) {
    const sql = `INSERT INTO safra_interno.principais (user_id)\nVALUES ('${userId}')\nON CONFLICT (user_id) DO NOTHING;`;
    try {
      await navigator.clipboard.writeText(sql);
      setSqlCopiado(true);
      setTimeout(() => setSqlCopiado(false), 2500);
    } catch {
      setSqlCopiado(false);
    }
  }

  async function handleVerificarPrincipal() {
    limparMensagens();
    if (!onSupabaseRecarregarSessao) return;
    setEnviando(true);
    try {
      await onSupabaseRecarregarSessao();
      setErro(
        'Acesso Principal ainda não liberado no Supabase. Confirme seu e-mail (se pendente) e execute o comando SQL acima no SQL Editor do projeto.',
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao verificar acesso Principal.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col lg:flex-row">
      {/* Painel esquerdo institucional com identidade safra.pro */}
      <div className="lg:w-5/12 bg-[#141414] text-stone-100 p-6 sm:p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#242925]">
        <div>
          <div className="inline-flex items-center">
            {!logoImgErro ? (
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-25_at_05.39.39_05f2a72b.jpeg"
                alt="safra.pro — Seu caixa em crescimento"
                referrerPolicy="no-referrer"
                onError={() => setLogoImgErro(true)}
                className="h-20 sm:h-24 w-auto object-contain rounded-xl"
              />
            ) : (
              <div className="flex items-center gap-3">
                <SafraIcon className="w-10 h-10 shrink-0" />
                <div>
                  <BrandWordmark dark size="lg" />
                  <p className="text-xs text-stone-400">Seu caixa em crescimento</p>
                </div>
              </div>
            )}
          </div>

          <h1 className="mt-6 lg:mt-10 font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight [text-wrap:balance]">
            Vendas, faturamento e operações organizados para sua empresa crescer.
          </h1>
          <p className="mt-3 lg:mt-4 text-stone-300 text-sm lg:text-base leading-relaxed max-w-md">
            Acompanhe renda líquida, pipeline de vendas, clientes, tarefas e processos internos com
            isolamento total entre empresas.
          </p>

          <div className="hidden lg:block mt-10 space-y-4 border-t border-[#242B26] pt-8">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">Controle econômico e faturamento</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Visão em tempo real de receitas, despesas, margem líquida e vendas fechadas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">Isolamento multiempresa (Multi-tenant)</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Cada empresa acessa exclusivamente seus próprios lançamentos, clientes e tarefas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">Controle por papéis e convites</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Perfis Administrador, Gerente e Membro protegidos diretamente por RLS no Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="hidden lg:block mt-10 text-xs text-stone-500">
          safra.pro · Seu caixa em crescimento
        </p>
      </div>

      {/* Painel direito de autenticação / onboarding */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Aviso transparente do estado de integração */}
          {modoSupabase ? (
            <div className="mb-6 p-4 bg-white border border-[#E2E8E4] rounded-xl">
              <p className="text-xs font-semibold text-[#15803D] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Supabase conectado</span>
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Autenticação real e isolamento multi-tenant ativos com PostgreSQL RLS.
              </p>
            </div>
          ) : (
            <div
              role="alert"
              className={`mb-6 p-4 rounded-xl border ${
                diagnosticoSupabase.statusUrl === 'invalida' ||
                diagnosticoSupabase.statusChave === 'invalida'
                  ? 'bg-red-50 border-red-200 text-red-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {diagnosticoSupabase.statusUrl === 'invalida' ||
                  diagnosticoSupabase.statusChave === 'invalida'
                    ? 'Configuração do Supabase inválida'
                    : 'Supabase não configurado neste ambiente'}
                </span>
              </p>
              <p className="text-xs mt-1.5 leading-relaxed">
                {diagnosticoSupabase.motivoBloqueio ??
                  'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar configuradas.'}
              </p>
              <p className="text-[11px] mt-2 opacity-90 leading-relaxed">
                Para conectar ao banco real, copie{' '}
                <code className="font-mono bg-white/70 px-1 py-0.5 rounded">.env.example</code> para{' '}
                <code className="font-mono bg-white/70 px-1 py-0.5 rounded">.env.local</code>,
                preencha a Project URL e a Publishable/anon key pública e reinicie o servidor.
              </p>
            </div>
          )}

          {/* Fluxo dedicado de redefinição de senha via link de recuperação */}
          {modoSupabase && modoRedefinicaoSenha ? (
            <div className="bg-white border border-[#E2E8E4] rounded-xl p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2E8E4]">
                <div>
                  <p className="text-xs font-semibold text-[#15803D]">Recuperação de acesso</p>
                  <h2 className="font-display text-lg font-semibold text-[#111915] mt-0.5">
                    Definir nova senha
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Crie uma nova senha para concluir a recuperação da sua conta.
                  </p>
                </div>
                {onSupabaseSair && (
                  <button
                    type="button"
                    onClick={() => void onSupabaseSair()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-lg cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>

              {(erro || erroSessao) && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>{erro ?? erroSessao}</span>
                </div>
              )}

              <form onSubmit={handleRedefinirSenhaSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-nova-senha"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Nova senha (mínimo 6 caracteres)
                  </label>
                  <input
                    id="reset-nova-senha"
                    type="password"
                    minLength={6}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirmar-senha"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Confirmar nova senha
                  </label>
                  <input
                    id="reset-confirmar-senha"
                    type="password"
                    minLength={6}
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {enviando ? 'Salvando senha...' : 'Salvar nova senha e entrar'}
                </button>
              </form>
            </div>
          ) : modoSupabase && usuarioAuthPendente ? (
            <div className="bg-white border border-[#E2E8E4] rounded-xl p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2E8E4]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#15803D]">Sessão autenticada</p>
                  <h2 className="font-display text-lg font-semibold text-[#111915] mt-0.5">
                    Concluir acesso à empresa
                  </h2>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {usuarioAuthPendente.email}
                  </p>
                </div>
                {onSupabaseSair && (
                  <button
                    type="button"
                    onClick={() => void onSupabaseSair()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-lg cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sair</span>
                  </button>
                )}
              </div>

              {!usuarioAuthPendente.emailConfirmado && (
                <div
                  role="alert"
                  className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2"
                >
                  <p className="font-semibold">Confirmação de e-mail pendente</p>
                  <p className="leading-relaxed">
                    Para proteger a criação de empresas e o aceite de convites, o Supabase exige que
                    seu e-mail seja confirmado primeiro pelo link enviado à sua caixa de entrada.
                  </p>
                  {onSupabaseRecarregarSessao && (
                    <button
                      type="button"
                      onClick={() => void onSupabaseRecarregarSessao()}
                      className="inline-flex items-center gap-1.5 font-medium text-amber-950 underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Já confirmei meu e-mail</span>
                    </button>
                  )}
                </div>
              )}

              <div
                role="tablist"
                aria-label="Escolha como vincular sua conta"
                className="grid grid-cols-3 gap-1 p-1 bg-[#F1F5F2] rounded-lg"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaOnboarding === 'empresa'}
                  onClick={() => {
                    setAbaOnboarding('empresa');
                    limparMensagens();
                  }}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    abaOnboarding === 'empresa'
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  Criar empresa
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaOnboarding === 'convite'}
                  onClick={() => {
                    setAbaOnboarding('convite');
                    limparMensagens();
                  }}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    abaOnboarding === 'convite'
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  Tenho convite
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaOnboarding === 'principal'}
                  onClick={() => {
                    setAbaOnboarding('principal');
                    limparMensagens();
                  }}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    abaOnboarding === 'principal'
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  Sou Principal
                </button>
              </div>

              {erro && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>{erro}</span>
                </div>
              )}

              {abaOnboarding === 'empresa' ? (
                <form onSubmit={handleProvisionarOnboardingSubmit} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="onb-empresa"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Nome da empresa *
                    </label>
                    <input
                      id="onb-empresa"
                      type="text"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      placeholder="Ex.: Agropecuária Boa Vista Ltda"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="onb-segmento"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Segmento
                      </label>
                      <input
                        id="onb-segmento"
                        type="text"
                        value={segmento}
                        onChange={(e) => setSegmento(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="onb-cnpj"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        CNPJ (opcional)
                      </label>
                      <input
                        id="onb-cnpj"
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="onb-nome"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Seu nome completo
                      </label>
                      <input
                        id="onb-nome"
                        type="text"
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="onb-cargo"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Cargo
                      </label>
                      <input
                        id="onb-cargo"
                        type="text"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={enviando || !usuarioAuthPendente.emailConfirmado}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando ? 'Criando empresa...' : 'Provisionar empresa e entrar'}
                  </button>
                </form>
              ) : abaOnboarding === 'convite' ? (
                <form onSubmit={handleAceitarConviteOnboardingSubmit} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="onb-token"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Token do convite *
                    </label>
                    <input
                      id="onb-token"
                      type="text"
                      value={tokenConvite}
                      onChange={(e) => setTokenConvite(e.target.value)}
                      placeholder="Cole o token fornecido pelo administrador"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="onb-conv-nome"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Seu nome completo (opcional se já informado)
                    </label>
                    <input
                      id="onb-conv-nome"
                      type="text"
                      value={nomeConvite}
                      onChange={(e) => setNomeConvite(e.target.value)}
                      placeholder="Nome para exibição na equipe"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviando || !usuarioAuthPendente.emailConfirmado}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando ? 'Validando convite...' : 'Aceitar convite e entrar'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-[#111915] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                      <span>Ativação de Administrador Principal</span>
                    </p>
                    <p className="leading-relaxed">
                      Por segurança do banco de dados, o perfil Principal (dono da plataforma que
                      acompanha todas as empresas) só pode ser autorizado diretamente pelo{' '}
                      <strong>SQL Editor</strong> do Supabase.
                    </p>
                    <p className="font-mono text-[11px] bg-white border border-[#E2E8E4] rounded p-2 break-all text-[#111915]">
                      UID: {usuarioAuthPendente.id}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">
                        Execute uma vez no SQL Editor do Supabase:
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopiarSqlPrincipal(usuarioAuthPendente.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] hover:text-[#166534] cursor-pointer"
                      >
                        {sqlCopiado ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiar SQL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 bg-[#141715] text-stone-100 text-[11px] font-mono rounded-lg overflow-x-auto leading-relaxed">
                      {`INSERT INTO safra_interno.principais (user_id)\nVALUES ('${usuarioAuthPendente.id}')\nON CONFLICT (user_id) DO NOTHING;`}
                    </pre>
                  </div>

                  <button
                    type="button"
                    disabled={enviando || !usuarioAuthPendente.emailConfirmado}
                    onClick={() => void handleVerificarPrincipal()}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando ? 'Verificando...' : 'Já ativei no Supabase — entrar como Principal'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8E4] rounded-xl p-6 sm:p-8">
              <div
                role="tablist"
                aria-label="Modo de autenticação"
                className={`grid gap-1 p-1 bg-[#F1F5F2] rounded-lg mb-6 ${
                  modoSupabase ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={aba === 'entrar'}
                  onClick={() => {
                    setAba('entrar');
                    setModoRecuperacao(false);
                    limparMensagens();
                  }}
                  className={`py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    aba === 'entrar'
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aba === 'cadastrar'}
                  onClick={() => {
                    setAba('cadastrar');
                    setModoRecuperacao(false);
                    limparMensagens();
                  }}
                  className={`py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    aba === 'cadastrar'
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  Criar empresa
                </button>
                {modoSupabase && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aba === 'convite'}
                    onClick={() => {
                      setAba('convite');
                      setModoRecuperacao(false);
                      limparMensagens();
                    }}
                    className={`py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                      aba === 'convite'
                        ? 'bg-white text-[#111915] shadow-xs'
                        : 'text-slate-600 hover:text-[#111915]'
                    }`}
                  >
                    Tenho convite
                  </button>
                )}
              </div>

              {(erro || erroSessao) && (
                <div
                  role="alert"
                  className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                  <span>{erro ?? erroSessao}</span>
                </div>
              )}

              {sucesso && (
                <div
                  role="status"
                  className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5 text-[#15803D]"
                    aria-hidden="true"
                  />
                  <span>{sucesso}</span>
                </div>
              )}

              {aba === 'entrar' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      E-mail profissional
                    </label>
                    <div className="relative">
                      <Mail
                        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        id="auth-email"
                        type="email"
                        value={emailLogin}
                        onChange={(e) => setEmailLogin(e.target.value)}
                        placeholder="nome@empresa.com.br"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                        required
                      />
                    </div>
                  </div>

                  {!modoRecuperacao && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="auth-senha"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Senha
                        </label>
                        {modoSupabase && onSupabaseRecuperarSenha && (
                          <button
                            type="button"
                            onClick={() => {
                              setModoRecuperacao(true);
                              limparMensagens();
                            }}
                            className="text-xs font-medium text-[#15803D] hover:text-[#166534] cursor-pointer"
                          >
                            Esqueci minha senha
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock
                          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-senha"
                          type="password"
                          value={senhaLogin}
                          onChange={(e) => setSenhaLogin(e.target.value)}
                          placeholder="Sua senha"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {enviando
                        ? 'Processando...'
                        : modoRecuperacao
                          ? 'Enviar link de recuperação'
                          : 'Entrar no painel'}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {modoRecuperacao && (
                    <button
                      type="button"
                      onClick={() => {
                        setModoRecuperacao(false);
                        limparMensagens();
                      }}
                      className="w-full text-center text-xs font-medium text-slate-600 hover:text-[#111915] cursor-pointer"
                    >
                      Voltar para o login com senha
                    </button>
                  )}

                  {!modoSupabase && (
                    <div className="pt-4 mt-4 border-t border-[#E2E8E4]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-700">
                          Ambiente sem Supabase?
                        </p>
                        <button
                          type="button"
                          onClick={() => setMostrarDemoLocal((v) => !v)}
                          className="text-xs font-medium text-[#15803D] hover:text-[#166534] underline cursor-pointer"
                        >
                          {mostrarDemoLocal
                            ? 'Ocultar demonstração local'
                            : 'Explorar Modo Demonstração'}
                        </button>
                      </div>

                      {mostrarDemoLocal && (
                        <div className="mt-3 p-3 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg space-y-2.5">
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Os dados abaixo são <strong>fictícios e locais</strong> (sem vínculo
                            com o Supabase). Utilize apenas para avaliação visual offline.
                          </p>
                          <div className="space-y-2">
                            {empresasDisponiveis.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => onEntrarDemo(emp.id)}
                                className="w-full text-left px-3 py-2.5 bg-white border border-[#E2E8E4] hover:border-[#16A34A] rounded-lg transition-colors flex items-center justify-between gap-3 cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#111915] truncate">
                                    {emp.nome}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{emp.segmento}</p>
                                </div>
                                <span className="text-xs font-medium text-[#15803D] shrink-0">
                                  Acessar demo
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}

              {aba === 'cadastrar' && (
                <form onSubmit={handleCadastroSubmit} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="cad-empresa"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Nome da empresa
                    </label>
                    <input
                      id="cad-empresa"
                      type="text"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      placeholder="Ex.: Padaria Central Ltda"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cad-segmento"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Segmento
                      </label>
                      <input
                        id="cad-segmento"
                        type="text"
                        value={segmento}
                        onChange={(e) => setSegmento(e.target.value)}
                        placeholder="Serviços, Varejo..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cad-cnpj"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        CNPJ (opcional)
                      </label>
                      <input
                        id="cad-cnpj"
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cad-nome"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Seu nome completo
                      </label>
                      <div className="relative">
                        <User
                          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                          aria-hidden="true"
                        />
                        <input
                          id="cad-nome"
                          type="text"
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value)}
                          placeholder="João Silva"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="cad-cargo"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Cargo
                      </label>
                      <input
                        id="cad-cargo"
                        type="text"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cad-email"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      E-mail de acesso
                    </label>
                    <input
                      id="cad-email"
                      type="email"
                      value={emailCadastro}
                      onChange={(e) => setEmailCadastro(e.target.value)}
                      placeholder="voce@suaempresa.com.br"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cad-senha"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Senha (mínimo 6 caracteres)
                    </label>
                    <input
                      id="cad-senha"
                      type="password"
                      value={senhaCadastro}
                      onChange={(e) => setSenhaCadastro(e.target.value)}
                      placeholder="Crie uma senha"
                      minLength={6}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando
                      ? 'Criando conta...'
                      : modoSupabase
                        ? 'Criar conta e empresa'
                        : 'Criar empresa em modo demonstração'}
                  </button>
                </form>
              )}

              {aba === 'convite' && modoSupabase && (
                <form onSubmit={handleAceitarConviteCadastroSubmit} className="space-y-3.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Crie sua conta usando exatamente o <strong>mesmo e-mail convidado</strong> e o
                    token enviado pelo administrador da empresa. Se já possui conta, entre na aba{' '}
                    <strong>Entrar</strong> para informar o token.
                  </p>

                  <div>
                    <label
                      htmlFor="conv-token-cad"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Token do convite *
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        id="conv-token-cad"
                        type="text"
                        value={tokenConvite}
                        onChange={(e) => setTokenConvite(e.target.value)}
                        placeholder="Cole o token de convite"
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="conv-nome-cad"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Seu nome completo *
                    </label>
                    <input
                      id="conv-nome-cad"
                      type="text"
                      value={nomeConvite}
                      onChange={(e) => setNomeConvite(e.target.value)}
                      placeholder="Nome para exibição na equipe"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="conv-email-cad"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      E-mail convidado *
                    </label>
                    <input
                      id="conv-email-cad"
                      type="email"
                      value={emailConvite}
                      onChange={(e) => setEmailConvite(e.target.value)}
                      placeholder="colaborador@empresa.com.br"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="conv-senha-cad"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Crie uma senha (mínimo 6 caracteres) *
                    </label>
                    <input
                      id="conv-senha-cad"
                      type="password"
                      minLength={6}
                      value={senhaConvite}
                      onChange={(e) => setSenhaConvite(e.target.value)}
                      placeholder="Sua senha de acesso"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando ? 'Validando convite...' : 'Criar conta e aceitar convite'}
                  </button>
                </form>
              )}
              {aba === 'principal' && modoSupabase && (
                <form onSubmit={handleCadastrarPrincipalSubmit} className="space-y-3.5">
                  <div className="p-3 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg text-xs text-slate-700 leading-relaxed space-y-1">
                    <p className="font-semibold text-[#111915] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                      <span>Conta do Administrador Principal (Plataforma)</span>
                    </p>
                    <p>
                      Crie sua conta sem vincular nenhuma empresa. Após confirmar seu e-mail,
                      exibiremos o comando SQL único para autorizar seu usuário em{' '}
                      <code className="font-mono">safra_interno.principais</code>.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="pri-nome"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Seu nome completo *
                    </label>
                    <input
                      id="pri-nome"
                      type="text"
                      value={nomePrincipal}
                      onChange={(e) => setNomePrincipal(e.target.value)}
                      placeholder="Nome do administrador principal"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pri-email"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      E-mail de acesso *
                    </label>
                    <input
                      id="pri-email"
                      type="email"
                      value={emailPrincipal}
                      onChange={(e) => setEmailPrincipal(e.target.value)}
                      placeholder="seu-email@dominio.com.br"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pri-senha"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Senha (mínimo 6 caracteres) *
                    </label>
                    <input
                      id="pri-senha"
                      type="password"
                      minLength={6}
                      value={senhaPrincipal}
                      onChange={(e) => setSenhaPrincipal(e.target.value)}
                      placeholder="Crie uma senha forte"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {enviando ? 'Criando conta...' : 'Criar conta Principal'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAba('entrar');
                      limparMensagens();
                    }}
                    className="w-full text-center text-xs font-medium text-slate-600 hover:text-[#111915] cursor-pointer"
                  >
                    Já tenho conta — voltar para Entrar
                  </button>
                </form>
              )}

              {modoSupabase && aba !== 'principal' && (
                <div className="mt-5 pt-4 border-t border-[#E2E8E4] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAba('principal');
                      setModoRecuperacao(false);
                      limparMensagens();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#15803D] cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Acesso do Administrador Principal (dono da plataforma)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
