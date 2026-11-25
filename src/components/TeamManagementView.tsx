import {useEffect, useState, type FormEvent} from 'react';
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  MailPlus,
  Pencil,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  ConviteEmpresa,
  Empresa,
  PapelConvite,
  PapelEmpresa,
  UsuarioPerfil,
} from '../types/database';
import type {ResultadoCriacaoConvite} from '../services/workspaceRepository';
import {
  LABEL_PAPEL_EMPRESA,
  LABEL_PLANO_EMPRESA,
  LABEL_STATUS_CONVITE,
  podeAlterarPapel,
  podeEditarEmpresa,
  podeEditarPerfilAlvo,
  podeExcluirPerfilAlvo,
  podeGerenciarConvites,
  podeVerConvites,
} from '../utils/rolePermissions';
import {formatarDataBR} from '../utils/workspaceLogic';

interface TeamManagementViewProps {
  modoSupabase: boolean;
  empresaAtiva: Empresa;
  usuarioAtivo: UsuarioPerfil;
  membros: UsuarioPerfil[];
  convites: ConviteEmpresa[];
  onAtualizarEmpresa: (dados: {nome: string; segmento: string; cnpj?: string}) => Promise<void>;
  onAtualizarPerfil: (
    perfilId: string,
    dados: {nomeCompleto: string; cargo: string},
  ) => Promise<void>;
  onAlterarPapel: (alvoUsuarioId: string, novoPapel: PapelEmpresa) => Promise<void>;
  onExcluirMembro: (perfilId: string) => Promise<void>;
  onCriarConvite: (dados: {
    emailConvidado: string;
    cargo: string;
    papel: PapelConvite;
    diasValidade: number;
  }) => Promise<ResultadoCriacaoConvite | null>;
  onRevogarConvite: (conviteId: string) => Promise<void>;
  onExcluirConvite: (conviteId: string) => Promise<void>;
}

export function TeamManagementView({
  modoSupabase,
  empresaAtiva,
  usuarioAtivo,
  membros,
  convites,
  onAtualizarEmpresa,
  onAtualizarPerfil,
  onAlterarPapel,
  onExcluirMembro,
  onCriarConvite,
  onRevogarConvite,
  onExcluirConvite,
}: TeamManagementViewProps) {
  const [nomeEmpresa, setNomeEmpresa] = useState(empresaAtiva.nome);
  const [segmentoEmpresa, setSegmentoEmpresa] = useState(empresaAtiva.segmento);
  const [cnpjEmpresa, setCnpjEmpresa] = useState(empresaAtiva.cnpj ?? '');
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [feedbackEmpresa, setFeedbackEmpresa] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Edição de membro
  const [editandoMembroId, setEditandoMembroId] = useState<string | null>(null);
  const [editNomeMembro, setEditNomeMembro] = useState('');
  const [editCargoMembro, setEditCargoMembro] = useState('');
  const [salvandoMembro, setSalvandoMembro] = useState(false);

  // Confirmação explícita de alteração de papel
  const [papelPendentePorId, setPapelPendentePorId] = useState<Record<string, PapelEmpresa>>({});
  const [alterandoPapelId, setAlterandoPapelId] = useState<string | null>(null);

  // Convite
  const [emailConvite, setEmailConvite] = useState('');
  const [cargoConvite, setCargoConvite] = useState('Analista');
  const [papelConvite, setPapelConvite] = useState<PapelConvite>('membro');
  const [diasValidade, setDiasValidade] = useState(7);
  const [criandoConvite, setCriandoConvite] = useState(false);
  const [ultimoConvite, setUltimoConvite] = useState<ResultadoCriacaoConvite | null>(null);
  const [tokenCopiado, setTokenCopiado] = useState(false);

  useEffect(() => {
    setNomeEmpresa(empresaAtiva.nome);
    setSegmentoEmpresa(empresaAtiva.segmento);
    setCnpjEmpresa(empresaAtiva.cnpj ?? '');
    setFeedbackEmpresa(null);
  }, [empresaAtiva]);

  const podeEditarEmp = podeEditarEmpresa(usuarioAtivo.papel);
  const podeVerListaConvites = podeVerConvites(usuarioAtivo.papel);
  const podeConvidarERevogar = podeGerenciarConvites(usuarioAtivo.papel);
  const podeMudarPapel = podeAlterarPapel(usuarioAtivo.papel);

  async function handleSalvarEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!podeEditarEmp || salvandoEmpresa) return;
    setErroGeral(null);
    setFeedbackEmpresa(null);

    if (nomeEmpresa.trim().length < 2) {
      setErroGeral('Informe um nome válido com pelo menos 2 caracteres para a empresa.');
      return;
    }

    setSalvandoEmpresa(true);
    try {
      await onAtualizarEmpresa({
        nome: nomeEmpresa.trim(),
        segmento: segmentoEmpresa.trim() || 'Serviços',
        cnpj: cnpjEmpresa.trim() || undefined,
      });
      setFeedbackEmpresa('Dados da empresa atualizados.');
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Falha ao atualizar empresa.');
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  function iniciarEdicaoMembro(membro: UsuarioPerfil) {
    setEditandoMembroId(membro.id);
    setEditNomeMembro(membro.nomeCompleto);
    setEditCargoMembro(membro.cargo);
    setErroGeral(null);
  }

  async function handleSalvarEdicaoMembro(perfilId: string) {
    if (salvandoMembro) return;
    setErroGeral(null);
    if (!editNomeMembro.trim() || !editCargoMembro.trim()) {
      setErroGeral('Informe nome completo e cargo.');
      return;
    }

    setSalvandoMembro(true);
    try {
      await onAtualizarPerfil(perfilId, {
        nomeCompleto: editNomeMembro.trim(),
        cargo: editCargoMembro.trim(),
      });
      setEditandoMembroId(null);
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Falha ao atualizar membro.');
    } finally {
      setSalvandoMembro(false);
    }
  }

  async function handleConfirmarAlteracaoPapel(membro: UsuarioPerfil) {
    const novoPapel = papelPendentePorId[membro.id];
    if (!novoPapel || novoPapel === membro.papel || alterandoPapelId) return;
    setErroGeral(null);
    setAlterandoPapelId(membro.id);
    try {
      await onAlterarPapel(membro.id, novoPapel);
      setPapelPendentePorId((prev) => {
        const next = {...prev};
        delete next[membro.id];
        return next;
      });
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Não foi possível alterar o papel.');
    } finally {
      setAlterandoPapelId(null);
    }
  }

  async function handleSubmitConvite(e: FormEvent) {
    e.preventDefault();
    if (!podeConvidarERevogar || criandoConvite) return;
    setErroGeral(null);
    setUltimoConvite(null);
    setTokenCopiado(false);

    if (!emailConvite.trim()) {
      setErroGeral('Informe o e-mail do convidado.');
      return;
    }

    setCriandoConvite(true);
    try {
      const res = await onCriarConvite({
        emailConvidado: emailConvite.trim().toLowerCase(),
        cargo: cargoConvite.trim() || (papelConvite === 'gerente' ? 'Gerente' : 'Membro'),
        papel: papelConvite,
        diasValidade,
      });
      if (res) {
        setUltimoConvite(res);
        if (res.conviteCriado) {
          setEmailConvite('');
        }
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : 'Falha ao criar convite.');
    } finally {
      setCriandoConvite(false);
    }
  }

  async function handleCopiarToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopiado(true);
      setTimeout(() => setTokenCopiado(false), 2500);
    } catch {
      setTokenCopiado(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {erroGeral && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
        >
          {erroGeral}
        </div>
      )}

      {/* Dados cadastrais da empresa */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8E4]">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#111915]">
                Dados da empresa
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seu papel atual: <strong>{LABEL_PAPEL_EMPRESA[usuarioAtivo.papel]}</strong> · Plano{' '}
                <strong>{LABEL_PLANO_EMPRESA[empresaAtiva.plano]}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Desde {formatarDataBR(empresaAtiva.criadoEm)}
          </span>
        </div>

        <form onSubmit={handleSalvarEmpresa} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="emp-nome" className="block text-xs font-medium text-slate-700 mb-1">
                Nome da empresa
              </label>
              <input
                id="emp-nome"
                type="text"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                disabled={!podeEditarEmp}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>

            <div>
              <label htmlFor="emp-seg" className="block text-xs font-medium text-slate-700 mb-1">
                Segmento
              </label>
              <input
                id="emp-seg"
                type="text"
                value={segmentoEmpresa}
                onChange={(e) => setSegmentoEmpresa(e.target.value)}
                disabled={!podeEditarEmp}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>

            <div>
              <label htmlFor="emp-cnpj" className="block text-xs font-medium text-slate-700 mb-1">
                CNPJ
              </label>
              <input
                id="emp-cnpj"
                type="text"
                value={cnpjEmpresa}
                onChange={(e) => setCnpjEmpresa(e.target.value)}
                disabled={!podeEditarEmp}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {podeEditarEmp
                ? 'Administradores e gerentes podem atualizar nome, segmento e CNPJ. Alteração de plano é protegida no servidor.'
                : 'Apenas administradores e gerentes podem editar dados cadastrais da empresa.'}
            </p>
            {podeEditarEmp && (
              <button
                type="submit"
                disabled={salvandoEmpresa}
                className="px-4 py-2 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {salvandoEmpresa ? 'Salvando...' : 'Salvar dados da empresa'}
              </button>
            )}
          </div>

          {feedbackEmpresa && (
            <p className="text-xs font-medium text-[#15803D]">{feedbackEmpresa}</p>
          )}
        </form>
      </section>

      {/* Membros da empresa */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-display text-base font-semibold text-[#111915]">
                Membros da equipe
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {membros.length} {membros.length === 1 ? 'usuário vinculado' : 'usuários vinculados'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8E4] bg-[#F8FAF9] text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Nome e e-mail</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Papel</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {membros.map((membro) => {
                const emEdicao = editandoMembroId === membro.id;
                const podeEditar = podeEditarPerfilAlvo(
                  usuarioAtivo.papel,
                  usuarioAtivo.id,
                  membro.id,
                  membro.papel,
                );
                const podeExcluir = podeExcluirPerfilAlvo(
                  usuarioAtivo.papel,
                  usuarioAtivo.id,
                  membro.id,
                  membro.papel,
                );
                const papelSelecionado = papelPendentePorId[membro.id] ?? membro.papel;
                const papelAlterado = papelSelecionado !== membro.papel;

                return (
                  <tr key={membro.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-3 px-4">
                      {emEdicao ? (
                        <input
                          type="text"
                          aria-label={`Editar nome de ${membro.nomeCompleto}`}
                          value={editNomeMembro}
                          onChange={(e) => setEditNomeMembro(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                        />
                      ) : (
                        <>
                          <p className="font-medium text-[#111915]">
                            {membro.nomeCompleto}
                            {membro.id === usuarioAtivo.id && (
                              <span className="ml-2 text-xs font-normal text-[#15803D]">(você)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{membro.email}</p>
                        </>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-700">
                      {emEdicao ? (
                        <input
                          type="text"
                          aria-label={`Editar cargo de ${membro.nomeCompleto}`}
                          value={editCargoMembro}
                          onChange={(e) => setEditCargoMembro(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                        />
                      ) : (
                        membro.cargo
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {podeMudarPapel && membro.id !== usuarioAtivo.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Papel de ${membro.nomeCompleto}`}
                            value={papelSelecionado}
                            onChange={(e) =>
                              setPapelPendentePorId((prev) => ({
                                ...prev,
                                [membro.id]: e.target.value as PapelEmpresa,
                              }))
                            }
                            className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                          >
                            <option value="membro">Membro</option>
                            <option value="gerente">Gerente</option>
                            <option value="admin">Administrador</option>
                          </select>
                          {papelAlterado && (
                            <button
                              type="button"
                              onClick={() => void handleConfirmarAlteracaoPapel(membro)}
                              disabled={alterandoPapelId === membro.id}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-md cursor-pointer whitespace-nowrap"
                            >
                              {alterandoPapelId === membro.id ? 'Aplicando...' : 'Confirmar'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <ShieldCheck
                            className={`w-3.5 h-3.5 ${
                              membro.papel === 'admin'
                                ? 'text-[#15803D]'
                                : membro.papel === 'gerente'
                                  ? 'text-amber-700'
                                  : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          {LABEL_PAPEL_EMPRESA[membro.papel]}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {emEdicao ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSalvarEdicaoMembro(membro.id)}
                              disabled={salvandoMembro}
                              aria-label={`Salvar perfil de ${membro.nomeCompleto}`}
                              className="p-1.5 text-[#15803D] hover:bg-emerald-50 rounded-md cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoMembroId(null)}
                              aria-label="Cancelar edição"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {podeEditar && (
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoMembro(membro)}
                                aria-label={`Editar ${membro.nomeCompleto}`}
                                className="p-1.5 text-slate-400 hover:text-[#15803D] rounded-md cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {podeExcluir && (
                              <button
                                type="button"
                                onClick={() => void onExcluirMembro(membro.id)}
                                aria-label={`Remover ${membro.nomeCompleto}`}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Convites de empresa (visível para admin e gerente; emissão/revogação exclusiva de admin) */}
      {podeVerListaConvites && (
        <section className="bg-white border border-[#E2E8E4] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <MailPlus className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-display text-base font-semibold text-[#111915]">
                Convites para novos membros
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {podeConvidarERevogar
                  ? 'Emita um token de convite seguro para que o colaborador crie conta e aceite o vínculo.'
                  : 'Visualização de convites emitidos pela administração.'}
              </p>
            </div>
          </div>

          {!modoSupabase ? (
            <p className="text-xs text-slate-600 bg-[#F6F8F7] border border-[#E2E8E4] rounded-lg p-3.5">
              Em Modo Demonstração os convites com token SHA-256 permanecem desativados. Quando
              conectado ao Supabase, administradores geram tokens reais validados no servidor via{' '}
              <code className="font-mono">criar_convite_empresa()</code>.
            </p>
          ) : (
            <>
              {podeConvidarERevogar && (
                <form
                  onSubmit={handleSubmitConvite}
                  className="p-4 bg-[#F6F8F7] border border-[#E2E8E4] rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="conv-email"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        E-mail do convidado *
                      </label>
                      <input
                        id="conv-email"
                        type="email"
                        value={emailConvite}
                        onChange={(e) => setEmailConvite(e.target.value)}
                        placeholder="colaborador@empresa.com.br"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="conv-cargo"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Cargo
                      </label>
                      <input
                        id="conv-cargo"
                        type="text"
                        value={cargoConvite}
                        onChange={(e) => setCargoConvite(e.target.value)}
                        placeholder="Analista / Gerente"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="conv-papel"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Papel inicial
                      </label>
                      <select
                        id="conv-papel"
                        value={papelConvite}
                        onChange={(e) => setPapelConvite(e.target.value as PapelConvite)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                      >
                        <option value="membro">Membro</option>
                        <option value="gerente">Gerente</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <label htmlFor="conv-dias">Validade (dias):</label>
                      <input
                        id="conv-dias"
                        type="number"
                        min={1}
                        max={30}
                        value={diasValidade}
                        onChange={(e) => setDiasValidade(Number(e.target.value) || 7)}
                        className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 rounded-md bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={criandoConvite}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{criandoConvite ? 'Gerando...' : 'Gerar token de convite'}</span>
                    </button>
                  </div>
                </form>
              )}

              {ultimoConvite && (
                <div
                  role="status"
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    ultimoConvite.conviteCriado
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <p className="font-semibold">{ultimoConvite.mensagem}</p>
                  {ultimoConvite.conviteCriado && ultimoConvite.tokenConvite && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-emerald-200 rounded-lg p-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500">
                          Token único para <strong>{ultimoConvite.emailConvidado}</strong> (envie
                          com segurança; não pode ser recuperado depois):
                        </p>
                        <p className="font-mono text-xs text-[#111915] break-all mt-1">
                          {ultimoConvite.tokenConvite}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopiarToken(ultimoConvite.tokenConvite!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#15803D] border border-emerald-300 hover:bg-emerald-50 rounded-md shrink-0 cursor-pointer"
                      >
                        {tokenCopiado ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar token</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {convites.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Nenhum convite registrado para esta empresa.
                </p>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8E4] rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8E4] bg-[#F8FAF9] text-xs font-medium text-slate-500">
                        <th className="py-2.5 px-4">E-mail convidado</th>
                        <th className="py-2.5 px-4">Cargo / Papel</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Expira em</th>
                        {podeConvidarERevogar && <th className="py-2.5 px-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {convites.map((conv) => (
                        <tr key={conv.id} className="hover:bg-[#F8FAF9]">
                          <td className="py-2.5 px-4 font-medium text-[#111915]">
                            {conv.emailConvidado}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {conv.cargo} · {LABEL_PAPEL_EMPRESA[conv.papel]}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-700">
                            {LABEL_STATUS_CONVITE[conv.status]}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                            {formatarDataBR(conv.expiraEm.slice(0, 10))}
                          </td>
                          {podeConvidarERevogar && (
                            <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-2">
                              {conv.status === 'pendente' && (
                                <button
                                  type="button"
                                  onClick={() => void onRevogarConvite(conv.id)}
                                  className="text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
                                >
                                  Revogar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void onExcluirConvite(conv.id)}
                                aria-label={`Excluir convite de ${conv.emailConvidado}`}
                                className="text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                Excluir
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
