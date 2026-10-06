#!/usr/bin/env python3
"""Genera la copia de la app para publicarla como Artifact de claude.ai (vista previa).

Uso:  python3 scripts/build-preview.py <carpeta_salida>

Diferencias respecto a la app real (por límites del visor de claude.ai):
  - index.html sin <!doctype>/<html>/<head>/<body> (el publicador añade el esqueleto).
  - Sin service worker (el visor no lo permite).
  - Sin vendor/xlsx.full.min.js (contiene un byte ESC que el publicador rechaza):
    la exportación a Excel no funciona en la vista previa.
  - js/preview-weather.js: si el clima real falla (el visor bloquea fetch externo),
    usa un pronóstico simulado que la app marca como "Simulado".
  - Carga la finca de demostración la primera vez que se abre.
Imprime la lista de archivos de apoyo (JSON) para el parámetro `files` de la herramienta Artifact.
"""
import json, os, re, shutil, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
os.makedirs(out, exist_ok=True)
for d in ('css', 'js', 'vendor', 'assets'):
    shutil.rmtree(os.path.join(out, d), ignore_errors=True)
    shutil.copytree(os.path.join(root, d), os.path.join(out, d))
shutil.copy(os.path.join(root, 'manifest.webmanifest'), out)
os.remove(os.path.join(out, 'vendor', 'xlsx.full.min.js'))
shutil.copy(os.path.join(root, 'scripts', 'preview-weather.js'), os.path.join(out, 'js', 'preview-weather.js'))

s = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
links = re.findall(r'<link rel="stylesheet"[^>]*>', head)
theme = re.search(r'<!-- Tema antes.*?</script>', head, re.S).group(0)
boot = ('<script src="js/preview-weather.js"></script>\n  <script src="js/app.js"></script>\n'
        '  <script>try{var S=AP.store;if(!S.state.parcelas.length&&!S.state.settings.onboarded)S.loadDemo();}catch(e){}</script>')
assert '<script src="js/app.js"></script>' in body
body = body.replace('<script src="js/app.js"></script>', boot)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write('\n'.join(['<title>AgroPiña Pro</title>'] + links + [theme, body]))

app = open(os.path.join(out, 'js', 'app.js'), encoding='utf-8').read()
app, n = re.subn(r"if \('serviceWorker' in navigator.*?\n    }\n", "", app, flags=re.S)
assert n == 1, 'no se encontró el registro del service worker'
open(os.path.join(out, 'js', 'app.js'), 'w', encoding='utf-8').write(app)

files = sorted(os.path.relpath(os.path.join(d, f), out) for d, _, fs in os.walk(out) for f in fs)
files.remove('index.html')
print(json.dumps(files))
