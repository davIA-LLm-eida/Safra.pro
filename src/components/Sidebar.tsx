import {
  Bot,
  Building2,
  CheckSquare,
  Database,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Shield,
  TrendingUp,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type {Empresa, SecaoAtiva, UsuarioPerfil} from '../types/database';
import {LABEL_PAPEL_EMPRESA, LABEL_PLANO_EMPRESA} from '../utils/rolePermissions';
import {obterIniciais} from '../utils/workspaceLogic';
import {BrandWordmark, SafraIcon} from './BrandMark';

interface SidebarProps {
  secaoAtiva: SecaoAtiva;
  onSelecionarSecao: (secao: SecaoAtiva) => void;
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
  onTrocarEmpresa: (empresaId: string) => void;
  usuario: UsuarioPerfil | null;
  usuarioAuthEmail?: string;
  isPrincipal?: boolean;
  modoSupabase: boolean;
  onSair: () => void;
  abertaMobile: boolean;
  onFecharMobile: () => void;
}

const ITENS_EMPRESA: Array<{
  id: SecaoAtiva;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard},
  {id: 'financeiro', label: 'Vendas e Financeiro', icon: TrendingUp},
  {id: 'tarefas', label: 'Tarefas', icon: CheckSquare},
  {id: 'clientes', label: 'Clientes', icon: Users},
  {id: 'processos', label: 'Processos', icon: GitBranch},
  {id: 'equipe', label: 'Empresa e Equipe', icon: UserCog},
  {id: 'assistente', label: 'Assistente IA', icon: Bot},
];

export function Sidebar({
  secaoAtiva,
  onSelecionarSecao,
  empresas,
  empresaAtiva,
  onTrocarEmpresa,
  usuario,
  usuarioAuthEmail,
  isPrincipal = false,
  modoSupabase,
  onSair,
  abertaMobile,
  onFecharMobile,
}: SidebarProps) {
  const itensVisiveis: Array<{
    id: SecaoAtiva;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    ...(empresaAtiva ? ITENS_EMPRESA : []),
    ...(isPrincipal
      ? [{id: 'principal' as const, label: 'Plataforma (Principal)', icon: Shield}]
      : []),
    {id: 'integracao', label: 'Dados e Supabase', icon: Database},
  ];

  const nomeExibicao = usuario?.nomeCompleto ?? 'Administrador Principal';
  const subtituloExibicao = usuario
    ? `${usuario.cargo} · ${LABEL_PAPEL_EMPRESA[usuario.papel]}`
    : (usuarioAuthEmail ?? 'Somente leitura da plataforma');

  const conteudoSidebar = (
    <div className="flex flex-col h-full bg-[#141715] text-stone-100 w-64 shrink-0 border-r border-[#242B26]">
      {/* Marca safra.pro */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-[#242B26]">
        <div className="flex items-center gap-2.5 min-w-0">
          <SafraIcon className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <BrandWordmark dark size="lg" />
          </div>
        </div>
        <button
          type="button"
          onClick={onFecharMobile}
          aria-label="Fechar menu lateral"
          className="lg:hidden p-2 text-stone-400 hover:text-white rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Empresa ativa (ou escopo Principal) */}
      <div className="px-4 py-4 border-b border-[#242B26]">
        {modoSupabase ? (
          empresaAtiva ? (
            <div>
              <p className="text-xs font-medium text-stone-400 mb-1.5">Empresa ativa</p>
              <div className="flex items-center gap-2.5 bg-[#1D231F] border border-[#2D3730] rounded-lg px-3 py-2">
                <Building2 className="w-4 h-4 text-[#4ADE80] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">
                    {empresaAtiva.nome}
                  </p>
                  <p className="text-[11px] text-stone-400 truncate">
                    Plano {LABEL_PLANO_EMPRESA[empresaAtiva.plano]}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Conectado ao Supabase (dados isolados)
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-stone-400 mb-1.5">Escopo de plataforma</p>
              <div className="flex items-center gap-2.5 bg-[#1D231F] border border-[#2D3730] rounded-lg px-3 py-2">
                <Shield className="w-4 h-4 text-[#4ADE80] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">Safra.pro</p>
                  <p className="text-[11px] text-stone-400 truncate">Principal (somente leitura)</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            <label
              htmlFor="seletor-empresa-sidebar"
              className="block text-xs font-medium text-stone-400 mb-1.5"
            >
              Empresa ativa
            </label>
            <div className="relative">
              <Building2
                className="w-4 h-4 text-[#4ADE80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="seletor-empresa-sidebar"
                value={empresaAtiva?.id ?? ''}
                onChange={(e) => onTrocarEmpresa(e.target.value)}
                className="w-full bg-[#1D231F] border border-[#2D3730] text-stone-100 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#22C55E] cursor-pointer"
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Modo Demonstração · Dados locais
            </p>
          </>
        )}
      </div>

      {/* Navegação Principal */}
      <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {itensVisiveis.map((item) => {
          const Icon = item.icon;
          const ativo = secaoAtiva === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelecionarSecao(item.id);
                onFecharMobile();
              }}
              aria-current={ativo ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-left cursor-pointer ${
                ativo
                  ? 'bg-[#166534] text-white'
                  : 'text-stone-300 hover:bg-[#1E2521] hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${ativo ? 'text-[#A3E635]' : 'text-stone-400'}`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Perfil do Usuário e Saída */}
      <div className="p-4 border-t border-[#242B26]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1C2A21] border border-[#2D4535] flex items-center justify-center text-xs font-semibold text-[#86EFAC] shrink-0">
            {obterIniciais(nomeExibicao)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{nomeExibicao}</p>
            <p className="text-xs text-stone-400 truncate">{subtituloExibicao}</p>
          </div>
          <button
            type="button"
            onClick={onSair}
            aria-label="Sair ou trocar de conta"
            title="Sair / Autenticação"
            className="p-2 text-stone-400 hover:text-white hover:bg-[#1E2521] rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">{conteudoSidebar}</aside>

      {abertaMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onFecharMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full">{conteudoSidebar}</aside>
        </div>
      )}
    </>
  );
}
