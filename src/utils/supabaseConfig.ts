export type StatusVariavelAmbiente = 'configurada' | 'invalida' | 'ausente';

export interface DiagnosticoConfiguracaoSupabase {
  urlDefinida: boolean;
  urlValida: boolean;
  urlEhDashboard: boolean;
  urlSemProtocolo: boolean;
  urlPreviewSeguro: string | null;
  statusUrl: StatusVariavelAmbiente;
  mensagemUrl: string;
  chaveAnonDefinida: boolean;
  chavePareceSecreta: boolean;
  chaveValidaParaFrontend: boolean;
  statusChave: StatusVariavelAmbiente;
  mensagemChave: string;
  configurado: boolean;
  motivoBloqueio: string | null;
}

const REGEX_DASHBOARD_SUPABASE = /(^|\/\/|\.)s?upabase\.com\/dashboard/i;

function limparValorEnv(valor?: string): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function validarConfiguracaoSupabase(
  rawUrl?: string,
  rawAnonKey?: string,
): DiagnosticoConfiguracaoSupabase {
  const url = limparValorEnv(rawUrl);
  const anonKey = limparValorEnv(rawAnonKey);

  const urlDefinida = url.length > 0;
  let urlValida = false;
  let urlEhDashboard = false;
  let urlSemProtocolo = false;
  let urlPreviewSeguro: string | null = null;
  let statusUrl: StatusVariavelAmbiente = 'ausente';
  let mensagemUrl = 'Não definida no ambiente';

  if (urlDefinida) {
    urlEhDashboard = REGEX_DASHBOARD_SUPABASE.test(url);
    urlSemProtocolo = !/^https?:\/\//i.test(url);

    if (urlEhDashboard) {
      statusUrl = 'invalida';
      mensagemUrl = 'Definida como URL do painel, não da API';
      urlPreviewSeguro = url.length > 64 ? `${url.slice(0, 64)}...` : url;
    } else {
      try {
        const parsed = new URL(url);
        const protocoloValido =
          parsed.protocol === 'https:' || parsed.protocol === 'http:';
        if (protocoloValido && parsed.hostname.includes('.')) {
          urlValida = true;
          statusUrl = 'configurada';
          mensagemUrl = 'Configurada e válida';
          urlPreviewSeguro = parsed.origin;
        } else {
          statusUrl = 'invalida';
          mensagemUrl = 'URL incompleta ou sem domínio válido';
          urlPreviewSeguro = url.length > 64 ? `${url.slice(0, 64)}...` : url;
        }
      } catch {
        statusUrl = 'invalida';
        mensagemUrl = urlSemProtocolo
          ? 'Protocolo https:// ausente ou URL malformada'
          : 'Formato de URL inválido';
        urlPreviewSeguro = url.length > 64 ? `${url.slice(0, 64)}...` : url;
      }
    }
  }

  const chaveAnonDefinida = anonKey.length > 0;
  const chavePareceSecreta =
    /^sb_secret_/i.test(anonKey) || /service_role/i.test(anonKey);
  const chaveValidaParaFrontend = chaveAnonDefinida && !chavePareceSecreta;

  let statusChave: StatusVariavelAmbiente = 'ausente';
  let mensagemChave = 'Não definida no ambiente';

  if (chaveAnonDefinida) {
    if (chavePareceSecreta) {
      statusChave = 'invalida';
      mensagemChave = 'Chave secreta detectada (uso proibido no frontend)';
    } else {
      statusChave = 'configurada';
      mensagemChave = 'Configurada (chave pública)';
    }
  }

  const configurado = urlValida && chaveValidaParaFrontend;

  let motivoBloqueio: string | null = null;
  if (!urlDefinida && !chaveAnonDefinida) {
    motivoBloqueio =
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram encontradas em import.meta.env.';
  } else if (!urlDefinida) {
    motivoBloqueio = 'VITE_SUPABASE_URL não está definida no ambiente.';
  } else if (urlEhDashboard) {
    motivoBloqueio =
      'VITE_SUPABASE_URL aponta para o painel web do Supabase em vez da Project URL da API (formato esperado: https://<ref-do-projeto>.supabase.co em Project Settings → Data API).';
  } else if (!urlValida) {
    motivoBloqueio =
      'VITE_SUPABASE_URL está definida com formato inválido. Utilize a URL HTTPS completa do projeto (ex.: https://<ref-do-projeto>.supabase.co).';
  } else if (!chaveAnonDefinida) {
    motivoBloqueio = 'VITE_SUPABASE_ANON_KEY não está definida no ambiente.';
  } else if (chavePareceSecreta) {
    motivoBloqueio =
      'VITE_SUPABASE_ANON_KEY contém uma chave secreta (service_role / sb_secret_). Substitua pela chave pública (Publishable / anon key).';
  }

  return {
    urlDefinida,
    urlValida,
    urlEhDashboard,
    urlSemProtocolo,
    urlPreviewSeguro,
    statusUrl,
    mensagemUrl,
    chaveAnonDefinida,
    chavePareceSecreta,
    chaveValidaParaFrontend,
    statusChave,
    mensagemChave,
    configurado,
    motivoBloqueio,
  };
}
