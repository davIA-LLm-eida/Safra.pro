import test from 'node:test';
import assert from 'node:assert/strict';
import {pathnameParaSecao, resolverSecaoPermitida, secaoParaPathname} from './routes';

test('mapeia pathnames para seções ativas e vice-versa', () => {
  assert.equal(pathnameParaSecao('/'), 'dashboard');
  assert.equal(pathnameParaSecao('/dashboard'), 'dashboard');
  assert.equal(pathnameParaSecao('/financeiro/'), 'financeiro');
  assert.equal(pathnameParaSecao('/principal'), 'principal');
  assert.equal(pathnameParaSecao('/rota-inexistente'), 'dashboard');

  assert.equal(secaoParaPathname('dashboard'), '/');
  assert.equal(secaoParaPathname('financeiro'), '/financeiro');
  assert.equal(secaoParaPathname('principal'), '/principal');
});

test('resolverSecaoPermitida protege /principal para não-principais e isola principal sem empresa', () => {
  // Usuário comum de empresa não acessa /principal
  assert.equal(
    resolverSecaoPermitida('principal', {
      autenticado: true,
      temEmpresa: true,
      isPrincipal: false,
    }),
    'dashboard',
  );

  // Usuário comum acessa rotas da empresa normalmente
  assert.equal(
    resolverSecaoPermitida('financeiro', {
      autenticado: true,
      temEmpresa: true,
      isPrincipal: false,
    }),
    'financeiro',
  );

  // Principal sem empresa não acessa rotas operacionais de empresa
  assert.equal(
    resolverSecaoPermitida('financeiro', {
      autenticado: true,
      temEmpresa: false,
      isPrincipal: true,
    }),
    'principal',
  );

  // Principal sem empresa acessa /principal e /integracao
  assert.equal(
    resolverSecaoPermitida('principal', {
      autenticado: true,
      temEmpresa: false,
      isPrincipal: true,
    }),
    'principal',
  );
  assert.equal(
    resolverSecaoPermitida('integracao', {
      autenticado: true,
      temEmpresa: false,
      isPrincipal: true,
    }),
    'integracao',
  );
});
