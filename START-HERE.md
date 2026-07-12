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
- `js/guide.js` — all interactivity (language picker, tap-to-reveal, filters, open-now, etc.)
- `js/places-data.js` — the 90+ neighbourhood places (name, type, hours, walk time, maps link…)
- `js/i18n/<lang>.js` — compiled translations (do NOT hand-edit; see below)
- `assets/img/{south,east,basement,shared,brand}/` — photos
- `sw.js` — offline service worker (**bump `VERSION` on every change**, currently `nsto-v2`)

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
Translations are keyed to the exact English text. When English changes:
1. `python3 tools/i18n_extract.py` — re-scans the HTML and refreshes the key list.
2. Update the matching English entry in each `tools/translations/<lang>.json` (there are 8: fr, es, de, pt, ko, zh, ja, hi).
3. `python3 tools/build_lang.py` — compiles them into `docs/js/i18n/*.js`. It prints coverage; anything left untranslated simply falls back to English (never shows wrong text).
> If you'd rather, just tell the chat "I changed X in English, re-translate it" and it can do steps 2–3 for you.

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
**Always bump `VERSION` in `docs/sw.js`** (e.g. `nsto-v2` → `nsto-v3`) or returning guests keep seeing the old cached version.

---

## Guardrails (please keep these true)
- Room guides must **never** link to or mention another room, or reveal another room's code.
- Keep `docs/index.html` link-free and the `noindex` meta + `robots.txt` in place — that's what keeps the guides out of Google while still opening instantly for anyone with the link.
- No analytics, cookies, or third-party scripts — it's part of the "100% private" promise made to guests and keeps it fast.
- Place **names/addresses stay in English** in every language (guests match them to street signs & Google Maps).
