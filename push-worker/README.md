# ItTime Reliable Push Worker

Deploy with Cloudflare Workers Free. The Worker stores each iPhone Web Push subscription in a SQLite-backed Durable Object and uses alarms to send scheduled pushes while the app is closed.

Setup:
1. Install Node.js.
2. Run `npm install` in this folder.
3. Run `npx wrangler login`.
4. Generate keys: `npx web-push generate-vapid-keys`.
5. Store secrets: `npx wrangler secret put API_TOKEN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
6. Deploy: `npx wrangler deploy`.
7. Put the Worker URL and API token into ItTime → Settings → Reliable Push.
8. On iPhone, add ItTime to Home Screen, open it there, enable Reliable Push and allow notifications.

Never commit API_TOKEN or VAPID_PRIVATE_KEY.
