"""
Build one self-contained HTML file from index.html.

Every <link> and <script> in index.html is replaced by the file it points at, in
the same order, and the logo is embedded as a data URI. The result runs from a
USB stick, an email attachment or a web host with no other files beside it.
"""
import base64
import io
import os
import re
import sys

ROOT = r'c:\Users\Dell\Downloads\files'

# The shipped product. This is the file people are handed, so a fix that has not
# been rebuilt has not been shipped - treat running this script as part of done.
OUT_DIR = os.path.join(ROOT, 'Final')
OUT = os.path.join(OUT_DIR, 'SPARE PARTS MANAGEMENT SYSTEM V3.1.html')


def read(rel):
    with io.open(os.path.join(ROOT, rel.replace('/', os.sep)), encoding='utf-8') as f:
        return f.read()


def strip_v(url):
    """css/base.css?v=20260901a -> css/base.css"""
    return url.split('?')[0]


def guard(js):
    """A literal </script> inside JS would close the tag early."""
    return re.sub(r'</(script)', r'<\\/\1', js, flags=re.I)


html = read('index.html')

# Logo as a data URI, so nothing is fetched from disk
logo_svg = read('assets/logo.svg')
logo_uri = 'data:image/svg+xml;base64,' + base64.b64encode(logo_svg.encode('utf-8')).decode('ascii')

css_files = re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)
js_files = re.findall(r'<script src="([^"]+)"></script>', html)
print('inlining %d stylesheets, %d scripts' % (len(css_files), len(js_files)))

# --- styles ---
bundle_css = []
for u in css_files:
    bundle_css.append('/* ===== %s ===== */\n%s' % (strip_v(u), read(strip_v(u))))

first_link = re.search(r'[ \t]*<link rel="stylesheet" href="[^"]+">\n', html)
html = re.sub(r'[ \t]*<link rel="stylesheet" href="[^"]+">\n', '', html)
html = html[:first_link.start()] + '  <style>\n' + '\n'.join(bundle_css) + '\n  </style>\n' + html[first_link.start():]

# --- scripts ---
bundle_js = []
for u in js_files:
    rel = strip_v(u)
    src = read(rel)
    # the packaged build carries its logo inside itself
    src = src.replace("logo: 'assets/logo.svg'", "logo: '%s'" % logo_uri)
    bundle_js.append('/* ===== %s ===== */\n%s' % (rel, guard(src)))

first_script = re.search(r'[ \t]*<script src="[^"]+"></script>\n', html)
html = re.sub(r'[ \t]*<script src="[^"]+"></script>\n', '', html)
html = (html[:first_script.start()]
        + '  <script>\n' + '\n'.join(bundle_js) + '\n  </script>\n'
        + html[first_script.start():])

# Any remaining bare reference to the logo file
html = html.replace('assets/logo.svg', logo_uri)

# Say what this file is, right at the top
html = html.replace(
    '<head>',
    '<head>\n  <!-- Spare Parts Management System 3.0 - single-file build.\n'
    '       Generated from index.html; edit the source files, not this one. -->',
    1)

if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)

with io.open(OUT, 'w', encoding='utf-8', newline='') as f:
    f.write(html)

size = os.path.getsize(OUT)
print('wrote %s (%.0f KB)' % (OUT, size / 1024.0))

# Nothing may still point outside the file. Only real markup attributes count -
# a ${...} inside inlined JS is a template placeholder, not a fetch.
leftovers = re.findall(r'(?:src|href)="([^"]+)"', html)
external = [x for x in leftovers
            if not x.startswith(('data:', '#'))
            and '${' not in x]
print('external references remaining:', external if external else 'none')
if external:
    sys.exit(1)
