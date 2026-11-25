import {
  getSupabaseClient,
  obterDiagnosticoSupabase,
  testarConexaoSupabase,
  type ResultadoTesteConexaoSupabase,
} from '../lib/supabase';
import type {
  Cliente,
  ConviteEmpresa,
  Empresa,
  EmpresaPrincipalResumo,
  EtapaProcesso,
  EtapaVenda,
  LancamentoFinanceiro,
  PapelConvite,
  PapelEmpresa,
  Processo,
  StatusCliente,
  StatusFinanceiro,
  StatusProcesso,
  StatusTarefa,
  Tarefa,
  UsuarioPerfil,
  Venda,
} from '../types/database';
import {traduzirErroSupabase} from '../utils/rolePermissions';
import type {DiagnosticoConfiguracaoSupabase} from '../utils/supabaseConfig';

export type ModoPersistencia = 'demo' | 'supabase';

export interface EstadoIntegracaoSupabase {
  configurado: boolean;
  modoAtual: ModoPersistencia;
  urlDefinida: boolean;
  urlValida: boolean;
  chaveAnonDefinida: boolean;
  diagnostico: DiagnosticoConfiguracaoSupabase;
}

export function obterEstadoIntegracaoSupabase(): EstadoIntegracaoSupabase {
  const diagnostico = obterDiagnosticoSupabase();

  return {
    configurado: diagnostico.configurado,
    modoAtual: diagnostico.configurado ? 'supabase' : 'demo',
    urlDefinida: diagnostico.urlDefinida,
    urlValida: diagnostico.urlValida,
    chaveAnonDefinida: diagnostico.chaveAnonDefinida,
    diagnostico,
  };
}

export {testarConexaoSupabase, type ResultadoTesteConexaoSupabase};

export interface ContextoSessaoSupabase {
  autenticado: boolean;
  usuarioAuth: {
    id: string;
    email: string;
    emailConfirmado: boolean;
  } | null;
  isPrincipal: boolean;
  perfil: UsuarioPerfil | null;
  empresa: Empresa | null;
}

export interface ResultadoCriacaoConvite {
  conviteCriado: boolean;
  statusResultado: string;
  mensagem: string;
  conviteId: string | null;
  empresaId: string;
  emailConvidado: string;
  tokenConvite: string | null;
  expiraEm: string | null;
}

export interface ResultadoAceiteConvite {
  aceito: boolean;
  statusConvite: string;
  mensagem: string;
  empresaId: string | null;
  perfilId: string | null;
  papel: PapelEmpresa | null;
}

export interface WorkspaceRepository {
  modo: ModoPersistencia;

  // Sessão e contexto
  obterContextoSessao(): Promise<ContextoSessaoSupabase>;
  entrarComEmailSenha(email: string, senha: string): Promise<void>;
  cadastrarContaAuth(
    email: string,
    senha: string,
    nomeCompleto: string,
  ): Promise<{precisaConfirmarEmail: boolean; userId: string | null}>;
  enviarRecuperacaoSenha(email: string): Promise<void>;
  atualizarSenhaUsuario(novaSenha: string): Promise<void>;
  sairSessao(): Promise<void>;

  // Provisionamento, convites e principal
  provisionarEmpresaInicial(dados: {
    nomeEmpresa: string;
    segmento: string;
    cnpj?: string;
    nomeCompleto?: string;
    cargo?: string;
  }): Promise<{empresaId: string; perfilId: string; papel: PapelEmpresa}>;
  aceitarConviteEmpresa(token: string, nomeCompleto?: string): Promise<ResultadoAceiteConvite>;
  criarConviteEmpresa(dados: {
    emailConvidado: string;
    cargo?: string;
    diasValidade?: number;
    papel?: PapelConvite;
  }): Promise<ResultadoCriacaoConvite>;
  listarConvitesEmpresa(empresaId: string): Promise<ConviteEmpresa[]>;
  revogarConviteEmpresa(conviteId: string, empresaId: string): Promise<void>;
  excluirConviteEmpresa(conviteId: string, empresaId: string): Promise<void>;

  // Empresa e membros
  atualizarDadosEmpresa(
    empresaId: string,
    dados: {nome: string; segmento: string; cnpj?: string | null},
  ): Promise<Empresa>;
  listarMembrosEmpresa(empresaId: string): Promise<UsuarioPerfil[]>;
  atualizarPerfilMembro(
    perfilId: string,
    empresaId: string,
    dados: {nomeCompleto: string; cargo: string},
  ): Promise<UsuarioPerfil>;
  alterarPapelMembro(alvoUsuarioId: string, novoPapel: PapelEmpresa): Promise<PapelEmpresa>;
  excluirMembroEmpresa(perfilId: string, empresaId: string): Promise<void>;

  // Principal (somente leitura)
  listarEmpresasPrincipal(): Promise<EmpresaPrincipalResumo[]>;

  // Clientes
  listarClientes(empresaId: string): Promise<Cliente[]>;
  criarCliente(
    empresaId: string,
    novo: Omit<Cliente, 'id' | 'empresaId' | 'criadoEm'>,
  ): Promise<Cliente>;
  atualizarStatusCliente(
    clienteId: string,
    empresaId: string,
    status: StatusCliente,
  ): Promise<void>;

  // Processos e Etapas
  listarProcessos(empresaId: string): Promise<Processo[]>;
  criarProcesso(
    empresaId: string,
    dados: {
      titulo: string;
      categoria: string;
      responsavel: string;
      descricao: string;
      clienteId?: string;
      etapasTitulos: string[];
    },
  ): Promise<Processo>;
  alterarStatusProcesso(
    processoId: string,
    empresaId: string,
    status: StatusProcesso,
  ): Promise<void>;
  alternarEtapaProcesso(
    etapaId: string,
    empresaId: string,
    concluida: boolean,
  ): Promise<void>;
  adicionarEtapaProcesso(
    processoId: string,
    empresaId: string,
    titulo: string,
    ordem: number,
  ): Promise<EtapaProcesso>;

  // Tarefas
  listarTarefas(empresaId: string): Promise<Tarefa[]>;
  criarTarefa(
    empresaId: string,
    nova: Omit<Tarefa, 'id' | 'empresaId' | 'criadoEm'>,
  ): Promise<Tarefa>;
  atualizarStatusTarefa(
    tarefaId: string,
    empresaId: string,
    novoStatus: StatusTarefa,
  ): Promise<void>;
  excluirTarefa(tarefaId: string, empresaId: string): Promise<void>;

  // Vendas
  listarVendas(empresaId: string): Promise<Venda[]>;
  criarVenda(empresaId: string, nova: Omit<Venda, 'id' | 'empresaId'>): Promise<Venda>;
  atualizarEtapaVenda(vendaId: string, empresaId: string, etapa: EtapaVenda): Promise<void>;
  faturarVenda(
    venda: Venda,
    empresaId: string,
    dataFaturamentoISO: string,
  ): Promise<{lancamento: LancamentoFinanceiro}>;
  excluirVenda(vendaId: string, empresaId: string): Promise<void>;

  // Lançamentos financeiros
  listarLancamentos(empresaId: string): Promise<LancamentoFinanceiro[]>;
  criarLancamento(
    empresaId: string,
    novo: Omit<LancamentoFinanceiro, 'id' | 'empresaId'>,
  ): Promise<LancamentoFinanceiro>;
  atualizarStatusLancamento(
    lancamentoId: string,
    empresaId: string,
    status: StatusFinanceiro,
  ): Promise<void>;
  excluirLancamento(lancamentoId: string, empresaId: string): Promise<void>;
}

function mapEmpresaRow(row: {
  id: string;
  nome: string;
  segmento: string;
  cnpj: string | null;
  plano: Empresa['plano'];
  criado_em: string;
}): Empresa {
  return {
    id: row.id,
    nome: row.nome,
    segmento: row.segmento,
    cnpj: row.cnpj ?? undefined,
    plano: row.plano,
    criadoEm: row.criado_em.slice(0, 10),
  };
}

function mapPerfilRow(row: {
  id: string;
  empresa_id: string;
  nome_completo: string;
  email: string;
  cargo: string;
  papel: PapelEmpresa;
  criado_em: string;
}): UsuarioPerfil {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    nomeCompleto: row.nome_completo,
    email: row.email,
    cargo: row.cargo,
    papel: row.papel,
    criadoEm: row.criado_em.slice(0, 10),
  };
}

function mapClienteRow(row: {
  id: string;
  empresa_id: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  segmento: string;
  responsavel: string;
  status: StatusCliente;
  observacoes: string;
  criado_em: string;
}): Cliente {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    nome: row.nome,
    documento: row.documento,
    email: row.email,
    telefone: row.telefone,
    segmento: row.segmento,
    responsavel: row.responsavel,
    status: row.status,
    observacoes: row.observacoes ?? '',
    criadoEm: row.criado_em.slice(0, 10),
  };
}

function mapTarefaRow(row: {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  processo_id: string | null;
  titulo: string;
  descricao: string;
  prioridade: Tarefa['prioridade'];
  status: StatusTarefa;
  prazo: string;
  responsavel: string;
  criado_em: string;
}): Tarefa {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    clienteId: row.cliente_id ?? undefined,
    processoId: row.processo_id ?? undefined,
    titulo: row.titulo,
    descricao: row.descricao ?? '',
    prioridade: row.prioridade,
    status: row.status,
    prazo: row.prazo,
    responsavel: row.responsavel,
    criadoEm: row.criado_em.slice(0, 10),
  };
}

function mapVendaRow(row: {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  titulo: string;
  responsavel: string;
  valor: number;
  etapa: EtapaVenda;
  data_prevista: string;
  forma_pagamento: Venda['formaPagamento'];
  faturada: boolean;
  observacoes: string;
  criado_em: string;
}): Venda {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    clienteId: row.cliente_id ?? undefined,
    titulo: row.titulo,
    responsavel: row.responsavel,
    valor: Number(row.valor),
    etapa: row.etapa,
    dataPrevista: row.data_prevista,
    formaPagamento: row.forma_pagamento,
    faturada: row.faturada,
    observacoes: row.observacoes || undefined,
    criadoEm: row.criado_em.slice(0, 10),
  };
}

function mapLancamentoRow(row: {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  venda_id: string | null;
  tipo: LancamentoFinanceiro['tipo'];
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  status: StatusFinanceiro;
  forma_pagamento: LancamentoFinanceiro['formaPagamento'];
  criado_em: string;
}): LancamentoFinanceiro {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    clienteId: row.cliente_id ?? undefined,
    vendaId: row.venda_id ?? undefined,
    tipo: row.tipo,
    descricao: row.descricao,
    categoria: row.categoria,
    valor: Number(row.valor),
    data: row.data,
    status: row.status,
    formaPagamento: row.forma_pagamento,
    criadoEm: row.criado_em.slice(0, 10),
  };
}

export function criarSupabaseRepository(): WorkspaceRepository | null {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  return {
    modo: 'supabase',

    async obterContextoSessao(): Promise<ContextoSessaoSupabase> {
      const {data: sessionData, error: sessionError} = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(traduzirErroSupabase(sessionError, 'Falha ao verificar sessão.'));
      }

      if (!sessionData.session) {
        return {
          autenticado: false,
          usuarioAuth: null,
          isPrincipal: false,
          perfil: null,
          empresa: null,
        };
      }

      const {data: userData, error: userError} = await supabase.auth.getUser();
      if (userError || !userData.user) {
        const msgLower = (userError?.message ?? '').toLowerCase();
        const statusAuth = (userError as {status?: number} | null)?.status;
        const sessaoInvalida =
          statusAuth === 401 ||
          statusAuth === 403 ||
          msgLower.includes('jwt') ||
          msgLower.includes('session') ||
          msgLower.includes('token') ||
          msgLower.includes('user from sub claim');

        if (sessaoInvalida || !userError) {
          await supabase.auth.signOut({scope: 'local'}).catch(() => undefined);
          return {
            autenticado: false,
            usuarioAuth: null,
            isPrincipal: false,
            perfil: null,
            empresa: null,
          };
        }

        throw new Error(
          traduzirErroSupabase(userError, 'Falha ao validar sessão do usuário no Supabase.'),
        );
      }

      const authUser = userData.user;
      const emailConfirmado = Boolean(authUser.email_confirmed_at);

      const [
        {data: isPrincipalData, error: principalError},
        {data: perfilData, error: perfilError},
      ] = await Promise.all([
        supabase.rpc('sou_principal'),
        supabase.from('perfis').select('*').eq('id', authUser.id).maybeSingle(),
      ]);

      if (perfilError) {
        throw new Error(
          traduzirErroSupabase(perfilError, 'Erro ao carregar perfil do usuário.'),
        );
      }

      if (principalError && !perfilData) {
        throw new Error(
          traduzirErroSupabase(principalError, 'Erro ao verificar permissões da plataforma.'),
        );
      }

      const isPrincipal = Boolean(isPrincipalData);
      const perfil = perfilData ? mapPerfilRow(perfilData) : null;

      let empresa: Empresa | null = null;
      if (perfil) {
        const {data: empData, error: empError} = await supabase
          .from('empresas')
          .select('*')
          .eq('id', perfil.empresaId)
          .single();

        if (empError) {
          throw new Error(
            traduzirErroSupabase(empError, 'Erro ao carregar dados da empresa.'),
          );
        }
        empresa = mapEmpresaRow(empData);
      }

      return {
        autenticado: true,
        usuarioAuth: {
          id: authUser.id,
          email: authUser.email ?? '',
          emailConfirmado,
        },
        isPrincipal,
        perfil,
        empresa,
      };
    },

    async entrarComEmailSenha(email: string, senha: string): Promise<void> {
      const {error} = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Não foi possível entrar.'));
      }
    },

    async cadastrarContaAuth(
      email: string,
      senha: string,
      nomeCompleto: string,
    ): Promise<{precisaConfirmarEmail: boolean; userId: string | null}> {
      const {data, error} = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto.trim(),
          },
          emailRedirectTo:
            typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Não foi possível criar a conta.'));
      }
      const precisaConfirmarEmail = !data.session || !data.user?.email_confirmed_at;
      return {
        precisaConfirmarEmail,
        userId: data.user?.id ?? null,
      };
    },

    async enviarRecuperacaoSenha(email: string): Promise<void> {
      const {error} = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      );
      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Não foi possível enviar o e-mail de recuperação.'),
        );
      }
    },

    async atualizarSenhaUsuario(novaSenha: string): Promise<void> {
      const {error} = await supabase.auth.updateUser({
        password: novaSenha,
      });
      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Não foi possível atualizar sua senha.'),
        );
      }
    },

    async sairSessao(): Promise<void> {
      const {error} = await supabase.auth.signOut();
      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao encerrar sessão.'));
      }
    },

    async provisionarEmpresaInicial(dados) {
      const {data, error} = await supabase.rpc('provisionar_empresa_inicial', {
        p_nome_empresa: dados.nomeEmpresa.trim(),
        p_segmento: dados.segmento.trim() || 'Serviços',
        p_cnpj: dados.cnpj?.trim() || null,
        p_nome_completo: dados.nomeCompleto?.trim() || null,
        p_cargo: dados.cargo?.trim() || 'Administrador(a)',
      });
      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Erro ao provisionar empresa inicial.'),
        );
      }
      const linha = data?.[0];
      if (!linha) {
        throw new Error('Resposta inesperada ao provisionar empresa.');
      }
      return {
        empresaId: linha.empresa_id,
        perfilId: linha.perfil_id,
        papel: linha.papel,
      };
    },

    async aceitarConviteEmpresa(
      token: string,
      nomeCompleto?: string,
    ): Promise<ResultadoAceiteConvite> {
      const {data, error} = await supabase.rpc('aceitar_convite_empresa', {
        p_token: token.trim(),
        p_nome_completo: nomeCompleto?.trim() || null,
      });
      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao aceitar convite.'));
      }
      const linha = data?.[0];
      if (!linha) {
        throw new Error('Resposta inválida ao processar convite.');
      }
      return {
        aceito: linha.aceito,
        statusConvite: linha.status_convite,
        mensagem: linha.mensagem,
        empresaId: linha.empresa_id,
        perfilId: linha.perfil_id,
        papel: linha.papel,
      };
    },

    async criarConviteEmpresa(dados): Promise<ResultadoCriacaoConvite> {
      const {data, error} = await supabase.rpc('criar_convite_empresa', {
        p_email_convidado: dados.emailConvidado.trim().toLowerCase(),
        p_cargo: dados.cargo?.trim() || null,
        p_dias_validade: dados.diasValidade ?? 7,
        p_papel: dados.papel ?? 'membro',
      });
      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao criar convite.'));
      }
      const linha = data?.[0];
      if (!linha) {
        throw new Error('Resposta inválida ao criar convite.');
      }
      return {
        conviteCriado: linha.convite_criado,
        statusResultado: linha.status_resultado,
        mensagem: linha.mensagem,
        conviteId: linha.convite_id,
        empresaId: linha.empresa_id,
        emailConvidado: linha.email_convidado,
        tokenConvite: linha.token_convite,
        expiraEm: linha.expira_em,
      };
    },

    async listarConvitesEmpresa(empresaId: string): Promise<ConviteEmpresa[]> {
      // Seleção explícita sem token_hash (protegido por privilégio de coluna no Postgres)
      const {data, error} = await supabase
        .from('convites_empresa')
        .select(
          'id, empresa_id, email_convidado, cargo, papel, criado_por, status, expira_em, aceito_por, aceito_em, criado_em',
        )
        .eq('empresa_id', empresaId)
        .order('criado_em', {ascending: false});

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar convites.'));
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        empresaId: row.empresa_id,
        emailConvidado: row.email_convidado,
        cargo: row.cargo,
        papel: row.papel,
        criadoPor: row.criado_por,
        status: row.status,
        expiraEm: row.expira_em,
        aceitoPor: row.aceito_por,
        aceitoEm: row.aceito_em,
        criadoEm: row.criado_em,
      }));
    },

    async revogarConviteEmpresa(conviteId: string, empresaId: string): Promise<void> {
      const {error} = await supabase
        .from('convites_empresa')
        .update({status: 'revogado'})
        .eq('id', conviteId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao revogar convite.'));
      }
    },

    async excluirConviteEmpresa(conviteId: string, empresaId: string): Promise<void> {
      const {error} = await supabase
        .from('convites_empresa')
        .delete()
        .eq('id', conviteId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao excluir convite.'));
      }
    },

    async atualizarDadosEmpresa(empresaId, dados): Promise<Empresa> {
      const {data, error} = await supabase
        .from('empresas')
        .update({
          nome: dados.nome.trim(),
          segmento: dados.segmento.trim() || 'Serviços',
          cnpj: dados.cnpj?.trim() || null,
        })
        .eq('id', empresaId)
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar empresa.'));
      }
      return mapEmpresaRow(data);
    },

    async listarMembrosEmpresa(empresaId: string): Promise<UsuarioPerfil[]> {
      const {data, error} = await supabase
        .from('perfis')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', {ascending: true});

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar equipe da empresa.'));
      }
      return (data ?? []).map(mapPerfilRow);
    },

    async atualizarPerfilMembro(perfilId, empresaId, dados): Promise<UsuarioPerfil> {
      const {data, error} = await supabase
        .from('perfis')
        .update({
          nome_completo: dados.nomeCompleto.trim(),
          cargo: dados.cargo.trim(),
        })
        .eq('id', perfilId)
        .eq('empresa_id', empresaId)
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar perfil.'));
      }
      return mapPerfilRow(data);
    },

    async alterarPapelMembro(alvoUsuarioId: string, novoPapel: PapelEmpresa): Promise<PapelEmpresa> {
      const {data, error} = await supabase.rpc('autorizar_alteracao_papel_membro', {
        p_alvo_usuario_id: alvoUsuarioId,
        p_novo_papel: novoPapel,
        p_confirmar_autorizacao: true,
      });

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao alterar papel do membro.'));
      }
      const linha = data?.[0];
      return linha?.papel ?? novoPapel;
    },

    async excluirMembroEmpresa(perfilId: string, empresaId: string): Promise<void> {
      const {error} = await supabase
        .from('perfis')
        .delete()
        .eq('id', perfilId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao remover membro.'));
      }
    },

    async listarEmpresasPrincipal(): Promise<EmpresaPrincipalResumo[]> {
      const {data, error} = await supabase.rpc('listar_empresas_principal');
      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Erro ao carregar resumo das empresas da plataforma.'),
        );
      }

      return (data ?? []).map((row) => ({
        empresaId: row.empresa_id,
        nome: row.nome,
        segmento: row.segmento,
        cnpj: row.cnpj ?? undefined,
        plano: row.plano,
        criadoEm: row.criado_em,
        totalUsuarios: Number(row.total_usuarios),
        totalAdmins: Number(row.total_admins),
        totalGerentes: Number(row.total_gerentes),
        totalMembros: Number(row.total_membros),
      }));
    },

    async listarClientes(empresaId: string): Promise<Cliente[]> {
      const {data, error} = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', {ascending: false});

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar clientes.'));
      }
      return (data ?? []).map(mapClienteRow);
    },

    async criarCliente(empresaId, novo): Promise<Cliente> {
      const {data, error} = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          nome: novo.nome,
          documento: novo.documento,
          email: novo.email,
          telefone: novo.telefone,
          segmento: novo.segmento,
          responsavel: novo.responsavel,
          status: novo.status,
          observacoes: novo.observacoes,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao cadastrar cliente.'));
      }
      return mapClienteRow(data);
    },

    async atualizarStatusCliente(clienteId, empresaId, status): Promise<void> {
      const {error} = await supabase
        .from('clientes')
        .update({status})
        .eq('id', clienteId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar status do cliente.'));
      }
    },

    async listarProcessos(empresaId: string): Promise<Processo[]> {
      const [{data, error}, {data: etapasData, error: etapasError}] = await Promise.all([
        supabase
          .from('processos')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('criado_em', {ascending: false}),
        supabase
          .from('etapas_processo')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('ordem', {ascending: true}),
      ]);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar processos.'));
      }
      if (etapasError) {
        throw new Error(traduzirErroSupabase(etapasError, 'Erro ao carregar etapas.'));
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        empresaId: row.empresa_id,
        clienteId: row.cliente_id ?? undefined,
        titulo: row.titulo,
        categoria: row.categoria,
        responsavel: row.responsavel,
        status: row.status,
        descricao: row.descricao ?? '',
        criadoEm: row.criado_em.slice(0, 10),
        etapas: (etapasData ?? [])
          .filter((e) => e.processo_id === row.id)
          .map((e) => ({
            id: e.id,
            empresaId: e.empresa_id,
            processoId: e.processo_id,
            titulo: e.titulo,
            ordem: e.ordem,
            concluida: e.concluida,
          })),
      }));
    },

    async criarProcesso(empresaId, dados): Promise<Processo> {
      const {data: procRow, error: procError} = await supabase
        .from('processos')
        .insert({
          empresa_id: empresaId,
          cliente_id: dados.clienteId || null,
          titulo: dados.titulo,
          categoria: dados.categoria,
          responsavel: dados.responsavel,
          status: 'ativo',
          descricao: dados.descricao,
        })
        .select('*')
        .single();

      if (procError) {
        throw new Error(traduzirErroSupabase(procError, 'Erro ao criar processo.'));
      }

      const etapasInsert = dados.etapasTitulos.map((tituloEtapa, idx) => ({
        empresa_id: empresaId,
        processo_id: procRow.id,
        titulo: tituloEtapa,
        ordem: idx + 1,
        concluida: false,
      }));

      const {data: etapasRows, error: etapasError} = await supabase
        .from('etapas_processo')
        .insert(etapasInsert)
        .select('*')
        .order('ordem', {ascending: true});

      if (etapasError) {
        throw new Error(traduzirErroSupabase(etapasError, 'Erro ao salvar etapas do processo.'));
      }

      return {
        id: procRow.id,
        empresaId: procRow.empresa_id,
        clienteId: procRow.cliente_id ?? undefined,
        titulo: procRow.titulo,
        categoria: procRow.categoria,
        responsavel: procRow.responsavel,
        status: procRow.status,
        descricao: procRow.descricao ?? '',
        criadoEm: procRow.criado_em.slice(0, 10),
        etapas: (etapasRows ?? []).map((e) => ({
          id: e.id,
          empresaId: e.empresa_id,
          processoId: e.processo_id,
          titulo: e.titulo,
          ordem: e.ordem,
          concluida: e.concluida,
        })),
      };
    },

    async alterarStatusProcesso(processoId, empresaId, status): Promise<void> {
      const {error} = await supabase
        .from('processos')
        .update({status})
        .eq('id', processoId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao alterar status do processo.'));
      }
    },

    async alternarEtapaProcesso(etapaId, empresaId, concluida): Promise<void> {
      const {error} = await supabase
        .from('etapas_processo')
        .update({concluida})
        .eq('id', etapaId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar etapa.'));
      }
    },

    async adicionarEtapaProcesso(processoId, empresaId, titulo, ordem): Promise<EtapaProcesso> {
      const {data, error} = await supabase
        .from('etapas_processo')
        .insert({
          empresa_id: empresaId,
          processo_id: processoId,
          titulo,
          ordem,
          concluida: false,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao adicionar etapa.'));
      }

      return {
        id: data.id,
        empresaId: data.empresa_id,
        processoId: data.processo_id,
        titulo: data.titulo,
        ordem: data.ordem,
        concluida: data.concluida,
      };
    },

    async listarTarefas(empresaId: string): Promise<Tarefa[]> {
      const {data, error} = await supabase
        .from('tarefas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('prazo', {ascending: true});

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar tarefas.'));
      }
      return (data ?? []).map(mapTarefaRow);
    },

    async criarTarefa(empresaId, nova): Promise<Tarefa> {
      const {data, error} = await supabase
        .from('tarefas')
        .insert({
          empresa_id: empresaId,
          cliente_id: nova.clienteId || null,
          processo_id: nova.processoId || null,
          titulo: nova.titulo,
          descricao: nova.descricao,
          prioridade: nova.prioridade,
          status: nova.status,
          prazo: nova.prazo,
          responsavel: nova.responsavel,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao criar tarefa.'));
      }
      return mapTarefaRow(data);
    },

    async atualizarStatusTarefa(tarefaId, empresaId, novoStatus): Promise<void> {
      const {error} = await supabase
        .from('tarefas')
        .update({status: novoStatus})
        .eq('id', tarefaId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar tarefa.'));
      }
    },

    async excluirTarefa(tarefaId, empresaId): Promise<void> {
      const {error} = await supabase
        .from('tarefas')
        .delete()
        .eq('id', tarefaId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao excluir tarefa.'));
      }
    },

    async listarVendas(empresaId: string): Promise<Venda[]> {
      const {data, error} = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_prevista', {ascending: false});

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao carregar vendas.'));
      }
      return (data ?? []).map(mapVendaRow);
    },

    async criarVenda(empresaId, nova): Promise<Venda> {
      const {data, error} = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          cliente_id: nova.clienteId || null,
          titulo: nova.titulo,
          responsavel: nova.responsavel,
          valor: nova.valor,
          etapa: nova.etapa,
          data_prevista: nova.dataPrevista,
          forma_pagamento: nova.formaPagamento,
          faturada: nova.faturada,
          observacoes: nova.observacoes ?? '',
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao registrar venda.'));
      }
      return mapVendaRow(data);
    },

    async atualizarEtapaVenda(vendaId, empresaId, etapa): Promise<void> {
      const {error} = await supabase
        .from('vendas')
        .update({etapa})
        .eq('id', vendaId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar etapa da venda.'));
      }
    },

    async faturarVenda(venda, empresaId, dataFaturamentoISO) {
      const {error: vendaError} = await supabase
        .from('vendas')
        .update({etapa: 'fechada', faturada: true})
        .eq('id', venda.id)
        .eq('empresa_id', empresaId);

      if (vendaError) {
        throw new Error(traduzirErroSupabase(vendaError, 'Erro ao marcar venda como faturada.'));
      }

      const {data: lancRow, error: lancError} = await supabase
        .from('lancamentos_financeiros')
        .insert({
          empresa_id: empresaId,
          cliente_id: venda.clienteId || null,
          venda_id: venda.id,
          tipo: 'receita',
          descricao: `Faturamento venda: ${venda.titulo}`,
          categoria: 'Vendas Faturadas',
          valor: venda.valor,
          data: dataFaturamentoISO,
          status: 'pendente',
          forma_pagamento: venda.formaPagamento,
        })
        .select('*')
        .single();

      if (lancError) {
        // Compensa caso falhe a gravação do lançamento
        await supabase
          .from('vendas')
          .update({etapa: venda.etapa, faturada: venda.faturada})
          .eq('id', venda.id)
          .eq('empresa_id', empresaId);
        throw new Error(traduzirErroSupabase(lancError, 'Erro ao gerar lançamento de faturamento.'));
      }

      return {lancamento: mapLancamentoRow(lancRow)};
    },

    async excluirVenda(vendaId, empresaId): Promise<void> {
      const {error} = await supabase
        .from('vendas')
        .delete()
        .eq('id', vendaId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao excluir venda.'));
      }
    },

    async listarLancamentos(empresaId: string): Promise<LancamentoFinanceiro[]> {
      const {data, error} = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data', {ascending: false});

      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Erro ao carregar lançamentos financeiros.'),
        );
      }
      return (data ?? []).map(mapLancamentoRow);
    },

    async criarLancamento(empresaId, novo): Promise<LancamentoFinanceiro> {
      const {data, error} = await supabase
        .from('lancamentos_financeiros')
        .insert({
          empresa_id: empresaId,
          cliente_id: novo.clienteId || null,
          venda_id: novo.vendaId || null,
          tipo: novo.tipo,
          descricao: novo.descricao,
          categoria: novo.categoria,
          valor: novo.valor,
          data: novo.data,
          status: novo.status,
          forma_pagamento: novo.formaPagamento,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(
          traduzirErroSupabase(error, 'Erro ao criar lançamento financeiro.'),
        );
      }
      return mapLancamentoRow(data);
    },

    async atualizarStatusLancamento(lancamentoId, empresaId, status): Promise<void> {
      const {error} = await supabase
        .from('lancamentos_financeiros')
        .update({status})
        .eq('id', lancamentoId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao atualizar status financeiro.'));
      }
    },

    async excluirLancamento(lancamentoId, empresaId): Promise<void> {
      const {error} = await supabase
        .from('lancamentos_financeiros')
        .delete()
        .eq('id', lancamentoId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new Error(traduzirErroSupabase(error, 'Erro ao excluir lançamento financeiro.'));
      }
    },
  };
}

export interface SessaoAutenticada {
  usuario: UsuarioPerfil;
  empresa: Empresa;
  modo: ModoPersistencia;
}
