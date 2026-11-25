import {useState, type FormEvent} from 'react';
import {Mail, Phone, Plus, Search, X} from 'lucide-react';
import type {Cliente, Processo, StatusCliente, Tarefa} from '../types/database';
import {formatarDataBR} from '../utils/workspaceLogic';
import {StatusClienteIndicador} from './StatusIndicator';

interface ClientsViewProps {
  clientes: Cliente[];
  tarefas: Tarefa[];
  processos: Processo[];
  modalAberto: boolean;
  onAbrirModal: () => void;
  onFecharModal: () => void;
  onCriarCliente: (novo: Omit<Cliente, 'id' | 'empresaId' | 'criadoEm'>) => void;
  onAtualizarStatusCliente: (clienteId: string, status: StatusCliente) => void;
}

export function ClientsView({
  clientes,
  tarefas,
  processos,
  modalAberto,
  onAbrirModal,
  onFecharModal,
  onCriarCliente,
  onAtualizarStatusCliente,
}: ClientsViewProps) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusCliente | 'todos'>('todos');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);

  // Campos de novo cliente
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [segmento, setSegmento] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [status, setStatus] = useState<StatusCliente>('ativo');
  const [observacoes, setObservacoes] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);

  const clientesFiltrados = clientes.filter((c) => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return `${c.nome} ${c.documento} ${c.segmento} ${c.responsavel}`
      .toLowerCase()
      .includes(termo);
  });

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    if (!nome.trim() || !documento.trim() || !email.trim() || !responsavel.trim()) {
      setErroForm('Preencha razão social/nome, CNPJ/CPF, e-mail e responsável.');
      return;
    }

    onCriarCliente({
      nome: nome.trim(),
      documento: documento.trim(),
      email: email.trim(),
      telefone: telefone.trim() || '(11) 0000-0000',
      segmento: segmento.trim() || 'Serviços',
      responsavel: responsavel.trim(),
      status,
      observacoes: observacoes.trim(),
    });

    setNome('');
    setDocumento('');
    setEmail('');
    setTelefone('');
    setSegmento('');
    setResponsavel('');
    setStatus('ativo');
    setObservacoes('');
    onFecharModal();
  }

  return (
    <div className="space-y-5">
      {/* Filtros e busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar clientes"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou segmento..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrar clientes por status"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg overflow-x-auto"
          >
            {(
              [
                ['todos', 'Todos'],
                ['ativo', 'Ativos'],
                ['onboarding', 'Onboarding'],
                ['inativo', 'Inativos'],
              ] as const
            ).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltroStatus(valor)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  filtroStatus === valor
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout Tabela + Detalhe */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div
          className={`${
            clienteSelecionado ? 'xl:col-span-8' : 'xl:col-span-12'
          } bg-white border border-slate-200 rounded-xl overflow-hidden`}
        >
          {clientesFiltrados.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">Nenhum cliente encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre o primeiro cliente da empresa para vincular tarefas e processos.
              </p>
              <button
                type="button"
                onClick={onAbrirModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Cadastrar cliente</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">CNPJ / CPF</th>
                    <th className="py-3 px-4">Contato principal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clientesFiltrados.map((cliente) => {
                    const selecionado = cliente.id === clienteSelecionadoId;
                    return (
                      <tr
                        key={cliente.id}
                        className={`transition-colors ${
                          selecionado ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setClienteSelecionadoId(selecionado ? null : cliente.id)
                            }
                            className="text-left group cursor-pointer"
                          >
                            <p className="font-medium text-slate-900 group-hover:text-[#15803D]">
                              {cliente.nome}
                            </p>
                            <p className="text-xs text-slate-500">{cliente.segmento}</p>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {cliente.documento}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800">{cliente.responsavel}</p>
                          <p className="text-xs text-slate-500">{cliente.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <StatusClienteIndicador status={cliente.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {formatarDataBR(cliente.criadoEm)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Painel de Detalhes do Cliente */}
        {clienteSelecionado && (
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {clienteSelecionado.nome}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {clienteSelecionado.segmento} ·{' '}
                  <span className="font-mono tabular-nums">{clienteSelecionado.documento}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClienteSelecionadoId(null)}
                aria-label="Fechar detalhes do cliente"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>{clienteSelecionado.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">{clienteSelecionado.telefone}</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="detalhe-status-cliente"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Status do relacionamento
              </label>
              <select
                id="detalhe-status-cliente"
                value={clienteSelecionado.status}
                onChange={(e) =>
                  onAtualizarStatusCliente(
                    clienteSelecionado.id,
                    e.target.value as StatusCliente,
                  )
                }
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              >
                <option value="ativo">Ativo</option>
                <option value="onboarding">Em onboarding</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            {clienteSelecionado.observacoes && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700">Observações operacionais</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {clienteSelecionado.observacoes}
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="font-display text-lg font-semibold text-slate-900 tabular-nums">
                  {tarefas.filter((t) => t.clienteId === clienteSelecionado.id).length}
                </p>
                <p className="text-xs text-slate-500">Tarefas vinculadas</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="font-display text-lg font-semibold text-slate-900 tabular-nums">
                  {processos.filter((p) => p.clienteId === clienteSelecionado.id).length}
                </p>
                <p className="text-xs text-slate-500">Processos ativos</p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modal de Novo Cliente */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-cliente"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 id="titulo-modal-cliente" className="font-display text-lg font-semibold text-slate-900">
                Cadastrar cliente
              </h2>
              <button
                type="button"
                onClick={onFecharModal}
                aria-label="Fechar janela de novo cliente"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {erroForm && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {erroForm}
                </p>
              )}

              <div>
                <label htmlFor="cli-nome" className="block text-sm font-medium text-slate-700 mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  id="cli-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Indústria Beta Ltda"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cli-doc" className="block text-sm font-medium text-slate-700 mb-1">
                    CNPJ ou CPF *
                  </label>
                  <input
                    id="cli-doc"
                    type="text"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cli-seg" className="block text-sm font-medium text-slate-700 mb-1">
                    Segmento
                  </label>
                  <input
                    id="cli-seg"
                    type="text"
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value)}
                    placeholder="Ex.: Varejo, Logística"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cli-email" className="block text-sm font-medium text-slate-700 mb-1">
                    E-mail de contato *
                  </label>
                  <input
                    id="cli-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cli-tel" className="block text-sm font-medium text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    id="cli-tel"
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cli-resp" className="block text-sm font-medium text-slate-700 mb-1">
                    Pessoa responsável *
                  </label>
                  <input
                    id="cli-resp"
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cli-status" className="block text-sm font-medium text-slate-700 mb-1">
                    Status inicial
                  </label>
                  <select
                    id="cli-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusCliente)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="onboarding">Em onboarding</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="cli-obs" className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  id="cli-obs"
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Acordos de nível de serviço, datas de faturamento..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
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
                  Salvar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
