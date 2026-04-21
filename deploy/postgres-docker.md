## Dedicated Postgres For CARENT

CARRENT should not use Paperclip's embedded PostgreSQL cluster.

Current server layout:

- Paperclip embedded Postgres: `127.0.0.1:54329`
- CARENT dedicated Postgres container: `carent-postgres`
- Docker network: `carent-net`
- Host admin/migration port for CARENT Postgres: `127.0.0.1:55432`
- Server deployment directory: `/home/dado/carent-deploy`

Connection strings:

- From the CARENT app container:
  `postgres://carrent:<password>@carent-postgres:5432/carrent`
- From the host:
  `postgres://carrent:<password>@127.0.0.1:55432/carrent`

Do not commit the real password. It is stored on the server in:

`/home/dado/carent-deploy/.env.postgres`
