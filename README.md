# GLOBENET — Maintenance Release 3.0

GLOBENET is a mobile-first local economic network for business discovery, products, food, skilled services, jobs, schools, organisations and events.

## What this release fixes

- Replaces unstable repeated click bindings with one central action system.
- Removes the service-worker cache strategy that could return old or incorrect pages after navigation.
- Adds cache versioning and an automatic one-time refresh when the repaired service worker takes control.
- Removes sticky category/search bars so they scroll normally with each page.
- Rebuilds the dashboard around the listing actually created by the user.
- New listings start with zero revenue, zero orders, zero customers and zero views.
- Saves created businesses, restaurants, professionals, schools, organisations and event organisers on the current device.
- Places each created listing in its correct category and gives it a dynamic public storefront.
- Adds product creation and job posting from the dashboard.
- Adds picture compression before browser storage to reduce Android memory and storage failures.
- Replaces `#` dashboard links and fragile inline navigation with working tabs and actions.
- Adds malformed-storage recovery so damaged local data does not crash every page.
- Improves touch targets, mobile menus, modals, cart controls and small-screen dashboard navigation.
- Adds installable PWA icons, shortcuts and installation instructions for supported devices.

## Important data limitation

This GitHub Pages / static Cloudflare Pages package has no shared server database. Listings created in this release persist in the browser on the device where they were created. They do not automatically appear to every visitor on other devices.

A public multi-user launch requires a backend and shared storage for accounts, listings, images, products, orders, payments, applications, reviews and moderation. Cloudflare D1/R2, Supabase or another secure backend can provide this layer.

## Run locally

Extract the project and run:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

A local server is recommended because service workers and installation cannot operate correctly from a direct `file://` address.

## Deploy to GitHub Pages

1. Upload every file and folder to the repository root. Do not upload only the ZIP file.
2. Push to the `main` branch.
3. Open **Settings → Pages**.
4. Choose **GitHub Actions** as the source.
5. The included workflow deploys the site.

## Deploy to Cloudflare Pages

Use:

- Framework preset: `None`
- Build command: leave completely blank
- Build output directory: `.`
- Root directory: leave completely blank
- Environment variables: none for this static release

After deployment, open the website once and reload it once if an older GLOBENET service worker was already installed. Release 3.0 then deletes old caches and takes control.

## Installing the app

Use the install button in the GLOBENET header or footer.

- Android, Windows, ChromeOS and supported desktop browsers: choose **Install GLOBENET** from Chrome or Edge.
- iPhone and iPad: open in Safari, tap **Share**, then **Add to Home Screen**.
- macOS Safari: use **File → Add to Dock** where supported.

The deployed website must use HTTPS. Cloudflare Pages and GitHub Pages provide HTTPS.

## Core files

- `assets/js/app.js` — stable application behaviour, persistence and UI actions
- `assets/js/data.js` — starter public sample data
- `assets/css/styles.css` — responsive styling and maintenance overrides
- `sw.js` — repaired network-first navigation service worker
- `site.webmanifest` — installable app configuration
- `dashboard.html` — real-data dashboard shell
- `business.html` — dynamic listing storefront shell
- `sell.html` — listing creation and editing form

## Production requirements

A full public launch still needs:

- Secure authentication and role permissions
- Shared database and image storage
- Business and identity verification
- Mobile Money and card payments
- Order and delivery APIs
- Messaging and notifications
- Job application document storage
- Review verification and dispute handling
- Admin moderation and fraud controls
- Analytics, backups and monitoring
