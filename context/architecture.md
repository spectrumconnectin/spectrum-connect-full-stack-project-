# Spectrum Connect — Architecture

## Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB via Beanie ORM (async)
- **Auth**: JWT (python-jose) + OTP email verification
- **Deployment**: AWS Elastic Beanstalk (`spectrum-connect-prod`)
- **Region**: ap-south-1 (Mumbai)
- **URL**: `http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com`

### Frontend
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Icons**: Font Awesome 6
- **Deployment**: Vercel
- **Domain**: `spectrumconect.com`

## Key Models (MongoDB Collections)

| Collection | Model | Purpose |
|---|---|---|
| `users` | `User` | All accounts (crew/producer/both) |
| `job_posts` | `JobPost` | Project listings |
| `applications` | `Application` | Creator proposals/bids |
| `escrows` | `Escrow` | Payment escrow per project |
| `transactions` | `Transaction` | Payment records |
| `conversations` | `Conversation` | Messaging threads |
| `messages` | `Message` | Individual messages |
| `etf_points` | `EtfPoints` | ETF loyalty points |
| `notifications` | `Notification` | In-app notifications |

## Account Types
- `crew` → Creator/filmmaker
- `producer` → Client/hirer
- `both` → Can act as both

## Commission Structure (v1)
- Client pays: `budget * 1.04` (4% fee on top)
- Creator receives: `budget * 0.92` (8% fee deducted)
- Platform take: 12% total

## ETF Points (Earn Trust Framework)
- Levels: Bronze → Silver → Gold → Platinum → Diamond
- Points awarded for: project completion, reviews, on-time delivery, milestones

## Auto-Release
- Delivery → 48-hour countdown
- Reminders at 24h and 6h remaining
- Auto-releases if client takes no action
- Background scheduler runs every 30 minutes
