import {useMemo, useState} from 'react';
import {AiAssistantView} from './components/AiAssistantView';
import {AuthView} from './components/AuthView';
import {ClientsView} from './components/ClientsView';
import {DashboardView} from './components/DashboardView';
import {FinancialSalesView} from './components/FinancialSalesView';
import {ProcessesView} from './components/ProcessesView';
import {Sidebar} from './components/Sidebar';
import {SupabaseReadinessView} from './components/SupabaseReadinessView';
import {TasksView} from './components/TasksView';
import {TopBar} from './components/TopBar';
import {
  DEMO_CLIENTES,
  DEMO_EMPRESAS,
  DEMO_LANCAMENTOS,
  DEMO_PROCESSOS,
  DEMO_TAREFAS,
  DEMO_USUARIOS,
  DEMO_VENDAS,
} from './data/mockData';
import {isSupabaseConfigured} from './lib/supabase';
import type {
  Cliente,
  Empresa,
  EtapaVenda,
  LancamentoFinanceiro,
  Processo,
  SecaoAtiva,
  StatusCliente,
  StatusFinanceiro,
  StatusProcesso,
  StatusTarefa,
  Tarefa,
  UsuarioPerfil,
  Venda,
} from './types/database';
import {
  calcularDashboardKPIs,
  calcularKPIsFinanceiros,
  filtrarPorEmpresa,
} from './utils/workspaceLogic';

const DATA_REFERENCIA_ISO = '2026-11-25';

export default function App() {
  const modoSupabase = isSupabaseConfigured();

  const iniciarEmAuth =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('view') === 'auth';

  const [autenticado, setAutenticado] = useState<boolean>(!iniciarEmAuth);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>(DEMO_EMPRESAS);
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>(DEMO_USUARIOS);
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>(DEMO_EMPRESAS[0].id);
  const [usuarioAtivoId, setUsuarioAtivoId] = useState<string>(DEMO_USUARIOS[0].id);

  const [clientes, setClientes] = useState<Cliente[]>(DEMO_CLIENTES);
  const [processos, setProcessos] = useState<Processo[]>(DEMO_PROCESSOS);
  const [tarefas, setTarefas] = useState<Tarefa[]>(DEMO_TAREFAS);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>(DEMO_LANCAMENTOS);
  const [vendas, setVendas] = useState<Venda[]>(DEMO_VENDAS);

  const [modalTarefaAberto, setModalTarefaAberto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  const empresaAtiva = useMemo(
    () => empresas.find((e) => e.id === empresaAtivaId) ?? empresas[0],
    [empresas, empresaAtivaId],
  );

  const usuarioAtivo = useMemo(() => {
    const daEmpresa = usuarios.find(
      (u) => u.id === usuarioAtivoId && u.empresaId === empresaAtiva.id,
    );
    if (daEmpresa) return daEmpresa;
    return usuarios.find((u) => u.empresaId === empresaAtiva.id) ?? usuarios[0];
  }, [usuarios, usuarioAtivoId, empresaAtiva.id]);

  // Dados estritamente isolados pela empresa ativa
  const tarefasDaEmpresa = useMemo(
    () => filtrarPorEmpresa(tarefas, empresaAtiva.id),
    [tarefas, empresaAtiva.id],
  );
  const clientesDaEmpresa = useMemo(
    () => filtrarPorEmpresa(clientes, empresaAtiva.id),
    [clientes, empresaAtiva.id],
  );
  const processosDaEmpresa = useMemo(
    () => filtrarPorEmpresa(processos, empresaAtiva.id),
    [processos, empresaAtiva.id],
  );
  const lancamentosDaEmpresa = useMemo(
    () => filtrarPorEmpresa(lancamentos, empresaAtiva.id),
    [lancamentos, empresaAtiva.id],
  );
  const vendasDaEmpresa = useMemo(
    () => filtrarPorEmpresa(vendas, empresaAtiva.id),
    [vendas, empresaAtiva.id],
  );

  const kpis = useMemo(
    () =>
      calcularDashboardKPIs(
        tarefas,
        clientes,
        processos,
        empresaAtiva.id,
        DATA_REFERENCIA_ISO,
      ),
    [tarefas, clientes, processos, empresaAtiva.id],
  );

  const finKpisMes = useMemo(
    () => calcularKPIsFinanceiros(lancamentos, vendas, empresaAtiva.id, '2026-11'),
    [lancamentos, vendas, empresaAtiva.id],
  );

  function handleTrocarEmpresa(novoEmpresaId: string) {
    setEmpresaAtivaId(novoEmpresaId);
    const usuarioEmpresa = usuarios.find((u) => u.empresaId === novoEmpresaId);
    if (usuarioEmpresa) {
      setUsuarioAtivoId(usuarioEmpresa.id);
    }
    setModalTarefaAberto(false);
    setModalClienteAberto(false);
    setModalProcessoAberto(false);
    setModalFinanceiroAberto(false);
  }

  function handleEntrarDemo(empresaId: string) {
    handleTrocarEmpresa(empresaId);
    setAutenticado(true);
    setSecaoAtiva('dashboard');
  }

  function handleEntrarComCredenciais(email: string): boolean {
    const encontrado = usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!encontrado) return false;
    setEmpresaAtivaId(encontrado.empresaId);
    setUsuarioAtivoId(encontrado.id);
    setAutenticado(true);
    setSecaoAtiva('dashboard');
    return true;
  }

  function handleCadastrarEmpresaEUsuario(dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
    email: string;
  }) {
    const novaEmpresaId = `emp-${Date.now()}`;
    const novoUsuarioId = `usr-${Date.now()}`;

    const novaEmpresa: Empresa = {
      id: novaEmpresaId,
      nome: dados.nomeEmpresa,
      segmento: dados.segmento,
      cnpj: dados.cnpj || undefined,
      plano: 'essencial',
      criadoEm: DATA_REFERENCIA_ISO,
    };

    const novoUsuario: UsuarioPerfil = {
      id: novoUsuarioId,
      empresaId: novaEmpresaId,
      nomeCompleto: dados.nomeCompleto,
      email: dados.email,
      cargo: dados.cargo,
      papel: 'admin',
    };

    setEmpresas((prev) => [...prev, novaEmpresa]);
    setUsuarios((prev) => [...prev, novoUsuario]);
    setEmpresaAtivaId(novaEmpresaId);
    setUsuarioAtivoId(novoUsuarioId);
    setAutenticado(true);
    setSecaoAtiva('dashboard');

    return {empresa: novaEmpresa, usuario: novoUsuario};
  }

  // Ações de Financeiro & Vendas
  function handleCriarLancamento(novo: Omit<LancamentoFinanceiro, 'id' | 'empresaId'>) {
    const registro: LancamentoFinanceiro = {
      ...novo,
      id: `fin-${Date.now()}`,
      empresaId: empresaAtiva.id,
    };
    setLancamentos((prev) => [registro, ...prev]);
  }

  function handleAtualizarStatusLancamento(id: string, status: StatusFinanceiro) {
    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === id && l.empresaId === empresaAtiva.id ? {...l, status} : l,
      ),
    );
  }

  function handleExcluirLancamento(id: string) {
    setLancamentos((prev) =>
      prev.filter((l) => !(l.id === id && l.empresaId === empresaAtiva.id)),
    );
  }

  function handleCriarVenda(nova: Omit<Venda, 'id' | 'empresaId'>) {
    const registro: Venda = {
      ...nova,
      id: `vnd-${Date.now()}`,
      empresaId: empresaAtiva.id,
    };
    setVendas((prev) => [registro, ...prev]);
  }

  function handleAtualizarEtapaVenda(id: string, etapa: EtapaVenda) {
    setVendas((prev) =>
      prev.map((v) =>
        v.id === id && v.empresaId === empresaAtiva.id ? {...v, etapa} : v,
      ),
    );
  }

  function handleFaturarVenda(vendaId: string) {
    const vendaAlvo = vendas.find(
      (v) => v.id === vendaId && v.empresaId === empresaAtiva.id,
    );
    if (!vendaAlvo || vendaAlvo.faturada) return;

    const novoLancamento: LancamentoFinanceiro = {
      id: `fin-vnd-${Date.now()}`,
      empresaId: empresaAtiva.id,
      clienteId: vendaAlvo.clienteId,
      vendaId: vendaAlvo.id,
      tipo: 'receita',
      descricao: `Faturamento venda: ${vendaAlvo.titulo}`,
      categoria: 'Vendas Faturadas',
      valor: vendaAlvo.valor,
      data: DATA_REFERENCIA_ISO,
      status: 'pendente',
      formaPagamento: vendaAlvo.formaPagamento,
    };

    setLancamentos((prev) => [novoLancamento, ...prev]);
    setVendas((prev) =>
      prev.map((v) =>
        v.id === vendaId && v.empresaId === empresaAtiva.id
          ? {...v, etapa: 'fechada', faturada: true}
          : v,
      ),
    );
  }

  function handleExcluirVenda(id: string) {
    setVendas((prev) =>
      prev.filter((v) => !(v.id === id && v.empresaId === empresaAtiva.id)),
    );
  }

  // Ações de Tarefas
  function handleCriarTarefa(nova: Omit<Tarefa, 'id' | 'empresaId' | 'criadoEm'>) {
    const registro: Tarefa = {
      ...nova,
      id: `tar-${Date.now()}`,
      empresaId: empresaAtiva.id,
      criadoEm: DATA_REFERENCIA_ISO,
    };
    setTarefas((prev) => [registro, ...prev]);
  }

  function handleAtualizarStatusTarefa(tarefaId: string, novoStatus: StatusTarefa) {
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === tarefaId && t.empresaId === empresaAtiva.id
          ? {...t, status: novoStatus}
          : t,
      ),
    );
  }

  function handleExcluirTarefa(tarefaId: string) {
    setTarefas((prev) =>
      prev.filter((t) => !(t.id === tarefaId && t.empresaId === empresaAtiva.id)),
    );
  }

  // Ações de Clientes
  function handleCriarCliente(novo: Omit<Cliente, 'id' | 'empresaId' | 'criadoEm'>) {
    const registro: Cliente = {
      ...novo,
      id: `cli-${Date.now()}`,
      empresaId: empresaAtiva.id,
      criadoEm: DATA_REFERENCIA_ISO,
    };
    setClientes((prev) => [registro, ...prev]);
  }

  function handleAtualizarStatusCliente(clienteId: string, status: StatusCliente) {
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId && c.empresaId === empresaAtiva.id ? {...c, status} : c,
      ),
    );
  }

  // Ações de Processos
  function handleAlternarEtapaProcesso(processoId: string, etapaId: string) {
    setProcessos((prev) =>
      prev.map((proc) => {
        if (proc.id !== processoId || proc.empresaId !== empresaAtiva.id) return proc;
        return {
          ...proc,
          etapas: proc.etapas.map((e) =>
            e.id === etapaId ? {...e, concluida: !e.concluida} : e,
          ),
        };
      }),
    );
  }

  function handleAdicionarEtapaProcesso(processoId: string, tituloEtapa: string) {
    setProcessos((prev) =>
      prev.map((proc) => {
        if (proc.id !== processoId || proc.empresaId !== empresaAtiva.id) return proc;
        const novaEtapa = {
          id: `etp-${Date.now()}`,
          empresaId: empresaAtiva.id,
          processoId: proc.id,
          titulo: tituloEtapa,
          ordem: proc.etapas.length + 1,
          concluida: false,
        };
        return {
          ...proc,
          etapas: [...proc.etapas, novaEtapa],
        };
      }),
    );
  }

  function handleAlterarStatusProcesso(processoId: string, status: StatusProcesso) {
    setProcessos((prev) =>
      prev.map((proc) =>
        proc.id === processoId && proc.empresaId === empresaAtiva.id
          ? {...proc, status}
          : proc,
      ),
    );
  }

  function handleCriarProcesso(dados: {
    titulo: string;
    categoria: string;
    responsavel: string;
    descricao: string;
    clienteId?: string;
    etapasTitulos: string[];
  }) {
    const novoId = `proc-${Date.now()}`;
    const novoProcesso: Processo = {
      id: novoId,
      empresaId: empresaAtiva.id,
      clienteId: dados.clienteId,
      titulo: dados.titulo,
      categoria: dados.categoria,
      responsavel: dados.responsavel,
      status: 'ativo',
      descricao: dados.descricao,
      criadoEm: DATA_REFERENCIA_ISO,
      etapas: dados.etapasTitulos.map((tituloEtapa, idx) => ({
        id: `etp-${Date.now()}-${idx}`,
        empresaId: empresaAtiva.id,
        processoId: novoId,
        titulo: tituloEtapa,
        ordem: idx + 1,
        concluida: false,
      })),
    };
    setProcessos((prev) => [novoProcesso, ...prev]);
  }

  if (!autenticado) {
    return (
      <AuthView
        modoSupabase={modoSupabase}
        empresasDisponiveis={empresas}
        onEntrarDemo={handleEntrarDemo}
        onEntrarComCredenciais={handleEntrarComCredenciais}
        onCadastrarEmpresaEUsuario={handleCadastrarEmpresaEUsuario}
      />
    );
  }

  let labelAcaoPrincipal: string | undefined;
  let onAcaoPrincipal: (() => void) | undefined;

  if (secaoAtiva === 'dashboard' || secaoAtiva === 'financeiro') {
    labelAcaoPrincipal = 'Novo lançamento';
    onAcaoPrincipal = () => {
      setSecaoAtiva('financeiro');
      setModalFinanceiroAberto(true);
    };
  } else if (secaoAtiva === 'tarefas') {
    labelAcaoPrincipal = 'Nova tarefa';
    onAcaoPrincipal = () => setModalTarefaAberto(true);
  } else if (secaoAtiva === 'clientes') {
    labelAcaoPrincipal = 'Novo cliente';
    onAcaoPrincipal = () => setModalClienteAberto(true);
  } else if (secaoAtiva === 'processos') {
    labelAcaoPrincipal = 'Novo processo';
    onAcaoPrincipal = () => setModalProcessoAberto(true);
  }

  return (
    <div className="min-h-screen flex bg-[#F6F8F7] text-[#111915]">
      <Sidebar
        secaoAtiva={secaoAtiva}
        onSelecionarSecao={setSecaoAtiva}
        empresas={empresas}
        empresaAtiva={empresaAtiva}
        onTrocarEmpresa={handleTrocarEmpresa}
        usuario={usuarioAtivo}
        modoSupabase={modoSupabase}
        onSair={() => setAutenticado(false)}
        abertaMobile={menuMobileAberto}
        onFecharMobile={() => setMenuMobileAberto(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          secaoAtiva={secaoAtiva}
          empresaAtiva={empresaAtiva}
          onAbrirMenuMobile={() => setMenuMobileAberto(true)}
          labelAcaoPrincipal={labelAcaoPrincipal}
          onAcaoPrincipal={onAcaoPrincipal}
          onVoltarVisaoGeral={() => setSecaoAtiva('dashboard')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {secaoAtiva === 'dashboard' && (
            <DashboardView
              empresaAtiva={empresaAtiva}
              tarefas={tarefasDaEmpresa}
              clientes={clientesDaEmpresa}
              processos={processosDaEmpresa}
              lancamentos={lancamentosDaEmpresa}
              vendas={vendasDaEmpresa}
              dataReferenciaISO={DATA_REFERENCIA_ISO}
              onNavegar={setSecaoAtiva}
              onAbrirNovaTarefa={() => {
                setSecaoAtiva('tarefas');
                setModalTarefaAberto(true);
              }}
            />
          )}

          {secaoAtiva === 'financeiro' && (
            <FinancialSalesView
              empresaId={empresaAtiva.id}
              empresaNome={empresaAtiva.nome}
              lancamentos={lancamentosDaEmpresa}
              vendas={vendasDaEmpresa}
              clientes={clientesDaEmpresa}
              dataReferenciaISO={DATA_REFERENCIA_ISO}
              modalAberto={modalFinanceiroAberto}
              onAbrirModal={() => setModalFinanceiroAberto(true)}
              onFecharModal={() => setModalFinanceiroAberto(false)}
              onCriarLancamento={handleCriarLancamento}
              onAtualizarStatusLancamento={handleAtualizarStatusLancamento}
              onExcluirLancamento={handleExcluirLancamento}
              onCriarVenda={handleCriarVenda}
              onAtualizarEtapaVenda={handleAtualizarEtapaVenda}
              onFaturarVenda={handleFaturarVenda}
              onExcluirVenda={handleExcluirVenda}
            />
          )}

          {secaoAtiva === 'tarefas' && (
            <TasksView
              empresaId={empresaAtiva.id}
              tarefas={tarefasDaEmpresa}
              clientes={clientesDaEmpresa}
              processos={processosDaEmpresa}
              dataReferenciaISO={DATA_REFERENCIA_ISO}
              modalAberto={modalTarefaAberto}
              onAbrirModal={() => setModalTarefaAberto(true)}
              onFecharModal={() => setModalTarefaAberto(false)}
              onCriarTarefa={handleCriarTarefa}
              onAtualizarStatus={handleAtualizarStatusTarefa}
              onExcluirTarefa={handleExcluirTarefa}
            />
          )}

          {secaoAtiva === 'clientes' && (
            <ClientsView
              clientes={clientesDaEmpresa}
              tarefas={tarefasDaEmpresa}
              processos={processosDaEmpresa}
              modalAberto={modalClienteAberto}
              onAbrirModal={() => setModalClienteAberto(true)}
              onFecharModal={() => setModalClienteAberto(false)}
              onCriarCliente={handleCriarCliente}
              onAtualizarStatusCliente={handleAtualizarStatusCliente}
            />
          )}

          {secaoAtiva === 'processos' && (
            <ProcessesView
              processos={processosDaEmpresa}
              clientes={clientesDaEmpresa}
              modalAberto={modalProcessoAberto}
              onAbrirModal={() => setModalProcessoAberto(true)}
              onFecharModal={() => setModalProcessoAberto(false)}
              onAlternarEtapa={handleAlternarEtapaProcesso}
              onAdicionarEtapa={handleAdicionarEtapaProcesso}
              onAlterarStatusProcesso={handleAlterarStatusProcesso}
              onCriarProcesso={handleCriarProcesso}
            />
          )}

          {secaoAtiva === 'assistente' && (
            <AiAssistantView
              empresaAtiva={empresaAtiva}
              kpis={kpis}
              finKpis={finKpisMes}
            />
          )}

          {secaoAtiva === 'integracao' && <SupabaseReadinessView />}
        </main>
      </div>
    </div>
  );
}
