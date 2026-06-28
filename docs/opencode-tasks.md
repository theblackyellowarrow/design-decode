# OpenCode task sequence

## Task 1: Verify local dev
Run `npm install`, copy `.env.example` to `.env.local`, add Gemini key, run `npm run dev`, upload an image, and test one lens.

## Task 2: Re-audit
Check local API routing, ESLint, dependency pins, headers, rate limits, abort logic, and per-lens loading states.

## Task 3: Improve image handling
Add client-side image compression before upload. Keep the 6 MB API limit as a hard safety layer.

## Task 4: Add export
Add Markdown export per lens and full-session export.

## Task 5: Add pedagogy mode
Add optional teacher/student modes without changing the core lenses.
