#!/usr/bin/env python3
"""Build docs/js/i18n/<lang>.js from tools/translations/<lang>.json.

Translation files map ENGLISH TEXT -> translation, which is safe: a key that
doesn't exactly match the corpus is reported and simply falls back to English
on the site, never showing a wrong string.

Usage: python3 tools/build_lang.py fr es de ...   (or no args = all files present)
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(__file__)
CORPUS = json.load(open(os.path.join(HERE, "..", "docs", "js", "i18n", "_corpus.json")))
TEXT2KEY = {}
def norm(s): return re.sub(r"\s+", " ", s).strip()
for k, v in CORPUS.items():
    TEXT2KEY[norm(v)] = k

def build(lang):
    src = os.path.join(HERE, "translations", lang + ".json")
    data = json.load(open(src))
    out_s, missing = {}, []
    for eng, tr in data.get("strings", {}).items():
        k = TEXT2KEY.get(norm(eng))
        if k: out_s[k] = tr
        else: missing.append(eng[:70])
    untranslated = [v[:60] for t, v in ((norm(v), v) for v in CORPUS.values()) if t not in {norm(e) for e in data.get("strings", {})}]
    payload = {
        "_lang": lang,
        "s": out_s,
        "ui": data.get("ui", {}),
        "x": data.get("x", {}),
        "places": data.get("places", {}),
    }
    dst = os.path.join(HERE, "..", "docs", "js", "i18n", lang + ".js")
    with open(dst, "w") as f:
        f.write("window.NSTO_I18N=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";")
    print(f"{lang}: {len(out_s)}/{len(CORPUS)} strings, {len(data.get('places',{}))} places, "
          f"{len(missing)} unmatched keys, {len(untranslated)} untranslated → {os.path.getsize(dst)//1024} KB")
    for m in missing[:8]: print("  UNMATCHED:", m)
    if len(untranslated) and len(untranslated) <= 12:
        for u in untranslated: print("  MISSING:", u)

if __name__ == "__main__":
    langs = sys.argv[1:]
    if not langs:
        langs = [f[:-5] for f in os.listdir(os.path.join(HERE, "translations")) if f.endswith(".json")]
    for l in sorted(langs): build(l)
