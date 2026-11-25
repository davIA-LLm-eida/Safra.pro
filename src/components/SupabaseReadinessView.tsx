import {useState} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import {
  obterEstadoIntegracaoSupabase,
  testarConexaoSupabase,
  type ResultadoTesteConexaoSupabase,
} from '../services/workspaceRepository';

export function SupabaseReadinessView() {
  const estado = obterEstadoIntegracaoSupabase();
  const {diagnostico} = estado;

  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] =
    useState<ResultadoTesteConexaoSupabase | null>(null);

  async function handleTestarConexao() {
    setTestando(true);
    try {
      const resultado = await testarConexaoSupabase();
      setResultadoTeste(resultado);
    } finally {
      setTestando(false);
    }
  }

  const tabelas = [
    {
      nome: 'empresas',
      descricao:
        'Cadastro raiz de cada empresa (tenant), segmento, CNPJ e plano (coluna plano protegida no servidor).',
      isolamento: 'id = current_empresa_id()',
    },
    {
      nome: 'perfis',
      descricao:
        'Vínculo entre auth.users e empresa_id + papel (admin, gerente ou membro).',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'convites_empresa',
      descricao:
        'Convites com token SHA-256 (token_hash protegido por privilégio de coluna), validade e aceite autenticado.',
      isolamento: 'empresa_id = current_empresa_id() + is_empresa_gestor()',
    },
    {
      nome: 'clientes',
      descricao: 'Carteira de clientes pertencentes exclusivamente à empresa autenticada.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'processos',
      descricao: 'Fluxos empresariais com vínculo opcional a clientes e controle por empresa.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'etapas_processo',
      descricao: 'Checklists ordenados vinculados ao processo e à empresa dona do registro.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'tarefas',
      descricao: 'Tarefas com prioridade, prazo, status e vínculos opcionais a cliente/processo.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'vendas',
      descricao: 'Pipeline comercial com etapas, previsão, forma de pagamento e controle de faturamento.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'lancamentos_financeiros',
      descricao: 'Livro econômico de receitas e despesas isolado por empresa.',
      isolamento: 'empresa_id = current_empresa_id()',
    },
    {
      nome: 'safra_interno (privado)',
      descricao:
        'Schema interno restrito (autorizacoes_transacao e principais) inacessível diretamente via API pública.',
      isolamento: 'SECURITY DEFINER + search_path = ""',
    },
  ];

  const temVariavelComErro =
    diagnostico.statusUrl === 'invalida' || diagnostico.statusChave === 'invalida';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Status real da conexão */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Database className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-display text-lg font-semibold text-[#111915]">
                  Estado da Integração com Supabase
                </h2>
                {estado.configurado ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Credenciais válidas detectadas</span>
                  </span>
                ) : temVariavelComErro ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Configuração necessita correção</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Modo Demonstração Local</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {estado.configurado
                  ? 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY foram lidas via import.meta.env. Execute o teste abaixo para validar a conexão real com o banco em South America (São Paulo).'
                  : 'O Modo Demonstração Local permanece preservado até que as variáveis do Supabase estejam válidas e a conexão real seja confirmada.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleTestarConexao}
              disabled={testando}
              aria-busy={testando}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#15803D] text-white hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {testando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>Testando conexão...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Testar conexão com Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnóstico direto quando existe variável ausente ou malformada */}
        {diagnostico.motivoBloqueio && (
          <div
            role="status"
            className="mt-5 p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-sm text-amber-950"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">Diagnóstico do ambiente</p>
                <p className="text-amber-900 leading-relaxed">{diagnostico.motivoBloqueio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leitura real das variáveis import.meta.env */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#E2E8E4]">
          <div className="p-4 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">VITE_SUPABASE_URL</p>
              {diagnostico.statusUrl === 'configurada' && (
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" aria-hidden="true" />
              )}
              {diagnostico.statusUrl === 'invalida' && (
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              )}
              {diagnostico.statusUrl === 'ausente' && (
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              )}
            </div>
            <p
              className={`text-sm font-mono font-medium ${
                diagnostico.statusUrl === 'configurada'
                  ? 'text-[#15803D]'
                  : diagnostico.statusUrl === 'invalida'
                    ? 'text-red-700'
                    : 'text-[#111915]'
              }`}
            >
              {diagnostico.mensagemUrl}
            </p>
            {diagnostico.urlPreviewSeguro && (
              <p className="text-xs font-mono text-slate-600 break-all">
                {diagnostico.urlValida ? 'Endpoint: ' : 'Valor lido: '}
                {diagnostico.urlPreviewSeguro}
              </p>
            )}
          </div>

          <div className="p-4 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">VITE_SUPABASE_ANON_KEY</p>
              {diagnostico.statusChave === 'configurada' && (
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" aria-hidden="true" />
              )}
              {diagnostico.statusChave === 'invalida' && (
                <XCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              )}
              {diagnostico.statusChave === 'ausente' && (
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              )}
            </div>
            <p
              className={`text-sm font-mono font-medium ${
                diagnostico.statusChave === 'configurada'
                  ? 'text-[#15803D]'
                  : diagnostico.statusChave === 'invalida'
                    ? 'text-red-700'
                    : 'text-[#111915]'
              }`}
            >
              {diagnostico.mensagemChave}
            </p>
            <p className="text-xs text-slate-600">
              {diagnostico.chaveAnonDefinida
                ? 'Presente em import.meta.env (valor ocultado por segurança).'
                : 'Aguardando definição da Publishable / anon key pública.'}
            </p>
          </div>
        </div>

        {/* Resultado do teste real de conexão */}
        {resultadoTeste && (
          <div
            data-testid="resultado-teste-supabase"
            role="status"
            className={`mt-5 p-4 rounded-lg border text-sm ${
              resultadoTeste.status === 'conectado'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : resultadoTeste.status === 'conectado_sem_schema'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-red-50/70 border-red-200 text-red-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {resultadoTeste.status === 'conectado' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
                ) : resultadoTeste.status === 'conectado_sem_schema' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{resultadoTeste.titulo}</p>
                  <p className="leading-relaxed">{resultadoTeste.mensagem}</p>
                  {resultadoTeste.detalheTecnico && (
                    <p className="text-xs font-mono opacity-85 pt-0.5">
                      {resultadoTeste.detalheTecnico}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono tabular-nums shrink-0 opacity-80">
                {typeof resultadoTeste.latenciaMs === 'number' && (
                  <>
                    <span>{resultadoTeste.latenciaMs} ms</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{resultadoTeste.testadoEm}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Arquitetura Multi-tenant */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-[#111915]">
            Separação de Dados por Empresa (9 tabelas públicas + safra_interno + RLS)
          </h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          O schema consolidado em{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            supabase/schema.sql
          </code>{' '}
          exige{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">empresa_id</code>,
          aplica Row Level Security (RLS), privilégios por coluna, papéis{' '}
          <strong className="font-medium text-[#111915]">admin</strong>,{' '}
          <strong className="font-medium text-[#111915]">gerente</strong> e{' '}
          <strong className="font-medium text-[#111915]">membro</strong>, além do acesso somente
          leitura <strong className="font-medium text-[#111915]">principal</strong>.
        </p>

        <div className="overflow-x-auto border border-[#E2E8E4] rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAF9] border-b border-[#E2E8E4] text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Tabela / Schema</th>
                <th className="py-2.5 px-4">Finalidade</th>
                <th className="py-2.5 px-4">Regra de Segurança</th>
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

      {/* Passos para conectar em produção */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-[#111915]">
          Checklist para validar a conexão real com o Supabase
        </h3>
        <ol className="mt-3 space-y-2.5 text-sm text-slate-600 list-decimal list-inside">
          <li>
            No painel do Supabase (South America - São Paulo), acesse{' '}
            <strong className="font-medium text-[#111915]">Project Settings → Data API</strong> e
            copie a <strong className="font-medium text-[#111915]">Project URL</strong> no formato{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              https://seu-id-do-projeto.supabase.co
            </code>
            .
          </li>
          <li>
            Em <strong className="font-medium text-[#111915]">API Keys</strong>, configure a
            Publishable / anon key pública em{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            (nunca utilize a Secret / service_role key no frontend).
          </li>
          <li>
            Em <strong className="font-medium text-[#111915]">Authentication → URL Configuration</strong>,
            cadastre a URL do aplicativo em Site URL e Redirect URLs para que confirmação de e-mail e
            recuperação de senha funcionem.
          </li>
          <li>
            Após salvar as variáveis no ambiente e reiniciar a visualização se necessário, clique em{' '}
            <strong className="font-medium text-[#111915]">Testar conexão com Supabase</strong>.
          </li>
        </ol>
      </section>
    </div>
  );
}
