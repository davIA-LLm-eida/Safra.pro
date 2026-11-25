import {useState} from 'react';
import {Building2, Lock, RefreshCw, Search, Shield, Users} from 'lucide-react';
import type {EmpresaPrincipalResumo} from '../types/database';
import {LABEL_PLANO_EMPRESA} from '../utils/rolePermissions';
import {formatarDataBR} from '../utils/workspaceLogic';

interface PrincipalViewProps {
  empresas: EmpresaPrincipalResumo[];
  carregando: boolean;
  erro: string | null;
  onAtualizar: () => Promise<void>;
}

export function PrincipalView({
  empresas,
  carregando,
  erro,
  onAtualizar,
}: PrincipalViewProps) {
  const [busca, setBusca] = useState('');

  const filtradas = empresas.filter((emp) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return `${emp.nome} ${emp.segmento} ${emp.cnpj ?? ''} ${emp.plano}`
      .toLowerCase()
      .includes(termo);
  });

  const totalUsuarios = empresas.reduce((acc, e) => acc + e.totalUsuarios, 0);
  const totalAdmins = empresas.reduce((acc, e) => acc + e.totalAdmins, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Banner de escopo autorizado do Principal */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-[#111915]">
                Painel da Plataforma · Administrador Principal
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Visão agregada e somente leitura das empresas cadastradas no Safra.pro via{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  listar_empresas_principal()
                </code>
                . Dados privados (clientes, vendas, tarefas, processos e financeiro) permanecem
                estritamente isolados por empresa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onAtualizar()}
            disabled={carregando}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{carregando ? 'Atualizando...' : 'Atualizar lista'}</span>
          </button>
        </div>

        {erro && (
          <div
            role="alert"
            className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
          >
            {erro}
          </div>
        )}
      </section>

      {/* Indicadores agregados */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Empresas registradas</span>
            <Building2 className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold text-[#111915] tabular-nums">
            {empresas.length}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Usuários ativos na plataforma</span>
            <Users className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold text-[#111915] tabular-nums">
            {totalUsuarios}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {totalAdmins} {totalAdmins === 1 ? 'administrador' : 'administradores'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Isolamento RLS</span>
            <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-[#15803D]">
            Somente leitura agregada
          </p>
          <p className="mt-1 text-xs text-slate-500">Sem acesso a registros operacionais</p>
        </div>
      </section>

      {/* Tabela de empresas */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-[#111915]">
            Empresas da plataforma
          </h3>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar empresas"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar empresa, segmento ou plano..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8E4] bg-[#F8FAF9] text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4 text-right">Usuários</th>
                  <th className="py-3 px-4 text-right">Admins / Ger. / Mem.</th>
                  <th className="py-3 px-4 text-right">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtradas.map((emp) => (
                  <tr key={emp.empresaId} className="hover:bg-[#F8FAF9]">
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#111915]">{emp.nome}</p>
                      <p className="text-xs text-slate-500">{emp.segmento}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {emp.cnpj ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-[#15803D]">
                      {LABEL_PLANO_EMPRESA[emp.plano]}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-[#111915] tabular-nums">
                      {emp.totalUsuarios}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {emp.totalAdmins} / {emp.totalGerentes} / {emp.totalMembros}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatarDataBR(emp.criadoEm.slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
