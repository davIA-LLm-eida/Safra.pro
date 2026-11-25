import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getConfiguredGeminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key;
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/ai/status', (_req, res) => {
    const configured = Boolean(getConfiguredGeminiKey());
    res.json({
      configured,
      model: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/ai/assist', async (req, res) => {
    const apiKey = getConfiguredGeminiKey();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Chave da API Gemini não configurada no servidor. Configure GEMINI_API_KEY nas variáveis de ambiente para ativar o assistente.',
      });
      return;
    }

    const {prompt, context} = req.body as {
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
    };

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({
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

      res.json({
        reply: response.text ?? '',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido ao consultar o serviço de IA.';
      res.status(502).json({
        error: `Falha ao consultar o assistente de IA: ${message}`,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Safra.pro disponível em http://localhost:${PORT} (bind 0.0.0.0:${PORT})`);
  });
}

startServer();
