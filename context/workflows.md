# Spectrum Connect — Core Workflows

## Project Lifecycle

```
Client creates project (status: draft → open)
        ↓
Creator applies (POST /proposals/{job_id})
        ↓
Client reviews proposals (GET /proposals/job/{job_id})
        ↓
Client hires creator (PATCH /proposals/{id}/status → "accepted")
        ↓
Client creates escrow (POST /escrow)
        ↓
Client funds milestone (POST /escrow/{id}/fund-milestone)
        → Job status: in_progress
        ↓
Creator submits delivery with Google Drive link
(POST /escrow/{id}/milestone/{mid}/deliver)
        → Milestone status: delivered
        → auto_release_at = now + 48h
        → Client notified: "Review within 48 hours"
        ↓
Client reviews at /client/projects/{id}/delivery/{milestoneId}
        ↓
   ┌────────────────┬─────────────────────┐
Request Revision       Release Payment         [No action for 48h]
   │                        │                        │
Creator resubmits    Escrow released         Auto-released
   │                 Transaction created     by background job
   └──────────→ Client reviews again
                            ↓
                    Both parties leave reviews
                    ETF points awarded
                    Project completed
```

## Application Status Values
`submitted` → `shortlisted` → `interviewing` → `accepted` / `rejected` / `withdrawn`

## Escrow Milestone Status Values
`pending` → `funded` → `delivered` → `approved` → `released`
(or: `delivered` → `revision_requested` → `delivered` again)

## Job Status Values
`draft` → `open` → `in_review` → `pending_funding` → `in_progress`
→ `delivered` → `approved` → `completed` / `cancelled`

## Review System
- Client reviews creator: `POST /proposals/{id}/rate` (client token)
- Creator reviews client: same endpoint (creator token) — stores to `creator_rating_of_client`
- Ratings stored at: `User.profile.rating` + `User.profile.review_count`
- CrewProfile.rating also synced for Smart Connect ranking

## Messaging
- Conversations: `POST /messages/conversations`
- Send message: `POST /messages` with `{conversation_id, content}`
- Response time tracked via EMA (α=0.25) on every reply
