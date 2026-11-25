import {useEffect, useState, type FormEvent} from 'react';
import {AlertTriangle, Bot, CheckCircle2, Send} from 'lucide-react';
import type {Empresa} from '../types/database';
import {formatarMoedaBRL, type DashboardKPIs, type KPIsFinanceiros} from '../utils/workspaceLogic';

interface AiAssistantViewProps {
  empresaAtiva: Empresa;
  kpis: DashboardKPIs;
  finKpis: KPIsFinanceiros;
}

interface MensagemChat {
  id: string;
  autor: 'usuario' | 'assistente' | 'erro';
  conteudo: string;
}

const SUGESTOES_OPERACIONAIS = [
  'Como melhorar nossa margem líquida mantendo o faturamento em crescimento?',
  'Sugira um plano de ação para reduzir tarefas atrasadas e acelerar faturamentos.',
  'Crie um checklist padrão de onboarding comercial e financeiro para novos clientes.',
];

export function AiAssistantView({empresaAtiva, kpis, finKpis}: AiAssistantViewProps) {
  const [statusServidor, setStatusServidor] = useState<'carregando' | 'ativo' | 'nao_configurado'>(
    'carregando',
  );
  const [prompt, setPrompt] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);

  useEffect(() => {
    let ativo = true;
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data: {configured?: boolean}) => {
        if (!ativo) return;
        setStatusServidor(data.configured ? 'ativo' : 'nao_configurado');
      })
      .catch(() => {
        if (!ativo) return;
        setStatusServidor('nao_configurado');
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function enviarSolicitacao(texto: string) {
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    const msgUsuario: MensagemChat = {
      id: `usr-${Date.now()}`,
      autor: 'usuario',
      conteudo: limpo,
    };

    setMensagens((prev) => [...prev, msgUsuario]);
    setPrompt('');
    setEnviando(true);

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: limpo,
          context: {
            empresaNome: empresaAtiva.nome,
            segmento: empresaAtiva.segmento,
            faturamentoMes: finKpis.faturamentoBruto,
            rendaLiquidaMes: finKpis.rendaLiquida,
            tarefasAbertas: kpis.tarefasAbertas,
            tarefasAtrasadas: kpis.tarefasAtrasadas,
            processosAtivos: kpis.processosAtivos,
            clientesAtivos: kpis.clientesAtivos,
          },
        }),
      });

      const data = (await response.json()) as {reply?: string; error?: string};

      if (!response.ok) {
        setMensagens((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            autor: 'erro',
            conteudo:
              data.error ??
              'Não foi possível obter resposta do serviço de IA neste momento.',
          },
        ]);
        return;
      }

      setMensagens((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          autor: 'assistente',
          conteudo: data.reply || 'Resposta vazia retornada pelo modelo.',
        },
      ]);
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          autor: 'erro',
          conteudo: 'Erro de comunicação com o servidor ao consultar o assistente.',
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void enviarSolicitacao(prompt);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-8 bg-white border border-[#E2E8E4] rounded-xl flex flex-col min-h-[520px]">
        <div className="px-5 py-4 border-b border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#111915]">
                Assistente Estratégico safra.pro
              </h2>
              <p className="text-xs text-slate-500">
                Contexto ativo: {empresaAtiva.nome}
              </p>
            </div>
          </div>

          <div className="text-xs font-medium">
            {statusServidor === 'carregando' && (
              <span className="text-slate-500">Verificando endpoint...</span>
            )}
            {statusServidor === 'ativo' && (
              <span className="inline-flex items-center gap-1.5 text-[#15803D]">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>API Gemini conectada</span>
              </span>
            )}
            {statusServidor === 'nao_configurado' && (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Aguardando GEMINI_API_KEY no servidor</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
          {mensagens.length === 0 ? (
            <div className="py-8 text-center max-w-md mx-auto">
              <p className="text-sm font-medium text-[#111915]">
                Pronto para apoiar decisões financeiras e operacionais
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Envie uma dúvida sobre faturamento, margem, organização de processos ou prioridades de
                tarefas usando os indicadores reais de {empresaAtiva.nome}.
              </p>
              {statusServidor === 'nao_configurado' && (
                <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                  Aviso de transparência: a chave da API Gemini ainda não está configurada no
                  servidor. Nenhuma resposta será simulada artificialmente até a configuração.
                </p>
              )}
            </div>
          ) : (
            mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.autor === 'usuario'
                    ? 'bg-[#141715] text-white ml-8 sm:ml-16'
                    : msg.autor === 'erro'
                      ? 'bg-red-50 border border-red-200 text-red-800 mr-8 sm:mr-16'
                      : 'bg-[#F6F8F7] border border-[#E2E8E4] text-slate-800 mr-8 sm:mr-16'
                }`}
              >
                {msg.conteudo}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-[#E2E8E4] flex items-center gap-3">
          <label htmlFor="ai-prompt-input" className="sr-only">
            Escreva sua solicitação para o assistente
          </label>
          <input
            id="ai-prompt-input"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pergunte sobre vendas, fluxo de caixa ou prioridades..."
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
          <button
            type="submit"
            disabled={enviando || prompt.trim().length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{enviando ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </form>
      </section>

      <aside className="lg:col-span-4 space-y-5">
        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-[#111915]">
            Contexto enviado ao assistente
          </h3>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <dt className="text-slate-500">Empresa</dt>
              <dd className="font-medium text-[#111915] text-right">{empresaAtiva.nome}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <dt className="text-slate-500">Faturamento (mês)</dt>
              <dd className="font-mono tabular-nums text-[#15803D] font-semibold">
                {formatarMoedaBRL(finKpis.faturamentoBruto)}
              </dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <dt className="text-slate-500">Renda líquida (mês)</dt>
              <dd className="font-mono tabular-nums text-[#111915] font-semibold">
                {formatarMoedaBRL(finKpis.rendaLiquida)}
              </dd>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <dt className="text-slate-500">Tarefas em aberto</dt>
              <dd className="font-mono tabular-nums text-[#111915]">{kpis.tarefasAbertas}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Clientes ativos</dt>
              <dd className="font-mono tabular-nums text-[#111915]">{kpis.clientesAtivos}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-[#111915]">
            Solicitações sugeridas
          </h3>
          <div className="mt-3 space-y-2">
            {SUGESTOES_OPERACIONAIS.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => void enviarSolicitacao(sugestao)}
                disabled={enviando}
                className="w-full text-left p-3 text-xs text-slate-700 bg-[#F6F8F7] hover:bg-[#EAEFEC] border border-[#E2E8E4] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
