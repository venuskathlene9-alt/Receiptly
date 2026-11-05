# Receiptly

Receiptly is a React/Vite expense tracker with optional local demo accounts. Accounts and salted password hashes stay in the current browser, while expenses, preferences, and receipt images are stored locally using IndexedDB. There is no backend, sync, or password recovery. Receipt images are processed in the browser with Tesseract.js; OCR results are only saved after you review and confirm them.

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start the development server:

   ```sh
   npm run dev
   ```

Open the local URL printed by Vite. No environment variables or service setup are required.

## Data storage

Your account and workspace are available only in the browser and device where you create them. Passwords are stored as salted hashes in browser local storage; this demo-only sign-in is not server-backed authentication and should not be used to protect sensitive information. Nothing syncs or backs up, and clearing site data can permanently delete accounts, expenses, preferences, and receipt images. Data previously stored in a Supabase project is not imported.

## Features

- Local account creation, sign-in, and sign-out for a browser-only demo workspace.
- Receipt image upload, drag-and-drop, browser camera capture, client-side OCR, editable extraction review, and explicit confirmation before saving.
- Manual expense records, edit/delete confirmation, search, category filtering, and sorting.
- Live dashboard summaries, reports and charts, category/date filters, CSV export, browser printing, and scanned receipt history.
- Profile and preferences pages. You can choose a default currency before adding expenses; it is then locked so records keep one consistent currency. Receiptly never converts amounts.

## Deployment

Build with `npm run build` and deploy the generated `dist/` folder to a static host such as Vercel. The app uses client-side routes, so configure the host to rewrite application paths to `index.html`.
