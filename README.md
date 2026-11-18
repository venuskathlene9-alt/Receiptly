# Receiptly

Receiptly is a React/Vite expense tracker. Sign in or create an account with Google through Supabase. Expenses and receipt images are stored in Supabase and are available across devices. Profile preferences and avatar images remain local to the current browser. Receipt images are processed in the browser with Tesseract.js, and OCR results are only saved after you review and confirm them.

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start the development server:

   ```sh
   npm run dev
   ```

Set the Supabase project URL and publishable/anon key in `.env`:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

In Supabase, enable Google under **Authentication → Providers**, set up its Google OAuth credentials, and allow the app callback URL (`<app-origin>/app`) under **Authentication → URL Configuration**. For local development, use the origin and port printed by Vite. Then open the local URL printed by Vite.

Open the Supabase **SQL Editor**, paste the contents of [`supabase-setup.sql`](./supabase-setup.sql), and run it. This creates the expenses table, row-level security policies, and a private receipt-image bucket. Do not make the bucket public or expose a Supabase service-role key in the app.

## Data storage

Expenses and receipt images sync to the signed-in Supabase account. Row-level security and private bucket policies restrict them to their owner. Existing expenses saved locally in this browser are uploaded the first time the workspace loads after the SQL setup. Profile preferences and avatar images are still stored locally; clearing site data can remove those local settings.

## Features

- Google sign-in and account creation through Supabase Auth.
- Receipt image upload, drag-and-drop, browser camera capture, client-side OCR, editable extraction review, and explicit confirmation before saving.
- Manual expense records, edit/delete confirmation, search, category filtering, and sorting.
- Live dashboard summaries, reports and charts, category/date filters, CSV export, browser printing, and scanned receipt history.
- Profile and preferences pages. You can choose a default currency before adding expenses; it is then locked so records keep one consistent currency. Receiptly never converts amounts.

## Deployment

Build with `npm run build` and deploy the generated `dist/` folder to a static host such as Vercel. The app uses client-side routes, so configure the host to rewrite application paths to `index.html`.
