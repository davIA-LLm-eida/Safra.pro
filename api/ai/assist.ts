import type {IncomingMessage, ServerResponse} from 'node:http';
import {GoogleGenAI} from '@google/genai';

function getConfiguredGeminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key;
}

interface AssistBody {
  prompt?: unknown;
  context?: {
    empresaNome?: string;
    segmento?: string;
    tarefasAbertas?: number;
    tarefasAtrasadas?: number;
    processosAtivos?: number;
    clientesAtivos?: number;
    faturamentoMes?: number;
    rendaLiquidaMes?: number;
  };
}

async function readJsonBody(req: IncomingMessage & {body?: unknown}): Promise<AssistBody> {
  if (req.body && typeof req.body === 'object') {
    return req.body as AssistBody;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as AssistBody;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as AssistBody;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: IncomingMessage & {body?: unknown},
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, {error: 'Método não permitido.'});
    return;
  }

  const apiKey = getConfiguredGeminiKey();
  if (!apiKey) {
    sendJson(res, 503, {
      error:
        'Chave da API Gemini não configurada no servidor. Configure GEMINI_API_KEY nas variáveis de ambiente para ativar o assistente.',
    });
    return;
  }

  let body: AssistBody;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, {error: 'Corpo JSON inválido.'});
    return;
  }

  const {prompt, context} = body;
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    sendJson(res, 400, {
      error: 'Informe uma solicitação válida para o assistente.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextSummary = context
      ? `Contexto atual da empresa:
- Empresa: ${context.empresaNome ?? 'Não informada'}
- Segmento: ${context.segmento ?? 'Geral'}
- Faturamento no mês (R$): ${context.faturamentoMes ?? 0}
- Renda líquida no mês (R$): ${context.rendaLiquidaMes ?? 0}
- Tarefas em aberto: ${context.tarefasAbertas ?? 0}
- Tarefas atrasadas: ${context.tarefasAtrasadas ?? 0}
- Processos ativos: ${context.processosAtivos ?? 0}
- Clientes ativos: ${context.clientesAtivos ?? 0}`
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `${contextSummary}\n\nSolicitação do usuário: ${prompt.trim()}`,
      config: {
        systemInstruction:
          'Você é um consultor operacional especializado em pequenas e médias empresas brasileiras. Responda sempre em português brasileiro de forma objetiva, prática e estruturada, com passos acionáveis para organização de processos, prioridades de tarefas e atendimento a clientes. Não invente dados que não foram fornecidos.',
      },
    });

    sendJson(res, 200, {
      reply: response.text ?? '',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido ao consultar o serviço de IA.';
    sendJson(res, 502, {
      error: `Falha ao consultar o assistente de IA: ${message}`,
    });
  }
}
