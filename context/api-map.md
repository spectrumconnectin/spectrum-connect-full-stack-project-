# Spectrum Connect — Backend API Map

Base URL: `http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com`

## Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register (phone optional, first_name/last_name accepted) |
| POST | `/auth/login` | — | Login (form-encoded username+password) |
| POST | `/auth/otp/send` | — | Send OTP to email |
| POST | `/auth/otp/verify` | — | Verify OTP, activates account |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/reset-password` | — | Request password reset |
| POST | `/auth/reset-password/confirm` | — | Confirm password reset |

## Profiles
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/profiles/me` | ✓ | Current user profile |
| PUT | `/profiles/me` | ✓ | Update profile |
| GET | `/profiles/{user_id}` | optional | Public profile by ID |
| GET | `/profiles/{user_id}/reviews` | — | Public reviews for a creator |

## Jobs / Projects
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/jobs` | ✓ | Create job post |
| GET | `/jobs` | — | Search/list public jobs |
| GET | `/jobs/me` | ✓ | My job posts (client) |
| GET | `/jobs/{id}` | ✓ | Get job by ID |
| PATCH | `/jobs/{id}/status` | ✓ | Update job status |
| DELETE | `/jobs/{id}` | ✓ | Delete job |

## Proposals / Applications
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/proposals/{job_id}` | ✓ | Creator applies to job |
| GET | `/proposals/me` | ✓ | My applications (creator) |
| GET | `/proposals/{id}/detail` | ✓ | Full workspace context |
| GET | `/proposals/job/{job_id}` | ✓ | Proposals for a job (client) |
| PATCH | `/proposals/{id}/status` | ✓ | Update status (hire/reject) |
| POST | `/proposals/{id}/rate` | ✓ | Submit review (client OR creator) |
| DELETE | `/proposals/{id}` | ✓ | Withdraw application |

## Escrow
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/escrow` | ✓ | Create escrow |
| GET | `/escrow/my-escrows` | ✓ | List my escrows |
| GET | `/escrow/{id}` | ✓ | Escrow detail |
| POST | `/escrow/{id}/fund-milestone` | ✓ | Fund a milestone |
| POST | `/escrow/{id}/release-milestone` | ✓ | Release payment (auto-approves) |
| POST | `/escrow/{id}/milestone/{mid}/deliver` | ✓ | Submit delivery + Drive link |
| POST | `/escrow/{id}/milestone/{mid}/request-revision` | ✓ | Request revision |
| GET | `/escrow/{id}/delivery-status` | ✓ | Delivery detail + countdown |
| POST | `/escrow/trigger-auto-release` | admin | Manual auto-release trigger |

## Dashboards
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/creator/dashboard` | ✓ | Creator dashboard data |
| GET | `/client/dashboard` | ✓ | Client dashboard data |

## ETF
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/etf/me` | ✓ | My ETF balance + level |
| GET | `/etf/me/events` | ✓ | My ETF point history |
| GET | `/etf/badge/{user_id}` | ✓ | ETF badge for any user |

## Commission
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/billing/commission/preview` | ✓ | Fee preview for a budget amount |

## Messages
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/messages/conversations` | ✓ | List conversations |
| POST | `/messages/conversations` | ✓ | Create conversation |
| POST | `/messages` | ✓ | Send message |
| GET | `/messages/conversations/{id}/messages` | ✓ | Get messages in conversation |
| POST | `/messages/conversations/{id}/read` | ✓ | Mark messages read |

## Smart Connect
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/smart-connect/search` | ✓ | Search creators |
| POST | `/smart-connect/match` | ✓ | Match creators to requirements |
| GET | `/smart-connect/match-for-project/{job_id}` | ✓ | Match for specific project |
| GET | `/smart-connect/featured` | optional | Featured creators |
| GET | `/smart-connect/saved` | ✓ | Saved profiles |
| POST | `/smart-connect/save` | ✓ | Save a creator profile |

## Admin
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | admin | Platform metrics |
| GET | `/admin/revenue` | admin | Revenue breakdown |
| GET | `/admin/transactions` | admin | All transactions |
| GET | `/admin/users` | admin | User list |
| PATCH | `/admin/users/{id}/role` | admin | Change user role |
