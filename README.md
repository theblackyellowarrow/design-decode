# Design Decode

Design Decode is a critical design reading environment by [dotai](https://dotai.org). Upload a design image and the system reads it through five analytical lenses — each a distinct disciplinary perspective grounded in visual culture, UX, semiotics, materiality, and critical theory.

**Live:** https://design-decode-repo-v2.vercel.app

---

## How it works

1. Choose your entry: **Learner** (concise, student voice) or **Expert** (extended, educator voice)
2. Upload a design artefact — poster, interface, package, exhibition, spatial composition
3. Select up to 3 analytical lenses — readings run in parallel
4. Run the decode — each lens returns a structured reading separating observation from interpretation
5. Generate follow-up critical questions for any completed reading
6. Export individual readings or full sessions as branded Markdown

---

## Five analytical lenses

| Lens | Scope |
|------|-------|
| Visual Form | Composition, hierarchy, rhythm, typography, colour, Gestalt, proportion, visual language |
| User Flow | Navigation, affordance, information architecture, cognitive load, accessibility, patterns of interaction |
| Symbol Logic | Semiotics, visual rhetoric, metaphor, denotation, connotation, cultural codes |
| Production Logic | Materiality, manufacture, sustainability, labour, lifecycle |
| Cultural Lens | Identity, power, class, caste, gender, race, disability, sexuality, region |

---

## Two reading modes

| Mode | Voice | Output |
|------|-------|--------|
| Learner | 21-year-old Indian design student at an elite UK university — sharp, direct, sometimes wry | Under 200 words |
| Expert | Senior design educator, late 40s, India/UK trained, forensic eye, post-structuralist | Under 300 words + discussion questions |

Modes are selected at entry. No mode switching inside the tool.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, single-component SPA |
| Build | Vite 5 |
| API | Vercel serverless function (`api/analyse.js`) |
| AI | OpenAI Chat Completions (gpt-4o-mini default, configurable) |
| Linting | ESLint 9 flat config |
| Deployment | Vercel |

Server-side abort propagation: client disconnect cancels the in-flight OpenAI request.

---

## Features

- 5 free analyses using the server's OpenAI key, then bring-your-own-key
- Key stored in `localStorage`, never logged server-side
- Client-side image compression (JPEG, max 1920px, quality 0.85)
- Markdown export with dotai branding (per lens and full session)
- Server-side rate limiting with automatic purge
- Security headers: CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Embeddable (`frame-ancestors *`)
- Enterprise Google Form for custom deployment requests

---

## Local development

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

```bash
npm run dev     # Vite frontend only
npm run start   # Vercel dev server with /api/analyse proxy
npm run lint    # ESLint
npm run build   # Production build to dist/
```

---

## Deployment

Push to GitHub. Vercel auto-detects the Vite framework. Set environment variables in the Vercel dashboard:

```
OPENAI_API_KEY
OPENAI_MODEL
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

---

## Enterprise

For universities, museums, research groups, studios, publishers, and cultural organisations wanting custom deployments — use the enterprise form on the landing page.

---

Built by dotai. Private prototype.
