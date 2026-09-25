# Outbox Email Scheduler

A full-stack email campaign scheduler built with Express, BullMQ, and Next.js. Users compose campaigns, import recipients from CSV or plain text, configure a start time and per-email delay, and the system schedules and delivers them through a persistent background worker. No cron is used anywhere.

---

## Features

### Backend
- Google OAuth authentication via Passport.js
- Campaign CRUD with status lifecycle: `SCHEDULED → RUNNING → COMPLETED`
- Cancellation blocked for completed or already-cancelled campaigns
- Email jobs created per recipient, stored in PostgreSQL
- BullMQ delayed jobs for per-recipient scheduling
- Configurable delay between emails (respects `delaySeconds` at runtime)
- Hourly rate limit enforced per campaign via PostgreSQL counters
- Jobs rescheduled (not dropped) when the hourly limit is reached
- Up to 3 retries per job with exponential backoff (BullMQ-managed)
- Idempotency guard: job status checked before sending; already-sent jobs are skipped
- Campaign transitions to `COMPLETED` once all email jobs finish

### Frontend
- Next.js 14 app router
- Dashboard: overview stats, recent campaigns, activity breakdown
- Compose: subject, HTML body, start time, delay, hourly limit
- Recipients: CSV/TXT file upload or manual input, client-side email validation, deduplication
- Scheduled page: live list of pending/scheduled email jobs
- Sent page: list of delivered email jobs
- Campaign detail: per-job status table, delivery progress, cancel button (hidden when not applicable)
- Loading, empty, and error states throughout

### Reliability
- BullMQ queue state persisted in Redis (Upstash)
- Application state (campaigns, jobs, statuses) persisted in PostgreSQL
- Worker reconnects to Redis and resumes pending jobs on restart
- Jobs not processed if their status is already `SENT` or `CANCELLED`

---

## Architecture

```
Browser
  |
  v
Next.js (port 3000)
  |
  v (fetch + credentials)
Express API (port 3001)
  |
  +----> PostgreSQL (Supabase)   <-- campaign + job records, status, counters
  |
  v
BullMQ
  |
  v
Upstash Redis                    <-- queue state, delayed jobs
  |
  v
Worker (runs inside server.ts or standalone via src/worker.ts)
  |
  v
Nodemailer → Ethereal SMTP       <-- fake delivery, preview URL logged
  |
  v
PostgreSQL                       <-- job marked SENT, campaign marked COMPLETED
```

**PostgreSQL** is the durable source of truth for all business data: campaigns, email jobs, user records, and delivery status.

**Redis** stores only BullMQ queue state: delayed job timers, active job locks, retry counters.

The rate limiting logic queries PostgreSQL to count how many emails were sent in the last hour for a given campaign.

---

## How Scheduling Works

1. User submits a campaign via the compose form.
2. API validates the request (required fields, email format, valid date).
3. A `Campaign` record and one `EmailJob` per recipient are written to PostgreSQL in a transaction.
4. Campaign status is set to `SCHEDULED`.
5. One BullMQ delayed job per recipient is added via `emailQueue.addBulk(...)`. Each job has a calculated delay based on `startAt` and the per-recipient stagger (`index * delaySeconds * 1000`).
6. BullMQ persists these delayed jobs in Upstash Redis.
7. When a job's delay expires, the worker picks it up.
8. Worker fetches the `EmailJob` from PostgreSQL, checks its status, applies rate limiting, and respects `delaySeconds` between consecutive sends.
9. Email is sent through Ethereal SMTP via Nodemailer.
10. `EmailJob.status` is set to `SENT` in PostgreSQL.
11. If all jobs for the campaign are done, `Campaign.status` is set to `COMPLETED`.

**Cron is not used.** All scheduling is handled by BullMQ delayed jobs.

---

## Delay, Rate Limiting and Concurrency

**Worker concurrency:** 5 jobs run concurrently (hardcoded in `createEmailWorker(5)`).

**Per-email delay (`delaySeconds`):** Before sending, the worker queries the most recently sent job for the campaign. If `timeSinceLastSend < delaySeconds * 1000`, the job is moved back to delayed state for the remaining duration. This is enforced at processing time, not at job creation.

**Hourly rate limit (`hourlyLimit`):** Before sending, the worker atomically increments a Redis counter representing the current hour window (`rate:{campaignId}:{hour}`). If the count exceeds the hourly limit, the job is moved back to the delayed state until the next hour begins. The Redis keys automatically expire to prevent memory bloat.

**When the limit is hit:** Jobs are rescheduled with `job.moveToDelayed(...)`. They are not dropped or failed.

**Scope:** Both limits are per-campaign, not global or per-sender.

---

## Reliability and Restart Behavior

**Queue persistence:** BullMQ stores delayed and active jobs in Upstash Redis. Pending jobs survive a process restart because Redis retains them.

**Application state persistence:** All campaign and email job records are in PostgreSQL. Status is always written before the next step.

**Idempotency:** Before sending, the worker fetches the `EmailJob` from PostgreSQL and returns early if it is already `SENT` or `CANCELLED`. BullMQ also uses the `emailJobId` as the BullMQ `jobId`, which prevents duplicate job creation for the same email job.

**Retries:** BullMQ is configured with `attempts: 3` and exponential backoff starting at 2 seconds. After 3 failed attempts, the job is marked `FAILED` in PostgreSQL and not retried further.

**Crash window:** SMTP delivery (Nodemailer) and the subsequent database update (`status = SENT`) are two separate operations. If the worker crashes between them, BullMQ will retry the job. The database idempotency check will prevent a duplicate send most of the time, but strict exactly-once delivery cannot be guaranteed across every possible crash scenario.

---

## Handling Large Campaigns

For a campaign with 1000 recipients:

- The API creates all 1000 `EmailJob` records in a single transaction, then calls `emailQueue.addBulk(...)` with 1000 jobs in one call.
- All 1000 jobs are stored in Redis with their calculated delays. The API request completes immediately after this; it does not wait for any sending.
- The worker processes up to 5 jobs concurrently. Per-email delay and hourly rate limiting are applied at processing time.
- If the hourly limit is, say, 100, the worker will process 100 emails in the first hour, then reschedule the rest to the next window automatically.

This architecture has not been load-tested. For very large batches (10,000+), bulk job creation latency and Redis memory should be considered.

---

## Frontend

- **Login:** Google OAuth, redirects to dashboard on success.
- **Overview:** Total campaigns, scheduled count, emails sent, total recipients, campaign breakdown by status, recent campaigns table.
- **Compose:** Subject, HTML body, start time picker (defaults to 1 hour from now), delay in seconds, hourly limit, recipient upload or manual input.
- **Recipients:** Accepts `.csv` or `.txt` files; parses comma/semicolon/newline-separated emails; deduplicates and validates format client-side; shows valid/invalid counts before submission.
- **Scheduled:** Lists email jobs with status `PENDING` or `SCHEDULED`; supports search and status filter.
- **Sent:** Lists email jobs with status `SENT`, ordered by `sentAt` descending.
- **Campaign detail:** Delivery progress bar, per-status counts, job table with scheduled/sent timestamps and error messages, cancel button (only shown for `SCHEDULED` or `RUNNING` campaigns).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | Express 4, TypeScript |
| Database | PostgreSQL (hosted on Supabase) |
| ORM | Prisma 5 |
| Queue | BullMQ 5 |
| Redis | Upstash (via ioredis) |
| Email | Nodemailer + Ethereal SMTP |
| Authentication | Google OAuth 2.0 (passport-google-oauth20) |
| Sessions | express-session (in-memory store) |

---

## Project Structure

```
outbox-email-scheduler/
  apps/
    backend/
      prisma/
        schema.prisma         # Campaign, EmailJob, User models
      src/
        config/
          database.ts         # Prisma client
          email.ts            # Nodemailer/Ethereal transporter
          passport.ts         # Google OAuth strategy
          redis.ts            # ioredis client for BullMQ
        controllers/          # Request handlers
        middleware/
          auth.middleware.ts  # requireAuth guard
        queue/
          queue.ts            # BullMQ queue + addBulkEmailJobs
          worker.ts           # Job processor, rate limiting, delay logic
          index.ts            # Queue init + health check
        routes/               # Express routers
        services/
          auth.service.ts     # User find/create
          campaign.service.ts # Campaign creation, cancellation
          email.service.ts    # sendEmail via Nodemailer
        scripts/              # Utility scripts (test-db, test-email, check-jobs)
        app.ts                # Express app setup
        server.ts             # HTTP server + embedded worker
        worker.ts             # Standalone worker entrypoint
    frontend/
      src/
        app/
          dashboard/
            overview/         # Stats + recent campaigns
            compose/          # Campaign creation form
            scheduled/        # Pending/scheduled email jobs
            sent/             # Sent email jobs
            campaigns/[id]/   # Campaign detail
          login/
          page.tsx            # Landing page
        components/
          layout/             # DashboardLayout, Header, Sidebar
          providers/          # ThemeProvider
          ui/                 # Badge, Button, Card, EmptyState, Skeleton, etc.
        hooks/
          useAuth.ts
        types/
          index.ts
```

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase or local)
- Upstash Redis account
- Google OAuth credentials (client ID + secret)

### Install

```bash
npm install
```

### Database

```bash
cd apps/backend
npm run prisma:generate
npm run prisma:migrate
```

### Environment Variables

**`apps/backend/.env`**

```env
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_upstash_redis_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_user
ETHEREAL_PASSWORD=your_ethereal_password
SESSION_SECRET=a_random_secret_string
FRONTEND_URL=http://localhost:3000
PORT=3001
```

If `ETHEREAL_USER` is empty or set to `dummy`, the backend automatically creates a temporary Ethereal test account on startup and logs the preview URL.

**`apps/frontend/.env`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Run (Development)

Start backend and frontend together:

```bash
npm run dev
```

Or separately:

```bash
# Terminal 1 - backend (also starts embedded worker)
npm run dev:backend

# Terminal 2 - frontend
npm run dev:frontend
```

To run the worker as a separate process (e.g., for deployment where the worker is isolated):

```bash
cd apps/backend
npm run worker
```

### Build

```bash
npm run build
```

---

## API Overview

All routes except `/auth/*` and `/health` require an active session cookie set by Google OAuth.

```
GET  /health                    Health check (DB + queue status)

GET  /auth/google               Initiate Google OAuth flow
GET  /auth/google/callback      OAuth callback, sets session, redirects to dashboard
GET  /auth/me                   Get current authenticated user
POST /auth/logout               Destroy session

POST /campaigns                 Create a campaign + schedule email jobs
GET  /campaigns                 List all campaigns for the authenticated user
GET  /campaigns/:id             Get campaign with all email jobs
POST /campaigns/:id/cancel      Cancel a SCHEDULED or RUNNING campaign

GET  /email/scheduled           List PENDING/SCHEDULED email jobs for user
GET  /email/sent                List SENT email jobs for user
POST /email/test                Send a test email to a given address
```

---

## Assignment Coverage

| Requirement | Implementation |
|---|---|
| Delayed scheduling, no cron | BullMQ delayed jobs; delay calculated from `startAt` and `delaySeconds` |
| Persistent application state | PostgreSQL via Prisma |
| Queue persistence | Upstash Redis via BullMQ |
| Background worker | `queue/worker.ts`, runs embedded in server or standalone |
| Worker concurrency | 5 concurrent jobs (`createEmailWorker(5)`) |
| Per-email send delay | Checked at job processing time via PostgreSQL; job rescheduled if too soon |
| Hourly rate limit | Counted via PostgreSQL `sentAt` window; job rescheduled if limit reached |
| Jobs rescheduled on limit | `job.moveToDelayed(...)` used for both delay and rate limit cases |
| Restart persistence | Redis retains BullMQ queue; jobs resume on worker restart |
| Idempotency | Status check before send; BullMQ jobId = emailJobId prevents duplicate creation |
| Retry on failure | BullMQ: 3 attempts, exponential backoff (2s base); permanent FAILED after 3rd |
| Ethereal SMTP | Nodemailer with Ethereal; auto-creates test account if credentials absent |
| Google OAuth | passport-google-oauth20, session-based |
| Recipient import | CSV/TXT file upload + manual textarea; validated and deduplicated client-side |
| Dashboard | Overview, Compose, Scheduled, Sent, Campaign Detail pages |
| Campaign status lifecycle | SCHEDULED → RUNNING → COMPLETED (or CANCELLED) |
| Cancellation guard | Backend rejects cancel if status is COMPLETED or CANCELLED |

---

## Testing

There are no automated tests. The following scenarios have been verified manually:

- Single recipient campaign: job created, delivered, campaign moves to COMPLETED
- Multi-recipient campaign: all jobs delivered, sent count matches total, campaign COMPLETED
- Per-email delay: worker respects configured `delaySeconds` between sends
- Hourly rate limit: worker reschedules jobs when limit is reached, not drops them
- Future-scheduled campaign: job sits in delayed state in Redis until `startAt`
- Cancellation: works for SCHEDULED/RUNNING; rejected for COMPLETED
- Restart: stopping and restarting the server resumes pending jobs from Redis
- CSV import: comma/newline-separated emails parsed and validated in browser before submission
- Dashboard consistency: Scheduled page clears after completion; Sent page shows delivered jobs

---

## Deployment

Intended architecture (not yet deployed to a live environment):

| Component | Where |
|---|---|
| Frontend | Vercel (or any Next.js-compatible host) |
| Backend API | Railway, Render, or any Node.js host |
| Worker | Same host as API (embedded) or a separate process |
| Database | Supabase PostgreSQL |
| Redis | Upstash |

The API and worker must share the same `DATABASE_URL` and `REDIS_URL`. If the worker runs as a separate process, it reads its own `.env`.

---

## Assumptions and Trade-offs

**BullMQ over cron:** Delayed BullMQ jobs give per-job scheduling resolution, native retry, failure tracking, and Redis-backed persistence without any timer management in application code.

**Redis atomic rate limiting:** The hourly limit check uses a Redis atomic counter (`redis.incr`) instead of counting PostgreSQL rows. This prevents race conditions under high concurrency and scales horizontally.

**Session store:** Sessions are stored in Redis using `connect-redis`. The same Upstash Redis instance is used for both BullMQ queue state and session persistence, ensuring sessions survive server restarts.

**Ethereal SMTP:** All email delivery goes to Ethereal. No real emails are sent. Preview URLs are logged to the server console.

**SMTP/DB consistency:** Nodemailer `sendMail` and the subsequent `EmailJob.status = SENT` update are not wrapped in a distributed transaction. If the worker crashes after SMTP delivery but before the database update, BullMQ will retry the job and Nodemailer will deliver a duplicate. The database status check reduces this window but cannot eliminate it entirely.

**No load testing:** Large batch behavior (1000+ recipients) is architecturally supported but has not been load tested.
