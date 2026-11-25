import {useCallback, useEffect, useMemo, useState} from 'react';
import {AlertCircle, Loader2, X} from 'lucide-react';
import {AiAssistantView} from './components/AiAssistantView';
import {AuthView, type UsuarioAuthPendente} from './components/AuthView';
import {ClientsView} from './components/ClientsView';
import {DashboardView} from './components/DashboardView';
import {FinancialSalesView} from './components/FinancialSalesView';
import {PrincipalView} from './components/PrincipalView';
import {ProcessesView} from './components/ProcessesView';
import {Sidebar} from './components/Sidebar';
import {SupabaseReadinessView} from './components/SupabaseReadinessView';
import {TasksView} from './components/TasksView';
import {TeamManagementView} from './components/TeamManagementView';
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
import {getSupabaseClient, isSupabaseConfigured} from './lib/supabase';
import {
  criarSupabaseRepository,
  type ResultadoCriacaoConvite,
} from './services/workspaceRepository';
import type {
  Cliente,
  ConviteEmpresa,
  Empresa,
  EmpresaPrincipalResumo,
  EtapaVenda,
  LancamentoFinanceiro,
  PapelConvite,
  PapelEmpresa,
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
import {podeVerConvites} from './utils/rolePermissions';
import {
  calcularDashboardKPIs,
  calcularKPIsFinanceiros,
  filtrarPorEmpresa,
} from './utils/workspaceLogic';

export default function App() {
  const modoSupabase = isSupabaseConfigured();
  const repo = useMemo(() => criarSupabaseRepository(), []);

  const dataReferenciaISO = useMemo(
    () => (modoSupabase ? new Date().toISOString().slice(0, 10) : '2026-11-25'),
    [modoSupabase],
  );
  const mesReferencia = dataReferenciaISO.slice(0, 7);

  const iniciarEmAuth =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('view') === 'auth';

  const [autenticado, setAutenticado] = useState<boolean>(
    modoSupabase ? false : !iniciarEmAuth,
  );
  const [carregandoSessao, setCarregandoSessao] = useState<boolean>(modoSupabase);
  const [usuarioAuthPendente, setUsuarioAuthPendente] =
    useState<UsuarioAuthPendente | null>(null);
  const [usuarioAuthEmail, setUsuarioAuthEmail] = useState<string | undefined>(undefined);
  const [isPrincipal, setIsPrincipal] = useState<boolean>(false);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);

  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>(
    modoSupabase ? [] : DEMO_EMPRESAS,
  );
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>(
    modoSupabase ? [] : DEMO_USUARIOS,
  );
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>(
    modoSupabase ? '' : DEMO_EMPRESAS[0].id,
  );
  const [usuarioAtivoId, setUsuarioAtivoId] = useState<string>(
    modoSupabase ? '' : DEMO_USUARIOS[0].id,
  );

  const [clientes, setClientes] = useState<Cliente[]>(
    modoSupabase ? [] : DEMO_CLIENTES,
  );
  const [processos, setProcessos] = useState<Processo[]>(
    modoSupabase ? [] : DEMO_PROCESSOS,
  );
  const [tarefas, setTarefas] = useState<Tarefa[]>(
    modoSupabase ? [] : DEMO_TAREFAS,
  );
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>(
    modoSupabase ? [] : DEMO_LANCAMENTOS,
  );
  const [vendas, setVendas] = useState<Venda[]>(
    modoSupabase ? [] : DEMO_VENDAS,
  );
  const [convites, setConvites] = useState<ConviteEmpresa[]>([]);

  const [empresasPrincipal, setEmpresasPrincipal] = useState<EmpresaPrincipalResumo[]>([]);
  const [carregandoPrincipal, setCarregandoPrincipal] = useState(false);
  const [erroPrincipal, setErroPrincipal] = useState<string | null>(null);

  const [modalTarefaAberto, setModalTarefaAberto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  const limparDadosSessao = useCallback(() => {
    setAutenticado(false);
    setUsuarioAuthPendente(null);
    setUsuarioAuthEmail(undefined);
    setIsPrincipal(false);
    setEmpresas([]);
    setUsuarios([]);
    setEmpresaAtivaId('');
    setUsuarioAtivoId('');
    setClientes([]);
    setProcessos([]);
    setTarefas([]);
    setLancamentos([]);
    setVendas([]);
    setConvites([]);
    setEmpresasPrincipal([]);
    setErroPrincipal(null);
  }, []);

  const carregarListaPrincipal = useCallback(async () => {
    if (!repo) return;
    setCarregandoPrincipal(true);
    setErroPrincipal(null);
    try {
      const lista = await repo.listarEmpresasPrincipal();
      setEmpresasPrincipal(lista);
    } catch (err) {
      setErroPrincipal(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar empresas da plataforma.',
      );
    } finally {
      setCarregandoPrincipal(false);
    }
  }, [repo]);

  const carregarDadosEmpresa = useCallback(
    async (empresaId: string, papel: PapelEmpresa, ehPrincipal: boolean) => {
      if (!repo) return;
      const [
        clientesDb,
        processosDb,
        tarefasDb,
        vendasDb,
        lancamentosDb,
        membrosDb,
        convitesDb,
      ] = await Promise.all([
        repo.listarClientes(empresaId),
        repo.listarProcessos(empresaId),
        repo.listarTarefas(empresaId),
        repo.listarVendas(empresaId),
        repo.listarLancamentos(empresaId),
        repo.listarMembrosEmpresa(empresaId),
        podeVerConvites(papel) ? repo.listarConvitesEmpresa(empresaId) : Promise.resolve([]),
      ]);

      setClientes(clientesDb);
      setProcessos(processosDb);
      setTarefas(tarefasDb);
      setVendas(vendasDb);
      setLancamentos(lancamentosDb);
      setUsuarios(membrosDb);
      setConvites(convitesDb);

      if (ehPrincipal) {
        void carregarListaPrincipal();
      } else {
        setEmpresasPrincipal([]);
      }
    },
    [repo, carregarListaPrincipal],
  );

  const sincronizarSessaoSupabase = useCallback(async () => {
    if (!modoSupabase || !repo) return;

    setCarregandoSessao(true);
    setErroOperacao(null);
    try {
      const ctx = await repo.obterContextoSessao();

      if (!ctx.autenticado || !ctx.usuarioAuth) {
        limparDadosSessao();
        return;
      }

      setUsuarioAuthEmail(ctx.usuarioAuth.email);
      setIsPrincipal(ctx.isPrincipal);

      if (ctx.perfil && ctx.empresa) {
        setEmpresas([ctx.empresa]);
        setEmpresaAtivaId(ctx.empresa.id);
        setUsuarioAtivoId(ctx.perfil.id);
        setUsuarios([ctx.perfil]);
        setUsuarioAuthPendente(null);
        setAutenticado(true);

        setSecaoAtiva((atual) =>
          atual === 'principal' && !ctx.isPrincipal ? 'dashboard' : atual,
        );

        await carregarDadosEmpresa(
          ctx.empresa.id,
          ctx.perfil.papel,
          ctx.isPrincipal,
        );
      } else if (ctx.isPrincipal) {
        // Principal da plataforma sem empresa vinculada: somente painel agregado
        setEmpresas([]);
        setEmpresaAtivaId('');
        setUsuarios([]);
        setUsuarioAtivoId('');
        setClientes([]);
        setProcessos([]);
        setTarefas([]);
        setLancamentos([]);
        setVendas([]);
        setConvites([]);
        setUsuarioAuthPendente(null);
        setAutenticado(true);
        setSecaoAtiva((atual) =>
          atual === 'integracao' ? 'integracao' : 'principal',
        );
        await carregarListaPrincipal();
      } else {
        // Usuário autenticado no Auth sem perfil: direcionar para onboarding
        setEmpresas([]);
        setEmpresaAtivaId('');
        setUsuarios([]);
        setUsuarioAtivoId('');
        setAutenticado(false);
        setUsuarioAuthPendente(ctx.usuarioAuth);
      }
    } catch (err) {
      setErroOperacao(
        err instanceof Error ? err.message : 'Erro ao sincronizar sessão com o Supabase.',
      );
      limparDadosSessao();
    } finally {
      setCarregandoSessao(false);
    }
  }, [modoSupabase, repo, limparDadosSessao, carregarDadosEmpresa, carregarListaPrincipal]);

  useEffect(() => {
    if (!modoSupabase) return;

    void sincronizarSessaoSupabase();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {data: authListener} = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        void sincronizarSessaoSupabase();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [modoSupabase, sincronizarSessaoSupabase]);

  const empresaAtiva = useMemo(
    () => empresas.find((e) => e.id === empresaAtivaId) ?? empresas[0] ?? null,
    [empresas, empresaAtivaId],
  );

  const usuarioAtivo = useMemo(() => {
    if (!empresaAtiva) return null;
    const daEmpresa = usuarios.find(
      (u) => u.id === usuarioAtivoId && u.empresaId === empresaAtiva.id,
    );
    if (daEmpresa) return daEmpresa;
    return usuarios.find((u) => u.empresaId === empresaAtiva.id) ?? usuarios[0] ?? null;
  }, [usuarios, usuarioAtivoId, empresaAtiva]);

  const membrosDaEmpresa = useMemo(() => {
    if (!empresaAtiva) return [];
    return filtrarPorEmpresa(usuarios, empresaAtiva.id);
  }, [usuarios, empresaAtiva]);

  // Dados estritamente isolados pela empresa ativa
  const tarefasDaEmpresa = useMemo(
    () => (empresaAtiva ? filtrarPorEmpresa(tarefas, empresaAtiva.id) : []),
    [tarefas, empresaAtiva],
  );
  const clientesDaEmpresa = useMemo(
    () => (empresaAtiva ? filtrarPorEmpresa(clientes, empresaAtiva.id) : []),
    [clientes, empresaAtiva],
  );
  const processosDaEmpresa = useMemo(
    () => (empresaAtiva ? filtrarPorEmpresa(processos, empresaAtiva.id) : []),
    [processos, empresaAtiva],
  );
  const lancamentosDaEmpresa = useMemo(
    () => (empresaAtiva ? filtrarPorEmpresa(lancamentos, empresaAtiva.id) : []),
    [lancamentos, empresaAtiva],
  );
  const vendasDaEmpresa = useMemo(
    () => (empresaAtiva ? filtrarPorEmpresa(vendas, empresaAtiva.id) : []),
    [vendas, empresaAtiva],
  );

  const kpis = useMemo(
    () =>
      empresaAtiva
        ? calcularDashboardKPIs(
            tarefas,
            clientes,
            processos,
            empresaAtiva.id,
            dataReferenciaISO,
          )
        : {
            tarefasAbertas: 0,
            tarefasConcluidas: 0,
            tarefasAtrasadas: 0,
            clientesAtivos: 0,
            processosAtivos: 0,
            taxaConclusao: 0,
          },
    [tarefas, clientes, processos, empresaAtiva, dataReferenciaISO],
  );

  const finKpisMes = useMemo(
    () =>
      empresaAtiva
        ? calcularKPIsFinanceiros(lancamentos, vendas, empresaAtiva.id, mesReferencia)
        : {
            faturamentoBruto: 0,
            receitaRecebida: 0,
            aReceber: 0,
            despesasTotais: 0,
            despesasPagas: 0,
            rendaLiquida: 0,
            margemLiquidaPct: 0,
            vendasFechadasQtd: 0,
            vendasFechadasValor: 0,
            ticketMedio: 0,
            pipelineAbertoValor: 0,
          },
    [lancamentos, vendas, empresaAtiva, mesReferencia],
  );

  // Handlers de Autenticação (Demo + Supabase)
  function handleTrocarEmpresa(novoEmpresaId: string) {
    if (modoSupabase) return;
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

  function handleCadastrarEmpresaEUsuarioDemo(dados: {
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
      criadoEm: dataReferenciaISO,
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

  async function handleSupabaseLogin(email: string, senha: string) {
    if (!repo) return;
    await repo.entrarComEmailSenha(email, senha);
    await sincronizarSessaoSupabase();
  }

  async function handleSupabaseCadastrarConta(dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
    email: string;
    senha: string;
  }): Promise<{precisaConfirmarEmail: boolean}> {
    if (!repo) return {precisaConfirmarEmail: false};
    const res = await repo.cadastrarContaAuth(
      dados.email,
      dados.senha,
      dados.nomeCompleto,
    );
    if (!res.precisaConfirmarEmail) {
      await repo.provisionarEmpresaInicial({
        nomeEmpresa: dados.nomeEmpresa,
        segmento: dados.segmento,
        cnpj: dados.cnpj,
        nomeCompleto: dados.nomeCompleto,
        cargo: dados.cargo,
      });
      await sincronizarSessaoSupabase();
    }
    return {precisaConfirmarEmail: res.precisaConfirmarEmail};
  }

  async function handleSupabaseProvisionarEmpresa(dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj: string;
    nomeCompleto: string;
    cargo: string;
  }) {
    if (!repo) return;
    await repo.provisionarEmpresaInicial(dados);
    await sincronizarSessaoSupabase();
  }

  async function handleSupabaseAceitarConvite(dados: {
    email: string;
    senha: string;
    nomeCompleto: string;
    tokenConvite: string;
    jaAutenticado?: boolean;
  }): Promise<{precisaConfirmarEmail: boolean}> {
    if (!repo) return {precisaConfirmarEmail: false};

    if (!dados.jaAutenticado) {
      const cad = await repo.cadastrarContaAuth(
        dados.email,
        dados.senha,
        dados.nomeCompleto,
      );
      if (cad.precisaConfirmarEmail) {
        return {precisaConfirmarEmail: true};
      }
    }

    const res = await repo.aceitarConviteEmpresa(
      dados.tokenConvite,
      dados.nomeCompleto,
    );
    if (!res.aceito) {
      throw new Error(res.mensagem || 'Convite inválido ou expirado.');
    }
    await sincronizarSessaoSupabase();
    return {precisaConfirmarEmail: false};
  }

  async function handleSupabaseRecuperarSenha(email: string) {
    if (!repo) return;
    await repo.enviarRecuperacaoSenha(email);
  }

  async function handleSair() {
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.sairSessao();
      } finally {
        limparDadosSessao();
      }
    } else {
      setAutenticado(false);
    }
  }

  function registrarErro(err: unknown, fallback: string) {
    setErroOperacao(err instanceof Error ? err.message : fallback);
  }

  // Ações de Financeiro & Vendas
  async function handleCriarLancamento(
    novo: Omit<LancamentoFinanceiro, 'id' | 'empresaId'>,
  ) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        const salvo = await repo.criarLancamento(empresaAtiva.id, novo);
        setLancamentos((prev) => [salvo, ...prev]);
      } catch (err) {
        registrarErro(err, 'Erro ao criar lançamento.');
      }
      return;
    }
    const registro: LancamentoFinanceiro = {
      ...novo,
      id: `fin-${Date.now()}`,
      empresaId: empresaAtiva.id,
    };
    setLancamentos((prev) => [registro, ...prev]);
  }

  async function handleAtualizarStatusLancamento(id: string, status: StatusFinanceiro) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.atualizarStatusLancamento(id, empresaAtiva.id, status);
      } catch (err) {
        registrarErro(err, 'Erro ao atualizar status financeiro.');
        return;
      }
    }
    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === id && l.empresaId === empresaAtiva.id ? {...l, status} : l,
      ),
    );
  }

  async function handleExcluirLancamento(id: string) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.excluirLancamento(id, empresaAtiva.id);
      } catch (err) {
        registrarErro(err, 'Erro ao excluir lançamento.');
        return;
      }
    }
    setLancamentos((prev) =>
      prev.filter((l) => !(l.id === id && l.empresaId === empresaAtiva.id)),
    );
  }

  async function handleCriarVenda(nova: Omit<Venda, 'id' | 'empresaId'>) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        const salva = await repo.criarVenda(empresaAtiva.id, nova);
        setVendas((prev) => [salva, ...prev]);
      } catch (err) {
        registrarErro(err, 'Erro ao cadastrar venda.');
      }
      return;
    }
    const registro: Venda = {
      ...nova,
      id: `vnd-${Date.now()}`,
      empresaId: empresaAtiva.id,
    };
    setVendas((prev) => [registro, ...prev]);
  }

  async function handleAtualizarEtapaVenda(id: string, etapa: EtapaVenda) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.atualizarEtapaVenda(id, empresaAtiva.id, etapa);
      } catch (err) {
        registrarErro(err, 'Erro ao atualizar etapa da venda.');
        return;
      }
    }
    setVendas((prev) =>
      prev.map((v) =>
        v.id === id && v.empresaId === empresaAtiva.id ? {...v, etapa} : v,
      ),
    );
  }

  async function handleFaturarVenda(vendaId: string) {
    if (!empresaAtiva) return;
    const vendaAlvo = vendas.find(
      (v) => v.id === vendaId && v.empresaId === empresaAtiva.id,
    );
    if (!vendaAlvo || vendaAlvo.faturada) return;
    setErroOperacao(null);

    if (modoSupabase && repo) {
      try {
        const {lancamento} = await repo.faturarVenda(
          vendaAlvo,
          empresaAtiva.id,
          dataReferenciaISO,
        );
        setLancamentos((prev) => [lancamento, ...prev]);
        setVendas((prev) =>
          prev.map((v) =>
            v.id === vendaId && v.empresaId === empresaAtiva.id
              ? {...v, etapa: 'fechada', faturada: true}
              : v,
          ),
        );
      } catch (err) {
        registrarErro(err, 'Erro ao faturar venda.');
      }
      return;
    }

    const novoLancamento: LancamentoFinanceiro = {
      id: `fin-vnd-${Date.now()}`,
      empresaId: empresaAtiva.id,
      clienteId: vendaAlvo.clienteId,
      vendaId: vendaAlvo.id,
      tipo: 'receita',
      descricao: `Faturamento venda: ${vendaAlvo.titulo}`,
      categoria: 'Vendas Faturadas',
      valor: vendaAlvo.valor,
      data: dataReferenciaISO,
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

  async function handleExcluirVenda(id: string) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.excluirVenda(id, empresaAtiva.id);
      } catch (err) {
        registrarErro(err, 'Erro ao excluir venda.');
        return;
      }
    }
    setVendas((prev) =>
      prev.filter((v) => !(v.id === id && v.empresaId === empresaAtiva.id)),
    );
  }

  // Ações de Tarefas
  async function handleCriarTarefa(
    nova: Omit<Tarefa, 'id' | 'empresaId' | 'criadoEm'>,
  ) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        const salva = await repo.criarTarefa(empresaAtiva.id, nova);
        setTarefas((prev) => [salva, ...prev]);
      } catch (err) {
        registrarErro(err, 'Erro ao criar tarefa.');
      }
      return;
    }
    const registro: Tarefa = {
      ...nova,
      id: `tar-${Date.now()}`,
      empresaId: empresaAtiva.id,
      criadoEm: dataReferenciaISO,
    };
    setTarefas((prev) => [registro, ...prev]);
  }

  async function handleAtualizarStatusTarefa(tarefaId: string, novoStatus: StatusTarefa) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.atualizarStatusTarefa(tarefaId, empresaAtiva.id, novoStatus);
      } catch (err) {
        registrarErro(err, 'Erro ao atualizar tarefa.');
        return;
      }
    }
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === tarefaId && t.empresaId === empresaAtiva.id
          ? {...t, status: novoStatus}
          : t,
      ),
    );
  }

  async function handleExcluirTarefa(tarefaId: string) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.excluirTarefa(tarefaId, empresaAtiva.id);
      } catch (err) {
        registrarErro(err, 'Erro ao excluir tarefa.');
        return;
      }
    }
    setTarefas((prev) =>
      prev.filter((t) => !(t.id === tarefaId && t.empresaId === empresaAtiva.id)),
    );
  }

  // Ações de Clientes
  async function handleCriarCliente(
    novo: Omit<Cliente, 'id' | 'empresaId' | 'criadoEm'>,
  ) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        const salvo = await repo.criarCliente(empresaAtiva.id, novo);
        setClientes((prev) => [salvo, ...prev]);
      } catch (err) {
        registrarErro(err, 'Erro ao cadastrar cliente.');
      }
      return;
    }
    const registro: Cliente = {
      ...novo,
      id: `cli-${Date.now()}`,
      empresaId: empresaAtiva.id,
      criadoEm: dataReferenciaISO,
    };
    setClientes((prev) => [registro, ...prev]);
  }

  async function handleAtualizarStatusCliente(
    clienteId: string,
    status: StatusCliente,
  ) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.atualizarStatusCliente(clienteId, empresaAtiva.id, status);
      } catch (err) {
        registrarErro(err, 'Erro ao atualizar status do cliente.');
        return;
      }
    }
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId && c.empresaId === empresaAtiva.id ? {...c, status} : c,
      ),
    );
  }

  // Ações de Processos
  async function handleAlternarEtapaProcesso(processoId: string, etapaId: string) {
    if (!empresaAtiva) return;
    const procAlvo = processos.find(
      (p) => p.id === processoId && p.empresaId === empresaAtiva.id,
    );
    const etapaAlvo = procAlvo?.etapas.find((e) => e.id === etapaId);
    if (!etapaAlvo) return;

    const proximoEstado = !etapaAlvo.concluida;
    setErroOperacao(null);

    if (modoSupabase && repo) {
      try {
        await repo.alternarEtapaProcesso(etapaId, empresaAtiva.id, proximoEstado);
      } catch (err) {
        registrarErro(err, 'Erro ao atualizar etapa do processo.');
        return;
      }
    }

    setProcessos((prev) =>
      prev.map((proc) => {
        if (proc.id !== processoId || proc.empresaId !== empresaAtiva.id) return proc;
        return {
          ...proc,
          etapas: proc.etapas.map((e) =>
            e.id === etapaId ? {...e, concluida: proximoEstado} : e,
          ),
        };
      }),
    );
  }

  async function handleAdicionarEtapaProcesso(processoId: string, tituloEtapa: string) {
    if (!empresaAtiva) return;
    const procAlvo = processos.find(
      (p) => p.id === processoId && p.empresaId === empresaAtiva.id,
    );
    if (!procAlvo) return;
    setErroOperacao(null);

    if (modoSupabase && repo) {
      try {
        const novaEtapa = await repo.adicionarEtapaProcesso(
          processoId,
          empresaAtiva.id,
          tituloEtapa,
          procAlvo.etapas.length + 1,
        );
        setProcessos((prev) =>
          prev.map((proc) =>
            proc.id === processoId && proc.empresaId === empresaAtiva.id
              ? {...proc, etapas: [...proc.etapas, novaEtapa]}
              : proc,
          ),
        );
      } catch (err) {
        registrarErro(err, 'Erro ao adicionar etapa.');
      }
      return;
    }

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

  async function handleAlterarStatusProcesso(
    processoId: string,
    status: StatusProcesso,
  ) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        await repo.alterarStatusProcesso(processoId, empresaAtiva.id, status);
      } catch (err) {
        registrarErro(err, 'Erro ao alterar status do processo.');
        return;
      }
    }
    setProcessos((prev) =>
      prev.map((proc) =>
        proc.id === processoId && proc.empresaId === empresaAtiva.id
          ? {...proc, status}
          : proc,
      ),
    );
  }

  async function handleCriarProcesso(dados: {
    titulo: string;
    categoria: string;
    responsavel: string;
    descricao: string;
    clienteId?: string;
    etapasTitulos: string[];
  }) {
    if (!empresaAtiva) return;
    setErroOperacao(null);
    if (modoSupabase && repo) {
      try {
        const novoProc = await repo.criarProcesso(empresaAtiva.id, dados);
        setProcessos((prev) => [novoProc, ...prev]);
      } catch (err) {
        registrarErro(err, 'Erro ao criar processo.');
      }
      return;
    }

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
      criadoEm: dataReferenciaISO,
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

  // Ações de Empresa, Equipe e Convites
  async function handleAtualizarEmpresa(dados: {
    nome: string;
    segmento: string;
    cnpj?: string;
  }) {
    if (!empresaAtiva) return;
    if (modoSupabase && repo) {
      const atualizada = await repo.atualizarDadosEmpresa(empresaAtiva.id, dados);
      setEmpresas([atualizada]);
      return;
    }
    setEmpresas((prev) =>
      prev.map((e) =>
        e.id === empresaAtiva.id
          ? {...e, nome: dados.nome, segmento: dados.segmento, cnpj: dados.cnpj}
          : e,
      ),
    );
  }

  async function handleAtualizarPerfil(
    perfilId: string,
    dados: {nomeCompleto: string; cargo: string},
  ) {
    if (!empresaAtiva) return;
    if (modoSupabase && repo) {
      const atualizado = await repo.atualizarPerfilMembro(
        perfilId,
        empresaAtiva.id,
        dados,
      );
      setUsuarios((prev) => prev.map((u) => (u.id === perfilId ? atualizado : u)));
      return;
    }
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === perfilId && u.empresaId === empresaAtiva.id
          ? {...u, nomeCompleto: dados.nomeCompleto, cargo: dados.cargo}
          : u,
      ),
    );
  }

  async function handleAlterarPapel(alvoUsuarioId: string, novoPapel: PapelEmpresa) {
    if (!empresaAtiva) return;
    if (modoSupabase && repo) {
      const papelAplicado = await repo.alterarPapelMembro(alvoUsuarioId, novoPapel);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === alvoUsuarioId ? {...u, papel: papelAplicado} : u)),
      );
      return;
    }
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === alvoUsuarioId && u.empresaId === empresaAtiva.id
          ? {...u, papel: novoPapel}
          : u,
      ),
    );
  }

  async function handleExcluirMembro(perfilId: string) {
    if (!empresaAtiva) return;
    if (modoSupabase && repo) {
      await repo.excluirMembroEmpresa(perfilId, empresaAtiva.id);
      setUsuarios((prev) => prev.filter((u) => u.id !== perfilId));
      return;
    }
    setUsuarios((prev) =>
      prev.filter((u) => !(u.id === perfilId && u.empresaId === empresaAtiva.id)),
    );
  }

  async function handleCriarConvite(dados: {
    emailConvidado: string;
    cargo: string;
    papel: PapelConvite;
    diasValidade: number;
  }): Promise<ResultadoCriacaoConvite | null> {
    if (!empresaAtiva || !modoSupabase || !repo) return null;
    const res = await repo.criarConviteEmpresa(dados);
    const listaAtualizada = await repo.listarConvitesEmpresa(empresaAtiva.id);
    setConvites(listaAtualizada);
    return res;
  }

  async function handleRevogarConvite(conviteId: string) {
    if (!empresaAtiva || !modoSupabase || !repo) return;
    await repo.revogarConviteEmpresa(conviteId, empresaAtiva.id);
    setConvites((prev) =>
      prev.map((c) => (c.id === conviteId ? {...c, status: 'revogado'} : c)),
    );
  }

  async function handleExcluirConvite(conviteId: string) {
    if (!empresaAtiva || !modoSupabase || !repo) return;
    await repo.excluirConviteEmpresa(conviteId, empresaAtiva.id);
    setConvites((prev) => prev.filter((c) => c.id !== conviteId));
  }

  if (carregandoSessao) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex flex-col items-center justify-center p-6 text-slate-600">
        <Loader2 className="w-7 h-7 animate-spin text-[#15803D]" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-[#111915]">
          Sincronizando sessão com o Supabase...
        </p>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <AuthView
        modoSupabase={modoSupabase}
        empresasDisponiveis={empresas}
        usuarioAuthPendente={usuarioAuthPendente}
        onEntrarDemo={handleEntrarDemo}
        onEntrarComCredenciais={handleEntrarComCredenciais}
        onCadastrarEmpresaEUsuario={handleCadastrarEmpresaEUsuarioDemo}
        onSupabaseLogin={handleSupabaseLogin}
        onSupabaseCadastrarConta={handleSupabaseCadastrarConta}
        onSupabaseAceitarConviteCadastro={handleSupabaseAceitarConvite}
        onSupabaseProvisionarEmpresa={handleSupabaseProvisionarEmpresa}
        onSupabaseRecuperarSenha={handleSupabaseRecuperarSenha}
        onSupabaseRecarregarSessao={sincronizarSessaoSupabase}
        onSupabaseSair={handleSair}
      />
    );
  }

  let labelAcaoPrincipal: string | undefined;
  let onAcaoPrincipal: (() => void) | undefined;

  if (empresaAtiva) {
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
        usuarioAuthEmail={usuarioAuthEmail}
        isPrincipal={isPrincipal}
        modoSupabase={modoSupabase}
        onSair={() => void handleSair()}
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
          onVoltarVisaoGeral={() =>
            setSecaoAtiva(empresaAtiva ? 'dashboard' : 'principal')
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {erroOperacao && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-800"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{erroOperacao}</span>
              </div>
              <button
                type="button"
                onClick={() => setErroOperacao(null)}
                aria-label="Fechar aviso de erro"
                className="p-1 text-red-600 hover:text-red-900 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {secaoAtiva === 'dashboard' && empresaAtiva && (
            <DashboardView
              empresaAtiva={empresaAtiva}
              tarefas={tarefasDaEmpresa}
              clientes={clientesDaEmpresa}
              processos={processosDaEmpresa}
              lancamentos={lancamentosDaEmpresa}
              vendas={vendasDaEmpresa}
              dataReferenciaISO={dataReferenciaISO}
              onNavegar={setSecaoAtiva}
              onAbrirNovaTarefa={() => {
                setSecaoAtiva('tarefas');
                setModalTarefaAberto(true);
              }}
            />
          )}

          {secaoAtiva === 'financeiro' && empresaAtiva && (
            <FinancialSalesView
              empresaId={empresaAtiva.id}
              empresaNome={empresaAtiva.nome}
              lancamentos={lancamentosDaEmpresa}
              vendas={vendasDaEmpresa}
              clientes={clientesDaEmpresa}
              dataReferenciaISO={dataReferenciaISO}
              modalAberto={modalFinanceiroAberto}
              onAbrirModal={() => setModalFinanceiroAberto(true)}
              onFecharModal={() => setModalFinanceiroAberto(false)}
              onCriarLancamento={(novo) => void handleCriarLancamento(novo)}
              onAtualizarStatusLancamento={(id, st) =>
                void handleAtualizarStatusLancamento(id, st)
              }
              onExcluirLancamento={(id) => void handleExcluirLancamento(id)}
              onCriarVenda={(nova) => void handleCriarVenda(nova)}
              onAtualizarEtapaVenda={(id, et) => void handleAtualizarEtapaVenda(id, et)}
              onFaturarVenda={(id) => void handleFaturarVenda(id)}
              onExcluirVenda={(id) => void handleExcluirVenda(id)}
            />
          )}

          {secaoAtiva === 'tarefas' && empresaAtiva && (
            <TasksView
              empresaId={empresaAtiva.id}
              tarefas={tarefasDaEmpresa}
              clientes={clientesDaEmpresa}
              processos={processosDaEmpresa}
              dataReferenciaISO={dataReferenciaISO}
              modalAberto={modalTarefaAberto}
              onAbrirModal={() => setModalTarefaAberto(true)}
              onFecharModal={() => setModalTarefaAberto(false)}
              onCriarTarefa={(nova) => void handleCriarTarefa(nova)}
              onAtualizarStatus={(id, st) => void handleAtualizarStatusTarefa(id, st)}
              onExcluirTarefa={(id) => void handleExcluirTarefa(id)}
            />
          )}

          {secaoAtiva === 'clientes' && empresaAtiva && (
            <ClientsView
              clientes={clientesDaEmpresa}
              tarefas={tarefasDaEmpresa}
              processos={processosDaEmpresa}
              modalAberto={modalClienteAberto}
              onAbrirModal={() => setModalClienteAberto(true)}
              onFecharModal={() => setModalClienteAberto(false)}
              onCriarCliente={(novo) => void handleCriarCliente(novo)}
              onAtualizarStatusCliente={(id, st) =>
                void handleAtualizarStatusCliente(id, st)
              }
            />
          )}

          {secaoAtiva === 'processos' && empresaAtiva && (
            <ProcessesView
              processos={processosDaEmpresa}
              clientes={clientesDaEmpresa}
              modalAberto={modalProcessoAberto}
              onAbrirModal={() => setModalProcessoAberto(true)}
              onFecharModal={() => setModalProcessoAberto(false)}
              onAlternarEtapa={(pId, eId) => void handleAlternarEtapaProcesso(pId, eId)}
              onAdicionarEtapa={(pId, tit) => void handleAdicionarEtapaProcesso(pId, tit)}
              onAlterarStatusProcesso={(pId, st) =>
                void handleAlterarStatusProcesso(pId, st)
              }
              onCriarProcesso={(dados) => void handleCriarProcesso(dados)}
            />
          )}

          {secaoAtiva === 'equipe' && empresaAtiva && usuarioAtivo && (
            <TeamManagementView
              modoSupabase={modoSupabase}
              empresaAtiva={empresaAtiva}
              usuarioAtivo={usuarioAtivo}
              membros={membrosDaEmpresa}
              convites={convites}
              onAtualizarEmpresa={handleAtualizarEmpresa}
              onAtualizarPerfil={handleAtualizarPerfil}
              onAlterarPapel={handleAlterarPapel}
              onExcluirMembro={handleExcluirMembro}
              onCriarConvite={handleCriarConvite}
              onRevogarConvite={handleRevogarConvite}
              onExcluirConvite={handleExcluirConvite}
            />
          )}

          {secaoAtiva === 'principal' && isPrincipal && (
            <PrincipalView
              empresas={empresasPrincipal}
              carregando={carregandoPrincipal}
              erro={erroPrincipal}
              onAtualizar={carregarListaPrincipal}
            />
          )}

          {secaoAtiva === 'assistente' && empresaAtiva && (
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
