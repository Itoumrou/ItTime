# ItTime V0.4 — iPhone PWA

Everything from V0.3 plus:
- PWA manifest
- iPhone home-screen metadata
- Standalone app mode
- App icons
- Offline caching/service worker
- Mobile-first touch sizing
- Install help card
- Existing local data + JSON export

## Important
For PWA installation on iPhone, ItTime must be served from a web address (HTTPS). Opening `index.html` directly as a file is fine for testing, but Safari cannot install a local file as a PWA.

## Zero-cost deployment
A free static hosting service can serve these files over HTTPS. GitHub Pages is a suitable option.

## iPhone
Open the hosted ItTime URL in Safari → Share → Add to Home Screen → Add.
