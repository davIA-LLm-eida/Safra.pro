import {AlertCircle, CheckCircle2, Database, Lock, Shield} from 'lucide-react';
import {obterEstadoIntegracaoSupabase} from '../services/workspaceRepository';

export function SupabaseReadinessView() {
  const estado = obterEstadoIntegracaoSupabase();

  const tabelas = [
    {
      nome: 'empresas',
      descricao: 'Cadastro raiz de cada empresa (tenant), segmento e plano contratado.',
      isolamento: 'id = current_empresa_id()',
    },
    {
      nome: 'perfis',
      descricao: 'Vínculo entre auth.users do Supabase e empresa_id + papel do usuário.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'clientes',
      descricao: 'Carteira de clientes pertencentes exclusivamente à empresa autenticada.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'processos & etapas_processo',
      descricao: 'Fluxos empresariais e checklists ordenados com chave estrangeira para empresa.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'tarefas',
      descricao: 'Tarefas com prioridade, prazo, status e vínculos opcionais a cliente/processo.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'vendas & lancamentos_financeiros',
      descricao: 'Pipeline de vendas, receitas, faturamento e despesas isolados por empresa.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Status real da conexão */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Database className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-[#111915]">
                Estado da Integração com Supabase
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {estado.configurado
                  ? 'As credenciais do Supabase foram detectadas e o cliente tipado está ativo.'
                  : 'Operando atualmente em Modo Demonstração com dados locais fictícios. Nenhuma chamada externa está sendo simulada.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {estado.configurado ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Supabase Configurado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span>Modo Demonstração Local</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#E2E8E4]">
          <div className="p-4 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg">
            <p className="text-xs font-medium text-slate-500">VITE_SUPABASE_URL</p>
            <p className="mt-1 text-sm font-mono font-medium text-[#111915]">
              {estado.urlDefinida ? 'Configurada' : 'Não definida no ambiente'}
            </p>
          </div>
          <div className="p-4 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg">
            <p className="text-xs font-medium text-slate-500">VITE_SUPABASE_ANON_KEY</p>
            <p className="mt-1 text-sm font-mono font-medium text-[#111915]">
              {estado.chaveAnonDefinida ? 'Configurada' : 'Não definida no ambiente'}
            </p>
          </div>
        </div>
      </section>

      {/* Arquitetura Multi-tenant */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-[#111915]">
            Separação de Dados por Empresa (Multi-tenant + RLS)
          </h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          O esquema SQL em <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">supabase/schema.sql</code>{' '}
          exige <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">empresa_id</code> em todas as
          tabelas operacionais e financeiras e aplica Row Level Security (RLS) no PostgreSQL para impedir leitura
          ou gravação cruzada entre empresas.
        </p>

        <div className="overflow-x-auto border border-[#E2E8E4] rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAF9] border-b border-[#E2E8E4] text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Tabela</th>
                <th className="py-2.5 px-4">Finalidade</th>
                <th className="py-2.5 px-4">Regra RLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tabelas.map((tab) => (
                <tr key={tab.nome}>
                  <td className="py-3 px-4 font-mono font-semibold text-[#111915] whitespace-nowrap">
                    {tab.nome}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{tab.descricao}</td>
                  <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      {tab.isolamento}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Passos para ativar em produção */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-[#111915]">
          Checklist para conectar o Supabase real
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Crie um projeto no Supabase e execute o script <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">supabase/schema.sql</code> no SQL Editor.</li>
          <li>Defina <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> e <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente.</li>
          <li>Conecte os fluxos de <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">supabase.auth</code> e <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">criarSupabaseRepository()</code> no ciclo de sessão.</li>
        </ol>
      </section>
    </div>
  );
}
