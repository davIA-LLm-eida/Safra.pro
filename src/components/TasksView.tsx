import {useState, type FormEvent} from 'react';
import {Kanban, List, Plus, Search, Trash2, X} from 'lucide-react';
import type {
  Cliente,
  PrioridadeTarefa,
  Processo,
  StatusTarefa,
  Tarefa,
} from '../types/database';
import {
  filtrarEOrdenarTarefas,
  formatarDataBR,
  isTarefaAtrasada,
  LABEL_STATUS_TAREFA,
} from '../utils/workspaceLogic';
import {PrioridadeIndicador, StatusTarefaIndicador} from './StatusIndicator';

interface TasksViewProps {
  empresaId: string;
  tarefas: Tarefa[];
  clientes: Cliente[];
  processos: Processo[];
  dataReferenciaISO: string;
  modalAberto: boolean;
  onAbrirModal: () => void;
  onFecharModal: () => void;
  onCriarTarefa: (nova: Omit<Tarefa, 'id' | 'empresaId' | 'criadoEm'>) => void;
  onAtualizarStatus: (tarefaId: string, novoStatus: StatusTarefa) => void;
  onExcluirTarefa: (tarefaId: string) => void;
}

const COLUNAS_KANBAN: StatusTarefa[] = ['a_fazer', 'em_andamento', 'em_revisao', 'concluida'];

export function TasksView({
  empresaId,
  tarefas,
  clientes,
  processos,
  dataReferenciaISO,
  modalAberto,
  onAbrirModal,
  onFecharModal,
  onCriarTarefa,
  onAtualizarStatus,
  onExcluirTarefa,
}: TasksViewProps) {
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'quadro'>('lista');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | 'todos'>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTarefa | 'todas'>('todas');

  // Campos do formulário de nova tarefa
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [prazo, setPrazo] = useState(dataReferenciaISO);
  const [responsavel, setResponsavel] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [processoId, setProcessoId] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);

  const tarefasFiltradas = filtrarEOrdenarTarefas(tarefas, empresaId, {
    busca,
    status: filtroStatus,
    prioridade: filtroPrioridade,
  });

  function obterNomeCliente(id?: string): string | null {
    if (!id) return null;
    return clientes.find((c) => c.id === id)?.nome ?? null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);

    if (!titulo.trim() || !responsavel.trim() || !prazo) {
      setErroForm('Informe título, responsável e prazo de entrega.');
      return;
    }

    onCriarTarefa({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      status: 'a_fazer',
      prazo,
      responsavel: responsavel.trim(),
      clienteId: clienteId || undefined,
      processoId: processoId || undefined,
    });

    setTitulo('');
    setDescricao('');
    setPrioridade('media');
    setPrazo(dataReferenciaISO);
    setResponsavel('');
    setClienteId('');
    setProcessoId('');
    onFecharModal();
  }

  return (
    <div className="space-y-5">
      {/* Barra de ferramentas e filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar tarefas"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou responsável..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrar por status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusTarefa | 'todos')}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              <option value="todos">Todos os status</option>
              <option value="a_fazer">A fazer</option>
              <option value="em_andamento">Em andamento</option>
              <option value="em_revisao">Em revisão</option>
              <option value="concluida">Concluída</option>
            </select>

            <select
              aria-label="Filtrar por prioridade"
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeTarefa | 'todas')}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              <option value="todas">Todas prioridades</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg" role="group" aria-label="Modo de visualização">
            <button
              type="button"
              onClick={() => setModoVisualizacao('lista')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                modoVisualizacao === 'lista'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('quadro')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                modoVisualizacao === 'quadro'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Quadro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo: Lista ou Quadro */}
      {tarefasFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">Nenhuma tarefa encontrada</p>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste os filtros aplicados ou cadastre uma nova tarefa para a empresa.
          </p>
          <button
            type="button"
            onClick={onAbrirModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nova tarefa</span>
          </button>
        </div>
      ) : modoVisualizacao === 'lista' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Tarefa</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Prazo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tarefasFiltradas.map((tarefa) => {
                  const atrasada = isTarefaAtrasada(tarefa, dataReferenciaISO);
                  const nomeCliente = obterNomeCliente(tarefa.clienteId);

                  return (
                    <tr key={tarefa.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 max-w-md">
                        <p
                          className={`font-medium ${
                            tarefa.status === 'concluida'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {tarefa.titulo}
                        </p>
                        {(nomeCliente || tarefa.descricao) && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {nomeCliente ? `${nomeCliente} · ` : ''}
                            {tarefa.descricao}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <PrioridadeIndicador prioridade={tarefa.prioridade} />
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {tarefa.responsavel}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Alterar status da tarefa ${tarefa.titulo}`}
                          value={tarefa.status}
                          onChange={(e) =>
                            onAtualizarStatus(tarefa.id, e.target.value as StatusTarefa)
                          }
                          className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                        >
                          <option value="a_fazer">A fazer</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="em_revisao">Em revisão</option>
                          <option value="concluida">Concluída</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <span className={atrasada ? 'text-red-700 font-semibold' : 'text-slate-600'}>
                          {formatarDataBR(tarefa.prazo)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onExcluirTarefa(tarefa.id)}
                          aria-label={`Excluir tarefa ${tarefa.titulo}`}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUNAS_KANBAN.map((colStatus) => {
            const itensColuna = tarefasFiltradas.filter((t) => t.status === colStatus);
            return (
              <section
                key={colStatus}
                aria-label={`Coluna ${LABEL_STATUS_TAREFA[colStatus]}`}
                className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-display text-sm font-semibold text-slate-800">
                    {LABEL_STATUS_TAREFA[colStatus]}
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {itensColuna.length}
                  </span>
                </div>

                {itensColuna.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Sem tarefas nesta etapa</p>
                ) : (
                  <div className="space-y-2.5">
                    {itensColuna.map((tarefa) => {
                      const atrasada = isTarefaAtrasada(tarefa, dataReferenciaISO);
                      return (
                        <article
                          key={tarefa.id}
                          className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5"
                        >
                          <p className="text-sm font-medium text-slate-900 leading-snug">
                            {tarefa.titulo}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <PrioridadeIndicador prioridade={tarefa.prioridade} />
                            <span
                              className={`font-mono tabular-nums ${
                                atrasada ? 'text-red-700 font-semibold' : 'text-slate-500'
                              }`}
                            >
                              {formatarDataBR(tarefa.prazo)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500 truncate">
                              {tarefa.responsavel}
                            </span>
                            <StatusTarefaIndicador status={tarefa.status} atrasada={atrasada} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal de Nova Tarefa */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-tarefa"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 id="titulo-modal-tarefa" className="font-display text-lg font-semibold text-slate-900">
                Cadastrar nova tarefa
              </h2>
              <button
                type="button"
                onClick={onFecharModal}
                aria-label="Fechar janela de nova tarefa"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {erroForm && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {erroForm}
                </p>
              )}

              <div>
                <label htmlFor="tarefa-titulo" className="block text-sm font-medium text-slate-700 mb-1">
                  Título da tarefa *
                </label>
                <input
                  id="tarefa-titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Enviar proposta revisada para aprovação"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  required
                />
              </div>

              <div>
                <label htmlFor="tarefa-desc" className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  id="tarefa-desc"
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes ou critérios de conclusão..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="tarefa-prioridade" className="block text-sm font-medium text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    id="tarefa-prioridade"
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tarefa-prazo" className="block text-sm font-medium text-slate-700 mb-1">
                    Prazo *
                  </label>
                  <input
                    id="tarefa-prazo"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="tarefa-resp" className="block text-sm font-medium text-slate-700 mb-1">
                    Responsável *
                  </label>
                  <input
                    id="tarefa-resp"
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tarefa-cliente" className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente vinculado (opcional)
                  </label>
                  <select
                    id="tarefa-cliente"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="">Nenhum</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tarefa-processo" className="block text-sm font-medium text-slate-700 mb-1">
                    Processo vinculado (opcional)
                  </label>
                  <select
                    id="tarefa-processo"
                    value={processoId}
                    onChange={(e) => setProcessoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="">Nenhum</option>
                    {processos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
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
                  Salvar tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
