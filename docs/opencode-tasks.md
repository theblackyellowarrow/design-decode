# OpenCode task sequence

## Task 1: Verify local dev
Run `npm install`, copy `.env.example` to `.env.local`, add OpenAI key, run `npm run dev`, upload an image, and test one lens.

## Task 2: Re-audit
Check local API routing, ESLint, dependency pins, headers, rate limits, abort logic, and loading states. ~~Complete.~~

## Task 3: Improve image handling
Add client-side image compression before upload. Keep the 6 MB API limit as a hard safety layer. ~~Complete.~~

## Task 4: Add export
Add Markdown export per lens (full-session export removed in single-lens refactor). ~~Complete.~~

## Task 5: Add pedagogy mode
Add standard/expert modes. ~~Complete — two-mode system with single-lens radio selection.~~
