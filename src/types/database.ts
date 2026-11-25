export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente';
export type StatusTarefa = 'a_fazer' | 'em_andamento' | 'em_revisao' | 'concluida';
export type StatusCliente = 'ativo' | 'onboarding' | 'inativo';
export type StatusProcesso = 'ativo' | 'pausado' | 'concluido';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusFinanceiro = 'pago' | 'pendente' | 'atrasado';
export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'transferencia';
export type EtapaVenda = 'prospeccao' | 'proposta' | 'fechada' | 'perdida';

export type PapelEmpresa = 'admin' | 'gerente' | 'membro';
export type PapelConvite = 'membro' | 'gerente';
export type StatusConvite = 'pendente' | 'aceito' | 'revogado' | 'expirado';
export type PlanoEmpresa = 'essencial' | 'profissional' | 'escala';

export interface Empresa {
  id: string;
  nome: string;
  segmento: string;
  cnpj?: string;
  plano: PlanoEmpresa;
  criadoEm: string;
}

export interface UsuarioPerfil {
  id: string;
  empresaId: string;
  nomeCompleto: string;
  email: string;
  cargo: string;
  papel: PapelEmpresa;
  criadoEm?: string;
}

export interface ConviteEmpresa {
  id: string;
  empresaId: string;
  emailConvidado: string;
  cargo: string;
  papel: PapelConvite;
  criadoPor?: string | null;
  status: StatusConvite;
  expiraEm: string;
  aceitoPor?: string | null;
  aceitoEm?: string | null;
  criadoEm: string;
}

export interface EmpresaPrincipalResumo {
  empresaId: string;
  nome: string;
  segmento: string;
  cnpj?: string;
  plano: PlanoEmpresa;
  criadoEm: string;
  totalUsuarios: number;
  totalAdmins: number;
  totalGerentes: number;
  totalMembros: number;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  segmento: string;
  responsavel: string;
  status: StatusCliente;
  observacoes: string;
  criadoEm: string;
}

export interface EtapaProcesso {
  id: string;
  empresaId: string;
  processoId: string;
  titulo: string;
  ordem: number;
  concluida: boolean;
}

export interface Processo {
  id: string;
  empresaId: string;
  clienteId?: string;
  titulo: string;
  categoria: string;
  responsavel: string;
  status: StatusProcesso;
  descricao: string;
  etapas: EtapaProcesso[];
  criadoEm: string;
}

export interface Tarefa {
  id: string;
  empresaId: string;
  clienteId?: string;
  processoId?: string;
  titulo: string;
  descricao: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  prazo: string; // ISO YYYY-MM-DD
  responsavel: string;
  criadoEm: string;
}

export interface LancamentoFinanceiro {
  id: string;
  empresaId: string;
  clienteId?: string;
  vendaId?: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  valor: number; // Em reais (BRL)
  data: string; // ISO YYYY-MM-DD
  status: StatusFinanceiro;
  formaPagamento: FormaPagamento;
  criadoEm?: string;
}

export interface Venda {
  id: string;
  empresaId: string;
  clienteId?: string;
  titulo: string;
  responsavel: string;
  valor: number; // Em reais (BRL)
  etapa: EtapaVenda;
  dataPrevista: string; // ISO YYYY-MM-DD
  formaPagamento: FormaPagamento;
  faturada: boolean;
  observacoes?: string;
  criadoEm?: string;
}

export type SecaoAtiva =
  | 'dashboard'
  | 'financeiro'
  | 'tarefas'
  | 'clientes'
  | 'processos'
  | 'equipe'
  | 'principal'
  | 'assistente'
  | 'integracao';

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          segmento: string;
          cnpj: string | null;
          plano: PlanoEmpresa;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          segmento?: string;
          cnpj?: string | null;
          plano?: PlanoEmpresa;
          criado_em?: string;
        };
        Update: {
          nome?: string;
          segmento?: string;
          cnpj?: string | null;
        };
        Relationships: [];
      };
      perfis: {
        Row: {
          id: string;
          empresa_id: string;
          nome_completo: string;
          email: string;
          cargo: string;
          papel: PapelEmpresa;
          criado_em: string;
        };
        Insert: {
          id: string;
          empresa_id: string;
          nome_completo: string;
          email: string;
          cargo?: string;
          papel?: PapelEmpresa;
          criado_em?: string;
        };
        Update: {
          nome_completo?: string;
          cargo?: string;
        };
        Relationships: [];
      };
      convites_empresa: {
        Row: {
          id: string;
          empresa_id: string;
          email_convidado: string;
          cargo: string;
          papel: PapelConvite;
          criado_por: string | null;
          status: StatusConvite;
          expira_em: string;
          aceito_por: string | null;
          aceito_em: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          email_convidado: string;
          cargo?: string;
          papel?: PapelConvite;
          criado_por?: string | null;
          status?: StatusConvite;
          expira_em?: string;
          aceito_por?: string | null;
          aceito_em?: string | null;
          criado_em?: string;
        };
        Update: {
          status?: StatusConvite;
        };
        Relationships: [];
      };
      clientes: {
        Row: {
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
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nome: string;
          documento: string;
          email: string;
          telefone: string;
          segmento: string;
          responsavel: string;
          status?: StatusCliente;
          observacoes?: string;
          criado_em?: string;
        };
        Update: {
          nome?: string;
          documento?: string;
          email?: string;
          telefone?: string;
          segmento?: string;
          responsavel?: string;
          status?: StatusCliente;
          observacoes?: string;
        };
        Relationships: [];
      };
      processos: {
        Row: {
          id: string;
          empresa_id: string;
          cliente_id: string | null;
          titulo: string;
          categoria: string;
          responsavel: string;
          status: StatusProcesso;
          descricao: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cliente_id?: string | null;
          titulo: string;
          categoria: string;
          responsavel: string;
          status?: StatusProcesso;
          descricao?: string;
          criado_em?: string;
        };
        Update: {
          cliente_id?: string | null;
          titulo?: string;
          categoria?: string;
          responsavel?: string;
          status?: StatusProcesso;
          descricao?: string;
        };
        Relationships: [];
      };
      etapas_processo: {
        Row: {
          id: string;
          empresa_id: string;
          processo_id: string;
          titulo: string;
          ordem: number;
          concluida: boolean;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          processo_id: string;
          titulo: string;
          ordem?: number;
          concluida?: boolean;
        };
        Update: {
          titulo?: string;
          ordem?: number;
          concluida?: boolean;
        };
        Relationships: [];
      };
      tarefas: {
        Row: {
          id: string;
          empresa_id: string;
          cliente_id: string | null;
          processo_id: string | null;
          titulo: string;
          descricao: string;
          prioridade: PrioridadeTarefa;
          status: StatusTarefa;
          prazo: string;
          responsavel: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cliente_id?: string | null;
          processo_id?: string | null;
          titulo: string;
          descricao?: string;
          prioridade?: PrioridadeTarefa;
          status?: StatusTarefa;
          prazo: string;
          responsavel: string;
          criado_em?: string;
        };
        Update: {
          cliente_id?: string | null;
          processo_id?: string | null;
          titulo?: string;
          descricao?: string;
          prioridade?: PrioridadeTarefa;
          status?: StatusTarefa;
          prazo?: string;
          responsavel?: string;
        };
        Relationships: [];
      };
      vendas: {
        Row: {
          id: string;
          empresa_id: string;
          cliente_id: string | null;
          titulo: string;
          responsavel: string;
          valor: number;
          etapa: EtapaVenda;
          data_prevista: string;
          forma_pagamento: FormaPagamento;
          faturada: boolean;
          observacoes: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cliente_id?: string | null;
          titulo: string;
          responsavel: string;
          valor: number;
          etapa?: EtapaVenda;
          data_prevista: string;
          forma_pagamento?: FormaPagamento;
          faturada?: boolean;
          observacoes?: string;
          criado_em?: string;
        };
        Update: {
          cliente_id?: string | null;
          titulo?: string;
          responsavel?: string;
          valor?: number;
          etapa?: EtapaVenda;
          data_prevista?: string;
          forma_pagamento?: FormaPagamento;
          faturada?: boolean;
          observacoes?: string;
        };
        Relationships: [];
      };
      lancamentos_financeiros: {
        Row: {
          id: string;
          empresa_id: string;
          cliente_id: string | null;
          venda_id: string | null;
          tipo: TipoLancamento;
          descricao: string;
          categoria: string;
          valor: number;
          data: string;
          status: StatusFinanceiro;
          forma_pagamento: FormaPagamento;
          criado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cliente_id?: string | null;
          venda_id?: string | null;
          tipo: TipoLancamento;
          descricao: string;
          categoria: string;
          valor: number;
          data: string;
          status?: StatusFinanceiro;
          forma_pagamento?: FormaPagamento;
          criado_em?: string;
        };
        Update: {
          cliente_id?: string | null;
          venda_id?: string | null;
          tipo?: TipoLancamento;
          descricao?: string;
          categoria?: string;
          valor?: number;
          data?: string;
          status?: StatusFinanceiro;
          forma_pagamento?: FormaPagamento;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_empresa_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      current_user_papel: {
        Args: Record<PropertyKey, never>;
        Returns: PapelEmpresa | null;
      };
      is_empresa_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_empresa_gestor: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      sou_principal: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      listar_empresas_principal: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          empresa_id: string;
          nome: string;
          segmento: string;
          cnpj: string | null;
          plano: PlanoEmpresa;
          criado_em: string;
          total_usuarios: number;
          total_admins: number;
          total_gerentes: number;
          total_membros: number;
        }>;
      };
      provisionar_empresa_inicial: {
        Args: {
          p_nome_empresa: string;
          p_segmento?: string;
          p_cnpj?: string | null;
          p_nome_completo?: string | null;
          p_cargo?: string;
        };
        Returns: Array<{
          empresa_id: string;
          perfil_id: string;
          papel: PapelEmpresa;
        }>;
      };
      criar_convite_empresa: {
        Args: {
          p_email_convidado: string;
          p_cargo?: string | null;
          p_dias_validade?: number;
          p_papel?: PapelConvite;
        };
        Returns: Array<{
          convite_criado: boolean;
          status_resultado: string;
          mensagem: string;
          convite_id: string | null;
          empresa_id: string;
          email_convidado: string;
          token_convite: string | null;
          expira_em: string | null;
        }>;
      };
      aceitar_convite_empresa: {
        Args: {
          p_token: string;
          p_nome_completo?: string | null;
        };
        Returns: Array<{
          aceito: boolean;
          status_convite: string;
          mensagem: string;
          empresa_id: string | null;
          perfil_id: string | null;
          papel: PapelEmpresa | null;
        }>;
      };
      autorizar_alteracao_papel_membro: {
        Args: {
          p_alvo_usuario_id: string;
          p_novo_papel: PapelEmpresa;
          p_confirmar_autorizacao?: boolean;
        };
        Returns: Array<{
          perfil_id: string;
          empresa_id: string;
          papel: PapelEmpresa;
        }>;
      };
    };
  };
}
