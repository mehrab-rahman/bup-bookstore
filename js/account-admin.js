/* Local-only account, staff, and eBook demonstrations.
   Browser role checks are UI behavior, NOT a production security boundary. */
(() => {
  'use strict';
  const catalogKey = 'bup-bookstore-catalog-v3';
  const accountKey = 'bup-bookstore-accounts-v2';
  const sessionKey = 'bup-bookstore-session-v2';
  const safeFile = (value, folder, extension) => {
    if (!value) return true;
    if (value.startsWith(folder) && !value.includes('..') && !/[<>"'\\]/.test(value) && new RegExp(extension + '$','i').test(value)) return true;
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
  };
  // Load before the main app so saved carts can resolve books added by an administrator.
  try {
    const version3=localStorage.getItem(catalogKey);
    const saved = JSON.parse(version3 || localStorage.getItem('bup-bookstore-catalog-v2'));
    if (Array.isArray(saved) && saved.length && saved.every(b => b && /^[a-z0-9-]+$/.test(b.id) && ['title','author','publisher','edition','isbn','category','condition','language','image','description'].every(k=>typeof b[k]==='string') && Array.isArray(b.courses) && b.courses.every(c=>typeof c==='string') && Number.isFinite(b.price) && b.price>=0 && Number.isInteger(b.stock) && b.stock>=0 && safeFile(b.image,'assets/images/','\\.(png|jpe?g|webp|svg)') && safeFile(b.ebookUrl || '','assets/ebooks/','\\.pdf')) && new Set(saved.map(b=>b.id)).size===saved.length) {const defaults=window.BOOKSTORE.books;window.BOOKSTORE.books=version3?saved:[...defaults.map(b=>{const old=saved.find(x=>x.id===b.id);return old?{...old,courses:[...new Set([...b.courses,...old.courses])]}:b;}),...saved.filter(b=>!defaults.some(x=>x.id===b.id))];}
  } catch { /* Keep the source catalog when saved data is unavailable or invalid. */ }
  window.installBUPFeatures = api => {
    const { $, esc, money, icon, main, modal, state, books, departments, bookById, stockOf, save, toast, render, heading, empty, openModal, closeModal, makeId, date, showOrder, downloadInvoice } = api;
    let accounts=[], session=null, adminTab='overview', afterLogin='', authError='';
    try {
      const stored=JSON.parse(localStorage.getItem(accountKey));
      if(Array.isArray(stored)) accounts=stored.filter(u=>u && typeof u.id==='string' && typeof u.name==='string' && typeof u.email==='string' && ['student','admin'].includes(u.role) && typeof u.passwordHash==='string' && typeof u.salt==='string');
      session=JSON.parse(sessionStorage.getItem(sessionKey));
    } catch { /* Demo still works in memory. */ }
    accounts.forEach(u=>{u.userId=u.role==='admin'?'BUP-ADMIN':u.userId||u.studentId;});
    const currentUser=()=>session && session.expires>Date.now() ? accounts.find(u=>u.id===session.id) || null : null;
    const isAdmin=()=>currentUser()?.role==='admin';
    const myCount=key=>state[key].filter(r=>(r.ownerId||null)===(currentUser()?.id||null)).length;
    function persistAccounts() { try { localStorage.setItem(accountKey,JSON.stringify(accounts)); } catch { toast('Accounts are session-only because browser storage is unavailable.'); } }
    function persistCatalog() { try { localStorage.setItem(catalogKey,JSON.stringify(books)); } catch { toast('Catalog changes last for this session only. Export the catalog to keep them.'); } }
    function setSession(user) { session=user ? {id:user.id,expires:Date.now()+8*60*60*1000} : null;try { if(session)sessionStorage.setItem(sessionKey,JSON.stringify(session));else sessionStorage.removeItem(sessionKey); }catch{} updateHeader(); }
    function updateHeader() { const user=currentUser();$('#account-link').href=user?'#account':'#login';$('#account-link').setAttribute('aria-label',user?'My account':'Sign in');$('#account-label').textContent=user?'Account':'Sign in'; }
    const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    async function passwordHash(password,salt) {
      if (!globalThis.crypto?.subtle) throw new Error('Account demo needs a secure browser context. Open through localhost or a supported browser.');
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
      return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:150000,hash:'SHA-256'},key,256)));
    }
    async function createAccount(data,password) {
      const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
      return {...data,salt,passwordHash:await passwordHash(password,salt),createdAt:new Date().toISOString()};
    }
    // Published credentials are for a deliberately public demonstration account only.
    const ready=(async()=>{
      if(!accounts.some(u=>u.email==='admin@bup.demo')) {
        accounts.push(await createAccount({id:'demo-admin',name:'Bookstore Administrator',email:'admin@bup.demo',studentId:'',userId:'BUP-ADMIN',department:'',role:'admin'},'BupAdmin@123'));
        persistAccounts();
      }
    })().catch(error=>{authError=error.message;});
    function go(route) { if(modal.open)closeModal();if(location.hash==='#'+route)render();else location.hash=route; }
    function authPage(register=false,adminEntry=false) {
      if(currentUser())return register||!adminEntry?accountPage():adminPage();
      if(adminEntry)afterLogin='admin';
      main.innerHTML=`<div class="container page-content"><div class="auth-layout"><aside class="auth-story"><span class="eyebrow">BUP Bookstore</span>${icon('book')}<h1>${register?'A new chapter.<br> A place of your own.':'Welcome back<br> to your bookshelf.'}</h1><p>Keep your learning close. Your books, reading lists, and campus bookstore — together.</p><div class="auth-story-bottom">${icon('shield')} A community built around learning</div></aside><section class="auth-panel" aria-labelledby="auth-title"><div class="auth-tabs"><a href="#login" class="${!register?'active':''}">Sign in</a><a href="#register" class="${register?'active':''}">Create account</a></div><h2 id="auth-title">${register?'Join the bookstore':adminEntry?'Administrator sign in':'Good to see you again.'}</h2><p class="modal-description">${register?'Create a student demo account to organize your bookstore activity.':'Sign in to your local bookstore demo account.'}</p><div class="notice">Local demo accounts only. Use a test email and a unique test password. This is not connected to BUP accounts.</div><form id="auth-form" data-mode="${register?'register':'login'}"><div class="form-error" id="auth-error" role="alert">${esc(authError)}</div><div class="form-grid">${register?`<div class="span-2"><label for="auth-name">Full name</label><input id="auth-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div><div><label for="auth-student">Student ID</label><input id="auth-student" name="studentId" required pattern="[A-Za-z0-9-]{5,25}" maxlength="25" title="Use 5–25 letters, numbers, or hyphens"></div><div><label for="auth-department">Department</label><select id="auth-department" name="department" required><option value="">Select department</option>${departments.map(d=>`<option value="${d.id}">${esc(d.short)}</option>`).join('')}</select></div>`:''}${register?'<div><label for="auth-batch">Batch</label><input id="auth-batch" name="batch" required maxlength="30" placeholder="e.g. ICT 2024"></div><div class="span-2"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="student@example.com"></div>':'<div class="span-2"><label for="auth-userid">User ID</label><input id="auth-userid" name="userId" required maxlength="40" autocomplete="username" placeholder="Student ID or BUP-ADMIN"></div>'}<div class="span-2"><label for="auth-password">Password</label><div class="password-field"><input id="auth-password" name="password" type="password" required minlength="8" maxlength="128" autocomplete="${register?'new-password':'current-password'}"><button type="button" data-feature="toggle-password" aria-controls="auth-password" aria-pressed="false">Show</button></div>${register?'<p class="field-help">Use at least 8 characters. Do not reuse a real password.</p>':''}</div>${register?'<div class="span-2"><label for="auth-confirm">Confirm password</label><input id="auth-confirm" name="confirm" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></div>':''}</div><button class="btn btn-full auth-submit" type="submit">${register?'Create account':'Sign in'} ${icon('arrow')}</button></form><p class="auth-switch">${register?'Already have an account? <a href="#login">Sign in</a>':'New to the bookstore? <a href="#register">Create an account</a>'}</p><details class="demo-credentials" ${adminEntry?'open':''}><summary>Try the admin demonstration</summary><p>User ID: <strong>BUP-ADMIN</strong><br>Password: <strong>BupAdmin@123</strong></p><p>These public credentials open this browser’s local management panel.</p></details></section></div></div>`;
    }
    function accountPage() {
      const user=currentUser();if(!user)return authPage();
      main.innerHTML=`<div class="container page-content">${heading('My account',`Welcome, ${user.name}. Make yourself at home.`)}<div class="account-layout"><section class="help-card account-profile"><div class="avatar">${esc(user.name.charAt(0).toUpperCase())}</div><h2>${esc(user.name)}</h2><span class="status-pill">${user.role==='admin'?'Demo administrator':'Student account'}</span><dl class="book-facts"><dt>Email</dt><dd>${esc(user.email)}</dd>${user.studentId?`<dt>Student ID</dt><dd>${esc(user.studentId)}</dd>`:''}<dt>Batch</dt><dd>${esc(user.batch||'—')}</dd><dt>Department</dt><dd>${esc(departments.find(d=>d.id===user.department)?.name||'Staff')}</dd><dt>Joined</dt><dd>${date(user.createdAt)}</dd></dl><button class="btn btn-secondary" data-feature="logout">Sign out</button></section><div><div class="account-cards"><a href="#sell" class="help-card"><span class="eyebrow">Give books a second chapter</span><h2>Sell your books</h2><p>Receive an estimated 70%–80% of your purchase price, subject to inspection.</p><span class="text-link">My buyback requests →</span></a><a href="#orders" class="help-card"><span class="eyebrow">Your activity</span><h2>${myCount('orders')} orders</h2><p>View your demo purchases and fulfilment status.</p><span class="text-link">My orders ${icon('arrow')}</span></a><a href="#wishlist" class="help-card"><span class="eyebrow">On your radar</span><h2>Saved books</h2><p>Return to your browser’s shared saved shelf.</p><span class="text-link">Open shelf ${icon('arrow')}</span></a></div>${user.role==='admin'?'<div class="help-card"><h2>Manage the bookstore</h2><p>Update the catalog, configure authorized eBook files, and manage local orders and requests.</p><a class="btn" href="#admin">Open admin panel →</a></div>':''}<div class="notice">Your session lasts up to 8 hours in this tab. Account-specific orders, requests, and tickets are separated in the interface. Cart and wishlist are shared on this browser. This is not secure server-side access control.</div></div></div></div>`;
    }
    const statuses={orders:['Demo order recorded','Processing','Ready for pickup','Out for delivery','Completed'],requests:['Saved locally','Under review','Available','Closed'],tickets:['Saved locally','In progress','Resolved']};
    function recordStatus(key,r) { const options=key==='orders'?statuses.orders.filter(s=>s!==(r.delivery==='pickup'?'Out for delivery':'Ready for pickup')):statuses[key];return `<form class="status-form" data-record-type="${key}" data-record-id="${esc(r.id)}"><label class="sr-only" for="status-${esc(r.id)}">Status for ${esc(r.id)}</label><select id="status-${esc(r.id)}" name="status">${options.map(s=>`<option ${s===(r.status||options[0])?'selected':''}>${s}</option>`).join('')}</select><button class="btn btn-secondary" type="submit">Save</button></form>`; }
    function adminPage() {
      if(!currentUser())return authPage(false,true);
      if(!isAdmin()) { main.innerHTML=`<div class="container page-content">${heading('Administrator access','This panel is available to the demo administrator.')}<div class="help-card"><h2>You’re signed in as a student.</h2><p>Use the administrator demo account to manage the store.</p><button class="btn" data-feature="switch-admin">Sign out and use admin login</button></div></div>`;return; }
      const tabs=[['overview','Overview'],['books','Books & eBooks'],['orders','Orders'],['requests','Requests'],['tickets','Support'],['users','Users'],['resales','Buyback desk']];
      main.innerHTML=`<div class="container page-content admin-page"><div class="section-heading"><div><span class="eyebrow">Bookstore workspace</span><h1>Administration</h1><p>Manage your catalog and campus bookstore activity.</p></div><a href="#home" class="btn btn-secondary">View storefront ${icon('arrow')}</a></div><div class="notice">Demo administration · Changes affect this browser only. No real orders, payments, or notifications are sent.</div><nav class="admin-tabs" aria-label="Admin sections">${tabs.map(([id,label])=>`<button data-admin-tab="${id}" class="${adminTab===id?'active':''}" aria-pressed="${adminTab===id}">${label}${['orders','requests','tickets'].includes(id)?` <span>${state[id].length}</span>`:''}</button>`).join('')}</nav><div id="admin-content">${adminContent()}</div></div>`;
    }
    function adminContent() {
      if(adminTab==='resales')return window.BUPCommerce?.adminResales()||'';
      const active=books.filter(b=>!b.archived),total=state.orders.reduce((s,o)=>s+o.total,0);
      if(adminTab==='overview')return `<div class="admin-metrics"><div><span>Active titles</span><strong>${active.length}</strong><small>${active.filter(b=>b.ebookUrl&&b.ebookAuthorized).length} with an eBook link</small></div><div><span>Available copies</span><strong>${active.reduce((s,b)=>s+stockOf(b),0)}</strong><small>${active.filter(b=>stockOf(b)<4).length} titles with low or no stock</small></div><div><span>Demo orders</span><strong>${state.orders.length}</strong><small>${state.orders.filter(o=>o.status!=='Completed').length} in progress</small></div><div><span>Demo order value</span><strong>${money(total)}</strong><small>Simulation only · No real revenue</small></div></div><div class="admin-overview"><section class="help-card"><div class="section-heading"><h2>Inventory attention</h2><button class="text-link" data-admin-tab="books">Manage books →</button></div>${active.filter(b=>stockOf(b)<4).map(b=>`<div class="admin-mini-row"><div><strong>${esc(b.title)}</strong><p>${stockOf(b)} copies available</p></div><button class="btn btn-secondary" data-feature="edit-book" data-id="${b.id}">Update</button></div>`).join('')||'<p>Every active title has at least four copies available.</p>'}</section><section class="help-card"><h2>A digital shelf, ready to grow.</h2><p>Add an authorized PDF path or HTTPS link to each book. Until then, students can request its digital edition.</p><button class="btn" data-admin-tab="books">Manage books & eBooks ${icon('arrow')}</button><p class="hint" style="margin-top:18px">${state.requests.filter(r=>r.format==='ebook').length} digital edition requests in this browser.</p></section></div>`;
      if(adminTab==='books')return `<div class="section-heading"><div><h2>Catalog & digital editions</h2><p>Manage titles, prices, available copies, and authorized eBook links.</p></div><div class="order-actions"><button class="btn btn-secondary" data-feature="export-catalog">Export catalog</button><button class="btn" data-feature="new-book">${icon('plus')} Add book</button></div></div><label for="admin-book-search">Find a title or author</label><input id="admin-book-search" type="search" placeholder="Filter the catalog table…" style="width:100%;margin:8px 0 20px"><div class="table-scroll"><table class="admin-table"><thead><tr><th>Book</th><th>Price</th><th>Available</th><th>E-Book</th><th>Actions</th></tr></thead><tbody>${books.map(b=>`<tr data-admin-book class="${b.archived?'archived-row':''}"><td><strong>${esc(b.title)}</strong><small>${esc(b.author)}${b.archived?' · Hidden from catalog':''}</small></td><td>${money(b.price)}</td><td>${stockOf(b)}</td><td><span class="status-pill">${b.ebookUrl&&b.ebookAuthorized?'Link configured':'Not configured'}</span></td><td><div class="table-actions"><button class="btn btn-secondary" data-feature="edit-book" data-id="${b.id}">Edit</button><button class="text-link" data-feature="archive-book" data-id="${b.id}">${b.archived?'Restore':'Hide'}</button></div></td></tr>`).join('')}</tbody></table></div>`;
      if(adminTab==='users')return `<div class="section-heading"><div><h2>Local accounts</h2><p>Registered demo accounts on this browser. Passwords are never displayed.</p></div></div><div class="table-scroll"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${accounts.map(u=>`<tr><td>${esc(u.name)}<small>${esc(u.studentId||'')}</small></td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${date(u.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
      const records=state[adminTab];
      if(!records.length)return empty(`No ${adminTab==='tickets'?'support tickets':adminTab} yet`,'Records created in the storefront will appear here.','#home','Visit storefront');
      return `<div class="section-heading"><div><h2>${adminTab==='tickets'?'Support tickets':adminTab==='requests'?'Book requests':'Order management'}</h2><p>Update local demonstration statuses. Customers can view changes in this browser.</p></div></div>${records.map(r=>`<article class="order-card"><div class="admin-record-top"><div><h3>${esc(adminTab==='orders'?r.id:adminTab==='requests'?r.title:r.subject)}</h3><p class="hint">${date(r.createdAt)} · ${esc(r.id)}</p></div>${recordStatus(adminTab,r)}</div>${adminTab==='orders'?`<p class="admin-record-text">${esc(r.name)} · ${r.delivery==='pickup'?'Campus pickup':'Campus delivery'} · ${money(r.total)} · ${esc(r.payment)}</p><p class="hint">${esc(r.items.map(i=>`${i.title} × ${i.quantity}`).join(', '))}</p>${r.paymentStatus!=='simulated-paid'?`<button class="btn btn-secondary" data-feature="cash-received" data-id="${esc(r.id)}">Record cash received (demo)</button>`:''}<button class="text-link" data-feature="admin-order" data-id="${esc(r.id)}">View order details →</button>`:adminTab==='requests'?`<p class="admin-record-text">${r.format==='ebook'?'Digital edition requested':'Print edition requested'} · ${esc(r.author||'Author not specified')}</p><p class="hint">${esc(r.notes||'')}</p>`:`<p class="admin-record-text">${esc(r.message)}</p>`}</article>`).join('')}`;
    }
    function editBook(id) {
      if(!isAdmin())return toast('Administrator sign-in is required.');
      const existing=bookById(id),b=existing||{title:'',author:'',publisher:'',edition:'',isbn:'',category:'Computing',price:0,stock:0,condition:'New',language:'English',image:'',description:'',courses:[],ebookUrl:'',ebookAuthorized:false};
      const field=(name,label,value,type='text',attrs='')=>`<div><label for="book-${name}">${label}</label><input id="book-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
      openModal(existing?'Edit book & E-Book':'Add a book',`<form id="admin-book-form" data-book-id="${esc(id||'')}"><div class="form-error" id="book-error" role="alert"></div><div class="form-grid">${field('title','Book title',b.title,'text','required maxlength="160"')}${field('author','Author',b.author,'text','required maxlength="200"')}${field('publisher','Publisher',b.publisher,'text','required maxlength="120"')}${field('edition','Edition',b.edition,'text','required maxlength="60"')}${field('isbn','ISBN',b.isbn,'text','required maxlength="20"')}${field('price','Price (BDT)',b.price,'number','required min="0" max="1000000" step="0.01"')}${field('available','Available copies',existing?Math.max(0,b.stock-state.orders.reduce((n,o)=>n+o.items.filter(i=>i.id===b.id).reduce((sum,i)=>sum+i.quantity,0),0)):0,'number','required min="0" max="100000" step="1"')}<div><label for="book-category">Category</label><select id="book-category" name="category">${[...new Set(books.map(b=>b.category))].map(c=>`<option ${b.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div><label for="book-condition">Condition</label><select id="book-condition" name="condition"><option ${b.condition==='New'?'selected':''}>New</option><option ${b.condition.startsWith('Used')?'selected':''}>Used · Good</option></select></div>${field('language','Language',b.language,'text','required maxlength="50"')}<div class="span-2"><label for="book-image">Cover image path or HTTPS URL</label><input id="book-image" name="image" value="${esc(b.image)}" required maxlength="1000" placeholder="assets/images/covers/my-cover.jpg"><p class="field-help">Put your cover in the project folder first. This field does not upload a file.</p></div><div class="span-2"><label for="book-description">Description</label><textarea id="book-description" name="description" required maxlength="1200">${esc(b.description)}</textarea></div><div class="span-2"><label for="book-courses">Suggested courses</label><select id="book-courses" name="courses" multiple size="6">${departments.map(d=>`<optgroup label="${esc(d.name)}">${d.courses.map(c=>`<option value="${c.id}" ${b.courses.includes(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select><p class="field-help">Use Ctrl (Windows) or Command (Mac) to select more than one course.</p></div><div class="span-2 ebook-config"><h3>Digital edition</h3><label for="book-ebook">Authorized PDF path or HTTPS link (optional)</label><input id="book-ebook" name="ebookUrl" value="${esc(b.ebookUrl||'')}" maxlength="1000" placeholder="assets/ebooks/my-book.pdf"><p class="field-help">Leave blank if no authorized digital edition is available. Local files must be PDF files inside assets/ebooks/.</p><label class="stock-check"><input type="checkbox" name="ebookAuthorized" ${b.ebookAuthorized?'checked':''}> I have permission to distribute or link this digital edition.</label></div></div><div class="form-actions"><button class="btn" type="submit">Save book ${icon('check')}</button><button class="btn btn-secondary" type="button" data-action="close">Cancel</button></div></form>`);
    }
    function ebook(id) {
      const b=bookById(id);if(!b)return;
      const url=b.ebookUrl||'',available=url&&b.ebookAuthorized&&safeFile(url,'assets/ebooks/','\\.pdf');
      openModal('Get E-Book',`<div class="ebook-detail">${b.image?`<img src="${esc(b.image)}" alt="${esc(b.title)} cover" data-book-image="${b.id}">`:`<span class="cover-fallback">${esc(b.title)}</span>`}<div><span class="eyebrow">Your digital bookshelf</span><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="status-pill">${available?'Digital link available':'Digital edition not yet available'}</span></div></div>${available?`<p class="modal-description">Open the digital edition configured by the bookstore administrator. You can use the PDF reader’s download button to save a copy where permitted.</p><a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('book')} Open E-Book ↗</a><p class="hint" style="margin-top:14px">This demo opens the configured file or provider link. Paid access and protected downloads require a backend.</p>`:`<p class="modal-description">An authorized digital copy of this title has not been added. Request an E-Book to let the demo administrator know you’re interested.</p><button class="btn" data-feature="request-ebook" data-id="${b.id}">${icon('plus')} Request digital edition</button><p class="hint" style="margin-top:14px">Requests stay in this browser. No copyrighted textbook files are included in the project.</p>`}`);
    }
    document.addEventListener('input',e=>{if(e.target.id==='admin-book-search'){const q=e.target.value.trim().toLowerCase();document.querySelectorAll('[data-admin-book]').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));}});
    document.addEventListener('click',e=>{
      const tab=e.target.closest('[data-admin-tab]');if(tab){if(!isAdmin())return;adminTab=tab.dataset.adminTab;adminPage();return;}
      const el=e.target.closest('[data-feature]');if(!el)return;const {feature,id}=el.dataset;
      if(feature==='toggle-password'){const input=$('#auth-password');input.type=input.type==='password'?'text':'password';el.textContent=input.type==='password'?'Show':'Hide';el.setAttribute('aria-pressed',input.type==='text');}
      else if(feature==='logout'||feature==='switch-admin'){setSession(null);afterLogin=feature==='switch-admin'?'admin':'';go(feature==='switch-admin'?'admin':'login');toast('Signed out.');}
      else if(feature==='ebook')ebook(id);
      else if(feature==='request-ebook'){
        const b=bookById(id);if(!b)return;const owner=currentUser()?.id||null;
        if(state.requests.some(r=>r.bookId===id&&r.format==='ebook'&&(r.ownerId||null)===owner&&r.status!=='Closed'))return toast('You already have an open E-Book request for this title.');
        state.requests.unshift({id:makeId('REQ'),ownerId:owner,bookId:id,format:'ebook',title:b.title,author:b.author,isbn:b.isbn,notes:'An authorized digital edition is requested.',status:'Saved locally',createdAt:new Date().toISOString()});save();
        openModal('E-Book request saved',`<div class="success-state">${icon('check')}<h3>Your digital reading list is growing.</h3><p>Your request for “${esc(b.title)}” is saved in this browser for the demo administrator.</p><button class="btn" data-action="view-orders">View my requests ${icon('arrow')}</button></div>`);
      } else if(feature==='new-book')editBook();
      else if(feature==='edit-book')editBook(id);
      else if(feature==='archive-book'){
        if(!isAdmin())return;const b=bookById(id);if(!b)return;b.archived=!b.archived;
        if(b.archived){delete state.cart[id];state.wishlist=state.wishlist.filter(x=>x!==id);save();}
        persistCatalog();adminPage();toast(b.archived?'Book hidden. Existing order history is preserved.':'Book restored to the catalog.');
      } else if(feature==='cash-received'){if(!isAdmin())return;const order=state.orders.find(o=>o.id===id);if(!order||order.paymentStatus==='simulated-paid')return;order.paymentStatus='simulated-paid';order.paymentMethod='Cash on receipt';order.payment='Simulated paid · Cash on receipt';order.paymentRef=makeId('TEST-CASH');save();adminPage();toast('Cash receipt recorded for this demonstration only.');}
      else if(feature==='admin-order'){if(isAdmin())showOrder(id);}
      else if(feature==='export-catalog'){
        if(!isAdmin())return;const source='/* Exported local demo catalog. */\nObject.assign(window.BOOKSTORE, '+JSON.stringify(window.BOOKSTORE,null,2)+');\n';
        const url=URL.createObjectURL(new Blob([source],{type:'text/javascript;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='curriculum.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Exported curriculum.js. Replace js/curriculum.js to share these changes.');
      }
    });
    document.addEventListener('submit',async e=>{
      const form=e.target;
      if(form.id==='auth-form'){
        e.preventDefault();const button=form.querySelector('button[type="submit"]'),error=$('#auth-error');button.disabled=true;error.textContent='';
        try {
          await ready;if(authError)throw new Error(authError);
          const f=new FormData(form),email=String(f.get('email')).trim().toLowerCase(),password=String(f.get('password'));
          let user;
          if(form.dataset.mode==='register'){
            if(!String(f.get('batch')).trim())throw new Error('Please enter your batch.');
            const name=String(f.get('name')).trim();if(name.length<2)throw new Error('Please enter your full name.');
            if(password!==f.get('confirm'))throw new Error('The passwords do not match.');
            if(accounts.some(u=>u.userId?.toLowerCase()===String(f.get('studentId')).trim().toLowerCase()))throw new Error('This student ID is already registered.');
            if(accounts.some(u=>u.email===email))throw new Error('An account with this email already exists. Please sign in.');
            user=await createAccount({id:makeId('USER'),name,email,studentId:String(f.get('studentId')).trim(),userId:String(f.get('studentId')).trim(),batch:String(f.get('batch')).trim(),department:String(f.get('department')),role:'student'},password);
            accounts.push(user);persistAccounts();
          }else{
            user=accounts.find(u=>u.userId?.toLowerCase()===String(f.get('userId')).trim().toLowerCase());if(!user||await passwordHash(password,user.salt)!==user.passwordHash)throw new Error('User ID or password is incorrect. Please try again.');
          }
          setSession(user);const target=afterLogin==='admin'||user.role==='admin'?'admin':'account';afterLogin='';go(target);toast(form.dataset.mode==='register'?'Your demo account is ready.':'Welcome back.');
        }catch(errorValue){if(error.isConnected)error.textContent=errorValue.message;}
        finally{button.disabled=false;}
      } else if(form.id==='admin-book-form'){
        e.preventDefault();if(!isAdmin())return toast('Administrator sign-in is required.');
        const f=new FormData(form),error=$('#book-error'),title=String(f.get('title')).trim(),author=String(f.get('author')).trim(),image=String(f.get('image')).trim(),ebookUrl=String(f.get('ebookUrl')).trim(),authorized=f.has('ebookAuthorized'),available=Number(f.get('available')),price=Number(f.get('price'));
        error.textContent='';
        if(title.length<2||author.length<2)return error.textContent='Please enter a title and author with at least two characters.';
        if(!Number.isInteger(available)||available<0||available>100000||!Number.isFinite(price)||price<0||price>1000000)return error.textContent='Enter a valid price and a whole number of available copies.';
        if(!safeFile(image,'assets/images/','\\.(png|jpe?g|webp|svg)'))return error.textContent='Use a local image in assets/images/ or an HTTPS image URL.';
        if(!safeFile(ebookUrl,'assets/ebooks/','\\.pdf'))return error.textContent='Use a PDF path in assets/ebooks/ or an HTTPS link.';
        if(ebookUrl&&!authorized)return error.textContent='Confirm you have permission to provide this digital edition.';
        const existing=bookById(form.dataset.bookId),id=existing?.id||'book-'+makeId('NEW').toLowerCase();
        const sold=state.orders.reduce((sum,o)=>sum+o.items.filter(i=>i.id===id).reduce((n,i)=>n+i.quantity,0),0);
        const record={...(existing||{}),id,title,author,publisher:String(f.get('publisher')).trim(),edition:String(f.get('edition')).trim(),isbn:String(f.get('isbn')).trim(),category:String(f.get('category')),price,stock:available+sold,condition:String(f.get('condition')),language:String(f.get('language')).trim(),image,description:String(f.get('description')).trim(),courses:f.getAll('courses').filter(c=>departments.some(d=>d.courses.some(x=>x.id===c))),tag:existing?.tag||'',ebookUrl,ebookAuthorized:!!ebookUrl&&authorized,archived:existing?.archived||false};
        if(existing)Object.assign(existing,record);else books.push(record);
        if(state.cart[id]>available){if(available)state.cart[id]=available;else delete state.cart[id];save();}
        persistCatalog();closeModal();adminTab='books';adminPage();toast('Book saved. Storefront and E-Book options updated.');
      } else if(form.dataset.recordType){
        e.preventDefault();if(!isAdmin())return toast('Administrator sign-in is required.');
        const key=form.dataset.recordType,value=new FormData(form).get('status'),record=state[key]?.find(r=>r.id===form.dataset.recordId);
        if(!record||!statuses[key]?.includes(value))return;
        if(key==='orders'&&value===(record.delivery==='pickup'?'Out for delivery':'Ready for pickup'))return;
        record.status=value;record.updatedAt=new Date().toISOString();save();toast('Demo status updated.');
      }
    });
    // Fill checkout from the current profile without making guest purchases dependent on login.
    new MutationObserver(()=>{
      const user=currentUser(),form=$('#checkout-form');if(!user||!form||form.dataset.profileFilled)return;
      $('#customer-name').value=user.name;$('#customer-email').value=user.email;$('#student-id').value=user.studentId||'';form.dataset.profileFilled='true';
    }).observe($('#modal-content'),{childList:true,subtree:true});
    return { currentUser,updateHeader,renderView(view){ if(view==='admin')adminPage();else if(view==='account')accountPage();else authPage(view==='register'); } };
  };
})();


