const { chromium } = require('playwright');
const SP = process.argv[2];
function mockWeather() {
  const now = new Date(); const pad = n => String(n).padStart(2,'0');
  const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const days = []; for (let i=-7;i<8;i++){ const d=new Date(now); d.setDate(d.getDate()+i); days.push(iso(d)); }
  const hours=[]; days.forEach(d=>{ for(let h=0;h<24;h++) hours.push(d+'T'+pad(h)+':00'); });
  const rain = [2,0,12,4,0,1,8, 3,0,0,28,15,2,0,5];
  return { latitude:10.38, longitude:-84.43, elevation: 96, timezone:'America/Costa_Rica',
    current:{ time: iso(now)+'T'+pad(now.getHours())+':00', temperature_2m:28.4, relative_humidity_2m:74, apparent_temperature:31.2, is_day:1, precipitation:0, weather_code:2, wind_speed_10m:7.5, wind_gusts_10m:18 },
    hourly:{ time:hours, temperature_2m:hours.map((t,i)=>22+8*Math.sin((+t.slice(11,13)-8)/24*2*Math.PI)), relative_humidity_2m:hours.map(()=>72), precipitation_probability:hours.map((t,i)=> (+t.slice(11,13)>14 && +t.slice(11,13)<18)?60:10), precipitation:hours.map((t)=> (+t.slice(11,13)===16)?2:0), weather_code:hours.map(()=>2), wind_speed_10m:hours.map((t)=>4+ (+t.slice(11,13))%9), is_day:hours.map(t=>(+t.slice(11,13)>=6&&+t.slice(11,13)<18)?1:0) },
    daily:{ time:days, weather_code:rain.map(r=>r>20?65:r>5?61:r>0?80:1), temperature_2m_max:days.map((d,i)=>i===11?34:30), temperature_2m_min:days.map(()=>21), precipitation_sum:rain, precipitation_probability_max:rain.map(r=>Math.min(95,r*4)), wind_speed_10m_max:days.map(()=>18), et0_fao_evapotranspiration:days.map(()=>4.1), uv_index_max:days.map(()=>10.5), sunrise:days.map(d=>d+'T05:28'), sunset:days.map(d=>d+'T17:41') } };
}
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const run = async (name, viewport, dark) => {
    const ctx = await browser.newContext({ viewport, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type()==='error' || m.type()==='warning') errors.push(name+': '+m.text()); });
    page.on('pageerror', e => errors.push(name+' PAGEERROR: '+e.message));
    await page.route('**/api.open-meteo.com/**', r => r.fulfill({ json: mockWeather() }));
    await page.route(/arcgisonline|openstreetmap/, r => r.abort());
    await page.goto('http://localhost:8765/index.html');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SP}/shots/${name}-00-empty.png`, fullPage: false });
    await page.evaluate(() => AP.store.loadDemo());
    await page.waitForTimeout(500);
    for (const v of ['dashboard','parcelas','parcelas/p1','labores','calendario','mapa','clima','cosechas','sanidad','inventario','finanzas','ajustes']) {
      await page.evaluate(v => location.hash = '#/'+v, v);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${SP}/shots/${name}-${v.replace('/','_')}.png`, fullPage: true });
    }
    // forms
    for (const f of ['labor','cosecha','monitoreo','parcela','insumo','movimiento']) {
      await page.evaluate(f => AP.store.openForm(f, f==='labor'?{parcelaId:'p3'}:{}), f);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SP}/shots/${name}-form-${f}.png` });
      await page.evaluate(() => AP.store.closeForm());
    }
    await ctx.close();
  };
  await run('desk', { width: 1440, height: 900 }, false);
  await run('mob', { width: 390, height: 844 }, false);
  await run('deskdark', { width: 1440, height: 900 }, true);
  await browser.close();
  const f=errors.filter(e=>!e.includes('ERR_FAILED')); console.log(f.length ? f.join('\n') : 'NO ERRORS (aside from blocked map tiles: '+errors.length+')');
})();
