import {useState, type FormEvent} from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileCheck2,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type {
  Cliente,
  EtapaVenda,
  FormaPagamento,
  LancamentoFinanceiro,
  StatusFinanceiro,
  TipoLancamento,
  Venda,
} from '../types/database';
import {
  calcularKPIsFinanceiros,
  calcularResumoPorCategoria,
  calcularSerieMensalFinanceira,
  filtrarLancamentosFinanceiros,
  formatarDataBR,
  formatarMoedaBRL,
  LABEL_FORMA_PAGAMENTO,
} from '../utils/workspaceLogic';
import {EtapaVendaIndicador, StatusFinanceiroIndicador} from './StatusIndicator';

interface FinancialSalesViewProps {
  empresaId: string;
  empresaNome: string;
  lancamentos: LancamentoFinanceiro[];
  vendas: Venda[];
  clientes: Cliente[];
  dataReferenciaISO: string;
  modalAberto: boolean;
  onAbrirModal: () => void;
  onFecharModal: () => void;
  onCriarLancamento: (novo: Omit<LancamentoFinanceiro, 'id' | 'empresaId'>) => void;
  onAtualizarStatusLancamento: (id: string, status: StatusFinanceiro) => void;
  onExcluirLancamento: (id: string) => void;
  onCriarVenda: (nova: Omit<Venda, 'id' | 'empresaId'>) => void;
  onAtualizarEtapaVenda: (id: string, etapa: EtapaVenda) => void;
  onFaturarVenda: (vendaId: string) => void;
  onExcluirVenda: (id: string) => void;
}

const PERIODOS_OPCOES = [
  {valor: '2026-11', label: 'Novembro 2026'},
  {valor: '2026-10', label: 'Outubro 2026'},
  {valor: '2026-09', label: 'Setembro 2026'},
  {valor: 'todos', label: 'Todos os períodos'},
];

export function FinancialSalesView({
  empresaId,
  empresaNome,
  lancamentos,
  vendas,
  clientes,
  dataReferenciaISO,
  modalAberto,
  onAbrirModal,
  onFecharModal,
  onCriarLancamento,
  onAtualizarStatusLancamento,
  onExcluirLancamento,
  onCriarVenda,
  onAtualizarEtapaVenda,
  onFaturarVenda,
  onExcluirVenda,
}: FinancialSalesViewProps) {
  const [subAba, setSubAba] = useState<'economico' | 'vendas'>('economico');
  const [periodoMes, setPeriodoMes] = useState<string>('2026-11');
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoLancamento | 'todos'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFinanceiro | 'todos'>('todos');
  const [filtroEtapaVenda, setFiltroEtapaVenda] = useState<EtapaVenda | 'todas'>('todas');
  const [mesSelecionadoGrafico, setMesSelecionadoGrafico] = useState<string>('2026-11');

  // Campos do Modal (suporta Receita, Despesa ou Venda)
  const [modoModal, setModoModal] = useState<'receita' | 'despesa' | 'venda'>('receita');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Serviços');
  const [valorTexto, setValorTexto] = useState('');
  const [dataLanc, setDataLanc] = useState(dataReferenciaISO);
  const [statusLanc, setStatusLanc] = useState<StatusFinanceiro>('pago');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [clienteId, setClienteId] = useState('');
  const [responsavelVenda, setResponsavelVenda] = useState('');
  const [etapaVenda, setEtapaVenda] = useState<EtapaVenda>('proposta');
  const [erroForm, setErroForm] = useState<string | null>(null);

  const kpis = calcularKPIsFinanceiros(lancamentos, vendas, empresaId, periodoMes);
  const serieMensal = calcularSerieMensalFinanceira(lancamentos, empresaId, 6);
  const categoriasReceita = calcularResumoPorCategoria(
    lancamentos,
    empresaId,
    'receita',
    periodoMes,
  );
  const categoriasDespesa = calcularResumoPorCategoria(
    lancamentos,
    empresaId,
    'despesa',
    periodoMes,
  );

  const lancamentosFiltrados = filtrarLancamentosFinanceiros(lancamentos, empresaId, {
    busca,
    periodoMes,
    tipo: filtroTipo,
    status: filtroStatus,
  });

  const vendasFiltradas = vendas
    .filter((v) => {
      if (filtroEtapaVenda !== 'todas' && v.etapa !== filtroEtapaVenda) return false;
      if (periodoMes !== 'todos' && !v.dataPrevista.startsWith(periodoMes)) {
        // Mantém oportunidades em aberto visíveis se estiverem em prospecção/proposta
        if (v.etapa === 'fechada' || v.etapa === 'perdida') return false;
      }
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      return `${v.titulo} ${v.responsavel}`.toLowerCase().includes(termo);
    })
    .sort((a, b) => b.dataPrevista.localeCompare(a.dataPrevista));

  const maxValorSerie = Math.max(
    ...serieMensal.flatMap((m) => [m.receitas, m.despesas]),
    1,
  );
  const pontoAtivoGrafico =
    serieMensal.find((s) => s.mes === mesSelecionadoGrafico) ??
    serieMensal[serieMensal.length - 1];

  function obterNomeCliente(id?: string): string | null {
    if (!id) return null;
    return clientes.find((c) => c.id === id)?.nome ?? null;
  }

  function abrirModalComModo(modo: 'receita' | 'despesa' | 'venda') {
    setModoModal(modo);
    setErroForm(null);
    setCategoria(modo === 'despesa' ? 'Operação e Equipe' : 'Vendas e Contratos');
    onAbrirModal();
  }

  function handleExportarCSV() {
    const cabecalho = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma', 'Status', 'Valor (BRL)'];
    const linhas = lancamentosFiltrados.map((l) => [
      formatarDataBR(l.data),
      l.tipo === 'receita' ? 'Receita' : 'Despesa',
      `"${l.descricao.replace(/"/g, '""')}"`,
      `"${l.categoria.replace(/"/g, '""')}"`,
      LABEL_FORMA_PAGAMENTO[l.formaPagamento],
      l.status,
      l.valor.toFixed(2).replace('.', ','),
    ]);
    const csv = '\uFEFF' + [cabecalho.join(';'), ...linhas.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safra-pro-financeiro-${periodoMes}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleSubmitModal(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);

    const valorNumerico = Number(valorTexto.replace(/\./g, '').replace(',', '.'));
    if (!descricao.trim() || !dataLanc || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setErroForm('Informe descrição, data e um valor numérico maior que zero.');
      return;
    }

    if (modoModal === 'venda') {
      if (!responsavelVenda.trim()) {
        setErroForm('Informe o responsável comercial pela venda.');
        return;
      }
      onCriarVenda({
        titulo: descricao.trim(),
        responsavel: responsavelVenda.trim(),
        valor: valorNumerico,
        etapa: etapaVenda,
        dataPrevista: dataLanc,
        formaPagamento,
        clienteId: clienteId || undefined,
        faturada: false,
      });
    } else {
      onCriarLancamento({
        tipo: modoModal,
        descricao: descricao.trim(),
        categoria: categoria.trim() || (modoModal === 'receita' ? 'Vendas' : 'Despesas gerais'),
        valor: valorNumerico,
        data: dataLanc,
        status: statusLanc,
        formaPagamento,
        clienteId: clienteId || undefined,
      });
    }

    setDescricao('');
    setValorTexto('');
    setClienteId('');
    setResponsavelVenda('');
    onFecharModal();
  }

  const margemPositiva = kpis.rendaLiquida >= 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Sub-navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#111915]">
            Controle econômico e vendas · {empresaNome}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe faturamento, renda líquida, despesas e conversão do funil comercial.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Subseções de vendas e financeiro"
          className="inline-flex items-center p-1 bg-[#EAEFEC] rounded-lg self-start md:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subAba === 'economico'}
            onClick={() => setSubAba('economico')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              subAba === 'economico'
                ? 'bg-white text-[#111915] shadow-xs'
                : 'text-slate-600 hover:text-[#111915]'
            }`}
          >
            Controle Econômico
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subAba === 'vendas'}
            onClick={() => setSubAba('vendas')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              subAba === 'vendas'
                ? 'bg-white text-[#111915] shadow-xs'
                : 'text-slate-600 hover:text-[#111915]'
            }`}
          >
            Pipeline de Vendas
          </button>
        </div>
      </div>

      {/* 4 KPIs Financeiros e de Faturamento */}
      <section
        aria-label="Indicadores de renda e faturamento"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Faturamento bruto</span>
            <TrendingUp className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#111915] tabular-nums">
            {formatarMoedaBRL(kpis.faturamentoBruto)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums truncate">
            {kpis.vendasFechadasQtd} {kpis.vendasFechadasQtd === 1 ? 'venda' : 'vendas'} · Ticket{' '}
            {formatarMoedaBRL(kpis.ticketMedio)}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Receita recebida (caixa)</span>
            <Wallet className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#15803D] tabular-nums">
            {formatarMoedaBRL(kpis.receitaRecebida)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatarMoedaBRL(kpis.aReceber)} a receber no período
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Despesas operacionais</span>
            <ArrowDownRight className="w-4 h-4 text-red-600" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#111915] tabular-nums">
            {formatarMoedaBRL(kpis.despesasTotais)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatarMoedaBRL(kpis.despesasPagas)} já liquidado
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Renda líquida</span>
            {margemPositiva ? (
              <ArrowUpRight className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-600" aria-hidden="true" />
            )}
          </div>
          <p
            className={`mt-3 font-display text-2xl sm:text-3xl font-semibold tabular-nums ${
              margemPositiva ? 'text-[#15803D]' : 'text-red-700'
            }`}
          >
            {formatarMoedaBRL(kpis.rendaLiquida)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {margemPositiva ? 'Superávit' : 'Déficit'} · Margem líquida de {kpis.margemLiquidaPct}%
          </p>
        </div>
      </section>

      {/* Barra de Filtros */}
      <div className="bg-white border border-[#E2E8E4] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar lançamentos ou vendas"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                subAba === 'economico'
                  ? 'Buscar descrição ou categoria...'
                  : 'Buscar venda ou vendedor...'
              }
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          <select
            aria-label="Filtrar por período"
            value={periodoMes}
            onChange={(e) => setPeriodoMes(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          >
            {PERIODOS_OPCOES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>

          {subAba === 'economico' ? (
            <>
              <div
                role="group"
                aria-label="Filtrar por tipo de lançamento"
                className="inline-flex items-center p-1 bg-[#F1F5F2] rounded-lg"
              >
                {(
                  [
                    ['todos', 'Todos'],
                    ['receita', 'Receitas'],
                    ['despesa', 'Despesas'],
                  ] as const
                ).map(([valor, label]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltroTipo(valor)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                      filtroTipo === valor
                        ? 'bg-white text-[#111915] shadow-xs'
                        : 'text-slate-600 hover:text-[#111915]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filtrar por status financeiro"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusFinanceiro | 'todos')}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              >
                <option value="todos">Todos os status</option>
                <option value="pago">Pago / Recebido</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </>
          ) : (
            <select
              aria-label="Filtrar vendas por etapa"
              value={filtroEtapaVenda}
              onChange={(e) => setFiltroEtapaVenda(e.target.value as EtapaVenda | 'todas')}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              <option value="todas">Todas as etapas</option>
              <option value="prospeccao">Prospecção</option>
              <option value="proposta">Em proposta</option>
              <option value="fechada">Venda fechada</option>
              <option value="perdida">Perdida</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subAba === 'economico' ? (
            <button
              type="button"
              onClick={handleExportarCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E8E4] hover:bg-[#F6F8F7] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => abrirModalComModo('venda')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Nova venda</span>
            </button>
          )}
        </div>
      </div>

      {subAba === 'economico' ? (
        <>
          {/* Gráficos: Evolução 6 meses + Composição por categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-7 bg-white border border-[#E2E8E4] rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#111915]">
                    Evolução mensal: Faturamento vs. Despesas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clique em um mês para inspecionar a renda líquida apurada
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" aria-hidden="true" />
                    Faturamento
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" aria-hidden="true" />
                    Despesas
                  </span>
                </div>
              </div>

              {/* Faixa de leitura do mês selecionado (zero sobreposição) */}
              {pontoAtivoGrafico && (
                <div className="mt-4 px-3.5 py-2.5 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-[#111915]">
                    {pontoAtivoGrafico.label}
                  </span>
                  <div className="flex flex-wrap items-center gap-4 tabular-nums font-mono">
                    <span className="text-[#15803D]">
                      Rec.: {formatarMoedaBRL(pontoAtivoGrafico.receitas)}
                    </span>
                    <span className="text-slate-600">
                      Desp.: {formatarMoedaBRL(pontoAtivoGrafico.despesas)}
                    </span>
                    <span
                      className={`font-semibold ${
                        pontoAtivoGrafico.rendaLiquida >= 0 ? 'text-[#15803D]' : 'text-red-700'
                      }`}
                    >
                      Renda: {formatarMoedaBRL(pontoAtivoGrafico.rendaLiquida)}
                    </span>
                  </div>
                </div>
              )}

              {/* Barras agrupadas responsivas */}
              <div className="mt-5 grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 pt-4 border-b border-[#E2E8E4]">
                {serieMensal.map((ponto) => {
                  const alturaRec = Math.max(
                    Math.round((ponto.receitas / maxValorSerie) * 140),
                    4,
                  );
                  const alturaDesp = Math.max(
                    Math.round((ponto.despesas / maxValorSerie) * 140),
                    4,
                  );
                  const ativo = pontoAtivoGrafico?.mes === ponto.mes;

                  return (
                    <button
                      key={ponto.mes}
                      type="button"
                      onClick={() => setMesSelecionadoGrafico(ponto.mes)}
                      aria-label={`Inspecionar ${ponto.label}: faturamento ${formatarMoedaBRL(ponto.receitas)}, despesas ${formatarMoedaBRL(ponto.despesas)}`}
                      className={`flex flex-col items-center justify-end h-full pb-2 rounded-t-lg transition-colors cursor-pointer ${
                        ativo ? 'bg-[#F1F7F3]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-end gap-1.5 h-[148px]">
                        <div
                          className={`w-3.5 sm:w-5 rounded-t transition-all ${
                            ativo ? 'bg-[#15803D]' : 'bg-[#22C55E]'
                          }`}
                          style={{height: `${alturaRec}px`}}
                        />
                        <div
                          className={`w-3.5 sm:w-5 rounded-t transition-all ${
                            ativo ? 'bg-slate-600' : 'bg-slate-300'
                          }`}
                          style={{height: `${alturaDesp}px`}}
                        />
                      </div>
                      <span
                        className={`mt-2 text-xs font-mono tabular-nums ${
                          ativo ? 'font-semibold text-[#111915]' : 'text-slate-500'
                        }`}
                      >
                        {ponto.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Composição por Categoria + Resumo do Pipeline */}
            <section className="lg:col-span-5 bg-white border border-[#E2E8E4] rounded-xl p-5 space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-[#111915]">
                  Composição de receitas e despesas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição por categoria no período selecionado
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#15803D]">Receitas por origem</p>
                {categoriasReceita.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma receita lançada neste período.</p>
                ) : (
                  categoriasReceita.slice(0, 3).map((cat) => (
                    <div key={cat.categoria}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 truncate pr-2">{cat.categoria}</span>
                        <span className="font-mono tabular-nums text-[#111915] shrink-0">
                          {formatarMoedaBRL(cat.total)} ({cat.percentual}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F5F2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16A34A] rounded-full"
                          style={{width: `${cat.percentual}%`}}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-[#E2E8E4] space-y-3">
                <p className="text-xs font-semibold text-slate-700">Despesas por centro de custo</p>
                {categoriasDespesa.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma despesa lançada neste período.</p>
                ) : (
                  categoriasDespesa.slice(0, 3).map((cat) => (
                    <div key={cat.categoria}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 truncate pr-2">{cat.categoria}</span>
                        <span className="font-mono tabular-nums text-slate-700 shrink-0">
                          {formatarMoedaBRL(cat.total)} ({cat.percentual}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full"
                          style={{width: `${cat.percentual}%`}}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-[#E2E8E4] flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-500">Pipeline comercial em aberto</p>
                  <p className="font-mono font-semibold text-[#111915] text-sm tabular-nums mt-0.5">
                    {formatarMoedaBRL(kpis.pipelineAbertoValor)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubAba('vendas')}
                  className="text-xs font-medium text-[#15803D] hover:text-[#166534] cursor-pointer"
                >
                  Ver pipeline →
                </button>
              </div>
            </section>
          </div>

          {/* Tabela de Lançamentos Financeiros */}
          <section className="bg-white border border-[#E2E8E4] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#111915]">
                  Livro de lançamentos econômicos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {lancamentosFiltrados.length}{' '}
                  {lancamentosFiltrados.length === 1 ? 'registro exibido' : 'registros exibidos'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => abrirModalComModo('despesa')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-[#E2E8E4] hover:bg-[#F6F8F7] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Despesa
                </button>
                <button
                  type="button"
                  onClick={() => abrirModalComModo('receita')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Receita
                </button>
              </div>
            </div>

            {lancamentosFiltrados.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-[#111915]">Nenhum lançamento encontrado</p>
                <p className="text-xs text-slate-500 mt-1">
                  Altere os filtros ou adicione uma receita/despesa para acompanhar o fluxo de caixa.
                </p>
                <button
                  type="button"
                  onClick={() => abrirModalComModo('receita')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Novo lançamento</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8E4] bg-[#F8FAF9] text-xs font-medium text-slate-500">
                      <th className="py-3 px-4">Descrição e categoria</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Forma</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Data</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {lancamentosFiltrados.map((item) => {
                      const nomeCliente = obterNomeCliente(item.clienteId);
                      const ehReceita = item.tipo === 'receita';
                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAF9] transition-colors">
                          <td className="py-3 px-4 max-w-sm">
                            <p className="font-medium text-[#111915] truncate">{item.descricao}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {ehReceita ? 'Receita' : 'Despesa'} · {item.categoria}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {nomeCliente ?? 'Interno'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {LABEL_FORMA_PAGAMENTO[item.formaPagamento]}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Alterar status de ${item.descricao}`}
                                value={item.status}
                                onChange={(e) =>
                                  onAtualizarStatusLancamento(
                                    item.id,
                                    e.target.value as StatusFinanceiro,
                                  )
                                }
                                className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                              >
                                <option value="pago">Pago / Recebido</option>
                                <option value="pendente">Pendente</option>
                                <option value="atrasado">Atrasado</option>
                              </select>
                              <span className="hidden xl:inline-flex">
                                <StatusFinanceiroIndicador status={item.status} />
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {formatarDataBR(item.data)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                              ehReceita ? 'text-[#15803D]' : 'text-red-700'
                            }`}
                          >
                            {ehReceita ? '+' : '-'} {formatarMoedaBRL(item.valor)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onExcluirLancamento(item.id)}
                              aria-label={`Excluir lançamento ${item.descricao}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        /* Sub-aba Pipeline de Vendas */
        <section className="bg-white border border-[#E2E8E4] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[#111915]">
                Funil comercial e faturamento de vendas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Em negociação: {formatarMoedaBRL(kpis.pipelineAbertoValor)} · Fechadas no período:{' '}
                {formatarMoedaBRL(kpis.vendasFechadasValor)}
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'negócio' : 'negócios'}
            </span>
          </div>

          {vendasFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#111915]">Nenhuma venda encontrada</p>
              <p className="text-xs text-slate-500 mt-1">
                Registre uma oportunidade comercial ou ajuste os filtros para acompanhar fechamentos.
              </p>
              <button
                type="button"
                onClick={() => abrirModalComModo('venda')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Cadastrar venda</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8E4] bg-[#F8FAF9] text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Oportunidade / Venda</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">Etapa</th>
                    <th className="py-3 px-4 text-right">Previsão</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {vendasFiltradas.map((venda) => {
                    const nomeCliente = obterNomeCliente(venda.clienteId);
                    return (
                      <tr key={venda.id} className="hover:bg-[#F8FAF9] transition-colors">
                        <td className="py-3 px-4 max-w-sm">
                          <p className="font-medium text-[#111915]">{venda.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {LABEL_FORMA_PAGAMENTO[venda.formaPagamento]}
                            {venda.observacoes ? ` · ${venda.observacoes}` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {nomeCliente ?? 'Prospecção direta'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {venda.responsavel}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Etapa da venda ${venda.titulo}`}
                            value={venda.etapa}
                            onChange={(e) =>
                              onAtualizarEtapaVenda(venda.id, e.target.value as EtapaVenda)
                            }
                            className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                          >
                            <option value="prospeccao">Prospecção</option>
                            <option value="proposta">Em proposta</option>
                            <option value="fechada">Venda fechada</option>
                            <option value="perdida">Perdida</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatarDataBR(venda.dataPrevista)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-[#111915] tabular-nums whitespace-nowrap">
                          {formatarMoedaBRL(venda.valor)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {venda.etapa === 'fechada' && !venda.faturada ? (
                              <button
                                type="button"
                                onClick={() => onFaturarVenda(venda.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-md transition-colors cursor-pointer"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Faturar</span>
                              </button>
                            ) : venda.faturada ? (
                              <span className="text-xs font-medium text-[#15803D]">Faturada</span>
                            ) : (
                              <EtapaVendaIndicador etapa={venda.etapa} />
                            )}

                            <button
                              type="button"
                              onClick={() => onExcluirVenda(venda.id)}
                              aria-label={`Excluir venda ${venda.titulo}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modal de Novo Lançamento / Venda */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-financeiro"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E2E8E4] rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8E4]">
              <h2
                id="titulo-modal-financeiro"
                className="font-display text-lg font-semibold text-[#111915]"
              >
                {modoModal === 'venda' ? 'Registrar venda ou proposta' : 'Novo lançamento econômico'}
              </h2>
              <button
                type="button"
                onClick={onFecharModal}
                aria-label="Fechar janela financeira"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              role="group"
              aria-label="Tipo de registro"
              className="mt-4 grid grid-cols-3 gap-1 p-1 bg-[#F1F5F2] rounded-lg"
            >
              {(
                [
                  ['receita', 'Receita'],
                  ['despesa', 'Despesa'],
                  ['venda', 'Venda'],
                ] as const
              ).map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setModoModal(valor);
                    setErroForm(null);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    modoModal === valor
                      ? 'bg-white text-[#111915] shadow-xs'
                      : 'text-slate-600 hover:text-[#111915]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-3.5">
              {erroForm && (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5"
                >
                  {erroForm}
                </p>
              )}

              <div>
                <label htmlFor="fin-desc" className="block text-sm font-medium text-slate-700 mb-1">
                  {modoModal === 'venda' ? 'Título da venda / contrato *' : 'Descrição *'}
                </label>
                <input
                  id="fin-desc"
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={
                    modoModal === 'despesa'
                      ? 'Ex.: Compra de equipamentos'
                      : 'Ex.: Consultoria mensal cliente B2B'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fin-valor" className="block text-sm font-medium text-slate-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    id="fin-valor"
                    type="text"
                    inputMode="decimal"
                    value={valorTexto}
                    onChange={(e) => setValorTexto(e.target.value)}
                    placeholder="Ex.: 4500,00"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fin-data" className="block text-sm font-medium text-slate-700 mb-1">
                    {modoModal === 'venda' ? 'Data prevista *' : 'Data do lançamento *'}
                  </label>
                  <input
                    id="fin-data"
                    type="date"
                    value={dataLanc}
                    onChange={(e) => setDataLanc(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modoModal === 'venda' ? (
                  <div>
                    <label htmlFor="fin-resp" className="block text-sm font-medium text-slate-700 mb-1">
                      Responsável comercial *
                    </label>
                    <input
                      id="fin-resp"
                      type="text"
                      value={responsavelVenda}
                      onChange={(e) => setResponsavelVenda(e.target.value)}
                      placeholder="Nome do vendedor"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="fin-cat" className="block text-sm font-medium text-slate-700 mb-1">
                      Categoria
                    </label>
                    <input
                      id="fin-cat"
                      type="text"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      placeholder="Ex.: Serviços, Impostos, Folha"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="fin-forma" className="block text-sm font-medium text-slate-700 mb-1">
                    Forma de pagamento
                  </label>
                  <select
                    id="fin-forma"
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modoModal === 'venda' ? (
                  <div>
                    <label htmlFor="fin-etapa" className="block text-sm font-medium text-slate-700 mb-1">
                      Etapa da venda
                    </label>
                    <select
                      id="fin-etapa"
                      value={etapaVenda}
                      onChange={(e) => setEtapaVenda(e.target.value as EtapaVenda)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="prospeccao">Prospecção</option>
                      <option value="proposta">Em proposta</option>
                      <option value="fechada">Venda fechada</option>
                      <option value="perdida">Perdida</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="fin-status" className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      id="fin-status"
                      value={statusLanc}
                      onChange={(e) => setStatusLanc(e.target.value as StatusFinanceiro)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="pago">Pago / Recebido</option>
                      <option value="pendente">Pendente</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="fin-cli" className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente vinculado (opcional)
                  </label>
                  <select
                    id="fin-cli"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="">Nenhum / Interno</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={onFecharModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer"
                >
                  {modoModal === 'venda' ? 'Salvar venda' : 'Salvar lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
