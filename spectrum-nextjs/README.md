# Spectrum Connect — Next.js App

A full Next.js 14 (App Router) conversion of the Spectrum Connect HTML prototype.

---

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
app/
├── layout.tsx                    # Root layout (fonts, global CSS)
├── globals.css                   # All CSS merged (shared + app + marketing + flow)
├── page.tsx                      # Home page  ← pages/home.jsx
│
├── (marketing)/
│   ├── how-it-works/page.tsx     # ✅ Fully converted ← pages/flow-story.jsx
│   ├── pricing/page.tsx          # ✅ Fully converted ← pages/pricing.jsx
│   ├── about/page.tsx            # 🔲 Stub ← pages/about.jsx
│   └── community/page.tsx        # 🔲 Stub ← pages/community.jsx
│
├── (auth)/
│   ├── login/page.tsx            # ✅ Fully converted ← login.jsx
│   └── signup/page.tsx           # ✅ Fully converted ← signup.jsx
│
├── (creator)/
│   ├── layout.tsx                # Creator sidebar + header
│   ├── dashboard/page.tsx        # 🔲 Stub ← pages/dashboard.html
│   ├── projects/page.tsx         # 🔲 Stub ← pages/projects.html
│   ├── applications/page.tsx     # 🔲 Stub ← pages/applications.html
│   ├── smart-connect/page.tsx    # 🔲 Stub ← pages/smart-connect.html
│   ├── messaging/page.tsx        # 🔲 Stub ← pages/messaging.html
│   ├── earnings/page.tsx         # 🔲 Stub ← pages/earnings.html
│   └── profile/page.tsx          # 🔲 Stub ← pages/profile.html
│
└── (client)/
    ├── layout.tsx                # Client sidebar + header
    ├── dashboard/page.tsx        # 🔲 Stub ← client/dashboard.html
    ├── projects/page.tsx         # 🔲 Stub ← client/my-projects.html
    ├── projects/create/page.tsx  # 🔲 Stub ← client/create-project.html
    ├── collaborators/page.tsx    # 🔲 Stub ← client/collaborator-search.html
    ├── messaging/page.tsx        # 🔲 Stub ← client/messaging.html
    ├── payments/page.tsx         # 🔲 Stub ← client/payments.html
    ├── resources/page.tsx        # 🔲 Stub ← client/resources.html
    └── smart-connect/page.tsx    # 🔲 Stub ← client/smart-connect.html

components/
├── Nav.tsx        # Sticky marketing nav with active-link detection
├── Footer.tsx     # Marketing footer
└── Avatar.tsx     # Gradient avatar (shared across pages)
```

---

## Route Map

| Old HTML file | Next.js route |
|---|---|
| `pages/home.html` | `/` |
| `pages/flow-story.html` | `/how-it-works` |
| `pages/pricing.html` | `/pricing` |
| `pages/about.html` | `/about` |
| `pages/community.html` | `/community` |
| `Login.html` | `/login` |
| `Sign Up.html` | `/signup` |
| `pages/dashboard.html` | `/creator/dashboard` |
| `pages/projects.html` | `/creator/projects` |
| `pages/applications.html` | `/creator/applications` |
| `pages/smart-connect.html` | `/creator/smart-connect` |
| `pages/messaging.html` | `/creator/messaging` |
| `pages/earnings.html` | `/creator/earnings` |
| `pages/profile.html` | `/creator/profile` |
| `client/dashboard.html` | `/client/dashboard` |
| `client/my-projects.html` | `/client/projects` |
| `client/create-project.html` | `/client/projects/create` |
| `client/collaborator-search.html` | `/client/collaborators` |
| `client/messaging.html` | `/client/messaging` |
| `client/payments.html` | `/client/payments` |
| `client/resources.html` | `/client/resources` |
| `client/smart-connect.html` | `/client/smart-connect` |

---

## Assets

Copy the `assets/` folder into `public/`:

```bash
cp -r assets/ spectrum-nextjs/public/assets/
```

Images are then available at `/assets/spectrum-logo.png` etc.

---

## Completing the Stub Pages

Each stub page has a `TODO` comment pointing to the source HTML file. The conversion pattern is the same for every dashboard page:

### Dashboard pages (Tailwind-based)

The `client/*.html` and `pages/dashboard.html` files use **Tailwind CSS** via CDN and **Font Awesome** icons.

In Next.js, Tailwind is already configured. Replace Font Awesome with **lucide-react**:

```bash
npm install lucide-react
```

Then in any page:
```tsx
import { Bell, Search, ChevronRight } from 'lucide-react';
```

**Conversion steps for each dashboard page:**
1. Open the source `.html` file
2. Copy everything inside `<body>` (skip the `<header>` — it's in the layout)
3. Paste into the page component's return statement
4. Fix HTML→JSX: `class` → `className`, `for` → `htmlFor`, self-close void elements
5. Replace Font Awesome `<i>` tags with `lucide-react` equivalents
6. Replace any `onclick` with React `onClick` handlers
7. Add `'use client'` at the top if you use `useState`/`useEffect`

### Marketing pages (React JSX-based)

Pages like `pages/about.jsx` and `pages/community.jsx` are already React. Conversion:
1. Remove `const { useState } = React;` → `import { useState } from 'react'`
2. Remove `ReactDOM.createRoot(...).render(...)` at the bottom
3. Add `export default` to the main `Page` component
4. Fix image paths: `../assets/` → `/assets/`
5. Fix links: `.html` extensions → Next.js routes (see route map above)
6. Replace `<a href="...">` nav links with Next.js `<Link href="...">`
7. Remove inline `<Nav/>` and `<Footer/>` definitions — import from `@/components`
8. Add `'use client'` at the top if the component uses hooks

---

## CSS Architecture

All CSS lives in `app/globals.css` — a merge of:

| Original file | Contents |
|---|---|
| `shared.css` | Auth page layout, form fields, buttons |
| `app.css` | Dashboard polish, toasts, notifications |
| `marketing.css` | Reveal animations, navbar scroll, marquee |
| `pages/home.css` | Nav, hero, feature cards, pricing, footer |
| `pages/flow.css` | How-it-works steps, mock cards, connectors |

Additional CSS files not yet merged (copy contents into `globals.css`):
- `pages/pricing.css`
- `pages/about.css`
- `pages/community.css`

---

## Authentication

The login/signup forms currently simulate auth with a `setTimeout`. Wire up your real backend:

```tsx
// app/(auth)/login/page.tsx
const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  if (res.ok) router.push(role === 'client' ? '/client/dashboard' : '/creator/dashboard');
};
```

---

## Tech Stack

| | Original prototype | Next.js app |
|---|---|---|
| Framework | React via CDN + Babel | Next.js 14 App Router |
| Styling | Custom CSS files | globals.css (same CSS) |
| Dashboard styling | Tailwind CDN | Tailwind (npm package) |
| Icons | Font Awesome CDN | lucide-react (recommended) |
| Routing | `<a href=".html">` | `<Link href="...">` |
| Images | `<img>` | `next/image` `<Image>` |
| TypeScript | No | Yes |

---

## Deployment

```bash
npm run build   # type-check + build
npm start       # production server
```

Or deploy to Vercel:
```bash
npx vercel
```
