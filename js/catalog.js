/* AgroPiña Enterprise · Catálogos agronómicos y de interfaz (piña tropical) */
(function (AP) {
  'use strict';

  /* Tonos de color con clases completas (Tailwind compilado necesita los nombres literales) */
  const HEX = {
    emerald: '#10b981', lime: '#84cc16', sky: '#0ea5e9', violet: '#8b5cf6', amber: '#f59e0b', rose: '#f43f5e',
    orange: '#f97316', cyan: '#06b6d4', slate: '#64748b', teal: '#14b8a6', yellow: '#eab308', stone: '#78716c',
    fuchsia: '#d946ef', red: '#ef4444', blue: '#3b82f6', indigo: '#6366f1', green: '#22c55e', pink: '#ec4899'
  };
  /* Clases completas y literales para que Tailwind las detecte al compilar */
  const TONES = {
    emerald: { chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', soft: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500', ring: 'ring-emerald-500' },
    lime: { chip: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300', soft: 'bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400', dot: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-400', border: 'border-lime-500', ring: 'ring-lime-500' },
    sky: { chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', soft: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400', dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500', ring: 'ring-sky-500' },
    violet: { chip: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300', soft: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500', ring: 'ring-violet-500' },
    amber: { chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', soft: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500' },
    rose: { chip: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300', soft: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500', ring: 'ring-rose-500' },
    orange: { chip: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300', soft: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500', ring: 'ring-orange-500' },
    cyan: { chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300', soft: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500', ring: 'ring-cyan-500' },
    slate: { chip: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-300', soft: 'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400', dot: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500', ring: 'ring-slate-500' },
    teal: { chip: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300', soft: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400', dot: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500', ring: 'ring-teal-500' },
    yellow: { chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300', soft: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400', dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500', ring: 'ring-yellow-500' },
    stone: { chip: 'bg-stone-100 text-stone-800 dark:bg-stone-500/15 dark:text-stone-300', soft: 'bg-stone-50 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400', dot: 'bg-stone-500', text: 'text-stone-600 dark:text-stone-400', border: 'border-stone-500', ring: 'ring-stone-500' },
    fuchsia: { chip: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300', soft: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400', dot: 'bg-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-500', ring: 'ring-fuchsia-500' },
    red: { chip: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300', soft: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-500', ring: 'ring-red-500' },
    blue: { chip: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300', soft: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500', ring: 'ring-blue-500' },
    indigo: { chip: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300', soft: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500', ring: 'ring-indigo-500' },
    green: { chip: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300', soft: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-500', ring: 'ring-green-500' },
    pink: { chip: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300', soft: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400', dot: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500', ring: 'ring-pink-500' }
  };
  const tone = (c) => Object.assign({ name: c, hex: HEX[c] || HEX.slate }, TONES[c] || TONES.slate);

  /* Variedades: parámetros de referencia para estimar ciclo y rendimiento */
  const VARIEDADES = {
    'MD-2': { nombre: 'MD-2 (Dorada)', pesoFruto: 1.8, densidad: 65000, diasInduccion: 270, diasInduccionSoca: 210, diasCosecha: 155 },
    'Golden': { nombre: 'Golden Sweet', pesoFruto: 1.7, densidad: 65000, diasInduccion: 270, diasInduccionSoca: 210, diasCosecha: 155 },
    'Cayena Lisa': { nombre: 'Cayena Lisa', pesoFruto: 2.0, densidad: 50000, diasInduccion: 300, diasInduccionSoca: 230, diasCosecha: 165 },
    'Pernambuco': { nombre: 'Pernambuco', pesoFruto: 1.3, densidad: 40000, diasInduccion: 330, diasInduccionSoca: 250, diasCosecha: 170 },
    'Española Roja': { nombre: 'Española Roja', pesoFruto: 1.2, densidad: 45000, diasInduccion: 300, diasInduccionSoca: 230, diasCosecha: 165 },
    'Queen Victoria': { nombre: 'Queen Victoria', pesoFruto: 0.9, densidad: 60000, diasInduccion: 270, diasInduccionSoca: 200, diasCosecha: 150 },
    'Otra': { nombre: 'Otra variedad', pesoFruto: 1.5, densidad: 50000, diasInduccion: 300, diasInduccionSoca: 220, diasCosecha: 160 }
  };

  /* Fases fenológicas del cultivo */
  const FASES = {
    planificada: { label: 'Planificada', short: 'Planificada', icon: 'fa-calendar-plus', tone: tone('slate') },
    establecimiento: { label: 'Establecimiento', short: 'Establec.', icon: 'fa-seedling', tone: tone('sky') },
    vegetativo: { label: 'Desarrollo vegetativo', short: 'Vegetativo', icon: 'fa-leaf', tone: tone('emerald') },
    preinduccion: { label: 'Lista para inducción', short: 'Pre-inducción', icon: 'fa-hourglass-half', tone: tone('lime') },
    floracion: { label: 'Floración', short: 'Floración', icon: 'fa-spa', tone: tone('fuchsia') },
    fruto: { label: 'Desarrollo de fruto', short: 'Fruto', icon: 'fa-lemon', tone: tone('amber') },
    maduracion: { label: 'Maduración', short: 'Maduración', icon: 'fa-sun', tone: tone('orange') },
    cosecha: { label: 'En cosecha', short: 'Cosecha', icon: 'fa-basket-shopping', tone: tone('rose') },
    archivada: { label: 'Archivada', short: 'Archivada', icon: 'fa-box-archive', tone: tone('stone') }
  };
  const FASES_CICLO = ['establecimiento', 'vegetativo', 'preinduccion', 'floracion', 'fruto', 'maduracion', 'cosecha'];

  /* Tipos de labor */
  const L = (icon, color, extra) => Object.assign({ icon, tone: tone(color) }, extra || {});
  const LABORES = {
    'Preparación de suelo': L('fa-tractor', 'stone'),
    'Siembra': L('fa-seedling', 'emerald'),
    'Fertilización': L('fa-flask', 'lime', { insumos: true }),
    'Aplicación fitosanitaria': L('fa-spray-can-sparkles', 'rose', { insumos: true }),
    'Control de malezas': L('fa-leaf', 'teal', { insumos: true }),
    'Inducción floral': L('fa-wand-magic-sparkles', 'amber', { insumos: true }),
    'Protección solar': L('fa-umbrella-beach', 'yellow', { insumos: true }),
    'Riego': L('fa-droplet', 'sky'),
    'Drenajes y mantenimiento': L('fa-water', 'cyan'),
    'Cosecha': L('fa-basket-shopping', 'orange'),
    'Muestreo': L('fa-magnifying-glass', 'violet'),
    'Otro': L('fa-ellipsis', 'slate')
  };
  const LABOR_ALIAS = { 'Deshierbe': 'Control de malezas', 'Control de Plagas': 'Aplicación fitosanitaria', 'Inducción Floral': 'Inducción floral' };

  const CATEGORIAS_INSUMO = {
    'Fertilizante': tone('emerald'), 'Herbicida': tone('lime'), 'Insecticida': tone('rose'), 'Fungicida': tone('violet'),
    'Nematicida': tone('orange'), 'Inductor / Regulador': tone('amber'), 'Coadyuvante': tone('sky'), 'Protector solar': tone('yellow'),
    'Material vegetativo': tone('teal'), 'Combustible': tone('slate'), 'Otro': tone('stone')
  };
  const UNIDADES = ['kg', 'L', 'g', 'mL', 'saco', 'galón', 'unidad'];

  /* Plagas, enfermedades y problemas frecuentes en piña */
  const PLAGAS = [
    { key: 'cochinilla', nombre: 'Cochinilla / Wilt', cientifico: 'Dysmicoccus brevipes', tipo: 'Plaga' },
    { key: 'sinfilidos', nombre: 'Sinfílidos', cientifico: 'Hanseniella sp.', tipo: 'Plaga' },
    { key: 'tecla', nombre: 'Tecla (barrenador del fruto)', cientifico: 'Strymon megarus', tipo: 'Plaga' },
    { key: 'picudo', nombre: 'Picudo de la piña', cientifico: 'Metamasius dimidiatipennis', tipo: 'Plaga' },
    { key: 'mosca', nombre: 'Mosca del establo', cientifico: 'Stomoxys calcitrans', tipo: 'Plaga' },
    { key: 'nematodos', nombre: 'Nematodos', cientifico: 'Meloidogyne / Pratylenchus', tipo: 'Plaga' },
    { key: 'gallina', nombre: 'Gallina ciega', cientifico: 'Phyllophaga spp.', tipo: 'Plaga' },
    { key: 'phytophthora', nombre: 'Pudrición del cogollo', cientifico: 'Phytophthora spp.', tipo: 'Enfermedad' },
    { key: 'erwinia', nombre: 'Pudrición bacteriana', cientifico: 'Dickeya (Erwinia) spp.', tipo: 'Enfermedad' },
    { key: 'fusarium', nombre: 'Fusariosis', cientifico: 'Fusarium guttiforme', tipo: 'Enfermedad' },
    { key: 'thielaviopsis', nombre: 'Pudrición negra', cientifico: 'Thielaviopsis paradoxa', tipo: 'Enfermedad' },
    { key: 'malezas', nombre: 'Malezas', cientifico: '', tipo: 'Maleza' },
    { key: 'golpe_sol', nombre: 'Golpe de sol en fruta', cientifico: '', tipo: 'Fisiopatía' },
    { key: 'otro', nombre: 'Otro', cientifico: '', tipo: 'Otro' }
  ];
  const SEVERIDAD = [
    null,
    { label: 'Muy baja', tone: tone('emerald') },
    { label: 'Baja', tone: tone('lime') },
    { label: 'Media', tone: tone('amber') },
    { label: 'Alta', tone: tone('orange') },
    { label: 'Crítica', tone: tone('red') }
  ];

  const TIPOS_CLIENTE = ['Exportadora', 'Mercado nacional', 'Industria', 'Otro'];
  const PUESTOS = ['Peón agrícola', 'Aplicador', 'Cosechero', 'Operador de maquinaria', 'Mandador', 'Supervisor', 'Bodeguero', 'Administrativo'];
  const DESTINOS = { 'Exportación': tone('emerald'), 'Mercado nacional': tone('sky'), 'Industria': tone('amber'), 'Rechazo': tone('stone') };
  const MONEDAS = [
    { code: 'USD', label: 'Dólar (USD)' }, { code: 'CRC', label: 'Colón (CRC)' }, { code: 'EUR', label: 'Euro (EUR)' },
    { code: 'MXN', label: 'Peso mexicano (MXN)' }, { code: 'COP', label: 'Peso colombiano (COP)' }, { code: 'GTQ', label: 'Quetzal (GTQ)' },
    { code: 'HNL', label: 'Lempira (HNL)' }, { code: 'DOP', label: 'Peso dominicano (DOP)' }, { code: 'PEN', label: 'Sol (PEN)' }
  ];
  const COLORES_PARCELA = ['#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#ec4899'];
  const NIVELES = {
    alto: { label: 'Urgente', orden: 0, tone: tone('red'), icon: 'fa-circle-exclamation' },
    medio: { label: 'Atención', orden: 1, tone: tone('amber'), icon: 'fa-triangle-exclamation' },
    info: { label: 'Sugerencia', orden: 2, tone: tone('sky'), icon: 'fa-circle-info' },
    bajo: { label: 'Favorable', orden: 3, tone: tone('emerald'), icon: 'fa-circle-check' }
  };
  const KG_POR_CAJA = 12;
  const UBICACION_DEFECTO = { lat: 10.3833, lon: -84.4333, nombre: 'San Carlos, Costa Rica' };

  /* Códigos meteorológicos WMO → texto e icono */
  const WMO = {
    0: ['Despejado', 'fa-sun', 'fa-moon'], 1: ['Mayormente despejado', 'fa-sun', 'fa-moon'], 2: ['Parcialmente nublado', 'fa-cloud-sun', 'fa-cloud-moon'],
    3: ['Nublado', 'fa-cloud'], 45: ['Niebla', 'fa-smog'], 48: ['Niebla escarchada', 'fa-smog'],
    51: ['Llovizna ligera', 'fa-cloud-rain'], 53: ['Llovizna', 'fa-cloud-rain'], 55: ['Llovizna densa', 'fa-cloud-rain'],
    56: ['Llovizna helada', 'fa-cloud-rain'], 57: ['Llovizna helada', 'fa-cloud-rain'],
    61: ['Lluvia ligera', 'fa-cloud-rain'], 63: ['Lluvia moderada', 'fa-cloud-showers-heavy'], 65: ['Lluvia fuerte', 'fa-cloud-showers-heavy'],
    66: ['Lluvia helada', 'fa-cloud-rain'], 67: ['Lluvia helada', 'fa-cloud-showers-heavy'],
    71: ['Nevada ligera', 'fa-snowflake'], 73: ['Nevada', 'fa-snowflake'], 75: ['Nevada fuerte', 'fa-snowflake'], 77: ['Granizo fino', 'fa-snowflake'],
    80: ['Chubascos ligeros', 'fa-cloud-sun-rain', 'fa-cloud-moon-rain'], 81: ['Chubascos', 'fa-cloud-showers-heavy'], 82: ['Chubascos violentos', 'fa-cloud-showers-water'],
    85: ['Chubascos de nieve', 'fa-snowflake'], 86: ['Chubascos de nieve', 'fa-snowflake'],
    95: ['Tormenta eléctrica', 'fa-cloud-bolt'], 96: ['Tormenta con granizo', 'fa-cloud-bolt'], 99: ['Tormenta con granizo', 'fa-cloud-bolt']
  };
  const wmo = (code, isDay = 1) => {
    const w = WMO[code] || ['Variable', 'fa-cloud-sun', 'fa-cloud-moon'];
    const icon = !isDay && w[2] ? w[2] : w[1];
    const color = /sun/.test(icon) ? 'text-amber-400' : /moon/.test(icon) ? 'text-indigo-300' : /bolt/.test(icon) ? 'text-violet-400' : /rain|showers/.test(icon) ? 'text-sky-400' : 'text-slate-400';
    return { label: w[0], icon, color };
  };

  AP.catalog = {
    HEX, tone, VARIEDADES, FASES, FASES_CICLO, LABORES, LABOR_ALIAS, CATEGORIAS_INSUMO, UNIDADES, PLAGAS, SEVERIDAD,
    DESTINOS, TIPOS_CLIENTE, PUESTOS, MONEDAS, COLORES_PARCELA, NIVELES, KG_POR_CAJA, UBICACION_DEFECTO, wmo,
    labor: (t) => LABORES[t] || LABORES.Otro,
    plaga: (k) => PLAGAS.find((p) => p.key === k) || PLAGAS[PLAGAS.length - 1],
    categoria: (c) => CATEGORIAS_INSUMO[c] || CATEGORIAS_INSUMO.Otro,
    destino: (d) => DESTINOS[d] || tone('slate')
  };
})(typeof window !== 'undefined' ? (window.AP = window.AP || {}) : (globalThis.AP = globalThis.AP || {}));
