/* Solo vista previa en claude.ai: el visor bloquea el servicio de clima real, así que
   si falla se usa un pronóstico simulado (la app lo marca como "Simulado"). */
(function (AP) {
  var W = AP.weather, orig = W.get;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function mock() {
    var now = new Date(), days = [], hours = [], i, h;
    for (i = -7; i < 8; i++) { var d = new Date(now); d.setDate(d.getDate() + i); days.push(iso(d)); }
    days.forEach(function (d) { for (h = 0; h < 24; h++) hours.push(d + 'T' + pad(h) + ':00'); });
    var rain = [2, 0, 12, 4, 0, 1, 8, 3, 0, 0, 28, 15, 2, 0, 5];
    var hr = function (t) { return +t.slice(11, 13); };
    return {
      latitude: 10.38, longitude: -84.43, elevation: 96, timezone: 'America/Costa_Rica',
      current: { time: iso(now) + 'T' + pad(now.getHours()) + ':00', temperature_2m: 28.4, relative_humidity_2m: 74, apparent_temperature: 31.2, is_day: now.getHours() >= 6 && now.getHours() < 18 ? 1 : 0, precipitation: 0, weather_code: 2, wind_speed_10m: 7.5, wind_gusts_10m: 18 },
      hourly: {
        time: hours,
        temperature_2m: hours.map(function (t) { return 25 + 5 * Math.sin((hr(t) - 9) / 24 * 2 * Math.PI); }),
        relative_humidity_2m: hours.map(function (t) { return 78 - 18 * Math.sin((hr(t) - 9) / 24 * 2 * Math.PI); }),
        precipitation_probability: hours.map(function (t) { return hr(t) > 14 && hr(t) < 18 ? 60 : 10; }),
        precipitation: hours.map(function (t) { return hr(t) === 16 ? 2 : 0; }),
        weather_code: hours.map(function () { return 2; }),
        wind_speed_10m: hours.map(function (t) { return 4 + hr(t) % 9; }),
        is_day: hours.map(function (t) { return hr(t) >= 6 && hr(t) < 18 ? 1 : 0; })
      },
      daily: {
        time: days,
        weather_code: rain.map(function (r) { return r > 20 ? 65 : r > 5 ? 61 : r > 0 ? 80 : 1; }),
        temperature_2m_max: days.map(function (d, k) { return k === 11 ? 34 : 30; }),
        temperature_2m_min: days.map(function () { return 21; }),
        precipitation_sum: rain,
        precipitation_probability_max: rain.map(function (r) { return Math.min(95, r * 4); }),
        wind_speed_10m_max: days.map(function () { return 18; }),
        et0_fao_evapotranspiration: days.map(function () { return 4.1; }),
        uv_index_max: days.map(function () { return 10.5; }),
        sunrise: days.map(function (d) { return d + 'T05:28'; }),
        sunset: days.map(function (d) { return d + 'T17:41'; })
      }
    };
  }
  W.get = function () {
    return orig.apply(W, arguments).then(function (r) { return r.stale ? sim() : r; }, sim);
  };
  function sim() { return { raw: mock(), fetchedAt: Date.now(), stale: false, simulated: true }; }
})(window.AP);
