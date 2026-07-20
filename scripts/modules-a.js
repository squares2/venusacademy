// ═══════════════════════════════════════════════════
//  VENUS GYM — Coaches Module
//
//  A coach can now specialize in MULTIPLE sports, each pulled
//  exclusively from the Sports collection (no free text), and
//  each specialty carries its own session schedule (days of
//  week + time). Stored per coach as:
//    specialties: [{ sportId, sportName, days:['mon','wed'], time:'18:00' }]
//  Legacy coaches saved before this change (plain `specialty`
//  text field) are auto-migrated on first edit: we try to match
//  each comma-separated word against current sport names.
// ═══════════════════════════════════════════════════
const CoachesModule = (() => {
  let _db, _all = [], _sports = [], _editId = null;
  let _rows = []; // working specialty rows while the modal is open

  const DAYS = [
    { key:'sun', label:'Sun' }, { key:'mon', label:'Mon' }, { key:'tue', label:'Tue' },
    { key:'wed', label:'Wed' }, { key:'thu', label:'Thu' }, { key:'fri', label:'Fri' },
    { key:'sat', label:'Sat' }
  ];

  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2,'0')} ${period}`;
  }

  function formatDays(days) {
    if (!days || !days.length) return '';
    if (days.length === 7) return 'Daily';
    return DAYS.filter(d => days.includes(d.key)).map(d => d.label).join(' ');
  }

  function sportIcon(sportId) {
    return _sports.find(s => s.id === sportId)?.icon || '🏅';
  }

  async function render(db, profile) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('coaches')}</h1>
          <p class="page-subtitle" id="coach-count"></p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="CoachesModule.openAdd()">+ ${t('add_coach')}</button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="coach-search" placeholder="${t('search')}" oninput="CoachesModule.onSearch(this.value)">
        </div>
      </div>
      <div class="coaches-grid" id="coaches-grid"></div>
      <div class="modal-overlay" id="modal-coach">
        <div class="modal modal-lg">
          <div class="modal-header">
            <span class="modal-title" id="coach-modal-title">${t('add_coach')}</span>
            <button class="modal-close" onclick="Modal.close('modal-coach')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('name')} <span class="required">*</span></label>
                <input class="form-input" id="cf-name">
                <div class="form-error-msg"></div>
              </div>
              <div class="form-group">
                <label class="form-label">${t('phone')} <span class="required">*</span></label>
                <input class="form-input" id="cf-phone">
                <div class="form-error-msg"></div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('commission')} <span class="required">*</span></label>
                <input class="form-input" id="cf-commission" type="number" min="0" max="100" placeholder="20">
                <div class="form-error-msg"></div>
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Base Salary (USD)</label>
                <input class="form-input" id="cf-salary" type="number" min="0" placeholder="0">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('email_lbl')}</label>
                <input class="form-input" id="cf-email" type="email">
              </div>
            </div>

            <div class="form-section-title">Sport Specialties & Session Schedule</div>
            <div id="specialty-rows"></div>
            <button class="btn btn-outline btn-sm" type="button" onclick="CoachesModule.addRow()" style="margin-bottom:18px">
              + Add Sport Specialty
            </button>

            <div class="form-row cols-1">
              <div class="form-group">
                <label class="form-label">${t('notes')}</label>
                <textarea class="form-textarea" id="cf-notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="Modal.close('modal-coach')">${t('cancel')}</button>
            <button class="btn btn-primary" onclick="CoachesModule.save()">💾 ${t('save')}</button>
          </div>
        </div>
      </div>`;
    await loadData();
  }

  async function loadData() {
    const [coSnap, spSnap] = await Promise.all([
      _db.collection(COL.COACHES).orderBy('name').get(),
      _db.collection(COL.SPORTS).orderBy('name').get(),
    ]);
    _all = coSnap.docs.map(d => ({id:d.id,...d.data()}));
    _sports = spSnap.docs.map(d => ({id:d.id,...d.data()}));
    document.getElementById('coach-count').textContent = `${_all.length} coach${_all.length!==1?'es':''}`;
    renderGrid(_all);
  }

  function renderGrid(list) {
    const grid = document.getElementById('coaches-grid');
    if (!list.length) { grid.innerHTML = `<p class="text-muted">${App.t('no_data')}</p>`; return; }
    grid.innerHTML = list.map(c => {
      const tags = (c.specialties || []).map(sp => `
        <span class="coach-sport-tag">
          ${sportIcon(sp.sportId)} ${sp.sportName}${sp.time ? ` · ${formatTime12(sp.time)}` : ''}${sp.days?.length ? ` · ${formatDays(sp.days)}` : ''}
        </span>`).join('');
      return `
      <div class="coach-card">
        <div class="coach-card-header">
          <div class="avatar avatar-lg">${initials(c.name)}</div>
          <div class="coach-card-info">
            <div class="coach-card-name">${c.name}</div>
            <div class="coach-card-sport">📞 ${c.phone || '—'} · ${App.t('commission')}: <span style="color:var(--gold-400)">${c.commission||0}%</span></div>
          </div>
        </div>
        <div class="coach-specialty-tags">${tags || `<span class="text-muted text-sm">No sports assigned</span>`}</div>
        <div class="flex gap-2" style="margin-top:8px">
          ${c.phone ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window.open('${buildWhatsAppLink(c.phone,'Hello from Venus Gym')}','_blank')">💬 WhatsApp</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="CoachesModule.openEdit('${c.id}')">✏️ ${App.t('edit')}</button>
          <button class="btn btn-danger btn-sm" onclick="CoachesModule.del('${c.id}','${c.name.replace(/'/g,"\\'")}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  const onSearch = debounce(val => {
    const q = val.toLowerCase();
    renderGrid(_all.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      (c.specialties || []).some(sp => sp.sportName?.toLowerCase().includes(q))
    ));
  }, 280);

  /* ── Specialty rows (multi-sport + schedule) ─────────── */
  function freshRow() { return { sportId: '', days: [], time: '' }; }

  function renderRows() {
    const el = document.getElementById('specialty-rows');
    if (!el) return;
    if (!_rows.length) {
      el.innerHTML = `<p class="text-muted text-sm" style="margin-bottom:12px">No sports assigned yet — click "Add Sport Specialty" below.</p>`;
      return;
    }
    el.innerHTML = _rows.map((row, i) => {
      const takenElsewhere = _rows.filter((r, j) => j !== i).map(r => r.sportId);
      const options = _sports.filter(s => !takenElsewhere.includes(s.id) || s.id === row.sportId);
      return `
        <div class="specialty-row">
          <div class="specialty-row-top">
            <select class="form-select" onchange="CoachesModule.setRowSport(${i}, this.value)">
              <option value="">Select sport…</option>
              ${options.map(s => `<option value="${s.id}" ${row.sportId === s.id ? 'selected' : ''}>${s.icon || ''} ${s.name}</option>`).join('')}
            </select>
            <input class="form-input" type="time" value="${row.time || ''}" onchange="CoachesModule.setRowTime(${i}, this.value)" title="Session time">
            <button class="btn btn-danger btn-sm btn-icon" type="button" onclick="CoachesModule.removeRow(${i})">✕</button>
          </div>
          <div class="day-chip-row">
            ${DAYS.map(d => `
              <span class="day-chip ${row.days.includes(d.key) ? 'active' : ''}" onclick="CoachesModule.toggleRowDay(${i}, '${d.key}')">${d.label}</span>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function addRow() {
    if (_rows.length >= _sports.length) { Toast.warning('All available sports are already assigned.'); return; }
    _rows.push(freshRow());
    renderRows();
  }
  function removeRow(i) { _rows.splice(i, 1); renderRows(); }
  function setRowSport(i, sportId) { _rows[i].sportId = sportId; renderRows(); }
  function setRowTime(i, time) { _rows[i].time = time; }
  function toggleRowDay(i, day) {
    const idx = _rows[i].days.indexOf(day);
    if (idx >= 0) _rows[i].days.splice(idx, 1); else _rows[i].days.push(day);
    renderRows();
  }

  function openAdd() {
    _editId = null;
    ['cf-name','cf-phone','cf-commission','cf-email','cf-salary','cf-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    _rows = [];
    renderRows();
    document.getElementById('coach-modal-title').textContent = App.t('add_coach');
    Modal.open('modal-coach');
  }

  function openEdit(id) {
    _editId = id;
    const c = _all.find(x=>x.id===id);
    if (!c) return;
    document.getElementById('coach-modal-title').textContent = App.t('edit') + ': ' + c.name;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
    set('cf-name',c.name); set('cf-phone',c.phone);
    set('cf-commission',c.commission); set('cf-email',c.email);
    set('cf-salary',c.salary); set('cf-notes',c.notes);

    if (Array.isArray(c.specialties) && c.specialties.length) {
      _rows = c.specialties.map(sp => ({ sportId: sp.sportId || '', days: sp.days || [], time: sp.time || '' }));
    } else if (c.specialty) {
      // Best-effort migration from the old free-text field
      _rows = c.specialty.split(',').map(name => name.trim()).filter(Boolean)
        .map(name => {
          const match = _sports.find(s => s.name.toLowerCase() === name.toLowerCase());
          return match ? { sportId: match.id, days: [], time: '' } : null;
        }).filter(Boolean);
    } else {
      _rows = [];
    }
    renderRows();
    Modal.open('modal-coach');
  }

  async function save() {
    if (!Validate.form([
      {id:'cf-name',rules:['required'],label:App.t('name')},
      {id:'cf-phone',rules:['required'],label:App.t('phone')},
      {id:'cf-commission',rules:['required'],label:'Commission'},
    ])) return;

    const specialties = _rows
      .filter(r => r.sportId)
      .map(r => {
        const sport = _sports.find(s => s.id === r.sportId);
        return { sportId: r.sportId, sportName: sport?.name || '', days: r.days, time: r.time || '' };
      });

    const data = {
      name: document.getElementById('cf-name').value.trim(),
      phone: document.getElementById('cf-phone').value.trim(),
      specialties,
      specialty: specialties.map(s => s.sportName).join(', '), // kept for backward-compatible display/search
      commission: Number(document.getElementById('cf-commission').value)||0,
      email: document.getElementById('cf-email').value.trim(),
      salary: Number(document.getElementById('cf-salary').value)||0,
      notes: document.getElementById('cf-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      if (_editId) { await _db.collection(COL.COACHES).doc(_editId).update(data); }
      else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await _db.collection(COL.COACHES).add(data); }
      Toast.success(App.t('saved')); Modal.close('modal-coach'); await loadData();
    } catch(e) { Toast.error(App.t('error_generic')); }
  }

  function del(id, name) {
    Modal.confirm({ title:'Delete Coach', message:`${App.t('delete_confirm')}<br><strong>${name}</strong>`, type:'danger',
      confirmText:App.t('delete'), onConfirm: async ()=>{ await _db.collection(COL.COACHES).doc(id).delete(); Toast.success(App.t('deleted')); await loadData(); }
    });
  }

  return {
    render, openAdd, openEdit, save, del, onSearch,
    addRow, removeRow, setRowSport, setRowTime, toggleRowDay
  };
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Sports Module
// ═══════════════════════════════════════════════════
const SportsModule = (() => {
  let _db, _all = [], _editId = null;
  const SPORT_ICONS = ['🏋️','⚽','🏊','🥊','🧘','🚴','🏃','🤸','🥋','🏐','🎾','🏌️'];

  async function render(db, profile) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('sports')}</h1>
          <p class="page-subtitle" id="sport-count"></p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="SportsModule.openAdd()">+ ${t('add_sport')}</button>
        </div>
      </div>
      <div class="sports-grid" id="sports-grid"></div>
      <div class="modal-overlay" id="modal-sport">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title" id="sport-modal-title">${t('add_sport')}</span>
            <button class="modal-close" onclick="Modal.close('modal-sport')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Name (EN) <span class="required">*</span></label>
                <input class="form-input" id="spf-name" placeholder="e.g. Yoga">
                <div class="form-error-msg"></div>
              </div>
              <div class="form-group">
                <label class="form-label">Name (AR)</label>
                <input class="form-input" id="spf-name-ar" placeholder="مثال: يوغا" dir="rtl">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('price_usd')} <span class="required">*</span></label>
                <div class="currency-input-wrap">
                  <span class="currency-prefix">$</span>
                  <input class="form-input" id="spf-price" type="number" min="0" placeholder="50">
                </div>
                <div class="form-error-msg"></div>
              </div>
              <div class="form-group">
                <label class="form-label">Icon</label>
                <select class="form-select" id="spf-icon">
                  ${SPORT_ICONS.map(i=>`<option value="${i}">${i} ${i}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row cols-1">
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-textarea" id="spf-desc" rows="2"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="Modal.close('modal-sport')">${t('cancel')}</button>
            <button class="btn btn-primary" onclick="SportsModule.save()">💾 ${t('save')}</button>
          </div>
        </div>
      </div>`;
    await loadData();
  }

  async function loadData() {
    const snap = await _db.collection(COL.SPORTS).orderBy('name').get();
    _all = snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('sport-count').textContent = `${_all.length} sport${_all.length!==1?'s':''}`;
    const grid = document.getElementById('sports-grid');
    grid.innerHTML = _all.length ? _all.map(s=>`
      <div class="sport-card">
        <div class="sport-icon">${s.icon||'🏋️'}</div>
        <div class="sport-name">${s.name}</div>
        ${s.nameAr?`<div style="font-size:12px;color:var(--text-muted);direction:rtl">${s.nameAr}</div>`:''}
        <div class="sport-price">${Currency.formatUSD(s.price)}</div>
        <div class="sport-meta">${Currency.formatLBP(Currency.usdToLbp(s.price))}</div>
        ${s.description?`<div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${s.description}</div>`:''}
        <div class="sport-actions">
          <button class="btn btn-outline btn-sm" onclick="SportsModule.openEdit('${s.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="SportsModule.del('${s.id}','${s.name.replace(/'/g,"\\'")}')">🗑</button>
        </div>
      </div>`).join('') : `<p class="text-muted">${App.t('no_data')}</p>`;
  }

  function openAdd() {
    _editId=null;
    ['spf-name','spf-name-ar','spf-price','spf-desc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('sport-modal-title').textContent = App.t('add_sport');
    Modal.open('modal-sport');
  }

  function openEdit(id) {
    _editId=id; const s=_all.find(x=>x.id===id); if(!s)return;
    document.getElementById('sport-modal-title').textContent = App.t('edit')+': '+s.name;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
    set('spf-name',s.name); set('spf-name-ar',s.nameAr); set('spf-price',s.price);
    set('spf-icon',s.icon); set('spf-desc',s.description);
    Modal.open('modal-sport');
  }

  async function save() {
    if(!Validate.form([{id:'spf-name',rules:['required'],label:'Name'},{id:'spf-price',rules:['required'],label:'Price'}]))return;
    const data={
      name:document.getElementById('spf-name').value.trim(),
      nameAr:document.getElementById('spf-name-ar').value.trim(),
      price:Number(document.getElementById('spf-price').value)||0,
      icon:document.getElementById('spf-icon').value,
      description:document.getElementById('spf-desc').value.trim(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      if(_editId){await _db.collection(COL.SPORTS).doc(_editId).update(data);}
      else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await _db.collection(COL.SPORTS).add(data);}
      Toast.success(App.t('saved')); Modal.close('modal-sport'); await loadData();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  function del(id,name){
    Modal.confirm({title:'Delete Sport',message:`${App.t('delete_confirm')}<br><strong>${name}</strong>`,type:'danger',
      confirmText:App.t('delete'),onConfirm:async()=>{await _db.collection(COL.SPORTS).doc(id).delete();Toast.success(App.t('deleted'));await loadData();}
    });
  }

  return {render,openAdd,openEdit,save,del};
})();


// ═══════════════════════════════════════════════════
//  VENUS GYM — Subscriptions Module
// ═══════════════════════════════════════════════════
const SubscriptionsModule = (() => {
  let _db, _all = [], _sports = [], _coaches = [], _subscribers = [];
  let _page = 1; const PER_PAGE = 15;

  async function render(db, profile) {
    _db = db;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('subscriptions')}</h1>
          <p class="page-subtitle" id="subs-count"></p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="SubscriptionsModule.openNew()">+ ${t('new_subscription')}</button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="subs-search" placeholder="${t('search')}" oninput="SubscriptionsModule.onSearch(this.value)">
        </div>
        <select class="filter-select" id="subs-filter" onchange="SubscriptionsModule.onFilter()">
          <option value="">All Status</option>
          <option value="active">${t('active')}</option>
          <option value="expired">${t('expired')}</option>
          <option value="expiring">${t('expiring_soon')}</option>
          <option value="partial">${t('partial')}</option>
        </select>
      </div>
      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>#</th><th>Subscriber</th><th>${t('sport')}</th>
              <th>${t('coach')}</th><th>Period</th><th>Status</th>
              <th>${t('total')}</th><th>${t('paid')}</th><th>${t('remaining')}</th><th>${t('actions')}</th>
            </tr></thead>
            <tbody id="subs-tbody"></tbody>
          </table>
        </div>
        <div class="table-footer">
          <span id="subs-pag-info"></span>
          <div class="pagination" id="subs-pagination"></div>
        </div>
      </div>
      ${buildModal()}`;
    await loadDeps(); await loadData();
  }

  async function loadDeps() {
    const [sp, co, su] = await Promise.all([
      _db.collection(COL.SPORTS).orderBy('name').get(),
      _db.collection(COL.COACHES).orderBy('name').get(),
      _db.collection(COL.SUBSCRIBERS).orderBy('name').get(),
    ]);
    _sports = sp.docs.map(d=>({id:d.id,...d.data()}));
    _coaches = co.docs.map(d=>({id:d.id,...d.data()}));
    _subscribers = su.docs.map(d=>({id:d.id,...d.data()}));
    const subSel = document.getElementById('subf-subscriber');
    const spSel = document.getElementById('subf-sport');
    const coSel = document.getElementById('subf-coach');
    if(subSel) _subscribers.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;subSel.appendChild(o);});
    if(spSel) _sports.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} — ${Currency.formatUSD(s.price)}`;spSel.appendChild(o);});
    populateCoachSelect(); // full list until a sport narrows it down
    if(spSel) spSel.addEventListener('change',()=>{autoFillPrice(); populateCoachSelect(spSel.value);});
  }

  function populateCoachSelect(sportId = '') {
    const coSel = document.getElementById('subf-coach');
    if (!coSel) return;
    const prevValue = coSel.value;
    let pool = _coaches;
    if (sportId) {
      const matching = _coaches.filter(c => (c.specialties||[]).some(sp => sp.sportId === sportId));
      pool = matching.length ? matching : _coaches; // fall back to full list rather than blocking selection
    }
    coSel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = ''; noneOpt.textContent = 'No Coach';
    coSel.appendChild(noneOpt);
    pool.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const schedule = sportId ? (c.specialties||[]).find(sp => sp.sportId === sportId) : null;
      const scheduleTxt = schedule && (schedule.days?.length || schedule.time)
        ? ` — ${[schedule.days?.length ? schedule.days.join('/') : '', schedule.time || ''].filter(Boolean).join(' ')}`
        : '';
      opt.textContent = `${c.name} (${c.commission||0}%)${scheduleTxt}`;
      coSel.appendChild(opt);
    });
    if (pool.some(c => c.id === prevValue)) coSel.value = prevValue;
  }

  function autoFillPrice(){
    const spId = document.getElementById('subf-sport')?.value;
    const sport = _sports.find(s=>s.id===spId);
    if(sport){
      const pi = document.getElementById('subf-price');
      if(pi && !pi.dataset.manual) pi.value = sport.price;
    }
  }

  async function loadData() {
    const snap = await _db.collection(COL.SUBSCRIPTIONS).orderBy('startDate','desc').get();
    _all = snap.docs.map(d=>({id:d.id,...d.data()}));
    _all.forEach(s=>{
      if(DateUtil.isExpired(s.endDate)) s._status='expired';
      else if(DateUtil.isExpiringSoon(s.endDate,7)) s._status='expiring';
      else if((s.amountPaid||0)<(s.totalAmount||0)) s._status='partial';
      else s._status='active';
    });
    document.getElementById('subs-count').textContent = `${_all.length} subscriptions`;
    renderTable(_all);
  }

  function renderTable(list){
    const total=list.length; const totalPages=Math.max(1,Math.ceil(total/PER_PAGE));
    if(_page>totalPages)_page=1;
    const slice=list.slice((_page-1)*PER_PAGE,_page*PER_PAGE);
    const tbody=document.getElementById('subs-tbody');
    tbody.innerHTML=slice.map((s,i)=>{
      const num=(_page-1)*PER_PAGE+i+1;
      const remaining=(s.totalAmount||0)-(s.amountPaid||0);
      const remColor=remaining>0?'var(--danger)':'var(--success)';
      const statusBadge={
        active:`<span class="badge badge-active">● ${App.t('active')}</span>`,
        expired:`<span class="badge badge-expired">● ${App.t('expired')}</span>`,
        expiring:`<span class="badge badge-warning">● ${App.t('expiring_soon')}</span>`,
        partial:`<span class="badge badge-info">⊘ ${App.t('partial')}</span>`
      }[s._status]||'';
      const esc=(s.subscriberName||'').replace(/'/g,"\\'");
      const payBtn=remaining>0?`<button class="btn btn-success btn-sm" onclick="SubscriptionsModule.payRemaining('${s.id}','${esc}',${remaining})">💰 Pay</button>`:'';
      return `<tr>
        <td class="dt-only" style="color:var(--text-muted)">${num}</td>
        <td class="dt-only"><strong>${s.subscriberName||'—'}</strong></td>
        <td class="dt-only">${s.sportName||'—'}</td>
        <td class="dt-only">${s.coachName||'—'}</td>
        <td class="dt-only" style="font-size:11px">${DateUtil.format(s.startDate)}<br>${DateUtil.format(s.endDate)}</td>
        <td class="dt-only">${statusBadge}</td>
        <td class="dt-only">${Currency.formatUSD(s.totalAmount||0)}</td>
        <td class="dt-only" style="color:var(--success)">${Currency.formatUSD(s.amountPaid||0)}</td>
        <td class="dt-only" style="color:${remColor}">${Currency.formatUSD(remaining)}</td>
        <td class="dt-only"><div class="flex gap-2">${payBtn}
          <button class="btn btn-danger btn-sm btn-icon" onclick="SubscriptionsModule.del('${s.id}')">🗑</button>
        </div></td>
        <td class="mob-only" colspan="10" style="padding:6px 0;border:none">
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div style="font-weight:700;font-size:14px">${s.subscriberName||'—'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${s.sportName||''} ${s.coachName?'· '+s.coachName:''}</div>
              </div>
              ${statusBadge}
            </div>
            <div class="mobile-card-body">
              <div class="mobile-card-row"><span>Period</span><span style="font-size:11px">${DateUtil.format(s.startDate)} → ${DateUtil.format(s.endDate)}</span></div>
              <div class="mobile-card-row"><span>Total</span><span>${Currency.formatUSD(s.totalAmount||0)}</span></div>
              <div class="mobile-card-row"><span>Paid</span><span style="color:var(--success)">${Currency.formatUSD(s.amountPaid||0)}</span></div>
              <div class="mobile-card-row"><span>Remaining</span><span style="color:${remColor}">${Currency.formatUSD(remaining)}</span></div>
            </div>
            <div class="mobile-card-actions">${payBtn}
              <button class="btn btn-danger btn-sm" onclick="SubscriptionsModule.del('${s.id}')">🗑 Delete</button>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('subs-pag-info').textContent=`Showing ${Math.min((_page-1)*PER_PAGE+1,total)}–${Math.min(_page*PER_PAGE,total)} of ${total}`;
    renderPagination('subs-pagination',_page,Math.max(1,Math.ceil(total/PER_PAGE)),'SubscriptionsModule.goPage');
  }

  function goPage(p){_page=p;renderTable(_all);}
  const onSearch=debounce(v=>{const q=v.toLowerCase();renderTable(_all.filter(s=>s.subscriberName?.toLowerCase().includes(q)||s.sportName?.toLowerCase().includes(q)));},280);
  function onFilter(){const f=document.getElementById('subs-filter')?.value;renderTable(f?_all.filter(s=>s._status===f):_all);}

  function buildModal(){
    const t=App.t.bind(App);
    return `<div class="modal-overlay" id="modal-subscription">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">${t('new_subscription')}</span>
          <button class="modal-close" onclick="Modal.close('modal-subscription')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-section-title">Link Subscriber</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Subscriber <span class="required">*</span></label>
              <select class="form-select" id="subf-subscriber"><option value="">Select subscriber…</option></select>
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('sport')} <span class="required">*</span></label>
              <select class="form-select" id="subf-sport"><option value="">Select sport…</option></select>
              <div class="form-error-msg"></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('coach')}</label>
              <select class="form-select" id="subf-coach"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Months</label>
              <select class="form-select" id="subf-months">
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>
          </div>
          <div class="form-section-title">Payment</div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Total Price (USD) <span class="required">*</span></label>
              <div class="currency-input-wrap">
                <span class="currency-prefix">$</span>
                <input class="form-input" id="subf-price" type="number" min="0" placeholder="0">
              </div>
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('amount_paid')} (USD) <span class="required">*</span></label>
              <div class="currency-input-wrap">
                <span class="currency-prefix">$</span>
                <input class="form-input" id="subf-paid" type="number" min="0" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('payment_method')}</label>
              <select class="form-select" id="subf-paymethod">
                <option value="cash">${t('cash')}</option>
                <option value="partial">${t('partial')}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('start_date')} <span class="required">*</span></label>
              <input class="form-input" id="subf-start" type="date" value="${DateUtil.today()}">
            </div>
            <div class="form-group" id="subf-end-group">
              <label class="form-label">${t('end_date')} (auto)</label>
              <input class="form-input" id="subf-end" type="date" readonly>
            </div>
          </div>
          <div class="form-row cols-1">
            <div class="form-group">
              <label class="form-label">${t('notes')}</label>
              <textarea class="form-textarea" id="subf-notes" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-subscription')">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="SubscriptionsModule.save()">💾 ${t('save')}</button>
        </div>
      </div>
    </div>`;
  }

  function openNew(subscriberId='', subscriberName=''){
    ['subf-sport','subf-coach','subf-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    populateCoachSelect();
    document.getElementById('subf-price').value='';
    document.getElementById('subf-paid').value='';
    document.getElementById('subf-start').value=DateUtil.today();
    document.getElementById('subf-end').value='';
    if(subscriberId){const sel=document.getElementById('subf-subscriber');if(sel)sel.value=subscriberId;}
    // Auto-calculate end date
    const startEl=document.getElementById('subf-start');
    const monthsEl=document.getElementById('subf-months');
    const endEl=document.getElementById('subf-end');
    const calcEnd=()=>{if(startEl.value&&monthsEl.value)endEl.value=DateUtil.addMonths(startEl.value,Number(monthsEl.value));};
    startEl.addEventListener('change',calcEnd);
    monthsEl.addEventListener('change',calcEnd);
    calcEnd();
    Modal.open('modal-subscription');
  }

  async function save(){
    if(!Validate.form([
      {id:'subf-subscriber',rules:['required'],label:'Subscriber'},
      {id:'subf-sport',rules:['required'],label:'Sport'},
      {id:'subf-price',rules:['required'],label:'Price'},
      {id:'subf-paid',rules:['required'],label:'Amount Paid'},
      {id:'subf-start',rules:['required'],label:'Start Date'},
    ]))return;
    const subId=document.getElementById('subf-subscriber').value;
    const spId=document.getElementById('subf-sport').value;
    const coId=document.getElementById('subf-coach').value;
    const sub=_subscribers.find(s=>s.id===subId);
    const sport=_sports.find(s=>s.id===spId);
    const coach=_coaches.find(c=>c.id===coId)||null;
    const data={
      subscriberId:subId, subscriberName:sub?.name||'',
      sportId:spId, sportName:sport?.name||'',
      coachId:coId||null, coachName:coach?.name||null,
      coachCommission:coach?.commission||0,
      totalAmount:Number(document.getElementById('subf-price').value)||0,
      amountPaid:Number(document.getElementById('subf-paid').value)||0,
      paymentMethod:document.getElementById('subf-paymethod').value,
      startDate:document.getElementById('subf-start').value,
      endDate:document.getElementById('subf-end').value,
      notes:document.getElementById('subf-notes').value.trim(),
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    try{
      await _db.collection(COL.SUBSCRIPTIONS).add(data);
      await logActivity(_db,'subscription_added',{subscriber:data.subscriberName,sport:data.sportName});
      Toast.success(App.t('saved')); Modal.close('modal-subscription'); await loadData();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  function payRemaining(id,name,remaining){
    Modal.confirm({title:'Record Payment',
      message:`Record remaining payment of <strong>${Currency.formatUSD(remaining)}</strong> for <strong>${name}</strong>?`,
      type:'success',confirmText:'💰 Confirm Payment',
      onConfirm:async()=>{
        const doc=_db.collection(COL.SUBSCRIPTIONS).doc(id);
        const snap=await doc.get(); const d=snap.data();
        await doc.update({amountPaid:(d.totalAmount||0)});
        Toast.success('Payment recorded!'); await loadData();
      }
    });
  }

  function del(id){Modal.confirm({title:'Delete',message:App.t('delete_confirm'),type:'danger',confirmText:App.t('delete'),onConfirm:async()=>{await _db.collection(COL.SUBSCRIPTIONS).doc(id).delete();Toast.success(App.t('deleted'));await loadData();}});}

  return {render,openNew,save,payRemaining,del,onSearch,onFilter,goPage};
})();