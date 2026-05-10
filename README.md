# anglebas.in

Landing site for **Angle Basin** — WebGL striation background (Three.js), overlay links, and Open Graph metadata.

## Develop

Requires **Node 20+** (CI uses 22).

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

Static output is written to `dist/`. Vite copies assets from `public/` (including `public/images/og.png` for social previews).

## Deploy

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml): `npm ci`, `npm run build`, then upload `dist/` to GitHub Pages. Custom domain is configured in [`public/CNAME`](public/CNAME).
