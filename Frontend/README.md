# FIX MOTO Frontend

Vite + React + Tailwind CSS frontend for FIX MOTO.

## Setup

```bash
npm install
```

Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Run:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Folder structure

- `src/app` - routing and app shell
- `src/Components` - reusable UI components
- `src/features/auth` - login/register
- `src/features/customer` - customer pages
- `src/features/mechanic` - mechanic pages
- `src/features/admin` - admin pages
- `src/context` - Auth and Socket.IO context
- `src/utils` - API client and helpers

The frontend is prepared to connect to the existing FIX MOTO backend.

## FIX MOTO local connection
1. Create `.env` with `VITE_API_URL=http://localhost:5000/api` and `VITE_SOCKET_URL=http://localhost:5000`.
2. Start the backend first: `npm install` then `npm run dev`.
3. Start this frontend: `npm install` then `npm run dev`.
4. Open the Vite URL (normally http://localhost:5173).
