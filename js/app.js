/* BUP Bookstore — plain JavaScript, no build tools or external runtime dependencies.
   This is a device-local prototype. Connect a server before accepting real orders. */
(() => {
  'use strict';
  const { books, departments, settings } = window.BOOKSTORE;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = value => '৳' + Number(value).toLocaleString('en-BD', { maximumFractionDigits: 2 });
  const bookById = id => books.find(b => b.id === id);
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    heart: '<path d="M20.5 4.7a5.5 5.5 0 0 0-8.5.8 5.5 5.5 0 0 0-8.5-.8C-1 9.3 6 15.5 12 20c6-4.5 13-10.7 8.5-15.3Z"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    book: '<path d="M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V3Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
    headphones: '<path d="M3 15v-3a9 9 0 0 1 18 0v5c0 3-2 5-6 5"/><rect x="2" y="11" width="4" height="7" rx="2"/><rect x="18" y="11" width="4" height="7" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    leaf: '<path d="M20 3c-15-2-20 14-10 16C20 22 22 9 20 3ZM4 22 17 7"/>',
    truck: '<path d="M1 4h13v13H1V4Zm13 5h5l4 5v3h-9"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  function icons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const storageKey = 'bup-bookstore-v1';
  const fresh = () => ({ cart: {}, wishlist: [], orders: [], requests: [], tickets: [], resales: [], coupon: '' });
  let state = fresh(), storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      state.cart = Object.fromEntries(Object.entries(saved.cart || {}).filter(([id, q]) => bookById(id) && Number.isInteger(q) && q > 0).map(([id, q]) => [id, Math.min(q, bookById(id).stock)]).filter(([,q]) => q > 0));
      state.wishlist = Array.isArray(saved.wishlist) ? [...new Set(saved.wishlist.filter(id => bookById(id)))] : [];
      for (const key of ['orders', 'requests', 'tickets', 'resales']) state[key] = Array.isArray(saved[key]) ? saved[key].filter(x => x && typeof x === 'object' && typeof x.id === 'string') : [];
      state.coupon = saved.coupon === settings.coupon ? saved.coupon : '';
      state.orders = state.orders.filter(o => Array.isArray(o.items) && o.items.every(i => bookById(i.id) && Number.isInteger(i.quantity) && i.quantity > 0 && Number.isFinite(i.price)) && Number.isFinite(o.total));
    }
  } catch { storageAvailable = false; }
  let filters = { query: '', department: '', semester: '', course: '', category: 'All books', sort: 'featured', stock: false };
  let currentView = '', lastFocus = null, toastTimer, features, commerce;
  let shownLimit=24;
  const ownerId = () => features?.currentUser()?.id || null;
  const visibleRecords = key => state[key].filter(record => (record.ownerId || null) === ownerId());
  const main = $('#main'), modal = $('#modal');
  function toast(text) { const el = $('#toast'); el.textContent = text + (!storageAvailable && !text.includes('session') ? ' Changes last for this session only.' : ''); el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3400); }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; toast('Browser storage is unavailable. Changes last for this session only.'); }
    updateCounts();
  }
  function stockOf(b) { return b.archived ? 0 : Math.max(0, b.stock - state.orders.reduce((n,o) => n + o.items.filter(i => i.id === b.id).reduce((sum,i) => sum + i.quantity, 0), 0)); }
  function updateCounts() { $('#cart-count').textContent = Object.values(state.cart).reduce((a,b) => a+b,0); $('#wishlist-count').textContent = state.wishlist.length; }
  function imageMarkup(b, cls = '') { return !b.image ? `<span class="cover-fallback designed-cover"><small>BUP READING SHELF</small><strong>${esc(b.title)}</strong><em>${esc(b.author)}</em></span>` : `<img class="${cls}" src="${esc(b.image)}" alt="${esc(b.title)} book cover" loading="lazy" data-book-image="${b.id}">`; }
  document.addEventListener('error', event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.dataset.bookImage) {
      const fallback = document.createElement('span'); fallback.className = 'cover-fallback'; fallback.textContent = bookById(img.dataset.bookImage)?.title || 'Book cover'; img.replaceWith(fallback);
    }
  }, true);
  function card(b) {
    const available = stockOf(b), saved = state.wishlist.includes(b.id);
    return `<article class="book-card">${b.tag ? `<span class="book-badge">${esc(b.tag)}</span>` : ''}<button class="wishlist-button ${saved ? 'saved' : ''}" data-action="save-book" data-id="${b.id}" aria-label="${saved ? 'Unsave' : 'Save'} ${esc(b.title)}" aria-pressed="${saved}">${icon('heart')}</button><button class="book-image-button" data-action="details" data-id="${b.id}" aria-label="View ${esc(b.title)}">${imageMarkup(b)}</button><div class="book-info"><span class="book-category">${esc(b.category)}</span><button class="book-title" data-action="details" data-id="${b.id}">${esc(b.title)}</button><p class="book-author">${esc(b.author)}</p><p class="book-meta">${esc(b.edition)} · ${b.condition === 'New' ? 'Paperback' : esc(b.condition)}</p><div class="book-bottom"><div class="price">${money(b.price)}<div class="stock-label ${available ? '' : 'out'}">${available ? (available < 4 ? `Only ${available} left` : 'In stock') : 'Out of stock'}</div></div><button class="add-button" data-action="${available ? 'add' : 'request'}" data-id="${b.id}">${icon(available ? 'plus' : 'book')}${available ? 'Add to cart' : 'Request'}</button></div><button class="ebook-button" data-feature="ebook" data-id="${b.id}">${icon('download')} Get E-Book</button></div></article>`;
  }
  function courseFinder() {
    const dept=departments.find(d=>d.id===filters.department);
    const semester=dept?.semesters.find(s=>String(s.number)===filters.semester);
    return `<section class="course-finder" aria-labelledby="finder-heading"><div class="finder-title">${icon('book')}<div><h2 id="finder-heading">Your course. Your books.</h2><p>18 departments. A reading list for every semester.</p></div></div><form id="course-form" class="finder-form"><div><label for="department">01 · Department</label><select id="department" required><option value="">Choose department</option>${['FBS','FASS','FSSS','FST'].map(f=>`<optgroup label="${f}">${departments.filter(d=>d.faculty===f).map(d=>`<option value="${d.id}" ${d.id===filters.department?'selected':''}>${esc(d.name)}</option>`).join('')}</optgroup>`).join('')}</select></div><div><label for="semester">02 · Semester</label><select id="semester" required ${dept?'':'disabled'}><option value="">Choose semester</option>${(dept?.semesters||[]).map(s=>`<option value="${s.number}" ${String(s.number)===filters.semester?'selected':''}>Semester ${s.number}</option>`).join('')}</select></div><div><label for="course">03 · Course</label><select id="course" required ${semester?'':'disabled'}><option value="">Choose course</option>${(semester?.courses||[]).map(c=>`<option value="${c.id}" ${c.id===filters.course?'selected':''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></div><button class="btn" type="submit">Find books ${icon('arrow')}</button></form></section>`;
  }
  const heading = (title, text) => `<div class="breadcrumb"><a href="#home">Home</a> &nbsp;/&nbsp; ${esc(title)}</div><div class="page-heading"><h1>${esc(title)}</h1><p>${esc(text)}</p></div>`;
  function empty(title, text, href = '#catalog', label = 'Explore books', symbol = 'book') { return `<div class="empty-state">${icon(symbol)}<h2>${esc(title)}</h2><p>${esc(text)}</p><a href="${href}" class="btn">${label} ${icon('arrow')}</a></div>`; }
  function catalogHTML() {
    return `<section class="catalog-section" id="catalog-section" aria-labelledby="catalog-heading"><div class="section-heading"><div><h2 id="catalog-heading">${currentView === 'home' ? 'A good place to start' : currentView === 'used' ? 'Good books. A second chapter.' : currentView === 'courses' ? 'Your reading list' : 'Explore the shelves'}</h2><p>${currentView === 'home' ? 'Academic essentials for your next chapter.' : 'Find the right book for the way you learn.'}</p></div>${currentView === 'home' ? '<a class="text-link" href="#catalog">View all books ↗</a>' : ''}</div><div class="catalog-toolbar"><div class="category-tabs" role="group" aria-label="Book categories">${['All books',...new Set(books.map(b=>b.category))].map(c => `<button class="chip ${filters.category === c ? 'active' : ''}" data-category="${c}" aria-pressed="${filters.category === c}">${c}</button>`).join('')}</div><div class="catalog-sort"><label class="stock-check"><input type="checkbox" id="in-stock" ${filters.stock ? 'checked' : ''}> In stock</label><div><label for="sort" class="sr-only">Sort books</label><select id="sort"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="title">Title: A–Z</option></select></div></div></div><div id="filter-note"></div><div id="book-grid" class="book-grid"></div><p class="catalog-count" id="catalog-count" aria-live="polite"></p></section>`;
  }
  function filteredBooks() {
    const query = filters.query.trim().toLowerCase();
    let result = books.filter(b => {
      const department = departments.find(d => d.id === filters.department);
      return !b.archived && (!query || `${b.title} ${b.author} ${b.isbn} ${b.category} ${b.publisher}`.toLowerCase().includes(query)) &&
        (filters.category === 'All books' || b.category === filters.category) && (!filters.stock || stockOf(b) > 0) &&
        (!department || b.courses.some(c => department.courses.some(dc => dc.id === c))) &&
        (!filters.course || b.courses.includes(filters.course)) && (currentView !== 'used' || b.condition.startsWith('Used'));
    });
    if (filters.sort === 'price-low') result.sort((a,b) => a.price-b.price);
    if (filters.sort === 'price-high') result.sort((a,b) => b.price-a.price);
    if (filters.sort === 'title') result.sort((a,b) => a.title.localeCompare(b.title));
    return result;
  }
  function renderBooks() {
    if (!$('#book-grid')) return;
    document.querySelector('.load-more')?.remove();
    const result = filteredBooks();
    $('#book-grid').innerHTML = result.length ? result.slice(0,currentView==='home'?8:shownLimit).map(card).join('') : empty('No books found', 'Try another search or clear your filters to browse the full collection.', '#catalog', 'Clear filters');
    if (!result.length) $('#book-grid .btn').dataset.action = 'reset-filters';
    $('#catalog-count').textContent = `Showing ${Math.min(result.length,currentView==='home'?8:shownLimit)} of ${result.length} ${result.length === 1 ? 'book' : 'books'} · Sample prices in Bangladeshi Taka (BDT)`;
    if(currentView!=='home' && result.length>shownLimit) $('#book-grid').insertAdjacentHTML('afterend','<button class="btn btn-secondary load-more" data-action="load-more">Show more books</button>');
    const dept = departments.find(d => d.id === filters.department), course = dept?.courses.find(c => c.id === filters.course);
    const descriptions = [filters.query && `Search: “${filters.query}”`, dept && `${dept.short}${course ? ' / '+course.name : ' / All courses'}`].filter(Boolean);
    $('#filter-note').innerHTML = descriptions.length ? `<div class="filter-note"><span>${esc(descriptions.join(' · '))}${dept ? '<br><small>Suggested reading. Confirm the title and edition with your instructor.</small>' : ''}</span><button data-action="reset-filters">Clear filters</button></div>` : currentView === 'courses' ? '<div class="filter-note">Choose a department, semester, and course above. Book suggestions are not an official required reading list.</div>' : '';
    if(dept) $('#filter-note').insertAdjacentHTML('beforeend',`<div class="curriculum-note"><strong>${dept.verification==='provided-pdf'?'Course list from your ICT / ICE PDF':dept.verification==='provisional'?'Provisional semester mapping':'Course list from BUP’s published program page'}</strong><p>${esc(course?.note||dept.note||'Published lists may include alternative curriculum versions. Confirm the course and semester for your batch.')}</p><p>Books are suggested reading, not an official required list. Confirm the edition with your instructor.</p>${dept.sourceUrl?.startsWith('https://')?`<a href="${esc(dept.sourceUrl)}" target="_blank" rel="noopener">View curriculum source ↗</a>`:''}</div>`);
    $('#sort').value = filters.sort;
    document.querySelectorAll('[data-category]').forEach(el => { const active = el.dataset.category === filters.category; el.classList.toggle('active', active); el.setAttribute('aria-pressed', active); });
  }
  function render() {
    const route = location.hash.slice(1).split('?')[0] || 'home';
    if(route==='catalog' && filters.department){filters.department='';filters.semester='';filters.course='';shownLimit=24;}
    currentView = ['home','catalog','courses','used','wishlist','orders','help','about','login','register','account','admin','sell'].includes(route) ? route : 'home';
    if (modal.open) closeModal();
    document.querySelectorAll('.nav-links a').forEach(a => { const active = a.hash === '#'+currentView; a.classList.toggle('active',active); if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    const titles = { home: 'Your next chapter starts here', catalog:'All books', courses:'Find by course', used:'Pre-loved books', wishlist:'Saved books', orders:'My orders', help:'Help & support', about:'About this project', login:'Sign in', register:'Create an account', account:'My account', admin:'Bookstore administration', sell:'Sell your books' };
    document.title = `${titles[currentView]} | BUP Bookstore`;
    if (['home','catalog','courses','used'].includes(currentView)) {
      const home = currentView === 'home';
      main.innerHTML = `<div class="container ${home ? '' : 'page-content'}">${home ? `<section class="hero"><div class="hero-copy"><span class="eyebrow">For the minds that move us forward</span><h1>Your next chapter<br>starts <em>here.</em></h1><p>Course essentials, fresh perspectives, and books worth keeping. All in one place for the BUP community.</p><div class="hero-actions"><a href="#catalog" class="btn">Explore the books ${icon('arrow')}</a><a href="#courses" class="text-link">Find by course</a></div></div><div class="hero-photo"><img src="assets/images/hero-library.png" alt="Academic books and a green reading lamp on a sunlit library desk" fetchpriority="high"><span class="photo-caption">A little curiosity. A world of possibility.</span></div></section>` : heading(titles[currentView],currentView === 'courses' ? 'Less searching. More learning. Choose your department, semester, and course.' : currentView === 'used' ? 'Make room on your shelf, and more room in your budget.' : 'Textbooks, trusted references, and new ways of thinking.')}${home || currentView === 'courses' ? courseFinder() : ''}${home ? `<section class="benefits" aria-label="Bookstore services"><div class="benefit">${icon('pin')}<div><strong>Campus pickup</strong><small>Collect from your bookstore</small></div></div><div class="benefit">${icon('book')}<div><strong>Course-based discovery</strong><small>Find books that fit your studies</small></div></div><div class="benefit">${icon('leaf')}<div><strong>Give books another chapter</strong><small>Explore pre-loved academic books</small></div></div></section>` : ''}${catalogHTML()}${home ? `<section class="community-banner">${icon('book')}<div><span class="eyebrow">Your reading list doesn’t end here</span><h2>Can’t find the book you need?</h2><p>Tell us the title, author, or course. Create a book request and keep track of it alongside your orders.</p></div><button class="btn btn-secondary" data-action="request">Request a book ${icon('arrow')}</button></section>` : ''}</div>`;
      renderBooks();
    } else if (currentView === 'wishlist') {
      main.innerHTML = `<div class="container page-content">${heading('Your saved shelf','Keep the books you’re curious about close at hand.')}<div class="book-grid">${state.wishlist.length ? state.wishlist.map(id => card(bookById(id))).join('') : empty('Your next read is waiting','Tap the heart on a book to save it here for later.','#catalog','Discover books','heart')}</div></div>`;
    } else if (currentView === 'orders') renderOrders();
    else if (currentView === 'sell') commerce?.renderResales();
    else if (currentView === 'help') renderHelp();
    else if (['login','register','account','admin'].includes(currentView)) features?.renderView(currentView);
    else renderAbout();
    features?.updateHeader();
    updateCounts();
  }
  function resetFilters() { shownLimit=24; filters = { query:'', department:'', semester:'', course:'', category:'All books', sort:'featured', stock:false }; $('#search').value = ''; }
  function addToCart(id) {
    const b = bookById(id); if (!b) return;
    if ((state.cart[id] || 0) >= stockOf(b)) { toast('You’ve reached the available quantity for this book.'); return; }
    state.cart[id] = (state.cart[id] || 0) + 1; save(); toast(`${b.title} added to your cart.`);
  }
  function toggleSaved(id) {
    if (!bookById(id)) return;
    const adding = !state.wishlist.includes(id);
    state.wishlist = adding ? [...state.wishlist,id] : state.wishlist.filter(x => x !== id); save();
    document.querySelectorAll(`[data-action="save-book"][data-id="${id}"]`).forEach(b => { b.classList.toggle('saved',adding); b.setAttribute('aria-pressed',adding); b.setAttribute('aria-label',`${adding ? 'Unsave' : 'Save'} ${bookById(id).title}`); });
    if (currentView === 'wishlist') {
      const focusIndex = [...main.querySelectorAll('[data-action="save-book"]')].findIndex(el => el.dataset.id === id);
      if (!modal.open) { render(); const targets = main.querySelectorAll('[data-action="save-book"]'); (targets[Math.min(Math.max(focusIndex,0),targets.length-1)] || main.querySelector('.btn'))?.focus(); }
    }
    toast(adding ? 'Added to your saved shelf.' : 'Removed from your saved shelf.');
  }
  function openModal(title, body, drawer = false) {
    const alreadyOpen = modal.open;
    if (!alreadyOpen) lastFocus = document.activeElement;
    modal.classList.toggle('drawer',drawer);
    $('#modal-content').innerHTML = `<div class="modal-header"><h2 id="modal-title" tabindex="-1">${esc(title)}</h2><button class="close-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
    if (!alreadyOpen) modal.showModal();
    modal.scrollTop = 0; $('#modal-title').focus();
  }
  function closeModal() { modal.close(); if (lastFocus?.isConnected) lastFocus.focus(); else main.focus(); }
  function showDetails(id) {
    const b = bookById(id); if (!b) return;
    const available = stockOf(b);
    const courses = departments.flatMap(d => d.courses).filter(c => b.courses.includes(c.id));
    openModal('A closer look', `<div class="detail-layout"><div class="detail-cover">${imageMarkup(b)}</div><div class="detail-copy"><span class="book-category">${esc(b.category)}</span><h3>${esc(b.title)}</h3><p class="author">${esc(b.author)}</p><div class="price">${money(b.price)}</div><div class="stock-label ${available ? '' : 'out'}">${available ? `${available} available` : 'Currently out of stock'} · Sample inventory</div><p class="detail-description">${esc(b.description)}</p><dl class="book-facts"><dt>Edition</dt><dd>${esc(b.edition)}</dd><dt>Publisher</dt><dd>${esc(b.publisher)}</dd><dt>ISBN</dt><dd>${esc(b.isbn)}</dd><dt>Condition</dt><dd>${esc(b.condition)}</dd><dt>Language</dt><dd>${esc(b.language)}</dd></dl><div class="detail-buttons"><button class="btn" data-action="${available ? 'add' : 'request'}" data-id="${b.id}">${icon('bag')}${available ? 'Add to cart' : 'Request this book'}</button><button class="btn btn-secondary ${state.wishlist.includes(id) ? 'saved' : ''}" data-action="save-book" data-id="${b.id}" aria-label="Save ${esc(b.title)}" aria-pressed="${state.wishlist.includes(id)}">${icon('heart')}</button></div><button class="ebook-button" data-feature="ebook" data-id="${b.id}">${icon('download')} Get E-Book</button></div></div><div class="course-tags"><strong>Suggested for these courses</strong>${courses.map(c => `<span>${esc(c.name)}</span>`).join('')}<p class="hint">Confirm the required edition with your course instructor before buying.</p></div>`);
  }
  function totals(delivery = 'pickup') {
    const subtotal = Object.entries(state.cart).reduce((sum,[id,q]) => sum + bookById(id).price*q,0);
    const discount = state.coupon === settings.coupon ? Math.round(subtotal * settings.discountRate) : 0;
    const fee = delivery === 'delivery' ? settings.deliveryFee : 0;
    return { subtotal, discount, fee, total:subtotal-discount+fee };
  }
  function totalsMarkup(delivery = 'pickup') {
    const t = totals(delivery);
    return `<div class="total-line"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>${t.discount ? `<div class="total-line"><span>${settings.coupon} · 10% off</span><span>−${money(t.discount)}</span></div>` : ''}<div class="total-line"><span>${delivery === 'delivery' ? 'Campus delivery' : 'Campus pickup'}</span><span>${t.fee ? money(t.fee) : 'Free'}</span></div><div class="total-line total-final"><span>Total</span><span>${money(t.total)}</span></div>`;
  }
  function showCart() {
    const items = Object.entries(state.cart);
    if (!items.length) { openModal('Your book bag', empty('A little room for inspiration','Add a book to your cart and it will appear here.','#catalog','Explore books','bag'),true); return; }
    openModal(`Your book bag (${items.reduce((s,[,q])=>s+q,0)})`, `${items.map(([id,q]) => { const b=bookById(id); return `<div class="cart-row">${imageMarkup(b)}<div><h3>${esc(b.title)}</h3><p>${esc(b.edition)}</p><div class="quantity"><button data-action="quantity" data-id="${id}" data-delta="-1" aria-label="Decrease quantity of ${esc(b.title)}">−</button><span aria-label="Quantity">${q}</span><button data-action="quantity" data-id="${id}" data-delta="1" aria-label="Increase quantity of ${esc(b.title)}" ${q >= stockOf(b) ? 'disabled' : ''}>+</button></div></div><div><span class="price">${money(b.price*q)}</span><button class="remove-button" data-action="remove" data-id="${id}">Remove</button></div></div>`; }).join('')}<form class="coupon-form" id="coupon-form"><label class="sr-only" for="coupon">Promo code</label><input id="coupon" placeholder="Promo code" value="${esc(state.coupon)}" maxlength="30"><button class="btn btn-secondary">Apply</button></form><p class="hint" id="coupon-message">${state.coupon ? '10% demo discount applied. Clear the code to remove it.' : `Try ${settings.coupon} for a 10% demo discount.`}</p><div class="totals">${totalsMarkup()}</div><button class="btn btn-full" data-action="checkout">Continue to checkout ${icon('arrow')}</button><p class="checkout-note">Demo checkout. No real payment will be collected.</p>`,true);
  }
  function showCheckout() {
    if(!features?.currentUser()){closeModal();location.hash='login';toast('Sign in with your student ID before checkout. Your cart is saved.');return;}
    if (!Object.keys(state.cart).length) return showCart();
    openModal('Checkout', `<div class="notice">This is a demonstration. Use sample contact details. Nothing is sent to BUP, and no money is collected.</div><form id="checkout-form"><div class="form-error" id="checkout-error" role="alert"></div><div class="form-grid"><div><label for="customer-name">Full name</label><input id="customer-name" name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Your name"></div><div><label for="student-id">Student ID</label><input id="student-id" name="studentId" required pattern="[A-Za-z0-9-]{5,25}" maxlength="25" title="Use 5–25 letters, numbers, or hyphens" placeholder="e.g. 24549010001"></div><div><label for="customer-email">Email address</label><input id="customer-email" name="email" type="email" autocomplete="email" required maxlength="120" placeholder="student@example.com"></div><div><label for="customer-phone">Mobile number</label><input id="customer-phone" name="phone" type="tel" autocomplete="tel" required pattern="(\\+?88)?01[3-9][0-9]{8}" title="Enter a Bangladesh mobile number, e.g. 01712345678" placeholder="01712345678"></div></div><fieldset><legend>How would you like to receive your books?</legend><div class="delivery-options"><label class="delivery-option"><input name="delivery" type="radio" value="pickup" checked><span><strong>Campus pickup · Free</strong><small>BUP physical bookstore</small></span></label><label class="delivery-option"><input name="delivery" type="radio" value="delivery"><span><strong>Campus delivery · ${money(settings.deliveryFee)}</strong><small>Within the campus · Demo</small></span></label></div></fieldset><div id="address-field" hidden><label for="delivery-address">Campus building / department / room</label><textarea id="delivery-address" name="address" maxlength="300" placeholder="Building, floor, room and a nearby landmark"></textarea></div><div class="notice">Next: choose cards, mobile banking, net banking, or pay on collection. All payments are simulated.</div><div class="totals" id="checkout-totals">${totalsMarkup()}</div><label class="stock-check"><input type="checkbox" name="consent" required> I understand this creates a local demo order only.</label><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="cart">Back to cart</button><button class="btn" type="submit">Continue to payment ${icon('arrow')}</button></div></form>`);
  }
  function placeOrder(form) {
    const f = new FormData(form), error = $('#checkout-error');
    const name = String(f.get('name')).trim(), address = String(f.get('address') || '').trim();
    if (name.length < 2 || (f.get('delivery') === 'delivery' && address.length < 5)) { error.textContent = 'Please enter your full name and a complete campus delivery location.'; return; }
    const entries = Object.entries(state.cart);
    if (!entries.length || entries.some(([id,q]) => q > stockOf(bookById(id)))) { error.textContent = 'A cart quantity exceeds available stock. Return to your cart to update it.'; return; }
    const delivery = f.get('delivery'), t = totals(delivery);
    const order = { ownerId:ownerId(), id:makeId('BUP'), createdAt:new Date().toISOString(), name, studentId:String(f.get('studentId')), email:String(f.get('email')), phone:String(f.get('phone')), delivery, address:delivery === 'delivery' ? address : 'BUP physical bookstore', items:entries.map(([id,q]) => ({id,quantity:q,price:bookById(id).price,title:bookById(id).title})), ...t, coupon:state.coupon, status:'Demo order recorded', payment:'Unpaid · Simulated pay on receipt' };
    commerce.openPayment(order, () => {
      if(state.orders.some(o=>o.id===order.id))return false;
      if(ownerId()!==order.ownerId || order.items.some(i=>!bookById(i.id)||bookById(i.id).archived||i.quantity>stockOf(bookById(i.id))||state.cart[i.id]!==i.quantity||bookById(i.id).price!==i.price) || Object.keys(state.cart).length!==order.items.length || totals(order.delivery).total!==order.total) { toast('Your cart or account changed. Please restart checkout.');return false; }
      state.orders.unshift(order);state.cart={};state.coupon='';save();renderBooks();return true;
    });
  }

  function makeId(prefix) { const suffix = globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0,8).toUpperCase() : Math.random().toString(36).slice(2,10).toUpperCase(); return `${prefix}-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${suffix}`; }
  function date(value) { return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  function renderOrders() {
    const orders = visibleRecords('orders'), requests = visibleRecords('requests');
    main.innerHTML = `<div class="container page-content">${heading('My orders & requests','Your books, your requests, and what happens next.')}<div class="notice">Records are saved only in this browser. Demo status updates come from the local admin panel, not a live delivery service.</div>${orders.length ? orders.map(o => `<article class="order-card"><div class="order-header"><div><h2>${esc(o.id)}</h2><p>${date(o.createdAt)} · ${o.items.reduce((s,i)=>s+i.quantity,0)} books</p></div><span class="status-pill">${esc(o.status || 'Demo order recorded')}</span></div><div class="order-body"><div><strong>${esc(o.items.map(i=>`${i.title} × ${i.quantity}`).join(', '))}</strong><p>${o.delivery === 'pickup' ? 'Campus pickup' : 'Campus delivery'} · ${money(o.total)} · ${esc(o.payment)}</p></div><div class="order-actions"><button class="btn btn-secondary" data-action="order-details" data-id="${esc(o.id)}">View order</button><button class="btn btn-secondary" data-action="invoice" data-id="${esc(o.id)}" aria-label="Download invoice for ${esc(o.id)}">${icon('download')}</button></div></div><div class="order-progress"><span class="current">01 · Recorded locally</span><span class="${['Processing','Ready for pickup','Out for delivery','Completed'].includes(o.status) ? 'current' : ''}">02 · Processing</span><span class="${['Ready for pickup','Out for delivery','Completed'].includes(o.status) ? 'current' : ''}">03 · ${o.delivery === 'pickup' ? 'Ready for pickup' : 'Delivery'}</span></div><p class="order-footnote">Local simulation only · ${esc(o.status || 'Demo order recorded')}</p></article>`).join('') : empty('No orders just yet','Your order summary will appear here after you complete a demo checkout.','#catalog','Find your next book','bag')}<div class="section-heading" style="margin-top:35px"><div><h2>Book requests</h2><p>Keep track of the titles you’d like us to stock.</p></div><button class="btn btn-secondary" data-action="request">New request</button></div>${requests.length ? requests.map(r => `<article class="order-card"><div class="order-header"><div><h3>${esc(r.title)}</h3><p>${esc(r.author || 'Author not specified')} · ${esc(r.id)}</p></div><span class="status-pill">${esc(r.status || 'Saved locally')}</span></div><p class="order-footnote">${date(r.createdAt)} · ${r.format === 'ebook' ? 'E-Book request' : 'Print book request'} · Local demo</p></article>`).join('') : '<p class="hint">No book requests yet. Looking for a missing title? Create a request above.</p>'}</div>`;
  }
  function showOrder(id) {
    const o = state.orders.find(x=>x.id===id && (features?.currentUser()?.role === 'admin' || (x.ownerId || null) === ownerId())); if(!o) return;
    openModal('Order details', `<div class="notice">Demo order only. Not sent to the bookstore. No payment collected.</div><h3>${esc(o.id)}</h3><p class="hint">${date(o.createdAt)} · ${esc(o.name)}</p><dl class="book-facts"><dt>Student ID</dt><dd>${esc(o.studentId)}</dd><dt>Email</dt><dd>${esc(o.email)}</dd><dt>Phone</dt><dd>${esc(o.phone)}</dd><dt>Fulfilment</dt><dd>${o.delivery === 'pickup' ? 'Campus pickup' : 'Campus delivery'}</dd><dt>Location</dt><dd>${esc(o.address)}</dd></dl>${o.items.map(i=>`<div class="total-line"><span>${esc(i.title)} × ${i.quantity}</span><strong>${money(i.price*i.quantity)}</strong></div>`).join('')}<div class="totals"><div class="total-line"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="total-line"><span>Discount</span><span>−${money(o.discount)}</span></div><div class="total-line"><span>Delivery</span><span>${money(o.fee)}</span></div><div class="total-line total-final"><span>Total · ${esc(o.payment)}</span><span>${money(o.total)}</span></div></div><button class="btn" data-action="invoice" data-id="${esc(o.id)}">${icon('download')} Download invoice</button>`);
  }
  function downloadInvoice(id) {
    const o=state.orders.find(x=>x.id===id && (features?.currentUser()?.role === 'admin' || (x.ownerId || null) === ownerId())); if(!o)return;
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo invoice ${esc(o.id)}</title><style>body{font:16px/1.6 Arial,sans-serif;max-width:850px;margin:50px auto;padding:24px;color:#143e32}h1{font-family:Georgia,serif}table{border-collapse:collapse;width:100%;margin:30px 0}th,td{padding:12px;text-align:left;border-bottom:1px solid #ccc}.notice{background:#fff3d3;padding:15px}.totals{text-align:right}small{color:#59665c}@media print{body{margin:0}}</style><h1>BUP Bookstore</h1><p class="notice">DEMO INVOICE · NOT A RECEIPT · No real order or payment</p><h2>${esc(o.id)}</h2><p>${date(o.createdAt)}</p><p>${esc(o.name)}<br>Student ID: ${esc(o.studentId)}<br>${esc(o.email)}<br>${esc(o.phone)}</p><p>${o.delivery==='pickup'?'Campus pickup':'Campus delivery'}: ${esc(o.address)}</p><table><thead><tr><th>Book</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>${esc(i.title)}</td><td>${i.quantity}</td><td>${money(i.price)}</td><td>${money(i.quantity*i.price)}</td></tr>`).join('')}</tbody></table><div class="totals"><p>Subtotal: ${money(o.subtotal)}<br>Discount: −${money(o.discount)}<br>Delivery: ${money(o.fee)}</p><h2>Total: ${money(o.total)}</h2><p>Payment status: ${esc(o.payment)}</p></div><small>This local prototype is not an official university service. To save as PDF, use your browser’s Print → Save as PDF.</small></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})); const a=document.createElement('a'); a.href=url;a.download=`${o.id}-demo-invoice.html`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Invoice downloaded. Open it and print to save as PDF.');
  }
  function showRequest(id) {
    const b=bookById(id);
    openModal('Request a book', `<p class="modal-description">Missing a title from your reading list? Add the details below.</p><div class="notice">This request is saved locally for your project demonstration. It is not sent to the bookstore.</div><form id="request-form"><div class="form-grid"><div class="span-2"><label for="request-title">Book title</label><input id="request-title" name="title" required minlength="2" maxlength="160" value="${esc(b?.title || '')}" placeholder="Name of the book"></div><div><label for="request-author">Author (optional)</label><input id="request-author" name="author" maxlength="160" value="${esc(b?.author || '')}"></div><div><label for="request-isbn">ISBN (optional)</label><input id="request-isbn" name="isbn" pattern="[0-9Xx -]{10,20}" maxlength="20" title="Enter an ISBN using digits, X, spaces or hyphens" value="${esc(b?.isbn || '')}"></div><div class="span-2"><label for="request-course">Course / edition / additional details (optional)</label><textarea id="request-course" name="notes" maxlength="500" placeholder="Tell us which course you need it for or the edition you’re looking for."></textarea></div></div><div class="form-error" id="request-error" role="alert"></div><div class="form-actions"><button class="btn">Save demo request ${icon('arrow')}</button></div></form>`);
  }
  function showSupport() {
    openModal('Contact support', `<p class="modal-description">Describe your question about books, orders, or campus collection.</p><div class="notice">Demo support form. Your message stays in this browser; no staff member receives it.</div><form id="support-form"><div class="form-grid"><div class="span-2"><label for="support-subject">Subject</label><input id="support-subject" name="subject" minlength="3" maxlength="120" required></div><div class="span-2"><label for="support-message">Your message</label><textarea id="support-message" name="message" minlength="10" maxlength="1500" required></textarea></div></div><div class="form-error" id="support-error" role="alert"></div><div class="form-actions"><button class="btn">Save demo ticket ${icon('arrow')}</button></div></form>`);
  }
  function renderHelp() {
    main.innerHTML=`<div class="container page-content">${heading('A little help, when you need it','Everything you need to know about this bookstore demonstration.')}<div class="help-grid"><div class="help-card"><h2>Frequently asked questions</h2><details open><summary>How do I find books for my course?</summary><p>Open “Find by course”, choose a department, semester, and then a course. Select “Find books” to see suggested titles. The sample mappings are illustrative; confirm your reading list and edition with your instructor.</p></details><details><summary>Can I place a real order?</summary><p>This student project demonstrates the buying process. Orders stay in your browser and do not reach the physical bookstore. Visit the existing BUP bookstore for actual purchases.</p></details><details><summary>How do pickup and delivery work?</summary><p>The demo includes free campus pickup and a sample ${money(settings.deliveryFee)} campus delivery option. Actual service areas, fees, collection hours, and policies must be supplied by BUP before launch.</p></details><details><summary>How do I pay?</summary><p>Choose cards, mobile banking, net banking, or pay on receipt. The payment screen uses test data only; no money is collected.</p></details><details><summary>What if the book I need isn’t listed?</summary><p>Use “Request a book” to save the title and course information. Requests appear under My orders & requests. They remain local until a bookstore backend is connected.</p></details><details><summary>Where is my information stored?</summary><p>Cart, saved books, demo orders, requests, and tickets are stored in this browser. Use test information. Clearing browser site data deletes these records. Other devices and browsers cannot see them.</p></details></div><div><div class="help-card">${icon('headphones')}<h2 style="margin-top:14px">Let’s sort it out.</h2><p>Have a question that isn’t answered here? Create a local support ticket for your demonstration.</p><button class="btn" data-action="support">Contact support ${icon('arrow')}</button></div><div class="help-card"><h2>Your support tickets</h2>${visibleRecords('tickets').length?visibleRecords('tickets').map(t=>`<div class="order-card"><h3>${esc(t.subject)}</h3><p>${esc(t.message)}</p><span class="hint">${esc(t.id)} · ${esc(t.status || 'Saved locally')} · ${date(t.createdAt)}</span></div>`).join(''):'<p>You haven’t created a support ticket yet.</p>'}</div></div></div></div>`;
  }
  function renderAbout() {
    main.innerHTML=`<div class="container page-content">${heading('A bookstore built around BUP','A proposed digital extension of the campus’s physical bookstore.')}<div class="prose"><p>This interface brings book discovery, course-based recommendations, shopping, and book requests into one place for the Bangladesh University of Professionals community.</p><h2>What you can explore</h2><ul><li>Search books by title, author, category, publisher, or ISBN.</li><li>Discover sample reading lists by department and course.</li><li>Save favorites, manage a cart, apply a demo discount, and complete a simulated checkout.</li><li>View local orders, download a demo invoice, request missing books, and create support tickets.</li></ul><h2>About the demonstration</h2><p>This is a student project, not an official university website. Prices, stock, formats and used-book conditions are sample content. Course names follow the supplied ICT PDF and published BUP program pages; version and provisional mapping notes appear with the reading lists. Book titles are provided as catalog examples, not endorsed reading recommendations. The supplied BUP crest identifies the project context. The library photograph is AI-generated and does not depict an actual BUP location.</p><h2>Before an official launch</h2><p>A university-operated service requires an approved catalog and curriculum mappings, verified bookstore policies, secure accounts, a shared database, server-side inventory and order handling, and approved payment integration. The frontend includes local demo accounts, a staff panel, and eBook links. Real authentication, protected downloads, multi-user permissions, and transactions require a server.</p><p>The admin panel can manage this browser’s sample catalog, orders, requests, and support records. E-Book buttons can open authorized files configured by the administrator; no copyrighted textbooks are bundled. The buyback desk demonstrates inspection, offers, acceptance and payout recording. Real payments, protected purchase entitlements and notifications require a connected server.</p><a class="btn" href="#catalog">Explore the prototype ${icon('arrow')}</a></div></div>`;
  }
  // Event delegation keeps dynamically rendered pages and dialogs interactive.
  document.addEventListener('click', e => {
    const category=e.target.closest('[data-category]');
    if(category){ filters.category=category.dataset.category;renderBooks();return; }
    const el=e.target.closest('[data-action]');
    if(!el) {
      const anchor=e.target.closest('a[href^="#"]');
      if(anchor && modal.open) closeModal();
      if(anchor && ['#catalog','#home','#used'].includes(anchor.hash)) { resetFilters();if(location.hash===anchor.hash)render(); }
      return;
    }
    const {action,id}=el.dataset;
    if(action==='close')closeModal();
    else if(action==='load-more'){shownLimit+=24;renderBooks();}
    else if(action==='details')showDetails(id);
    else if(action==='add')addToCart(id);
    else if(action==='save-book')toggleSaved(id);
    else if(action==='cart')showCart();
    else if(action==='checkout')showCheckout();
    else if(action==='request')showRequest(id);
    else if(action==='support')showSupport();
    else if(action==='invoice')downloadInvoice(id);
    else if(action==='order-details')showOrder(id);
    else if(action==='view-orders'){closeModal();if(location.hash==='#orders')render();else location.hash='orders';}
    else if(action==='reset-filters'){e.preventDefault();resetFilters();render();}
    else if(action==='remove'){delete state.cart[id];save();showCart();}
    else if(action==='quantity'){
      const next=(state.cart[id]||0)+Number(el.dataset.delta);
      if(next<=0)delete state.cart[id];else if(next<=stockOf(bookById(id)))state.cart[id]=next;
      save();showCart();
      const nextButton=modal.querySelector(`[data-action="quantity"][data-id="${id}"][data-delta="${el.dataset.delta}"]`);if(nextButton&&!nextButton.disabled)nextButton.focus();
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='department'){
      const d=departments.find(d=>d.id===e.target.value);
      $('#semester').innerHTML='<option value="">Choose semester</option>'+(d?.semesters||[]).map(s=>`<option value="${s.number}">Semester ${s.number}</option>`).join('');$('#semester').disabled=!d;
      $('#course').innerHTML='<option value="">Choose course</option>';$('#course').disabled=true;
    }
    if(e.target.id==='semester'){
      const d=departments.find(d=>d.id===$('#department').value),s=d?.semesters.find(s=>String(s.number)===e.target.value);
      $('#course').innerHTML='<option value="">Choose course</option>'+(s?.courses||[]).map(c=>`<option value="${c.id}">${esc(c.code)} · ${esc(c.name)}</option>`).join('');$('#course').disabled=!s;
    }
    if(e.target.id==='sort'){filters.sort=e.target.value;renderBooks();}
    if(e.target.id==='in-stock'){filters.stock=e.target.checked;renderBooks();}
    if(e.target.name==='delivery'){
      const delivery=e.target.value==='delivery';$('#address-field').hidden=!delivery;$('#delivery-address').required=delivery;$('#checkout-totals').innerHTML=totalsMarkup(e.target.value);
    }
  });
  // Search is handled separately because resetting catalog filters must preserve the typed query.
  $('#search-form').addEventListener('submit',e=>{
    e.preventDefault();e.stopImmediatePropagation();const query=$('#search').value.trim();resetFilters();filters.query=query;$('#search').value=query;
    if(location.hash==='#catalog')render();else location.hash='catalog';
  });
  document.addEventListener('submit',e=>{
    const form=e.target;e.preventDefault();
    if(form.id==='course-form'){
      const d=$('#department').value,s=$('#semester').value,c=$('#course').value;resetFilters();filters.department=d;filters.semester=s;filters.course=c;
      if(location.hash==='#courses')render();else location.hash='courses';
      setTimeout(()=>$('#catalog-section')?.scrollIntoView({block:'start'}),40);
    } else if(form.id==='coupon-form'){
      const code=$('#coupon').value.trim().toUpperCase();
      if(code && code!==settings.coupon){$('#coupon-message').textContent=`Code not recognized. Try ${settings.coupon}.`;return;}
      state.coupon=code;save();showCart();toast(code?'10% demo discount applied.':'Promo code removed.');
    } else if(form.id==='checkout-form')placeOrder(form);
    else if(form.id==='request-form'){
      const f=new FormData(form), title=String(f.get('title')).trim();
      if(title.length<2){$('#request-error').textContent='Please enter a book title with at least two characters.';return;}
      const r={ownerId:ownerId(),id:makeId('REQ'),createdAt:new Date().toISOString(),title,author:String(f.get('author')).trim(),isbn:String(f.get('isbn')).trim(),notes:String(f.get('notes')).trim()};state.requests.unshift(r);save();
      openModal('Request saved',`<div class="success-state">${icon('check')}<h3>It’s on your request list.</h3><p>“${esc(title)}” has been saved locally. It has not been sent to bookstore staff.</p><p class="order-id">${r.id}</p><button class="btn" data-action="view-orders">View my requests ${icon('arrow')}</button></div>`);
    } else if(form.id==='support-form'){
      const f=new FormData(form),subject=String(f.get('subject')).trim(),message=String(f.get('message')).trim();
      if(subject.length<3||message.length<10){$('#support-error').textContent='Please add a subject and a message of at least 10 characters.';return;}
      const ticket={ownerId:ownerId(),id:makeId('HELP'),createdAt:new Date().toISOString(),subject,message};state.tickets.unshift(ticket);save();
      openModal('Ticket saved',`<div class="success-state">${icon('check')}<h3>Your message is saved.</h3><p>This demo ticket is stored in your browser. No message has been sent to support staff.</p><p class="order-id">${ticket.id}</p><a class="btn" href="#help">View support tickets ${icon('arrow')}</a></div>`);
      if(currentView==='help')renderHelp();
    }
  });
  modal.addEventListener('cancel',e=>{e.preventDefault();closeModal();});
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  $('#cart-open').addEventListener('click',showCart);
  window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);main.focus({preventScroll:true});});
  features = window.installBUPFeatures({ $, esc, money, icon, main, modal, state, books, departments, bookById, stockOf, save, toast, render, renderBooks, heading, empty, openModal, closeModal, makeId, date, showOrder, downloadInvoice });
  commerce=window.installCommerce({$,esc,money,icon,main,modal,state,books,bookById,save,toast,render,heading,empty,openModal,closeModal,makeId,date,currentUser:()=>features.currentUser()});
  window.BUPCommerce=commerce;
  $('#year').textContent=new Date().getFullYear();icons();updateCounts();render();
  // Optional progressive enhancement: expose only the public, visible catalog.
  // Ordinary browsers ignore this. No orders or personal details are exposed.
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'read_visible_book_catalog',
        title: 'Read visible book catalog',
        description: 'Read the currently filtered public sample catalog. Does not change filters, add books, or place orders.',
        inputSchema: { type:'object', properties:{}, additionalProperties:false },
        annotations: { readOnlyHint:true, untrustedContentHint:false },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
          if (!['home','catalog','courses','used'].includes(currentView)) return { view:currentView, books:[] };
          return { view:currentView, sampleData:true, currency:'BDT', books:filteredBooks().map(b=>({ id:b.id, title:b.title, author:b.author, isbn:b.isbn, price:b.price, available:stockOf(b), courses:b.courses })) };
        }
      }, {signal:lifecycle.signal})).catch(()=>{});
    } catch { /* Unsupported experimental API must not interrupt shopping. */ }
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
