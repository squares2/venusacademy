// ═══════════════════════════════════════════════════
//  VENUS GYM — Point of Sale Module
// ═══════════════════════════════════════════════════
const POSModule = (() => {
  let _db, _products = [], _cart = [];

  async function render(db, profile) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('pos')}</h1>
          <p class="page-subtitle">${t('pos_subtitle')}</p>
        </div>
        <div class="page-header-right">
          <div class="pos-tabs" role="tablist">
            <button type="button" class="pos-tab" data-postab="sell" onclick="POSModule.switchTab('sell')">🛒 ${t('pos_tab_sell')}</button>
            <button type="button" class="pos-tab" data-postab="history" onclick="POSModule.switchTab('history')">🧾 ${t('pos_tab_history')}</button>
          </div>
          <button class="btn btn-outline" onclick="POSModule.openInventory()">📦 ${t('inventory')}</button>
        </div>
      </div>
      <div id="pos-history" style="display:none"></div>
      <div class="pos-layout" id="pos-sell">
        <div>
          <div class="search-bar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input class="search-input" id="pos-search" placeholder="${t('search_products_placeholder')}" oninput="POSModule.onSearch(this.value)">
            </div>
            <select class="filter-select" id="pos-category" onchange="POSModule.onCat()">
              <option value="">${t('all_categories')}</option>
              <option value="water">💧 ${t('cat_water')}</option>
              <option value="food">🍎 ${t('cat_food')}</option>
              <option value="supplement">💊 ${t('cat_supplement')}</option>
              <option value="gear">🥊 ${t('cat_gear')}</option>
              <option value="apparel">👕 ${t('cat_apparel')}</option>
              <option value="other">📦 ${t('cat_other')}</option>
            </select>
            ${FilterMemory.resetButton('pos')}
          </div>
          <div class="pos-products-grid" id="pos-products"></div>
        </div>
        <div>
          <div class="pos-cart">
            <div class="pos-cart-header">
              🛒 ${t('cart')}
              <button class="btn btn-ghost btn-sm" onclick="POSModule.clearCart()">${t('clear_btn')}</button>
            </div>
            <div class="pos-cart-items" id="cart-items">
              <p style="text-align:center;color:var(--text-muted);padding:30px 0;font-size:13px">${t('empty_cart')}</p>
            </div>
            <div class="pos-cart-summary">
              <div class="summary-row"><span>${t('subtotal_usd')}</span><span id="cart-subtotal-usd">$0.00</span></div>
              <div class="summary-row"><span>${t('subtotal_lbp')}</span><span id="cart-subtotal-lbp">0 ل.ل</span></div>
              <div class="summary-row total"><span>${t('total')}</span><span class="amount" id="cart-total">$0.00</span></div>
              <div class="form-group" style="margin-top:10px">
                <label class="form-label">${t('customer_optional')}</label>
                <input class="form-input" id="pos-customer" placeholder="${t('name_or_phone_placeholder')}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('payment_method')}</label>
                <select class="form-select" id="pos-pay-method">
                  <option value="cash">💵 ${t('cash')}</option>
                  <option value="partial">⊘ ${t('partial')}</option>
                </select>
              </div>
              <div class="form-group" id="pos-paid-wrap">
                <label class="form-label">${t('amount_paid')} (USD)</label>
                <input class="form-input" id="pos-paid" type="number" min="0" oninput="POSModule.calcChange()">
              </div>
              <div id="pos-change" style="display:none;background:var(--success-bg);border-radius:var(--radius-md);padding:10px;font-size:13px;color:var(--success);margin-bottom:10px"></div>
              <button class="btn btn-primary w-full" style="margin-top:4px" onclick="POSModule.checkout()">✓ ${t('checkout')}</button>
            </div>
          </div>
        </div>
      </div>
      ${inventoryModal()}`;
    FilterMemory.register('pos', { persist: ['pos-category'], session: ['pos-search'], onReset: () => applyProductFilter() });
    FilterMemory.restore('pos');
    _histBuilt = false; _histCache = { key: '', sales: [] };
    await loadProducts();
    switchTab(_savedTab());
  }

  async function loadProducts() {
    const snap = await _db.collection(COL.PRODUCTS).orderBy('name').get();
    _products = snap.docs.map(d => ({id:d.id,...d.data()}));
    applyProductFilter(); // keep search/category after sales & inventory edits
  }

  function applyProductFilter() {
    FilterMemory.save('pos');
    const q = (document.getElementById('pos-search')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('pos-category')?.value || '';
    renderProducts(_products.filter(p => (!q || p.name?.toLowerCase().includes(q)) && (!cat || p.category === cat)));
  }

  function renderProducts(list) {
    const grid = document.getElementById('pos-products');
    grid.innerHTML = list.map(p => {
      const out = (p.stock||0) <= 0, low = !out && _hasStock(p) && Number(p.stock) <= 3;
      return `
      <div class="pos-product-card${p.image?' has-img':''}${out?' out-of-stock':''}${low?' low-stock':''}" data-pid="${_esc(p.id)}" data-cat="${_esc(p.category||'other')}" onclick="POSModule.addToCart('${p.id}')">
        <div class="pos-card-media">
          ${p.image ? `<img src="${p.image}" alt="${_esc(p.name)}" loading="lazy" draggable="false">` : `<span class="pos-card-emoji">${catIcon(p.category)}</span>`}
          <span class="pos-card-price">${Currency.formatUSD(p.priceUsd)}</span>
          ${p.image ? `<button type="button" class="pos-card-zoom" title="${App.t('pos_zoom')}" aria-label="${App.t('pos_zoom')}" onclick="event.stopPropagation();POSModule.viewImage('${p.id}')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>` : ''}
          <span class="pos-card-qty" hidden></span>
          ${out ? `<span class="pos-card-out">${App.t('pos_out_badge')}</span>` : ''}
        </div>
        <div class="pos-card-body">
          <div class="pos-card-name" title="${_esc(p.name)}">${_esc(p.name)}</div>
          <div class="pos-card-meta">
            <span>${catIcon(p.category)} ${catLabel(p.category)}</span>
            <span class="pos-card-stock">${_hasStock(p) ? `${App.t('stock')}: ${p.stock}` : '∞'}</span>
          </div>
        </div>
      </div>`;
    }).join('');
    _syncCardQty();
  }

  // little "in cart" bubble on each product card
  function _syncCardQty() {
    document.querySelectorAll('.pos-product-card[data-pid]').forEach(card => {
      const it = _cart.find(c => c.id === card.dataset.pid), b = card.querySelector('.pos-card-qty');
      if (!b) return;
      b.hidden = !it; if (it) b.textContent = `×${it.qty}`;
      card.classList.toggle('in-cart', !!it);
    });
  }
  /* ── Full-screen picture viewer (fits any screen; tap the picture to zoom 2×) ── */
  let _viewId = null;
  function viewImage(id) {
    const p = _products.find(x => x.id === id); if (!p || !p.image) return;
    _viewId = id;
    let ov = document.getElementById('pos-viewer');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'pos-viewer'; ov.className = 'pos-viewer';
      ov.addEventListener('click', e => { if (e.target === ov || e.target.classList.contains('pv-stage')) closeImage(); });
      document.body.appendChild(ov);
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('pos-viewer')?.classList.contains('open')) closeImage(); });
    }
    const out = (p.stock||0) <= 0;
    ov.innerHTML = `
      <button type="button" class="pv-close" aria-label="${App.t('close')}" onclick="POSModule.closeImage()">✕</button>
      <div class="pv-stage"><img class="pv-img" src="${p.image}" alt="${_esc(p.name)}" onclick="POSModule.toggleZoom(event)"></div>
      <div class="pv-info">
        <div class="pv-text">
          <div class="pv-name">${_esc(p.name)}</div>
          <div class="pv-meta"><span>${catIcon(p.category)} ${catLabel(p.category)}</span><span class="pv-stock${out?' out':''}">${_hasStock(p) ? `${App.t('stock')}: ${p.stock}` : '∞'}</span></div>
        </div>
        <div class="pv-price">${Currency.formatUSD(p.priceUsd)}</div>
        ${out ? `<span class="pv-out">${App.t('pos_out_badge')}</span>` : `<button type="button" class="btn btn-primary pv-add" onclick="POSModule.addFromViewer()">🛒 ${App.t('pos_add_to_cart')}</button>`}
      </div>`;
    const img = ov.querySelector('.pv-img');
    if (img.complete) _fitViewer(); else img.onload = _fitViewer;
    requestAnimationFrame(() => { _fitViewer(); ov.classList.add('open'); });
    document.body.style.overflow = 'hidden';
  }
  // scale the picture to the largest size that fits the free space (keeps its shape, any screen width)
  function _fitViewer() {
    const ov = document.getElementById('pos-viewer'); if (!ov || !ov.isConnected) return;
    const stage = ov.querySelector('.pv-stage'), img = ov.querySelector('.pv-img');
    if (!stage || !img || !img.naturalWidth) return;
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    const k = Math.min(w / img.naturalWidth, h / img.naturalHeight, 3);
    img.style.width = Math.round(img.naturalWidth * k) + 'px';
    img.style.height = Math.round(img.naturalHeight * k) + 'px';
  }
  window.addEventListener('resize', () => { if (document.getElementById('pos-viewer')?.classList.contains('open')) _fitViewer(); });
  function closeImage() {
    const ov = document.getElementById('pos-viewer'); if (!ov) return;
    ov.classList.remove('open'); document.body.style.overflow = ''; _viewId = null;
  }
  function toggleZoom(e) {
    const img = e.currentTarget, r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.classList.toggle('zoomed');
  }
  function addFromViewer() { const id = _viewId; closeImage(); if (id) addToCart(id); }

  function _bump(id) {
    const card = document.querySelector(`.pos-product-card[data-pid="${CSS.escape(id)}"]`); if (!card) return;
    card.classList.remove('bump'); void card.offsetWidth; card.classList.add('bump');
  }

  function catIcon(c){return{water:'💧',food:'🍎',supplement:'💊',gear:'🥊',apparel:'👕'}[c]||'📦';}
  function catLabel(c){return App.t({water:'cat_water',food:'cat_food',supplement:'cat_supplement',gear:'cat_gear',apparel:'cat_apparel'}[c]||'cat_other');}

  const onSearch = debounce(() => applyProductFilter(), 250);

  function onCat(){ applyProductFilter(); }

  /* ── Stock limit: a product with a stock number can't go above it in the cart (no stock = unlimited) ── */
  const _hasStock = p => p && p.stock !== undefined && p.stock !== null && p.stock !== '';
  const _maxQty = id => { const p=_products.find(x=>x.id===id); return _hasStock(p) ? Math.max(0, Number(p.stock)||0) : Infinity; };
  function _stockWarn(name, max){
    Toast.warning(max>0 ? App.t('pos_stock_limit').replace('{name}',name).replace('{n}',max) : App.t('pos_out_of_stock').replace('{name}',name));
  }

  function addToCart(id) {
    const p=_products.find(x=>x.id===id); if(!p)return;
    const existing=_cart.find(c=>c.id===id);
    const max=_maxQty(id), next=(existing?existing.qty:0)+1;
    if(next>max){_stockWarn(p.name,max);return;}
    if(existing){existing.qty=next;} else {_cart.push({...p,qty:1});}
    renderCart(); _bump(id);
  }

  function updateQty(id,delta){
    const item=_cart.find(c=>c.id===id); if(!item)return;
    const max=_maxQty(id);
    if(delta>0&&item.qty+delta>max){_stockWarn(item.name,max);return;}
    item.qty+=delta;
    if(item.qty<=0)_cart=_cart.filter(c=>c.id!==id);
    renderCart();
  }

  function clearCart(){_cart=[];renderCart();}

  function renderCart(){
    const el=document.getElementById('cart-items');
    if(!_cart.length){
      el.innerHTML=`<p style="text-align:center;color:var(--text-muted);padding:30px 0;font-size:13px">${App.t('empty_cart')}</p>`;
    } else {
      el.innerHTML=_cart.map(c=>`
        <div class="cart-item">
          <span class="cart-item-thumb" data-cat="${_esc(c.category||'other')}">${c.image?`<img src="${c.image}" alt="">`:catIcon(c.category)}</span>
          <span class="cart-item-name">${_esc(c.name)}</span>
          <div class="cart-qty-control">
            <button class="cart-qty-btn" onclick="POSModule.updateQty('${c.id}',-1)">−</button>
            <span class="cart-qty-num">${c.qty}</span>
            <button class="cart-qty-btn"${c.qty>=_maxQty(c.id)?' style="opacity:.35;cursor:not-allowed"':''} title="${_hasStock(c)?`${App.t('stock')}: ${_maxQty(c.id)}`:''}" onclick="POSModule.updateQty('${c.id}',1)">+</button>
          </div>
          <span class="cart-item-total">${Currency.formatUSD((c.priceUsd||0)*c.qty)}</span>
        </div>`).join('');
    }
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    setText('cart-subtotal-usd',Currency.formatUSD(total));
    setText('cart-subtotal-lbp',Currency.formatLBP(Currency.usdToLbp(total)));
    setText('cart-total',Currency.formatUSD(total));
    _syncCardQty();
    calcChange();
  }

  function calcChange(){
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    const paid=Number(document.getElementById('pos-paid')?.value)||0;
    const change=paid-total;
    const el=document.getElementById('pos-change');
    if(el){if(paid>0&&change>=0){el.style.display='block';el.textContent=`${App.t('change_word')}: ${Currency.formatUSD(change)}`;}else{el.style.display='none';}}
  }

  async function checkout(){
    if(!_cart.length){Toast.warning(App.t('empty_cart'));return;}
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    const paid=Number(document.getElementById('pos-paid')?.value)||total;
    const customer=document.getElementById('pos-customer')?.value||'';
    const method=document.getElementById('pos-pay-method')?.value||'cash';
    try{
      // Re-check stock just before selling (another device may have sold some). On a weak
      // connection we don't wait more than a few seconds — the last loaded stock is used instead.
      await Promise.race([
        Promise.all(_cart.map(c=>_db.collection(COL.PRODUCTS).doc(c.id).get().then(d=>{
          const p=_products.find(x=>x.id===c.id); if(p&&d.exists)p.stock=d.data().stock;
        }))),
        new Promise(r=>setTimeout(r,4000)),
      ]).catch(()=>{});
      const over=_cart.find(c=>c.qty>_maxQty(c.id));
      if(over){ _stockWarn(over.name,_maxQty(over.id)); applyProductFilter(); renderCart(); return; }

      // Sale + stock decrease in one batch, so a sale is never saved without its stock update
      const batch=_db.batch();
      batch.set(_db.collection(COL.SALES).doc(),{
        items:_cart.map(c=>({id:c.id,name:c.name,qty:c.qty,priceUsd:c.priceUsd})),
        totalUsd:total, amountPaid:paid, paymentMethod:method,
        customer, createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      _cart.forEach(c=>{
        if(_hasStock(_products.find(x=>x.id===c.id))){
          batch.update(_db.collection(COL.PRODUCTS).doc(c.id),{stock:firebase.firestore.FieldValue.increment(-c.qty)});
        }
      });
      await batch.commit();
      Toast.success(App.t('sale_completed'));
      _histCache = { key: '', sales: [] }; // history shows the new sale next time
      clearCart();
      document.getElementById('pos-customer').value='';
      await loadProducts();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  /* ══ Sales History ═══════════════════════════════════
     Every past POS sale, grouped by day, with saved filters
     (date preset / custom range / product / payment / search).
     Filters live in localStorage so they survive closing the app. ── */
  let _histBuilt = false, _histCache = { key: '', sales: [] }, _histShown = 60, _histView = [];
  const _TAB_KEY = 'venus_pos_tab';
  const _savedTab = () => { try { return localStorage.getItem(_TAB_KEY) === 'history' ? 'history' : 'sell'; } catch (_) { return 'sell'; } };
  const _esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _ymdL = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const _hhmm = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const _saleDate = x => x.createdAt?.toDate?.() || null;
  const _paidOf = x => Math.min(Number(x.totalUsd)||0, Number(x.amountPaid ?? x.totalUsd)||0);

  function switchTab(tab) {
    tab = tab === 'history' ? 'history' : 'sell';
    try { localStorage.setItem(_TAB_KEY, tab); } catch (_) {}
    document.querySelectorAll('.pos-tab').forEach(b => b.classList.toggle('active', b.dataset.postab === tab));
    const sell = document.getElementById('pos-sell'), hist = document.getElementById('pos-history');
    if (sell) sell.style.display = tab === 'sell' ? '' : 'none';
    if (hist) hist.style.display = tab === 'history' ? '' : 'none';
    if (tab === 'history') { if (!_histBuilt) _buildHistory(); loadHistory(); }
  }

  function _buildHistory() {
    const t = App.t.bind(App);
    const el = document.getElementById('pos-history'); if (!el) return;
    const prods = [..._products].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    el.innerHTML = `
      <div class="sh-filters">
        <div class="search-input-wrap sh-search">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="sh-search" placeholder="${t('sh_search')}" oninput="POSModule.onHistSearch()">
        </div>
        <select class="filter-select" id="sh-period" onchange="POSModule.onHistPeriod()">
          ${['today','yesterday','7d','month','last_month','30d','year','all','custom'].map(k => `<option value="${k}"${k==='today'?' selected':''}>${t('sh_'+k)}</option>`).join('')}
        </select>
        <div class="subs-date-range" id="sh-range" style="display:none">
          <input class="filter-select" type="date" id="sh-from" title="${t('from_date')}" onchange="POSModule.loadHistory()">
          <span class="subs-date-sep">→</span>
          <input class="filter-select" type="date" id="sh-to" title="${t('to_date')}" onchange="POSModule.loadHistory()">
        </div>
        <select class="filter-select" id="sh-product" onchange="POSModule.renderHistory()">
          <option value="">${t('sh_all_products')}</option>
          ${prods.map(p => `<option value="${_esc(p.id)}">${catIcon(p.category)} ${_esc(p.name)}</option>`).join('')}
        </select>
        <select class="filter-select" id="sh-method" onchange="POSModule.renderHistory()">
          <option value="">${t('sh_all_methods')}</option>
          <option value="cash">💵 ${t('cash')}</option>
          <option value="partial">⊘ ${t('partial')}</option>
          <option value="unpaid">⚠ ${t('sh_unpaid')}</option>
        </select>
        ${FilterMemory.resetButton('pos-history')}
        <button type="button" class="btn btn-outline sh-export" onclick="POSModule.exportHistory()">⬇ ${t('sh_export')}</button>
      </div>
      <div class="sh-period-label" id="sh-period-label"></div>
      <div class="kpi-grid sh-kpis" id="sh-kpis"></div>
      <div class="sh-body">
        <div class="sh-list" id="sh-list"></div>
        <aside class="chart-card sh-top" id="sh-top"></aside>
      </div>`;
    FilterMemory.register('pos-history', {
      persist: ['sh-period','sh-from','sh-to','sh-product','sh-method','sh-search'],
      onReset: () => { _syncHistRange(); loadHistory(); },
    });
    FilterMemory.restore('pos-history');
    _syncHistRange();
    _histBuilt = true;
  }

  function _syncHistRange() {
    const custom = document.getElementById('sh-period')?.value === 'custom';
    const w = document.getElementById('sh-range'); if (w) w.style.display = custom ? 'flex' : 'none';
  }

  function onHistPeriod() {
    const custom = document.getElementById('sh-period')?.value === 'custom';
    const f = document.getElementById('sh-from'), to = document.getElementById('sh-to');
    if (custom) { const n = new Date(); if (f && !f.value) f.value = _ymdL(new Date(n.getFullYear(), n.getMonth(), 1)); if (to && !to.value) to.value = _ymdL(n); }
    else { if (f) f.value = ''; if (to) to.value = ''; }
    _syncHistRange();
    loadHistory();
  }
  const onHistSearch = debounce(() => renderHistory(), 250);

  // [from, to] as local Dates (null = open-ended) + a readable label
  function _histRange() {
    const p = document.getElementById('sh-period')?.value || 'today';
    const n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate();
    const day0 = (yy, mm, dd) => new Date(yy, mm, dd, 0, 0, 0, 0), day1 = (yy, mm, dd) => new Date(yy, mm, dd, 23, 59, 59, 999);
    let from = null, to = null;
    if (p === 'today') { from = day0(y,m,d); to = day1(y,m,d); }
    else if (p === 'yesterday') { from = day0(y,m,d-1); to = day1(y,m,d-1); }
    else if (p === '7d') { from = day0(y,m,d-6); to = day1(y,m,d); }
    else if (p === '30d') { from = day0(y,m,d-29); to = day1(y,m,d); }
    else if (p === 'month') { from = day0(y,m,1); to = day1(y,m,d); }
    else if (p === 'last_month') { from = day0(y,m-1,1); to = day1(y,m,0); }
    else if (p === 'year') { from = day0(y,0,1); to = day1(y,m,d); }
    else if (p === 'custom') {
      let f = document.getElementById('sh-from')?.value || '', tt = document.getElementById('sh-to')?.value || '';
      if (f && tt && f > tt) [f, tt] = [tt, f];
      if (f) { const [a,b,c] = f.split('-').map(Number); from = day0(a,b-1,c); }
      if (tt) { const [a,b,c] = tt.split('-').map(Number); to = day1(a,b-1,c); }
    }
    const label = p === 'all' ? App.t('sh_all')
      : (from && to && _ymdL(from) === _ymdL(to)) ? DateUtil.format(from)
      : `${from ? DateUtil.format(from) : '…'} → ${to ? DateUtil.format(to) : '…'}`;
    return { from, to, label };
  }

  async function loadHistory() {
    if (!_histBuilt) return;
    FilterMemory.save('pos-history');
    const { from, to, label } = _histRange();
    const lbl = document.getElementById('sh-period-label'); if (lbl) lbl.textContent = `📅 ${label}`;
    const key = `${from?.getTime()||''}|${to?.getTime()||''}`;
    if (_histCache.key !== key) {
      document.getElementById('sh-list').innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
      try {
        let q = _db.collection(COL.SALES);
        const TS = firebase.firestore.Timestamp;
        if (from) q = q.where('createdAt', '>=', TS.fromDate(from));
        if (to) q = q.where('createdAt', '<=', TS.fromDate(to));
        const snap = await q.orderBy('createdAt', 'desc').get();
        _histCache = { key, sales: snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(_saleDate) };
      } catch (e) {
        console.error(e);
        document.getElementById('sh-list').innerHTML = `<p class="sh-empty" style="color:var(--danger)">${App.t('sh_failed')}</p>`;
        return;
      }
    }
    _histShown = 60;
    renderHistory();
  }

  function _filteredSales() {
    const prod = document.getElementById('sh-product')?.value || '';
    const meth = document.getElementById('sh-method')?.value || '';
    const q = (document.getElementById('sh-search')?.value || '').trim().toLowerCase();
    return _histCache.sales.filter(x => {
      const items = x.items || [];
      if (prod && !items.some(i => i.id === prod)) return false;
      if (meth === 'unpaid') { if (!(_paidOf(x) < (Number(x.totalUsd)||0) - 0.004)) return false; }
      else if (meth && (x.paymentMethod || 'cash') !== meth) return false;
      if (q && !((x.customer||'').toLowerCase().includes(q) || items.some(i => (i.name||'').toLowerCase().includes(q)))) return false;
      return true;
    });
  }

  function renderHistory() {
    if (!_histBuilt) return;
    FilterMemory.save('pos-history');
    const t = App.t.bind(App);
    const prod = document.getElementById('sh-product')?.value || '';
    const list = _histView = _filteredSales();

    // when one product is picked, totals count that product only
    const lineOf = i => (Number(i.priceUsd)||0) * (Number(i.qty)||0);
    const saleTotal = x => prod ? (x.items||[]).filter(i => i.id === prod).reduce((a,i) => a + lineOf(i), 0) : (Number(x.totalUsd)||0);
    const saleQty = x => (x.items||[]).filter(i => !prod || i.id === prod).reduce((a,i) => a + (Number(i.qty)||0), 0);
    const revenue = list.reduce((a,x) => a + saleTotal(x), 0);
    const unpaid = list.reduce((a,x) => a + Math.max(0, (Number(x.totalUsd)||0) - _paidOf(x)), 0);
    const qty = list.reduce((a,x) => a + saleQty(x), 0);

    document.getElementById('sh-kpis').innerHTML = [
      { icon:'💵', v:Currency.formatUSD(revenue), l:t('sh_revenue'), c:'var(--gold-400)' },
      { icon:'🧾', v:list.length, l:t('sh_transactions') },
      { icon:'📦', v:qty, l:t('sh_items') },
      { icon:'📊', v:Currency.formatUSD(list.length ? revenue/list.length : 0), l:t('sh_avg') },
      { icon:'⚠️', v:Currency.formatUSD(unpaid), l:t('sh_unpaid'), c: unpaid > 0 ? 'var(--danger)' : '' },
    ].map(k => `<div class="kpi-card"><div class="kpi-icon">${k.icon}</div><div class="kpi-value"${k.c?` style="color:${k.c}"`:''}>${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');

    // best sellers
    const top = new Map();
    list.forEach(x => (x.items||[]).forEach(i => {
      if (prod && i.id !== prod) return;
      const k = i.id || i.name; if (!top.has(k)) top.set(k, { name: i.name || '—', qty: 0, rev: 0 });
      const o = top.get(k); o.qty += Number(i.qty)||0; o.rev += lineOf(i);
    }));
    const topList = [...top.values()].sort((a,b) => b.rev - a.rev).slice(0, 8);
    const maxRev = topList[0]?.rev || 1;
    document.getElementById('sh-top').innerHTML = `
      <div class="chart-card-header"><div><div class="chart-title">🏆 ${t('sh_top')}</div></div></div>
      ${topList.length ? topList.map(p => `
        <div class="sh-top-row">
          <div class="sh-top-head"><span>${_esc(p.name)}</span><b>${Currency.formatUSD(p.rev)}</b></div>
          <div class="rev-bar-track"><div class="rev-bar-fill" style="width:${Math.max(4, Math.round(p.rev/maxRev*100))}%"></div></div>
          <small>${p.qty} ${t('sh_pcs')}</small>
        </div>`).join('') : `<p class="text-muted text-sm">${t('no_data')}</p>`}`;

    // list grouped by day
    const box = document.getElementById('sh-list');
    if (!list.length) { box.innerHTML = `<div class="sh-empty">🧾<br>${t('sh_no_sales')}</div>`; return; }
    const shown = list.slice(0, _histShown);
    const today = DateUtil.today(), yest = DateUtil.addDays(today, -1);
    const dayTotals = new Map();
    list.forEach(x => { const k = _ymdL(_saleDate(x)); const o = dayTotals.get(k) || { n: 0, sum: 0 }; o.n++; o.sum += saleTotal(x); dayTotals.set(k, o); });
    let html = '', curDay = '';
    shown.forEach(x => {
      const d = _saleDate(x), k = _ymdL(d);
      if (k !== curDay) {
        if (curDay) html += '</div>';
        curDay = k;
        const dt = dayTotals.get(k);
        let wd = ''; try { wd = d.toLocaleDateString(App.lang === 'ar' ? 'ar-LB' : 'en-GB', { weekday: 'long' }); } catch (_) {}
        const rel = k === today ? t('sh_today') : k === yest ? t('sh_yesterday') : wd;
        html += `<div class="sh-day"><div class="sh-day-head"><div><b>${rel}</b><span>${DateUtil.format(k)}</span></div>
                 <div class="sh-day-sum"><span>${(dt.n === 1 ? t('sh_sale_one') : t('sh_sales_count').replace('{n}', dt.n))}</span><b>${Currency.formatUSD(dt.sum)}</b></div></div>`;
      }
      const total = Number(x.totalUsd)||0, owes = Math.max(0, total - _paidOf(x));
      const items = (x.items||[]).map(i => `<span class="sh-chip${prod && i.id === prod ? ' hit' : ''}"><b>${Number(i.qty)||0}×</b> ${_esc(i.name)} <em>${Currency.formatUSD(lineOf(i))}</em></span>`).join('');
      const meth = (x.paymentMethod || 'cash') === 'partial' ? `<span class="sh-pay partial">⊘ ${t('partial')}</span>` : `<span class="sh-pay cash">💵 ${t('cash')}</span>`;
      html += `<div class="sh-sale">
          <div class="sh-time">${_hhmm(d)}</div>
          <div class="sh-items">${items || '—'}</div>
          <div class="sh-cust">${x.customer ? `👤 ${_esc(x.customer)}` : `<span class="text-muted">${t('sh_walk_in')}</span>`}</div>
          <div class="sh-meth">${meth}</div>
          <div class="sh-amt"><b>${Currency.formatUSD(total)}</b>${owes > 0.004 ? `<small>${t('sh_owes')} ${Currency.formatUSD(owes)}</small>` : ''}</div>
        </div>`;
    });
    html += '</div>';
    if (list.length > _histShown) html += `<button type="button" class="btn btn-outline w-full sh-more" onclick="POSModule.moreHistory()">${t('sh_show_more')} (${list.length - _histShown})</button>`;
    box.innerHTML = html;
  }

  function moreHistory() { _histShown += 60; renderHistory(); }

  function exportHistory() {
    const rows = _histView;
    if (!rows.length) { Toast.warning(App.t('sh_no_sales')); return; }
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Date','Time','Customer','Items','Payment','Total USD','Paid USD','Unpaid USD'];
    const lines = rows.map(x => {
      const d = _saleDate(x), total = Number(x.totalUsd)||0, paid = _paidOf(x);
      return [_ymdL(d), _hhmm(d), x.customer || '', (x.items||[]).map(i => `${i.qty}x ${i.name}`).join(' | '),
              x.paymentMethod || 'cash', total.toFixed(2), paid.toFixed(2), Math.max(0, total - paid).toFixed(2)].map(q).join(',');
    });
    const blob = new Blob(['﻿' + [head.map(q).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `venus-sales-${DateUtil.today()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function inventoryModal(){
    return `<div class="modal-overlay" id="modal-inventory">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">${App.t('inventory_manager_title')}</span>
          <button class="modal-close" onclick="Modal.close('modal-inventory')">✕</button>
        </div>
        <div class="modal-body">
          <div class="flex gap-2" style="margin-bottom:16px;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" onclick="POSModule.openAddProduct()">${App.t('add_product_btn')}</button>
          </div>
          <div id="inv-list"></div>
          <div class="modal-overlay" id="modal-product" style="z-index:600">
            <div class="modal modal-sm">
              <div class="modal-header">
                <span class="modal-title" id="prod-modal-title">${App.t('add_product_title')}</span>
                <button class="modal-close" onclick="Modal.close('modal-product')">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">${App.t('pf_image')}</label>
                  <div class="pf-img" id="pf-img-drop" tabindex="0" onclick="POSModule.pickImage()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();POSModule.pickImage()}"
                       ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')"
                       ondrop="event.preventDefault();this.classList.remove('drag');POSModule.onImageFile(event.dataTransfer.files[0])">
                    <img id="pf-img-prev" alt="" hidden>
                    <div class="pf-img-empty" id="pf-img-empty">
                      <div class="pf-img-icon">🖼️</div>
                      <div class="pf-img-title">${App.t('pf_image_pick')}</div>
                      <div class="pf-img-hint">${App.t('pf_image_hint')}</div>
                    </div>
                    <div class="pf-img-busy" id="pf-img-busy" hidden><div class="spinner"></div></div>
                    <div class="pf-img-actions" id="pf-img-actions" hidden>
                      <button type="button" class="btn btn-sm pf-img-btn" onclick="event.stopPropagation();POSModule.pickImage()">🔄 ${App.t('pf_image_change')}</button>
                      <button type="button" class="btn btn-sm pf-img-btn danger" onclick="event.stopPropagation();POSModule.removeImage()">🗑 ${App.t('pf_image_remove')}</button>
                    </div>
                  </div>
                  <input type="file" id="pf-img-file" accept="image/*" hidden onchange="POSModule.onImageFile(this.files[0]);this.value=''">
                </div>
                <div class="form-group"><label class="form-label">${App.t('name_generic')} <span class="required">*</span></label><input class="form-input" id="pf-name"><div class="form-error-msg"></div></div>
                <div class="form-row">
                  <div class="form-group"><label class="form-label">${App.t('price_usd')} <span class="required">*</span></label><input class="form-input" id="pf-price" type="number" min="0"><div class="form-error-msg"></div></div>
                  <div class="form-group"><label class="form-label">${App.t('stock')}</label><input class="form-input" id="pf-stock" type="number" min="0"></div>
                </div>
                <div class="form-group"><label class="form-label">${App.t('category')}</label>
                  <select class="form-select" id="pf-cat">
                    <option value="water">💧 ${App.t('cat_water')}</option><option value="food">🍎 ${App.t('cat_food')}</option>
                    <option value="supplement">💊 ${App.t('cat_supplement')}</option><option value="gear">🥊 ${App.t('cat_gear')}</option>
                    <option value="apparel">👕 ${App.t('cat_apparel')}</option><option value="other">📦 ${App.t('cat_other')}</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-ghost" onclick="Modal.close('modal-product')">${App.t('cancel')}</button>
                <button class="btn btn-primary" onclick="POSModule.saveProduct()">💾 ${App.t('save')}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" onclick="Modal.close('modal-inventory')">${App.t('close')}</button></div>
      </div>
    </div>`;
  }

  let _editProdId=null;
  function openInventory(){
    renderInventoryList();
    Modal.open('modal-inventory');
  }
  function renderInventoryList(){
    const el=document.getElementById('inv-list');
    if(!el)return;
    el.innerHTML=`<div class="table-scroll"><table class="inv-table" style="width:100%"><thead><tr><th></th><th>${App.t('name_generic')}</th><th>${App.t('category')}</th><th>${App.t('price_generic')}</th><th>${App.t('stock')}</th><th>${App.t('actions')}</th></tr></thead><tbody>${
      _products.map(p=>`<tr>
        <td><span class="inv-thumb" data-cat="${_esc(p.category||'other')}" onclick="POSModule.openEditProduct('${p.id}')">${p.image?`<img src="${p.image}" alt="">`:catIcon(p.category)}</span></td>
        <td><b>${_esc(p.name)}</b></td><td>${catIcon(p.category)} ${catLabel(p.category)}</td><td>${Currency.formatUSD(p.priceUsd)}</td><td>${p.stock??'∞'}</td>
        <td style="white-space:nowrap"><button class="btn btn-outline btn-sm" title="${App.t('edit')}" onclick="POSModule.openEditProduct('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="POSModule.delProduct('${p.id}','${_esc(p.name).replace(/'/g,"\\'")}')">🗑</button></td></tr>`).join('')
    }</tbody></table></div>`;
  }

  /* ── Product image (chosen from the computer, compressed in the browser and saved on the product) ── */
  let _pfImage='';
  function _showImage(){
    const img=document.getElementById('pf-img-prev'), has=!!_pfImage;
    if(img){img.hidden=!has; if(has) img.src=_pfImage; else img.removeAttribute('src');}
    document.getElementById('pf-img-empty').hidden=has;
    document.getElementById('pf-img-actions').hidden=!has;
    document.getElementById('pf-img-drop')?.classList.toggle('has-img',has);
  }
  function pickImage(){document.getElementById('pf-img-file')?.click();}
  function removeImage(){_pfImage='';_showImage();}
  function _loadImg(file){
    return new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();
      im.onload=()=>{URL.revokeObjectURL(url);res(im);}; im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad'));}; im.src=url;});
  }
  // longest side ≤ 960px, WebP (JPEG fallback), shrinks until it is small enough for a Firestore document
  async function _compress(file){
    const im=await _loadImg(file);
    let max=960, q=0.82, out='';
    for(let i=0;i<8;i++){
      const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
      const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(im.naturalWidth*k)); c.height=Math.max(1,Math.round(im.naturalHeight*k));
      const g=c.getContext('2d'); g.fillStyle='#14141A'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height);
      out=c.toDataURL('image/webp',q); if(!out.startsWith('data:image/webp')) out=c.toDataURL('image/jpeg',q);
      if(out.length<=220000) break;
      if(q>0.6) q-=0.1; else max=Math.round(max*0.8);
    }
    return out;
  }
  async function onImageFile(file){
    if(!file) return;
    if(!/^image\//.test(file.type)){Toast.warning(App.t('pf_image_bad'));return;}
    const busy=document.getElementById('pf-img-busy'); if(busy) busy.hidden=false;
    try{ _pfImage=await _compress(file); _showImage(); }
    catch(e){ Toast.error(App.t('pf_image_fail')); }
    finally{ if(busy) busy.hidden=true; }
  }

  function _fillProductForm(p={}){
    document.getElementById('pf-name').value=p.name||'';
    document.getElementById('pf-price').value=p.priceUsd??'';
    document.getElementById('pf-stock').value=p.stock??'';
    document.getElementById('pf-cat').value=p.category||'water';
    _pfImage=p.image||''; _showImage();
  }
  function openAddProduct(){_editProdId=null;_fillProductForm();document.getElementById('prod-modal-title').textContent=App.t('add_product_title');Modal.open('modal-product');}
  function openEditProduct(id){
    const p=_products.find(x=>x.id===id); if(!p) return;
    _editProdId=id;_fillProductForm(p);document.getElementById('prod-modal-title').textContent=App.t('edit_product_title');Modal.open('modal-product');
  }
  async function saveProduct(){
    if(!Validate.form([{id:'pf-name',rules:['required'],label:App.t('name_generic')},{id:'pf-price',rules:['required'],label:App.t('price_generic')}]))return;
    const data={name:document.getElementById('pf-name').value.trim(),priceUsd:Number(document.getElementById('pf-price').value)||0,stock:Number(document.getElementById('pf-stock').value)||null,category:document.getElementById('pf-cat').value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      if(!_editProdId){ if(_pfImage) data.image=_pfImage; data.createdAt=firebase.firestore.FieldValue.serverTimestamp(); await _db.collection(COL.PRODUCTS).add(data); }
      else{ data.image=_pfImage||firebase.firestore.FieldValue.delete(); await _db.collection(COL.PRODUCTS).doc(_editProdId).update(data); }
    }catch(e){console.error(e);Toast.error(App.t('error_generic'));return;}
    // keep cart rows in step with the edited product (name / price / picture)
    _cart.forEach(c=>{ if(c.id===_editProdId){ c.name=data.name; c.priceUsd=data.priceUsd; c.category=data.category; c.image=_pfImage||''; } });
    Toast.success(App.t('saved'));Modal.close('modal-product');await loadProducts();renderInventoryList();renderCart();
  }
  function delProduct(id,name){Modal.confirm({title:App.t('delete_product_title'),message:`${App.t('delete_confirm')}<br><strong>${name}</strong>`,type:'danger',confirmText:App.t('delete'),onConfirm:async()=>{await _db.collection(COL.PRODUCTS).doc(id).delete();await loadProducts();renderInventoryList();Toast.success(App.t('deleted'));}});}

  return {render,addToCart,updateQty,clearCart,calcChange,checkout,onSearch,onCat,openInventory,openAddProduct,openEditProduct,saveProduct,delProduct,pickImage,removeImage,onImageFile,viewImage,closeImage,toggleZoom,addFromViewer,
          switchTab,loadHistory,renderHistory,onHistPeriod,onHistSearch,moreHistory,exportHistory};
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Reports Module
// ═══════════════════════════════════════════════════
const ReportsModule = (() => {
  let _db;

  async function render(db) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('reports')}</h1>
          <p class="page-subtitle">${t('reports_subtitle')}</p>
        </div>
        <div class="page-header-right rep-period-bar">
          <div class="subs-date-range" id="rep-date-range" style="display:none">
            <input class="filter-select" type="date" id="rep-date-from" title="${t('from_date')}" onchange="ReportsModule.loadReports()">
            <span class="subs-date-sep">→</span>
            <input class="filter-select" type="date" id="rep-date-to" title="${t('to_date')}" onchange="ReportsModule.loadReports()">
          </div>
          <select class="filter-select" id="rep-period" onchange="ReportsModule.onPeriod()">
            <option value="month">${t('period_this_month')}</option>
            <option value="3month">${t('period_last_3_months')}</option>
            <option value="year">${t('period_this_year')}</option>
            <option value="all">${t('period_all_time')}</option>
            <option value="custom">${t('custom_range')}</option>
          </select>
        </div>
      </div>
      <div class="kpi-grid" id="rep-kpis"><div class="page-loader"><div class="spinner"></div></div></div>
      <div class="reports-grid" id="rep-charts"></div>`;
    FilterMemory.register('reports', { persist: ['rep-period','rep-date-from','rep-date-to'] });
    FilterMemory.restore('reports');
    syncRangeUI();
    await loadReports();
  }

  const _ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  function syncRangeUI() {
    const custom = document.getElementById('rep-period')?.value === 'custom';
    const wrap = document.getElementById('rep-date-range');
    if (wrap) wrap.style.display = custom ? 'flex' : 'none';
  }

  function onPeriod() {
    const custom = document.getElementById('rep-period')?.value === 'custom';
    const f = document.getElementById('rep-date-from'), t = document.getElementById('rep-date-to');
    if (custom) { // sensible starting range: 1st of this month → today
      const now = new Date();
      if (f && !f.value) f.value = _ymd(new Date(now.getFullYear(), now.getMonth(), 1));
      if (t && !t.value) t.value = _ymd(now);
    } else { if (f) f.value = ''; if (t) t.value = ''; }
    syncRangeUI();
    loadReports();
  }

  async function loadReports() {
    FilterMemory.save('reports');
    const period = document.getElementById('rep-period')?.value || 'month';
    const now = new Date();
    let fromDate, toDate = new Date(8640000000000000); // open-ended unless custom
    let periodLabel = {month:App.t('period_this_month'),'3month':App.t('period_last_3_months'),year:App.t('period_this_year'),all:App.t('period_all_time')}[period];
    if(period==='month') fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if(period==='3month') fromDate = new Date(now.getFullYear(), now.getMonth()-3, 1);
    else if(period==='year') fromDate = new Date(now.getFullYear(), 0, 1);
    else if(period==='custom') {
      let f = document.getElementById('rep-date-from')?.value || '';
      let t = document.getElementById('rep-date-to')?.value || '';
      if (f && t && f > t) [f, t] = [t, f]; // tolerate reversed picks
      fromDate = f ? new Date(f + 'T00:00:00') : new Date(2000, 0, 1);
      if (t) toDate = new Date(t + 'T23:59:59.999');
      periodLabel = `${f ? DateUtil.format(f) : '…'} → ${t ? DateUtil.format(t) : '…'}`;
    }
    else fromDate = new Date(2000, 0, 1);
    const inRange = x => { const d = x.createdAt?.toDate?.(); return !!d && d >= fromDate && d <= toDate; };

    try {
      const [subSnap, coSnap, subScSnap, salesSnap, courseSnap] = await Promise.all([
        _db.collection(COL.SUBSCRIBERS).get(),
        _db.collection(COL.COACHES).get(),
        _db.collection(COL.SUBSCRIPTIONS).get(),
        _db.collection(COL.SALES).get(),
        _db.collection(COL.COURSES).get(),
      ]);

      const subs = subScSnap.docs.map(d=>({id:d.id,...d.data()}));
      const sales = salesSnap.docs.map(d=>({id:d.id,...d.data()}));
      const courses = courseSnap.docs.map(d=>({id:d.id,...d.data()}));

      const periodSubs = subs.filter(inRange);
      const periodSales = sales.filter(inRange);
      const periodCourses = courses.filter(inRange);

      const revenue = periodSubs.reduce((t,s)=>t+(s.amountPaid||0),0);
      const salesRev = periodSales.reduce((t,s)=>t+(s.totalUsd||0),0);
      const active = subs.filter(s=>!s.frozen&&!DateUtil.isExpired(s.endDate)).length;
      const expiring = subs.filter(s=>!s.frozen&&DateUtil.isExpiringSoon(s.endDate)).length;
      const coaches = coSnap.size;

      // Courses financials
      const courseStatusOf = c => {
        const today = DateUtil.today();
        if (c.endDate && c.endDate < today) return 'completed';
        if (c.startDate && c.startDate > today) return 'upcoming';
        return 'active';
      };
      const courseStats = periodCourses.map(c=>{
        const members = c.members||[], coachesArr = c.coaches||[], expenses = c.expenses||[];
        const collected = members.reduce((t,m)=>t+(m.amountPaid||0),0);
        const expected = members.reduce((t,m)=>t+(m.fee??c.price??0),0);
        const coachCost = coachesArr.reduce((t,x)=>t+(x.cost||0),0);
        const expenseTotal = expenses.reduce((t,e)=>t+(e.amount||0),0);
        return {
          id:c.id, name:c.name||'—', memberCount:members.length,
          collected, expected, coachCost, expenseTotal,
          net: collected - coachCost - expenseTotal,
        };
      });
      const courseRevenue = courseStats.reduce((t,c)=>t+c.collected,0);
      const courseCoachCost = courseStats.reduce((t,c)=>t+c.coachCost,0);
      const courseExpenseTotal = courseStats.reduce((t,c)=>t+c.expenseTotal,0);
      const courseNetProfit = courseRevenue - courseCoachCost - courseExpenseTotal;
      const activeCourses = courses.filter(c=>courseStatusOf(c)!=='completed').length;

      // Outgoings & net profit (same period as the revenue figures)
      const coachCommissionTotal = periodSubs.reduce((t,s)=>t+(s.coachName?(s.amountPaid||0)*(s.coachCommission||0)/100:0),0);
      const courseCostsTotal = courseCoachCost + courseExpenseTotal;
      const totalRevenue = revenue + salesRev + courseRevenue;
      const totalOutgoings = coachCommissionTotal + courseCostsTotal;
      const netProfit = totalRevenue - totalOutgoings;

      // KPIs
      document.getElementById('rep-kpis').innerHTML = [
        {icon:'💰',value:Currency.formatUSD(revenue),label:App.t('subscription_revenue'),change:''},
        {icon:'🛒',value:Currency.formatUSD(salesRev),label:App.t('pos_revenue'),change:''},
        {icon:'🎓',value:Currency.formatUSD(courseRevenue),label:App.t('courses_revenue'),change:''},
        {icon:'💵',value:Currency.formatUSD(totalRevenue),label:App.t('total_revenue'),change:'',color:'var(--gold-400)'},
        {icon:'🤝',value:Currency.formatUSD(coachCommissionTotal),label:App.t('coach_commissions'),change:'',color:'var(--warning)'},
        {icon:'🧾',value:Currency.formatUSD(courseCostsTotal),label:App.t('course_costs_kpi'),change:'',color:'var(--warning)'},
        {icon:'📤',value:Currency.formatUSD(totalOutgoings),label:App.t('total_outgoings'),change:'',color:'var(--danger)'},
        {icon:'📈',value:Currency.formatUSD(netProfit),label:App.t('total_net_profit'),change:'',color:netProfit>=0?'var(--success)':'var(--danger)'},
        {icon:'👥',value:active,label:App.t('active_subs'),change:''},
        {icon:'📚',value:activeCourses,label:App.t('active_courses_lbl'),change:''},
        {icon:'⚠️',value:expiring,label:App.t('expiring_soon_lbl').replace('{n}',AppSettings.expiringDays),change:''},
        {icon:'🏋️',value:coaches,label:App.t('total_coaches'),change:''},
      ].map(k=>`
        <div class="kpi-card">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-value"${k.color?` style="color:${k.color}"`:''}>${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>`).join('');

      // Sport breakdown
      const sportMap = {};
      subs.forEach(s=>{
        const key = s.sportName||'Unknown';
        if(!sportMap[key]) sportMap[key]={name:key,count:0,revenue:0};
        sportMap[key].count++; sportMap[key].revenue+=(s.amountPaid||0);
      });
      const sportList = Object.values(sportMap).sort((a,b)=>b.revenue-a.revenue);
      const maxRev = sportList[0]?.revenue||1;

      // Coach commission
      const coachMap = {};
      periodSubs.forEach(s=>{
        if(!s.coachName) return;
        const key=s.coachName;
        if(!coachMap[key]) coachMap[key]={name:key,subs:0,revenue:0,commission:s.coachCommission||0,due:0};
        coachMap[key].subs++; coachMap[key].revenue+=(s.amountPaid||0);
        coachMap[key].due+=(s.amountPaid||0)*(s.coachCommission||0)/100;
      });
      const coachList = Object.values(coachMap);

      document.getElementById('rep-charts').innerHTML = `
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">${App.t('revenue_by_sport')}</div><div class="chart-subtitle">${App.t('all_time_word')}</div></div>
          </div>
          ${sportList.map(s=>`
            <div class="rev-bar-row">
              <span class="rev-bar-label">${s.name}</span>
              <div class="rev-bar-track"><div class="rev-bar-fill" style="width:${Math.round(s.revenue/maxRev*100)}%"></div></div>
              <span class="rev-bar-value">${Currency.formatUSD(s.revenue)}</span>
            </div>`).join('')||`<p class="text-muted text-sm">${App.t('no_data')}</p>`}
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">${App.t('coach_commissions')}</div><div class="chart-subtitle">${App.t('due_this_period')}</div></div>
          </div>
          ${coachList.length?`
          <div class="table-scroll">
          <table class="commission-table" style="width:100%">
            <thead><tr><th>${App.t('coach')}</th><th>${App.t('subscribers_col')}</th><th>${App.t('revenue_col')}</th><th>${App.t('commission_pct')}</th><th>${App.t('commission_usd')}</th></tr></thead>
            <tbody>${coachList.map(c=>`<tr>
              <td>${c.name}</td><td>${c.subs}</td><td>${Currency.formatUSD(c.revenue)}</td>
              <td>${c.commission}%</td><td>${Currency.formatUSD(c.due)}</td>
            </tr>`).join('')}</tbody>
          </table></div>`:`<p class="text-muted text-sm">${App.t('no_coach_assignments')}</p>`}
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">${App.t('subscription_status_title')}</div></div>
          </div>
          ${['active','expiring','expired','frozen'].map(st=>{
            const count=subs.filter(s=>{if(st==='frozen')return !!s.frozen;if(s.frozen)return false;if(st==='active')return !DateUtil.isExpired(s.endDate)&&!DateUtil.isExpiringSoon(s.endDate);if(st==='expiring')return DateUtil.isExpiringSoon(s.endDate);return DateUtil.isExpired(s.endDate);}).length;
            const colors={active:'var(--success)',expiring:'var(--warning)',expired:'var(--danger)',frozen:'#60a5fa'};
            const labels={active:App.t('active'),expiring:App.t('expiring_soon'),expired:App.t('expired'),frozen:'❄ '+App.t('frozen_word')};
            return `<div class="rev-bar-row"><span class="rev-bar-label" style="color:${colors[st]}">${labels[st]}</span><div class="rev-bar-track"><div class="rev-bar-fill" style="width:${subs.length?Math.round(count/subs.length*100):0}%;background:${colors[st]}"></div></div><span class="rev-bar-value" style="color:${colors[st]}">${count}</span></div>`;
          }).join('')}
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><div><div class="chart-title">${App.t('pos_sales_summary')}</div></div></div>
          <div class="detail-row"><span class="detail-label">${App.t('total_transactions')}</span><span class="detail-value">${periodSales.length}</span></div>
          <div class="detail-row"><span class="detail-label">${App.t('total_revenue')}</span><span class="detail-value" style="color:var(--gold-400)">${Currency.formatUSD(salesRev)}</span></div>
          <div class="detail-row"><span class="detail-label">${App.t('avg_per_sale')}</span><span class="detail-value">${Currency.formatUSD(periodSales.length?salesRev/periodSales.length:0)}</span></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">${App.t('revenue_mix_title')}</div><div class="chart-subtitle">${periodLabel}</div></div>
          </div>
          ${(()=>{
            const mixMax = Math.max(revenue, salesRev, courseRevenue, 1);
            const mix = [
              {label:App.t('subscription_revenue'), val:revenue, color:'var(--gold-400)'},
              {label:App.t('pos_revenue'), val:salesRev, color:'var(--info)'},
              {label:App.t('courses_revenue'), val:courseRevenue, color:'var(--success)'},
            ];
            return mix.map(m=>`
              <div class="rev-bar-row">
                <span class="rev-bar-label">${m.label}</span>
                <div class="rev-bar-track"><div class="rev-bar-fill" style="width:${Math.round(m.val/mixMax*100)}%;background:${m.color}"></div></div>
                <span class="rev-bar-value">${Currency.formatUSD(m.val)}</span>
              </div>`).join('');
          })()}
          <div class="detail-row" style="margin-top:10px;border-top:1px solid var(--border-subtle);padding-top:10px">
            <span class="detail-label">${App.t('total_revenue')}</span>
            <span class="detail-value" style="color:var(--gold-400);font-weight:700">${Currency.formatUSD(revenue+salesRev+courseRevenue)}</span>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><div><div class="chart-title">${App.t('courses_performance_title')}</div><div class="chart-subtitle">${App.t('due_this_period')}</div></div></div>
          <div class="detail-row"><span class="detail-label">${App.t('courses_collected')}</span><span class="detail-value" style="color:var(--success)">${Currency.formatUSD(courseRevenue)}</span></div>
          <div class="detail-row"><span class="detail-label">${App.t('coach_cost_expenses')}</span><span class="detail-value" style="color:var(--warning)">${Currency.formatUSD(courseCoachCost+courseExpenseTotal)}</span></div>
          <div class="detail-row"><span class="detail-label">${App.t('net_profit')}</span><span class="detail-value" style="color:${courseNetProfit>=0?'var(--success)':'var(--danger)'};font-weight:700">${Currency.formatUSD(courseNetProfit)}</span></div>
          ${courseStats.length?`
          <div class="table-scroll" style="margin-top:14px">
          <table class="commission-table" style="width:100%">
            <thead><tr><th>${App.t('course_word')}</th><th>${App.t('tab_members')}</th><th>${App.t('collected')}</th><th>${App.t('net_col')}</th></tr></thead>
            <tbody>${courseStats.sort((a,b)=>b.net-a.net).map(c=>`<tr>
              <td>${c.name}</td><td>${c.memberCount}</td><td>${Currency.formatUSD(c.collected)}</td>
              <td style="color:${c.net>=0?'var(--success)':'var(--danger)'}">${Currency.formatUSD(c.net)}</td>
            </tr>`).join('')}</tbody>
          </table></div>`:`<p class="text-muted text-sm" style="margin-top:10px">${App.t('no_courses_data')}</p>`}
        </div>`;
    } catch(e) {
      document.getElementById('rep-kpis').innerHTML = `<p style="color:var(--danger)">${App.t('failed_load_reports')}</p>`;
    }
  }

  return { render, loadReports, onPeriod };
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Diet & Workout Module
// ═══════════════════════════════════════════════════
const DietModule = (() => {
  let _db, _subscribers=[], _editId=null;

  async function render(db) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('diet')}</h1>
          <p class="page-subtitle">${t('diet_subtitle')}</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="DietModule.openNew()">+ ${t('assign_plan')}</button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap"><span class="search-icon">🔍</span>
          <input class="search-input" id="diet-search" placeholder="${t('search_by_subscriber')}" oninput="DietModule.onSearch(this.value)">
        </div>
        ${FilterMemory.resetButton('diet')}
      </div>
      <div id="diet-plans-list"></div>
      ${buildModal()}`;
    const snap = await _db.collection(COL.SUBSCRIBERS).orderBy('name').get();
    _subscribers = snap.docs.map(d=>({id:d.id,...d.data()}));
    const subSel=document.getElementById('dp-subscriber');
    if(subSel) _subscribers.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;subSel.appendChild(o);});
    FilterMemory.register('diet', { session: ['diet-search'], onReset: () => loadPlans() });
    FilterMemory.restore('diet');
    await loadPlans();
  }

  async function loadPlans(q) {
    if (q === undefined) q = document.getElementById('diet-search')?.value || ''; // keep the search after saves/deletes
    const snap = await _db.collection(COL.DIET_PLANS).orderBy('createdAt','desc').get();
    const plans = snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(p=>!q||p.subscriberName?.toLowerCase().includes(q.toLowerCase()));
    const el = document.getElementById('diet-plans-list');
    if(!plans.length){el.innerHTML=`<p class="text-muted">${App.t('no_data')}</p>`;return;}
    el.innerHTML=plans.map(p=>`
      <div class="card" style="margin-bottom:14px">
        <div class="flex items-center gap-3" style="margin-bottom:14px;justify-content:space-between">
          <div class="flex items-center gap-3">
            <div class="avatar">${initials(p.subscriberName)}</div>
            <div><div style="font-weight:700">${p.subscriberName}</div><div style="font-size:12px;color:var(--text-muted)">${p.goal||''} · ${DateUtil.format(p.createdAt)}</div></div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="DietModule.openEdit('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="DietModule.del('${p.id}')">🗑</button>
          </div>
        </div>
        <div class="plan-section">
          <div>
            <div class="form-section-title">${App.t('meal_plan_title')}</div>
            ${(p.meals||[]).map(m=>`
              <div class="meal-row"><span class="meal-time">${m.time}</span><span class="meal-name">${m.name}</span><span class="meal-cals">${m.calories||''}${m.calories?' '+App.t('kcal_word'):''}</span></div>
            `).join('')||`<p class="text-muted text-sm">${App.t('no_meals')}</p>`}
          </div>
          <div>
            <div class="form-section-title">${App.t('workout_plan_title')}</div>
            ${(p.exercises||[]).map((e,i)=>`
              <div class="workout-exercise"><div class="exercise-num">${i+1}</div><div class="exercise-info"><div class="exercise-name">${e.name}</div><div class="exercise-sets">${e.sets||0} ${App.t('sets_reps')}${e.reps||0} ${App.t('reps_word')} ${e.weight?'@ '+e.weight+'kg':''}</div></div></div>
            `).join('')||`<p class="text-muted text-sm">${App.t('no_exercises')}</p>`}
          </div>
        </div>
      </div>`).join('');
  }

  const onSearch = debounce(v=>{ FilterMemory.save('diet'); loadPlans(v); },280);

  function buildModal(){
    return `<div class="modal-overlay" id="modal-diet">
      <div class="modal modal-xl">
        <div class="modal-header">
          <span class="modal-title" id="diet-modal-title">${App.t('assign_plan_title')}</span>
          <button class="modal-close" onclick="Modal.close('modal-diet')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">${App.t('subscriber_singular')} <span class="required">*</span></label><select class="form-select" id="dp-subscriber"><option value="">${App.t('select_placeholder')}</option></select><div class="form-error-msg"></div></div>
            <div class="form-group"><label class="form-label">${App.t('goal_word')}</label><input class="form-input" id="dp-goal" placeholder="${App.t('goal_placeholder')}"></div>
          </div>
          <div class="plan-section" style="margin-top:16px">
            <div>
              <div class="form-section-title">${App.t('meal_plan_title')}</div>
              <div id="meals-list"></div>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="DietModule.addMeal()">${App.t('add_meal_btn')}</button>
            </div>
            <div>
              <div class="form-section-title">${App.t('workout_exercises_title')}</div>
              <div id="exercises-list"></div>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="DietModule.addExercise()">${App.t('add_exercise_btn')}</button>
            </div>
          </div>
          <div class="form-row cols-1" style="margin-top:16px">
            <div class="form-group"><label class="form-label">${App.t('notes')}</label><textarea class="form-textarea" id="dp-notes" rows="2"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-diet')">${App.t('cancel')}</button>
          <button class="btn btn-primary" onclick="DietModule.save()">💾 ${App.t('save')}</button>
        </div>
      </div>
    </div>`;
  }

  let _meals=[], _exercises=[];
  function renderMeals(){
    const el=document.getElementById('meals-list');
    if(!el)return;
    el.innerHTML=_meals.map((m,i)=>`
      <div class="flex gap-2" style="margin-bottom:8px;flex-wrap:wrap">
        <input class="form-input" style="width:80px" value="${m.time}" placeholder="08:00" oninput="_dietMeals[${i}].time=this.value">
        <input class="form-input" style="flex:1;min-width:120px" value="${m.name}" placeholder="${App.t('meal_name_placeholder')}" oninput="_dietMeals[${i}].name=this.value">
        <input class="form-input" style="width:80px" value="${m.calories||''}" placeholder="${App.t('kcal_word')}" type="number" oninput="_dietMeals[${i}].calories=Number(this.value)">
        <button class="btn btn-danger btn-sm btn-icon" onclick="DietModule.removeMeal(${i})">✕</button>
      </div>`).join('');
    window._dietMeals=_meals;
  }
  function addMeal(){_meals.push({time:'',name:'',calories:0});renderMeals();}
  function removeMeal(i){_meals.splice(i,1);renderMeals();}

  function renderExercises(){
    const el=document.getElementById('exercises-list');
    if(!el)return;
    el.innerHTML=_exercises.map((e,i)=>`
      <div class="flex gap-2" style="margin-bottom:8px;flex-wrap:wrap">
        <input class="form-input" style="flex:1;min-width:100px" value="${e.name}" placeholder="${App.t('exercise_placeholder')}" oninput="_dietEx[${i}].name=this.value">
        <input class="form-input" style="width:60px" value="${e.sets||''}" placeholder="${App.t('sets_placeholder')}" type="number" oninput="_dietEx[${i}].sets=Number(this.value)">
        <input class="form-input" style="width:60px" value="${e.reps||''}" placeholder="${App.t('reps_placeholder')}" type="number" oninput="_dietEx[${i}].reps=Number(this.value)">
        <input class="form-input" style="width:70px" value="${e.weight||''}" placeholder="kg" type="number" oninput="_dietEx[${i}].weight=Number(this.value)">
        <button class="btn btn-danger btn-sm btn-icon" onclick="DietModule.removeExercise(${i})">✕</button>
      </div>`).join('');
    window._dietEx=_exercises;
  }
  function addExercise(){_exercises.push({name:'',sets:3,reps:10,weight:0});renderExercises();}
  function removeExercise(i){_exercises.splice(i,1);renderExercises();}

  function openNew(){
    _editId=null; _meals=[]; _exercises=[];
    document.getElementById('diet-modal-title').textContent=App.t('assign_plan_title');
    document.getElementById('dp-subscriber').value='';
    document.getElementById('dp-goal').value='';
    document.getElementById('dp-notes').value='';
    renderMeals(); renderExercises();
    Modal.open('modal-diet');
  }

  async function openEdit(id){
    _editId=id;
    const doc=await _db.collection(COL.DIET_PLANS).doc(id).get();
    const d=doc.data(); _meals=[...(d.meals||[])]; _exercises=[...(d.exercises||[])];
    document.getElementById('diet-modal-title').textContent=App.t('edit_plan_title');
    document.getElementById('dp-subscriber').value=d.subscriberId||'';
    document.getElementById('dp-goal').value=d.goal||'';
    document.getElementById('dp-notes').value=d.notes||'';
    renderMeals(); renderExercises();
    Modal.open('modal-diet');
  }

  async function save(){
    if(!Validate.form([{id:'dp-subscriber',rules:['required'],label:App.t('subscriber_singular')}]))return;
    const subId=document.getElementById('dp-subscriber').value;
    const sub=_subscribers.find(s=>s.id===subId);
    const data={subscriberId:subId,subscriberName:sub?.name||'',goal:document.getElementById('dp-goal').value.trim(),notes:document.getElementById('dp-notes').value.trim(),meals:window._dietMeals||_meals,exercises:window._dietEx||_exercises,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      if(_editId){await _db.collection(COL.DIET_PLANS).doc(_editId).update(data);}
      else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await _db.collection(COL.DIET_PLANS).add(data);}
      Toast.success(App.t('saved')); Modal.close('modal-diet'); await loadPlans();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  function del(id){Modal.confirm({title:App.t('delete_plan_title'),message:App.t('delete_confirm'),type:'danger',confirmText:App.t('delete'),onConfirm:async()=>{await _db.collection(COL.DIET_PLANS).doc(id).delete();Toast.success(App.t('deleted'));await loadPlans();}});}

  return {render,openNew,openEdit,save,del,onSearch,addMeal,removeMeal,addExercise,removeExercise};
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — User Management (Super Admin Only)
// ═══════════════════════════════════════════════════
const UsersModule = (() => {
  let _db, _users=[];

  async function render(db, profile) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('user_mgmt')}</h1>
          <p class="page-subtitle">${t('users_subtitle')}</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="UsersModule.openCreate()">+ ${t('create_user')}</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>#</th><th>${t('name_generic')}</th><th>${t('email_lbl')}</th><th>${t('role')}</th>
              <th>${t('created_col')}</th><th>${t('status_lbl')}</th><th>${t('actions')}</th>
            </tr></thead>
            <tbody id="users-tbody"><tr><td colspan="7" class="table-empty">${t('loading')}</td></tr></tbody>
          </table>
        </div>
      </div>
      ${buildModal()}`;
    await loadUsers();
  }

  async function loadUsers() {
    const snap = await _db.collection(COL.USERS).orderBy('createdAt','desc').get();
    _users = snap.docs.map(d=>({id:d.id,...d.data()}));
    const tbody = document.getElementById('users-tbody');
    const roleColors={super_admin:'badge-admin',admin:'badge-gold',coach:'badge-coach',receptionist:'badge-info',subscriber:'badge-subscriber'};
    tbody.innerHTML = _users.map((u,i)=>{
      const roleColor=roleColors[u.role]||'badge-info';
      const isActive=u.active!==false;
      const name=u.displayName||u.name||'—';
      const created=DateUtil.format(u.createdAt);
      const esc=name.replace(/'/g,"\\'");
      const toggleBtn=u.role!=='super_admin'
        ?`<button class="btn btn-${isActive?'danger':'success'} btn-sm" onclick="UsersModule.toggleActive('${u.id}','${isActive}','${esc}')">${isActive?'🚫 '+App.t('disable_btn'):'✓ '+App.t('enable_btn')}</button>`
        :'';
      return `<tr>
        <td class="dt-only" style="color:var(--text-muted)">${i+1}</td>
        <td class="dt-only"><div class="flex items-center gap-2"><div class="avatar">${initials(name)}</div><strong>${name}</strong></div></td>
        <td class="dt-only" style="font-size:12px">${u.email||'—'}</td>
        <td class="dt-only"><span class="badge ${roleColor}">${App.t(u.role)||u.role}</span></td>
        <td class="dt-only" style="font-size:12px">${created}</td>
        <td class="dt-only"><span class="badge ${isActive?'badge-active':'badge-expired'}">${isActive?App.t('active'):App.t('inactive_status')}</span></td>
        <td class="dt-only"><div class="flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="UsersModule.openEdit('${u.id}')">✏️</button>
          ${toggleBtn}
        </div></td>
        <td class="mob-only" colspan="7" style="padding:6px 0;border:none">
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div class="flex items-center gap-2">
                <div class="avatar">${initials(name)}</div>
                <div><div style="font-weight:700;font-size:14px">${name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${u.email||''}</div></div>
              </div>
              <span class="badge ${roleColor}">${App.t(u.role)||u.role}</span>
            </div>
            <div class="mobile-card-body">
              <div class="mobile-card-row"><span>${App.t('status_lbl')}</span><span class="badge ${isActive?'badge-active':'badge-expired'}">${isActive?App.t('active'):App.t('inactive_status')}</span></div>
              <div class="mobile-card-row"><span>${App.t('created_col')}</span><span>${created}</span></div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-outline btn-sm" onclick="UsersModule.openEdit('${u.id}')">✏️ ${App.t('edit')}</button>
              ${toggleBtn}
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function buildModal(){
    const t=App.t.bind(App);
    return `<div class="modal-overlay" id="modal-user">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="user-modal-title">${t('create_user')}</span>
          <button class="modal-close" onclick="Modal.close('modal-user')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">${t('full_name_lbl')} <span class="required">*</span></label><input class="form-input" id="uf-name"><div class="form-error-msg"></div></div>
          <div class="form-group"><label class="form-label">${t('email_lbl')} <span class="required">*</span></label><input class="form-input" id="uf-email" type="email"><div class="form-error-msg"></div></div>
          <div class="form-group" id="uf-pw-group">
            <label class="form-label">${t('password')} <span class="required">*</span></label>
            <div class="input-icon-wrap"><input class="form-input" id="uf-password" type="password" placeholder="${t('min_6_chars')}"></div>
            <div class="form-hint">${t('password_hint')}</div>
            <div class="form-error-msg"></div>
          </div>
          <div class="form-group"><label class="form-label">${t('role')} <span class="required">*</span></label>
            <select class="form-select" id="uf-role">
              <option value="admin">${t('admin')}</option>
              <option value="coach">${t('coach_role')}</option>
              <option value="receptionist">${t('receptionist')}</option>
              <option value="subscriber">${t('subscriber_role')}</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">${t('phone')}</label><input class="form-input" id="uf-phone" data-phone></div>
          <div id="uf-notice" class="auth-error" style="display:none;margin-top:10px"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-user')">${t('cancel')}</button>
          <button class="btn btn-primary" id="uf-save-btn" onclick="UsersModule.save()">💾 ${t('create_user')}</button>
        </div>
      </div>
    </div>`;
  }

  let _editUserId = null;
  function openCreate(){
    _editUserId=null;
    ['uf-name','uf-email','uf-password','uf-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('uf-role').value='admin';
    document.getElementById('uf-pw-group').style.display='';
    document.getElementById('user-modal-title').textContent=App.t('create_user');
    document.getElementById('uf-save-btn').textContent='💾 '+App.t('create_user');
    Modal.open('modal-user');
  }

  function openEdit(id){
    _editUserId=id;
    const u=_users.find(x=>x.id===id); if(!u)return;
    document.getElementById('uf-name').value=u.displayName||u.name||'';
    document.getElementById('uf-email').value=u.email||'';
    document.getElementById('uf-password').value='';
    document.getElementById('uf-phone').value=u.phone||'';
    document.getElementById('uf-role').value=u.role||'admin';
    document.getElementById('uf-pw-group').style.display='none';
    document.getElementById('user-modal-title').textContent=App.t('edit')+': '+(u.displayName||u.name);
    document.getElementById('uf-save-btn').textContent='💾 '+App.t('save');
    Modal.open('modal-user');
  }

  async function save(){
    const notice=document.getElementById('uf-notice');
    notice.style.display='none';
    if(!Validate.form([
      {id:'uf-name',rules:['required'],label:App.t('name_generic')},
      {id:'uf-email',rules:['required','email'],label:App.t('email_lbl')},
      ...(!_editUserId?[{id:'uf-password',rules:['required'],label:App.t('password')}]:[]),
    ]))return;

    const name=document.getElementById('uf-name').value.trim();
    const email=document.getElementById('uf-email').value.trim();
    const password=document.getElementById('uf-password').value;
    const role=document.getElementById('uf-role').value;
    const phone=document.getElementById('uf-phone').value.trim();

    if(_editUserId){
      // Update Firestore profile only (cannot change email/password without Admin SDK — show note)
      try{
        await _db.collection(COL.USERS).doc(_editUserId).update({displayName:name,name,role,phone,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        Toast.success(App.t('saved')); Modal.close('modal-user'); await loadUsers();
      }catch(e){Toast.error(App.t('error_generic'));}
    } else {
      // Create Firebase Auth user — requires Admin SDK on server side
      // As a client-only app, we create user via createUserWithEmailAndPassword using secondary auth instance
      try{
        const secondaryApp = firebase.apps.length > 1
          ? firebase.apps[1]
          : firebase.initializeApp(FIREBASE_CONFIG, 'secondary');
        const secondaryAuth = secondaryApp.auth();
        const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({displayName: name});
        await _db.collection(COL.USERS).doc(cred.user.uid).set({
          uid:cred.user.uid, name, displayName:name, email, role, phone,
          active:true, createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        });
        await secondaryAuth.signOut();
        Toast.success(App.t('user_created_success').replace('{name}', name));
        Modal.close('modal-user'); await loadUsers();
      }catch(e){
        const msgs={'auth/email-already-in-use':App.t('email_in_use_msg'),'auth/weak-password':App.t('weak_password_msg')};
        notice.textContent=msgs[e.code]||App.t('error_generic');
        notice.style.display='block';
      }
    }
  }

  async function toggleActive(id, currentlyActive, name){
    const willDisable = currentlyActive==='true';
    Modal.confirm({
      title: willDisable?App.t('disable_user_title'):App.t('enable_user_title'),
      message: `${willDisable?App.t('disable_btn'):App.t('enable_btn')} — <strong>${name}</strong>?`,
      type: willDisable?'danger':'success',
      confirmText: willDisable?App.t('disable_btn'):App.t('enable_btn'),
      onConfirm: async()=>{
        await _db.collection(COL.USERS).doc(id).update({active:!willDisable});
        Toast.success(willDisable?App.t('user_disabled_msg'):App.t('user_enabled_msg'));
        await loadUsers();
      }
    });
  }

  return {render,openCreate,openEdit,save,toggleActive};
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Settings Module
// ═══════════════════════════════════════════════════
const SettingsModule = (() => {
  let _db;

  async function render(db) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">${t('settings')}</h1></div>
      </div>
      <div class="settings-layout">
        <div class="settings-nav">
          ${[['gym','🏋️',t('gym_info_tab')],['subs','⏳',t('subs_settings_tab')],['currency','💰',t('currency_tab')],['datefmt','📅',t('date_format_tab')],['whatsapp','💬',t('whatsapp_tab')]].map(([id,icon,label])=>
            `<div class="settings-nav-item${id==='gym'?' active':''}" data-tab="${id}" onclick="SettingsModule.switchTab('${id}')">${icon} ${label}</div>`
          ).join('')}
        </div>
        <div id="settings-content"></div>
      </div>`;
    switchTab('gym');
  }

  async function switchTab(tab) {
    document.querySelectorAll('.settings-nav-item').forEach(el=>{
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    const content = document.getElementById('settings-content');
    if(!content)return;

    if(tab==='gym'){
      let gymData = {};
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists)gymData=d.data();}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">🏋️ ${App.t('gym_info')}</div>
          <div class="form-group"><label class="form-label">${App.t('gym_name_lbl')}</label><input class="form-input" id="set-gym-name" value="${gymData.gymName||'Venus Gym'}"></div>
          <div class="form-group"><label class="form-label">${App.t('phone')}</label><input class="form-input" id="set-gym-phone" data-phone value="${gymData.gymPhone||''}"></div>
          <div class="form-group"><label class="form-label">${App.t('address_generic')}</label><input class="form-input" id="set-gym-address" value="${gymData.gymAddress||''}"></div>
          <div class="form-group"><label class="form-label">${App.t('whatsapp_number_lbl')}</label><input class="form-input" id="set-gym-wa" data-phone value="${gymData.whatsappNumber||''}"></div>
          <button class="btn btn-primary" onclick="SettingsModule.saveGym()">💾 ${App.t('save')}</button>
        </div>`;
    } else if(tab==='subs'){
      let days = AppSettings.expiringDays;
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists&&d.data().expiringSoonDays!=null)days=d.data().expiringSoonDays;}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">⏳ ${App.t('expiring_setting_title')}</div>
          <p class="text-muted" style="font-size:13px;margin:-4px 0 16px">${App.t('expiring_setting_desc')}</p>
          <div class="exp-days-row">
            <button type="button" class="btn btn-outline exp-step" onclick="SettingsModule.stepExpiring(-1)">−</button>
            <div class="exp-days-box">
              <input class="form-input" id="set-exp-days" type="number" min="1" max="90" step="1" value="${days}" oninput="SettingsModule.previewExpiring()">
              <span>${App.t('days_word')}</span>
            </div>
            <button type="button" class="btn btn-outline exp-step" onclick="SettingsModule.stepExpiring(1)">+</button>
          </div>
          <div class="exp-chips">
            ${[3,4,5,7,10,14,30].map(n=>`<button type="button" class="exp-chip" data-n="${n}" onclick="SettingsModule.setExpiring(${n})">${n}</button>`).join('')}
          </div>
          <div class="exp-preview" id="exp-preview"></div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="SettingsModule.saveExpiring()">💾 ${App.t('save')}</button>
        </div>`;
      previewExpiring();
    } else if(tab==='currency'){
      let rate = 89500;
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists)rate=d.data().dollarRate||89500;}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">${App.t('dollar_rate_title')}</div>
          <div class="rate-display" style="margin-bottom:20px">
            <div><div class="rate-usd">$1</div><div class="rate-label">USD</div></div>
            <div class="rate-arrow">→</div>
            <div><div class="rate-lbp" id="rate-preview">${Number(rate).toLocaleString()}</div><div class="rate-label">LBP</div></div>
          </div>
          <div class="form-group">
            <label class="form-label">${App.t('usd_to_lbp_rate_lbl')} <span class="required">*</span></label>
            <input class="form-input" id="set-rate" type="number" value="${rate}" oninput="document.getElementById('rate-preview').textContent=Number(this.value).toLocaleString()">
            <div class="form-hint">${App.t('rate_hint')}</div>
          </div>
          <button class="btn btn-primary" onclick="SettingsModule.saveRate()">${App.t('save_rate_btn')}</button>
        </div>`;
    } else if(tab==='datefmt'){
      let fmt = AppSettings.dateFormat;
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists&&d.data().dateFormat&&DateUtil.FORMATS[d.data().dateFormat])fmt=d.data().dateFormat;}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">📅 ${App.t('date_format_title')}</div>
          <p class="text-muted" style="font-size:13px;margin:-4px 0 12px">${App.t('date_format_desc')}</p>
          <div class="exp-chips" id="date-fmt-chips">
            ${Object.keys(DateUtil.FORMATS).map(k=>`<button type="button" class="exp-chip${k===fmt?' active':''}" data-fmt="${k}" onclick="SettingsModule.pickDateFormat('${k}')">${_fmtSample(k)}</button>`).join('')}
          </div>
          <div class="exp-preview" id="date-fmt-preview"></div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="SettingsModule.saveDateFormat()">💾 ${App.t('save')}</button>
        </div>`;
      _pickedFmt = fmt; _previewDateFormat();
    } else if(tab==='whatsapp'){
      content.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
      await WaSettings.render(content,_db);
    }
  }

  async function saveGym(){
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({gymName:document.getElementById('set-gym-name')?.value||'',gymPhone:document.getElementById('set-gym-phone')?.value||'',gymAddress:document.getElementById('set-gym-address')?.value||'',whatsappNumber:document.getElementById('set-gym-wa')?.value||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Toast.success(App.t('saved'));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  /* ── Expiring-soon window ── */
  function _expVal(){
    const v=Math.round(Number(document.getElementById('set-exp-days')?.value));
    return Number.isFinite(v)?Math.min(90,Math.max(1,v)):AppSettings.expiringDays;
  }
  function setExpiring(n){const el=document.getElementById('set-exp-days');if(el){el.value=n;previewExpiring();}}
  function stepExpiring(d){setExpiring(Math.min(90,Math.max(1,_expVal()+d)));}
  function previewExpiring(){
    const n=_expVal();
    document.querySelectorAll('.exp-chip').forEach(c=>c.classList.toggle('active',Number(c.dataset.n)===n));
    const el=document.getElementById('exp-preview'); if(!el) return;
    const example=DateUtil.addDays(DateUtil.today(),n);
    el.innerHTML=App.t('expiring_setting_example').replace('{n}',`<b>${n}</b>`).replace('{date}',`<b>${DateUtil.format(example)}</b>`);
  }
  async function saveExpiring(){
    const n=_expVal();
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({expiringSoonDays:n,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      AppSettings.setExpiringDays(n);
      document.getElementById('set-exp-days').value=n; previewExpiring();
      Toast.success(App.t('expiring_setting_saved').replace('{n}',n));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  /* ── Date display format ── */
  let _pickedFmt = null;
  function _fmtSample(k, d = DateUtil.today()){
    const prev=AppSettings.dateFormat; AppSettings.dateFormat=k;
    try{ return DateUtil.format(d); } finally { AppSettings.dateFormat=prev; }
  }
  function _previewDateFormat(){
    const el=document.getElementById('date-fmt-preview'); if(!el||!_pickedFmt) return;
    const a=DateUtil.today(), b=DateUtil.addMonths(a,1);
    el.innerHTML=App.t('date_format_example').replace('{a}',`<b>${_fmtSample(_pickedFmt,a)}</b>`).replace('{b}',`<b>${_fmtSample(_pickedFmt,b)}</b>`);
  }
  function pickDateFormat(k){
    if(!DateUtil.FORMATS[k]) return;
    _pickedFmt=k;
    document.querySelectorAll('#date-fmt-chips .exp-chip').forEach(c=>c.classList.toggle('active',c.dataset.fmt===k));
    _previewDateFormat();
  }
  async function saveDateFormat(){
    const k=_pickedFmt||AppSettings.dateFormat;
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({dateFormat:k,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      AppSettings.setDateFormat(k);
      Toast.success(App.t('date_format_saved').replace('{d}',DateUtil.format(DateUtil.today())));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  async function saveRate(){
    const rate=Number(document.getElementById('set-rate')?.value)||89500;
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({dollarRate:rate,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Currency.setRate(rate);
      Toast.success(App.t('rate_updated_msg').replace('{rate}', rate.toLocaleString()));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  async function saveWA(){
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({ultraMsgInstance:document.getElementById('set-wa-instance')?.value||'',ultraMsgToken:document.getElementById('set-wa-token')?.value||'',expiryReminderDays:Number(document.getElementById('set-wa-days')?.value)||7,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Toast.success(App.t('saved'));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  return {render,switchTab,saveGym,saveRate,saveExpiring,setExpiring,stepExpiring,previewExpiring,pickDateFormat,saveDateFormat,saveWA};
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Dashboard Module
// ═══════════════════════════════════════════════════
const DashboardModule = (() => {
  let _db;

  async function render(db) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="kpi-grid" id="dash-kpis">
        ${[1,2,3,4].map(()=>`<div class="kpi-card" style="opacity:.4"><div class="spinner" style="width:20px;height:20px"></div></div>`).join('')}
      </div>
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-title"><span class="card-title-icon">${Icon.render('activity')}</span> ${t('recent_activity')}</div>
          <div class="activity-list" id="dash-activity"><div class="page-loader" style="min-height:80px"><div class="spinner"></div></div></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="card-title-icon">${Icon.render('warning')}</span> ${t('expiring_soon_lbl').replace('{n}',AppSettings.expiringDays)}</div>
          <div id="dash-expiring"><div class="page-loader" style="min-height:80px"><div class="spinner"></div></div></div>
        </div>
      </div>`;
    await loadData();
  }

  async function loadData(){
    try{
      const [subSnap, subScSnap, actSnap, coSnap] = await Promise.all([
        _db.collection(COL.SUBSCRIBERS).get(),
        _db.collection(COL.SUBSCRIPTIONS).get(),
        _db.collection(COL.ACTIVITIES).orderBy('timestamp','desc').limit(10).get(),
        _db.collection(COL.COACHES).get(),
      ]);

      const subs = subScSnap.docs.map(d=>({id:d.id,...d.data()}));
      const active = subs.filter(s=>!s.frozen&&!DateUtil.isExpired(s.endDate)).length;
      const expiring = subs.filter(s=>!s.frozen&&DateUtil.isExpiringSoon(s.endDate));
      const revenue = subs.reduce((t,s)=>t+(s.amountPaid||0),0);

      document.getElementById('dash-kpis').innerHTML = [
        {icon:Icon.render('subscribers',28),value:subSnap.size,label:App.t('total_subscribers')},
        {icon:Icon.render('active',28),value:active,label:App.t('active_subs')},
        {icon:Icon.render('revenue',28),value:Currency.formatUSD(revenue),label:App.t('revenue_month')},
        {icon:Icon.render('coaches',28),value:coSnap.size,label:App.t('total_coaches')},
      ].map(k=>`
        <div class="kpi-card">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>`).join('');

      // Activities
      const actEl=document.getElementById('dash-activity');
      const acts=actSnap.docs.map(d=>d.data());
      const actIcons={subscriber_added:'green',subscriber_updated:'gold',subscriber_deleted:'red',
        subscription_added:'blue',subscription_updated:'gold',subscription_deleted:'red',payment_recorded:'green',
        subscription_frozen:'blue',subscription_unfrozen:'green'};
      const actLabels={
        subscriber_added:App.t('tl_subscriber_created'), subscriber_updated:App.t('tl_subscriber_updated'),
        subscriber_deleted:App.t('tl_subscriber_deleted'), subscription_added:App.t('tl_new_subscription'),
        subscription_updated:App.t('tl_subscription_updated'), subscription_deleted:App.t('tl_subscription_cancelled'),
        payment_recorded:App.t('tl_payment_recorded'),
        subscription_frozen:App.t('tl_subscription_frozen'), subscription_unfrozen:App.t('tl_subscription_unfrozen'),
      };
      actEl.innerHTML=acts.length?acts.map(a=>`
        <div class="activity-item">
          <div class="activity-dot ${actIcons[a.action]||'gold'}"></div>
          <span class="activity-text">${a.details?.name||a.details?.subscriber||''} — ${actLabels[a.action]||App.t('activity_word')}</span>
          <span class="activity-time">${DateUtil.timeAgo(a.timestamp)}</span>
        </div>`).join(''):`<p class="text-muted text-sm" style="padding:16px 0">${App.t('no_recent_activity')}</p>`;

      // Expiring
      const expEl=document.getElementById('dash-expiring');
      expEl.innerHTML=expiring.length?expiring.map(s=>{
        const days=DateUtil.diffDays(s.endDate);
        return `<div class="expiry-item">
          <div class="expiry-days${days<=3?' critical':''}">${days}d</div>
          <div class="expiry-info"><div class="expiry-name">${s.subscriberName||'—'}</div><div class="expiry-sport">${s.sportName||'—'} · ${App.t('ends_word')} ${DateUtil.format(s.endDate)}</div></div>
          <button class="btn btn-outline btn-sm" onclick="DashboardModule.renew('${s.subscriberId}','${(s.subscriberName||'').replace(/'/g,"\\'")}')">${App.t('renew_btn')}</button>
        </div>`;
      }).join(''):`<p class="text-muted text-sm" style="padding:16px 0">${App.t('no_expiring_subscriptions')}</p>`;
    }catch(e){
      console.error(e);
    }
  }

  async function renew(subscriberId, subscriberName) {
    await App.navigate('subscriptions');
    SubscriptionsModule?.openNew(subscriberId, subscriberName);
  }

  return {render, renew};
})();