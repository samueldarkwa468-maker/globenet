
(() => {
  const D = window.GLOBENET_DATA;
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',maximumFractionDigits:0}).format(n).replace('GH₵','GH₵');
  const fallback = 'assets/images/fallback.svg';
  const navItems = [
    ['index.html','Discover','home'],['marketplace.html','Marketplace','marketplace'],['food.html','Food','food'],['services.html','Services','services'],['jobs.html','Jobs','jobs'],['schools.html','Schools','schools'],['organizations.html','Organisations','organizations'],['events.html','Events','events']
  ];
  const page = document.body.dataset.page || 'home';
  const headerHost = $('#site-header');
  if(headerHost){
    headerHost.innerHTML = `<header class="site-header"><div class="container header-inner">
      <a class="brand" href="index.html"><img src="assets/images/logo.svg" alt="GLOBENET"></a>
      <nav class="main-nav">${navItems.map(([href,label,key])=>`<a class="${page===key?'active':''}" href="${href}">${label}</a>`).join('')}</nav>
      <div class="header-actions">
        <button class="icon-btn" id="dataToggle" title="Low-data mode" aria-label="Toggle low-data mode">◫</button>
        <button class="icon-btn" id="themeToggle" title="Theme" aria-label="Toggle theme">☾</button>
        <button class="icon-btn" id="cartToggle" title="Cart" aria-label="Open cart">🛒<span class="badge" id="cartCount">0</span></button>
        <a class="btn btn-outline btn-small" href="login.html">Sign in</a>
        <a class="btn btn-primary btn-small" href="sell.html">List your business</a>
        <button class="icon-btn mobile-toggle" id="mobileToggle" aria-label="Open navigation">☰</button>
      </div></div></header>
      <div class="mobile-panel" id="mobilePanel">${navItems.map(([href,label,key])=>`<a class="${page===key?'active':''}" href="${href}">${label}</a>`).join('')}<a href="sell.html">List your business</a><a href="login.html">Sign in</a></div>`;
  }
  const footerHost = $('#site-footer');
  if(footerHost){footerHost.innerHTML = `<footer class="site-footer"><div class="container"><div class="footer-grid">
    <div class="footer-brand"><img src="assets/images/logo.svg" alt="GLOBENET"><p>GLOBENET connects local businesses, customers, job seekers, skilled professionals, schools and community organisations in one trusted digital network.</p><div class="cluster"><span class="pill">Ghana first</span><span class="pill">Built for Africa</span></div></div>
    <div class="footer-col"><h4>Explore</h4><a href="marketplace.html">Marketplace</a><a href="food.html">Food & restaurants</a><a href="services.html">Skilled services</a><a href="jobs.html">Jobs</a></div>
    <div class="footer-col"><h4>Community</h4><a href="schools.html">Schools</a><a href="organizations.html">Organisations</a><a href="events.html">Events</a><a href="about.html">About GLOBENET</a></div>
    <div class="footer-col"><h4>For business</h4><a href="sell.html">Create storefront</a><a href="dashboard.html">Business dashboard</a><a href="jobs.html">Post a vacancy</a><a href="contact.html">Partner with us</a></div>
    <div class="footer-col"><h4>Support</h4><a href="contact.html">Help centre</a><a href="contact.html">Report a problem</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div>
  </div><div class="footer-bottom"><span>© 2026 GLOBENET. Local opportunity, connected.</span><span>Designed for fast, mobile-first access.</span></div></div></footer>`}

  // UI shell
  document.body.insertAdjacentHTML('beforeend', `<div class="overlay" id="overlay"></div><aside class="cart-drawer" id="cartDrawer"><div class="drawer-head"><strong>Your cart</strong><button class="icon-btn" data-close>✕</button></div><div class="cart-items" id="cartItems"></div><div class="drawer-foot"><div class="total"><span>Total</span><span id="cartTotal">GH₵0</span></div><button class="btn btn-primary" style="width:100%" id="checkoutBtn">Continue to checkout</button></div></aside>
  <div class="modal" id="globalModal"><div class="modal-head"><h2 id="modalTitle">Details</h2><button class="icon-btn" data-close>✕</button></div><div id="modalBody"></div></div>
  <button class="ai-button" id="aiButton" aria-label="Open Globe AI">✦</button><div class="ai-panel" id="aiPanel"><div class="ai-head"><h3>Globe AI</h3><p>Search GLOBENET in everyday language</p></div><div class="ai-messages" id="aiMessages"><div class="ai-msg bot">Hello. Try “affordable food near Cape Coast”, “find a plumber”, or “entry-level jobs”.</div></div><form class="ai-input" id="aiForm"><input id="aiQuery" placeholder="Ask Globe AI…" aria-label="Ask Globe AI"><button class="btn btn-primary btn-small">Send</button></form></div><div class="toast" id="toast"></div>`);

  const overlay = $('#overlay'), drawer=$('#cartDrawer'), modal=$('#globalModal');
  const closeLayers=()=>{drawer.classList.remove('open');modal.classList.remove('show');overlay.classList.remove('show')};
  overlay.addEventListener('click',closeLayers);$$('[data-close]').forEach(b=>b.addEventListener('click',closeLayers));
  $('#mobileToggle')?.addEventListener('click',()=>$('#mobilePanel').classList.toggle('open'));
  const showToast = msg => {const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)};
  const openModal=(title,body)=>{$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;modal.classList.add('show');overlay.classList.add('show')};

  // Settings
  const theme=localStorage.getItem('globenet-theme'); if(theme==='dark')document.body.classList.add('dark');
  $('#themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('globenet-theme',document.body.classList.contains('dark')?'dark':'light')});
  if(localStorage.getItem('globenet-low-data')==='on')document.body.classList.add('low-data');
  $('#dataToggle')?.addEventListener('click',()=>{document.body.classList.toggle('low-data');localStorage.setItem('globenet-low-data',document.body.classList.contains('low-data')?'on':'off');showToast(document.body.classList.contains('low-data')?'Low-data mode enabled':'Images restored')});

  // Cart
  let cart = JSON.parse(localStorage.getItem('globenet-cart')||'[]');
  const saveCart=()=>{localStorage.setItem('globenet-cart',JSON.stringify(cart));renderCart()};
  const renderCart=()=>{const host=$('#cartItems');$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0); if(!cart.length){host.innerHTML='<div class="center muted" style="padding:45px 15px">Your cart is empty.<br>Explore the marketplace and add products.</div>';$('#cartTotal').textContent='GH₵0';return}host.innerHTML=cart.map(x=>`<div class="cart-item"><img src="${x.image}" onerror="this.src='${fallback}'" alt="${x.name}"><div><h4>${x.name}</h4><p>${money(x.price)} × ${x.qty}</p><div class="cluster"><button class="btn btn-outline btn-small" data-cart-dec="${x.id}">−</button><button class="btn btn-outline btn-small" data-cart-inc="${x.id}">+</button></div></div><button class="icon-btn" data-cart-remove="${x.id}">✕</button></div>`).join('');$('#cartTotal').textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));bindActions()};
  const addCart=id=>{const p=D.products.find(x=>x.id===id);if(!p)return;const item=cart.find(x=>x.id===id);item?item.qty++:cart.push({...p,qty:1});saveCart();showToast(`${p.name} added to cart`)};
  $('#cartToggle')?.addEventListener('click',()=>{drawer.classList.add('open');overlay.classList.add('show')});
  $('#checkoutBtn')?.addEventListener('click',()=>openModal('Checkout preview','<p>This front-end prototype is ready to connect to a real payment provider and order API.</p><div class="surface" style="padding:16px"><strong>Next production step</strong><p class="muted">Connect user accounts, inventory, Mobile Money/card payments, delivery addresses and order confirmation.</p></div>'));

  // Saved items
  let saved=JSON.parse(localStorage.getItem('globenet-saved')||'[]');
  const toggleSaved=id=>{saved.includes(id)?saved=saved.filter(x=>x!==id):saved.push(id);localStorage.setItem('globenet-saved',JSON.stringify(saved));$$(`[data-save="${id}"]`).forEach(b=>b.classList.toggle('saved',saved.includes(id)));showToast(saved.includes(id)?'Saved to favourites':'Removed from favourites')};

  const productCard=p=>`<article class="card searchable" data-search="${p.name} ${p.category} ${p.business} ${p.location}"><div class="card-media"><img loading="lazy" src="${p.image}" onerror="this.src='${fallback}'" alt="${p.name}"><div class="card-badges"><span class="pill featured">${p.badge}</span></div><button class="heart-btn ${saved.includes(p.id)?'saved':''}" data-save="${p.id}" aria-label="Save ${p.name}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${p.name}</h3><p>${p.business} <span class="verified">●</span></p></div><div class="rating"><span class="star">★</span>${p.rating}</div></div><div class="meta"><span>⌖ ${p.location}</span><span>🚚 Delivery</span></div><div><span class="price">${money(p.price)}</span>${p.oldPrice?`<span class="old-price">${money(p.oldPrice)}</span>`:''}</div><div class="card-actions"><button class="btn btn-primary btn-small" data-add-cart="${p.id}">Add to cart</button><button class="btn btn-outline btn-small" data-product="${p.id}">View</button></div></div></article>`;
  const businessCard=b=>`<article class="card searchable" data-search="${b.name} ${b.category} ${b.location}"><div class="card-media"><img loading="lazy" src="${b.image}" onerror="this.src='${fallback}'" alt="${b.name}"><div class="card-badges"><span class="pill featured">${b.badge}</span><span class="pill ${b.open?'open':''}">${b.open?'Open now':'Closed'}</span></div><button class="heart-btn ${saved.includes(b.id)?'saved':''}" data-save="${b.id}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${b.name} <span class="verified">●</span></h3><p>${b.category}</p></div><div class="rating"><span class="star">★</span>${b.rating}</div></div><div class="meta"><span>⌖ ${b.location}</span><span>${b.reviews} reviews</span></div><div class="card-actions"><a class="btn btn-primary btn-small" href="business.html">View business</a><button class="btn btn-outline btn-small" data-contact="${b.name}">Contact</button></div></div></article>`;
  const restaurantCard=r=>`<article class="card searchable" data-search="${r.name} ${r.type} ${r.location}"><div class="card-media"><img loading="lazy" src="${r.image}" onerror="this.src='${fallback}'" alt="${r.name}"><div class="card-badges"><span class="pill featured">${r.badge}</span><span class="pill open">Open</span></div><button class="heart-btn ${saved.includes(r.id)?'saved':''}" data-save="${r.id}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${r.name} <span class="verified">●</span></h3><p>${r.type}</p></div><div class="rating"><span class="star">★</span>${r.rating}</div></div><div class="meta"><span>⌖ ${r.location}</span><span>◷ ${r.delivery}</span><span>${r.price}</span></div><div class="card-actions"><button class="btn btn-primary btn-small" data-order="${r.name}">View menu</button><button class="btn btn-outline btn-small" data-contact="${r.name}">WhatsApp</button></div></div></article>`;
  const serviceCard=s=>`<article class="card profile-card searchable" data-search="${s.name} ${s.title} ${s.location}"><div class="profile-cover"><img loading="lazy" src="${s.cover}" onerror="this.src='${fallback}'" alt="${s.title}"><img class="profile-avatar" src="${s.image}" onerror="this.src='${fallback}'" alt="${s.name}"></div><div class="profile-body"><div class="card-top"><div><h3>${s.name} <span class="verified">●</span></h3><p>${s.title}</p></div><div class="rating"><span class="star">★</span>${s.rating}</div></div><div class="meta"><span>⌖ ${s.location}</span><span>Replies in ${s.response}</span></div><div class="profile-stats"><div><strong>${s.jobs}</strong><span>Jobs done</span></div><div><strong>${s.rating}</strong><span>Rating</span></div><div><strong>${s.response}</strong><span>Response</span></div></div><div class="card-actions"><button class="btn btn-primary btn-small" data-book="${s.name}">Request service</button><button class="btn btn-outline btn-small" data-contact="${s.name}">Message</button></div></div></article>`;
  const jobCard=j=>`<article class="surface job-card searchable" data-search="${j.title} ${j.company} ${j.location} ${j.type} ${j.skills.join(' ')}"><div class="job-head"><div class="company-row"><div class="logo-box">${j.logo}</div><div><h3>${j.title}</h3><p>${j.company} <span class="verified">●</span></p></div></div><button class="heart-btn ${saved.includes(j.id)?'saved':''}" style="position:static" data-save="${j.id}">♥</button></div><div class="meta"><span>⌖ ${j.location}</span><span>▣ ${j.type}</span><span>◷ ${j.posted}</span></div><p class="job-description">${j.desc}</p><div class="skill-list">${j.skills.map(x=>`<span>${x}</span>`).join('')}</div><div class="card-top"><span class="salary">${j.salary}</span><button class="btn btn-primary btn-small" data-apply="${j.id}">Quick apply</button></div></article>`;
  const schoolCard=s=>`<article class="card searchable" data-search="${s.name} ${s.type} ${s.location} ${s.programs}"><div class="card-media"><img loading="lazy" src="${s.image}" onerror="this.src='${fallback}'" alt="${s.name}"><div class="card-badges"><span class="pill featured">${s.badge}</span></div><button class="heart-btn ${saved.includes(s.id)?'saved':''}" data-save="${s.id}">♥</button></div><div class="card-body"><div class="card-top"><div><h3>${s.name} <span class="verified">●</span></h3><p>${s.type}</p></div><div class="rating"><span class="star">★</span>${s.rating}</div></div><div class="meta"><span>⌖ ${s.location}</span></div><p><strong>Programmes:</strong> ${s.programs}</p><div class="card-actions"><button class="btn btn-primary btn-small" data-school="${s.name}">View admissions</button><button class="btn btn-outline btn-small" data-contact="${s.name}">Contact</button></div></div></article>`;
  const orgCard=o=>`<article class="card searchable" data-search="${o.name} ${o.type} ${o.location} ${o.schedule}"><div class="card-media"><img loading="lazy" src="${o.image}" onerror="this.src='${fallback}'" alt="${o.name}"><div class="card-badges"><span class="pill featured">${o.badge}</span></div><button class="heart-btn ${saved.includes(o.id)?'saved':''}" data-save="${o.id}">♥</button></div><div class="card-body"><h3>${o.name} <span class="verified">●</span></h3><p>${o.type}</p><div class="meta"><span>⌖ ${o.location}</span><span>◷ ${o.schedule}</span></div><div class="card-actions"><button class="btn btn-primary btn-small" data-org="${o.name}">View profile</button><button class="btn btn-outline btn-small" data-contact="${o.name}">Contact</button></div></div></article>`;
  const eventCard=e=>`<article class="card event-card searchable" data-search="${e.name} ${e.location} ${e.type}"><div class="card-media"><img loading="lazy" src="${e.image}" onerror="this.src='${fallback}'" alt="${e.name}"><div class="date-box"><span>${e.month}</span>${e.date}</div><button class="heart-btn ${saved.includes(e.id)?'saved':''}" data-save="${e.id}">♥</button></div><div class="card-body"><span class="eyebrow">${e.type}</span><h3 style="margin-top:12px">${e.name}</h3><div class="meta"><span>⌖ ${e.location}</span><span>◷ ${e.time}</span></div><div class="card-top"><strong>${e.price}</strong><button class="btn btn-primary btn-small" data-ticket="${e.name}">Get ticket</button></div></div></article>`;

  // Page rendering
  const render=(selector,items,fn)=>{const el=$(selector);if(el)el.innerHTML=items.map(fn).join('')};
  render('#featuredBusinesses',D.businesses.slice(0,3),businessCard);
  render('#homeProducts',D.products.slice(0,4),productCard);
  render('#homeJobs',D.jobs.slice(0,3),jobCard);
  render('#marketGrid',D.products,productCard);
  render('#restaurantGrid',D.restaurants,restaurantCard);
  render('#serviceGrid',D.services,serviceCard);
  render('#jobGrid',D.jobs,jobCard);
  render('#schoolGrid',D.schools,schoolCard);
  render('#orgGrid',D.organizations,orgCard);
  render('#eventGrid',D.events,eventCard);
  render('#businessProducts',D.products.filter(x=>x.business==='Kasa Style Hub').slice(0,4),productCard);

  function bindActions(){
    $$('[data-add-cart]').forEach(b=>b.onclick=()=>addCart(b.dataset.addCart));
    $$('[data-save]').forEach(b=>b.onclick=()=>toggleSaved(b.dataset.save));
    $$('[data-product]').forEach(b=>b.onclick=()=>{const p=D.products.find(x=>x.id===b.dataset.product);openModal(p.name,`<img src="${p.image}" onerror="this.src='${fallback}'" alt="${p.name}" style="width:100%;height:260px;object-fit:cover;border-radius:16px"><div class="card-top" style="margin-top:16px"><div><p class="muted">${p.business} • ${p.location}</p><h2>${money(p.price)}</h2></div><div class="rating"><span class="star">★</span>${p.rating}</div></div><p>Available for local delivery or pickup. This listing demonstrates GLOBENET’s product discovery, trusted seller and checkout experience.</p><button class="btn btn-primary" data-add-cart="${p.id}">Add to cart</button>`);bindActions()});
    $$('[data-contact]').forEach(b=>b.onclick=()=>openModal(`Contact ${b.dataset.contact}`,`<p>Choose how you want to contact this verified listing.</p><div class="grid grid-2"><button class="btn btn-primary">Open WhatsApp</button><button class="btn btn-outline">Send message</button></div>`));
    $$('[data-order]').forEach(b=>b.onclick=()=>openModal(`${b.dataset.order} menu`,`<p>Browse meals, select quantities and choose delivery or pickup.</p><div class="surface" style="padding:16px"><div class="card-top"><strong>Signature local meal</strong><strong>GH₵45</strong></div><p class="muted">Main dish, protein and side.</p><button class="btn btn-primary">Add meal</button></div>`));
    $$('[data-book]').forEach(b=>b.onclick=()=>openModal(`Request ${b.dataset.book}`,`<form class="stack"><div class="field"><label>Describe the work</label><textarea placeholder="What do you need done?"></textarea></div><div class="grid grid-2"><div class="field"><label>Preferred date</label><input type="date"></div><div class="field"><label>Location</label><input placeholder="Your area"></div></div><button class="btn btn-primary" type="button" onclick="document.querySelector('[data-close]').click()">Send request</button></form>`));
    $$('[data-apply]').forEach(b=>b.onclick=()=>{const j=D.jobs.find(x=>x.id===b.dataset.apply);openModal(`Apply for ${j.title}`,`<form class="stack"><div class="field"><label>Full name</label><input required placeholder="Your name"></div><div class="field"><label>Email or phone</label><input required placeholder="Contact details"></div><div class="field"><label>Short introduction</label><textarea placeholder="Why are you a good match?"></textarea></div><div class="upload-box">Upload CV or use the AI CV Builder</div><button class="btn btn-primary" type="button" id="sendApplication">Submit application</button></form>`);setTimeout(()=>$('#sendApplication')?.addEventListener('click',()=>{closeLayers();showToast('Application saved in this prototype')}),0)});
    $$('[data-school]').forEach(b=>b.onclick=()=>openModal(`${b.dataset.school} admissions`,`<p>View programmes, fees, requirements, deadlines, scholarships and online application options.</p><button class="btn btn-primary">Start application</button>`));
    $$('[data-org]').forEach(b=>b.onclick=()=>openModal(b.dataset.org,`<p>View schedules, announcements, events, volunteer opportunities and community programmes.</p><button class="btn btn-primary">Follow organisation</button>`));
    $$('[data-ticket]').forEach(b=>b.onclick=()=>openModal(b.dataset.ticket,`<p>Reserve a place and receive your digital ticket through email or WhatsApp.</p><button class="btn btn-primary">Reserve ticket</button>`));
    $$('[data-cart-inc]').forEach(b=>b.onclick=()=>{cart.find(x=>x.id===b.dataset.cartInc).qty++;saveCart()});
    $$('[data-cart-dec]').forEach(b=>b.onclick=()=>{const i=cart.find(x=>x.id===b.dataset.cartDec);i.qty--;if(i.qty<1)cart=cart.filter(x=>x.id!==i.id);saveCart()});
    $$('[data-cart-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>x.id!==b.dataset.cartRemove);saveCart()});
  }
  bindActions();renderCart();

  // Page search/filter
  const searchInput=$('#pageSearch');
  const filterSelect=$('#pageFilter');
  const applyFilter=()=>{const q=(searchInput?.value||'').toLowerCase().trim();const f=(filterSelect?.value||'').toLowerCase();let count=0;$$('.searchable').forEach(card=>{const hay=(card.dataset.search||'').toLowerCase();const show=(!q||hay.includes(q))&&(!f||hay.includes(f));card.style.display=show?'':'none';if(show)count++});const empty=$('#emptyState');if(empty)empty.style.display=count?'none':'block'};
  searchInput?.addEventListener('input',applyFilter);filterSelect?.addEventListener('change',applyFilter);
  $$('.chip[data-filter]').forEach(ch=>ch.addEventListener('click',()=>{$$('.chip[data-filter]').forEach(x=>x.classList.remove('active'));ch.classList.add('active');if(searchInput)searchInput.value=ch.dataset.filter==='all'?'':ch.dataset.filter;applyFilter()}));

  // Hero search
  $('#heroSearchForm')?.addEventListener('submit',e=>{e.preventDefault();const q=$('#heroQuery').value.trim();const type=$('#heroType').value;const route={Products:'marketplace.html',Food:'food.html',Services:'services.html',Jobs:'jobs.html',Schools:'schools.html',Organisations:'organizations.html'}[type]||'marketplace.html';location.href=`${route}?q=${encodeURIComponent(q)}`});
  const params=new URLSearchParams(location.search);if(params.get('q')&&searchInput){searchInput.value=params.get('q');applyFilter()}

  // Sell form
  $('#businessForm')?.addEventListener('submit',e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));localStorage.setItem('globenet-business-draft',JSON.stringify(fd));openModal('Business profile submitted',`<p><strong>${fd.businessName||'Your business'}</strong> has been saved as a prototype listing.</p><p class="muted">A production system would now verify the owner, contact details and business location before publishing.</p><a class="btn btn-primary" href="dashboard.html">Open dashboard</a>`)});
  const draft=JSON.parse(localStorage.getItem('globenet-business-draft')||'null');if(draft&&$('#businessForm'))Object.entries(draft).forEach(([k,v])=>{const el=$(`[name="${k}"]`);if(el)el.value=v});

  // Auth demos
  $$('.auth-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();showToast('Account flow ready for backend integration');setTimeout(()=>location.href='dashboard.html',900)}));

  // AI demo
  $('#aiButton').addEventListener('click',()=>$('#aiPanel').classList.toggle('open'));
  $('#aiForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#aiQuery'),q=input.value.trim();if(!q)return;$('#aiMessages').insertAdjacentHTML('beforeend',`<div class="ai-msg user">${q.replace(/[<>]/g,'')}</div>`);input.value='';setTimeout(()=>{let reply='I found several relevant listings. Use the category filters to compare location, rating and availability.';const l=q.toLowerCase();if(l.includes('food')||l.includes('restaurant'))reply='I found restaurants and food vendors. Open the Food page to compare delivery time, price range and ratings.';else if(l.includes('job')||l.includes('work'))reply='I found current job categories including full-time, national service, apprenticeship and contract roles.';else if(l.includes('plumber')||l.includes('electric'))reply='I found verified skilled professionals. You can compare jobs completed, response time and customer ratings.';$('#aiMessages').insertAdjacentHTML('beforeend',`<div class="ai-msg bot">${reply}</div>`);$('#aiMessages').scrollTop=$('#aiMessages').scrollHeight},450)});

  // service worker
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
