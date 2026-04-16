# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Getting Started

Basic steps to install dependencies and run the project locally.

Prerequisites:

- Node.js (18+ recommended)
- pnpm (recommended) — install with `npm install -g pnpm` or enable via Corepack:

```bash
corepack enable && corepack prepare pnpm@latest --activate
```

Install dependencies:

```bash
pnpm install
# or with npm: npm install
```

Run the dev server (Vite):

```bash
pnpm dev
# or with npm: npm run dev
```

Build for production:

```bash
pnpm build
```

Preview a production build locally:

```bash
pnpm preview
```

The available scripts are defined in `package.json` (e.g. `dev`, `build`, `preview`).
