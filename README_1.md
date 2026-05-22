# Identity Defender

A Galaxian-style arcade defense game, themed on identity security.
**Hackers don't hack in — they log in. How many can you defend?**

Defend the identity perimeter from waves of threats:

- 🟦 **Shadow IT** drones
- 🟪 **Compromised Credentials**
- 🟧 **Rogue NHIs** (non-human identities)
- 🟨 **Rogue AI Agents** (the flagship targets — kill their escorts first for the 800-point combo)
- 🟢 **LOTL Impostors** (Living-off-the-Land — look legitimate until they cross the trust boundary)
- ⚠️ **Scattered Spider** raids (coordinated identity attacks — clear all 5 before they re-spawn)

Read movement, not appearance. Don't shoot sanctioned users (−200 penalty).

---

## How to play

| Key | Action |
|-----|--------|
| `← →` or `A / D` | Move sentinel |
| `Space` | Fire |
| `P` | Pause / resume |
| `Enter` | Start / restart |

On mobile/tablet, on-screen touch controls appear automatically.

The game starts with **INITIATE OBSERVABILITY** — shoot the 5 system icons (On-Prem, Cloud, Human, NHI, AI Agent) to enable full visibility before threats begin.

Play through Quarters (waves) of increasing difficulty. High scores are saved locally in your browser.

---

## Tech

Single self-contained HTML file. No build step, no dependencies, no framework.
Renders to `<canvas>` at 640×720 with an inline legend column on desktop.

External resources (loaded from CDNs):

- Google Fonts: Press Start 2P + JetBrains Mono

That's it.

---

## Configuration

Two things to update once you've deployed:

### 1. `GAME_URL` constant (top of the `<script>` block)

```js
const GAME_URL = 'https://YOUR-SHORT-LINK';
```

This appears in the social-share text and on the downloadable share card. Use a shortener (bit.ly, etc.) so the link looks clean in posts.

### 2. Open Graph meta tags (top of `<head>`)

Replace every `https://YOUR-DOMAIN.com/` placeholder with your actual deployed URL. Affects `og:url`, `og:image`, `og:image:secure_url`, and `twitter:image`.

For the preview image, the easiest path:

1. Play the game once, hit the **⬇️ DOWNLOAD CARD** button
2. Rename the downloaded file to `preview.png`
3. Drop it next to `index.html` in the repo

That gives you a perfect 1200×630 preview card for social shares.

---

## Deploying via GitHub + Vercel

1. Push this folder to a new GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects it as a static site — no settings to change
4. Deploy

After deploy:

- Copy your Vercel URL (e.g. `https://identity-defender-xxx.vercel.app/`)
- Create a short link with [bit.ly](https://bit.ly) pointing to it
- Update `GAME_URL` in `index.html` with your short link
- Update the OG meta tag URLs to point to your Vercel URL
- Commit + push — Vercel redeploys automatically

To validate your preview card once live:

- LinkedIn: [Post Inspector](https://www.linkedin.com/post-inspector/)
- X: paste the URL into a draft tweet — it'll show the card
- Facebook: [Sharing Debugger](https://developers.facebook.com/tools/debug/)

LinkedIn caches aggressively — use the Post Inspector to force a re-scrape if it shows stale info.

---

## Credit

Game design and code: built collaboratively in an iterative chat session.
Theme: identity observability and threat protection patterns from [AuthMind](https://www.authmind.com).
Gameplay foundation: inspired by Namco's *Galaxian* (1979).
