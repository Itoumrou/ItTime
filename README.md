# ItTime V1.9

ItTime is a Home Screen web app for tracking event production, screen work, breaks, earnings, and reflections.

## Reliable notifications

V1.9 includes a Cloudflare Worker + Durable Object push backend and a service worker that receives Web Push notifications when the iPhone Home Screen app is not open. The Worker URL is configured by default as `https://ittime-push.trabi2717.workers.dev`.

The API token is intentionally **not** stored in this repository. Enter it in ItTime Settings on the device. Never commit the VAPID private key or API token to GitHub.

The app must be installed as an iPhone Home Screen web app before Web Push can be enabled.

## Push backend

`push-worker/worker.js` stores one subscription per device and schedules/cancels reminders with a Durable Object alarm. The VAPID keys and API token are Cloudflare Worker secrets.

## Notification behavior

- Break reminders are scheduled server-side when work starts/resumes.
- Long-work reminders are scheduled server-side when enabled.
- Daily reflection reminders are scheduled server-side and repeated every 24 hours.
- Work/long reminders are cancelled on Break and Work Done, then rescheduled on Continue Work.
- Quiet hours are respected when the app schedules a reminder.
- The service worker displays incoming push notifications and opens ItTime when a notification is tapped.
