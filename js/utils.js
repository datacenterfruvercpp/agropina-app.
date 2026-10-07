/* AgroPiña Enterprise · Utilidades generales (fechas, formato, geometría, archivos) */
(function (AP) {
  'use strict';

  const DAY = 86400000;
  const LOCALE = 'es-CR';
  const pad = (n) => String(n).padStart(2, '0');
  const U = {};

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  U.round = (n, d = 2) => { const f = Math.pow(10, d); return Math.round((Number(n) || 0) * f) / f; };
  U.sum = (arr, fn) => (arr || []).reduce((s, x) => s + (Number(fn ? fn(x) : x) || 0), 0);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.groupBy = (arr, fn) => (arr || []).reduce((o, x) => { const k = fn(x); (o[k] = o[k] || []).push(x); return o; }, {});
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  U.match = (q, ...fields) => { const n = U.norm(q).trim(); return !n || fields.some((f) => U.norm(f).includes(n)); };

  /* ---------- Fechas (siempre ISO local YYYY-MM-DD, sin problemas de zona horaria ni Safari) ---------- */
  U.toISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  U.today = () => U.toISO(new Date());
  U.parseDate = (s) => {
    if (!s) return null;
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  };
  U.addDays = (s, n) => { const d = U.parseDate(s) || new Date(); d.setDate(d.getDate() + Math.round(n)); return U.toISO(d); };
  U.addMonths = (s, n) => { const d = U.parseDate(s) || new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return U.toISO(d); };
  /** a − b en días */
  U.diffDays = (a, b) => { const da = U.parseDate(a), db = U.parseDate(b); return da && db ? Math.round((da - db) / DAY) : 0; };
  U.monthKey = (s) => String(s || '').slice(0, 7);
  U.monthLabel = (key, long) => { const d = U.parseDate(key + '-01'); return d ? d.toLocaleDateString(LOCALE, { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' }).replace('.', '') : key; };
  U.fmtDate = (s, style = 'medium') => {
    const d = U.parseDate(s); if (!d) return '—';
    const opts = {
      short: { day: 'numeric', month: 'short' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      day: { weekday: 'short', day: 'numeric' },
      weekday: { weekday: 'short' }
    }[style] || {};
    return d.toLocaleDateString(LOCALE, opts).replace(/\./g, '');
  };
  U.fmtRel = (s, base) => {
    const n = U.diffDays(s, base || U.today());
    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    if (n === -1) return 'ayer';
    const abs = Math.abs(n);
    const txt = abs < 45 ? abs + ' días' : abs < 365 ? Math.round(abs / 30.4) + ' meses' : U.fmtNum(abs / 365, abs % 365 < 18 ? 0 : 1) + ' años';
    return n > 0 ? 'en ' + txt : 'hace ' + txt;
  };
  U.fmtTime = (iso) => { const m = /T(\d{2}):(\d{2})/.exec(iso || ''); return m ? m[1] + ':' + m[2] : ''; };
  U.fmtAgo = (ts) => {
    if (!ts) return '';
    const min = Math.round((Date.now() - ts) / 60000);
    if (min < 1) return 'justo ahora';
    if (min < 60) return 'hace ' + min + ' min';
    const h = Math.round(min / 60);
    return h < 24 ? 'hace ' + h + ' h' : 'hace ' + Math.round(h / 24) + ' d';
  };

  /* ---------- Números y moneda ---------- */
  U.fmtNum = (n, dec = 0) => {
    const v = Number(n);
    if (!isFinite(v)) return '—';
    return v.toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  U.fmtCompact = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString(LOCALE, { notation: 'compact', maximumFractionDigits: Math.abs(v) < 1000 ? 0 : 1 });
  };
  U.fmtMoney = (n, cur = 'USD', compact = false) => {
    const v = Number(n) || 0;
    try {
      return v.toLocaleString(LOCALE, {
        style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : (Math.abs(v) >= 1000 || cur === 'CRC' ? 0 : 2),
        minimumFractionDigits: 0
      });
    } catch (e) { return cur + ' ' + U.fmtNum(v, 2); }
  };
  U.fmtPct = (n, dec = 0) => (isFinite(n) ? U.fmtNum(n, dec) + '%' : '—');

  /* ---------- Geometría (área geodésica de polígonos en hectáreas) ---------- */
  U.polygonHa = (pts) => {
    if (!pts || pts.length < 3) return 0;
    const R = 6378137, rad = Math.PI / 180;
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      a += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
    }
    return Math.abs(a * R * R / 2) / 10000;
  };
  U.centroid = (pts) => (pts && pts.length ? [U.sum(pts, (p) => p[0]) / pts.length, U.sum(pts, (p) => p[1]) / pts.length] : null);

  /* ---------- Archivos y scripts ---------- */
  U.download = (filename, content, type = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const loaded = {};
  U.loadScript = (src) => loaded[src] || (loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => { delete loaded[src]; reject(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  }));
  U.readFile = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });

  AP.utils = U;
})(typeof window !== 'undefined' ? (window.AP = window.AP || {}) : (globalThis.AP = globalThis.AP || {}));
