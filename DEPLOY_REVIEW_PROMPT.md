# Identity Defender — Deployment Review Prompt

Save this file. Each time you're about to deploy a new version of the game, open a fresh Claude conversation, attach your latest `index.html`, fill in the two URLs at the top of the prompt, and paste the rest in. Claude will walk the checklist and patch the file before you push.

---

## How to use

1. Open a new Claude conversation
2. Attach the latest `index.html`
3. Copy everything between the `---` lines below into the chat
4. Replace the two `>>> FILL IN <<<` placeholders with your actual URLs
5. Send

Claude will diff what it changed, flag what needs your decision, and hand you back the updated file.

---

## Prompt — copy from here

I'm about to deploy this single-file HTML game (Identity Defender) to Vercel via GitHub. Before I push, review the attached `index.html` for deployment readiness and make the necessary edits inline.

**Deployment URL:** `>>> FILL IN <<<` (e.g., `https://identity-defender.vercel.app/`)
**Shortened share link:** `>>> FILL IN <<<` (e.g., `https://bit.ly/identity-defender`)

Walk through the checklist below. For each item: either confirm it's correct, or update the file directly. At the end, summarize what you changed and why, then provide the updated file.

### Required updates (auto-fix)

1. **`GAME_URL` constant** — near the top of the `<script>` block. Should equal the shortened share link above. Currently a placeholder.

2. **Open Graph meta tags** — top of `<head>`. Replace every `https://YOUR-DOMAIN.com/` with my deployment URL. Four spots to update: `og:url`, `og:image`, `og:image:secure_url`, `twitter:image`. The image URLs should end with `preview.png` (the share card I'll upload alongside `index.html`).

3. **Image filename consistency** — confirm `og:image`, `og:image:secure_url`, and `twitter:image` all reference the same file. Flag any mismatch.

### Quality checks (flag, then auto-fix obvious issues)

4. **Description copy** — read `og:description`, `twitter:description`, and `meta name="description"`. Are they consistent? Anything reading awkward or off-brand?

5. **Share text** — find `buildShareText()`. Read what gets posted to X / LinkedIn. Flag anything that reads stale.

6. **Debug code** — scan for any `console.log`, `console.warn`, `debugger`, or `alert(` left over from development. Keep `console.error` for genuine error paths (e.g., clipboard write failure). Remove or comment-out the rest.

7. **Placeholder strings** — search for `TODO`, `XXX`, `FIXME`, `REPLACE`, `YOUR-`, and any obviously-temporary stand-ins. Flag each.

8. **Inline favicon** — there's an SVG data URI favicon in `<head>`. Confirm it still renders (it's the yellow Rogue AI Agent diamond). No change needed unless broken.

9. **localStorage key** — find `STORAGE_KEY`. Confirm it looks acceptable for production. Flag if you'd recommend versioning it (e.g., adding `_v2`) when the data shape changes.

10. **External CDN dependencies** — check `<head>` for external `<link>` / `<script>` tags. Confirm they're reputable (Google Fonts, etc.) and that URLs are HTTPS. Flag anything that should be self-hosted for resilience.

### Optional production polish (suggest only — do not add without confirmation)

11. **Analytics** — privacy-friendly tracker (Plausible, Umami, Cloudflare Web Analytics, Vercel Analytics)? If recommended, show the snippet and where to paste it. Don't add it yet.

12. **Mobile / touch controls** — currently keyboard-only. Recommend if mobile play matters for this deployment. Don't add yet.

13. **`vercel.json`** — flag if I'd benefit from one for cache headers, security headers (CSP, X-Frame-Options), or redirects. Show me the contents but don't create the file.

14. **`robots.txt` / `sitemap.xml`** — flag if either is worth adding for SEO. Show contents but don't create.

15. **Accessibility audit** — quick pass: are there missing `alt` attributes, focus traps, or keyboard-inaccessible buttons? Flag specific lines.

### Output format

Reply in exactly this order:

1. **Changes made** — bullet list, file location for each. Format like: `Line 42: GAME_URL changed from 'https://bit.ly/identity-defender' to '<my actual link>'`.
2. **Quality flags** — anything from items 4–10 that needs my attention but you fixed.
3. **Optional polish suggestions** — items 11–15, organized as "suggest / skip" with one-line justification each.
4. **Updated file** — the full revised `index.html`.

If anything is unclear, or you need a piece of information I haven't provided, **stop and ask before making changes**. Don't guess at the deployment URL or invent placeholder values.

## Prompt — end of copy

---

## Notes for yourself

- Run this prompt **before every deploy**, not just the first one. Even small content changes (share text wording, OG description) can drift over time.
- The prompt is intentionally conservative — it won't auto-add analytics, touch controls, or `vercel.json` because those involve product decisions you should make consciously.
- If you change the deployment URL later (custom domain, etc.), the prompt is reusable — just update the two values at the top.
- After Claude returns the updated file, do a quick sanity check on the four OG tag URLs and the `GAME_URL` value before pushing. Three minutes of double-checking saves a stale LinkedIn cache.
