Let me scan all routers to get every single endpoint.Here is the **complete list of every API** organized by module, ready to test in Postman:

---

## 🔐 AUTH `/auth`
| Method | URL | Auth |
|---|---|---|
| POST | `/auth/register` | ❌ |
| POST | `/auth/login` | ❌ |
| GET | `/auth/verify-email?token=` | ❌ |
| POST | `/auth/resend-verification?email=` | ❌ |
| POST | `/auth/reset-password` | ❌ |
| POST | `/auth/reset-password/confirm` | ❌ |
| GET | `/auth/google_login` | ❌ |
| POST | `/auth/onboarding/creator` | ✅ |
| POST | `/auth/onboarding/producer` | ✅ |

---

## 👤 PROFILES `/profiles`
| Method | URL | Auth |
|---|---|---|
| GET | `/profiles/me` | ✅ |
| PUT | `/profiles/me` | ✅ |
| GET | `/profiles/{user_id}` | ❌ |
| GET | `/profiles/username/{username}` | ❌ |
| PUT | `/profiles/me/profile-picture` | ✅ |
| PUT | `/profiles/me/cover-image` | ✅ |
| PUT | `/profiles/me/account-type` | ✅ |
| PUT | `/profiles/me/settings` | ✅ |
| GET | `/profiles/me/settings` | ✅ |
| GET | `/profiles/me/stats` | ✅ |
| POST | `/profiles/me/skills` | ✅ |
| PUT | `/profiles/me/skills/{index}` | ✅ |
| DELETE | `/profiles/me/skills/{index}` | ✅ |
| POST | `/profiles/me/experience` | ✅ |
| PUT | `/profiles/me/experience/{index}` | ✅ |
| DELETE | `/profiles/me/experience/{index}` | ✅ |
| POST | `/profiles/me/education` | ✅ |
| PUT | `/profiles/me/education/{index}` | ✅ |
| DELETE | `/profiles/me/education/{index}` | ✅ |
| POST | `/profiles/me/certifications` | ✅ |
| PUT | `/profiles/me/certifications/{index}` | ✅ |
| DELETE | `/profiles/me/certifications/{index}` | ✅ |
| POST | `profiles/{user_id}/endorse/{skill_name}` | ✅ |

---

## ⚙️ ACCOUNT `/account`
| Method | URL | Auth |
|---|---|---|
| GET | `/account/settings` | ✅ |
| PATCH | `/account/email` | ✅ |
| PATCH | `/account/password` | ✅ |
| PATCH | `/account/profile` | ✅ |
| PATCH | `/account/privacy` | ✅ |
| PATCH | `/account/notifications` | ✅ |
| DELETE | `/account/deactivate` | ✅ |
| DELETE | `/account/me` | ✅ |

---

## 💼 JOBS `/jobs`
| Method | URL | Auth |
|---|---|---|
| POST | `/jobs/` | ✅ |
| GET | `/jobs/` | ❌ |
| GET | `/jobs/my-posts` | ✅ |
| GET | `/jobs/{job_id}` | ❌ |
| POST | `/jobs/{job_id}/apply` | ✅ |

---

## 🛠 SERVICES `/services`
| Method | URL | Auth |
|---|---|---|
| POST | `/services/` | ✅ |
| GET | `/services/me` | ✅ |
| GET | `/services/search` | ❌ |
| GET | `/services/{service_id}` | ❌ |
| GET | `/services/slug/{slug}` | ❌ |
| PUT | `/services/{service_id}` | ✅ |
| PATCH | `/services/{service_id}/status` | ✅ |
| DELETE | `/services/{service_id}` | ✅ |
| GET | `/services/{service_id}/stats` | ✅ |
| POST | `/services/{service_id}/packages` | ✅ |
| PUT | `/services/{service_id}/packages/{index}` | ✅ |
| DELETE | `/services/{service_id}/packages/{index}` | ✅ |

---

## 💳 BILLING `/billing`
| Method | URL | Auth |
|---|---|---|
| GET | `/billing/plans` | ❌ |
| POST | `/billing/checkout` | ✅ |
| POST | `/billing/subscribe` | ✅ |
| POST | `/billing/cancel` | ✅ |
| GET | `/billing/history` | ✅ |

---

## 💬 MESSAGES `/messages`
| Method | URL | Auth |
|---|---|---|
| POST | `/messages/conversations` | ✅ |
| GET | `/messages/conversations` | ✅ |
| GET | `/messages/conversations/{id}` | ✅ |
| GET | `/messages/conversations/{id}/messages` | ✅ |
| POST | `/messages/send` | ✅ |
| DELETE | `/messages/{message_id}` | ✅ |
| POST | `/messages/conversations/{id}/read` | ✅ |
| POST | `/messages/conversations/{id}/archive` | ✅ |
| POST | `/messages/typing` | ✅ |
| GET | `/messages/presence/{user_id}` | ✅ |
| POST | `/messages/presence` | ✅ |
| POST | `/messages/search` | ✅ |
| POST | `/messages/attachments/upload` | ✅ |

---

## 📁 PROJECTS `/projects`
| Method | URL | Auth |
|---|---|---|
| POST | `/projects/` | ✅ |
| GET | `/projects/` | ✅ |
| GET | `/projects/{project_id}` | ✅ |
| PATCH | `/projects/{project_id}` | ✅ |
| DELETE | `/projects/{project_id}` | ✅ |
| POST | `/projects/{project_id}/members` | ✅ |
| PATCH | `/projects/{project_id}/members/{user_id}` | ✅ |
| DELETE | `/projects/{project_id}/members/{user_id}` | ✅ |
| PATCH | `/projects/{project_id}/progress` | ✅ |
| GET | `/projects/{project_id}/activity` | ✅ |
| POST | `/projects/deadlines` | ✅ |
| GET | `/projects/deadlines/upcoming` | ✅ |
| PATCH | `/projects/deadlines/{id}` | ✅ |
| DELETE | `/projects/deadlines/{id}` | ✅ |
| POST | `/projects/deadlines/{id}/complete` | ✅ |

---

## 🤖 AI ASSISTANT `/ai`
| Method | URL | Auth |
|---|---|---|
| POST | `/ai/chat` | ✅ |
| GET | `/ai/conversation-history` | ✅ |
| POST | `/ai/feedback` | ✅ |

---

## 🔗 SMART CONNECT `/smart-connect`
| Method | URL | Auth |
|---|---|---|
| GET | `/smart-connect/` | ✅ |
| POST | `/smart-connect/match` | ✅ |
| GET | `/smart-connect/saved` | ✅ |
| POST | `/smart-connect/save` | ✅ |
| GET | `/smart-connect/featured` | ✅ |
| POST | `/smart-connect/search` | ✅ |

---

## 🎯 CREATOR SMART CONNECT `/creator/smart-connect`
| Method | URL | Auth |
|---|---|---|
| GET | `/creator/smart-connect/` | ✅ |
| POST | `/creator/smart-connect/search` | ✅ |

---

## 📊 DASHBOARDS
| Method | URL | Auth |
|---|---|---|
| GET | `/client/dashboard` | ✅ |
| GET | `/client/dashboard/summary` | ✅ |
| GET | `/creator/dashboard/` | ✅ |
| GET | `/client/teams` | ✅ |
| GET | `/client/projects` | ✅ |
| GET | `/creator/teams` | ✅ |

---

## 🌍 COMMUNITY `/community`
| Method | URL | Auth |
|---|---|---|
| GET | `/community/projects` | ❌ |
| GET | `/community/events` | ❌ |
| POST | `/community/events` | ✅ |
| GET | `/community/forum/threads` | ❌ |
| POST | `/community/forum/threads` | ✅ |
| GET | `/community/collab-calls` | ❌ |
| POST | `/community/collab-calls` | ✅ |
| GET | `/community/guidelines` | ❌ |
| GET | `/community/featured-creators` | ❌ |
| GET | `/community/featured` | ❌ |

---

## 📝 BLOG `/blog`
| Method | URL | Auth |
|---|---|---|
| GET | `/blog/posts` | ❌ |
| POST | `/blog/posts` | ✅ |
| GET | `/blog/posts/{slug}` | ❌ |
| PATCH | `/blog/posts/{post_id}` | ✅ |
| DELETE | `/blog/posts/{post_id}` | ✅ |
| POST | `/blog/posts/{post_id}/like` | ✅ |
| GET | `/blog/posts/{post_id}/comments` | ❌ |
| POST | `/blog/posts/{post_id}/comments` | ✅ |
| GET | `/blog/categories` | ❌ |
| POST | `/blog/images` | ✅ |
| POST | `/blog/videos` | ✅ |

---

## 🎯 TALENT `/talent`
| Method | URL | Auth |
|---|---|---|
| GET | `/talent/search` | ❌ |
| GET | `/talent/stats` | ❌ |

---

## 📞 CONTACT `/contact`
| Method | URL | Auth |
|---|---|---|
| POST | `/contact/` | ❌ |

---

## 🏠 HEADER `/header`
| Method | URL | Auth |
|---|---|---|
| GET | `/header/landing` | ❌ |

---

**Total: ~100+ endpoints**

Start testing from the top — **Auth first**, then work your way down. Every `✅` endpoint needs the Bearer token from login.

readme.md