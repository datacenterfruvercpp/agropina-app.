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
copy('@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin.woff2');
copy('@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2', 'fonts/plus-jakarta-sans-latin-ext.woff2');
writeFileSync(out('fonts/fonts.css'), `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-display:swap;font-weight:200 800;src:url(plus-jakarta-sans-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-display:swap;font-weight:200 800;src:url(plus-jakarta-sans-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`);
console.log('vendor/ actualizado');
