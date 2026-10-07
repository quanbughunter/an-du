#!/usr/bin/env python3
"""Build Ăn Đủ: one self-contained page in three flavours.
  dist/artifact.html      — Claude artifact (no html/head skeleton)
  dist/www/               — GitHub Pages / PWA (index.html + manifest + sw.js + icons)
  dist/apk-www/index.html — bundled into the Android APK (offline, file://)
"""
import base64, re, json, os, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
FONTS = ROOT / 'fontsrc'
VERSION = '1.0.1'

def font_css():
    out = []
    def embed(css_path, family, subsets, weight_filter=None):
        css = css_path.read_text()
        for block in re.findall(r'/\* ([^*]+) \*/\s*(@font-face \{.*?\})', css, re.S):
            name, body = block
            if not any(f'-{s}-' in name for s in subsets):
                continue
            m = re.search(r'url\(\./files/([^)]+\.woff2)\)', body)
            data = base64.b64encode((css_path.parent / 'files' / m.group(1)).read_bytes()).decode()
            body = re.sub(r"src:[^;]+;", f"src: url(data:font/woff2;base64,{data}) format('woff2');", body)
            body = re.sub(r"font-family: '[^']+';", f"font-family: '{family}';", body)
            out.append(body)
    bvp = FONTS / 'fontsource-be-vietnam-pro-5.3.0' / 'package'
    for w in (400, 500, 600, 700):
        embed(bvp / f'{w}.css', 'Be Vietnam Pro', ['latin', 'latin-ext', 'vietnamese'])
    embed(FONTS / 'fontsource-variable-baloo-2-5.3.0' / 'package' / 'index.css', 'Baloo 2', ['latin', 'latin-ext', 'vietnamese'])
    return '\n'.join(out)

def build():
    css = (SRC / 'styles.css').read_text()
    shell = (SRC / 'shell.html').read_text()
    js = '\n'.join((SRC / f).read_text() for f in ('foods.js', 'core.js', 'ui.js', 'events.js'))
    js = "(function () {\n'use strict';\nconst APP_VERSION = '" + VERSION + "';\n" + js + "\n})();"
    fonts = font_css()
    style = f'<style>\n{fonts}\n{css}\n</style>'
    body = f'{shell}\n<script>\n{js}\n</script>\n'

    DIST.mkdir(exist_ok=True)
    # 1) artifact: no skeleton, <title> and <style> first
    (DIST / 'artifact.html').write_text(f'<title>Ăn Đủ</title>\n{style}\n{body}')

    head_common = ('<meta charset="utf-8">\n'
                   '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                   '<meta name="theme-color" content="#F5F4FF" media="(prefers-color-scheme: light)">\n'
                   '<meta name="theme-color" content="#15122A" media="(prefers-color-scheme: dark)">\n'
                   '<meta name="description" content="Ăn Đủ — nhật ký calo và dinh dưỡng mỗi ngày bằng tiếng Việt.">\n'
                   '<title>Ăn Đủ</title>\n')
    # 2) web / PWA
    www = DIST / 'www'
    if www.exists(): shutil.rmtree(www)
    www.mkdir(parents=True)
    pwa_head = head_common + ('<link rel="manifest" href="manifest.webmanifest">\n'
                              '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
                              '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
                              '<meta name="apple-mobile-web-app-capable" content="yes">\n')
    (www / 'index.html').write_text(f'<!doctype html>\n<html lang="vi">\n<head>\n{pwa_head}{style}\n</head>\n<body>\n{body}</body>\n</html>\n')
    (www / 'manifest.webmanifest').write_text(json.dumps({
        'name': 'Ăn Đủ — Nhật ký calo', 'short_name': 'Ăn Đủ', 'lang': 'vi', 'start_url': './', 'scope': './',
        'display': 'standalone', 'background_color': '#F5F4FF', 'theme_color': '#F5F4FF',
        'icons': [
            {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
        ]
    }, ensure_ascii=False, indent=2))
    (www / 'sw.js').write_text(
        "const C='an-du-" + VERSION + "';\n"
        "self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'])));self.skipWaiting();});\n"
        "self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim();});\n"
        "self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));});\n")
    icons = ROOT / 'build' / 'icons'
    if icons.exists():
        shutil.copytree(icons, www / 'icons')
    (www / '.nojekyll').write_text('')

    # 3) APK assets
    apk = DIST / 'apk-www'
    apk.mkdir(exist_ok=True)
    (apk / 'index.html').write_text(f'<!doctype html>\n<html lang="vi">\n<head>\n{head_common}{style}\n</head>\n<body>\n{body}</body>\n</html>\n')
    for p in [DIST / 'artifact.html', www / 'index.html', apk / 'index.html']:
        print(p.relative_to(ROOT), f'{p.stat().st_size/1024:.0f} KB')

if __name__ == '__main__':
    build()
