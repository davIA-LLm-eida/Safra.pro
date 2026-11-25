export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente';
export type StatusTarefa = 'a_fazer' | 'em_andamento' | 'em_revisao' | 'concluida';
export type StatusCliente = 'ativo' | 'onboarding' | 'inativo';
export type StatusProcesso = 'ativo' | 'pausado' | 'concluido';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusFinanceiro = 'pago' | 'pendente' | 'atrasado';
export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'transferencia';
export type EtapaVenda = 'prospeccao' | 'proposta' | 'fechada' | 'perdida';

export interface Empresa {
  id: string;
  nome: string;
  segmento: string;
  cnpj?: string;
  plano: 'essencial' | 'profissional' | 'escala';
  criadoEm: string;
}

export interface UsuarioPerfil {
  id: string;
  empresaId: string;
  nomeCompleto: string;
  email: string;
  cargo: string;
  papel: 'admin' | 'membro';
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
}

export type SecaoAtiva =
  | 'dashboard'
  | 'financeiro'
  | 'tarefas'
  | 'clientes'
  | 'processos'
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
          plano: 'essencial' | 'profissional' | 'escala';
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          segmento?: string;
          cnpj?: string | null;
          plano?: 'essencial' | 'profissional' | 'escala';
        };
        Update: {
          nome?: string;
          segmento?: string;
          cnpj?: string | null;
          plano?: 'essencial' | 'profissional' | 'escala';
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
          papel: 'admin' | 'membro';
          criado_em: string;
        };
        Insert: {
          id: string;
          empresa_id: string;
          nome_completo: string;
          email: string;
          cargo?: string;
          papel?: 'admin' | 'membro';
        };
        Update: {
          nome_completo?: string;
          cargo?: string;
          papel?: 'admin' | 'membro';
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
        };
        Update: {
          cliente_id?: string | null;
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
          observacoes: string | null;
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
          observacoes?: string | null;
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
          observacoes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
