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
          <p class="page-subtitle">Sell products to gym members</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-outline" onclick="POSModule.openInventory()">📦 ${t('inventory')}</button>
        </div>
      </div>
      <div class="pos-layout">
        <div>
          <div class="search-bar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input class="search-input" id="pos-search" placeholder="Search products…" oninput="POSModule.onSearch(this.value)">
            </div>
            <select class="filter-select" id="pos-category" onchange="POSModule.onCat()">
              <option value="">All Categories</option>
              <option value="water">💧 Water</option>
              <option value="food">🍎 Food</option>
              <option value="supplement">💊 Supplements</option>
              <option value="gear">🥊 Gear</option>
              <option value="apparel">👕 Apparel</option>
              <option value="other">📦 Other</option>
            </select>
          </div>
          <div class="pos-products-grid" id="pos-products"></div>
        </div>
        <div>
          <div class="pos-cart">
            <div class="pos-cart-header">
              🛒 ${t('cart')}
              <button class="btn btn-ghost btn-sm" onclick="POSModule.clearCart()">Clear</button>
            </div>
            <div class="pos-cart-items" id="cart-items">
              <p style="text-align:center;color:var(--text-muted);padding:30px 0;font-size:13px">${t('empty_cart')}</p>
            </div>
            <div class="pos-cart-summary">
              <div class="summary-row"><span>Subtotal (USD)</span><span id="cart-subtotal-usd">$0.00</span></div>
              <div class="summary-row"><span>Subtotal (LBP)</span><span id="cart-subtotal-lbp">0 ل.ل</span></div>
              <div class="summary-row total"><span>${t('total')}</span><span class="amount" id="cart-total">$0.00</span></div>
              <div class="form-group" style="margin-top:10px">
                <label class="form-label">Customer (optional)</label>
                <input class="form-input" id="pos-customer" placeholder="Name or phone">
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
    await loadProducts();
  }

  async function loadProducts() {
    const snap = await _db.collection(COL.PRODUCTS).orderBy('name').get();
    _products = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderProducts(_products);
  }

  function renderProducts(list) {
    const grid = document.getElementById('pos-products');
    grid.innerHTML = list.map(p => `
      <div class="pos-product-card${(p.stock||0)<=0?' out-of-stock':''}" onclick="POSModule.addToCart('${p.id}')">
        <div class="pos-product-emoji">${catIcon(p.category)}</div>
        <div class="pos-product-name">${p.name}</div>
        <div class="pos-product-price">${Currency.formatUSD(p.priceUsd)}</div>
        <div class="pos-product-stock">Stock: ${p.stock??'∞'}</div>
      </div>`).join('');
  }

  function catIcon(c){return{water:'💧',food:'🍎',supplement:'💊',gear:'🥊',apparel:'👕'}[c]||'📦';}

  const onSearch = debounce(v => {
    const q=v.toLowerCase(); const cat=document.getElementById('pos-category')?.value;
    renderProducts(_products.filter(p=>(p.name?.toLowerCase().includes(q))&&(!cat||p.category===cat)));
  },250);

  function onCat(){
    const cat=document.getElementById('pos-category')?.value; const q=(document.getElementById('pos-search')?.value||'').toLowerCase();
    renderProducts(_products.filter(p=>(!q||p.name?.toLowerCase().includes(q))&&(!cat||p.category===cat)));
  }

  function addToCart(id) {
    const p=_products.find(x=>x.id===id); if(!p)return;
    const existing=_cart.find(c=>c.id===id);
    if(existing){existing.qty++;} else {_cart.push({...p,qty:1});}
    renderCart();
  }

  function updateQty(id,delta){
    const item=_cart.find(c=>c.id===id); if(!item)return;
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
          <span class="cart-item-name">${c.name}</span>
          <div class="cart-qty-control">
            <button class="cart-qty-btn" onclick="POSModule.updateQty('${c.id}',-1)">−</button>
            <span class="cart-qty-num">${c.qty}</span>
            <button class="cart-qty-btn" onclick="POSModule.updateQty('${c.id}',1)">+</button>
          </div>
          <span class="cart-item-total">${Currency.formatUSD((c.priceUsd||0)*c.qty)}</span>
        </div>`).join('');
    }
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    setText('cart-subtotal-usd',Currency.formatUSD(total));
    setText('cart-subtotal-lbp',Currency.formatLBP(Currency.usdToLbp(total)));
    setText('cart-total',Currency.formatUSD(total));
    calcChange();
  }

  function calcChange(){
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    const paid=Number(document.getElementById('pos-paid')?.value)||0;
    const change=paid-total;
    const el=document.getElementById('pos-change');
    if(el){if(paid>0&&change>=0){el.style.display='block';el.textContent=`Change: ${Currency.formatUSD(change)}`;}else{el.style.display='none';}}
  }

  async function checkout(){
    if(!_cart.length){Toast.warning(App.t('empty_cart'));return;}
    const total=_cart.reduce((s,c)=>s+(c.priceUsd||0)*c.qty,0);
    const paid=Number(document.getElementById('pos-paid')?.value)||total;
    const customer=document.getElementById('pos-customer')?.value||'';
    const method=document.getElementById('pos-pay-method')?.value||'cash';
    try{
      await _db.collection(COL.SALES).add({
        items:_cart.map(c=>({id:c.id,name:c.name,qty:c.qty,priceUsd:c.priceUsd})),
        totalUsd:total, amountPaid:paid, paymentMethod:method,
        customer, createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      // Update stock
      const batch=_db.batch();
      _cart.forEach(c=>{
        if(c.stock!==undefined&&c.stock!==null){
          batch.update(_db.collection(COL.PRODUCTS).doc(c.id),{stock:firebase.firestore.FieldValue.increment(-c.qty)});
        }
      });
      await batch.commit();
      Toast.success('Sale completed! 🎉');
      clearCart();
      document.getElementById('pos-customer').value='';
      await loadProducts();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  function inventoryModal(){
    return `<div class="modal-overlay" id="modal-inventory">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">📦 Inventory Manager</span>
          <button class="modal-close" onclick="Modal.close('modal-inventory')">✕</button>
        </div>
        <div class="modal-body">
          <div class="flex gap-2" style="margin-bottom:16px;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" onclick="POSModule.openAddProduct()">+ Add Product</button>
          </div>
          <div id="inv-list"></div>
          <div class="modal-overlay" id="modal-product" style="z-index:600">
            <div class="modal modal-sm">
              <div class="modal-header">
                <span class="modal-title" id="prod-modal-title">Add Product</span>
                <button class="modal-close" onclick="Modal.close('modal-product')">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group"><label class="form-label">Name <span class="required">*</span></label><input class="form-input" id="pf-name"><div class="form-error-msg"></div></div>
                <div class="form-row">
                  <div class="form-group"><label class="form-label">Price (USD) <span class="required">*</span></label><input class="form-input" id="pf-price" type="number" min="0"><div class="form-error-msg"></div></div>
                  <div class="form-group"><label class="form-label">${App.t('stock')}</label><input class="form-input" id="pf-stock" type="number" min="0"></div>
                </div>
                <div class="form-group"><label class="form-label">${App.t('category')}</label>
                  <select class="form-select" id="pf-cat">
                    <option value="water">💧 Water</option><option value="food">🍎 Food</option>
                    <option value="supplement">💊 Supplement</option><option value="gear">🥊 Gear</option>
                    <option value="apparel">👕 Apparel</option><option value="other">📦 Other</option>
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
        <div class="modal-footer"><button class="btn btn-ghost" onclick="Modal.close('modal-inventory')">Close</button></div>
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
    el.innerHTML=`<table style="width:100%"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${
      _products.map(p=>`<tr><td>${p.name}</td><td>${catIcon(p.category)} ${p.category}</td><td>${Currency.formatUSD(p.priceUsd)}</td><td>${p.stock??'∞'}</td><td><button class="btn btn-danger btn-sm" onclick="POSModule.delProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')">🗑</button></td></tr>`).join('')
    }</tbody></table>`;
  }
  function openAddProduct(){_editProdId=null;['pf-name','pf-price','pf-stock'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('prod-modal-title').textContent='Add Product';Modal.open('modal-product');}
  async function saveProduct(){
    if(!Validate.form([{id:'pf-name',rules:['required'],label:'Name'},{id:'pf-price',rules:['required'],label:'Price'}]))return;
    const data={name:document.getElementById('pf-name').value.trim(),priceUsd:Number(document.getElementById('pf-price').value)||0,stock:Number(document.getElementById('pf-stock').value)||null,category:document.getElementById('pf-cat').value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(!_editProdId){data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await _db.collection(COL.PRODUCTS).add(data);}
    else{await _db.collection(COL.PRODUCTS).doc(_editProdId).update(data);}
    Toast.success(App.t('saved'));Modal.close('modal-product');await loadProducts();renderInventoryList();
  }
  function delProduct(id,name){Modal.confirm({title:'Delete Product',message:`Delete <strong>${name}</strong>?`,type:'danger',confirmText:'Delete',onConfirm:async()=>{await _db.collection(COL.PRODUCTS).doc(id).delete();await loadProducts();renderInventoryList();Toast.success(App.t('deleted'));}});}

  return {render,addToCart,updateQty,clearCart,calcChange,checkout,onSearch,onCat,openInventory,openAddProduct,saveProduct,delProduct};
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
          <p class="page-subtitle">Financial overview & analytics</p>
        </div>
        <div class="page-header-right">
          <select class="filter-select" id="rep-period" onchange="ReportsModule.loadReports()">
            <option value="month">This Month</option>
            <option value="3month">Last 3 Months</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
      <div class="kpi-grid" id="rep-kpis"><div class="page-loader"><div class="spinner"></div></div></div>
      <div class="reports-grid" id="rep-charts"></div>`;
    await loadReports();
  }

  async function loadReports() {
    const period = document.getElementById('rep-period')?.value || 'month';
    const now = new Date();
    let fromDate;
    if(period==='month') fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if(period==='3month') fromDate = new Date(now.getFullYear(), now.getMonth()-3, 1);
    else if(period==='year') fromDate = new Date(now.getFullYear(), 0, 1);
    else fromDate = new Date(2000, 0, 1);

    try {
      const [subSnap, coSnap, subScSnap, salesSnap] = await Promise.all([
        _db.collection(COL.SUBSCRIBERS).get(),
        _db.collection(COL.COACHES).get(),
        _db.collection(COL.SUBSCRIPTIONS).get(),
        _db.collection(COL.SALES).get(),
      ]);

      const subs = subScSnap.docs.map(d=>({id:d.id,...d.data()}));
      const sales = salesSnap.docs.map(d=>({id:d.id,...d.data()}));

      const periodSubs = subs.filter(s=>s.createdAt?.toDate?.()>=fromDate);
      const periodSales = sales.filter(s=>s.createdAt?.toDate?.()>=fromDate);

      const revenue = periodSubs.reduce((t,s)=>t+(s.amountPaid||0),0);
      const salesRev = periodSales.reduce((t,s)=>t+(s.totalUsd||0),0);
      const active = subs.filter(s=>!DateUtil.isExpired(s.endDate)).length;
      const expiring = subs.filter(s=>DateUtil.isExpiringSoon(s.endDate,7)).length;
      const coaches = coSnap.size;

      // KPIs
      document.getElementById('rep-kpis').innerHTML = [
        {icon:'💰',value:Currency.formatUSD(revenue),label:'Subscription Revenue',change:''},
        {icon:'🛒',value:Currency.formatUSD(salesRev),label:'POS Revenue',change:''},
        {icon:'💵',value:Currency.formatUSD(revenue+salesRev),label:'Total Revenue',change:''},
        {icon:'👥',value:active,label:'Active Subscriptions',change:''},
        {icon:'⚠️',value:expiring,label:'Expiring This Week',change:''},
        {icon:'🏋️',value:coaches,label:'Total Coaches',change:''},
      ].map(k=>`
        <div class="kpi-card">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-value">${k.value}</div>
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
      subs.forEach(s=>{
        if(!s.coachName) return;
        const key=s.coachName;
        if(!coachMap[key]) coachMap[key]={name:key,subs:0,revenue:0,commission:s.coachCommission||0};
        coachMap[key].subs++; coachMap[key].revenue+=(s.amountPaid||0);
      });
      const coachList = Object.values(coachMap);

      document.getElementById('rep-charts').innerHTML = `
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">Revenue by Sport</div><div class="chart-subtitle">All time</div></div>
          </div>
          ${sportList.map(s=>`
            <div class="rev-bar-row">
              <span class="rev-bar-label">${s.name}</span>
              <div class="rev-bar-track"><div class="rev-bar-fill" style="width:${Math.round(s.revenue/maxRev*100)}%"></div></div>
              <span class="rev-bar-value">${Currency.formatUSD(s.revenue)}</span>
            </div>`).join('')||'<p class="text-muted text-sm">No data</p>'}
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">Coach Commissions</div><div class="chart-subtitle">Due this period</div></div>
          </div>
          ${coachList.length?`
          <div class="table-scroll">
          <table class="commission-table" style="width:100%">
            <thead><tr><th>Coach</th><th>Subscribers</th><th>Revenue</th><th>Commission %</th><th>Commission $</th></tr></thead>
            <tbody>${coachList.map(c=>`<tr>
              <td>${c.name}</td><td>${c.subs}</td><td>${Currency.formatUSD(c.revenue)}</td>
              <td>${c.commission}%</td><td>${Currency.formatUSD(c.revenue*c.commission/100)}</td>
            </tr>`).join('')}</tbody>
          </table></div>`:'<p class="text-muted text-sm">No coach assignments</p>'}
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <div><div class="chart-title">Subscription Status</div></div>
          </div>
          ${['active','expiring','expired'].map(st=>{
            const count=subs.filter(s=>{if(st==='active')return !DateUtil.isExpired(s.endDate)&&!DateUtil.isExpiringSoon(s.endDate,7);if(st==='expiring')return DateUtil.isExpiringSoon(s.endDate,7);return DateUtil.isExpired(s.endDate);}).length;
            const colors={active:'var(--success)',expiring:'var(--warning)',expired:'var(--danger)'};
            return `<div class="rev-bar-row"><span class="rev-bar-label" style="color:${colors[st]}">${st.charAt(0).toUpperCase()+st.slice(1)}</span><div class="rev-bar-track"><div class="rev-bar-fill" style="width:${subs.length?Math.round(count/subs.length*100):0}%;background:${colors[st]}"></div></div><span class="rev-bar-value" style="color:${colors[st]}">${count}</span></div>`;
          }).join('')}
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><div><div class="chart-title">POS Sales Summary</div></div></div>
          <div class="detail-row"><span class="detail-label">Total Transactions</span><span class="detail-value">${periodSales.length}</span></div>
          <div class="detail-row"><span class="detail-label">Total Revenue</span><span class="detail-value" style="color:var(--gold-400)">${Currency.formatUSD(salesRev)}</span></div>
          <div class="detail-row"><span class="detail-label">Avg. per Sale</span><span class="detail-value">${Currency.formatUSD(periodSales.length?salesRev/periodSales.length:0)}</span></div>
        </div>`;
    } catch(e) {
      document.getElementById('rep-kpis').innerHTML = `<p style="color:var(--danger)">Failed to load reports.</p>`;
    }
  }

  return { render, loadReports };
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
          <p class="page-subtitle">Assign meal & workout plans to subscribers</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="DietModule.openNew()">+ ${t('assign_plan')}</button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap"><span class="search-icon">🔍</span>
          <input class="search-input" id="diet-search" placeholder="Search by subscriber…" oninput="DietModule.onSearch(this.value)">
        </div>
      </div>
      <div id="diet-plans-list"></div>
      ${buildModal()}`;
    const snap = await _db.collection(COL.SUBSCRIBERS).orderBy('name').get();
    _subscribers = snap.docs.map(d=>({id:d.id,...d.data()}));
    const subSel=document.getElementById('dp-subscriber');
    if(subSel) _subscribers.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;subSel.appendChild(o);});
    await loadPlans();
  }

  async function loadPlans(q='') {
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
            <div><div style="font-weight:700">${p.subscriberName}</div><div style="font-size:12px;color:var(--text-muted)">${p.goal||''} · ${DateUtil.format(p.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0])}</div></div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="DietModule.openEdit('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="DietModule.del('${p.id}')">🗑</button>
          </div>
        </div>
        <div class="plan-section">
          <div>
            <div class="form-section-title">🥗 Meal Plan</div>
            ${(p.meals||[]).map(m=>`
              <div class="meal-row"><span class="meal-time">${m.time}</span><span class="meal-name">${m.name}</span><span class="meal-cals">${m.calories||''}${m.calories?' kcal':''}</span></div>
            `).join('')||'<p class="text-muted text-sm">No meals</p>'}
          </div>
          <div>
            <div class="form-section-title">🏋️ Workout Plan</div>
            ${(p.exercises||[]).map((e,i)=>`
              <div class="workout-exercise"><div class="exercise-num">${i+1}</div><div class="exercise-info"><div class="exercise-name">${e.name}</div><div class="exercise-sets">${e.sets||0} sets × ${e.reps||0} reps ${e.weight?'@ '+e.weight+'kg':''}</div></div></div>
            `).join('')||'<p class="text-muted text-sm">No exercises</p>'}
          </div>
        </div>
      </div>`).join('');
  }

  const onSearch = debounce(v=>loadPlans(v),280);

  function buildModal(){
    return `<div class="modal-overlay" id="modal-diet">
      <div class="modal modal-xl">
        <div class="modal-header">
          <span class="modal-title" id="diet-modal-title">Assign Plan</span>
          <button class="modal-close" onclick="Modal.close('modal-diet')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Subscriber <span class="required">*</span></label><select class="form-select" id="dp-subscriber"><option value="">Select…</option></select><div class="form-error-msg"></div></div>
            <div class="form-group"><label class="form-label">Goal</label><input class="form-input" id="dp-goal" placeholder="e.g. Weight Loss, Muscle Gain"></div>
          </div>
          <div class="plan-section" style="margin-top:16px">
            <div>
              <div class="form-section-title">🥗 Meal Plan</div>
              <div id="meals-list"></div>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="DietModule.addMeal()">+ Add Meal</button>
            </div>
            <div>
              <div class="form-section-title">🏋️ Workout Exercises</div>
              <div id="exercises-list"></div>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="DietModule.addExercise()">+ Add Exercise</button>
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
        <input class="form-input" style="flex:1;min-width:120px" value="${m.name}" placeholder="Meal name" oninput="_dietMeals[${i}].name=this.value">
        <input class="form-input" style="width:80px" value="${m.calories||''}" placeholder="kcal" type="number" oninput="_dietMeals[${i}].calories=Number(this.value)">
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
        <input class="form-input" style="flex:1;min-width:100px" value="${e.name}" placeholder="Exercise" oninput="_dietEx[${i}].name=this.value">
        <input class="form-input" style="width:60px" value="${e.sets||''}" placeholder="Sets" type="number" oninput="_dietEx[${i}].sets=Number(this.value)">
        <input class="form-input" style="width:60px" value="${e.reps||''}" placeholder="Reps" type="number" oninput="_dietEx[${i}].reps=Number(this.value)">
        <input class="form-input" style="width:70px" value="${e.weight||''}" placeholder="kg" type="number" oninput="_dietEx[${i}].weight=Number(this.value)">
        <button class="btn btn-danger btn-sm btn-icon" onclick="DietModule.removeExercise(${i})">✕</button>
      </div>`).join('');
    window._dietEx=_exercises;
  }
  function addExercise(){_exercises.push({name:'',sets:3,reps:10,weight:0});renderExercises();}
  function removeExercise(i){_exercises.splice(i,1);renderExercises();}

  function openNew(){
    _editId=null; _meals=[]; _exercises=[];
    document.getElementById('diet-modal-title').textContent='Assign Plan';
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
    document.getElementById('diet-modal-title').textContent='Edit Plan';
    document.getElementById('dp-subscriber').value=d.subscriberId||'';
    document.getElementById('dp-goal').value=d.goal||'';
    document.getElementById('dp-notes').value=d.notes||'';
    renderMeals(); renderExercises();
    Modal.open('modal-diet');
  }

  async function save(){
    if(!Validate.form([{id:'dp-subscriber',rules:['required'],label:'Subscriber'}]))return;
    const subId=document.getElementById('dp-subscriber').value;
    const sub=_subscribers.find(s=>s.id===subId);
    const data={subscriberId:subId,subscriberName:sub?.name||'',goal:document.getElementById('dp-goal').value.trim(),notes:document.getElementById('dp-notes').value.trim(),meals:window._dietMeals||_meals,exercises:window._dietEx||_exercises,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      if(_editId){await _db.collection(COL.DIET_PLANS).doc(_editId).update(data);}
      else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await _db.collection(COL.DIET_PLANS).add(data);}
      Toast.success(App.t('saved')); Modal.close('modal-diet'); await loadPlans();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  function del(id){Modal.confirm({title:'Delete Plan',message:App.t('delete_confirm'),type:'danger',confirmText:App.t('delete'),onConfirm:async()=>{await _db.collection(COL.DIET_PLANS).doc(id).delete();Toast.success(App.t('deleted'));await loadPlans();}});}

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
          <p class="page-subtitle">Manage all system users and their roles</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="UsersModule.openCreate()">+ ${t('create_user')}</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>#</th><th>Name</th><th>Email</th><th>${t('role')}</th>
              <th>Created</th><th>Status</th><th>${t('actions')}</th>
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
      const created=DateUtil.format(u.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0]);
      const esc=name.replace(/'/g,"\\'");
      const toggleBtn=u.role!=='super_admin'
        ?`<button class="btn btn-${isActive?'danger':'success'} btn-sm" onclick="UsersModule.toggleActive('${u.id}','${isActive}','${esc}')">${isActive?'🚫 Disable':'✓ Enable'}</button>`
        :'';
      return `<tr>
        <td class="dt-only" style="color:var(--text-muted)">${i+1}</td>
        <td class="dt-only"><div class="flex items-center gap-2"><div class="avatar">${initials(name)}</div><strong>${name}</strong></div></td>
        <td class="dt-only" style="font-size:12px">${u.email||'—'}</td>
        <td class="dt-only"><span class="badge ${roleColor}">${App.t(u.role)||u.role}</span></td>
        <td class="dt-only" style="font-size:12px">${created}</td>
        <td class="dt-only"><span class="badge ${isActive?'badge-active':'badge-expired'}">${isActive?App.t('active'):'Inactive'}</span></td>
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
              <div class="mobile-card-row"><span>Status</span><span class="badge ${isActive?'badge-active':'badge-expired'}">${isActive?'Active':'Inactive'}</span></div>
              <div class="mobile-card-row"><span>Created</span><span>${created}</span></div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-outline btn-sm" onclick="UsersModule.openEdit('${u.id}')">✏️ Edit</button>
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
          <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input class="form-input" id="uf-name"><div class="form-error-msg"></div></div>
          <div class="form-group"><label class="form-label">Email <span class="required">*</span></label><input class="form-input" id="uf-email" type="email"><div class="form-error-msg"></div></div>
          <div class="form-group" id="uf-pw-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <div class="input-icon-wrap"><input class="form-input" id="uf-password" type="password" placeholder="Min 6 characters"></div>
            <div class="form-hint">User will use this password to log in.</div>
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
          <div class="form-group"><label class="form-label">${t('phone')}</label><input class="form-input" id="uf-phone"></div>
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
      {id:'uf-name',rules:['required'],label:'Name'},
      {id:'uf-email',rules:['required','email'],label:'Email'},
      ...(!_editUserId?[{id:'uf-password',rules:['required'],label:'Password'}]:[]),
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
        Toast.success(`User "${name}" created successfully!`);
        Modal.close('modal-user'); await loadUsers();
      }catch(e){
        const msgs={'auth/email-already-in-use':'This email is already in use.','auth/weak-password':'Password must be at least 6 characters.'};
        notice.textContent=msgs[e.code]||App.t('error_generic');
        notice.style.display='block';
      }
    }
  }

  async function toggleActive(id, currentlyActive, name){
    const willDisable = currentlyActive==='true';
    Modal.confirm({
      title: willDisable?'Disable User':'Enable User',
      message: `${willDisable?'Disable':'Enable'} account for <strong>${name}</strong>?`,
      type: willDisable?'danger':'success',
      confirmText: willDisable?'Disable':'Enable',
      onConfirm: async()=>{
        await _db.collection(COL.USERS).doc(id).update({active:!willDisable});
        Toast.success(`User ${willDisable?'disabled':'enabled'}.`);
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
          ${[['gym','🏋️','Gym Info'],['currency','💰','Currency'],['whatsapp','💬','WhatsApp']].map(([id,icon,label])=>
            `<div class="settings-nav-item${id==='gym'?' active':''}" onclick="SettingsModule.switchTab('${id}')">${icon} ${label}</div>`
          ).join('')}
        </div>
        <div id="settings-content"></div>
      </div>`;
    switchTab('gym');
  }

  async function switchTab(tab) {
    document.querySelectorAll('.settings-nav-item').forEach(el=>{
      el.classList.toggle('active', el.textContent.trim().toLowerCase().includes(tab));
    });
    const content = document.getElementById('settings-content');
    if(!content)return;

    if(tab==='gym'){
      let gymData = {};
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists)gymData=d.data();}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">🏋️ Gym Information</div>
          <div class="form-group"><label class="form-label">Gym Name</label><input class="form-input" id="set-gym-name" value="${gymData.gymName||'Venus Gym'}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="set-gym-phone" value="${gymData.gymPhone||''}"></div>
          <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="set-gym-address" value="${gymData.gymAddress||''}"></div>
          <div class="form-group"><label class="form-label">WhatsApp Number</label><input class="form-input" id="set-gym-wa" value="${gymData.whatsappNumber||''}"></div>
          <button class="btn btn-primary" onclick="SettingsModule.saveGym()">💾 Save</button>
        </div>`;
    } else if(tab==='currency'){
      let rate = 89500;
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists)rate=d.data().dollarRate||89500;}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">💰 Dollar Rate</div>
          <div class="rate-display" style="margin-bottom:20px">
            <div><div class="rate-usd">$1</div><div class="rate-label">USD</div></div>
            <div class="rate-arrow">→</div>
            <div><div class="rate-lbp" id="rate-preview">${Number(rate).toLocaleString()}</div><div class="rate-label">LBP</div></div>
          </div>
          <div class="form-group">
            <label class="form-label">1 USD = ? LBP <span class="required">*</span></label>
            <input class="form-input" id="set-rate" type="number" value="${rate}" oninput="document.getElementById('rate-preview').textContent=Number(this.value).toLocaleString()">
            <div class="form-hint">This rate is used throughout the app for LBP conversions.</div>
          </div>
          <button class="btn btn-primary" onclick="SettingsModule.saveRate()">💾 Save Rate</button>
        </div>`;
    } else if(tab==='whatsapp'){
      let wa = {};
      try{const d=await _db.collection(COL.SETTINGS).doc('global').get();if(d.exists)wa=d.data();}catch(e){}
      content.innerHTML=`
        <div class="settings-card">
          <div class="settings-card-title">💬 WhatsApp / UltraMsg</div>
          <div class="form-group"><label class="form-label">UltraMsg Instance ID</label><input class="form-input" id="set-wa-instance" value="${wa.ultraMsgInstance||''}"></div>
          <div class="form-group"><label class="form-label">UltraMsg Token</label><input class="form-input" id="set-wa-token" type="password" value="${wa.ultraMsgToken||''}"></div>
          <div class="form-group"><label class="form-label">Expiry Reminder (days before)</label><input class="form-input" id="set-wa-days" type="number" value="${wa.expiryReminderDays||7}"></div>
          <button class="btn btn-primary" onclick="SettingsModule.saveWA()">💾 Save</button>
        </div>`;
    }
  }

  async function saveGym(){
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({gymName:document.getElementById('set-gym-name')?.value||'',gymPhone:document.getElementById('set-gym-phone')?.value||'',gymAddress:document.getElementById('set-gym-address')?.value||'',whatsappNumber:document.getElementById('set-gym-wa')?.value||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Toast.success(App.t('saved'));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  async function saveRate(){
    const rate=Number(document.getElementById('set-rate')?.value)||89500;
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({dollarRate:rate,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Currency.setRate(rate);
      Toast.success(`Rate updated: $1 = ${rate.toLocaleString()} LBP`);
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  async function saveWA(){
    try{
      await _db.collection(COL.SETTINGS).doc('global').set({ultraMsgInstance:document.getElementById('set-wa-instance')?.value||'',ultraMsgToken:document.getElementById('set-wa-token')?.value||'',expiryReminderDays:Number(document.getElementById('set-wa-days')?.value)||7,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      Toast.success(App.t('saved'));
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  return {render,switchTab,saveGym,saveRate,saveWA};
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
          <div class="card-title"><span class="card-title-icon">${Icon.render('warning')}</span> ${t('expiring_soon_lbl')}</div>
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
      const active = subs.filter(s=>!DateUtil.isExpired(s.endDate)).length;
      const expiring = subs.filter(s=>DateUtil.isExpiringSoon(s.endDate,7));
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
      const actIcons={subscriber_added:'green',subscriber_updated:'gold',subscription_added:'blue',subscriber_deleted:'red'};
      actEl.innerHTML=acts.length?acts.map(a=>`
        <div class="activity-item">
          <div class="activity-dot ${actIcons[a.action]||'gold'}"></div>
          <span class="activity-text">${a.details?.name||''} — ${a.action?.replace(/_/g,' ')}</span>
          <span class="activity-time">${DateUtil.timeAgo(a.timestamp)}</span>
        </div>`).join(''):`<p class="text-muted text-sm" style="padding:16px 0">No recent activity</p>`;

      // Expiring
      const expEl=document.getElementById('dash-expiring');
      expEl.innerHTML=expiring.length?expiring.map(s=>{
        const days=DateUtil.diffDays(s.endDate);
        return `<div class="expiry-item">
          <div class="expiry-days${days<=3?' critical':''}">${days}d</div>
          <div class="expiry-info"><div class="expiry-name">${s.subscriberName||'—'}</div><div class="expiry-sport">${s.sportName||'—'} · ends ${DateUtil.format(s.endDate)}</div></div>
          <button class="btn btn-outline btn-sm" onclick="DashboardModule.renew('${s.subscriberId}','${(s.subscriberName||'').replace(/'/g,"\\'")}')">Renew</button>
        </div>`;
      }).join(''):`<p class="text-muted text-sm" style="padding:16px 0">🎉 No expiring subscriptions</p>`;
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