import type {
  Cliente,
  EtapaProcesso,
  EtapaVenda,
  FormaPagamento,
  LancamentoFinanceiro,
  PrioridadeTarefa,
  Processo,
  StatusCliente,
  StatusFinanceiro,
  StatusProcesso,
  StatusTarefa,
  Tarefa,
  TipoLancamento,
  Venda,
} from '../types/database';

export interface DashboardKPIs {
  tarefasAbertas: number;
  tarefasConcluidas: number;
  tarefasAtrasadas: number;
  clientesAtivos: number;
  processosAtivos: number;
  taxaConclusao: number;
}

export interface KPIsFinanceiros {
  faturamentoBruto: number;
  receitaRecebida: number;
  aReceber: number;
  despesasTotais: number;
  despesasPagas: number;
  rendaLiquida: number;
  margemLiquidaPct: number;
  vendasFechadasQtd: number;
  vendasFechadasValor: number;
  ticketMedio: number;
  pipelineAbertoValor: number;
}

export interface PontoSerieMensal {
  mes: string; // YYYY-MM
  label: string; // Ex: Nov/26
  receitas: number;
  despesas: number;
  rendaLiquida: number;
}

export interface ResumoCategoria {
  categoria: string;
  total: number;
  percentual: number;
}

export interface FiltrosTarefa {
  busca: string;
  status: StatusTarefa | 'todos';
  prioridade: PrioridadeTarefa | 'todas';
}

export interface FiltrosFinanceiros {
  busca: string;
  periodoMes: string; // 'todos' ou 'YYYY-MM'
  tipo: TipoLancamento | 'todos';
  status: StatusFinanceiro | 'todos';
}

const PESO_PRIORIDADE: Record<PrioridadeTarefa, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baixa: 1,
};

const NOMES_MESES_CURTOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function filtrarPorEmpresa<T extends {empresaId: string}>(
  items: T[],
  empresaId: string,
): T[] {
  return items.filter((item) => item.empresaId === empresaId);
}

export function isTarefaAtrasada(tarefa: Tarefa, dataReferenciaISO: string): boolean {
  if (tarefa.status === 'concluida') {
    return false;
  }
  return tarefa.prazo < dataReferenciaISO;
}

export function calcularProgressoProcesso(etapas: EtapaProcesso[]): number {
  if (etapas.length === 0) {
    return 0;
  }
  const concluidas = etapas.filter((e) => e.concluida).length;
  return Math.round((concluidas / etapas.length) * 100);
}

export function calcularDashboardKPIs(
  tarefas: Tarefa[],
  clientes: Cliente[],
  processos: Processo[],
  empresaId: string,
  dataReferenciaISO: string,
): DashboardKPIs {
  const tarefasEmpresa = filtrarPorEmpresa(tarefas, empresaId);
  const clientesEmpresa = filtrarPorEmpresa(clientes, empresaId);
  const processosEmpresa = filtrarPorEmpresa(processos, empresaId);

  const tarefasConcluidas = tarefasEmpresa.filter((t) => t.status === 'concluida').length;
  const tarefasAbertas = tarefasEmpresa.length - tarefasConcluidas;
  const tarefasAtrasadas = tarefasEmpresa.filter((t) =>
    isTarefaAtrasada(t, dataReferenciaISO),
  ).length;
  const clientesAtivos = clientesEmpresa.filter(
    (c) => c.status === 'ativo' || c.status === 'onboarding',
  ).length;
  const processosAtivos = processosEmpresa.filter((p) => p.status === 'ativo').length;

  const taxaConclusao =
    tarefasEmpresa.length > 0
      ? Math.round((tarefasConcluidas / tarefasEmpresa.length) * 100)
      : 0;

  return {
    tarefasAbertas,
    tarefasConcluidas,
    tarefasAtrasadas,
    clientesAtivos,
    processosAtivos,
    taxaConclusao,
  };
}

export function calcularKPIsFinanceiros(
  lancamentos: LancamentoFinanceiro[],
  vendas: Venda[],
  empresaId: string,
  periodoMes = 'todos',
): KPIsFinanceiros {
  const lancEmpresa = filtrarPorEmpresa(lancamentos, empresaId).filter(
    (l) => periodoMes === 'todos' || l.data.startsWith(periodoMes),
  );
  const vendasEmpresa = filtrarPorEmpresa(vendas, empresaId);

  const receitas = lancEmpresa.filter((l) => l.tipo === 'receita');
  const despesas = lancEmpresa.filter((l) => l.tipo === 'despesa');

  const faturamentoBruto = receitas.reduce((acc, item) => acc + item.valor, 0);
  const receitaRecebida = receitas
    .filter((l) => l.status === 'pago')
    .reduce((acc, item) => acc + item.valor, 0);
  const aReceber = receitas
    .filter((l) => l.status !== 'pago')
    .reduce((acc, item) => acc + item.valor, 0);

  const despesasTotais = despesas.reduce((acc, item) => acc + item.valor, 0);
  const despesasPagas = despesas
    .filter((l) => l.status === 'pago')
    .reduce((acc, item) => acc + item.valor, 0);

  const rendaLiquida = faturamentoBruto - despesasTotais;
  const margemLiquidaPct =
    faturamentoBruto > 0 ? Math.round((rendaLiquida / faturamentoBruto) * 100) : 0;

  const vendasPeriodo =
    periodoMes === 'todos'
      ? vendasEmpresa
      : vendasEmpresa.filter((v) => v.dataPrevista.startsWith(periodoMes));

  const vendasFechadas = vendasPeriodo.filter((v) => v.etapa === 'fechada');
  const vendasFechadasValor = vendasFechadas.reduce((acc, v) => acc + v.valor, 0);
  const ticketMedio =
    vendasFechadas.length > 0 ? Math.round(vendasFechadasValor / vendasFechadas.length) : 0;

  const pipelineAbertoValor = vendasEmpresa
    .filter((v) => v.etapa === 'prospeccao' || v.etapa === 'proposta')
    .reduce((acc, v) => acc + v.valor, 0);

  return {
    faturamentoBruto,
    receitaRecebida,
    aReceber,
    despesasTotais,
    despesasPagas,
    rendaLiquida,
    margemLiquidaPct,
    vendasFechadasQtd: vendasFechadas.length,
    vendasFechadasValor,
    ticketMedio,
    pipelineAbertoValor,
  };
}

export function formatarMesCurto(mesISO: string): string {
  const [ano, mes] = mesISO.split('-');
  const idx = Number(mes) - 1;
  if (!ano || Number.isNaN(idx) || idx < 0 || idx > 11) return mesISO;
  return `${NOMES_MESES_CURTOS[idx]}/${ano.slice(2)}`;
}

export function calcularSerieMensalFinanceira(
  lancamentos: LancamentoFinanceiro[],
  empresaId: string,
  quantidadeMeses = 6,
): PontoSerieMensal[] {
  const lancEmpresa = filtrarPorEmpresa(lancamentos, empresaId);
  const mapa = new Map<string, {receitas: number; despesas: number}>();

  for (const item of lancEmpresa) {
    const mes = item.data.slice(0, 7);
    const atual = mapa.get(mes) ?? {receitas: 0, despesas: 0};
    if (item.tipo === 'receita') {
      atual.receitas += item.valor;
    } else {
      atual.despesas += item.valor;
    }
    mapa.set(mes, atual);
  }

  return Array.from(mapa.keys())
    .sort((a, b) => a.localeCompare(b))
    .slice(-quantidadeMeses)
    .map((mes) => {
      const valores = mapa.get(mes)!;
      return {
        mes,
        label: formatarMesCurto(mes),
        receitas: valores.receitas,
        despesas: valores.despesas,
        rendaLiquida: valores.receitas - valores.despesas,
      };
    });
}

export function filtrarLancamentosFinanceiros(
  lancamentos: LancamentoFinanceiro[],
  empresaId: string,
  filtros: FiltrosFinanceiros,
): LancamentoFinanceiro[] {
  const termo = filtros.busca.trim().toLowerCase();

  return filtrarPorEmpresa(lancamentos, empresaId)
    .filter((item) => {
      if (filtros.periodoMes !== 'todos' && !item.data.startsWith(filtros.periodoMes)) {
        return false;
      }
      if (filtros.tipo !== 'todos' && item.tipo !== filtros.tipo) {
        return false;
      }
      if (filtros.status !== 'todos' && item.status !== filtros.status) {
        return false;
      }
      if (termo.length > 0) {
        const alvo = `${item.descricao} ${item.categoria} ${item.formaPagamento}`.toLowerCase();
        if (!alvo.includes(termo)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function calcularResumoPorCategoria(
  lancamentos: LancamentoFinanceiro[],
  empresaId: string,
  tipo: TipoLancamento,
  periodoMes = 'todos',
): ResumoCategoria[] {
  const itens = filtrarPorEmpresa(lancamentos, empresaId).filter(
    (l) => l.tipo === tipo && (periodoMes === 'todos' || l.data.startsWith(periodoMes)),
  );

  const totalGeral = itens.reduce((acc, item) => acc + item.valor, 0);
  if (totalGeral === 0) return [];

  const porCategoria = new Map<string, number>();
  for (const item of itens) {
    porCategoria.set(item.categoria, (porCategoria.get(item.categoria) ?? 0) + item.valor);
  }

  return Array.from(porCategoria.entries())
    .map(([categoria, total]) => ({
      categoria,
      total,
      percentual: Math.round((total / totalGeral) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export function filtrarEOrdenarTarefas(
  tarefas: Tarefa[],
  empresaId: string,
  filtros: FiltrosTarefa,
): Tarefa[] {
  const termo = filtros.busca.trim().toLowerCase();

  return filtrarPorEmpresa(tarefas, empresaId)
    .filter((tarefa) => {
      if (filtros.status !== 'todos' && tarefa.status !== filtros.status) {
        return false;
      }
      if (filtros.prioridade !== 'todas' && tarefa.prioridade !== filtros.prioridade) {
        return false;
      }
      if (termo.length > 0) {
        const alvo = `${tarefa.titulo} ${tarefa.descricao} ${tarefa.responsavel}`.toLowerCase();
        if (!alvo.includes(termo)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'concluida' && b.status !== 'concluida') return 1;
      if (a.status !== 'concluida' && b.status === 'concluida') return -1;
      if (a.prazo !== b.prazo) return a.prazo.localeCompare(b.prazo);
      return PESO_PRIORIDADE[b.prioridade] - PESO_PRIORIDADE[a.prioridade];
    });
}

export function formatarDataBR(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatarMoedaBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'EM';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export const LABEL_PRIORIDADE: Record<PrioridadeTarefa, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const LABEL_STATUS_TAREFA: Record<StatusTarefa, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  em_revisao: 'Em revisão',
  concluida: 'Concluída',
};

export const LABEL_STATUS_CLIENTE: Record<StatusCliente, string> = {
  ativo: 'Ativo',
  onboarding: 'Em onboarding',
  inativo: 'Inativo',
};

export const LABEL_STATUS_PROCESSO: Record<StatusProcesso, string> = {
  ativo: 'Em execução',
  pausado: 'Pausado',
  concluido: 'Concluído',
};

export const LABEL_STATUS_FINANCEIRO: Record<StatusFinanceiro, string> = {
  pago: 'Pago / Recebido',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
};

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
};

export const LABEL_ETAPA_VENDA: Record<EtapaVenda, string> = {
  prospeccao: 'Prospecção',
  proposta: 'Em proposta',
  fechada: 'Venda fechada',
  perdida: 'Perdida',
};
