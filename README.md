# Design Decode

A Vite + React + Vercel prototype for critical image-based design reading.

The project keeps the Gemini API key server-side and routes all analysis through `/api/analyse.js`.

## First commands

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your key to `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

`npm run dev` uses `vercel dev`, not plain `vite`, so the frontend and `/api/analyse` work together locally.

For frontend-only testing:

```bash
npm run dev:frontend
```

## Audit fixes in this version

- Added `vite.config.js`.
- Added `eslint.config.js`.
- Replaced `latest` dependencies with pinned versions.
- Made `npm run dev` use Vercel CLI so local API calls work.
- Added per-lens loading/error state.
- Added abort/cancel handling.
- Changed multi-lens execution to parallel requests with `Promise.allSettled`.
- Removed `dangerouslySetInnerHTML`; LLM output renders as plain text.
- Added basic server-side rate limiting for testing.
- Added clearer HTTP status codes.
- Added prompt-injection mitigation around user context.
- Added security headers through `vercel.json`.
- Added keyboard-visible focus styles.
- Reset invalid file input selections.

## GitHub

```bash
git init
git add .
git commit -m "Repair Design Decode scaffold after audit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Vercel deployment

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add environment variables:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10
```

4. Deploy.

## OpenCode next prompt

```text
Audit this repo again after the v0.2 repair. Focus on whether local dev now works with Vercel CLI, whether the API route returns useful HTTP status codes, whether prompt injection is sufficiently mitigated for a prototype, and whether the design lenses need stronger uncertainty marking. Do not rewrite the product into a generic AI critique tool.
```
