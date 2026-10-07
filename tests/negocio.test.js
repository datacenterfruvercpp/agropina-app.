// Pruebas de la lógica ERP (planilla, cuentas por cobrar, presupuesto, compras, kardex). Ejecutar con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/utils.js');
require('../js/catalog.js');
require('../js/agronomy.js');
require('../js/negocio.js');
const { utils: U, negocio: B } = globalThis.AP;

const hoy = '2026-10-07';
const T = [
  { id: 't1', nombre: 'Ana Mora', cuadrilla: 'A', tarifaJornal: 20 },
  { id: 't2', nombre: 'Luis Soto', cuadrilla: 'B', tarifaJornal: 25 }
];
const labor = (o) => Object.assign({ id: U.uid(), parcelaId: 'p1', estado: 'completada', fecha: '2026-10-05', jornales: 0, costoManoObra: 0, costoInsumos: 0, otrosCostos: 0, costoTotal: 0, trabajadores: [] }, o);

test('periodo: semana de lunes a domingo, quincenas y mes', () => {
  assert.deepEqual(B.periodo('semana', '2026-10-07'), { desde: '2026-10-05', hasta: '2026-10-11' });
  assert.deepEqual(B.periodo('semana', '2026-10-11'), { desde: '2026-10-05', hasta: '2026-10-11' });
  assert.deepEqual(B.periodo('quincena', '2026-10-15'), { desde: '2026-10-01', hasta: '2026-10-15' });
  assert.deepEqual(B.periodo('quincena', '2026-02-20'), { desde: '2026-02-16', hasta: '2026-02-28' });
  assert.deepEqual(B.periodo('mes', '2026-10-07'), { desde: '2026-10-01', hasta: '2026-10-31' });
});

test('planilla: solo labores realizadas del período, tarifa pactada y mano de obra sin asignar', () => {
  const labores = [
    labor({ fecha: '2026-10-05', trabajadores: [{ trabajadorId: 't1', jornales: 2, tarifa: 22 }, { trabajadorId: 't2', jornales: 1 }] }),
    labor({ fecha: '2026-10-06', trabajadores: [{ trabajadorId: 't1', jornales: 1.5 }] }),
    labor({ fecha: '2026-10-06', estado: 'pendiente', trabajadores: [{ trabajadorId: 't2', jornales: 5 }] }),
    labor({ fecha: '2026-09-30', trabajadores: [{ trabajadorId: 't2', jornales: 5 }] }),
    labor({ fecha: '2026-10-07', jornales: 3, costoManoObra: 60 })
  ];
  const r = B.planilla(labores, T, '2026-10-05', '2026-10-11');
  const ana = r.filas.find((f) => f.trabajadorId === 't1');
  const luis = r.filas.find((f) => f.trabajadorId === 't2');
  assert.equal(ana.jornales, 3.5);
  assert.equal(ana.monto, 2 * 22 + 1.5 * 20);
  assert.equal(ana.dias, 2);
  assert.equal(ana.labores, 2);
  assert.equal(luis.jornales, 1);
  assert.equal(luis.monto, 25);
  assert.equal(r.totalMonto, 74 + 25);
  assert.equal(r.sinAsignar, 60);
  assert.equal(r.sinAsignarJornales, 3);
  assert.equal(r.filas[0].trabajadorId, 't1', 'ordenado por monto descendente');
});

test('planilla: trabajador eliminado conserva el nombre guardado en la labor', () => {
  const r = B.planilla([labor({ trabajadores: [{ trabajadorId: 'tx', nombre: 'Pedro', jornales: 1, tarifa: 18 }] })], T, '2026-10-01', '2026-10-31');
  assert.equal(r.filas[0].nombre, 'Pedro');
  assert.equal(r.filas[0].monto, 18);
});

test('cuentas por cobrar: vencimiento por días de crédito del cliente y tramos de antigüedad', () => {
  const clientes = [{ id: 'c1', nombre: 'Exportadora Norte', diasCredito: 15 }];
  const cosechas = [
    { id: 'k1', clienteId: 'c1', fecha: '2026-09-01', toneladas: 10, precio: 300, estadoPago: 'pendiente', factura: 'FE-1' },
    { id: 'k2', clienteId: '', comprador: 'Feria', fecha: '2026-09-20', toneladas: 2, precio: 200, estadoPago: 'pendiente' },
    { id: 'k3', clienteId: 'c1', fecha: '2026-06-01', toneladas: 5, precio: 300, estadoPago: 'pagado' },
    { id: 'k4', clienteId: 'c1', fecha: '2026-05-01', toneladas: 1, precio: 100, estadoPago: 'pendiente' }
  ];
  const cxc = B.cuentasPorCobrar(cosechas, clientes, hoy);
  assert.equal(cxc.length, 3);
  const k1 = cxc.find((x) => x.cosechaId === 'k1');
  assert.equal(k1.vence, '2026-09-16');
  assert.equal(k1.diasVencido, 21);
  assert.equal(k1.tramo, 1);
  assert.equal(k1.monto, 3000);
  assert.equal(k1.documento, 'FE-1');
  const k2 = cxc.find((x) => x.cosechaId === 'k2');
  assert.equal(k2.cliente, 'Feria');
  assert.equal(k2.vence, '2026-10-20', 'sin cliente: 30 días de crédito');
  assert.equal(k2.tramo, 0);
  assert.equal(cxc[0].cosechaId, 'k4', 'el más atrasado primero');
  assert.equal(cxc[0].tramo, 4);
  const ag = B.antiguedad(cxc);
  assert.equal(ag[0].monto, 400);
  assert.equal(ag[1].monto, 3000);
  assert.equal(ag[4].n, 1);
});

test('tramos de antigüedad en los límites', () => {
  assert.deepEqual([0, 1, 30, 31, 60, 61, 90, 91].map(B.tramo), [0, 1, 1, 2, 2, 3, 3, 4]);
});

test('presupuesto vs real: esperado según avance del ciclo y semáforo por desvío', () => {
  const inicio = U.addDays(hoy, -240);
  const parcela = { id: 'p1', nombre: 'Lote 1', variedad: 'MD-2', hectareas: 2, ciclo: 1, fechaSiembra: inicio, fechaInicioCiclo: inicio, estado: 'activa', presupuestoHa: null };
  const defecto = { manoObra: 1000, insumos: 2000, otros: 0 };
  const sin = B.presupuestoVsReal([parcela], [], defecto, hoy)[0];
  assert.equal(sin.totalPresu, 6000);
  assert.equal(sin.totalReal, 0);
  assert.ok(sin.avance > 0 && sin.avance < 100);
  assert.equal(sin.estado, 'st-ok');
  const esperado = sin.esperado;
  const gasto = (monto) => [labor({ fecha: U.addDays(hoy, -10), costoManoObra: monto, costoTotal: monto }), labor({ fecha: U.addDays(inicio, -5), costoManoObra: 99999 })];
  assert.equal(B.presupuestoVsReal([parcela], gasto(esperado * 1.1), defecto, hoy)[0].estado, 'st-warn');
  const sobre = B.presupuestoVsReal([parcela], gasto(esperado * 1.5), defecto, hoy)[0];
  assert.equal(sobre.estado, 'st-err');
  assert.ok(Math.abs(sobre.desvio - 50) < 0.1);
  assert.equal(sobre.real.manoObra, U.round(esperado * 1.5, 2), 'ignora labores anteriores al inicio del ciclo');
  const propio = B.presupuestoVsReal([Object.assign({}, parcela, { presupuestoHa: { manoObra: 500, insumos: 0, otros: 0 } })], [], defecto, hoy)[0];
  assert.equal(propio.totalPresu, 1000, 'el presupuesto propio de la parcela tiene prioridad');
  assert.equal(B.presupuestoVsReal([Object.assign({}, parcela, { estado: 'archivada' })], [], defecto, hoy).length, 0);
});

test('órdenes de compra: total de líneas y numeración consecutiva', () => {
  assert.equal(B.totalOrden({ lineas: [{ cantidad: 2, costoUnitario: 10.5 }, { cantidad: '3', costoUnitario: '4' }, { cantidad: '', costoUnitario: 9 }] }), 33);
  assert.equal(B.siguienteNumero([], 'OC-'), 'OC-0001');
  assert.equal(B.siguienteNumero([{ numero: 'OC-0009' }, { numero: 'OC-0012' }, { numero: '' }], 'OC-'), 'OC-0013');
});

test('kardex: orden cronológico estable y saldo acumulado con salidas y ajustes', () => {
  const movs = [
    { insumoId: 'i1', fecha: '2026-10-03', tipo: 'salida', cantidad: 4, costoUnitario: 10 },
    { insumoId: 'i1', fecha: '2026-10-01', tipo: 'entrada', cantidad: 10, costoUnitario: 10 },
    { insumoId: 'i2', fecha: '2026-10-02', tipo: 'entrada', cantidad: 99, costoUnitario: 1 },
    { insumoId: 'i1', fecha: '2026-10-03', tipo: 'ajuste', cantidad: -1, costoUnitario: 10 },
    { insumoId: 'i1', fecha: '2026-10-05', tipo: 'entrada', cantidad: 2.5, costoUnitario: 12 }
  ];
  const k = B.kardex(movs, 'i1');
  assert.deepEqual(k.map((m) => m.delta), [10, -4, -1, 2.5]);
  assert.deepEqual(k.map((m) => m.saldo), [10, 6, 5, 7.5]);
});

test('resumen de finca para el consolidado corporativo', () => {
  const inicio = U.addDays(hoy, -200);
  const datos = {
    settings: { finca: 'El Roble', moneda: 'CRC' },
    parcelas: [{ id: 'p1', variedad: 'MD-2', hectareas: 3, ciclo: 1, densidad: 65000, fechaSiembra: inicio, fechaInicioCiclo: inicio, estado: 'activa' }, { id: 'p2', variedad: 'MD-2', hectareas: 9, ciclo: 1, fechaSiembra: inicio, fechaInicioCiclo: inicio, estado: 'archivada' }],
    labores: [labor({ costoTotal: 150 }), labor({ estado: 'pendiente', costoTotal: 999 }), labor({ estado: 'en_proceso' })],
    cosechas: [{ toneladas: 2, precio: 100 }],
    insumos: [{ stock: 4, costoUnitario: 5 }, { stock: -2, costoUnitario: 5 }]
  };
  const r = B.resumenFinca(datos, hoy);
  assert.equal(r.nombre, 'El Roble');
  assert.equal(r.moneda, 'CRC');
  assert.equal(r.parcelas, 1);
  assert.equal(r.hectareas, 3);
  assert.equal(r.costos, 150);
  assert.equal(r.ingresos, 200);
  assert.equal(r.laboresAbiertas, 2);
  assert.equal(r.inventario, 20);
  assert.ok(r.produccionEstimada > 0);
});
