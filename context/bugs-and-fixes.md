# Spectrum Connect — Bugs Found & Fixed

## Session Log

### Registration & Auth
| Bug | Fix |
|---|---|
| `phone_number` required in schema but labeled optional in UI → 422 on every signup | Made `Optional[str]`, treats `+1` stubs as empty |
| `first_name`/`last_name` not accepted by backend → profile never set on signup | Added to `UserCreate` schema, builds `display_name` from them |
| Phone uniqueness check ran even when phone was None → false conflict errors | Wrapped in `if user.phone_number:` guard |
| `GET /profiles/{id}` returned 401 for unauthenticated visitors | Added `oauth2_scheme_optional = OAuth2PasswordBearer(auto_error=False)` |

### Escrow & Payments
| Bug | Fix |
|---|---|
| Release endpoint rejected `delivered` status (required separate approve first) | Backend now auto-approves internally on release call |
| `admin/stats` returned 500 — dead `EscrowTransaction` import | Removed dead import; fixed account_type filters |
| Earnings showing $0 — dashboard queried `creator_id` field (doesn't exist on Transaction) | Fixed to `to_user_id` — correct recipient field on Transaction model |

### Reviews & Ratings
| Bug | Fix |
|---|---|
| Creator couldn't review client — `rate` endpoint hardcoded to client-only (403) | Added creator path storing `creator_rating_of_client`, updating client's profile.rating |
| Ratings always None on profiles — reviews written to `user.rating` (field doesn't exist) | Fixed to write `user.profile.rating` / `user.profile.review_count` |

### Workspace & Delivery
| Bug | Fix |
|---|---|
| Workspace 500 — `job.required_skills` and `job.budget_min` don't exist on JobPost | Fixed to `job.skills` and `job.budget.min/max` |
| "Review Delivery" button opened release funds modal instead of review page | Now fetches escrow detail to get milestone ID, navigates to `/delivery/[milestoneId]` |
| Revision modal buttons cut off on small screens | Sticky header + scrollable body + sticky footer layout |
| Creator workspace showed "Hired" even after project completed | `getStatusBadge()` checks `job_status` when `app.status === 'accepted'` |

### UI / UX
| Bug | Fix |
|---|---|
| Stats always showed 0/— (completed, active, earnings, satisfaction) | Computed live from DB; stats fields were never written to |
| "Mark Completed" had no feedback, user stayed on page | Navigates to `/client/projects` after 800ms |
| Broken `/contact` link on verify-email page | Changed to `mailto:support@spectrumconect.com` |
| Client AI assistant used hardcoded mock responses | Wired to real `/ai/chat` endpoint with local fallback |

### Performance
| Issue | Fix |
|---|---|
| Client project page: 2-round-trip waterfall (job → then proposals+escrow) | All 4 fetches in one `Promise.allSettled()` |
| Creator dashboard: N+1 DB queries (1 per application, 1 per conversation) | Batch `$in` queries — O(1) instead of O(N) |
| `/proposals/{id}/detail`: sequential job → client → escrow fetches | `asyncio.gather()` for job+escrow in parallel |
| Profile views always recomputing stats (expensive) | Cache in `user.stats`; only recompute when cache empty |
