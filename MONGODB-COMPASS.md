# Connect the bookstore database to MongoDB Compass

The website and Compass must use the **same MongoDB server and database name**. Compass is a graphical client, not a replacement for MongoDB Server. Transactions require Atlas or a replica set; an ordinary standalone `mongod` is insufficient.

## Option A — MongoDB Atlas (recommended for publishing)

1. Create a cluster in your own Atlas project. Create a database user with **readWrite and dbAdmin roles scoped to `bup_bookstore`** (see permissions below). Use a strong unique password.
2. In Network Access, allow your current IP for Compass/development and the application's outbound IP for hosting. Prefer restricted IP ranges or private networking rather than global access.
3. Open the cluster's **Connect** menu, choose **Drivers**, and copy the Node.js connection URI. Replace the password placeholder with the database user's URL-encoded password. This is the database password, not your Atlas account password.
4. In the website's private `.env`, set:

```dotenv
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=bup_bookstore
```

5. Run `npm run seed`, then `npm run admin` and `npm start`.
6. In Atlas → Connect → **Compass**, copy the same connection string. Open MongoDB Compass → **Add New Connection** → paste the URI → name it `BUP Bookstore` → **Save & Connect**.
7. Expand **bup_bookstore**. If it is not listed, refresh the database list and confirm the seed completed successfully. Register a student on the website, then refresh `users` in Compass to see the saved account.

Never include your full connection URI in screenshots, a public repository or a project report.

## Option B — Local database using Docker Desktop

With Docker Desktop running, open the project terminal and run:

```powershell
docker compose up -d
docker compose ps
```

Wait for `healthy`. The supplied compose file initializes a single-node replica set and exposes it only on the computer's loopback address. Use this connection in both `.env` and Compass:

```text
mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true
```

Set `MONGODB_DB=bup_bookstore`, then run the seed/admin/start commands in README.md. Data survives container restarts in the named Docker volume. `docker compose down` stops it without deleting that volume. Do not use `down -v` if you want to keep your database. This local configuration has no authentication and is not a public deployment configuration.

## Option C — Existing Windows MongoDB Server installation

Keep any existing MongoDB service and its data directory unchanged. Install `mongosh` if it is not already available. Create a **new empty directory** specifically for this project. Run a separate local instance on a different port, for example:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\bup-mongodb-data"
& 'C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe' --dbpath "$env:USERPROFILE\bup-mongodb-data" --port 27018 --bind_ip 127.0.0.1 --replSet rs0
```

Adjust `9.0` to your installed version. Keep that terminal open. In a second terminal, initialize this new instance once:

```powershell
mongosh "mongodb://127.0.0.1:27018/?directConnection=true" --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27018"}]})'
```

Wait a few seconds for a primary to be elected. Use the same local URI from Option B in `.env` and Compass. Then seed/start the website. This dedicated instance is for local development; use authenticated Atlas for public hosting. The agent's temporary QA database on port 27027 is not the setup you should use for your project.

## What to show in Compass

| Collection | What it contains |
|---|---|
| books | All titles, prices, separate new/used variants, stock, restock dates, cover references, E-Book permissions and course IDs |
| departments / courses | Faculty/department/semester/course metadata |
| users | Student IDs, names, email, department, batch, hashed passwords, carts and wishlists |
| sessions | Server-side login sessions with expiry |
| orders / payments / refunds | Orders with immutable purchase line prices, receipts and refund records |
| buybacks / payouts | Book resale inspections, accepted offers and actual payouts |
| stock_alerts / notifications | Restock subscriptions and student messages |
| requests / support_tickets / reviews | Requests, support and review moderation (collections appear when first used) |
| coupons / inventory_movements / audit_logs | Discounts, stock changes and staff actions |
| email_outbox / tokens / rate_limits | Email delivery queue, hashed expiring verification/reset tokens and abuse limits |
| files.files / files.chunks | Uploaded cover/PDF metadata and binary GridFS chunks |

Prices are integer **paisa**: `58000` means **৳580.00**, avoiding floating-point accounting errors. Dates are stored in UTC and displayed in Bangladesh time. Orders embed line snapshots so later catalog edits cannot change old receipts.

Example Compass filters:

```json
{"variants.stock": 0}
```

```json
{"variants.id": "used_good"}
```

```json
{"ebook.authorized": true}
```

Use **Documents** to inspect records and **Indexes** to show uniqueness/expiry indexes. Do not directly edit inventory, payments, passwords or orders through Compass: the website handles stock transactions, password hashing, audit records and email notifications. Export only anonymized examples for project documentation.

## Troubleshooting

- Connection refused: start MongoDB, check port/URI, or check Docker health.
- Atlas authentication failure: check the database user's password and URL encoding.
- Atlas timeout: check IP allowlist, DNS and outbound network access.
- Replica set error: initialize the local replica set or switch to Atlas. Do not remove the application's transaction requirement.
- Empty database: confirm `MONGODB_DB`, run the seed, then refresh Compass.
- No email in inbox: database connectivity does not configure SMTP. Follow the README email section.

Official references: [Compass connection instructions](https://www.mongodb.com/docs/compass/connect/), [MongoDB connection options](https://www.mongodb.com/docs/manual/reference/connection-string-options/), [Node driver transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/).

### Database user permissions

This application creates indexes and applies collection validators during startup. Give the application database user **readWrite and dbAdmin on the `bup_bookstore` database only**, or equivalent scoped custom privileges including `collMod`. Do not use a cluster root account. The `collMod` privilege is needed to apply validators; readWrite alone is insufficient. If Atlas presents custom privilege controls, scope these privileges to the application database. Tests use `bup_bookstore_test` and need equivalent permissions on that separate test database. See [MongoDB collMod permissions](https://www.mongodb.com/docs/manual/reference/command/collmod/).
