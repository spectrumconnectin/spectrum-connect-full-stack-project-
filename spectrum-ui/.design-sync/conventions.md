# Building with Spectrum Connect UI

This is the design language of Spectrum Connect — a creative marketplace where
clients hire creators, fund escrow, and release payment. The components here are
the app's own; a screen built from them can be pasted into the product.

## Setup

**No provider, no wrapper.** Every component is presentational — no context, no
router, no data fetching. Import and render:

```jsx
import { Card, Button, StatusPill } from '@spectrum-connect/ui';
```

Styling comes entirely from `styles.css`. It already carries Inter and Font
Awesome 6.6 as local `@font-face` rules — do not add a font `<link>` or a CDN
`@import`, and do not install an icon package.

## Start from the structure, not the parts

Screens are built shell-first. `AppShell` is the frame every signed-in page sits
in — it owns the `max-w-7xl` container, the page padding, and the `pb-24 md:pb-8`
that stops the fixed mobile tab bar covering the last row of a list.

```jsx
<AppShell
  header={<AppHeader links={['Dashboard', 'My Projects', 'Payments']} hasNotifications />}
  bottomNav={<BottomNav items={tabs} />}
>
  <WelcomeBanner name="…" message="…" action={<Button variant="white">…</Button>} />
  <StatGrid>{/* four <Stat> */}</StatGrid>
  <ListSection title="Active Projects (3)" icon="fa-solid fa-briefcase">{/* cards */}</ListSection>
</AppShell>
```

The rest of the structural set: `PageHeader` (title + subtitle + action) opens a
page that has no banner; `SplitLayout` is the detail-page shape — content left,
a sidebar right from `lg:` and stacked below on smaller screens.

Do not hand-roll these containers. Getting the max width, the page padding or
the bottom clearance slightly different is what makes a screen look almost-right
but not like the product.

## The styling idiom: Tailwind utilities

Components are styled with Tailwind utility classes, and **your own layout glue
should be too**. There is no CSS-module or prop-based theming layer.

**The brand palette** — these are the custom colours, everything else is stock
Tailwind:

| Class | Use |
|---|---|
| `bg-cobalt` `text-cobalt` `border-cobalt` | `#195ad7` — the brand. Primary actions, links, active states. |
| `hover:bg-blue-700` | The hover partner for `bg-cobalt`. |
| `bg-blue-50` `text-cobalt` | The quiet brand pairing — chips, selected filters, icon tiles. |
| `focus:ring-cobalt` | Focus rings on inputs. |

**The surface recipe** used by every card in the product:
`bg-white rounded-2xl border border-gray-200 shadow-sm` on a `bg-gray-50` page.

**Semantic tints** follow Tailwind's own scales at `-50`/`-100` for the fill and
`-600`/`-700` for the text: emerald for money and success, amber for pending,
rose or red for danger, purple for shortlisting, indigo for delivery.

**Three project-specific classes** exist because the product needs them:

- `sc-fixed-size` — opts a control out of the mobile rule that forces every
  button to `min-height: 44px`. Required on any control whose height is part of
  its shape; without it a 44×24 switch becomes 44×44 and renders as a circle.
- `sc-tap-target` — restores a 44px touch area to such a control without
  changing its drawn size.
- `scroll-fade-x` with `no-scrollbar` — a row that scrolls sideways on mobile
  and wraps at `sm:`. The fade is what tells the reader there is more.

## Mobile is not an afterthought

Rows that pair text with an action must let the action wrap on a phone. A
`flex-1` text column has a zero flex-basis, so it shrinks to nothing instead of
pushing the action down — give it `w-full sm:w-auto sm:flex-1` and the row wraps
the way it should. Button labels take `whitespace-nowrap`.

## Where the truth lives

- `_ds/<folder>/styles.css` — the full stylesheet and its imports.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component API and usage.
- `components/<group>/<Name>/<Name>.d.ts` — the exact props.

## An idiomatic screen

```jsx
import { Card, SectionHeader, Field, TextInput, Button, StatusPill, Money } from '@spectrum-connect/ui';

<div className="bg-gray-50 min-h-screen p-4 sm:p-6">
  <div className="max-w-2xl mx-auto space-y-4">
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900">Promotional Video</h3>
          <p className="text-sm text-gray-500">Film &amp; Video · Videographer</p>
        </div>
        <StatusPill status="pending_funding" />
      </div>
      <p className="text-sm text-gray-500">
        Budget <span className="font-semibold text-gray-900"><Money amount={1750} /></span>
      </p>
    </Card>

    <Card>
      <SectionHeader icon="fa-solid fa-circle-info" title="Project Information" subtitle="What are you working on?" />
      <Field label="Project Title" required htmlFor="t">
        <TextInput id="t" placeholder="e.g. Logo Design for Tech Startup" />
      </Field>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost">Cancel</Button>
        <Button icon="fa-solid fa-check">Save Changes</Button>
      </div>
    </Card>
  </div>
</div>
```

Icons are Font Awesome class strings passed as props (`icon="fa-solid fa-plus"`),
never imported components.
