import {useState, type FormEvent} from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react';
import type {Empresa, UsuarioPerfil} from '../types/database';
import {BrandWordmark, SafraIcon} from './BrandMark';

interface AuthViewProps {
  modoSupabase: boolean;
  empresasDisponiveis: Empresa[];
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
}

export function AuthView({
  modoSupabase,
  empresasDisponiveis,
  onEntrarDemo,
  onEntrarComCredenciais,
  onCadastrarEmpresaEUsuario,
}: AuthViewProps) {
  const [aba, setAba] = useState<'entrar' | 'cadastrar'>('entrar');
  const [emailLogin, setEmailLogin] = useState('camila@clinicahorizonte.com.br');
  const [senhaLogin, setSenhaLogin] = useState('demo1234');
  const [erro, setErro] = useState<string | null>(null);
  const [logoImgErro, setLogoImgErro] = useState(false);

  // Campos de cadastro
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [segmento, setSegmento] = useState('Serviços');
  const [cnpj, setCnpj] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cargo, setCargo] = useState('Diretor(a) / Sócio(a)');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');

  function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!emailLogin.trim() || !senhaLogin.trim()) {
      setErro('Preencha e-mail e senha para continuar.');
      return;
    }

    const ok = onEntrarComCredenciais(emailLogin.trim());
    if (!ok) {
      setErro(
        'E-mail não encontrado nos perfis de demonstração. Use o acesso rápido abaixo ou crie uma nova empresa.',
      );
    }
  }

  function handleCadastroSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

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

    onCadastrarEmpresaEUsuario({
      nomeEmpresa: nomeEmpresa.trim(),
      segmento: segmento.trim() || 'Serviços',
      cnpj: cnpj.trim(),
      nomeCompleto: nomeCompleto.trim(),
      cargo: cargo.trim() || 'Gestor',
      email: emailCadastro.trim(),
    });
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
                <p className="text-sm font-medium text-white">Arquitetura pronta para Supabase</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Esquema SQL com Row Level Security e cliente tipado já estruturados no projeto.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="hidden lg:block mt-10 text-xs text-stone-500">
          safra.pro · Seu caixa em crescimento
        </p>
      </div>

      {/* Painel direito de autenticação */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Aviso transparente do estado de integração */}
          <div className="mb-6 p-4 bg-white border border-[#E2E8E4] rounded-xl">
            <p className="text-xs font-semibold text-[#111915]">
              {modoSupabase
                ? 'Supabase conectado'
                : 'Modo Demonstração (Dados locais fictícios)'}
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {modoSupabase
                ? 'Autenticação e banco de dados configurados via variáveis de ambiente.'
                : 'O Supabase ainda não foi conectado neste ambiente. Explore o sistema completo com dados locais ou cadastre uma nova empresa para testar.'}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E4] rounded-xl p-6 sm:p-8">
            <div
              role="tablist"
              aria-label="Modo de autenticação"
              className="grid grid-cols-2 gap-1 p-1 bg-[#F1F5F2] rounded-lg mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={aba === 'entrar'}
                onClick={() => {
                  setAba('entrar');
                  setErro(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
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
                  setErro(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  aba === 'cadastrar'
                    ? 'bg-white text-[#111915] shadow-xs'
                    : 'text-slate-600 hover:text-[#111915]'
                }`}
              >
                Criar conta
              </button>
            </div>

            {erro && (
              <div
                role="alert"
                className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            {aba === 'entrar' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
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

                <div>
                  <label htmlFor="auth-senha" className="block text-sm font-medium text-slate-700 mb-1">
                    Senha
                  </label>
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

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entrar no painel</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="pt-4 mt-4 border-t border-[#E2E8E4]">
                  <p className="text-xs font-medium text-slate-600 mb-2.5">
                    Acesso rápido às empresas de demonstração:
                  </p>
                  <div className="space-y-2">
                    {empresasDisponiveis.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => onEntrarDemo(emp.id)}
                        className="w-full text-left px-3 py-2.5 border border-[#E2E8E4] hover:border-[#16A34A] hover:bg-[#F6F8F7] rounded-lg transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#111915] truncate">{emp.nome}</p>
                          <p className="text-xs text-slate-500 truncate">{emp.segmento}</p>
                        </div>
                        <span className="text-xs font-medium text-[#15803D] shrink-0">Acessar</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCadastroSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="cad-empresa" className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label htmlFor="cad-segmento" className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label htmlFor="cad-cnpj" className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label htmlFor="cad-nome" className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label htmlFor="cad-cargo" className="block text-sm font-medium text-slate-700 mb-1">
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
                  <label htmlFor="cad-email" className="block text-sm font-medium text-slate-700 mb-1">
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
                  <label htmlFor="cad-senha" className="block text-sm font-medium text-slate-700 mb-1">
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
                  className="w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Criar empresa em modo demonstração
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
