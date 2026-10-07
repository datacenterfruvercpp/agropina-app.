/* AgroPiña Enterprise · Servicio de clima (Open-Meteo) con caché offline */
(function (AP) {
  'use strict';
  const U = AP.utils;
  const W = {};
  const CACHE_KEY = 'agropina_weather';
  const TTL = 30 * 60 * 1000;

  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } };
  const writeCache = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* sin espacio: se ignora */ } };

  W.url = function (lat, lon) {
    const q = new URLSearchParams({
      latitude: lat, longitude: lon, timezone: 'auto', past_days: 7, forecast_days: 8, wind_speed_unit: 'kmh',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
      hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,uv_index_max,sunrise,sunset'
    });
    return 'https://api.open-meteo.com/v1/forecast?' + q.toString();
  };

  /** Devuelve { raw, fetchedAt, stale } usando caché si es reciente o si no hay conexión */
  W.get = async function (lat, lon, force) {
    const key = Number(lat).toFixed(2) + ',' + Number(lon).toFixed(2);
    const cache = readCache();
    if (!force && cache && cache.key === key && Date.now() - cache.fetchedAt < TTL) return { raw: cache.raw, fetchedAt: cache.fetchedAt, stale: false };
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(W.url(lat, lon), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('El servicio de clima respondió ' + res.status);
      const raw = await res.json();
      if (!raw.daily || !raw.current) throw new Error('Respuesta de clima incompleta');
      const entry = { key, fetchedAt: Date.now(), raw };
      writeCache(entry);
      return { raw, fetchedAt: entry.fetchedAt, stale: false };
    } catch (e) {
      if (cache) return { raw: cache.raw, fetchedAt: cache.fetchedAt, stale: true, error: e.message };
      throw new Error('No se pudo conectar con el servicio de clima. Verifique su conexión a internet.');
    }
  };

  const at = (arr, i, def) => (arr && arr[i] != null ? arr[i] : def);

  /** Normaliza la respuesta de Open-Meteo a la estructura usada por la app */
  W.parse = function (raw) {
    const cur = raw.current;
    const nowStr = cur.time;
    const hoy = nowStr.slice(0, 10);
    const d = raw.daily;
    const daily = d.time.map((fecha, i) => ({
      fecha,
      code: at(d.weather_code, i, 0),
      tmax: at(d.temperature_2m_max, i, null),
      tmin: at(d.temperature_2m_min, i, null),
      lluvia: at(d.precipitation_sum, i, 0),
      prob: at(d.precipitation_probability_max, i, null),
      vientoMax: at(d.wind_speed_10m_max, i, 0),
      et0: at(d.et0_fao_evapotranspiration, i, 0),
      uv: at(d.uv_index_max, i, null),
      sunrise: at(d.sunrise, i, ''),
      sunset: at(d.sunset, i, ''),
      pasado: fecha < hoy,
      hoy: fecha === hoy
    }));
    const h = raw.hourly;
    const curHour = nowStr.slice(0, 13);
    let start = h.time.findIndex((t) => t.slice(0, 13) >= curHour);
    if (start < 0) start = 0;
    const hourly = h.time.slice(start, start + 72).map((t, k) => {
      const i = start + k;
      return {
        t, dia: t.slice(0, 10), hora: +t.slice(11, 13),
        temp: at(h.temperature_2m, i, null), rh: at(h.relative_humidity_2m, i, null),
        prob: at(h.precipitation_probability, i, 0), lluvia: at(h.precipitation, i, 0),
        viento: at(h.wind_speed_10m, i, 0), code: at(h.weather_code, i, 0), isDay: at(h.is_day, i, 1)
      };
    });
    const pasados = daily.filter((x) => x.pasado);
    const hoyD = daily.find((x) => x.hoy) || daily[0];
    return {
      hoy,
      current: {
        temp: cur.temperature_2m, sensacion: cur.apparent_temperature, rh: cur.relative_humidity_2m,
        viento: cur.wind_speed_10m, rafagas: cur.wind_gusts_10m, code: cur.weather_code, isDay: cur.is_day,
        lluvia: cur.precipitation, time: nowStr
      },
      hoyDia: hoyD,
      daily, hourly,
      lluvia7d: U.sum(pasados, (x) => x.lluvia),
      et07d: U.sum(pasados, (x) => x.et0),
      elevation: raw.elevation, timezone: raw.timezone
    };
  };

  /** Búsqueda de lugares (geocodificación) */
  W.buscarLugar = async function (q) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?count=6&language=es&format=json&name=' + encodeURIComponent(q);
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo buscar el lugar');
    const data = await res.json();
    return (data.results || []).map((r) => ({
      nombre: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      lat: U.round(r.latitude, 4), lon: U.round(r.longitude, 4)
    }));
  };

  AP.weather = W;
})(window.AP = window.AP || {});
