import {Menu, Plus} from 'lucide-react';
import type {Empresa, SecaoAtiva} from '../types/database';

interface TopBarProps {
  secaoAtiva: SecaoAtiva;
  empresaAtiva: Empresa;
  onAbrirMenuMobile: () => void;
  onAcaoPrincipal?: () => void;
  labelAcaoPrincipal?: string;
  onVoltarVisaoGeral: () => void;
}

const TITULOS_SECAO: Record<SecaoAtiva, string> = {
  dashboard: 'Visão Geral',
  financeiro: 'Vendas e Controle Econômico',
  tarefas: 'Gestão de Tarefas',
  clientes: 'Clientes',
  processos: 'Processos Empresariais',
  assistente: 'Assistente de IA',
  integracao: 'Dados e Supabase',
};

export function TopBar({
  secaoAtiva,
  empresaAtiva,
  onAbrirMenuMobile,
  onAcaoPrincipal,
  labelAcaoPrincipal,
  onVoltarVisaoGeral,
}: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8E4] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Zona 1: Menu mobile + Breadcrumb de contexto */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onAbrirMenuMobile}
          aria-label="Abrir menu lateral"
          className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 truncate hidden sm:inline">{empresaAtiva.nome}</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-[#111915] text-base sm:text-lg truncate">
            {TITULOS_SECAO[secaoAtiva]}
          </h1>
        </div>
      </div>

      {/* Zona 2: Segmento discreto da empresa */}
      <div className="hidden md:flex items-center text-xs text-slate-500 whitespace-nowrap shrink-0">
        <span>{empresaAtiva.segmento}</span>
        {empresaAtiva.cnpj && (
          <>
            <span className="mx-2 text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums">{empresaAtiva.cnpj}</span>
          </>
        )}
      </div>

      {/* Zona 3: Ação principal única */}
      <div className="flex items-center shrink-0">
        {onAcaoPrincipal && labelAcaoPrincipal ? (
          <button
            type="button"
            onClick={onAcaoPrincipal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{labelAcaoPrincipal}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onVoltarVisaoGeral}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 border border-[#E2E8E4] hover:bg-[#F6F8F7] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Voltar ao painel
          </button>
        )}
      </div>
    </header>
  );
}
