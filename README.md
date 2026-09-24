# Outbox Email Scheduler

A full-stack email job scheduler that enables users to compose email campaigns, import recipients from CSV or text, and schedule delayed deliveries.

## Features

Backend:
- Express + TypeScript
- BullMQ
- Upstash Redis
- PostgreSQL/Supabase
- configurable worker concurrency
- minimum send delay
- hourly rate limiting
- retry handling
- idempotency
- restart persistence
- Ethereal SMTP

Frontend:
- Google OAuth
- dashboard
- campaign composition
- CSV/TXT recipient import
- scheduled emails
- sent emails
- loading/error/empty states

## Architecture

```text
Frontend
  → Express API
  → PostgreSQL
  → BullMQ
  → Upstash Redis
  → Worker
  → Ethereal SMTP
```

1. API validates and stores campaign/email records in PostgreSQL.
2. API creates delayed BullMQ jobs for each email.
3. Redis persists the queue state.
4. Worker consumes jobs concurrently.
5. Worker applies delay/rate-limit rules before processing.
6. Worker sends emails through Ethereal SMTP.
7. Database records the final email status (e.g. SENT, FAILED).
8. Restarting the API/worker does not recreate the schedule from scratch because the queue and DB are persistent.

## Scheduling

The application uses BullMQ delayed jobs to manage future deliveries. When a campaign is submitted, jobs are pushed to the queue with calculated delays based on the exact start time and per-recipient delays.

cron is NOT used for scheduling jobs.

## Rate Limiting

The application limits the rate at which emails are sent to avoid overwhelming the SMTP server.
- **Configured limit:** Campaign hourly limits (`hourlyLimit`) are enforced.
- **Minimum delay:** The application respects `delaySeconds` between consecutive emails in a campaign.
- **Worker concurrency:** The worker runs multiple jobs concurrently but checks limits against the database.
- **Redis-backed rate limiting:** Handled directly in the worker logic.
- If the hourly limit is reached, jobs are automatically delayed and rescheduled for the next available hour window.

## Restart Persistence

The queue state is fully backed by Upstash Redis and PostgreSQL. If the server or background worker crashes, jobs are not lost. When the worker process is brought back online, it reconnects, resumes any pending jobs, and respects the remaining delays.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database setup/migrations:**
   ```bash
   cd apps/backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. **Running backend & frontend:**
   ```bash
   # From the root directory
   npm run dev
   ```

4. **Running worker:**
   ```bash
   # In a separate terminal
   cd apps/backend
   npm run worker
   ```

## Environment Variables

**Backend (`apps/backend/.env`)**
```env
DATABASE_URL=
REDIS_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
ETHEREAL_HOST=
ETHEREAL_PORT=
ETHEREAL_USER=
ETHEREAL_PASSWORD=
SESSION_SECRET=
FRONTEND_URL=
PORT=
```

**Frontend (`apps/frontend/.env`)**
```env
NEXT_PUBLIC_API_URL=
```

## Demo

The application demonstrates an end-to-end campaign scheduling workflow. Users log in with Google OAuth, compose an email, upload a CSV list of recipients, and specify delay parameters. The dashboard updates with scheduled and sent emails as the worker processes them.

## Trade-offs

- Upstash is used as a managed Redis instance so the deployed API and worker can easily share the same persistent queue state.
- Ethereal SMTP is used because this assignment requires fake SMTP without triggering real email sender limits.
- BullMQ delayed jobs are used instead of cron because they provide fine-grained, per-job scheduling, retries, and failure states natively.
- PostgreSQL remains the durable business-data source of truth.
