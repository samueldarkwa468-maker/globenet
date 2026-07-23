(() => {
  'use strict';

  const D = window.GLOBENET_DATA || {
    products: [], restaurants: [], services: [], jobs: [], schools: [], organizations: [], events: [], businesses: []
  };
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const fallback = 'assets/images/fallback.svg';
  const STATE_KEY = 'globenet-state-v3';
  const LEGACY_KEYS = ['globenet-business-draft'];
  let installPrompt = null;
  let activeChipFilter = '';
  let toastTimer = null;

  const blankState = () => ({
    version: 3,
    user: null,
    listings: [],
    products: [],
    jobs: [],
    orders: [],
    applications: [],
    messages: [],
    cart: [],
    saved: [],
    activeListingId: null
  });

  const escapeHTML = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeURL = value => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^(https?:|data:image\/|blob:|assets\/)/i.test(raw)) return raw;
    return fallback;
  };

  const money = value => {
    const amount = Number(value || 0);
    try {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency', currency: 'GHS', maximumFractionDigits: 0
      }).format(amount);
    } catch {
      return `GH₵${Math.round(amount).toLocaleString()}`;
    }
  };

  const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const safeParse = (value, fallbackValue) => {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallbackValue;
    } catch {
      return fallbackValue;
    }
  };

  const normaliseState = raw => {
    const base = blankState();
    const source = raw && typeof raw === 'object' ? raw : {};
    Object.keys(base).forEach(key => {
      if (Array.isArray(base[key])) base[key] = Array.isArray(source[key]) ? source[key] : [];
      else if (key === 'user') base[key] = source[key] && typeof source[key] === 'object' ? source[key] : null;
      else if (key === 'activeListingId') base[key] = source[key] || null;
      else base[key] = source[key] ?? base[key];
    });
    base.version = 3;
    return base;
  };

  const readState = () => {
    try {
      const state = normaliseState(safeParse(localStorage.getItem(STATE_KEY), null));
      const legacy = safeParse(localStorage.getItem('globenet-business-draft'), null);
      if (!state.listings.length && legacy && legacy.businessName) {
        const migrated = listingFromLegacy(legacy);
        state.listings.push(migrated);
        state.activeListingId = migrated.id;
        try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); localStorage.removeItem('globenet-business-draft'); } catch {}
      }
      return state;
    } catch {
      return blankState();
    }
  };

  const writeState = next => {
    state = normaliseState(next);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('GLOBENET storage error:', error);
      showToast('Storage is full. Remove large photos or old listings and try again.');
      return false;
    }
  };

  function listingFromLegacy(legacy) {
    return {
      id: makeId('listing'),
      name: legacy.businessName,
      listingType: legacy.listingType || 'Business',
      category: legacy.category || 'Local business',
      city: legacy.city || '',
      location: legacy.city || '',
      phone: legacy.phone || '',
      email: legacy.email || '',
      address: legacy.address || '',
      description: legacy.description || '',
      opening: legacy.opening || '',
      closing: legacy.closing || '',
      ownerName: '',
      website: '',
      primaryOffer: '',
      startingPrice: '',
      schedule: '',
      image: fallback,
      gallery: [],
      status: 'Pending verification',
      rating: 0,
      reviews: 0,
      views: 0,
      createdAt: new Date().toISOString()
    };
  }

  let state = readState();
  let cart = state.cart;
  let saved = state.saved;

  const navItems = [
    ['index.html', 'Discover', 'home'],
    ['marketplace.html', 'Marketplace', 'marketplace'],
    ['food.html', 'Food', 'food'],
    ['services.html', 'Services', 'services'],
    ['jobs.html', 'Jobs', 'jobs'],
    ['schools.html', 'Schools', 'schools'],
    ['organizations.html', 'Organisations', 'organizations'],
    ['events.html', 'Events', 'events']
  ];

  const page = document.body.dataset.page || 'home';

  function buildShell() {
    const headerHost = $('#site-header');
    if (headerHost) {
      const accountLink = state.listings.length
        ? '<a class="btn btn-outline btn-small" href="dashboard.html">Dashboard</a>'
        : '<a class="btn btn-outline btn-small" href="login.html">Sign in</a>';
      headerHost.innerHTML = `<header class="site-header"><div class="container header-inner">
        <a class="brand" href="index.html" aria-label="GLOBENET home"><img src="assets/images/logo.svg" alt="GLOBENET"></a>
        <nav class="main-nav" aria-label="Main navigation">${navItems.map(([href, label, key]) => `<a class="${page === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
        <div class="header-actions">
          <button class="icon-btn" id="installApp" title="Install GLOBENET" aria-label="Install GLOBENET">⇩</button>
          <button class="icon-btn" id="dataToggle" title="Low-data mode" aria-label="Toggle low-data mode">◫</button>
          <button class="icon-btn" id="themeToggle" title="Theme" aria-label="Toggle theme">☾</button>
          <button class="icon-btn" id="cartToggle" title="Cart" aria-label="Open cart">🛒<span class="badge" id="cartCount">0</span></button>
          ${accountLink}
          <a class="btn btn-primary btn-small" href="sell.html">List your business</a>
          <button class="icon-btn mobile-toggle" id="mobileToggle" aria-label="Open navigation" aria-expanded="false">☰</button>
        </div></div></header>
        <div class="mobile-panel" id="mobilePanel" aria-hidden="true">${navItems.map(([href, label, key]) => `<a class="${page === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}<a href="sell.html">List your business</a>${state.listings.length ? '<a href="dashboard.html">Dashboard</a>' : '<a href="login.html">Sign in</a>'}<button class="btn btn-outline" data-action="install">Install GLOBENET app</button></div>`;
    }

    const footerHost = $('#site-footer');
    if (footerHost) {
      footerHost.innerHTML = `<footer class="site-footer"><div class="container"><div class="footer-grid">
        <div class="footer-brand"><img src="assets/images/logo.svg" alt="GLOBENET"><p>GLOBENET connects local businesses, customers, job seekers, skilled professionals, schools and community organisations in one trusted digital network.</p><div class="cluster"><span class="pill">Ghana first</span><span class="pill">Built for Africa</span></div></div>
        <div class="footer-col"><h4>Explore</h4><a href="marketplace.html">Marketplace</a><a href="food.html">Food & restaurants</a><a href="services.html">Skilled services</a><a href="jobs.html">Jobs</a></div>
        <div class="footer-col"><h4>Community</h4><a href="schools.html">Schools</a><a href="organizations.html">Organisations</a><a href="events.html">Events</a><a href="about.html">About GLOBENET</a></div>
        <div class="footer-col"><h4>For business</h4><a href="sell.html">Create storefront</a><a href="dashboard.html">Business dashboard</a><a href="jobs.html">Post a vacancy</a><a href="contact.html">Partner with us</a></div>
        <div class="footer-col"><h4>Support</h4><a href="contact.html">Help centre</a><a href="contact.html">Report a problem</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div>
      </div><div class="footer-bottom"><span>© 2026 GLOBENET. Local opportunity, connected.</span><button class="footer-install" data-action="install">Install GLOBENET on this device</button></div></div></footer>`;
    }

    document.body.insertAdjacentHTML('beforeend', `<div class="overlay" id="overlay"></div>
      <aside class="cart-drawer" id="cartDrawer" aria-hidden="true"><div class="drawer-head"><strong>Your cart</strong><button class="icon-btn" data-action="close-layer" aria-label="Close cart">✕</button></div><div class="cart-items" id="cartItems"></div><div class="drawer-foot"><div class="total"><span>Total</span><span id="cartTotal">GH₵0</span></div><button class="btn btn-primary" style="width:100%" data-action="checkout">Continue to checkout</button></div></aside>
      <div class="modal" id="globalModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h2 id="modalTitle">Details</h2><button class="icon-btn" data-action="close-layer" aria-label="Close dialog">✕</button></div><div id="modalBody"></div></div>
      <button class="ai-button" id="aiButton" aria-label="Open Globe AI">✦</button><div class="ai-panel" id="aiPanel"><div class="ai-head"><h3>Globe AI</h3><p>Search GLOBENET in everyday language</p></div><div class="ai-messages" id="aiMessages"><div class="ai-msg bot">Try “affordable food near Cape Coast”, “find a plumber”, or “entry-level jobs”.</div></div><form class="ai-input" id="aiForm"><input id="aiQuery" placeholder="Ask Globe AI…" aria-label="Ask Globe AI"><button class="btn btn-primary btn-small">Send</button></form></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function setLayerOpen(open) {
    document.body.classList.toggle('layer-open', open);
  }

  function closeLayers() {
    $('#cartDrawer')?.classList.remove('open');
    $('#cartDrawer')?.setAttribute('aria-hidden', 'true');
    $('#globalModal')?.classList.remove('show');
    $('#overlay')?.classList.remove('show');
    setLayerOpen(false);
  }

  function openModal(title, body) {
    const modal = $('#globalModal');
    if (!modal) return;
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    modal.classList.add('show');
    $('#overlay')?.classList.add('show');
    setLayerOpen(true);
    setTimeout(() => modal.querySelector('input, button, a, textarea, select')?.focus(), 0);
  }

  function openCart() {
    $('#cartDrawer')?.classList.add('open');
    $('#cartDrawer')?.setAttribute('aria-hidden', 'false');
    $('#overlay')?.classList.add('show');
    setLayerOpen(true);
  }

  function saveState() {
    state.cart = cart;
    state.saved = saved;
    writeState(state);
  }

  function productById(id) {
    return [...D.products, ...state.products].find(item => item.id === id);
  }

  function allPublicListings() {
    return state.listings.map(listing => ({
      id: listing.id,
      name: listing.name,
      category: listing.category,
      type: listing.category,
      title: listing.category,
      listingType: listing.listingType,
      location: listing.city || listing.location || 'Location not added',
      city: listing.city || '',
      rating: Number(listing.rating || 0),
      reviews: Number(listing.reviews || 0),
      open: true,
      image: listing.image || fallback,
      cover: listing.image || fallback,
      badge: listing.status || 'New listing',
      delivery: 'Contact business',
      price: listing.startingPrice ? `From ${money(listing.startingPrice)}` : 'Contact for price',
      programs: listing.primaryOffer || listing.description || 'Details available on profile',
      schedule: listing.schedule || openingLabel(listing),
      jobs: 0,
      response: 'New profile',
      userCreated: true
    }));
  }

  function listingTypeGroup(type) {
    const value = String(type || '').toLowerCase();
    if (value.includes('restaurant') || value.includes('food')) return 'food';
    if (value.includes('skilled') || value.includes('professional')) return 'services';
    if (value.includes('school') || value.includes('training')) return 'schools';
    if (value.includes('church') || value.includes('mosque') || value.includes('organisation') || value.includes('organization') || value.includes('community')) return 'organizations';
    if (value.includes('event')) return 'events';
    return 'businesses';
  }

  function openingLabel(listing) {
    if (listing.opening && listing.closing) return `${listing.opening}–${listing.closing}`;
    return 'Hours not added';
  }

  function seedListingById(id) {
    const collections = [D.businesses, D.restaurants, D.services, D.schools, D.organizations, D.events];
    for (const collection of collections) {
      const item = collection.find(entry => entry.id === id);
      if (item) return normaliseSeedListing(item, collection);
    }
    return null;
  }

  function normaliseSeedListing(item, collection) {
    let listingType = 'Business';
    if (collection === D.restaurants) listingType = 'Restaurant / food vendor';
    else if (collection === D.services) listingType = 'Skilled professional';
    else if (collection === D.schools) listingType = 'School / training centre';
    else if (collection === D.organizations) listingType = 'Community organisation';
    else if (collection === D.events) listingType = 'Event';
    return {
      id: item.id,
      name: item.name,
      listingType,
      category: item.category || item.type || item.title || 'Local listing',
      city: item.location || '',
      location: item.location || '',
      phone: '',
      email: '',
      address: item.location || '',
      description: seedDescription(item, listingType),
      opening: '', closing: '', ownerName: '', website: '',
      primaryOffer: item.programs || item.type || item.title || '',
      startingPrice: '',
      schedule: item.schedule || item.time || '',
      image: item.image || item.cover || fallback,
      gallery: [item.image || item.cover || fallback],
      status: item.badge || 'Verified',
      rating: Number(item.rating || 0),
      reviews: Number(item.reviews || 0),
      views: 0,
      createdAt: '',
      seed: true
    };
  }

  function seedDescription(item, type) {
    if (type === 'Restaurant / food vendor') return `${item.name} offers ${item.type || 'local food'} with convenient customer contact and ordering options.`;
    if (type === 'Skilled professional') return `${item.name} provides ${item.title || 'professional services'} in ${item.location || 'Ghana'}.`;
    if (type === 'School / training centre') return `${item.name} offers ${item.programs || 'learning programmes'} and admissions information.`;
    if (type === 'Community organisation') return `${item.name} connects people through programmes, schedules and community activities.`;
    if (type === 'Event') return `${item.name} is scheduled at ${item.location || 'the listed venue'} on ${item.month || ''} ${item.date || ''}.`;
    return `${item.name} is a local ${item.category || 'business'} serving customers in ${item.location || 'Ghana'}.`;
  }

  function findListing(id) {
    return state.listings.find(item => item.id === id) || seedListingById(id) || seedListingById('b1');
  }

  function listingLink(id) {
    return `business.html?id=${encodeURIComponent(id)}`;
  }

  function productCard(product) {
    return `<article class="card searchable" data-search="${escapeHTML(`${product.name} ${product.category} ${product.business} ${product.location}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(product.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(product.name)}"><div class="card-badges"><span class="pill featured">${escapeHTML(product.badge || 'Available')}</span></div><button class="heart-btn ${saved.includes(product.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(product.id)}" aria-label="Save ${escapeHTML(product.name)}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.business || 'Local seller')} <span class="verified">●</span></p></div><div class="rating"><span class="star">★</span>${escapeHTML(product.rating || 'New')}</div></div><div class="meta"><span>⌖ ${escapeHTML(product.location || 'Ghana')}</span><span>🚚 Delivery</span></div><div><span class="price">${money(product.price)}</span>${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div><div class="card-actions"><button class="btn btn-primary btn-small" data-action="add-cart" data-id="${escapeHTML(product.id)}">Add to cart</button><button class="btn btn-outline btn-small" data-action="view-product" data-id="${escapeHTML(product.id)}">View</button></div></div></article>`;
  }

  function businessCard(business) {
    return `<article class="card searchable" data-search="${escapeHTML(`${business.name} ${business.category} ${business.location}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(business.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(business.name)}"><div class="card-badges"><span class="pill featured">${escapeHTML(business.badge || 'New listing')}</span>${business.open === false ? '<span class="pill">Closed</span>' : '<span class="pill open">Open</span>'}</div><button class="heart-btn ${saved.includes(business.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(business.id)}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${escapeHTML(business.name)} <span class="verified">●</span></h3><p>${escapeHTML(business.category || 'Local business')}</p></div><div class="rating"><span class="star">★</span>${business.rating ? escapeHTML(business.rating) : 'New'}</div></div><div class="meta"><span>⌖ ${escapeHTML(business.location || 'Ghana')}</span><span>${Number(business.reviews || 0)} reviews</span></div><div class="card-actions"><a class="btn btn-primary btn-small" href="${listingLink(business.id)}">View business</a><button class="btn btn-outline btn-small" data-action="contact" data-id="${escapeHTML(business.id)}" data-name="${escapeHTML(business.name)}">Contact</button></div></div></article>`;
  }

  function restaurantCard(item) {
    return `<article class="card searchable" data-search="${escapeHTML(`${item.name} ${item.type || item.category} ${item.location}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"><div class="card-badges"><span class="pill featured">${escapeHTML(item.badge || 'New')}</span><span class="pill open">Open</span></div><button class="heart-btn ${saved.includes(item.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(item.id)}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${escapeHTML(item.name)} <span class="verified">●</span></h3><p>${escapeHTML(item.type || item.category || 'Food business')}</p></div><div class="rating"><span class="star">★</span>${item.rating || 'New'}</div></div><div class="meta"><span>⌖ ${escapeHTML(item.location || 'Ghana')}</span><span>◷ ${escapeHTML(item.delivery || 'Contact business')}</span><span>${escapeHTML(item.price || 'Contact for price')}</span></div><div class="card-actions"><a class="btn btn-primary btn-small" href="${listingLink(item.id)}">View menu</a><button class="btn btn-outline btn-small" data-action="contact" data-id="${escapeHTML(item.id)}" data-name="${escapeHTML(item.name)}">Contact</button></div></div></article>`;
  }

  function serviceCard(item) {
    return `<article class="card profile-card searchable" data-search="${escapeHTML(`${item.name} ${item.title || item.category} ${item.location}`)}"><div class="profile-cover"><img loading="lazy" src="${safeURL(item.cover || item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.title || item.category)}"><img class="profile-avatar" src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"></div><div class="profile-body"><div class="card-top"><div><h3>${escapeHTML(item.name)} <span class="verified">●</span></h3><p>${escapeHTML(item.title || item.category || 'Skilled professional')}</p></div><div class="rating"><span class="star">★</span>${item.rating || 'New'}</div></div><div class="meta"><span>⌖ ${escapeHTML(item.location || 'Ghana')}</span><span>${escapeHTML(item.response || 'New profile')}</span></div><div class="profile-stats"><div><strong>${Number(item.jobs || 0)}</strong><span>Jobs done</span></div><div><strong>${item.rating || '—'}</strong><span>Rating</span></div><div><strong>${escapeHTML(item.response || 'New')}</strong><span>Response</span></div></div><div class="card-actions"><a class="btn btn-primary btn-small" href="${listingLink(item.id)}">View profile</a><button class="btn btn-outline btn-small" data-action="request-service" data-id="${escapeHTML(item.id)}" data-name="${escapeHTML(item.name)}">Request service</button></div></div></article>`;
  }

  function jobCard(job) {
    return `<article class="surface job-card searchable" data-search="${escapeHTML(`${job.title} ${job.company} ${job.location} ${job.type} ${(job.skills || []).join(' ')}`)}"><div class="job-head"><div class="company-row"><div class="logo-box">${escapeHTML(job.logo || initials(job.company))}</div><div><h3>${escapeHTML(job.title)}</h3><p>${escapeHTML(job.company)} <span class="verified">●</span></p></div></div><button class="heart-btn ${saved.includes(job.id) ? 'saved' : ''}" style="position:static" data-action="save" data-id="${escapeHTML(job.id)}">♥</button></div><div class="meta"><span>⌖ ${escapeHTML(job.location)}</span><span>▣ ${escapeHTML(job.type)}</span><span>◷ ${escapeHTML(job.posted || 'Recently')}</span></div><p class="job-description">${escapeHTML(job.desc || '')}</p><div class="skill-list">${(job.skills || []).map(skill => `<span>${escapeHTML(skill)}</span>`).join('')}</div><div class="card-top"><span class="salary">${escapeHTML(job.salary || 'Salary not specified')}</span><button class="btn btn-primary btn-small" data-action="apply-job" data-id="${escapeHTML(job.id)}">Quick apply</button></div></article>`;
  }

  function schoolCard(item) {
    return `<article class="card searchable" data-search="${escapeHTML(`${item.name} ${item.type || item.category} ${item.location} ${item.programs || item.primaryOffer}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"><div class="card-badges"><span class="pill featured">${escapeHTML(item.badge || 'New institution')}</span></div><button class="heart-btn ${saved.includes(item.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(item.id)}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${escapeHTML(item.name)} <span class="verified">●</span></h3><p>${escapeHTML(item.type || item.category || 'Education')}</p></div><div class="rating"><span class="star">★</span>${item.rating || 'New'}</div></div><div class="meta"><span>⌖ ${escapeHTML(item.location || 'Ghana')}</span></div><p><strong>Programmes:</strong> ${escapeHTML(item.programs || item.primaryOffer || 'View profile for details')}</p><div class="card-actions"><a class="btn btn-primary btn-small" href="${listingLink(item.id)}">View institution</a><button class="btn btn-outline btn-small" data-action="contact" data-id="${escapeHTML(item.id)}" data-name="${escapeHTML(item.name)}">Contact</button></div></div></article>`;
  }

  function orgCard(item) {
    return `<article class="card searchable" data-search="${escapeHTML(`${item.name} ${item.type || item.category} ${item.location} ${item.schedule}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"><div class="card-badges"><span class="pill featured">${escapeHTML(item.badge || 'New organisation')}</span></div><button class="heart-btn ${saved.includes(item.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(item.id)}">♥</button></div><div class="card-body"><h3>${escapeHTML(item.name)} <span class="verified">●</span></h3><p>${escapeHTML(item.type || item.category || 'Organisation')}</p><div class="meta"><span>⌖ ${escapeHTML(item.location || 'Ghana')}</span><span>◷ ${escapeHTML(item.schedule || 'Schedule on profile')}</span></div><div class="card-actions"><a class="btn btn-primary btn-small" href="${listingLink(item.id)}">View profile</a><button class="btn btn-outline btn-small" data-action="contact" data-id="${escapeHTML(item.id)}" data-name="${escapeHTML(item.name)}">Contact</button></div></div></article>`;
  }

  function eventCard(item) {
    return `<article class="card event-card searchable" data-search="${escapeHTML(`${item.name} ${item.location} ${item.type || item.category}`)}"><div class="card-media"><img loading="lazy" src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"><div class="date-box"><span>${escapeHTML(item.month || 'NEW')}</span>${escapeHTML(item.date || '•')}</div><button class="heart-btn ${saved.includes(item.id) ? 'saved' : ''}" data-action="save" data-id="${escapeHTML(item.id)}">♥</button></div><div class="card-body"><span class="eyebrow">${escapeHTML(item.type || item.category || 'Event')}</span><h3 style="margin-top:12px">${escapeHTML(item.name)}</h3><div class="meta"><span>⌖ ${escapeHTML(item.location || 'Venue on profile')}</span><span>◷ ${escapeHTML(item.time || item.schedule || 'Time on profile')}</span></div><div class="card-top"><strong>${escapeHTML(item.price || 'Contact organiser')}</strong><a class="btn btn-primary btn-small" href="${listingLink(item.id)}">View event</a></div></div></article>`;
  }

  function initials(value) {
    return String(value || 'GN').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }

  function render(selector, items, template) {
    const host = $(selector);
    if (!host) return;
    host.innerHTML = items.map(template).join('');
  }

  function createdByGroup(group) {
    return allPublicListings().filter(item => listingTypeGroup(item.listingType) === group);
  }

  function renderPublicPages() {
    const createdBusinesses = createdByGroup('businesses');
    const allBusinesses = [...createdBusinesses, ...D.businesses];
    const allProducts = [...state.products, ...D.products];
    const allJobs = [...state.jobs, ...D.jobs];
    render('#featuredBusinesses', allBusinesses.slice(0, 6), businessCard);
    render('#homeProducts', allProducts.slice(0, 8), productCard);
    render('#homeJobs', allJobs.slice(0, 6), jobCard);
    render('#marketGrid', allProducts, productCard);
    render('#createdBusinessGrid', createdBusinesses, businessCard);
    render('#restaurantGrid', [...createdByGroup('food'), ...D.restaurants], restaurantCard);
    render('#serviceGrid', [...createdByGroup('services'), ...D.services], serviceCard);
    render('#jobGrid', allJobs, jobCard);
    render('#schoolGrid', [...createdByGroup('schools'), ...D.schools], schoolCard);
    render('#orgGrid', [...createdByGroup('organizations'), ...D.organizations], orgCard);
    render('#eventGrid', [...createdByGroup('events'), ...D.events], eventCard);
  }

  function renderCart() {
    const host = $('#cartItems');
    const count = $('#cartCount');
    const total = $('#cartTotal');
    if (!host || !count || !total) return;
    count.textContent = String(cart.reduce((sum, item) => sum + Number(item.qty || 0), 0));
    if (!cart.length) {
      host.innerHTML = '<div class="center muted" style="padding:45px 15px">Your cart is empty.<br>Explore the marketplace and add products.</div>';
      total.textContent = 'GH₵0';
      return;
    }
    host.innerHTML = cart.map(item => `<div class="cart-item"><img src="${safeURL(item.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(item.name)}"><div><h4>${escapeHTML(item.name)}</h4><p>${money(item.price)} × ${Number(item.qty || 1)}</p><div class="cluster"><button class="btn btn-outline btn-small" data-action="cart-dec" data-id="${escapeHTML(item.id)}" aria-label="Reduce quantity">−</button><button class="btn btn-outline btn-small" data-action="cart-inc" data-id="${escapeHTML(item.id)}" aria-label="Increase quantity">+</button></div></div><button class="icon-btn" data-action="cart-remove" data-id="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)}">✕</button></div>`).join('');
    total.textContent = money(cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0));
  }

  function addToCart(id) {
    const product = productById(id);
    if (!product) return showToast('This product is no longer available.');
    const existing = cart.find(item => item.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ ...product, qty: 1 });
    saveState();
    renderCart();
    showToast(`${product.name} added to cart`);
  }

  function toggleSaved(id) {
    saved = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    saveState();
    $$('[data-action="save"]').filter(button => button.dataset.id === id).forEach(button => button.classList.toggle('saved', saved.includes(id)));
    showToast(saved.includes(id) ? 'Saved to favourites' : 'Removed from favourites');
  }

  function applyFilter() {
    const searchInput = $('#pageSearch');
    const filterSelect = $('#pageFilter');
    const query = String(searchInput?.value || '').toLowerCase().trim();
    const selectValue = String(filterSelect?.value || '').toLowerCase().trim();
    const chip = activeChipFilter.toLowerCase().trim();
    let count = 0;
    $$('.searchable').forEach(card => {
      const haystack = String(card.dataset.search || '').toLowerCase();
      const visible = (!query || haystack.includes(query)) && (!selectValue || haystack.includes(selectValue)) && (!chip || chip === 'all' || haystack.includes(chip));
      card.hidden = !visible;
      if (visible) count += 1;
    });
    const empty = $('#emptyState');
    if (empty) empty.style.display = count ? 'none' : 'block';
  }

  async function imageFileToDataURL(file) {
    if (!file || !file.type.startsWith('image/')) return '';
    if (file.size > 12 * 1024 * 1024) throw new Error('Each image must be smaller than 12 MB.');
    const rawData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = rawData;
    });
    const maxWidth = 1100;
    const maxHeight = 760;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.74);
  }

  async function filesToGallery(files) {
    const chosen = Array.from(files || []).slice(0, 3);
    const gallery = [];
    for (const file of chosen) gallery.push(await imageFileToDataURL(file));
    return gallery.filter(Boolean);
  }

  function hydrateSellForm() {
    const form = $('#businessForm');
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    const listing = editId ? state.listings.find(item => item.id === editId) : null;
    if (!listing) return;
    Object.entries({
      businessName: listing.name,
      listingType: listing.listingType,
      category: listing.category,
      city: listing.city,
      phone: listing.phone,
      email: listing.email,
      address: listing.address,
      description: listing.description,
      opening: listing.opening,
      closing: listing.closing,
      ownerName: listing.ownerName,
      website: listing.website,
      primaryOffer: listing.primaryOffer,
      startingPrice: listing.startingPrice,
      schedule: listing.schedule
    }).forEach(([name, value]) => {
      const control = form.elements.namedItem(name);
      if (control) control.value = value || '';
    });
    form.dataset.editId = listing.id;
    const heading = $('#listingFormTitle');
    if (heading) heading.textContent = `Edit ${listing.name}`;
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Save changes';
    const preview = $('#photoPreview');
    if (preview && listing.image) preview.innerHTML = `<img src="${safeURL(listing.image)}" alt="Current listing photo"><span>Current cover photo</span>`;
  }

  async function submitBusinessForm(form) {
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      const formData = new FormData(form);
      const editId = form.dataset.editId || '';
      const existing = editId ? state.listings.find(item => item.id === editId) : null;
      const files = form.elements.namedItem('photos')?.files || [];
      const gallery = files.length ? await filesToGallery(files) : (existing?.gallery || []);
      const image = gallery[0] || existing?.image || fallback;
      const listing = {
        id: existing?.id || makeId('listing'),
        name: String(formData.get('businessName') || '').trim(),
        listingType: String(formData.get('listingType') || 'Business'),
        category: String(formData.get('category') || '').trim(),
        city: String(formData.get('city') || '').trim(),
        location: String(formData.get('city') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        opening: String(formData.get('opening') || ''),
        closing: String(formData.get('closing') || ''),
        ownerName: String(formData.get('ownerName') || '').trim(),
        website: String(formData.get('website') || '').trim(),
        primaryOffer: String(formData.get('primaryOffer') || '').trim(),
        startingPrice: String(formData.get('startingPrice') || '').trim(),
        schedule: String(formData.get('schedule') || '').trim(),
        image,
        gallery,
        status: existing?.status || 'Pending verification',
        rating: existing?.rating || 0,
        reviews: existing?.reviews || 0,
        views: existing?.views || 0,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (!listing.name || !listing.category || !listing.city || !listing.phone || !listing.address) throw new Error('Complete all required listing fields.');
      if (!existing && !gallery.length) throw new Error('Add at least one clear business, product, school or organisation picture.');
      const index = state.listings.findIndex(item => item.id === listing.id);
      if (index >= 0) state.listings[index] = listing;
      else state.listings.unshift(listing);
      state.activeListingId = listing.id;
      if (!state.user) state.user = { id: makeId('user'), fullName: listing.ownerName || 'Business owner', role: 'Business owner' };
      if (!writeState(state)) throw new Error('The listing could not be saved because browser storage is full.');
      renderPublicPages();
      openModal(existing ? 'Listing updated' : 'Listing created', `<div class="success-panel"><div class="success-mark">✓</div><h3>${escapeHTML(listing.name)} is saved</h3><p>Your details and picture now appear in the correct GLOBENET category, on the storefront and inside your dashboard.</p><div class="grid grid-2"><a class="btn btn-primary" href="${listingLink(listing.id)}">View storefront</a><a class="btn btn-outline" href="dashboard.html">Open dashboard</a></div></div>`);
    } catch (error) {
      showToast(error.message || 'The listing could not be saved.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = form.dataset.editId ? 'Save changes' : 'Create listing';
    }
  }

  function renderBusinessPage() {
    const host = $('#businessProfile');
    if (!host) return;
    const params = new URLSearchParams(location.search);
    const listing = findListing(params.get('id') || 'b1');
    if (!listing) {
      host.innerHTML = '<section class="section"><div class="container empty-state-card"><h1>Listing not found</h1><p>This profile may have been removed.</p><a class="btn btn-primary" href="index.html">Return home</a></div></section>';
      return;
    }
    const products = [...state.products, ...D.products].filter(product => product.listingId === listing.id || product.business === listing.name);
    const jobs = [...state.jobs, ...D.jobs].filter(job => job.listingId === listing.id || job.company === listing.name);
    const whatsappDigits = String(listing.phone || '').replace(/\D/g, '');
    const contactAction = whatsappDigits.length >= 9
      ? `<a class="btn btn-primary" href="https://wa.me/${whatsappDigits}" target="_blank" rel="noopener">WhatsApp</a>`
      : `<button class="btn btn-primary" data-action="contact" data-id="${escapeHTML(listing.id)}" data-name="${escapeHTML(listing.name)}">Contact</button>`;
    const mapQuery = encodeURIComponent(`${listing.address || ''} ${listing.city || listing.location || ''}`.trim());
    host.innerHTML = `<div class="business-cover dynamic-cover" style="--business-cover:url('${safeURL(listing.image)}')"></div><section class="section-sm"><div class="container"><div class="surface business-summary"><div class="business-identity"><img class="business-logo" src="${safeURL(listing.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(listing.name)}"><div><span class="eyebrow">${escapeHTML(listing.status || 'Local listing')}</span><h1>${escapeHTML(listing.name)} ${listing.seed ? '<span class="verified">●</span>' : ''}</h1><p class="muted">${escapeHTML(listing.category)} • ${escapeHTML(listing.city || listing.location || 'Ghana')} • ${escapeHTML(openingLabel(listing))}</p><div class="cluster"><span class="rating"><span class="star">★</span>${listing.rating ? escapeHTML(listing.rating) : 'New'}</span><span class="muted">${Number(listing.reviews || 0)} reviews</span><span class="pill open">Profile active</span></div></div></div><div class="cluster">${contactAction}<a class="btn btn-outline" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" rel="noopener">Get directions</a>${!listing.seed ? `<a class="btn btn-outline" href="sell.html?edit=${encodeURIComponent(listing.id)}">Edit profile</a>` : ''}</div></div>
      <nav class="business-tabs" aria-label="Profile sections"><a class="active" href="#offers">Offers</a><a href="#about">About</a><a href="#reviews">Reviews</a><a href="#jobs">Jobs</a></nav>
      <div class="grid grid-3"><div class="business-content"><div class="section-head"><div><h2 id="offers">Products and services</h2><p>${escapeHTML(listing.primaryOffer || 'Explore what this listing offers.')}</p></div>${!listing.seed ? `<button class="btn btn-primary" data-action="dashboard-add-product" data-listing-id="${escapeHTML(listing.id)}">Add product</button>` : ''}</div>${products.length ? `<div class="grid grid-2">${products.map(productCard).join('')}</div>` : `<div class="surface empty-state-card"><h3>No products added yet</h3><p>${listing.seed ? 'Contact the listing directly for its latest products or services.' : 'Add your first product from the dashboard so customers can buy or enquire.'}</p>${!listing.seed ? '<a class="btn btn-primary" href="dashboard.html?tab=products">Add first product</a>' : ''}</div>`}
      <div class="surface business-about" id="about"><h2>About ${escapeHTML(listing.name)}</h2><p class="muted">${escapeHTML(listing.description || 'This listing has not added a full description yet.')}</p><div class="grid grid-2"><div><strong>Opening hours</strong><p class="muted">${escapeHTML(openingLabel(listing))}</p></div><div><strong>Primary offer</strong><p class="muted">${escapeHTML(listing.primaryOffer || listing.category)}</p></div></div>${listing.gallery?.length > 1 ? `<div class="profile-gallery">${listing.gallery.map((image, index) => `<img src="${safeURL(image)}" alt="${escapeHTML(listing.name)} photo ${index + 1}">`).join('')}</div>` : ''}</div>
      <div class="surface reviews-card" id="reviews"><div class="reviews-title"><h2>Customer reviews</h2></div>${listing.reviews ? '<div class="review"><p class="muted">Verified review data will appear here.</p></div>' : '<div class="empty-inline">No reviews yet. Completed customers will be able to leave verified feedback.</div>'}</div></div>
      <aside class="stack"><div class="surface business-info-card"><h3>Listing information</h3><p><strong>Location</strong><br><span class="muted">${escapeHTML(listing.address || listing.city || 'Not added')}</span></p><p><strong>Phone</strong><br><span class="muted">${escapeHTML(listing.phone || 'Contact through GLOBENET')}</span></p><p><strong>Email</strong><br><span class="muted">${escapeHTML(listing.email || 'Not added')}</span></p><p><strong>Status</strong><br><span class="muted">${escapeHTML(listing.status || 'Active')}</span></p></div><div class="map-box"><div class="map-pin"></div></div><div class="surface business-info-card" id="jobs"><h3>Work with this listing</h3>${jobs.length ? jobs.map(job => `<div class="mini-job"><strong>${escapeHTML(job.title)}</strong><p class="muted">${escapeHTML(job.type)} • ${escapeHTML(job.location)}</p><button class="btn btn-primary btn-small" data-action="apply-job" data-id="${escapeHTML(job.id)}">Apply</button></div>`).join('') : `<p class="muted">No active vacancies.</p>${!listing.seed ? '<a class="btn btn-outline" href="dashboard.html?tab=jobs">Post a job</a>' : '<a class="btn btn-outline" href="jobs.html">Browse jobs</a>'}`}</div></aside></div></div></section>`;
    document.title = `${listing.name} — GLOBENET`;
  }

  function getActiveListing() {
    return state.listings.find(item => item.id === state.activeListingId) || state.listings[0] || null;
  }

  function renderDashboard() {
    const host = $('#dashboardApp');
    if (!host) return;
    const params = new URLSearchParams(location.search);
    const requestedListing = params.get('listing');
    if (requestedListing && state.listings.some(item => item.id === requestedListing)) {
      state.activeListingId = requestedListing;
      writeState(state);
    }
    const active = getActiveListing();
    if (!active) {
      host.innerHTML = `<section class="dashboard-empty"><div class="surface empty-state-card dashboard-onboarding"><div class="success-mark">+</div><span class="eyebrow">Business dashboard</span><h1>Create your first GLOBENET listing</h1><p>Your dashboard will only display information belonging to the business, school, organisation, restaurant or professional profile you create. New listings begin with zero revenue, zero orders and zero customers.</p><a class="btn btn-primary" href="sell.html">Create a listing</a></div></section>`;
      return;
    }
    const tab = params.get('tab') || 'overview';
    host.innerHTML = `<section class="dashboard-layout"><aside class="dashboard-side"><div class="dashboard-brand">${escapeHTML(active.name)}</div>${state.listings.length > 1 ? `<label class="dashboard-switcher">Active listing<select id="activeListingSelect">${state.listings.map(item => `<option value="${escapeHTML(item.id)}" ${item.id === active.id ? 'selected' : ''}>${escapeHTML(item.name)}</option>`).join('')}</select></label>` : ''}<nav class="dashboard-nav" aria-label="Dashboard navigation">${dashboardTabs().map(([key, label]) => `<button class="${tab === key ? 'active' : ''}" data-action="dashboard-tab" data-tab="${key}">${label}</button>`).join('')}</nav><a class="dashboard-home-link" href="index.html">← Back to GLOBENET</a></aside><div class="dashboard-main"><div id="dashboardPanel">${dashboardPanel(tab, active)}</div></div></section>`;
  }

  function dashboardTabs() {
    return [['overview', 'Overview'], ['products', 'Products'], ['orders', 'Orders'], ['customers', 'Customers'], ['jobs', 'Jobs'], ['marketing', 'Marketing'], ['reviews', 'Reviews'], ['settings', 'Settings']];
  }

  function dashboardPanel(tab, active) {
    const products = state.products.filter(item => item.listingId === active.id);
    const jobs = state.jobs.filter(item => item.listingId === active.id);
    const orders = state.orders.filter(item => item.listingId === active.id);
    const completeOrders = orders.filter(item => item.status === 'Complete');
    const revenue = completeOrders.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const customers = new Set(orders.map(item => item.customer).filter(Boolean));
    const lowStock = products.filter(item => Number(item.stock || 0) <= 3).length;
    const header = `<div class="dash-head"><div><span class="eyebrow">${escapeHTML(active.listingType)}</span><h1>${escapeHTML(active.name)}</h1><p class="muted">${escapeHTML(active.status)} • ${escapeHTML(active.city)}</p></div><div class="cluster"><a class="btn btn-outline" href="${listingLink(active.id)}">View storefront</a><a class="btn btn-primary" href="sell.html?edit=${encodeURIComponent(active.id)}">Edit profile</a></div></div>`;
    if (tab === 'overview') {
      return `${header}<div class="kpi-grid"><div class="surface kpi"><span class="kpi-label">Revenue</span><strong>${money(revenue)}</strong><span class="trend">Based on completed orders</span></div><div class="surface kpi"><span class="kpi-label">Orders</span><strong>${orders.length}</strong><span class="trend">No sample orders added</span></div><div class="surface kpi"><span class="kpi-label">Storefront views</span><strong>${Number(active.views || 0)}</strong><span class="trend">Starts at zero</span></div><div class="surface kpi"><span class="kpi-label">Low-stock items</span><strong>${lowStock}</strong><span class="trend ${lowStock ? 'down' : ''}">${lowStock ? 'Requires attention' : 'No low-stock items'}</span></div></div><div class="dash-grid"><div class="surface dash-card"><div class="card-top"><h3>Business readiness</h3><span class="pill">Live data only</span></div>${readiness(active, products, jobs)}</div><div class="surface dash-card"><h3>Next actions</h3><div class="quick-action-list"><button data-action="open-add-product">＋ Add product</button><button data-action="open-add-job">＋ Post vacancy</button><a href="${listingLink(active.id)}">View public profile</a><a href="sell.html?edit=${encodeURIComponent(active.id)}">Complete profile details</a></div></div></div><div class="surface dash-card dashboard-lower"><div class="card-top"><h3>Recent activity</h3><span class="pill">${products.length + jobs.length} items</span></div>${products.length || jobs.length ? `<div class="activity-list">${products.slice(0, 3).map(item => `<div class="activity"><span class="activity-dot"></span><div><p>Product added: <strong>${escapeHTML(item.name)}</strong></p><time>${escapeHTML(item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently')}</time></div></div>`).join('')}${jobs.slice(0, 3).map(item => `<div class="activity"><span class="activity-dot"></span><div><p>Vacancy posted: <strong>${escapeHTML(item.title)}</strong></p><time>${escapeHTML(item.posted || 'Recently')}</time></div></div>`).join('')}</div>` : '<div class="empty-inline">No activity yet. Add a product or vacancy to begin.</div>'}</div>`;
    }
    if (tab === 'products') {
      return `${header}<div class="panel-toolbar"><div><h2>Products and offers</h2><p class="muted">Products added here appear on your public storefront and marketplace.</p></div><button class="btn btn-primary" data-action="open-add-product">Add product</button></div>${products.length ? `<div class="grid grid-3">${products.map(productCard).join('')}</div>` : emptyDashboard('No products yet', 'Add your first product, service package or menu item.', 'open-add-product', 'Add first product')}`;
    }
    if (tab === 'orders') {
      return `${header}<div class="panel-toolbar"><div><h2>Orders</h2><p class="muted">Only real customer orders will be shown here.</p></div></div>${orders.length ? orderTable(orders) : emptyDashboard('No orders yet', 'New listings start at zero. Orders will appear after checkout is connected and customers purchase.', '', '')}`;
    }
    if (tab === 'customers') {
      return `${header}<div class="panel-toolbar"><div><h2>Customers</h2><p class="muted">Customer records are created from actual orders and enquiries.</p></div></div>${customers.size ? `<div class="surface dash-card"><p>${customers.size} customer records.</p></div>` : emptyDashboard('No customers yet', 'Customer profiles will appear after real enquiries or orders.', '', '')}`;
    }
    if (tab === 'jobs') {
      return `${header}<div class="panel-toolbar"><div><h2>Vacancies</h2><p class="muted">Publish opportunities under the correct business or organisation.</p></div><button class="btn btn-primary" data-action="open-add-job">Post a vacancy</button></div>${jobs.length ? `<div class="grid grid-2">${jobs.map(jobCard).join('')}</div>` : emptyDashboard('No vacancies posted', 'Post a job, internship, apprenticeship or national service opportunity.', 'open-add-job', 'Post first vacancy')}`;
    }
    if (tab === 'marketing') {
      return `${header}<div class="surface dash-card"><span class="eyebrow">AI marketing assistant</span><h2>Generate a simple campaign from your real listing</h2><p class="muted">The generator uses the name, category, city and primary offer saved for ${escapeHTML(active.name)}.</p><div class="field"><label>Campaign goal</label><select id="campaignGoal"><option>Reach more local customers</option><option>Promote a new product</option><option>Announce admissions</option><option>Recruit applicants</option><option>Promote an event</option></select></div><button class="btn btn-primary" data-action="generate-marketing">Generate campaign</button><div id="marketingOutput" class="marketing-output"></div></div>`;
    }
    if (tab === 'reviews') {
      return `${header}${emptyDashboard('No verified reviews yet', 'Reviews will only appear after a verified customer interaction or completed transaction.', '', '')}`;
    }
    return `${header}<div class="grid grid-2"><div class="surface dash-card"><h2>Profile settings</h2><p><strong>Listing type:</strong> ${escapeHTML(active.listingType)}</p><p><strong>Category:</strong> ${escapeHTML(active.category)}</p><p><strong>Contact:</strong> ${escapeHTML(active.phone || active.email || 'Not added')}</p><div class="cluster"><a class="btn btn-primary" href="sell.html?edit=${encodeURIComponent(active.id)}">Edit listing</a><button class="btn btn-outline danger-button" data-action="delete-listing" data-id="${escapeHTML(active.id)}">Delete listing</button></div></div><div class="surface dash-card"><h2>App installation</h2><p class="muted">Install GLOBENET on Android, Windows, macOS, ChromeOS, iPad or iPhone for app-like access.</p><button class="btn btn-primary" data-action="install">Install GLOBENET</button></div></div>`;
  }

  function readiness(active, products, jobs) {
    const checks = [
      [Boolean(active.image && active.image !== fallback), 'Business photo'],
      [Boolean(active.description), 'Description'],
      [Boolean(active.phone), 'Customer contact'],
      [Boolean(active.address), 'Location'],
      [products.length > 0, 'Product or offer'],
      [jobs.length > 0, 'Vacancy (optional)']
    ];
    return `<div class="readiness-list">${checks.map(([done, label]) => `<div><span class="readiness-check ${done ? 'done' : ''}">${done ? '✓' : '○'}</span><span>${escapeHTML(label)}</span></div>`).join('')}</div>`;
  }

  function emptyDashboard(title, text, action, label) {
    return `<div class="surface empty-state-card"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p>${action ? `<button class="btn btn-primary" data-action="${action}">${escapeHTML(label)}</button>` : ''}</div>`;
  }

  function orderTable(orders) {
    return `<div class="surface table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>${orders.map(order => `<tr><td>${escapeHTML(order.id)}</td><td>${escapeHTML(order.customer || 'Customer')}</td><td>${money(order.total)}</td><td><span class="status ${String(order.status || '').toLowerCase()}">${escapeHTML(order.status || 'Pending')}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  function openProductForm(listingId = getActiveListing()?.id) {
    if (!listingId) return openModal('Create a listing first', '<p>You need a business, school, organisation, restaurant or professional listing before adding products.</p><a class="btn btn-primary" href="sell.html">Create listing</a>');
    openModal('Add product or offer', `<form class="stack" id="productForm" data-listing-id="${escapeHTML(listingId)}"><div class="grid grid-2"><div class="field"><label>Name</label><input name="name" required placeholder="Product or service name"></div><div class="field"><label>Category</label><input name="category" required placeholder="Shoes, catering, course…"></div><div class="field"><label>Price (GH₵)</label><input name="price" type="number" min="0" step="0.01" required></div><div class="field"><label>Stock or spaces</label><input name="stock" type="number" min="0" value="1"></div></div><div class="field"><label>Description</label><textarea name="description" placeholder="What should customers know?"></textarea></div><div class="field"><label>Product picture</label><input name="photo" type="file" accept="image/*" required></div><button class="btn btn-primary" type="submit">Save product</button></form>`);
  }

  function openJobForm() {
    const active = getActiveListing();
    if (!active) return;
    openModal('Post a vacancy', `<form class="stack" id="jobForm" data-listing-id="${escapeHTML(active.id)}"><div class="grid grid-2"><div class="field"><label>Job title</label><input name="title" required></div><div class="field"><label>Job type</label><select name="type"><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Apprenticeship</option><option>National service</option><option>Contract</option></select></div><div class="field"><label>Location</label><input name="location" value="${escapeHTML(active.city)}" required></div><div class="field"><label>Salary</label><input name="salary" placeholder="GH₵2,000–2,500 or Negotiable"></div></div><div class="field"><label>Description</label><textarea name="desc" required></textarea></div><div class="field"><label>Skills, separated by commas</label><input name="skills" placeholder="Customer service, Excel, communication"></div><button class="btn btn-primary" type="submit">Publish vacancy</button></form>`);
  }

  async function submitProductForm(form) {
    const listing = state.listings.find(item => item.id === form.dataset.listingId);
    if (!listing) return showToast('The selected listing could not be found.');
    const data = new FormData(form);
    try {
      const image = await imageFileToDataURL(form.elements.namedItem('photo').files[0]);
      const product = {
        id: makeId('product'), listingId: listing.id,
        name: String(data.get('name') || '').trim(),
        category: String(data.get('category') || '').trim(),
        price: Number(data.get('price') || 0), stock: Number(data.get('stock') || 0),
        description: String(data.get('description') || '').trim(),
        business: listing.name, location: listing.city,
        rating: 0, image: image || listing.image || fallback,
        badge: 'New', createdAt: new Date().toISOString()
      };
      state.products.unshift(product);
      if (!writeState(state)) throw new Error('Browser storage is full.');
      closeLayers();
      renderPublicPages();
      renderDashboard();
      showToast(`${product.name} is now on your storefront`);
    } catch (error) {
      showToast(error.message || 'The product could not be saved.');
    }
  }

  function submitJobForm(form) {
    const listing = state.listings.find(item => item.id === form.dataset.listingId);
    if (!listing) return;
    const data = new FormData(form);
    const job = {
      id: makeId('job'), listingId: listing.id,
      title: String(data.get('title') || '').trim(), company: listing.name,
      location: String(data.get('location') || listing.city), type: String(data.get('type') || 'Full-time'),
      salary: String(data.get('salary') || 'Not specified'), posted: 'Just now',
      desc: String(data.get('desc') || '').trim(),
      skills: String(data.get('skills') || '').split(',').map(item => item.trim()).filter(Boolean),
      logo: initials(listing.name), createdAt: new Date().toISOString()
    };
    state.jobs.unshift(job);
    writeState(state);
    closeLayers();
    renderPublicPages();
    renderDashboard();
    showToast(`${job.title} has been published`);
  }

  function openContact(id, name) {
    const listing = state.listings.find(item => item.id === id) || seedListingById(id);
    const digits = String(listing?.phone || '').replace(/\D/g, '');
    const whatsapp = digits.length >= 9 ? `<a class="btn btn-primary" href="https://wa.me/${digits}" target="_blank" rel="noopener">Open WhatsApp</a>` : '<button class="btn btn-primary" data-action="save-enquiry">Send GLOBENET enquiry</button>';
    openModal(`Contact ${name || listing?.name || 'listing'}`, `<p>Choose a contact method. User-created listings use the phone, email and location saved by their owner.</p><div class="grid grid-2">${whatsapp}${listing?.email ? `<a class="btn btn-outline" href="mailto:${escapeHTML(listing.email)}">Send email</a>` : '<button class="btn btn-outline" data-action="save-enquiry">Send message</button>'}</div>`);
  }

  async function handleInstall() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) return showToast('GLOBENET is already installed.');
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const macSafari = /macintosh/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/chrome|chromium/i.test(navigator.userAgent);
    const instructions = ios
      ? 'In Safari, tap the Share button, then choose “Add to Home Screen”.'
      : macSafari
        ? 'In Safari, choose File → Add to Dock. On older macOS versions, use Safari’s Add to Home Screen or create a Dock shortcut.'
        : 'Open this website in Chrome or Microsoft Edge, open the browser menu, then choose “Install GLOBENET” or “Install app”.';
    openModal('Install GLOBENET', `<div class="install-guide"><img src="assets/images/icon-192.png" alt="GLOBENET app icon"><p>${escapeHTML(instructions)}</p><p class="muted">Installation requires the website to be served over HTTPS, as it is on Cloudflare Pages or GitHub Pages.</p></div>`);
  }

  function setupForms() {
    $('#businessForm')?.addEventListener('submit', event => {
      event.preventDefault();
      submitBusinessForm(event.currentTarget);
    });
    $('#businessPhotos')?.addEventListener('change', async event => {
      const preview = $('#photoPreview');
      if (!preview) return;
      const files = Array.from(event.target.files || []).slice(0, 3);
      preview.innerHTML = files.map(file => `<span>${escapeHTML(file.name)}</span>`).join('');
    });
    $$('.auth-form').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const fullName = String(data.get('fullName') || data.get('identifier') || 'GLOBENET user').trim();
      state.user = { id: state.user?.id || makeId('user'), fullName, role: String(data.get('role') || 'Member') };
      writeState(state);
      showToast('Account details saved on this device.');
      setTimeout(() => { location.href = state.listings.length ? 'dashboard.html' : 'sell.html'; }, 450);
    }));
    $('#contactForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      state.messages.unshift({ id: makeId('message'), ...data, createdAt: new Date().toISOString() });
      writeState(state);
      event.currentTarget.reset();
      showToast('Your message has been saved.');
    });
    $('#heroSearchForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const query = String($('#heroQuery')?.value || '').trim();
      const type = String($('#heroType')?.value || 'Products');
      const route = { Products: 'marketplace.html', Food: 'food.html', Services: 'services.html', Jobs: 'jobs.html', Schools: 'schools.html', Organisations: 'organizations.html' }[type] || 'marketplace.html';
      location.assign(`${route}?q=${encodeURIComponent(query)}`);
    });
    $('#aiForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#aiQuery');
      const query = String(input?.value || '').trim();
      if (!query) return;
      $('#aiMessages').insertAdjacentHTML('beforeend', `<div class="ai-msg user">${escapeHTML(query)}</div>`);
      input.value = '';
      const lower = query.toLowerCase();
      let reply = 'I found relevant GLOBENET categories. Use search and location filters to compare listings.';
      if (lower.includes('food') || lower.includes('restaurant')) reply = 'Open Food to compare restaurants, delivery information and ratings.';
      else if (lower.includes('job') || lower.includes('work')) reply = 'Open Jobs to compare full-time, part-time, internship, apprenticeship and national service roles.';
      else if (lower.includes('plumber') || lower.includes('electric')) reply = 'Open Services to compare skilled professionals by location, experience and response time.';
      else if (lower.includes('business') || lower.includes('sell')) reply = 'Use List your business to create a storefront with your real details and pictures.';
      setTimeout(() => {
        $('#aiMessages').insertAdjacentHTML('beforeend', `<div class="ai-msg bot">${escapeHTML(reply)}</div>`);
        $('#aiMessages').scrollTop = $('#aiMessages').scrollHeight;
      }, 250);
    });
  }

  function setupGlobalEvents() {
    document.addEventListener('click', event => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) return;
      const action = actionTarget.dataset.action;
      const id = actionTarget.dataset.id || '';
      if (actionTarget.tagName === 'A' && !['install'].includes(action)) return;
      event.preventDefault();
      if (action === 'close-layer') return closeLayers();
      if (action === 'open-ai') { $('#aiPanel')?.classList.toggle('open'); return; }
      if (action === 'install') return handleInstall();
      if (action === 'add-cart') return addToCart(id);
      if (action === 'save') return toggleSaved(id);
      if (action === 'view-product') {
        const product = productById(id);
        if (!product) return showToast('Product not found.');
        return openModal(product.name, `<img src="${safeURL(product.image)}" onerror="this.src='${fallback}'" alt="${escapeHTML(product.name)}" class="modal-product-image"><div class="card-top modal-product-meta"><div><p class="muted">${escapeHTML(product.business)} • ${escapeHTML(product.location)}</p><h2>${money(product.price)}</h2></div><div class="rating"><span class="star">★</span>${product.rating || 'New'}</div></div><p>${escapeHTML(product.description || 'Available for enquiry, pickup or delivery.')}</p><button class="btn btn-primary" data-action="add-cart" data-id="${escapeHTML(product.id)}">Add to cart</button>`);
      }
      if (action === 'contact') return openContact(id, actionTarget.dataset.name);
      if (action === 'request-service') return openModal(`Request ${actionTarget.dataset.name}`, `<form class="stack" id="serviceRequestForm"><div class="field"><label>Describe the work</label><textarea name="request" required></textarea></div><div class="grid grid-2"><div class="field"><label>Preferred date</label><input name="date" type="date" required></div><div class="field"><label>Location</label><input name="location" required></div></div><button class="btn btn-primary" type="submit">Send request</button></form>`);
      if (action === 'apply-job') {
        const job = [...state.jobs, ...D.jobs].find(item => item.id === id);
        if (!job) return;
        return openModal(`Apply for ${job.title}`, `<form class="stack" id="applicationForm" data-job-id="${escapeHTML(job.id)}"><div class="field"><label>Full name</label><input name="name" required></div><div class="field"><label>Email or phone</label><input name="contact" required></div><div class="field"><label>Short introduction</label><textarea name="introduction" required></textarea></div><button class="btn btn-primary" type="submit">Submit application</button></form>`);
      }
      if (action === 'cart-inc') {
        const item = cart.find(entry => entry.id === id); if (item) item.qty += 1; saveState(); return renderCart();
      }
      if (action === 'cart-dec') {
        const item = cart.find(entry => entry.id === id); if (item) item.qty -= 1; cart = cart.filter(entry => entry.qty > 0); saveState(); return renderCart();
      }
      if (action === 'cart-remove') { cart = cart.filter(entry => entry.id !== id); saveState(); return renderCart(); }
      if (action === 'checkout') return openModal('Checkout', '<p>The cart works locally. Real payment, delivery and inventory confirmation require a secure backend and payment provider.</p><a class="btn btn-primary" href="contact.html">Join payment pilot</a>');
      if (action === 'dashboard-tab') {
        const url = new URL(location.href); url.searchParams.set('tab', actionTarget.dataset.tab); history.replaceState({}, '', url); renderDashboard(); return;
      }
      if (action === 'open-add-product' || action === 'dashboard-add-product') return openProductForm(actionTarget.dataset.listingId);
      if (action === 'open-add-job') return openJobForm();
      if (action === 'generate-marketing') {
        const active = getActiveListing();
        const goal = $('#campaignGoal')?.value || 'Reach more customers';
        const output = $('#marketingOutput');
        if (output && active) output.innerHTML = `<div class="surface campaign-card"><span class="pill">${escapeHTML(goal)}</span><h3>Discover ${escapeHTML(active.name)} in ${escapeHTML(active.city)}</h3><p>${escapeHTML(active.primaryOffer || active.description || active.category)}. Contact us today through GLOBENET and see what makes this local ${escapeHTML(active.category)} different.</p><strong>Suggested audience:</strong> People searching for ${escapeHTML(active.category)} in and around ${escapeHTML(active.city)}.</div>`;
        return;
      }
      if (action === 'delete-listing') {
        const listing = state.listings.find(item => item.id === id);
        if (!listing) return;
        return openModal(`Delete ${listing.name}?`, `<p>This removes the listing, its local products and vacancies from this browser.</p><button class="btn danger-solid" data-action="confirm-delete-listing" data-id="${escapeHTML(id)}">Delete permanently</button>`);
      }
      if (action === 'confirm-delete-listing') {
        state.listings = state.listings.filter(item => item.id !== id);
        state.products = state.products.filter(item => item.listingId !== id);
        state.jobs = state.jobs.filter(item => item.listingId !== id);
        state.activeListingId = state.listings[0]?.id || null;
        writeState(state); closeLayers(); renderDashboard(); showToast('Listing deleted.'); return;
      }
      if (action === 'save-enquiry') { closeLayers(); showToast('Your enquiry was saved.'); return; }
    });

    document.addEventListener('submit', event => {
      if (event.target.id === 'productForm') { event.preventDefault(); submitProductForm(event.target); }
      if (event.target.id === 'jobForm') { event.preventDefault(); submitJobForm(event.target); }
      if (event.target.id === 'applicationForm') {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));
        state.applications.unshift({ id: makeId('application'), jobId: event.target.dataset.jobId, ...data, createdAt: new Date().toISOString() });
        writeState(state); closeLayers(); showToast('Application submitted on this device.');
      }
      if (event.target.id === 'serviceRequestForm') {
        event.preventDefault();
        state.messages.unshift({ id: makeId('service-request'), ...Object.fromEntries(new FormData(event.target)), createdAt: new Date().toISOString() });
        writeState(state); closeLayers(); showToast('Service request saved.');
      }
    });

    $('#overlay')?.addEventListener('click', closeLayers);
    $('#mobileToggle')?.addEventListener('click', () => {
      const panel = $('#mobilePanel');
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      panel.setAttribute('aria-hidden', String(!open));
      $('#mobileToggle').setAttribute('aria-expanded', String(open));
    });
    $('#mobilePanel')?.addEventListener('click', event => {
      if (event.target.closest('a')) {
        event.currentTarget.classList.remove('open');
        event.currentTarget.setAttribute('aria-hidden', 'true');
      }
    });
    $('#cartToggle')?.addEventListener('click', openCart);
    $('#themeToggle')?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      try { localStorage.setItem('globenet-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {}
    });
    $('#dataToggle')?.addEventListener('click', () => {
      document.body.classList.toggle('low-data');
      try { localStorage.setItem('globenet-low-data', document.body.classList.contains('low-data') ? 'on' : 'off'); } catch {}
      showToast(document.body.classList.contains('low-data') ? 'Low-data mode enabled' : 'Pictures restored');
    });
    $('#installApp')?.addEventListener('click', handleInstall);
    $('#aiButton')?.addEventListener('click', () => $('#aiPanel')?.classList.toggle('open'));
    $('#pageSearch')?.addEventListener('input', applyFilter);
    $('#pageFilter')?.addEventListener('change', applyFilter);
    $$('.chip[data-filter]').forEach(chip => chip.addEventListener('click', () => {
      $$('.chip[data-filter]').forEach(item => item.classList.remove('active'));
      chip.classList.add('active');
      activeChipFilter = chip.dataset.filter || '';
      applyFilter();
    }));
    document.addEventListener('change', event => {
      if (event.target.id === 'activeListingSelect') {
        state.activeListingId = event.target.value;
        writeState(state);
        renderDashboard();
      }
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLayers(); });
  }

  function setupPWA() {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      $('#installApp')?.classList.add('install-ready');
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      showToast('GLOBENET installed successfully.');
    });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        try {
          if (!sessionStorage.getItem('globenet-sw-v3-reload')) {
            sessionStorage.setItem('globenet-sw-v3-reload', '1');
            location.reload();
          }
        } catch {}
      });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(error => console.warn('Service worker registration skipped:', error));
    }
  }

  function init() {
    try {
      if (localStorage.getItem('globenet-theme') === 'dark') document.body.classList.add('dark');
      if (localStorage.getItem('globenet-low-data') === 'on') document.body.classList.add('low-data');
    } catch {}
    buildShell();
    renderPublicPages();
    renderBusinessPage();
    renderDashboard();
    renderCart();
    hydrateSellForm();
    setupForms();
    setupGlobalEvents();
    setupPWA();
    const params = new URLSearchParams(location.search);
    if (params.get('q') && $('#pageSearch')) {
      $('#pageSearch').value = params.get('q');
      applyFilter();
    }
  }

  init();
})();
