# Digital House – Admin Dashboard

Admin UI for reviewing **pending profile updates** (Matrimony & Business sections).

## Setup

1. Copy `.env.example` to `.env` and set:
   - `VITE_API_BASE` – backend API base URL (e.g. `http://localhost:3000`)
   - `VITE_ADMIN_KEY` – same value as backend `ADMIN_API_KEY` (used as `X-Admin-Key` header)

2. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3001 (or the port shown). With the Vite proxy, `/api` is forwarded to the backend.

## Features

- **Pending updates** – List of Matrimony & Business profile updates awaiting approval
- **Compare view** – Current (approved) vs pending (new) data per field
- **Approve** – Move pending data to main profile and mark update as approved
- **Reject** – Discard pending data, store remarks for the user (shown in app)

## API

- `GET /api/admin/pending-updates` – list pending updates (requires `X-Admin-Key`)
- `POST /api/admin/approve-update` – body: `{ updateId, remarks? }`
- `POST /api/admin/reject-update` – body: `{ updateId, remarks }`
