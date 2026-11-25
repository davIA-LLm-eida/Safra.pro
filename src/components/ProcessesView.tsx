import {useState, type FormEvent} from 'react';
import {Plus, X} from 'lucide-react';
import type {Cliente, Processo, StatusProcesso} from '../types/database';
import {calcularProgressoProcesso} from '../utils/workspaceLogic';
import {StatusProcessoIndicador} from './StatusIndicator';

interface ProcessesViewProps {
  processos: Processo[];
  clientes: Cliente[];
  modalAberto: boolean;
  onAbrirModal: () => void;
  onFecharModal: () => void;
  onAlternarEtapa: (processoId: string, etapaId: string) => void;
  onAdicionarEtapa: (processoId: string, tituloEtapa: string) => void;
  onAlterarStatusProcesso: (processoId: string, status: StatusProcesso) => void;
  onCriarProcesso: (dados: {
    titulo: string;
    categoria: string;
    responsavel: string;
    descricao: string;
    clienteId?: string;
    etapasTitulos: string[];
  }) => void;
}

export function ProcessesView({
  processos,
  clientes,
  modalAberto,
  onAbrirModal,
  onFecharModal,
  onAlternarEtapa,
  onAdicionarEtapa,
  onAlterarStatusProcesso,
  onCriarProcesso,
}: ProcessesViewProps) {
  const [novaEtapaPorProcesso, setNovaEtapaPorProcesso] = useState<Record<string, string>>({});

  // Modal de novo processo
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Operações');
  const [responsavel, setResponsavel] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [etapasTexto, setEtapasTexto] = useState(
    'Receber documentação\nConfigurar cadastro interno\nValidar entrega com o cliente',
  );
  const [erroForm, setErroForm] = useState<string | null>(null);

  function obterNomeCliente(id?: string): string | null {
    if (!id) return null;
    return clientes.find((c) => c.id === id)?.nome ?? null;
  }

  function handleAddStep(e: FormEvent, processoId: string) {
    e.preventDefault();
    const texto = (novaEtapaPorProcesso[processoId] ?? '').trim();
    if (!texto) return;
    onAdicionarEtapa(processoId, texto);
    setNovaEtapaPorProcesso((prev) => ({...prev, [processoId]: ''}));
  }

  function handleSubmitProcesso(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);

    const etapasTitulos = etapasTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!titulo.trim() || !responsavel.trim() || etapasTitulos.length === 0) {
      setErroForm('Informe título, responsável e ao menos uma etapa do processo.');
      return;
    }

    onCriarProcesso({
      titulo: titulo.trim(),
      categoria: categoria.trim() || 'Operações',
      responsavel: responsavel.trim(),
      descricao: descricao.trim(),
      clienteId: clienteId || undefined,
      etapasTitulos,
    });

    setTitulo('');
    setResponsavel('');
    setClienteId('');
    setDescricao('');
    onFecharModal();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Fluxos e processos padronizados
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe checklists operacionais e garanta repetibilidade nas entregas.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
        </span>
      </div>

      {processos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">Nenhum processo cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Estruture o primeiro fluxo de trabalho da sua empresa com etapas claras.
          </p>
          <button
            type="button"
            onClick={onAbrirModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Criar processo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {processos.map((processo) => {
            const progresso = calcularProgressoProcesso(processo.etapas);
            const concluidas = processo.etapas.filter((e) => e.concluida).length;
            const nomeCliente = obterNomeCliente(processo.clienteId);

            return (
              <article
                key={processo.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{processo.categoria}</span>
                      {nomeCliente && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{nomeCliente}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900 mt-1">
                      {processo.titulo}
                    </h3>
                    {processo.descricao && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {processo.descricao}
                      </p>
                    )}
                  </div>

                  <select
                    aria-label={`Status do processo ${processo.titulo}`}
                    value={processo.status}
                    onChange={(e) =>
                      onAlterarStatusProcesso(processo.id, e.target.value as StatusProcesso)
                    }
                    className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                  >
                    <option value="ativo">Em execução</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                {/* Barra de progresso */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <StatusProcessoIndicador status={processo.status} />
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">Resp.: {processo.responsavel}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      {concluidas}/{processo.etapas.length} ({progresso}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16A34A] rounded-full transition-all duration-200"
                      style={{width: `${progresso}%`}}
                    />
                  </div>
                </div>

                {/* Checklist de etapas */}
                <ul className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                  {processo.etapas.map((etapa) => (
                    <li key={etapa.id} className="py-2 flex items-start gap-2.5">
                      <input
                        id={`etapa-${etapa.id}`}
                        type="checkbox"
                        checked={etapa.concluida}
                        onChange={() => onAlternarEtapa(processo.id, etapa.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#15803D] focus:ring-[#16A34A] cursor-pointer"
                      />
                      <label
                        htmlFor={`etapa-${etapa.id}`}
                        className={`text-sm leading-snug cursor-pointer select-none ${
                          etapa.concluida ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {etapa.titulo}
                      </label>
                    </li>
                  ))}
                </ul>

                {/* Adicionar nova etapa */}
                <form
                  onSubmit={(e) => handleAddStep(e, processo.id)}
                  className="pt-2 flex items-center gap-2"
                >
                  <input
                    type="text"
                    aria-label={`Adicionar etapa ao processo ${processo.titulo}`}
                    value={novaEtapaPorProcesso[processo.id] ?? ''}
                    onChange={(e) =>
                      setNovaEtapaPorProcesso((prev) => ({
                        ...prev,
                        [processo.id]: e.target.value,
                      }))
                    }
                    placeholder="Adicionar nova etapa..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Adicionar
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Novo Processo */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-processo"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 id="titulo-modal-processo" className="font-display text-lg font-semibold text-slate-900">
                Novo processo empresarial
              </h2>
              <button
                type="button"
                onClick={onFecharModal}
                aria-label="Fechar janela de novo processo"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProcesso} className="mt-4 space-y-3.5">
              {erroForm && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {erroForm}
                </p>
              )}

              <div>
                <label htmlFor="proc-titulo" className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do processo *
                </label>
                <input
                  id="proc-titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Integração de Novo Colaborador"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="proc-cat" className="block text-sm font-medium text-slate-700 mb-1">
                    Categoria
                  </label>
                  <input
                    id="proc-cat"
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Financeiro, Comercial, RH..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label htmlFor="proc-resp" className="block text-sm font-medium text-slate-700 mb-1">
                    Responsável *
                  </label>
                  <input
                    id="proc-resp"
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome do responsável"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="proc-cli" className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente vinculado (opcional)
                </label>
                <select
                  id="proc-cli"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Processo interno da empresa</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="proc-desc" className="block text-sm font-medium text-slate-700 mb-1">
                  Objetivo do processo
                </label>
                <input
                  id="proc-desc"
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Resumo curto do resultado esperado"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div>
                <label htmlFor="proc-etapas" className="block text-sm font-medium text-slate-700 mb-1">
                  Etapas do checklist (uma por linha) *
                </label>
                <textarea
                  id="proc-etapas"
                  rows={4}
                  value={etapasTexto}
                  onChange={(e) => setEtapasTexto(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  required
                />
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
                  Criar processo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
