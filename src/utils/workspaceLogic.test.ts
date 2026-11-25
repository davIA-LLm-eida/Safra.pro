import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularDashboardKPIs,
  calcularKPIsFinanceiros,
  calcularProgressoProcesso,
  calcularResumoPorCategoria,
  calcularSerieMensalFinanceira,
  filtrarEOrdenarTarefas,
  filtrarLancamentosFinanceiros,
  filtrarPorEmpresa,
  formatarDataBR,
  formatarMoedaBRL,
  isTarefaAtrasada,
  obterIniciais,
} from './workspaceLogic';
import {
  DEMO_CLIENTES,
  DEMO_LANCAMENTOS,
  DEMO_PROCESSOS,
  DEMO_TAREFAS,
  DEMO_VENDAS,
} from '../data/mockData';

test('filtrarPorEmpresa isola estritamente os registros da empresa selecionada', () => {
  const tarefasHorizonte = filtrarPorEmpresa(DEMO_TAREFAS, 'emp-horizonte');
  const tarefasPaulista = filtrarPorEmpresa(DEMO_TAREFAS, 'emp-paulista');

  assert.equal(tarefasHorizonte.length, 6);
  assert.equal(tarefasPaulista.length, 2);
  assert.ok(tarefasHorizonte.every((t) => t.empresaId === 'emp-horizonte'));
  assert.ok(tarefasPaulista.every((t) => t.empresaId === 'emp-paulista'));
});

test('isTarefaAtrasada detecta prazo vencido apenas quando não concluída', () => {
  const atrasada = DEMO_TAREFAS[0]; // prazo 2026-11-24, em_andamento
  const concluida = DEMO_TAREFAS[4]; // prazo 2026-11-20, concluida

  assert.equal(isTarefaAtrasada(atrasada, '2026-11-25'), true);
  assert.equal(isTarefaAtrasada(atrasada, '2026-11-24'), false);
  assert.equal(isTarefaAtrasada(concluida, '2026-11-25'), false);
});

test('calcularProgressoProcesso calcula percentual arredondado corretamente', () => {
  assert.equal(calcularProgressoProcesso([]), 0);
  assert.equal(calcularProgressoProcesso(DEMO_PROCESSOS[0].etapas), 50); // 2 de 4
  assert.equal(calcularProgressoProcesso(DEMO_PROCESSOS[1].etapas), 75); // 3 de 4
});

test('calcularDashboardKPIs agrega indicadores somente da empresa ativa', () => {
  const kpis = calcularDashboardKPIs(
    DEMO_TAREFAS,
    DEMO_CLIENTES,
    DEMO_PROCESSOS,
    'emp-horizonte',
    '2026-11-25',
  );

  assert.equal(kpis.tarefasAbertas, 4);
  assert.equal(kpis.tarefasConcluidas, 2);
  assert.equal(kpis.tarefasAtrasadas, 2);
  assert.equal(kpis.clientesAtivos, 3);
  assert.equal(kpis.processosAtivos, 2);
  assert.equal(kpis.taxaConclusao, 33);
});

test('calcularKPIsFinanceiros calcula faturamento, despesas, renda líquida e pipeline por empresa', () => {
  const finHorizonteNov = calcularKPIsFinanceiros(
    DEMO_LANCAMENTOS,
    DEMO_VENDAS,
    'emp-horizonte',
    '2026-11',
  );

  // Receitas Nov: 28500 + 16800 + 19400 = 64700
  // Despesas Nov: 22400 + 7800 + 4650 + 5120 = 39970
  // Renda líquida Nov: 24730
  assert.equal(finHorizonteNov.faturamentoBruto, 64700);
  assert.equal(finHorizonteNov.receitaRecebida, 45300);
  assert.equal(finHorizonteNov.aReceber, 19400);
  assert.equal(finHorizonteNov.despesasTotais, 39970);
  assert.equal(finHorizonteNov.rendaLiquida, 24730);
  assert.equal(finHorizonteNov.margemLiquidaPct, 38);
  assert.equal(finHorizonteNov.vendasFechadasQtd, 3);
  assert.equal(finHorizonteNov.vendasFechadasValor, 62100);
  assert.equal(finHorizonteNov.ticketMedio, 20700);
  assert.equal(finHorizonteNov.pipelineAbertoValor, 33800);

  const finPaulistaNov = calcularKPIsFinanceiros(
    DEMO_LANCAMENTOS,
    DEMO_VENDAS,
    'emp-paulista',
    '2026-11',
  );
  assert.equal(finPaulistaNov.faturamentoBruto, 42900);
  assert.equal(finPaulistaNov.despesasTotais, 22800);
  assert.equal(finPaulistaNov.rendaLiquida, 20100);
});

test('calcularSerieMensalFinanceira retorna últimos 6 meses ordenados cronologicamente', () => {
  const serie = calcularSerieMensalFinanceira(DEMO_LANCAMENTOS, 'emp-horizonte', 6);
  assert.equal(serie.length, 6);
  assert.equal(serie[0].mes, '2026-06');
  assert.equal(serie[5].mes, '2026-11');
  assert.equal(serie[5].receitas, 64700);
  assert.equal(serie[5].despesas, 39970);
  assert.equal(serie[5].rendaLiquida, 24730);
});

test('filtrarLancamentosFinanceiros e calcularResumoPorCategoria filtram corretamente', () => {
  const filtrados = filtrarLancamentosFinanceiros(DEMO_LANCAMENTOS, 'emp-horizonte', {
    busca: 'techcorp',
    periodoMes: '2026-11',
    tipo: 'receita',
    status: 'pendente',
  });
  assert.equal(filtrados.length, 1);
  assert.equal(filtrados[0].id, 'fin-h-11r3');

  const categorias = calcularResumoPorCategoria(
    DEMO_LANCAMENTOS,
    'emp-horizonte',
    'receita',
    '2026-11',
  );
  assert.equal(categorias.length, 3);
  assert.equal(categorias[0].categoria, 'Exames Ocupacionais');
  assert.equal(categorias[0].total, 28500);
});

test('filtrarEOrdenarTarefas aplica busca, status, prioridade e ordena pendentes antes de concluídas', () => {
  const resultado = filtrarEOrdenarTarefas(DEMO_TAREFAS, 'emp-horizonte', {
    busca: 'lucas',
    status: 'todos',
    prioridade: 'todas',
  });

  assert.equal(resultado.length, 2);
  assert.equal(resultado[0].id, 'tar-1');
  assert.equal(resultado[1].id, 'tar-5');
});

test('formatadores auxiliares convertem datas, moeda BRL e geram iniciais corretamente', () => {
  assert.equal(formatarDataBR('2026-11-25'), '25/11/2026');
  assert.ok(formatarMoedaBRL(1250.5).includes('1.250,50'));
  assert.equal(obterIniciais('Clínica Horizonte Saúde'), 'CS');
  assert.equal(obterIniciais('safra.pro'), 'SA');
});
