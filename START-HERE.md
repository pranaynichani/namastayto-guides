# NamastayTO Guest Guides — start here (for editing)

This is the guest-guide website that replaced Pranay's Notion guides. It's **live** at:

| Page | URL | Send to |
|---|---|---|
| South Room | https://pranaynichani.github.io/namastayto-guides/southroom/ | guests in the South room |
| East Room | https://pranaynichani.github.io/namastayto-guides/eastroom/ | guests in the East room |
| Basement Suite | https://pranaynichani.github.io/namastayto-guides/basementroom/ | guests in the basement |
| Around Us (neighbourhood) | https://pranaynichani.github.io/namastayto-guides/aroundus/ | every guest |

**Repo:** github.com/pranaynichani/namastayto-guides · **Pages serves from** the `docs/` folder on `main`.
Plain HTML/CSS/JS, no build step. Same pattern as the portfolio & hospital sites.

---

## Where everything lives (under `docs/`)

- `southroom/index.html`, `eastroom/index.html`, `basementroom/index.html` — the three room guides
- `aroundus/index.html` — neighbourhood explorer (Toronto/Niagara sections are hard-coded here)
- `index.html` — the bare landing page (brand card only, no links — keep it that way for privacy)
- `css/style.css` — all styling (warm light theme + dark theme in one file)
- `js/guide.js` — all interactivity (language picker, tap-to-reveal, in-guide search, filters, open-now, quiet-hours banner, etc.)
- `js/places-data.js` — the 90+ neighbourhood places (name, type, hours, walk time, maps link…)
- `js/i18n/<lang>.js` — compiled translations (do NOT hand-edit; see below)
- `assets/img/{south,east,basement,shared,brand}/` — photos
- `sw.js` — offline service worker (**bump `VERSION` on every change**, currently `nsto-v6`)

### Interactive features built into the room guides (all in `guide.js` + `css/style.css`)
- **In-guide search** 🔍 (title-bar button) — room guides only; indexes the page live (incl. the top essentials card: WiFi/address/check-in), expands synonyms (`SEARCH_SYN` — "trash"→garbage, "internet"→wifi…), jumps + flashes results. Injected by JS, no per-page HTML.
- **WiFi / room-code reveal** — shows a big centred popup (`.secret-pop`) with the value + "copied", so it's never hidden behind the quickbar.
- **WhatsApp quickbar button** — inline SVG glyph (`.wa-ico`, brand green `#25D366`) → `wa.me/16477079594`, in all 4 guides.
- **TTC badges** — red `<span class="ttc">TTC</span>` on the subway/streetcar arrival steps.
- **Quiet-hours auto banner** — `paintHints()` uses `torontoTime()` (Intl `America/Toronto`); only shows 11 PM–8 AM **Toronto time** and prints the live Toronto clock. There's also a static quiet-hours reminder callout near the bottom of each room.

Editing tools live in `tools/` (outside docs/, not published):
- `tools/translations/<lang>.json` — the human-editable translation sources
- `tools/i18n_extract.py` and `tools/build_lang.py` — the two scripts that wire translations up

---

## How to make common edits

### 1. Change wording, prices, rules, room facts, FAQs (English)
Edit the relevant `docs/<room>/index.html` directly. The text between tags is what shows.
Shared content (arrival directions, house rules, FAQs) is duplicated across the three room pages — **change it in each room file that has it.**
👉 After editing English, you must re-sync translations — see step 4.

### 2. Add / edit / remove a neighbourhood place
Edit `docs/js/places-data.js`. Each place is one line with: `name, type, cuisine, price, hours, openLate, goodFor, desc, address, walk, walkMin, maps`.
`type` must be one of: `cafe restaurant bar bakery latenight entertainment grocery services`.
Keep `hours` in the same style as the others so the live "open now" badge keeps working.
👉 New/changed place descriptions also need translating — see step 4.

### 3. Swap or add a photo
Drop the image in the right `docs/assets/img/<room>/` (or `shared/`) folder and update the `<img src>` in the HTML. Keep files web-sized (~1600px wide max, compressed) so pages stay fast.

### 4. Update the 9 languages after any English change
Translations are keyed to the exact English text. Each `data-i18n="…"` key is `md5(normalised-innerHTML)[:8]`, mapped to English in `docs/js/i18n/_corpus.json`.

> ⚠️ **Do NOT run `tools/i18n_extract.py`.** Its current version is lossy — it silently drops ~48 already-translated strings (every callout, the jnav/quickbar labels, and the house rules) and rewrites `_corpus.json`, which breaks translations across the whole site. It does not manage those elements, so re-running it removes their keys. (Fixing that script is a separate future task — see below.)

The safe way to change/add a string:
1. Edit the English in the room HTML. For a **changed** string the key must change too: compute `md5(normalised new innerHTML)[:8]`, set it as the new `data-i18n`, and add `newkey → English` to `_corpus.json` (a tiny throwaway Python script is easiest — the chat can do this).
2. Add the matching English→translation entry in each `tools/translations/<lang>.json` (8: fr, es, de, pt, ko, zh, ja, hi). UI/JS-built labels go in the `"ui"` section instead (keyed by name, not English).
3. `python3 tools/build_lang.py` — compiles them into `docs/js/i18n/*.js`. It prints coverage; anything untranslated simply falls back to English (never shows wrong text). Aim for `0 untranslated`.
> Easiest: just tell the chat "I changed X in English, re-translate it" — it handles the key + corpus + all 8 languages + rebuild.

### 5. Change a door code or WiFi password
These are **base64-encoded**, not plain text, so they don't leak to Google/GitHub search.
Look for `data-secret="..."` in the room HTML. To make a new one:
`python3 -c "import base64;print(base64.b64encode(b'NEWCODE').decode())"` and paste the result as the new `data-secret`.
(Current: WiFi `383concord`; South room code `881000`; East `383000`. Basement + front-door codes are per-guest via Airbnb, not on the site.)

---

## Preview before publishing
From a chat, ask it to start the preview (dev server name **`namastayto-guides`**, port 8642) and open `http://localhost:8642/southroom/`. Test on mobile width, in both light/dark, and switch a couple of languages.
Tip: add `?theme=dark` or `?theme=light` to any URL to force a theme for screenshots.

## Publish
Commit and push to `main`; GitHub Pages redeploys in ~1–2 minutes.
**Always bump `VERSION` in `docs/sw.js`** (e.g. `nsto-v5` → `nsto-v6`) or returning guests keep seeing the old cached version. (Live is now `nsto-v6`.)

---

## Next up (open tasks)
- **Fix `tools/i18n_extract.py`** (lower priority) — it's lossy (see step 4). Until fixed, manage `data-i18n` keys manually.
- ~~Around Us walk times~~ — **done** (reconciled vs Google Maps from 383 Concord Ave).
- ~~Per-language search synonyms~~ — **done**. `SEARCH_SYN` in `js/guide.js` now has all 9 languages; matching is accent-insensitive (`fold()`), short Latin words match whole-word only. To add words later, just edit that language's arrays (keep proper nouns — Kumbah/Oliver/Ossington/TTC/Green P/Roku — in every language's groups) and bump `sw.js`.

---

## Guardrails (please keep these true)
- Room guides must **never** link to or mention another room, or reveal another room's code.
- Keep `docs/index.html` link-free and the `noindex` meta + `robots.txt` in place — that's what keeps the guides out of Google while still opening instantly for anyone with the link.
- No analytics, cookies, or third-party scripts — it's part of the "100% private" promise made to guests and keeps it fast.
- Place **names/addresses stay in English** in every language (guests match them to street signs & Google Maps).
