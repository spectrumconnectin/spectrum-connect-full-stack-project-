# Spectrum Connect — Context

This folder stores project context, documentation, and reference files used across development sessions.

## Contents

| File | Purpose |
|---|---|
| `architecture.md` | System architecture, stack, deployment info |
| `workflows.md` | Core platform workflows (escrow, delivery, reviews) |
| `api-map.md` | Backend endpoint reference |
| `frontend-map.md` | Frontend page and component reference |
| `bugs-and-fixes.md` | Log of bugs found and fixed |

## Quick Reference

- **Backend**: FastAPI + MongoDB/Beanie → Elastic Beanstalk (`spectrum-connect-prod`)
- **Frontend**: Next.js 14 + TypeScript → Vercel (`spectrumconect.com`)
- **Repo**: `project-master-spectrum/` (backend) + `spectrum-nextjs/` (frontend)
