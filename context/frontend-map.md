# Spectrum Connect — Frontend Page Map

## Auth Routes `/app/(auth)/`
| Route | File | Description |
|---|---|---|
| `/signup` | `signup/page.tsx` | Registration — sends first_name, last_name, phone optional |
| `/login` | `login/page.tsx` | Login |
| `/verify-email` | `verify-email/page.tsx` | OTP verification |
| `/forgot-password` | `forgot-password/page.tsx` | Request password reset |
| `/reset-password` | `reset-password/page.tsx` | Confirm reset |
| `/onboarding/creator` | `onboarding/creator/page.tsx` | Creator onboarding |
| `/onboarding/client` | `onboarding/client/page.tsx` | Client onboarding |

## Client Routes `/app/(client)/client/`
| Route | File | Description |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | Client dashboard |
| `/projects` | `projects/page.tsx` | My projects list |
| `/projects/create` | `projects/create/page.tsx` | Create project (has 8 templates) |
| `/projects/[id]` | `projects/[id]/page.tsx` | Project detail + actions |
| `/projects/[id]/delivery/[milestoneId]` | `projects/[id]/delivery/[milestoneId]/page.tsx` | Delivery review page |
| `/smart-connect` | `smart-connect/page.tsx` | Smart Connect creator search |
| `/collaborators/[id]` | `collaborators/[id]/page.tsx` | Public creator profile |
| `/messaging` | `messaging/page.tsx` | Client messages |
| `/payments` | `payments/page.tsx` | Payments + escrow |
| `/etf` | `etf/page.tsx` | ETF points |
| `/ai-assistant` | `ai-assistant/page.tsx` | Miya AI (wired to real API) |
| `/disputes` | `disputes/page.tsx` | Disputes |

## Creator Routes `/app/(creator)/creator/`
| Route | File | Description |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | Creator dashboard |
| `/projects` | `projects/page.tsx` | My Work (applications list) |
| `/workspace/[id]` | `workspace/[id]/page.tsx` | Project workspace |
| `/find-projects` | `find-projects/page.tsx` | Browse open jobs |
| `/portfolio` | `portfolio/page.tsx` | Portfolio management |
| `/messages` | `messages/page.tsx` | Creator messages |
| `/earnings` | `earnings/page.tsx` | Earnings + transactions |
| `/etf` | `etf/page.tsx` | ETF points |
| `/ai-assistant` | `ai-assistant/page.tsx` | Miya AI |
| `/disputes` | `disputes/page.tsx` | Disputes |

## Admin Routes `/app/(admin)/`
| Route | File | Description |
|---|---|---|
| `/admin/dashboard` | `dashboard/page.tsx` | Admin overview |
| `/admin/users` | `users/page.tsx` | User management |
| `/admin/revenue` | `revenue/page.tsx` | Revenue reports |

## Marketing Routes `/app/(marketing)/`
| Route | Description |
|---|---|
| `/` | Landing page |
| `/about` | About |
| `/pricing` | Pricing |
| `/help` | Help center |
| `/legal` | Legal index |
| `/legal/terms` | Terms of Service |
| `/legal/privacy` | Privacy Policy |
| `/legal/cookies` | Cookie Policy |
| `/legal/refunds` | Refund Policy |
| `/legal/dmca` | DMCA Policy |
| `/legal/gdpr` | GDPR / Data Rights |
| `/legal/acceptable-use` | Acceptable Use Policy |

## Key Components `/components/`
| Component | Description |
|---|---|
| `ProjectWorkspace.tsx` | Full project workspace (chat, deliverables, files, timeline) |
| `EtfBadge.tsx` | ETF level badge shown on creator cards |
| `EtfWidget.tsx` | ETF points widget for dashboards |
| `CookieBanner.tsx` | GDPR cookie consent banner |

## Key State / Data Flows
- All API calls via `lib/api.ts` — typed interfaces + `request()` helper
- Auth token stored in localStorage as `spectrum_token`
- No dangerouslySetInnerHTML except in AI assistant (properly escaped)
- All dashboard pages use `Promise.allSettled()` for parallel fetches
