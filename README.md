# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# ACE-STUDY-COMPANION (AceIt)

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel usually auto-detects **Vite** (`npm run build` → `dist`).  
   `vercel.json` adds SPA **rewrites** so direct visits to `/dashboard`, `/chatbot`, etc. work.
4. Add **Environment Variables** from `.env.example` if you use EmailJS (`VITE_*` keys).
5. **Deploy**. In Firebase Console → Authentication → **Authorized domains**, add your `*.vercel.app` domain (and custom domain if any).

CLI: `npx vercel` then `npx vercel --prod`.
