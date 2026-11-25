import test from 'node:test';
import assert from 'node:assert/strict';
import {validarConfiguracaoSupabase} from './supabaseConfig';

test('detecta variáveis ausentes corretamente', () => {
  const res = validarConfiguracaoSupabase('', '');
  assert.equal(res.urlDefinida, false);
  assert.equal(res.chaveAnonDefinida, false);
  assert.equal(res.statusUrl, 'ausente');
  assert.equal(res.statusChave, 'ausente');
  assert.equal(res.configurado, false);
  assert.ok(res.motivoBloqueio);
});

test('detecta URL malformada ou de painel do Supabase em vez de mascarar como ausente', () => {
  const res = validarConfiguracaoSupabase(
    'upabase.com/dashboard/project/exemplo123',
    'sb_publishable_abc123',
  );
  assert.equal(res.urlDefinida, true);
  assert.equal(res.urlValida, false);
  assert.equal(res.urlEhDashboard, true);
  assert.equal(res.urlSemProtocolo, true);
  assert.equal(res.statusUrl, 'invalida');
  assert.equal(res.chaveAnonDefinida, true);
  assert.equal(res.chaveValidaParaFrontend, true);
  assert.equal(res.statusChave, 'configurada');
  assert.equal(res.configurado, false);
  assert.match(res.motivoBloqueio ?? '', /Project Settings/i);
});

test('detecta URL completa de dashboard do Supabase como inválida para API', () => {
  const res = validarConfiguracaoSupabase(
    'https://supabase.com/dashboard/project/exemplo123',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  );
  assert.equal(res.urlDefinida, true);
  assert.equal(res.urlValida, false);
  assert.equal(res.urlEhDashboard, true);
  assert.equal(res.configurado, false);
});

test('bloqueia chave secreta no frontend sem expor valor', () => {
  const res = validarConfiguracaoSupabase(
    'https://exemplo123.supabase.co',
    'sb_secret_nao_usar_no_browser',
  );
  assert.equal(res.urlValida, true);
  assert.equal(res.chaveAnonDefinida, true);
  assert.equal(res.chavePareceSecreta, true);
  assert.equal(res.chaveValidaParaFrontend, false);
  assert.equal(res.statusChave, 'invalida');
  assert.equal(res.configurado, false);
});

test('valida configuração completa com Project URL HTTPS e chave pública', () => {
  const res = validarConfiguracaoSupabase(
    'https://exemplo123.supabase.co/',
    'sb_publishable_chave_publica_valida',
  );
  assert.equal(res.urlDefinida, true);
  assert.equal(res.urlValida, true);
  assert.equal(res.urlEhDashboard, false);
  assert.equal(res.urlPreviewSeguro, 'https://exemplo123.supabase.co');
  assert.equal(res.statusUrl, 'configurada');
  assert.equal(res.chaveAnonDefinida, true);
  assert.equal(res.chaveValidaParaFrontend, true);
  assert.equal(res.statusChave, 'configurada');
  assert.equal(res.configurado, true);
  assert.equal(res.motivoBloqueio, null);
});
