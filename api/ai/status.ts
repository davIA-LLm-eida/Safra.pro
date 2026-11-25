import type {IncomingMessage, ServerResponse} from 'node:http';

function getConfiguredGeminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key;
}

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: 'Método não permitido.'}));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      configured: Boolean(getConfiguredGeminiKey()),
      model: 'gemini-4-hydrogen',
    }),
  );
}
