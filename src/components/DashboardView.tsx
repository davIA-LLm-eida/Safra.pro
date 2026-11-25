import {
  ArrowRight,
  Clock,
  GitBranch,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type {
  Cliente,
  Empresa,
  LancamentoFinanceiro,
  Processo,
  SecaoAtiva,
  Tarefa,
  Venda,
} from '../types/database';
import {formatarMesLongo} from '../utils/rolePermissions';
import {
  calcularDashboardKPIs,
  calcularKPIsFinanceiros,
  calcularProgressoProcesso,
  calcularSerieMensalFinanceira,
  formatarDataBR,
  formatarMoedaBRL,
  isTarefaAtrasada,
} from '../utils/workspaceLogic';
import {PrioridadeIndicador, StatusProcessoIndicador, StatusTarefaIndicador} from './StatusIndicator';

interface DashboardViewProps {
  empresaAtiva: Empresa;
  tarefas: Tarefa[];
  clientes: Cliente[];
  processos: Processo[];
  lancamentos: LancamentoFinanceiro[];
  vendas: Venda[];
  dataReferenciaISO: string;
  onNavegar: (secao: SecaoAtiva) => void;
  onAbrirNovaTarefa: () => void;
}

export function DashboardView({
  empresaAtiva,
  tarefas,
  clientes,
  processos,
  lancamentos,
  vendas,
  dataReferenciaISO,
  onNavegar,
  onAbrirNovaTarefa,
}: DashboardViewProps) {
  const mesReferencia = dataReferenciaISO.slice(0, 7);

  const kpis = calcularDashboardKPIs(
    tarefas,
    clientes,
    processos,
    empresaAtiva.id,
    dataReferenciaISO,
  );

  const finKpis = calcularKPIsFinanceiros(
    lancamentos,
    vendas,
    empresaAtiva.id,
    mesReferencia,
  );

  const serieMensal = calcularSerieMensalFinanceira(lancamentos, empresaAtiva.id, 6);
  const maxValorSerie = Math.max(
    ...serieMensal.flatMap((m) => [m.receitas, m.despesas]),
    1,
  );

  const proximasTarefas = [...tarefas]
    .filter((t) => t.status !== 'concluida')
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
    .slice(0, 5);

  const processosVisiveis = processos.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Cabeçalho contextual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#111915]">
            Resumo executivo de {empresaAtiva.nome}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Faturamento, renda líquida e operação · {formatarMesLongo(mesReferencia)} (Ref.{' '}
            {formatarDataBR(dataReferenciaISO)})
          </p>
        </div>
        <div className="flex items-center gap-4 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavegar('financeiro')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15803D] hover:text-[#166534] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Abrir Vendas e Financeiro</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Faixa de 4 KPIs principais (Financeiro + Operacional) */}
      <section
        aria-label="Indicadores principais"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Faturamento no mês</span>
            <TrendingUp className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#111915] tabular-nums">
            {formatarMoedaBRL(finKpis.faturamentoBruto)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {finKpis.vendasFechadasQtd}{' '}
            {finKpis.vendasFechadasQtd === 1 ? 'venda fechada' : 'vendas fechadas'} ·{' '}
            {formatarMoedaBRL(finKpis.aReceber)} a receber
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Renda líquida</span>
            <Wallet className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
          </div>
          <p
            className={`mt-3 font-display text-2xl sm:text-3xl font-semibold tabular-nums ${
              finKpis.rendaLiquida >= 0 ? 'text-[#15803D]' : 'text-red-700'
            }`}
          >
            {formatarMoedaBRL(finKpis.rendaLiquida)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Margem líquida de {finKpis.margemLiquidaPct}% · Desp.{' '}
            {formatarMoedaBRL(finKpis.despesasTotais)}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tarefas em aberto</span>
            <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#111915] tabular-nums">
            {kpis.tarefasAbertas}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {kpis.tarefasAtrasadas > 0
              ? `${kpis.tarefasAtrasadas} com prazo vencido`
              : 'Nenhuma tarefa em atraso'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Processos & Clientes</span>
            <GitBranch className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#111915] tabular-nums">
            {kpis.processosAtivos} / {kpis.clientesAtivos}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {kpis.processosAtivos} processos ativos · {kpis.clientesAtivos} clientes ativos
          </p>
        </div>
      </section>

      {/* Grid Principal: Gráfico de Faturamento + Próximos Prazos e Processos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda (7 cols): Gráfico Semestral + Próximas Tarefas */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-[#E2E8E4] rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#111915]">
                  Crescimento de faturamento e despesas (6 meses)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receita acumulada vs. custos operacionais mensais
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavegar('financeiro')}
                className="text-xs font-medium text-[#15803D] hover:text-[#166534] whitespace-nowrap cursor-pointer self-start sm:self-auto"
              >
                Detalhar caixa
              </button>
            </div>

            {serieMensal.length === 0 ? (
              <div className="mt-4 py-10 text-center text-xs text-slate-500 border-b border-[#E2E8E4]">
                Nenhum lançamento registrado nos últimos meses. Adicione sua primeira receita ou
                despesa em Vendas e Financeiro.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-6 gap-2 sm:gap-3 items-end h-40 pt-3 border-b border-[#E2E8E4]">
                {serieMensal.map((ponto) => {
                  const altRec = Math.max(Math.round((ponto.receitas / maxValorSerie) * 112), 4);
                  const altDesp = Math.max(Math.round((ponto.despesas / maxValorSerie) * 112), 4);
                  return (
                    <div key={ponto.mes} className="flex flex-col items-center justify-end h-full pb-2">
                      <div className="flex items-end gap-1 h-[116px]">
                        <div
                          title={`Receitas ${ponto.label}: ${formatarMoedaBRL(ponto.receitas)}`}
                          className="w-3 sm:w-4 bg-[#16A34A] rounded-t"
                          style={{height: `${altRec}px`}}
                        />
                        <div
                          title={`Despesas ${ponto.label}: ${formatarMoedaBRL(ponto.despesas)}`}
                          className="w-3 sm:w-4 bg-slate-300 rounded-t"
                          style={{height: `${altDesp}px`}}
                        />
                      </div>
                      <span className="mt-2 text-xs font-mono tabular-nums text-slate-500">
                        {ponto.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" aria-hidden="true" />
                  Faturamento
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
                  Despesas
                </span>
              </div>
              <span className="font-mono tabular-nums">
                Pipeline aberto: {formatarMoedaBRL(finKpis.pipelineAbertoValor)}
              </span>
            </div>
          </section>

          <section className="bg-white border border-[#E2E8E4] rounded-xl">
            <div className="px-5 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#111915]">
                  Próximos prazos e prioridades
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Ordenado por data de entrega</p>
              </div>
              <button
                type="button"
                onClick={() => onNavegar('tarefas')}
                className="text-xs font-medium text-[#15803D] hover:text-[#166534] whitespace-nowrap cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            {proximasTarefas.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-800">Nenhuma tarefa pendente</p>
                <p className="text-xs text-slate-500 mt-1">
                  Crie a primeira tarefa operacional para acompanhar prazos e responsáveis.
                </p>
                <button
                  type="button"
                  onClick={onAbrirNovaTarefa}
                  className="mt-4 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Criar primeira tarefa
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {proximasTarefas.map((tarefa) => {
                  const atrasada = isTarefaAtrasada(tarefa, dataReferenciaISO);
                  return (
                    <div
                      key={tarefa.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAF9] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111915] truncate">{tarefa.titulo}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span>{tarefa.responsavel}</span>
                          <span aria-hidden="true">·</span>
                          <PrioridadeIndicador prioridade={tarefa.prioridade} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <StatusTarefaIndicador status={tarefa.status} atrasada={atrasada} />
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            atrasada ? 'text-red-700 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {formatarDataBR(tarefa.prazo)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Coluna Direita (5 cols): Resumo de Vendas + Processos */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-[#E2E8E4] rounded-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-[#111915]">
                Saúde econômica e vendas
              </h3>
              <button
                type="button"
                onClick={() => onNavegar('assistente')}
                className="text-xs font-medium text-[#15803D] hover:text-[#166534] cursor-pointer whitespace-nowrap"
              >
                Consultar IA
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <dt className="text-slate-500">Receita já recebida</dt>
                <dd className="font-mono font-semibold text-[#15803D] tabular-nums">
                  {formatarMoedaBRL(finKpis.receitaRecebida)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <dt className="text-slate-500">Contas a receber</dt>
                <dd className="font-mono font-semibold text-amber-700 tabular-nums">
                  {formatarMoedaBRL(finKpis.aReceber)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <dt className="text-slate-500">Ticket médio de vendas</dt>
                <dd className="font-mono font-semibold text-[#111915] tabular-nums">
                  {formatarMoedaBRL(finKpis.ticketMedio)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">Taxa de conclusão de tarefas</dt>
                <dd className="font-mono font-semibold text-[#111915] tabular-nums">
                  {kpis.taxaConclusao}% ({kpis.tarefasConcluidas}/{tarefas.length})
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-[#E2E8E4] rounded-xl">
            <div className="px-5 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-4">
              <h3 className="font-display text-base font-semibold text-[#111915]">
                Andamento dos processos
              </h3>
              <button
                type="button"
                onClick={() => onNavegar('processos')}
                className="text-xs font-medium text-[#15803D] hover:text-[#166534] whitespace-nowrap cursor-pointer"
              >
                Gerenciar
              </button>
            </div>

            {processosVisiveis.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhum processo cadastrado para esta empresa.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {processosVisiveis.map((proc) => {
                  const pct = calcularProgressoProcesso(proc.etapas);
                  return (
                    <div key={proc.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#111915] truncate">{proc.titulo}</p>
                        <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums shrink-0">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                        <span>{proc.responsavel}</span>
                        <StatusProcessoIndicador status={proc.status} />
                      </div>
                      <div className="mt-2 w-full h-1.5 bg-[#F1F5F2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16A34A] rounded-full transition-all duration-200"
                          style={{width: `${pct}%`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
