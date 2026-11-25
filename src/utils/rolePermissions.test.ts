import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gerarOpcoesPeriodo,
  podeAlterarPapel,
  podeEditarEmpresa,
  podeEditarPerfilAlvo,
  podeExcluirPerfilAlvo,
  podeGerenciarConvites,
  podeVerConvites,
  traduzirErroSupabase,
} from './rolePermissions';

test('regras de permissão espelham exatamente admin, gerente e membro do Supabase', () => {
  assert.equal(podeEditarEmpresa('admin'), true);
  assert.equal(podeEditarEmpresa('gerente'), true);
  assert.equal(podeEditarEmpresa('membro'), false);

  assert.equal(podeVerConvites('admin'), true);
  assert.equal(podeVerConvites('gerente'), true);
  assert.equal(podeVerConvites('membro'), false);

  assert.equal(podeGerenciarConvites('admin'), true);
  assert.equal(podeGerenciarConvites('gerente'), false);
  assert.equal(podeGerenciarConvites('membro'), false);

  assert.equal(podeAlterarPapel('admin'), true);
  assert.equal(podeAlterarPapel('gerente'), false);
  assert.equal(podeAlterarPapel('membro'), false);
});

test('podeEditarPerfilAlvo protege admins contra edição por gerentes e permite autoedição', () => {
  assert.equal(podeEditarPerfilAlvo('membro', 'u1', 'u1', 'membro'), true);
  assert.equal(podeEditarPerfilAlvo('membro', 'u1', 'u2', 'membro'), false);

  assert.equal(podeEditarPerfilAlvo('gerente', 'g1', 'm1', 'membro'), true);
  assert.equal(podeEditarPerfilAlvo('gerente', 'g1', 'g2', 'gerente'), true);
  assert.equal(podeEditarPerfilAlvo('gerente', 'g1', 'a1', 'admin'), false);

  assert.equal(podeEditarPerfilAlvo('admin', 'a1', 'a2', 'admin'), true);
  assert.equal(podeEditarPerfilAlvo('admin', 'a1', 'm1', 'membro'), true);
});

test('podeExcluirPerfilAlvo permite apenas admin excluir gerentes e membros, nunca a si ou outros admins', () => {
  assert.equal(podeExcluirPerfilAlvo('admin', 'a1', 'm1', 'membro'), true);
  assert.equal(podeExcluirPerfilAlvo('admin', 'a1', 'g1', 'gerente'), true);
  assert.equal(podeExcluirPerfilAlvo('admin', 'a1', 'a1', 'admin'), false);
  assert.equal(podeExcluirPerfilAlvo('admin', 'a1', 'a2', 'admin'), false);
  assert.equal(podeExcluirPerfilAlvo('gerente', 'g1', 'm1', 'membro'), false);
  assert.equal(podeExcluirPerfilAlvo('membro', 'm1', 'm2', 'membro'), false);
});

test('gerarOpcoesPeriodo inclui mês atual, meses anteriores e meses com dados em ordem decrescente', () => {
  const opcoes = gerarOpcoesPeriodo('2026-11', ['2026-12-05', '2026-06-20', '2026-11-10']);
  assert.equal(opcoes[0].valor, '2026-12');
  assert.equal(opcoes[1].valor, '2026-11');
  assert.ok(opcoes.some((o) => o.valor === '2026-06'));
  assert.equal(opcoes[opcoes.length - 1].valor, 'todos');
});

test('traduzirErroSupabase converte erros comuns de autenticação e RLS em português claro', () => {
  assert.match(
    traduzirErroSupabase(new Error('Invalid login credentials')),
    /E-mail ou senha incorretos/,
  );
  assert.match(
    traduzirErroSupabase(new Error('Email not confirmed')),
    /Confirme seu e-mail/,
  );
  assert.match(
    traduzirErroSupabase(new Error('new row violates row-level security policy')),
    /não tem permissão/,
  );
});
