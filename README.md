# GLOBENET

GLOBENET is a responsive, multipage front-end prototype for a Ghana-first business discovery, commerce, jobs, services, schools, organisations and events platform.

## Included pages

- Homepage / discovery
- Marketplace and local products
- Food and restaurant discovery
- Skilled service providers
- Jobs and quick-apply flow
- Schools and training institutions
- Churches, mosques and community organisations
- Events
- Business onboarding
- Business storefront
- Business dashboard
- Authentication, about, contact, privacy and terms

## Features

- Responsive mobile-first layout
- Photo-rich cards and page banners
- Search and category filtering
- Shopping cart saved in local storage
- Saved favourites
- Modal interactions for applications, booking and contact
- Globe AI demonstration assistant
- Low-data image mode
- Dark mode
- Progressive Web App files and service worker
- Cloudflare Pages headers and redirects
- GitHub Pages deployment workflow

## Run locally

Open `index.html`, or run a simple local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Create a GitHub repository and upload all files at the repository root.
2. Push to the `main` branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. The included workflow deploys the site automatically.

## Deploy to Cloudflare Pages

1. Open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Select the GitHub repository.
3. Set the production branch to `main`.
4. Use `exit 0` as the build command.
5. Set the build output directory to `.` because the static site files are in the repository root.
6. Deploy.

## Production work still required

This package is a functional front-end prototype. Production launch requires a backend for accounts, business verification, listings, storage, maps, payments, orders, messaging, job applications, moderation, analytics and administration. Replace demo contact details, sample data, image URLs, sitemap domain and policy placeholders before launch.

## Image loading

The prototype uses remote photo URLs and a bundled branded SVG fallback. Replace the photo URLs with owned or properly licensed production assets before commercial launch.
