// Copia las librerías de terceros desde node_modules a /vendor para que la app
// funcione sin CDN y 100% offline (PWA). Ejecutar con: npm run vendor
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nm = (p) => join(root, 'node_modules', p);
const out = (p) => join(root, 'vendor', p);

rmSync(out(''), { recursive: true, force: true });
const copy = (from, to) => { mkdirSync(dirname(out(to)), { recursive: true }); cpSync(nm(from), out(to), { recursive: true }); };

copy('vue/dist/vue.global.prod.js', 'vue.global.prod.js');
copy('chart.js/dist/chart.umd.min.js', 'chart.umd.min.js');
copy('leaflet/dist/leaflet.js', 'leaflet/leaflet.js');
copy('leaflet/dist/leaflet.css', 'leaflet/leaflet.css');
copy('leaflet/dist/images', 'leaflet/images');
copy('xlsx/dist/xlsx.full.min.js', 'xlsx.full.min.js');
copy('@fortawesome/fontawesome-free/css/all.min.css', 'fontawesome/css/all.min.css');
for (const f of ['fa-solid-900.woff2', 'fa-regular-400.woff2', 'fa-brands-400.woff2']) copy(`@fortawesome/fontawesome-free/webfonts/${f}`, `fontawesome/webfonts/${f}`);
// Tipografía empresarial: IBM Plex Sans (interfaz) + IBM Plex Mono (códigos y cifras)
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
let css = '';
for (const w of [400, 500, 600, 700]) {
  for (const [sub, range] of [['latin-ext', LATIN_EXT], ['latin', LATIN]]) {
    const f = `ibm-plex-sans-${sub}-${w}-normal.woff2`;
    copy(`@fontsource/ibm-plex-sans/files/${f}`, `fonts/${f}`);
    css += `@font-face{font-family:'IBM Plex Sans';font-style:normal;font-display:swap;font-weight:${w};src:url(${f}) format('woff2');unicode-range:${range}}\n`;
  }
}
for (const w of [400, 500]) {
  const f = `ibm-plex-mono-latin-${w}-normal.woff2`;
  copy(`@fontsource/ibm-plex-mono/files/${f}`, `fonts/${f}`);
  css += `@font-face{font-family:'IBM Plex Mono';font-style:normal;font-display:swap;font-weight:${w};src:url(${f}) format('woff2');unicode-range:${LATIN}}\n`;
}
writeFileSync(out('fonts/fonts.css'), css);
console.log('vendor/ actualizado');
