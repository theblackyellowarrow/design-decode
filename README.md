# Design Decode

dotai Design Decode is an image analysis tool for designers. Upload a design artefact and the system reads it through five critical lenses. Built by [dotai](https://dotai.org).

**Live:** https://design-decode-repo-v2.vercel.app

---

## What it does

Design Decode does not summarise, optimise, or praise. It reads, interprets, and critiques. The intelligence is a carefully tuned language model persona — a design educator trained across visual culture, UX, semiotics, materiality, and critical theory. Every claim is grounded in visible evidence or marked as inference.

Five lenses, choose up to three:

| Lens | Scope |
|------|-------|
| Visual Form | Elements, principles, Gestalt, composition, visual traditions |
| User Flow | Information architecture, navigation, affordance, cognitive load, accessibility |
| Symbol Logic | Semiotics, denotation and connotation, cultural codes, visual rhetoric |
| Production Logic | Materiality, medium, finish, sustainability, labour, lifecycle |
| Cultural Lens | Class, caste, gender, race, sexuality, disability, region, power |

Two modes:

| Mode | Voice | Words |
|------|-------|-------|
| Standard | 21-year-old Indian design student at an elite UK university — sharp, direct, sometimes wry | Under 200 |
| Expert | Senior design educator, late 40s, India/UK trained, forensic eye, post-structuralist framework | Under 300 |

After each reading, users can request critical questions for that lens. Results export as Markdown with dotai branding.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, single-component SPA |
| Build | Vite 5 |
| API | Vercel serverless function |
| AI | OpenAI Chat Completions (gpt-4o-mini, configurable) |
| Linting | ESLint 9 flat config |
| Deployment | Vercel |

```
Browser → POST /api/analyse → rate-limit → validation → prompt build → OpenAI → response → Browser
```

Server-side abort propagation: client disconnect cancels the in-flight OpenAI request.

---

## Features

- Five analytical lenses with disciplined prompt engineering (describe → interpret → critique within scope)
- Two voice modes (standard / expert)
- Critical questions follow-up per lens
- Client-side image compression (JPEG, max 1920px, quality 0.85)
- Markdown export (per lens and full session) with dotai branding
- 5 free analyses using the server's OpenAI key
- Bring-your-own-key flow after the free tier (key stored in localStorage, never logged server-side)
- Server-side rate limiting with automatic purge
- Security headers (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Embeddable (frame-ancestors *)

---

## Local development

### Prerequisites

- Node.js >= 18
- OpenAI API key

### Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10
```

### Commands

```bash
npm run dev     # Vite frontend only
npm run start   # Vercel dev server (includes /api/analyse proxy)
npm run lint    # ESLint
npm run build   # Production build to dist/
```

---

## Deployment

Push to GitHub. Vercel auto-detects the Vite framework and deploys. Set these environment variables in the Vercel dashboard:

```
OPENAI_API_KEY
OPENAI_MODEL
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

---

## Enterprise

For design houses, education institutes, and research organisations wanting to deploy Design Decode at scale with custom lenses, branding, or LMS integration — use the Enterprise form on the landing page or email theblackyellowarrow@gmail.com.

---

## License

Private prototype. Not licensed for redistribution.
