# GLOBENET Maintenance Report — Release 3.0

## Root causes found

1. The originally exposed working folder did not contain the asset directories required by every page.
2. The old service worker used cache-first behaviour for HTML navigation and cached error responses as page fallbacks.
3. JavaScript used repeated element rebinding and unguarded JSON parsing, creating failure points after dynamic updates or damaged browser storage.
4. The business form only stored a draft and never created a connected listing data model.
5. The dashboard was hard-coded to Kasa Style Hub, Ama and fabricated performance numbers.
6. Dashboard navigation used `href="#"`, which moved the user to the top of the page instead of opening real sections.
7. Every seeded business card opened one fixed Kasa Style Hub page.
8. Search and category controls were forced to remain sticky while scrolling.
9. The initial PWA manifest did not provide complete PNG application icons.

## Repairs completed

- Restored the complete asset structure.
- Rebuilt shared navigation, modal, cart, filtering, mobile menu and action handling.
- Added safe storage parsing, legacy-data migration and corrupt-state recovery.
- Added a unified listing, product, job, order, application and message state model.
- Added listing-type routing for businesses, food vendors, skilled professionals, schools, organisations and event organisers.
- Added dynamic storefront rendering using listing IDs.
- Rebuilt all dashboard sections and removed all fake owner and financial data.
- Added product and vacancy forms connected to the active listing.
- Added image resizing and compression before persistence.
- Replaced sticky filters with normal scrolling controls.
- Replaced the service worker with network-first page navigation and versioned cache cleanup.
- Added no-cache deployment headers for HTML, JavaScript, CSS, manifest and service worker updates.
- Added PWA icons, install prompts, iOS instructions and app shortcuts.

## Automated checks completed

- 18 HTML pages parsed and loaded.
- All local `href`, `src`, stylesheet, script and manifest targets verified.
- JavaScript syntax verified for `app.js`, `data.js` and `sw.js`.
- All pages loaded in a 390 × 844 Android-size browser viewport with no runtime page errors.
- Listing creation tested with image upload.
- Created listing verified in browser storage.
- Dynamic storefront tested with the created business details.
- Dashboard tested to ensure the real business name appears and hard-coded “Ama” does not.
- New-business metrics verified at zero.
- Product creation tested from the dashboard.
- Marketplace product modal, cart add, increase, decrease and removal tested.
- Mobile navigation open and close tested.
- Search filtering tested.
- Food contact, service request and job application modals tested.
- Dashboard overview, products, orders, customers, jobs, marketing, reviews and settings tested.
- Legacy draft migration tested.
- Corrupt local-storage recovery tested.
- Search/filter bar computed position verified as non-sticky.

## Remaining production boundary

The repaired package is a stable static front-end and installable PWA. Shared public data across users requires a real backend. Static hosting alone cannot securely publish one user’s listing to every other visitor.
