import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  PauseCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type {
  EtapaVenda,
  PrioridadeTarefa,
  StatusCliente,
  StatusFinanceiro,
  StatusProcesso,
  StatusTarefa,
} from '../types/database';
import {
  LABEL_ETAPA_VENDA,
  LABEL_PRIORIDADE,
  LABEL_STATUS_CLIENTE,
  LABEL_STATUS_FINANCEIRO,
  LABEL_STATUS_PROCESSO,
  LABEL_STATUS_TAREFA,
} from '../utils/workspaceLogic';

export function PrioridadeIndicador({prioridade}: {prioridade: PrioridadeTarefa}) {
  const config: Record<PrioridadeTarefa, {color: string; icon: typeof AlertTriangle}> = {
    urgente: {color: 'text-red-700', icon: AlertTriangle},
    alta: {color: 'text-amber-700', icon: AlertCircle},
    media: {color: 'text-emerald-700', icon: Clock},
    baixa: {color: 'text-slate-500', icon: Circle},
  };
  const {color, icon: Icon} = config[prioridade];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_PRIORIDADE[prioridade]}</span>
    </span>
  );
}

export function StatusTarefaIndicador({
  status,
  atrasada = false,
}: {
  status: StatusTarefa;
  atrasada?: boolean;
}) {
  if (atrasada && status !== 'concluida') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Atrasada</span>
      </span>
    );
  }

  const config: Record<StatusTarefa, {color: string; icon: typeof Circle}> = {
    a_fazer: {color: 'text-slate-600', icon: Circle},
    em_andamento: {color: 'text-emerald-700', icon: Clock},
    em_revisao: {color: 'text-amber-700', icon: AlertCircle},
    concluida: {color: 'text-green-700', icon: CheckCircle2},
  };
  const {color, icon: Icon} = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_STATUS_TAREFA[status]}</span>
    </span>
  );
}

export function StatusClienteIndicador({status}: {status: StatusCliente}) {
  const config: Record<StatusCliente, {color: string; icon: typeof Circle}> = {
    ativo: {color: 'text-green-700', icon: CheckCircle2},
    onboarding: {color: 'text-amber-700', icon: Clock},
    inativo: {color: 'text-slate-500', icon: PauseCircle},
  };
  const {color, icon: Icon} = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_STATUS_CLIENTE[status]}</span>
    </span>
  );
}

export function StatusProcessoIndicador({status}: {status: StatusProcesso}) {
  const config: Record<StatusProcesso, {color: string; icon: typeof Circle}> = {
    ativo: {color: 'text-green-700', icon: Clock},
    pausado: {color: 'text-amber-700', icon: PauseCircle},
    concluido: {color: 'text-slate-700', icon: CheckCircle2},
  };
  const {color, icon: Icon} = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_STATUS_PROCESSO[status]}</span>
    </span>
  );
}

export function StatusFinanceiroIndicador({status}: {status: StatusFinanceiro}) {
  const config: Record<StatusFinanceiro, {color: string; icon: typeof Circle}> = {
    pago: {color: 'text-green-700', icon: CheckCircle2},
    pendente: {color: 'text-amber-700', icon: Clock},
    atrasado: {color: 'text-red-700', icon: AlertTriangle},
  };
  const {color, icon: Icon} = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_STATUS_FINANCEIRO[status]}</span>
    </span>
  );
}

export function EtapaVendaIndicador({etapa}: {etapa: EtapaVenda}) {
  const config: Record<EtapaVenda, {color: string; icon: typeof Circle}> = {
    prospeccao: {color: 'text-slate-600', icon: Circle},
    proposta: {color: 'text-amber-700', icon: TrendingUp},
    fechada: {color: 'text-green-700', icon: CheckCircle2},
    perdida: {color: 'text-red-700', icon: XCircle},
  };
  const {color, icon: Icon} = config[etapa];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{LABEL_ETAPA_VENDA[etapa]}</span>
    </span>
  );
}
