// Pruebas del motor agronómico. Ejecutar con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/utils.js');
require('../js/catalog.js');
require('../js/agronomy.js');
const { utils: U, agro: A } = globalThis.AP;

const hoy = '2026-10-05';
const p = (o) => Object.assign({ variedad: 'MD-2', hectareas: 10, ciclo: 1 }, o);

test('fechas: diferencias y sumas sin desfases de zona horaria', () => {
  assert.equal(U.diffDays('2026-03-10', '2026-03-01'), 9);
  assert.equal(U.addDays('2026-02-27', 3), '2026-03-02');
  assert.equal(U.addMonths('2026-01-31', 1), '2026-02-01');
});

test('fases según edad e inducción', () => {
  assert.equal(A.estado(p({ fechaSiembra: U.addDays(hoy, -30) }), hoy).fase, 'establecimiento');
  assert.equal(A.estado(p({ fechaSiembra: U.addDays(hoy, -150) }), hoy).fase, 'vegetativo');
  assert.equal(A.estado(p({ fechaSiembra: U.addDays(hoy, -250) }), hoy).fase, 'preinduccion');
  const ind = (dpi) => A.estado(p({ fechaSiembra: U.addDays(hoy, -400), fechaInduccion: U.addDays(hoy, -dpi) }), hoy).fase;
  assert.equal(ind(20), 'floracion');
  assert.equal(ind(90), 'fruto');
  assert.equal(ind(140), 'maduracion');
  assert.equal(ind(155), 'cosecha');
});

test('siembra futura queda planificada (no cuenta días al revés)', () => {
  const e = A.estado(p({ fechaSiembra: U.addDays(hoy, 20) }), hoy);
  assert.equal(e.fase, 'planificada');
  assert.equal(e.dias, 0);
});

test('cosecha estimada = inducción + días a cosecha de la variedad', () => {
  const e = A.estado(p({ fechaSiembra: '2026-01-01', fechaInduccion: '2026-09-01' }), hoy);
  assert.equal(e.cosechaEst, U.addDays('2026-09-01', 155));
  assert.equal(A.estado(p({ fechaSiembra: '2026-01-01' }), hoy).induccionEst, U.addDays('2026-01-01', 270));
});

test('inducción anterior al ciclo actual se ignora (soca)', () => {
  const e = A.estado(p({ fechaSiembra: '2025-01-01', ciclo: 2, fechaInicioCiclo: '2026-06-01', fechaInduccion: '2025-09-01' }), hoy);
  assert.equal(e.induccion, null);
  assert.equal(e.etiquetaCiclo, 'Soca 1');
});

test('producción estimada: plantas × aprovechamiento × peso', () => {
  const r = A.produccion(p({}));
  assert.equal(Math.round(r.plantas), 650000);
  assert.equal(Math.round(r.toneladas), Math.round(650000 * 0.9 * 1.8 / 1000));
  assert.ok(A.produccion(p({ ciclo: 2 })).toneladas < r.toneladas);
});

test('carencias vigentes por parcela', () => {
  const insumos = [{ id: 'i1', nombre: 'X', carencia: 14 }];
  const labores = [
    { parcelaId: 'a', estado: 'completada', fecha: U.addDays(hoy, -5), insumos: [{ insumoId: 'i1', cantidad: 1 }] },
    { parcelaId: 'b', estado: 'completada', fecha: U.addDays(hoy, -20), insumos: [{ insumoId: 'i1', cantidad: 1 }] },
    { parcelaId: 'c', estado: 'pendiente', fecha: hoy, insumos: [{ insumoId: 'i1', cantidad: 1 }] }
  ];
  const c = A.carencias(labores, insumos, hoy);
  assert.equal(c.a.hasta, U.addDays(hoy, 9));
  assert.equal(c.a.dias, 9);
  assert.equal(c.b, undefined);
  assert.equal(c.c, undefined);
});

test('ventanas de aplicación excluyen lluvia, viento y noche', () => {
  const h = (hora, extra) => Object.assign({ t: '2026-10-06T' + String(hora).padStart(2, '0') + ':00', dia: '2026-10-06', hora, temp: 26, rh: 70, prob: 5, lluvia: 0, viento: 6 }, extra);
  const horas = [h(5), h(7), h(8), h(9), h(10, { viento: 22 }), h(11), h(12), h(13), h(14, { lluvia: 2 }), h(15)];
  const r = A.ventanasAplicacion(horas);
  assert.equal(r.horas[0].motivo, 'Noche');
  assert.equal(r.horas[4].motivo, 'Viento fuerte');
  assert.equal(r.horas[8].motivo, 'Lluvia');
  assert.equal(r.horas[5].motivo, 'Lluvia'); // lluvia dentro de las 3 h siguientes
  assert.equal(r.ventanas[0].inicio, '2026-10-06T07:00');
  assert.equal(r.ventanas[0].horas, 3);
});

test('área geodésica de un cuadrado de ~100 m', () => {
  const d = 100 / 111320;
  const ha = U.polygonHa([[10, -84], [10, -84 + d / Math.cos(10 * Math.PI / 180)], [10 - d, -84 + d / Math.cos(10 * Math.PI / 180)], [10 - d, -84]]);
  assert.ok(Math.abs(ha - 1) < 0.02, 'esperado ~1 ha, obtenido ' + ha);
});
