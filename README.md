# Digital House – Admin Dashboard

Admin UI for reviewing **pending profile updates** (Matrimony & Business sections).

## Setup

1. In **backend** `.env`, set admin login (used by the login form):
   - `ADMIN_EMAILS=your@email.com` (comma-separated)
   - `ADMIN_PASSWORD=your_password`

2. Start the **backend first** (port **4000**) — required or login returns 503/500:

```bash
cd ../backend && npm run dev
```

Wait for: `Digital House API listening on http://0.0.0.0:4000`

3. Start the **admin UI**:

```bash
npm install
npm run dev
```

4. Open **http://localhost:3001/digitalhouse/admin/**

API calls go to `/digitalhouse/backend/api/...` on the same origin; Vite proxies them to `http://localhost:4000/api/...` (no CORS issues locally or on the server).

## Features

- **Pending updates** – List of Matrimony & Business profile updates awaiting approval
- **Compare view** – Current (approved) vs pending (new) data per field
- **Approve** – Move pending data to main profile and mark update as approved
- **Reject** – Discard pending data, store remarks for the user (shown in app)

## API

- `GET /api/admin/pending-updates` – list pending updates (requires `X-Admin-Key`)
- `POST /api/admin/approve-update` – body: `{ updateId, remarks? }`
- `POST /api/admin/reject-update` – body: `{ updateId, remarks }`
