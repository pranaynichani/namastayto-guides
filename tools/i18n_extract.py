#!/usr/bin/env python3
"""Annotate the guide pages with data-i18n keys and dump the English corpus.

Keys are short hashes of the normalized English innerHTML, so identical
strings shared between pages (arrival steps, house rules, FAQs) get ONE key
and are translated once. Re-runnable: already-keyed elements keep their key
as long as their English text is unchanged.

Usage: python3 tools/i18n_extract.py          (from repo root)
Writes: docs/js/i18n/_corpus.json  {key: english-innerHTML}
"""
import hashlib, json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "docs")
PAGES = ["southroom/index.html", "eastroom/index.html",
         "basementroom/index.html", "aroundus/index.html", "index.html"]

# leaf-ish elements whose innerHTML we translate wholesale
TAGS = r"(?:h1|h2|h3|p|li|summary|figcaption|td|th|button|label|a|span|div|small|b|i|em)"

# classes/elements we key (attribute regex applied to the opening tag)
def want(tag, attrs, inner):
    if "data-i18n" in attrs: return True          # already keyed
    if "data-no-i18n" in attrs: return False
    if not re.search(r"[A-Za-z]{2}", re.sub(r"<[^>]+>", "", inner)): return False
    return True

def norm(s):
    return re.sub(r"\s+", " ", s).strip()

def key_for(inner):
    return hashlib.md5(norm(inner).encode()).hexdigest()[:8]

# Elements are selected by a curated list of (regex) openers to avoid keying
# containers. Each pattern must capture: 1=full opening tag, 2=inner html.
PATTERNS = [
    # headings & prose
    r'(<h1[^>]*>)(.*?)(</h1>)',
    r'(<h2[^>]*>)(.*?)(</h2>)',
    r'(<h3[^>]*>)(.*?)(</h3>)',
    r'(<p(?=[ >])[^>]*>)(.*?)(</p>)',
    r'(<li(?=[ >])[^>]*>)(.*?)(</li>)',
    r'(<summary[^>]*>)(.*?)(</summary>)',
    r'(<figcaption[^>]*>)(.*?)(</figcaption>)',
    r'(<th(?=[ >])[^>]*>)(.*?)(</th>)',
    r'(<td(?=[ >])[^>]*>)(.*?)(</td>)',
    # UI atoms
    r'(<span class="ess-label"[^>]*>)(.*?)(</span>)',
    r'(<span class="ess-value"[^>]*>)(.*?)(</span>)',
    r'(<button class="ess-act"[^>]*>)(.*?)(</button>)',
    r'(<button class="reveal"[^>]*>)(.*?)(</button>)',
    r'(<button class="btn install-btn"[^>]*>)(.*?)(</button>)',
    r'(<button data-panel[^>]*>)(.*?)(</button>)',
    r'(<a href="#[a-z]+">)(.*?)(</a>)',                    # jnav + quickbar anchors
    r'(<div class="f-t"[^>]*>)(.*?)(</div>)',
    r'(<div class="f-d"[^>]*>)(.*?)(</div>)',
    r'(<div class="p-name"[^>]*>)(.*?)(</div>)',
    r'(<div class="p-desc"[^>]*>)(.*?)(</div>)',
    r'(<span class="callout-t"[^>]*>)(.*?)(</span>)',
]

# containers that PATTERNS would double-key from the inside; we skip a match
# if its inner HTML itself contains one of these (i.e. it's a wrapper)
BLOCKISH = re.compile(r"<(?:p|li|ol|ul|div|table|figure|details|h3)\b")

def add_keys(html, corpus):
    for pat in PATTERNS:
        def repl(m):
            open_tag, inner, close = m.group(1), m.group(2), m.group(3)
            if BLOCKISH.search(inner): return m.group(0)
            if not want("", open_tag, inner): return m.group(0)
            k = key_for(inner)
            corpus[k] = norm(inner)
            if "data-i18n" in open_tag:
                new_open = re.sub(r'data-i18n="[^"]*"', f'data-i18n="{k}"', open_tag)
            else:
                new_open = open_tag[:-1] + f' data-i18n="{k}">'
            return new_open + inner + close
        html = re.sub(pat, repl, html, flags=re.S)
    return html

def main():
    corpus = {}
    for page in PAGES:
        p = os.path.join(ROOT, page)
        html = open(p).read()
        html = add_keys(html, corpus)
        open(p, "w").write(html)
        print(f"keyed {page}")
    # quickbar/jnav label spans (text after .qico span) handled via anchors above.
    os.makedirs(os.path.join(ROOT, "js", "i18n"), exist_ok=True)
    with open(os.path.join(ROOT, "js", "i18n", "_corpus.json"), "w") as f:
        json.dump(corpus, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"corpus: {len(corpus)} unique strings")

if __name__ == "__main__":
    main()
