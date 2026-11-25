import {
  Bot,
  Building2,
  CheckSquare,
  Database,
  GitBranch,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type {Empresa, SecaoAtiva, UsuarioPerfil} from '../types/database';
import {obterIniciais} from '../utils/workspaceLogic';
import {BrandWordmark, SafraIcon} from './BrandMark';

interface SidebarProps {
  secaoAtiva: SecaoAtiva;
  onSelecionarSecao: (secao: SecaoAtiva) => void;
  empresas: Empresa[];
  empresaAtiva: Empresa;
  onTrocarEmpresa: (empresaId: string) => void;
  usuario: UsuarioPerfil;
  modoSupabase: boolean;
  onSair: () => void;
  abertaMobile: boolean;
  onFecharMobile: () => void;
}

const ITENS_NAVEGACAO: Array<{
  id: SecaoAtiva;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard},
  {id: 'financeiro', label: 'Vendas e Financeiro', icon: TrendingUp},
  {id: 'tarefas', label: 'Tarefas', icon: CheckSquare},
  {id: 'clientes', label: 'Clientes', icon: Users},
  {id: 'processos', label: 'Processos', icon: GitBranch},
  {id: 'assistente', label: 'Assistente IA', icon: Bot},
  {id: 'integracao', label: 'Dados e Supabase', icon: Database},
];

export function Sidebar({
  secaoAtiva,
  onSelecionarSecao,
  empresas,
  empresaAtiva,
  onTrocarEmpresa,
  usuario,
  modoSupabase,
  onSair,
  abertaMobile,
  onFecharMobile,
}: SidebarProps) {
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

      {/* Seletor de Empresa (Isolamento Multi-tenant) */}
      <div className="px-4 py-4 border-b border-[#242B26]">
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
            value={empresaAtiva.id}
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
          {modoSupabase
            ? 'Conectado ao Supabase (dados isolados)'
            : 'Modo Demonstração · Dados locais'}
        </p>
      </div>

      {/* Navegação Principal */}
      <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ITENS_NAVEGACAO.map((item) => {
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
            {obterIniciais(usuario.nomeCompleto)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{usuario.nomeCompleto}</p>
            <p className="text-xs text-stone-400 truncate">{usuario.cargo}</p>
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
