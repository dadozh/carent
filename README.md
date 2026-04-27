## Getting Started

Run the dev server:

```bash
npm run dev
```

Set `DATABASE_URL` before generating and applying Drizzle migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Set `CARENT_UPLOAD_DIR` anywhere the app should persist uploaded files. Uploaded assets are stored on disk and served through `/api/uploads/...`.

## Testing

Run the main test suite with:

```bash
npm test
```

Vitest is configured to:

- load `.env.local`, so DB-backed integration tests can use the local `DATABASE_URL`
- exclude `dist/**`, so packaged build artifacts do not get picked up as duplicate test suites

The DB integration tests require network access to the configured Postgres instance. In restricted sandboxed environments, those tests can still fail with connection errors even when `DATABASE_URL` is present.

## Docker

Use a named volume for uploads. That is the better default here because it persists across container replacement without coupling the deployment to a specific host path.

```bash
docker build -t carent .

docker run \
  -e DATABASE_URL=postgres://user:pass@db:5432/carent \
  -e CARENT_UPLOAD_DIR=/data/uploads \
  -v carent_uploads:/data/uploads \
  -p 3000:3000 \
  carent
```

Uploads are tenant-scoped under `tenants/<tenantId>/...`. The upload API accepts only the application scopes `vehicles`, `customers`, and `reservations`, and enforces the corresponding tenant permissions server-side.

### Server Postgres

Current server setup keeps CARENT separate from Paperclip:

- Paperclip embedded Postgres remains on `127.0.0.1:54329`.
- CARENT uses a dedicated Dockerized Postgres service named `carent-postgres`.
- The service is attached to Docker network `carent-net`.
- Server-side compose files live under `/home/dado/carent-deploy/`.

Use one of these `DATABASE_URL` forms:

- From the CARENT app container on `carent-net`:
  `postgres://carrent:<password>@carent-postgres:5432/carrent`
- From the host for migrations/admin work:
  `postgres://carrent:<password>@127.0.0.1:55432/carrent`

The actual password is stored only on the server in `/home/dado/carent-deploy/.env.postgres`.

## Notes

- The app seeds the default tenant and initial admin users once on server startup.
- Next.js 16 currently warns that `middleware.ts` should be renamed to `proxy.ts`.
