# Publish the Node + MongoDB website

Use a host that runs a persistent Node.js web service or Docker container, plus MongoDB Atlas and an SMTP provider. A static host alone (such as GitHub Pages) cannot run this backend. The app does not require persistent local disk for uploaded assets: they live in GridFS.

## Before deploying

1. Create your Atlas database and limited database user. Allow the hosting service's outbound address to connect. Use a separate connection for tests.
2. Create an SMTP sender and verify its address/domain with the provider. Set the provider's credentials through your host's private environment settings.
3. Upload this source folder or commit it to your own private repository. Exclude `.env`, `.local-secret`, `node_modules` and test/QA database files.
4. Configure a Node service: Node 24, build `npm ci --omit=dev`, start `npm start`. Alternatively build the included Dockerfile. Use `/health` for the health check.

## Production environment

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
SITE_URL=https://YOUR-PUBLIC-DOMAIN
MONGODB_URI=YOUR-AUTHENTICATED-ATLAS-URI
MONGODB_DB=bup_bookstore
SESSION_SECRET=YOUR-PRIVATE-RANDOM-48-BYTE-HEX-VALUE
TRUST_PROXY=1
SMTP_HOST=YOUR-PROVIDERS-SMTP-HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR-SMTP-USER
SMTP_PASS=YOUR-SMTP-PASSWORD
MAIL_FROM=BUP Bookstore <YOUR-VERIFIED-SENDER>
DELIVERY_FEE=60
STORE_ACTIVE=1
```

Use your host's assigned `PORT` if it supplies one. Set `TRUST_PROXY=1` only when the app is reachable exclusively through one trusted HTTPS reverse proxy. The proxy must forward the original Host and protocol accurately and overwrite incoming forwarding headers. Otherwise use the correct network arrangement and `TRUST_PROXY=0`. Production requires HTTPS, secure session cookies and a random secret. Keep `SITE_URL` equal to the public origin so password-reset and confirmation links point to your website. A host-provided alternate URL may receive an invalid-host response until `SITE_URL` is configured accordingly.

Run `npm run seed` once against this database. Run `npm run admin` in an interactive local terminal with the production database URI set privately, or use your hosting provider's interactive shell. It prompts for a hidden password and will not overwrite an existing account. It creates no publicly documented default credentials.

## Launch check

- `npm run check` reports the expected book/course coverage and verifies SMTP connectivity. Then test actual delivery of a registration and order email to your own inbox. Check spam and your sender's domain configuration.
- Register a student, verify email, sign out/in, recover a password, select a used copy, place an order, and view its invoice. Check MongoDB Compass for the saved records.
- Sign in as staff. Inspect filters and record a real test receipt only for a payment you have actually received. Do not mark unpaid orders paid just to demonstrate an online gateway.
- Upload an original/authorized sample PDF and verify the selected access policy. Remove the sample when finished. Cover uploads and PDFs must persist after an app restart.
- Review public project identification, example prices, stock, estimated arrival dates, hotline information and curriculum source notes before presentation. Replace examples with real records if you later have authorization to operate the store.

## Operation and recovery

Use Atlas backups or encrypted database backups. Include GridFS collections in backups; the ZIP is source code, not a live-data backup. Test restoring to a separate database before relying on backups. Keep the database URI, SMTP credentials and session secret outside source control. Rotating the session secret signs users out.

The web service runs the email worker. It must stay awake for prompt delivery; a sleeping host delays queued mail. Check Staff → Email delivery for failures. Failed messages retry automatically with backoff, then remain available for staff retry. Do not silently discard pending registration/order mail. Failed SMTP codes are recorded without provider secrets.

Set `STORE_ACTIVE=0` and restart to pause new purchases while leaving account/catalog access available. Existing orders still need staff resolution. Inventory changes use revision checks; if a book changed after loading its form, reload and review current stock rather than forcing a stale value.

This release supports cash checkout with recorded receipts/refunds. A live bKash/Nagad/card gateway is a separate integration requiring merchant credentials, server-verified callbacks, amount/currency validation and gateway-specific reconciliation. Neither the supplied payment screenshot nor a displayed logo constitutes a payment integration. Do not collect real card numbers, PINs or OTPs through this application.

## Security and maintenance

Passwords are scrypt-hashed; sessions and single-use recovery/verification tokens are server-side; only token hashes are indexed for lookup. Form requests use CSRF protection, including multipart uploads. Staff permissions are enforced on the server. Prices and quantities are validated and recalculated on the server; MongoDB transactions protect stock, order creation, refund records and buyback reservations. Uploaded images are re-encoded and PDFs are downloaded as attachments after authorization. Staff-only PDF upload requires explicit distribution permission; PDF validation checks the signature/extension, not a malware scan. If staff upload untrusted files, add a malware scanning service before public distribution.

Update dependencies deliberately and rerun `npm test` against a dedicated replica-set test database. Do not run tests with a database account intended only for production operations. Automated tests validate core workflows; they are not an external security audit or a guarantee under arbitrary hosting configurations.

Official references: [MongoDB Compass](https://www.mongodb.com/docs/compass/connect/), [MongoDB transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/), [Nodemailer SMTP](https://nodemailer.com/smtp).

### Database user permissions

This application creates indexes and applies collection validators during startup. Give the application database user **readWrite and dbAdmin on the `bup_bookstore` database only**, or equivalent scoped custom privileges including `collMod`. Do not use a cluster root account. The `collMod` privilege is needed to apply validators; readWrite alone is insufficient. If Atlas presents custom privilege controls, scope these privileges to the application database. Tests use `bup_bookstore_test` and need equivalent permissions on that separate test database. See [MongoDB collMod permissions](https://www.mongodb.com/docs/manual/reference/command/collmod/).
