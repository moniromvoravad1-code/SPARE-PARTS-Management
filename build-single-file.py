"""
Build one self-contained HTML file from the multi-file source.

Every <link> and <script> in dev.html is replaced by the file it points at, in
the same order, and the logo is embedded as a data URI. The result runs from a
USB stick, an email attachment or a web host with no other files beside it.

READ THIS BEFORE POINTING IT AT THE SHIPPED FILE.

The js/ tree is BEHIND the shipped product and has been since v3.1. It has no
Firebase sync, no shared photo storage, and none of the v3.2 mobile work, so a
build from it is a worse app that merely looks the same. It is deliberately
written to a scratch name for that reason: overwriting the shipped file with
this output would silently undo weeks of work, and the failure would only show
up later, on somebody's phone.

Bringing js/ back up to date is the fix. Until then treat this script as a way
to test the multi-file source, not as the thing that produces the release.
"""
import base64
import io
import os
import re
import sys

ROOT = r'c:\Users\Dell\Downloads\files'

# The multi-file entry point. index.html is the shipped single file now, so
# reading that would just re-inline an already-inlined page.
SRC = 'dev.html'

# The current release, for the guard below. Never written by this script.
SHIPPED = os.path.join(ROOT, 'Final', 'SPARE PARTS MANAGEMENT SYSTEM V3.2.html')

OUT_DIR = os.path.join(ROOT, 'Final')
OUT = os.path.join(OUT_DIR, 'dev-build.html')

if os.path.abspath(OUT) == os.path.abspath(SHIPPED):
    sys.exit(
        'Refusing to run: OUT points at the shipped file.\n'
        'js/ has no Firebase sync, no shared photos and no v3.2 mobile work,\n'
        'so this would replace the release with a worse build. Update js/ first.'
    )


def read(rel):
    with io.open(os.path.join(ROOT, rel.replace('/', os.sep)), encoding='utf-8') as f:
        return f.read()


def strip_v(url):
    """css/base.css?v=20260901a -> css/base.css"""
    return url.split('?')[0]


def guard(js):
    """A literal </script> inside JS would close the tag early."""
    return re.sub(r'</(script)', r'<\\/\1', js, flags=re.I)


html = read(SRC)

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

# Say what this file is, right at the top, so a copy that escapes into the wild
# cannot be mistaken for the release.
html = html.replace(
    '<head>',
    '<head>\n  <!-- Spare Parts Management System - DEVELOPMENT build from js/.\n'
    '       NOT the shipped app: no Firebase sync, no shared photos, none of the\n'
    '       v3.2 mobile work. The release is Final/SPARE PARTS MANAGEMENT\n'
    '       SYSTEM V3.2.html. Generated from dev.html; edit js/, not this. -->',
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
