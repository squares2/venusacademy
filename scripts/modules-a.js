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
    { key:'sun' }, { key:'mon' }, { key:'tue' },
    { key:'wed' }, { key:'thu' }, { key:'fri' },
    { key:'sat' }
  ];
  function dayLabel(key) { return App.t('day_' + key); }

  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? App.t('pm_label') : App.t('am_label');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2,'0')} ${period}`;
  }

  function formatDays(days) {
    if (!days || !days.length) return '';
    if (days.length === 7) return App.t('daily_word');
    return DAYS.filter(d => days.includes(d.key)).map(d => dayLabel(d.key)).join(' ');
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
        ${FilterMemory.resetButton('coaches')}
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
                <label class="form-label">${t('monthly_base_salary')}</label>
                <input class="form-input" id="cf-salary" type="number" min="0" placeholder="0">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">${t('email_lbl')}</label>
                <input class="form-input" id="cf-email" type="email">
              </div>
            </div>

            <div class="form-section-title">${t('sport_specialties_schedule')}</div>
            <div id="specialty-rows"></div>
            <button class="btn btn-outline btn-sm" type="button" onclick="CoachesModule.addRow()" style="margin-bottom:18px">
              ${t('add_sport_specialty')}
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
    FilterMemory.register('coaches', { session: ['coach-search'], onReset: () => renderGrid(filteredCoaches()) });
    FilterMemory.restore('coaches');
    await loadData();
  }

  async function loadData() {
    const [coSnap, spSnap] = await Promise.all([
      _db.collection(COL.COACHES).orderBy('name').get(),
      _db.collection(COL.SPORTS).orderBy('name').get(),
    ]);
    _all = coSnap.docs.map(d => ({id:d.id,...d.data()}));
    _sports = spSnap.docs.map(d => ({id:d.id,...d.data()}));
    document.getElementById('coach-count').textContent = `${_all.length} ${App.t(_all.length===1?'coach_singular':'coach_plural')}`;
    renderGrid(filteredCoaches()); // keep the current search after saves/deletes
  }

  function filteredCoaches() {
    const q = (document.getElementById('coach-search')?.value || '').trim().toLowerCase();
    return !q ? _all : _all.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      (c.specialties || []).some(sp => sp.sportName?.toLowerCase().includes(q)));
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
        <div class="coach-specialty-tags">${tags || `<span class="text-muted text-sm">${App.t('no_sports_assigned')}</span>`}</div>
        <div class="flex gap-2" style="margin-top:8px">
          ${c.phone ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window.open('${buildWhatsAppLink(c.phone,App.t('hello_from_venus'))}','_blank')">💬 WhatsApp</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="CoachesModule.openEdit('${c.id}')">✏️ ${App.t('edit')}</button>
          <button class="btn btn-danger btn-sm" onclick="CoachesModule.del('${c.id}','${c.name.replace(/'/g,"\\'")}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  const onSearch = debounce(() => {
    FilterMemory.save('coaches');
    renderGrid(filteredCoaches());
  }, 280);

  /* ── Specialty rows (multi-sport + schedule) ─────────── */
  function freshRow() { return { sportId: '', days: [], time: '' }; }

  function renderRows() {
    const el = document.getElementById('specialty-rows');
    if (!el) return;
    if (!_rows.length) {
      el.innerHTML = `<p class="text-muted text-sm" style="margin-bottom:12px">${App.t('no_sports_assigned_yet_click')}</p>`;
      return;
    }
    el.innerHTML = _rows.map((row, i) => {
      const takenElsewhere = _rows.filter((r, j) => j !== i).map(r => r.sportId);
      const options = _sports.filter(s => !takenElsewhere.includes(s.id) || s.id === row.sportId);
      return `
        <div class="specialty-row">
          <div class="specialty-row-top">
            <select class="form-select" onchange="CoachesModule.setRowSport(${i}, this.value)">
              <option value="">${App.t('select_sport_placeholder')}</option>
              ${options.map(s => `<option value="${s.id}" ${row.sportId === s.id ? 'selected' : ''}>${s.icon || ''} ${s.name}</option>`).join('')}
            </select>
            <input class="form-input" type="time" value="${row.time || ''}" onchange="CoachesModule.setRowTime(${i}, this.value)" title="${App.t('session_time')}">
            <button class="btn btn-danger btn-sm btn-icon" type="button" onclick="CoachesModule.removeRow(${i})">✕</button>
          </div>
          <div class="day-chip-row">
            ${DAYS.map(d => `
              <span class="day-chip ${row.days.includes(d.key) ? 'active' : ''}" onclick="CoachesModule.toggleRowDay(${i}, '${d.key}')">${dayLabel(d.key)}</span>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function addRow() {
    if (_rows.length >= _sports.length) { Toast.warning(App.t('all_sports_assigned_warning')); return; }
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
      {id:'cf-commission',rules:['required'],label:App.t('commission')},
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
    Modal.confirm({ title:App.t('delete_coach_title'), message:`${App.t('delete_confirm')}<br><strong>${name}</strong>`, type:'danger',
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
                <label class="form-label">${t('name_en')} <span class="required">*</span></label>
                <input class="form-input" id="spf-name" placeholder="e.g. Yoga">
                <div class="form-error-msg"></div>
              </div>
              <div class="form-group">
                <label class="form-label">${t('name_ar')}</label>
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
                <label class="form-label">${t('icon_word')}</label>
                <select class="form-select" id="spf-icon">
                  ${SPORT_ICONS.map(i=>`<option value="${i}">${i} ${i}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row cols-1">
              <div class="form-group">
                <label class="form-label">${t('description_word')}</label>
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
    document.getElementById('sport-count').textContent = `${_all.length} ${App.t(_all.length===1?'sport':'sports').toLowerCase()}`;
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
    if(!Validate.form([{id:'spf-name',rules:['required'],label:App.t('name_generic')},{id:'spf-price',rules:['required'],label:App.t('price_generic')}]))return;
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
    Modal.confirm({title:App.t('delete_sport_title'),message:`${App.t('delete_confirm')}<br><strong>${name}</strong>`,type:'danger',
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
  let _expanded = new Set(), _lastGroups = []; // subscriber groups open in the list
  let _selected = new Set(); // subscription ids picked for bulk actions
  let _debt = new Map();      // subscriberKey → { count, owed, items } across ALL subscriptions
  let _debtShowAll = false;
  let _editId = null;
  let _renewPromise = null, _lastRenewRun = 0;
  const RENEW_THROTTLE_MS = 10 * 60 * 1000;

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
      <div id="subs-debt-panel"></div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="subs-search" placeholder="${t('search_subscriber_or_sport')}" autocomplete="off"
            oninput="SubscriptionsModule.onSearch(this.value)"
            onfocus="SubscriptionsModule.showSearchSuggestions(this.value)"
            onblur="setTimeout(SubscriptionsModule.hideSearchSuggestions, 150)">
          <div class="combo-dropdown" id="subs-search-dropdown"></div>
        </div>
        <select class="filter-select" id="subs-filter" onchange="SubscriptionsModule.onFilter();SubscriptionsModule.refreshDebtPanel()">
          <option value="">${t('all_status')}</option>
          <option value="active">${t('active')}</option>
          <option value="expired">${t('expired')}</option>
          <option value="expiring">${t('expiring_soon')}</option>
          <option value="partial">${t('partial')}</option>
          <option value="unpaid">${t('unpaid')}</option>
          <option value="frozen">❄ ${t('frozen_word')}</option>
          <option value="multi_debt">⚠ ${t('owes_multi_filter')}</option>
        </select>
        <select class="filter-select" id="subs-filter-sport" onchange="SubscriptionsModule.onFilter()">
          <option value="">${t('all_sports')}</option>
        </select>
        <select class="filter-select" id="subs-filter-coach" onchange="SubscriptionsModule.onFilter()">
          <option value="">${t('all_coaches')}</option>
          <option value="__none">${t('no_coach_lbl')}</option>
        </select>
        <select class="filter-select" id="subs-filter-date" onchange="SubscriptionsModule.onDateFilter()" title="${t('start_date_filter_hint')}">
          <option value="">${t('all_dates')}</option>
          <option value="month">${t('period_this_month')}</option>
          <option value="last_month">${t('period_last_month')}</option>
          <option value="3month">${t('period_last_3_months')}</option>
          <option value="6month">${t('period_last_6_months')}</option>
          <option value="year">${t('period_this_year')}</option>
          <option value="custom">${t('custom_range')}</option>
        </select>
        <div class="subs-date-range" id="subs-date-range" style="display:none">
          <input class="filter-select" type="date" id="subs-date-from" title="${t('from_date')}" onchange="SubscriptionsModule.onFilter()">
          <span class="subs-date-sep">→</span>
          <input class="filter-select" type="date" id="subs-date-to" title="${t('to_date')}" onchange="SubscriptionsModule.onFilter()">
        </div>
        ${FilterMemory.resetButton('subs')}
        <button class="btn btn-outline subs-expand-all" id="subs-expand-all" onclick="SubscriptionsModule.toggleAllGroups()">⊞ ${t('expand_all')}</button>
      </div>
      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th class="subs-sel-cell"><input type="checkbox" class="subs-cb" id="subs-cb-all" title="${t('select_page')}" onchange="SubscriptionsModule.selectPage(this.checked)"></th>
              <th>#</th><th>${t('subscriber_singular')}</th><th>${t('sport')}</th>
              <th>${t('coach')}</th><th>${t('period_col')}</th><th>${t('status_lbl')}</th>
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
      <div class="subs-bulk-bar" id="subs-bulk-bar" aria-live="polite">
        <div class="subs-bulk-count"><span id="subs-bulk-n">0</span> ${t('selected_word')}</div>
        <div class="subs-bulk-actions">
          <button class="btn btn-outline btn-sm" onclick="SubscriptionsModule.bulkStartDate()">📅 ${t('bulk_change_start')}</button>
          <button class="btn btn-outline btn-sm" onclick="SubscriptionsModule.bulkCoach()">🏋️ ${t('bulk_change_coach')}</button>
          <button class="btn btn-outline btn-sm subs-bulk-freeze" onclick="SubscriptionsModule.bulkFreeze()">❄ ${t('freeze_word')}</button>
          <button class="btn btn-outline btn-sm subs-bulk-freeze" onclick="SubscriptionsModule.bulkUnfreeze()">☀️ ${t('unfreeze_word')}</button>
          <button class="btn btn-danger btn-sm" onclick="SubscriptionsModule.bulkDelete()">🗑 ${t('delete')}</button>
          <button class="btn btn-ghost btn-sm subs-bulk-clear" title="${t('clear_selection')}" onclick="SubscriptionsModule.clearSelection()">✕</button>
        </div>
      </div>
      ${buildModal()}`;
    await loadDeps();
    // Bring back this user's last filters (after sport/coach options exist)
    FilterMemory.register('subs', {
      persist: ['subs-filter','subs-filter-sport','subs-filter-coach','subs-filter-date','subs-date-from','subs-date-to'],
      session: ['subs-search'],
      onReset: () => { syncDateRangeUI(); onFilter(); renderDebtPanel(); },
    });
    FilterMemory.restore('subs');
    syncDateRangeUI();
    try {
      const renewed = await processAutoRenewals(_db);
      if (renewed > 0) Toast.info(`${renewed} ${App.t('auto_renewed_count')}`);
    } catch (e) { console.error('Auto-renew failed:', e); }
    await loadData();
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
    const spSel = document.getElementById('subf-sport');
    const coSel = document.getElementById('subf-coach');
    if(spSel) _sports.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} — ${Currency.formatUSD(s.price)}`;spSel.appendChild(o);});
    populateCoachSelect(); // full list until a sport narrows it down
    if(spSel) spSel.addEventListener('change',()=>{autoFillPrice(); populateCoachSelect(spSel.value);});
    // List filters (sport / coach)
    const fSp = document.getElementById('subs-filter-sport');
    const fCo = document.getElementById('subs-filter-coach');
    if(fSp) _sports.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;fSp.appendChild(o);});
    if(fCo) _coaches.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;fCo.appendChild(o);});
  }

  /* ── Searchable subscriber combo ──────────────────── */
  function renderSubscriberDropdown(query) {
    const dd = document.getElementById('subf-subscriber-dropdown');
    if (!dd) return;
    const q = (query || '').trim().toLowerCase();
    const matches = !q ? _subscribers
      : _subscribers.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q));
    dd.innerHTML = matches.length
      ? matches.slice(0, 50).map(s => {
          const esc = (s.name || '').replace(/'/g, "\\'");
          return `<div class="combo-item" onmousedown="event.preventDefault();SubscriptionsModule.selectSubscriber('${s.id}','${esc}')">
            <span>${s.name}</span>${s.phone ? `<span class="combo-item-sub">${s.phone}</span>` : ''}
          </div>`;
        }).join('')
      : `<div class="combo-item combo-empty">${App.t('no_matching_subscribers')}</div>`;
    dd.classList.add('open');
  }

  function onSubscriberSearch(val) {
    const hidden = document.getElementById('subf-subscriber');
    if (hidden) hidden.value = ''; // typing invalidates the previous pick until re-selected from the list
    renderSubscriberDropdown(val);
  }

  function selectSubscriber(id, name) {
    const hidden = document.getElementById('subf-subscriber');
    const input = document.getElementById('subf-subscriber-input');
    if (hidden) hidden.value = id;
    if (input) input.value = name;
    hideSubscriberDropdown();
  }

  function hideSubscriberDropdown() {
    const dd = document.getElementById('subf-subscriber-dropdown');
    if (dd) dd.classList.remove('open');
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
    noneOpt.value = ''; noneOpt.textContent = App.t('no_coach_lbl');
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
      if(s.frozen) s._status='frozen';            // frozen overrides dates: not active, not expiring, no renewal
      else if(DateUtil.isExpired(s.endDate)) s._status='expired';
      else if(DateUtil.isExpiringSoon(s.endDate)) s._status='expiring';
      else if(!(s.amountPaid>0) && (s.totalAmount||0)>0) s._status='unpaid';
      else if((s.amountPaid||0)<(s.totalAmount||0)) s._status='partial';
      else s._status='active';
    });
    const ids = new Set(_all.map(x=>x.id));
    _selected.forEach(id => { if (!ids.has(id)) _selected.delete(id); });
    buildDebtMap();
    renderDebtPanel();
    renderTable(getFiltered());
    if (typeof WaQueue !== 'undefined') WaQueue.autoScan(_db).catch(() => {}); // once a day: queue expiring / unpaid reminders
  }

  /* ── Combined list filter: search text + status + sport + coach ── */
  function getFiltered() {
    const q = (document.getElementById('subs-search')?.value || '').trim().toLowerCase();
    const st = document.getElementById('subs-filter')?.value || '';
    const sp = document.getElementById('subs-filter-sport')?.value || '';
    const co = document.getElementById('subs-filter-coach')?.value || '';
    const [dFrom, dTo] = getDateRange();
    return _all.filter(s => {
      if (dFrom && (s.startDate||'') < dFrom) return false;
      if (dTo && (s.startDate||'') > dTo) return false;
      if (q && !(s.subscriberName?.toLowerCase().includes(q) || s.sportName?.toLowerCase().includes(q))) return false;
      if (st === 'multi_debt') {
        // unpaid fees of subscribers who owe 2+ fees
        if (!((s.totalAmount||0) - (s.amountPaid||0) > 0)) return false;
        if ((_debt.get(_subKey(s))?.count || 0) < 2) return false;
      } else if (st && s._status !== st) return false;
      if (sp && s.sportId !== sp) return false;
      if (co === '__none') { if (s.coachId) return false; }
      else if (co && s.coachId !== co) return false;
      return true;
    });
  }

  /* ── Row builders ───────────────────────────────────── */
  function subBadges(s) {
    const statusBadge={
      active:`<span class="badge badge-active">● ${App.t('active')}</span>`,
      expired:`<span class="badge badge-expired">● ${App.t('expired')}</span>`,
      expiring:`<span class="badge badge-warning">● ${App.t('expiring_soon')}</span>`,
      partial:`<span class="badge badge-info">⊘ ${App.t('partial')}</span>`,
      unpaid:`<span class="badge badge-expired">✕ ${App.t('unpaid')}</span>`,
      frozen:`<span class="badge badge-frozen" title="${App.t('frozen_since')} ${DateUtil.format(s.frozenAt)}">❄ ${App.t('frozen_word')} · ${_frozenDays(s)} ${App.t('days_word')}</span>`
    }[s._status]||'';
    const renewBadge = s.autoRenew
      ? `<span class="badge badge-gold${s.frozen?' is-paused':''}" title="${App.t(s.frozen?'auto_renew_paused_hint':'auto_renew_hint')}">🔁 ${App.t('auto_renew_badge')}${s.frozen?' ⏸':''}</span>`
      : s.renewedToId
        ? `<span class="badge" style="background:var(--bg-hover);color:var(--text-secondary)">↻ ${App.t('renewed_badge')}</span>`
        : '';
    return `<div class="flex gap-2" style="flex-wrap:wrap">${statusBadge}${renewBadge}</div>`;
  }

  // One subscription row. opts.child → nested under a subscriber group.
  function subRowHtml(s, num, opts = {}) {
    const { child = false, gid = '', expanded = false, isLatest = false, idx = 0 } = opts;
    const remaining=(s.totalAmount||0)-(s.amountPaid||0);
    const remColor=remaining>0?'var(--danger)':'var(--success)';
    const badges = subBadges(s);
    const esc=(s.subscriberName||'').replace(/'/g,"\\'");
    const payBtn=remaining>0?`<button class="btn btn-success btn-sm" onclick="SubscriptionsModule.payRemaining('${s.id}','${esc}',${remaining})">💰 ${App.t('pay_btn')}</button>`:'';
    const latestTag = isLatest ? `<span class="subs-latest-tag">${App.t('latest_word')}</span>` : '';
    const sel = _selected.has(s.id);
    const trAttrs = (child
      ? `class="subs-child-row${expanded?'':' is-collapsed'}${sel?' is-selected':''}" data-gid="${gid}"`
      : `class="${sel?'is-selected':''}"`) + ` data-sid="${s.id}"` + (s.frozen ? ' data-frozen="1"' : '');
    const cb = `<input type="checkbox" class="subs-cb" data-id="${s.id}" ${sel?'checked':''} onclick="event.stopPropagation()" onchange="SubscriptionsModule.toggleSelect('${s.id}',this.checked)">`;
    const numCell = child
      ? `<span class="subs-child-idx">${idx}</span>`
      : num;
    const nameCell = child
      ? `<div class="subs-child-name"><span class="subs-child-arrow">↳</span>${DateUtil.format(s.startDate)} ${latestTag}</div>`
      : `<strong>${s.subscriberName||'—'}</strong>`;
    return `<tr ${trAttrs}>
      <td class="dt-only subs-sel-cell">${cb}</td>
      <td class="dt-only" style="color:var(--text-muted)">${numCell}</td>
      <td class="dt-only">${nameCell}</td>
      <td class="dt-only">${s.sportName||'—'}</td>
      <td class="dt-only">${s.coachName||'—'}</td>
      <td class="dt-only" style="font-size:11px">${DateUtil.format(s.startDate)}<br>${DateUtil.format(s.endDate)}</td>
      <td class="dt-only">${badges}</td>
      <td class="dt-only">${Currency.formatUSD(s.totalAmount||0)}</td>
      <td class="dt-only" style="color:var(--success)">${Currency.formatUSD(s.amountPaid||0)}</td>
      <td class="dt-only" style="color:${remColor}">${Currency.formatUSD(remaining)}</td>
      <td class="dt-only"><div class="flex gap-2">${payBtn}
        ${freezeBtn(s, true)}
        <button class="btn btn-outline btn-sm btn-icon" onclick="SubscriptionsModule.openEdit('${s.id}')">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="SubscriptionsModule.del('${s.id}')">🗑</button>
      </div></td>
      <td class="mob-only" colspan="11" style="padding:${child?'0 0 6px':'6px 0'};border:none">
        <div class="mobile-card${child?' subs-child-card':''}">
          <div class="mobile-card-header">
            <div class="subs-mob-head">${cb}<div>
              <div style="font-weight:700;font-size:14px">${child ? `${DateUtil.format(s.startDate)} ${latestTag}` : (s.subscriberName||'—')}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.sportName||''} ${s.coachName?'· '+s.coachName:''}</div>
            </div></div>
            ${badges}
          </div>
          <div class="mobile-card-body">
            <div class="mobile-card-row"><span>${App.t('period_col')}</span><span style="font-size:11px">${DateUtil.format(s.startDate)} → ${DateUtil.format(s.endDate)}</span></div>
            <div class="mobile-card-row"><span>${App.t('total')}</span><span>${Currency.formatUSD(s.totalAmount||0)}</span></div>
            <div class="mobile-card-row"><span>${App.t('paid')}</span><span style="color:var(--success)">${Currency.formatUSD(s.amountPaid||0)}</span></div>
            <div class="mobile-card-row"><span>${App.t('remaining')}</span><span style="color:${remColor}">${Currency.formatUSD(remaining)}</span></div>
          </div>
          <div class="mobile-card-actions">${payBtn}
            ${freezeBtn(s, false)}
            <button class="btn btn-outline btn-sm" onclick="SubscriptionsModule.openEdit('${s.id}')">✏️ ${App.t('edit')}</button>
            <button class="btn btn-danger btn-sm" onclick="SubscriptionsModule.del('${s.id}')">🗑 ${App.t('delete')}</button>
          </div>
        </div>
      </td>
    </tr>`;
  }

  // Collapsed summary row for a subscriber with 2+ (filtered) subscriptions.
  function groupRowHtml(g, num, gid, expanded) {
    const latest = g.items[0];
    const total = g.items.reduce((t,s)=>t+(s.totalAmount||0),0);
    const paid = g.items.reduce((t,s)=>t+(s.amountPaid||0),0);
    const remaining = total - paid;
    const remColor = remaining>0?'var(--danger)':'var(--success)';
    const unpaidCount = g.items.filter(s=>(s.totalAmount||0)-(s.amountPaid||0)>0).length;
    const sports = [...new Set(g.items.map(s=>s.sportName).filter(Boolean))];
    const sportTxt = sports.length<=1 ? (sports[0]||'—') : `${sports[0]} <span class="subs-more">+${sports.length-1}</span>`;
    const earliest = g.items[g.items.length-1];
    const esc = (latest.subscriberName||'').replace(/'/g,"\\'");
    const countPill = `<span class="subs-count-pill">${g.items.length} ${App.t('subs_short')}</span>`;
    const gDebt = _debt.get(g.key);
    const unpaidNote = gDebt && gDebt.count >= 2
      ? `<div class="debt-pill ${gDebt.count>=3?'is-high':''}" title="${App.t('owes_total')}: ${Currency.formatUSD(gDebt.owed)}">⚠ ${gDebt.count} ${App.t('unpaid_fees')}</div>`
      : unpaidCount ? `<div class="subs-unpaid-note">${unpaidCount} ${App.t('with_balance')}</div>` : '';
    const chevron = `<span class="subs-chevron">▸</span>`;
    const addBtn = latest.subscriberId
      ? `<button class="btn btn-outline btn-sm btn-icon" title="${App.t('new_subscription')}" onclick="event.stopPropagation();SubscriptionsModule.openNew('${latest.subscriberId}','${esc}')">＋</button>` : '';
    const nSel = g.items.filter(x=>_selected.has(x.id)).length;
    const gcb = `<input type="checkbox" class="subs-cb subs-gcb" data-gid="${gid}" ${nSel===g.items.length?'checked':''} onclick="event.stopPropagation()" onchange="SubscriptionsModule.selectGroup('${gid}',this.checked)">`;
    return `<tr class="subs-group-row${expanded?' is-open':''}${nSel===g.items.length?' is-selected':''}${gDebt&&gDebt.count>=2?' is-debtor':''}" id="${gid}" onclick="SubscriptionsModule.toggleGroup('${gid}')">
      <td class="dt-only subs-sel-cell">${gcb}</td>
      <td class="dt-only"><div class="subs-group-num">${chevron}<span>${num}</span></div></td>
      <td class="dt-only"><div class="subs-group-name"><strong>${latest.subscriberName||'—'}</strong>${countPill}</div></td>
      <td class="dt-only">${sportTxt}</td>
      <td class="dt-only">${latest.coachName||'—'}</td>
      <td class="dt-only" style="font-size:11px">${DateUtil.format(earliest.startDate)}<br>${DateUtil.format(latest.endDate)}</td>
      <td class="dt-only">${subBadges(latest)}</td>
      <td class="dt-only">${Currency.formatUSD(total)}</td>
      <td class="dt-only" style="color:var(--success)">${Currency.formatUSD(paid)}</td>
      <td class="dt-only" style="color:${remColor}">${Currency.formatUSD(remaining)}${unpaidNote}</td>
      <td class="dt-only"><div class="flex gap-2">${addBtn}
        <button class="btn btn-ghost btn-sm subs-expand-btn" onclick="event.stopPropagation();SubscriptionsModule.toggleGroup('${gid}')">${App.t(expanded?'hide_word':'show_word')}</button>
      </div></td>
      <td class="mob-only" colspan="11" style="padding:6px 0;border:none">
        <div class="mobile-card subs-group-card">
          <div class="mobile-card-header">
            <div class="subs-mob-head">${gcb}<div>
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px">${chevron}${latest.subscriberName||'—'} ${countPill}</div>
              <div style="font-size:11px;color:var(--text-muted)">${sports.join(' · ')}</div>
            </div></div>
            ${subBadges(latest)}
          </div>
          <div class="mobile-card-body">
            <div class="mobile-card-row"><span>${App.t('period_col')}</span><span style="font-size:11px">${DateUtil.format(earliest.startDate)} → ${DateUtil.format(latest.endDate)}</span></div>
            <div class="mobile-card-row"><span>${App.t('total')}</span><span>${Currency.formatUSD(total)}</span></div>
            <div class="mobile-card-row"><span>${App.t('paid')}</span><span style="color:var(--success)">${Currency.formatUSD(paid)}</span></div>
            <div class="mobile-card-row"><span>${App.t('remaining')}</span><span style="color:${remColor}">${Currency.formatUSD(remaining)}</span></div>
          </div>
        </div>
      </td>
    </tr>`;
  }

  // Groups the (already filtered) list by subscriber; newest first inside and across groups.
  function groupBySubscriber(list) {
    const map = new Map();
    list.forEach(s => {
      const key = s.subscriberId || ('name:' + (s.subscriberName||''));
      if (!map.has(key)) map.set(key, { key, items: [] });
      map.get(key).items.push(s);
    });
    const ts = s => s.createdAt?.toMillis?.() || 0;
    const groups = [...map.values()];
    groups.forEach(g => g.items.sort((a,b) =>
      (b.startDate||'').localeCompare(a.startDate||'') || ts(b) - ts(a)));
    groups.sort((a,b) =>
      (b.items[0].startDate||'').localeCompare(a.items[0].startDate||'') || ts(b.items[0]) - ts(a.items[0]));
    return groups;
  }

  function renderTable(list){
    const total=list.length;
    // Header count follows the active filters (shows "x / all" while filtering)
    const countEl=document.getElementById('subs-count');
    if(countEl) countEl.textContent = `${total===_all.length?total:`${total} / ${_all.length}`} ${App.t('subscriptions').toLowerCase()}`;
    const groups = groupBySubscriber(list);
    _lastGroups = groups;
    const totalGroups = groups.length;
    const totalPages=Math.max(1,Math.ceil(totalGroups/PER_PAGE));
    if(_page>totalPages)_page=1;
    const slice=groups.slice((_page-1)*PER_PAGE,_page*PER_PAGE);
    const tbody=document.getElementById('subs-tbody');
    tbody.innerHTML = slice.length ? slice.map((g,i)=>{
      const num=(_page-1)*PER_PAGE+i+1;
      if (g.items.length === 1) return subRowHtml(g.items[0], num);
      const gid = 'sg-' + groupDomId(g.key);
      const expanded = _expanded.has(g.key);
      return groupRowHtml(g, num, gid, expanded) +
        g.items.map((s,j)=>subRowHtml(s, num, { child:true, gid, expanded, isLatest:j===0, idx:`${num}.${j+1}` })).join('');
    }).join('') : `<tr><td colspan="11" class="table-empty text-muted" style="text-align:center">${App.t('no_matches')}</td></tr>`;
    document.getElementById('subs-pag-info').textContent=`${App.t('subscribers')}: ${Math.min((_page-1)*PER_PAGE+1,totalGroups)}–${Math.min(_page*PER_PAGE,totalGroups)} / ${totalGroups}`;
    renderPagination('subs-pagination',_page,totalPages,'SubscriptionsModule.goPage');
    updateExpandAllBtn();
    updateSelectionUI();
  }

  /* ── Group expand / collapse ────────────────────────── */
  function groupDomId(key) { return encodeURIComponent(key).replace(/[^A-Za-z0-9_-]/g, '_'); }

  function setGroupOpen(gid, key, open) {
    if (open) _expanded.add(key); else _expanded.delete(key);
    const row = document.getElementById(gid);
    if (row) {
      row.classList.toggle('is-open', open);
      const btn = row.querySelector('.subs-expand-btn');
      if (btn) btn.textContent = App.t(open ? 'hide_word' : 'show_word');
    }
    document.querySelectorAll(`tr.subs-child-row[data-gid="${gid}"]`)
      .forEach(tr => tr.classList.toggle('is-collapsed', !open));
  }

  function toggleGroup(gid) {
    const g = _lastGroups.find(x => 'sg-' + groupDomId(x.key) === gid);
    if (!g) return;
    setGroupOpen(gid, g.key, !_expanded.has(g.key));
    updateExpandAllBtn();
  }

  function toggleAllGroups() {
    const multi = _lastGroups.filter(g => g.items.length > 1);
    const openAll = !multi.every(g => _expanded.has(g.key));
    multi.forEach(g => setGroupOpen('sg-' + groupDomId(g.key), g.key, openAll));
    updateExpandAllBtn();
  }

  function updateExpandAllBtn() {
    const btn = document.getElementById('subs-expand-all');
    if (!btn) return;
    const multi = _lastGroups.filter(g => g.items.length > 1);
    btn.disabled = !multi.length;
    const allOpen = multi.length && multi.every(g => _expanded.has(g.key));
    btn.innerHTML = allOpen ? `⊟ ${App.t('collapse_all')}` : `⊞ ${App.t('expand_all')}`;
  }

  function goPage(p){_page=p;renderTable(getFiltered());}

  function applySubsSearch() { onFilter(); }
  const _debouncedSubsSearch = debounce(applySubsSearch, 280);

  function onSearch(v) {
    renderSubsSearchSuggestions(v);
    _debouncedSubsSearch(v);
  }

  /* ── Search box type-ahead (subscribers + sports) ──── */
  function renderSubsSearchSuggestions(query) {
    const dd = document.getElementById('subs-search-dropdown');
    if (!dd) return;
    const q = (query || '').trim().toLowerCase();

    const subMatches = (!q ? _subscribers
      : _subscribers.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q))
    ).slice(0, 6);
    const sportMatches = (!q ? _sports
      : _sports.filter(sp => sp.name?.toLowerCase().includes(q))
    ).slice(0, 5);

    if (!subMatches.length && !sportMatches.length) {
      dd.innerHTML = `<div class="combo-item combo-empty">${App.t('no_matches')}</div>`;
      dd.classList.add('open');
      return;
    }

    let html = '';
    if (subMatches.length) {
      html += `<div class="combo-group-label">${App.t('subscribers')}</div>`;
      html += subMatches.map(s => {
        const esc = (s.name || '').replace(/'/g, "\\'");
        return `<div class="combo-item" onmousedown="event.preventDefault();SubscriptionsModule.selectSearchTerm('${esc}')">
          <span>${s.name}</span>${s.phone ? `<span class="combo-item-sub">${s.phone}</span>` : ''}
        </div>`;
      }).join('');
    }
    if (sportMatches.length) {
      html += `<div class="combo-group-label">${App.t('sports')}</div>`;
      html += sportMatches.map(sp => {
        const esc = (sp.name || '').replace(/'/g, "\\'");
        return `<div class="combo-item" onmousedown="event.preventDefault();SubscriptionsModule.selectSearchTerm('${esc}')">
          <span>${sp.icon || '🏋️'} ${sp.name}</span><span class="combo-item-sub">${App.t('sport')}</span>
        </div>`;
      }).join('');
    }
    dd.innerHTML = html;
    dd.classList.add('open');
  }

  function showSearchSuggestions(val) { renderSubsSearchSuggestions(val); }

  function hideSearchSuggestions() {
    const dd = document.getElementById('subs-search-dropdown');
    if (dd) dd.classList.remove('open');
  }

  function selectSearchTerm(text) {
    const input = document.getElementById('subs-search');
    if (input) input.value = text;
    hideSearchSuggestions();
    applySubsSearch(text);
  }

  function onFilter(){
    _page=1;
    FilterMemory.save('subs');
    const list=getFiltered();
    // never act on rows the admin can no longer see
    const visible=new Set(list.map(x=>x.id));
    _selected.forEach(id=>{ if(!visible.has(id)) _selected.delete(id); });
    renderTable(list);
  }

  /* ── Date filter (by subscription start date) ───────── */
  const _ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  // Returns [from, to] as YYYY-MM-DD ('' = open-ended)
  function getDateRange() {
    const mode = document.getElementById('subs-filter-date')?.value || '';
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    switch (mode) {
      case 'month':      return [_ymd(new Date(y, m, 1)),   _ymd(new Date(y, m+1, 0))];
      case 'last_month': return [_ymd(new Date(y, m-1, 1)), _ymd(new Date(y, m, 0))];
      case '3month':     return [_ymd(new Date(y, m-2, 1)), _ymd(new Date(y, m+1, 0))];
      case '6month':     return [_ymd(new Date(y, m-5, 1)), _ymd(new Date(y, m+1, 0))];
      case 'year':       return [_ymd(new Date(y, 0, 1)),   _ymd(new Date(y, 11, 31))];
      case 'custom': {
        let f = document.getElementById('subs-date-from')?.value || '';
        let t = document.getElementById('subs-date-to')?.value || '';
        if (f && t && f > t) [f, t] = [t, f]; // tolerate reversed picks
        return [f, t];
      }
      default: return ['', ''];
    }
  }

  function syncDateRangeUI() {
    const mode = document.getElementById('subs-filter-date')?.value || '';
    const wrap = document.getElementById('subs-date-range');
    if (wrap) wrap.style.display = mode === 'custom' ? 'flex' : 'none';
  }

  function onDateFilter() {
    const mode = document.getElementById('subs-filter-date')?.value || '';
    syncDateRangeUI();
    if (mode !== 'custom') { // custom dates only matter in custom mode
      const f = document.getElementById('subs-date-from'), t = document.getElementById('subs-date-to');
      if (f) f.value = ''; if (t) t.value = '';
    } else {
      const f = document.getElementById('subs-date-from'), t = document.getElementById('subs-date-to');
      const now = new Date();
      if (f && !f.value) f.value = _ymd(new Date(now.getFullYear(), now.getMonth(), 1));
      if (t && !t.value) t.value = _ymd(now);
    }
    onFilter();
  }

  function buildModal(){
    const t=App.t.bind(App);
    return `<div class="modal-overlay" id="modal-subscription">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title" id="subscription-modal-title">${t('new_subscription')}</span>
          <button class="modal-close" onclick="Modal.close('modal-subscription')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-section-title">${t('link_subscriber_section')}</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('subscriber_singular')} <span class="required">*</span></label>
              <div class="combo-select" id="subf-subscriber-combo">
                <input class="form-input" id="subf-subscriber-input" placeholder="${t('type_name_to_search')}" autocomplete="off"
                  oninput="SubscriptionsModule.onSubscriberSearch(this.value)"
                  onfocus="SubscriptionsModule.onSubscriberSearch(this.value)"
                  onblur="setTimeout(SubscriptionsModule.hideSubscriberDropdown, 150)">
                <div class="combo-dropdown" id="subf-subscriber-dropdown"></div>
              </div>
              <input type="hidden" id="subf-subscriber">
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('sport')} <span class="required">*</span></label>
              <select class="form-select" id="subf-sport"><option value="">${t('select_sport_placeholder')}</option></select>
              <div class="form-error-msg"></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('coach')}</label>
              <select class="form-select" id="subf-coach"></select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('months_word')}</label>
              <select class="form-select" id="subf-months">
                <option value="1">1 ${t('month_singular')}</option>
                <option value="2">2 ${t('month_plural')}</option>
                <option value="3">3 ${t('month_plural')}</option>
                <option value="6">6 ${t('month_plural')}</option>
                <option value="12">12 ${t('month_plural')}</option>
              </select>
            </div>
          </div>
          <div class="form-section-title">${t('payment_section')}</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('total_price_usd')} <span class="required">*</span></label>
              <div class="currency-input-wrap">
                <span class="currency-prefix">$</span>
                <input class="form-input" id="subf-price" type="number" min="0" placeholder="0">
              </div>
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('amount_paid')} (USD) <span class="text-muted" style="font-weight:400;font-size:11px">${t('optional_leave_blank_unpaid')}</span></label>
              <div class="currency-input-wrap">
                <span class="currency-prefix">$</span>
                <input class="form-input" id="subf-paid" type="number" min="0" placeholder="0">
              </div>
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
              <label class="form-check" for="subf-autorenew">
                <input type="checkbox" id="subf-autorenew">
                <span class="form-check-label">🔁 ${t('auto_renew_lbl')}</span>
              </label>
              <div class="text-muted" id="subf-autorenew-hint" style="font-size:11px;margin-top:4px">${t('auto_renew_hint')}</div>
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
    _editId = null;
    document.getElementById('subscription-modal-title').textContent = App.t('new_subscription');
    ['subf-sport','subf-coach','subf-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    populateCoachSelect();
    document.getElementById('subf-price').value='';
    delete document.getElementById('subf-price').dataset.manual;
    document.getElementById('subf-paid').value='';
    document.getElementById('subf-start').value=DateUtil.today();
    document.getElementById('subf-end').value='';
    const monthsEl0=document.getElementById('subf-months'); if(monthsEl0) monthsEl0.value='1';
    setAutoRenewField(true, false); // new subscriptions auto-renew by default
    const subInput = document.getElementById('subf-subscriber-input');
    const subHidden = document.getElementById('subf-subscriber');
    if (subInput) subInput.value = subscriberName || '';
    if (subHidden) subHidden.value = subscriberId || '';
    hideSubscriberDropdown();
    const calcEnd = bindDateAutoCalc();
    calcEnd();
    Modal.open('modal-subscription');
  }

  function openEdit(id){
    const s = _all.find(x=>x.id===id);
    if (!s) return;
    _editId = id;
    document.getElementById('subscription-modal-title').textContent = App.t('edit') + ': ' + (s.subscriberName||'');
    populateCoachSelect(s.sportId||'');
    const spEl=document.getElementById('subf-sport'); if(spEl) spEl.value = s.sportId||'';
    const coEl=document.getElementById('subf-coach'); if(coEl) coEl.value = s.coachId||'';
    document.getElementById('subf-notes').value = s.notes||'';
    document.getElementById('subf-price').value = s.totalAmount||'';
    const priceEl=document.getElementById('subf-price'); if(priceEl) priceEl.dataset.manual='1'; // keep the stored price, don't auto-overwrite from sport
    document.getElementById('subf-paid').value = s.amountPaid||'';
    document.getElementById('subf-start').value = s.startDate||'';
    document.getElementById('subf-end').value = s.endDate||'';
    setMonthsSelect(s.months || monthsBetween(s.startDate, s.endDate));
    setAutoRenewField(!!s.autoRenew, !!s.renewedToId);
    const subInput = document.getElementById('subf-subscriber-input');
    const subHidden = document.getElementById('subf-subscriber');
    if (subInput) subInput.value = s.subscriberName || '';
    if (subHidden) subHidden.value = s.subscriberId || '';
    hideSubscriberDropdown();
    bindDateAutoCalc(); // don't recalc — keep the stored end date until start/months are actually changed
    Modal.open('modal-subscription');
  }

  /* ── Months helpers (older records have no stored months) ── */
  function monthsBetween(start, end) {
    if (!start || !end) return 1;
    return Math.max(1, Math.round(DateUtil.diffDays(end, start) / 30.44));
  }

  function setMonthsSelect(n) {
    const el = document.getElementById('subf-months');
    if (!el) return;
    const v = String(n || 1);
    if (![...el.options].some(o => o.value === v)) {
      const o = document.createElement('option');
      o.value = v; o.textContent = `${v} ${App.t(v === '1' ? 'month_singular' : 'month_plural')}`;
      el.appendChild(o);
    }
    el.value = v;
  }

  function setAutoRenewField(checked, alreadyRenewed) {
    const cb = document.getElementById('subf-autorenew');
    const hint = document.getElementById('subf-autorenew-hint');
    if (cb) { cb.checked = checked && !alreadyRenewed; cb.disabled = alreadyRenewed; }
    if (hint) hint.textContent = App.t(alreadyRenewed ? 'auto_renew_already' : 'auto_renew_hint');
  }

  /* ── Auto end-date calc, bound once regardless of how many times the modal reopens ── */
  let _dateListenersBound = false;
  function bindDateAutoCalc(){
    const startEl=document.getElementById('subf-start');
    const monthsEl=document.getElementById('subf-months');
    const endEl=document.getElementById('subf-end');
    const calcEnd=()=>{if(startEl.value&&monthsEl.value)endEl.value=DateUtil.addMonths(startEl.value,Number(monthsEl.value));};
    if(!_dateListenersBound){
      startEl.addEventListener('change',calcEnd);
      monthsEl.addEventListener('change',calcEnd);
      _dateListenersBound = true;
    }
    return calcEnd;
  }

  async function save(){
    const valid = Validate.form([
      {id:'subf-subscriber',rules:['required'],label:App.t('subscriber_singular')},
      {id:'subf-sport',rules:['required'],label:App.t('sport')},
      {id:'subf-price',rules:['required'],label:App.t('price_generic')},
      {id:'subf-start',rules:['required'],label:App.t('start_date')},
    ]);
    const subInput = document.getElementById('subf-subscriber-input');
    const subHidden = document.getElementById('subf-subscriber');
    if (subInput) subInput.classList.toggle('error', subHidden?.classList.contains('error'));
    if (!valid) return;
    const subId=document.getElementById('subf-subscriber').value;
    const spId=document.getElementById('subf-sport').value;
    const coId=document.getElementById('subf-coach').value;
    const sub=_subscribers.find(s=>s.id===subId);
    const sport=_sports.find(s=>s.id===spId);
    const coach=_coaches.find(c=>c.id===coId)||null;
    const totalAmount = Number(document.getElementById('subf-price').value)||0;
    const amountPaid  = Number(document.getElementById('subf-paid').value)||0;
    const paymentMethod = amountPaid <= 0 ? 'unpaid' : amountPaid < totalAmount ? 'partial' : 'paid';
    const data={
      subscriberId:subId, subscriberName:sub?.name||'',
      sportId:spId, sportName:sport?.name||'',
      coachId:coId||null, coachName:coach?.name||null,
      coachCommission:coach?.commission||0,
      totalAmount, amountPaid,
      paymentMethod,
      startDate:document.getElementById('subf-start').value,
      endDate:document.getElementById('subf-end').value,
      months:Number(document.getElementById('subf-months').value)||1,
      autoRenew:!!document.getElementById('subf-autorenew')?.checked,
      notes:document.getElementById('subf-notes').value.trim(),
    };
    try{
      if(_editId){
        const before=_all.find(x=>x.id===_editId);
        await _db.collection(COL.SUBSCRIPTIONS).doc(_editId).update(data);
        const paidMore=(data.amountPaid||0)-(before?.amountPaid||0);
        if(paidMore>0 && typeof WaQueue!=='undefined') WaQueue.onPayment(_db,{...data,id:_editId},paidMore);
        await logActivity(_db,'subscription_updated',{subscriber:data.subscriberName,subscriberId:data.subscriberId,sport:data.sportName,amount:data.totalAmount,paid:data.amountPaid});
      } else {
        data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
        const newRef = await _db.collection(COL.SUBSCRIPTIONS).add(data);
        if((data.amountPaid||0)>0 && typeof WaQueue!=='undefined') WaQueue.onPayment(_db,{...data,id:newRef.id},data.amountPaid);
        await logActivity(_db,'subscription_added',{subscriber:data.subscriberName,subscriberId:data.subscriberId,sport:data.sportName,amount:data.totalAmount,paid:data.amountPaid});
      }
      Toast.success(App.t('saved')); Modal.close('modal-subscription'); await loadData();
    }catch(e){Toast.error(App.t('error_generic'));}
  }

  /* ── Auto-renewal ──────────────────────────────────
     A subscription marked autoRenew that has ended gets a follow-up
     subscription starting on its end date, same sport / coach / months,
     priced at the sport's CURRENT monthly price × months, unpaid.
     The old record is linked (renewedToId) and its flag moves to the new one.
     Runs client-side on login and when the Subscriptions page opens. ── */
  function processAutoRenewals(db, force = false) {
    if (_renewPromise) return _renewPromise;
    if (!force && Date.now() - _lastRenewRun < RENEW_THROTTLE_MS) return Promise.resolve(0);
    _renewPromise = runAutoRenewals(db)
      .finally(() => { _lastRenewRun = Date.now(); _renewPromise = null; });
    return _renewPromise;
  }

  async function runAutoRenewals(db) {
    const today = DateUtil.today();
    const snap = await db.collection(COL.SUBSCRIPTIONS).where('autoRenew', '==', true).get();
    const due = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(s => !s.frozen && !s.renewedToId && s.endDate && s.endDate < today); // frozen subscriptions never auto-renew
    if (!due.length) return 0;

    const [spSnap, coSnap] = await Promise.all([
      db.collection(COL.SPORTS).get(),
      db.collection(COL.COACHES).get(),
    ]);
    const sports  = new Map(spSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    const coaches = new Map(coSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

    let count = 0;
    for (const s of due) {
      try {
        // Staff already renewed this manually → just switch auto-renew off.
        const others = await db.collection(COL.SUBSCRIPTIONS).where('subscriberId', '==', s.subscriberId).get();
        const manuallyRenewed = others.docs.some(d => d.id !== s.id && d.data().sportId === s.sportId && (d.data().endDate || '') > s.endDate);
        if (manuallyRenewed) {
          await db.collection(COL.SUBSCRIPTIONS).doc(s.id).update({ autoRenew: false });
          continue;
        }
        const sport = sports.get(s.sportId);
        if (!sport) continue; // sport deleted — can't price it, leave for staff

        // Catch up one period at a time if the app wasn't opened for a while (capped).
        let cur = s;
        for (let i = 0; i < 24 && cur && cur.endDate < today; i++) {
          cur = await renewOne(db, cur, sport, coaches.get(cur.coachId) || null);
          if (cur) count++;
        }
      } catch (e) {
        console.error('Auto-renew failed for subscription', s.id, e);
      }
    }
    return count;
  }

  async function renewOne(db, prev, sport, coach) {
    const months = Number(prev.months) || monthsBetween(prev.startDate, prev.endDate);
    const startDate = prev.endDate;
    const data = {
      subscriberId: prev.subscriberId, subscriberName: prev.subscriberName || '',
      sportId: sport.id, sportName: sport.name || prev.sportName || '',
      coachId: prev.coachId || null,
      coachName: coach ? coach.name : (prev.coachName || null),
      coachCommission: coach ? (coach.commission || 0) : (prev.coachCommission || 0),
      totalAmount: (Number(sport.price) || 0) * months,
      amountPaid: 0,
      paymentMethod: 'unpaid',
      startDate,
      endDate: DateUtil.addMonths(startDate, months),
      months,
      autoRenew: true,
      renewedFromId: prev.id,
      notes: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const prevRef = db.collection(COL.SUBSCRIPTIONS).doc(prev.id);
    const newRef  = db.collection(COL.SUBSCRIPTIONS).doc();
    const subscriberRef = db.collection(COL.SUBSCRIBERS).doc(prev.subscriberId);

    const created = await db.runTransaction(async tx => {
      const [prevSnap, subSnap] = await Promise.all([tx.get(prevRef), tx.get(subscriberRef)]);
      const p = prevSnap.exists ? prevSnap.data() : null;
      // Another device already handled it, or it was switched off meanwhile.
      if (!p || !p.autoRenew || p.renewedToId) return false;
      if (!subSnap.exists) { tx.update(prevRef, { autoRenew: false }); return false; }
      tx.set(newRef, data);
      tx.update(prevRef, { autoRenew: false, renewedToId: newRef.id });
      return true;
    });
    if (!created) return null;

    await logActivity(db, 'subscription_added', {
      subscriber: data.subscriberName, subscriberId: data.subscriberId,
      sport: data.sportName, amount: data.totalAmount, paid: 0, autoRenewed: true,
    });
    if (typeof WaQueue !== 'undefined') WaQueue.onRenewal(db, { id: newRef.id, ...data });
    return { id: newRef.id, ...data };
  }

  function payRemaining(id,name,remaining){
    Modal.confirm({title:App.t('record_payment_title'),
      message:`${App.t('confirm_payment_of')} <strong>${Currency.formatUSD(remaining)}</strong> ${App.t('for_member')} <strong>${name}</strong>?`,
      type:'success',confirmText:App.t('confirm_payment_btn'),
      onConfirm:async()=>{
        const doc=_db.collection(COL.SUBSCRIPTIONS).doc(id);
        const snap=await doc.get(); const d=snap.data();
        await doc.update({amountPaid:(d.totalAmount||0), paymentMethod:'paid'});
        if(typeof WaQueue!=='undefined') WaQueue.onPayment(_db,{...d,id,amountPaid:(d.totalAmount||0)},remaining);
        await logActivity(_db,'payment_recorded',{subscriber:d.subscriberName,subscriberId:d.subscriberId,sport:d.sportName,amount:remaining});
        Toast.success(App.t('payment_recorded')); await loadData();
      }
    });
  }



  /* ══ Outstanding balances radar ═════════════════════════
     Groups every unpaid / partially-paid subscription by subscriber
     (whole list, not just the filtered view) and spotlights the
     subscribers who owe 2+ fees. ── */
  const _subKey = s => s.subscriberId || ('name:' + (s.subscriberName||''));
  const _rem = s => Math.max(0, (s.totalAmount||0) - (s.amountPaid||0));

  function buildDebtMap() {
    _debt = new Map();
    _all.forEach(s => {
      const r = _rem(s); if (!(r > 0)) return;
      const k = _subKey(s);
      if (!_debt.has(k)) _debt.set(k, { key:k, subscriberId:s.subscriberId, name:s.subscriberName||'—', count:0, owed:0, items:[] });
      const d = _debt.get(k); d.count++; d.owed += r; d.items.push(s);
    });
    _debt.forEach(d => d.items.sort((a,b) => (a.startDate||'').localeCompare(b.startDate||''))); // oldest first
  }

  const _initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
  const _monthLbl = d => { try { return new Date(d).toLocaleDateString(document.body.classList.contains('lang-ar') ? 'ar' : 'en', { month:'short', year:'2-digit' }); } catch(_) { return d; } };
  const _daysSince = d => d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;

  function _debtPanelOpen() { try { return localStorage.getItem('venus_debt_panel') !== 'closed'; } catch(_) { return true; } }
  function toggleDebtPanel() {
    const open = !_debtPanelOpen();
    try { localStorage.setItem('venus_debt_panel', open ? 'open' : 'closed'); } catch(_) {}
    document.getElementById('debt-radar')?.classList.toggle('is-collapsed', !open);
  }

  function renderDebtPanel() {
    const host = document.getElementById('subs-debt-panel'); if (!host) return;
    const all = [..._debt.values()];
    if (!all.length) { host.innerHTML = ''; return; }
    const totalOwed = all.reduce((t,d) => t + d.owed, 0);
    const multi = all.filter(d => d.count >= 2).sort((a,b) => b.owed - a.owed || b.count - a.count);
    const multiOwed = multi.reduce((t,d) => t + d.owed, 0);
    const share = totalOwed ? Math.round(multiOwed / totalOwed * 100) : 0;
    const filterOn = document.getElementById('subs-filter')?.value === 'multi_debt';
    const shown = _debtShowAll ? multi : multi.slice(0, 6);

    const card = d => {
      const oldest = d.items[0];
      const days = _daysSince(oldest.startDate);
      const lvl = d.count >= 3 ? 'high' : 'mid';
      const k = encodeURIComponent(d.key);
      const months = d.items.map(x => `<span class="debt-month" title="${x.sportName||''} · ${DateUtil.format(x.startDate)} · ${Currency.formatUSD(_rem(x))}">${_monthLbl(x.startDate)}<b>${Currency.formatUSD(_rem(x))}</b></span>`).join('');
      return `
        <div class="debt-card is-${lvl}">
          <div class="debt-card-top">
            <div class="debt-avatar">${_initials(d.name)}<span class="debt-avatar-n">${d.count}</span></div>
            <div class="debt-who">
              <div class="debt-name">${d.name}</div>
              <div class="debt-since">${App.t('oldest_unpaid')} ${DateUtil.format(oldest.startDate)} · <span>${days} ${App.t('days_word')}</span></div>
            </div>
            <div class="debt-owed"><span>${App.t('owes_total')}</span>${Currency.formatUSD(d.owed)}</div>
          </div>
          <div class="debt-months">${months}</div>
          <div class="debt-actions">
            <button class="btn btn-ghost btn-sm" onclick="SubscriptionsModule.debtView('${k}')">👁 ${App.t('view_word')}</button>
            <button class="btn btn-ghost btn-sm" onclick="SubscriptionsModule.debtRemind('${k}')">💬 ${App.t('remind_word')}</button>
            <button class="btn btn-success btn-sm" onclick="SubscriptionsModule.debtSettle('${k}')">💰 ${App.t('settle_all')}</button>
          </div>
        </div>`;
    };

    host.innerHTML = `
      <section class="debt-radar ${_debtPanelOpen() ? '' : 'is-collapsed'}" id="debt-radar">
        <header class="debt-head" onclick="SubscriptionsModule.toggleDebtPanel()">
          <div class="debt-head-title">
            <span class="debt-pulse"></span>
            <div>
              <div class="debt-title">${App.t('debt_radar_title')}</div>
              <div class="debt-sub">${App.t('debt_radar_sub')}</div>
            </div>
          </div>
          <div class="debt-stats">
            <div class="debt-stat"><b class="c-danger">${Currency.formatUSD(totalOwed)}</b><span>${App.t('total_unpaid')}</span></div>
            <div class="debt-stat"><b>${all.length}</b><span>${App.t('subscribers_owing')}</span></div>
            <div class="debt-stat is-key"><b class="c-warn">${multi.length}</b><span>${App.t('owe_2_plus')}</span></div>
            <div class="debt-stat"><b class="c-warn">${Currency.formatUSD(multiOwed)}</b><span>${share}% ${App.t('of_total_debt')}</span></div>
          </div>
          <span class="debt-caret">▾</span>
        </header>
        <div class="debt-body">
          ${multi.length ? `
            <div class="debt-toolbar">
              <div class="debt-bar" title="${share}%"><span style="width:${share}%"></span></div>
              <button class="btn btn-sm ${filterOn?'btn-primary':'btn-outline'}" onclick="SubscriptionsModule.debtFilter()">${filterOn ? '✕ ' + App.t('show_all_subs') : '⚠ ' + App.t('show_only_debtors')}</button>
            </div>
            <div class="debt-grid">${shown.map(card).join('')}</div>
            ${multi.length > 6 ? `<button class="btn btn-ghost btn-sm debt-more" onclick="SubscriptionsModule.debtToggleAll()">${_debtShowAll ? App.t('show_less') : `${App.t('show_all_word')} (${multi.length})`}</button>` : ''}`
          : `<div class="debt-clear">✅ ${App.t('no_multi_debtors')}</div>`}
        </div>
      </section>`;
  }

  function debtToggleAll() { _debtShowAll = !_debtShowAll; renderDebtPanel(); }

  function debtFilter() {
    const f = document.getElementById('subs-filter'); if (!f) return;
    f.value = f.value === 'multi_debt' ? '' : 'multi_debt';
    onFilter(); renderDebtPanel();
  }

  // Jump the table to this subscriber and open their group
  function debtView(k) {
    const d = _debt.get(decodeURIComponent(k)); if (!d) return;
    const input = document.getElementById('subs-search'); if (input) input.value = d.name;
    _expanded.add(d.key);
    onFilter();
    document.getElementById('subs-tbody')?.closest('.table-wrap')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function debtRemind(k) {
    const d = _debt.get(decodeURIComponent(k)); if (!d) return;
    const phone = _subscribers.find(x => x.id === d.subscriberId)?.phone;
    if (!phone) return Toast.warning(App.t('no_phone_number'));
    const ar = document.body.classList.contains('lang-ar');
    const lines = d.items.map(x => `• ${x.sportName||''} — ${DateUtil.format(x.startDate)}: ${Currency.formatUSD(_rem(x))}`).join('\n');
    const msg = ar
      ? `مرحباً ${d.name}،\nتذكير ودّي من نادي Venus: لديك ${d.count} رسوم اشتراك غير مدفوعة بمجموع ${Currency.formatUSD(d.owed)}:\n${lines}\nشكراً لك 🙏`
      : `Hello ${d.name},\nA friendly reminder from Venus Gym: you have ${d.count} unpaid subscription fees totalling ${Currency.formatUSD(d.owed)}:\n${lines}\nThank you 🙏`;
    window.open(buildWhatsAppLink(phone, msg), '_blank');
  }

  function debtSettle(k) {
    const d = _debt.get(decodeURIComponent(k)); if (!d) return;
    const items = d.items.slice();
    const owed = d.owed;
    Modal.confirm({
      title: App.t('record_payment_title'),
      message: `${App.t('settle_all_msg').replace('{n}', `<strong>${items.length}</strong>`)}<br><strong style="font-size:20px;color:var(--success)">${Currency.formatUSD(owed)}</strong><br><span class="text-muted">${d.name}</span>`,
      type: 'success', confirmText: App.t('confirm_payment_btn'),
      onConfirm: async () => {
        try {
          await _commitInChunks(items, (b, ref, x) => b.update(ref, { amountPaid: x.totalAmount || 0, paymentMethod: 'paid' }));
          await Promise.all(items.map(x => logActivity(_db, 'payment_recorded', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName, amount: _rem(x) })));
          if (typeof WaQueue !== 'undefined') items.forEach(x => WaQueue.onPayment(_db, { ...x, amountPaid: x.totalAmount || 0 }, _rem(x)));
          Toast.success(`${App.t('payment_recorded')} · ${Currency.formatUSD(owed)}`);
          await loadData();
        } catch (e) { console.error(e); Toast.error(App.t('error_generic')); }
      },
    });
  }


  /* ══ Freeze / Unfreeze ═══════════════════════════════
     Freezing pauses a subscription: it stops counting as active /
     expiring and auto-renew is paused. Unfreezing can push the end
     date forward by the number of frozen days, so the member gets
     back the time they didn't use. ── */
  const _frozenDays = s => s.frozenAt ? Math.max(0, DateUtil.diffDays(DateUtil.today(), s.frozenAt)) : 0;
  const _canFreeze = s => !s.frozen && s.endDate && s.endDate >= DateUtil.today();

  function freezeBtn(s, icon) {
    if (s.frozen) return `<button class="btn btn-sm btn-unfreeze${icon?' btn-icon':''}" title="${App.t('unfreeze_word')}" onclick="SubscriptionsModule.openUnfreeze(['${s.id}'])">☀️${icon?'':' '+App.t('unfreeze_word')}</button>`;
    if (_canFreeze(s)) return `<button class="btn btn-sm btn-freeze${icon?' btn-icon':''}" title="${App.t('freeze_word')}" onclick="SubscriptionsModule.openFreeze(['${s.id}'])">❄${icon?'':' '+App.t('freeze_word')}</button>`;
    return '';
  }

  function openFreeze(ids) {
    const items = _all.filter(x => ids.includes(x.id) && _canFreeze(x));
    const skipped = ids.length - items.length;
    if (!items.length) { Toast.warning(App.t('freeze_none_eligible')); return; }
    const today = DateUtil.today();
    const minStart = items.reduce((m, x) => (x.startDate && x.startDate > m ? x.startDate : m), '');
    _bulkModal({
      title: `❄ ${App.t('freeze_title')}`,
      confirmText: `❄ ${App.t('freeze_word')}${items.length > 1 ? ` (${items.length})` : ''}`,
      confirmClass: 'btn-freeze-solid',
      body: `
        ${items.length > 1 ? _selSummary(items) : `<div class="subs-bulk-summary"><strong>${items[0].subscriberName||'—'}</strong> · ${items[0].sportName||''} · ${DateUtil.format(items[0].startDate)} → ${DateUtil.format(items[0].endDate)}</div>`}
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${App.t('freeze_from')} <span class="required">*</span></label>
            <input class="form-input" type="date" id="frz-date" value="${today}" min="${minStart}" max="${today}">
          </div>
          <div class="form-group">
            <label class="form-label">${App.t('freeze_reason')}</label>
            <input class="form-input" id="frz-reason" placeholder="${App.t('freeze_reason_ph')}">
          </div>
        </div>
        <div class="freeze-explain">
          <div>⏸ ${App.t('freeze_explain_1')}</div>
          <div>🔁 ${App.t('freeze_explain_2')}</div>
          <div>☀️ ${App.t('freeze_explain_3')}</div>
        </div>
        ${skipped ? `<div class="subs-bulk-warn" style="margin-top:10px">⚠️ ${skipped} ${App.t('freeze_skipped')}</div>` : ''}`,
      onConfirm: async () => {
        const from = document.getElementById('frz-date').value || today;
        const reason = (document.getElementById('frz-reason').value || '').trim();
        await _commitInChunks(items, (b, ref) => b.update(ref, { frozen: true, frozenAt: from, frozenReason: reason || null }));
        await Promise.all(items.map(x => logActivity(_db, 'subscription_frozen', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName, from, reason })));
        Toast.success(`❄ ${items.length} ${App.t('frozen_done')}`);
        items.forEach(x => _selected.delete(x.id));
        await loadData();
      },
    });
  }

  function openUnfreeze(ids) {
    const items = _all.filter(x => ids.includes(x.id) && x.frozen);
    if (!items.length) { Toast.warning(App.t('unfreeze_none_eligible')); return; }
    const today = DateUtil.today();
    const el = _bulkModal({
      title: `☀️ ${App.t('unfreeze_title')}`,
      confirmText: `☀️ ${App.t('unfreeze_word')}${items.length > 1 ? ` (${items.length})` : ''}`,
      body: `
        ${items.length > 1 ? _selSummary(items) : ''}
        <label class="form-check" style="margin-bottom:12px">
          <input type="checkbox" id="unfrz-extend" checked>
          <span class="form-check-label">${App.t('unfreeze_extend')}</span>
        </label>
        <div class="subs-bulk-preview" id="unfrz-preview"></div>`,
      onConfirm: async () => {
        const extend = document.getElementById('unfrz-extend').checked;
        await _commitInChunks(items, (b, ref, x) => {
          const days = _frozenDays(x);
          const data = {
            frozen: false, frozenAt: null, frozenReason: null,
            freezeHistory: [...(x.freezeHistory || []), { from: x.frozenAt || today, to: today, days, extended: extend, reason: x.frozenReason || null }],
          };
          if (extend && days > 0 && x.endDate) data.endDate = DateUtil.addDays(x.endDate, days);
          b.update(ref, data);
        });
        await Promise.all(items.map(x => logActivity(_db, 'subscription_unfrozen', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName, days: _frozenDays(x), extended: extend })));
        Toast.success(`☀️ ${items.length} ${App.t('unfrozen_done')}`);
        items.forEach(x => _selected.delete(x.id));
        await loadData();
      },
    });
    const preview = () => {
      const extend = el.querySelector('#unfrz-extend').checked;
      el.querySelector('#unfrz-preview').innerHTML = items.slice(0, 8).map(x => {
        const days = _frozenDays(x);
        const newEnd = extend && days > 0 ? DateUtil.addDays(x.endDate, days) : x.endDate;
        return `<div class="subs-bulk-prow">
          <span class="subs-bulk-pname">${x.subscriberName||'—'} <small>${x.sportName||''} · ❄ ${DateUtil.format(x.frozenAt)} · ${days} ${App.t('days_word')}</small></span>
          <span class="subs-bulk-pdates">${extend && days > 0 ? `<s>${DateUtil.format(x.endDate)}</s><b>${DateUtil.format(newEnd)}</b>` : `<b style="color:var(--text-secondary)">${DateUtil.format(x.endDate)}</b>`}</span>
        </div>`;
      }).join('') + (items.length > 8 ? `<div class="text-muted" style="font-size:12px;padding-top:6px">+${items.length - 8} ${App.t('more_word')}</div>` : '');
    };
    el.querySelector('#unfrz-extend').addEventListener('change', preview);
    preview();
  }

  function bulkFreeze()   { openFreeze([..._selected]); }
  function bulkUnfreeze() { openUnfreeze([..._selected]); }

  /* ══ Multi-select & bulk actions ═══════════════════════ */
  const _pageItems = () => {
    const slice = _lastGroups.slice((_page-1)*PER_PAGE, _page*PER_PAGE);
    return slice.flatMap(g => g.items);
  };
  const _groupByGid = gid => _lastGroups.find(x => 'sg-' + groupDomId(x.key) === gid);
  const _selItems = () => _all.filter(x => _selected.has(x.id));

  function toggleSelect(id, on) { on ? _selected.add(id) : _selected.delete(id); updateSelectionUI(); }
  function selectGroup(gid, on) {
    const g = _groupByGid(gid); if (!g) return;
    g.items.forEach(x => on ? _selected.add(x.id) : _selected.delete(x.id));
    updateSelectionUI();
  }
  function selectPage(on) { _pageItems().forEach(x => on ? _selected.add(x.id) : _selected.delete(x.id)); updateSelectionUI(); }
  function clearSelection() { _selected.clear(); updateSelectionUI(); }

  function updateSelectionUI() {
    document.querySelectorAll('#subs-tbody .subs-cb[data-id]').forEach(cb => { cb.checked = _selected.has(cb.dataset.id); });
    document.querySelectorAll('#subs-tbody tr[data-sid]').forEach(tr => tr.classList.toggle('is-selected', _selected.has(tr.dataset.sid)));
    document.querySelectorAll('#subs-tbody .subs-gcb').forEach(cb => {
      const g = _groupByGid(cb.dataset.gid); if (!g) return;
      const n = g.items.filter(x => _selected.has(x.id)).length;
      cb.checked = n === g.items.length; cb.indeterminate = n > 0 && n < g.items.length;
      document.getElementById(cb.dataset.gid)?.classList.toggle('is-selected', n === g.items.length);
    });
    const all = document.getElementById('subs-cb-all');
    if (all) {
      const items = _pageItems(); const n = items.filter(x => _selected.has(x.id)).length;
      all.checked = items.length > 0 && n === items.length; all.indeterminate = n > 0 && n < items.length;
    }
    const bar = document.getElementById('subs-bulk-bar');
    if (bar) {
      bar.classList.toggle('open', _selected.size > 0);
      const nEl = document.getElementById('subs-bulk-n'); if (nEl) nEl.textContent = _selected.size;
    }
  }

  // Runs updates/deletes in Firestore batches (limit 500 ops per batch)
  async function _commitInChunks(items, apply) {
    for (let i = 0; i < items.length; i += 400) {
      const batch = _db.batch();
      items.slice(i, i + 400).forEach(x => apply(batch, _db.collection(COL.SUBSCRIPTIONS).doc(x.id), x));
      await batch.commit();
    }
  }

  function _bulkModal({ title, body, confirmText, confirmClass = 'btn-primary', onConfirm }) {
    document.getElementById('modal-subs-bulk')?.remove();
    const el = document.createElement('div');
    el.className = 'modal-overlay'; el.id = 'modal-subs-bulk';
    el.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" onclick="Modal.close('modal-subs-bulk')">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-subs-bulk')">${App.t('cancel')}</button>
          <button class="btn ${confirmClass}" id="subs-bulk-confirm">${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const btn = el.querySelector('#subs-bulk-confirm');
    btn.addEventListener('click', async () => {
      btn.disabled = true; const label = btn.innerHTML; btn.innerHTML = '…';
      try { const ok = await onConfirm(); if (ok !== false) Modal.close('modal-subs-bulk'); }
      catch (e) { console.error(e); Toast.error(App.t('error_generic')); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    });
    Modal.open('modal-subs-bulk');
    return el;
  }

  const _selSummary = items => {
    const names = [...new Set(items.map(x => x.subscriberName || '—'))];
    return `<div class="subs-bulk-summary"><strong>${items.length}</strong> ${App.t('subscriptions').toLowerCase()} · <strong>${names.length}</strong> ${App.t('subscribers').toLowerCase()}</div>`;
  };

  /* ── Bulk: change start date (end date follows each one's months) ── */
  function bulkStartDate() {
    const items = _selItems(); if (!items.length) return;
    const monthsOf = x => Number(x.months) || monthsBetween(x.startDate, x.endDate);
    const today = DateUtil.today();
    const el = _bulkModal({
      title: `📅 ${App.t('bulk_change_start')}`,
      confirmText: `${App.t('apply_to')} ${items.length}`,
      body: `
        ${_selSummary(items)}
        <div class="form-group">
          <label class="form-label">${App.t('new_start_date')} <span class="required">*</span></label>
          <input class="form-input" type="date" id="bulk-start" value="${today}">
        </div>
        <div class="text-muted" style="font-size:12px;margin:-4px 0 12px">${App.t('bulk_start_hint')}</div>
        <div class="subs-bulk-preview" id="bulk-start-preview"></div>`,
      onConfirm: async () => {
        const start = document.getElementById('bulk-start').value;
        if (!start) { Toast.error(App.t('new_start_date')); return false; }
        await _commitInChunks(items, (b, ref, x) => {
          const m = monthsOf(x);
          b.update(ref, { startDate: start, endDate: DateUtil.addMonths(start, m), months: m });
        });
        await Promise.all(items.map(x => logActivity(_db, 'subscription_updated', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName, amount: x.totalAmount, paid: x.amountPaid })));
        Toast.success(`${items.length} ${App.t('bulk_updated')}`);
        _selected.clear(); await loadData();
      },
    });
    const preview = () => {
      const start = el.querySelector('#bulk-start').value;
      const rows = items.slice(0, 8).map(x => `
        <div class="subs-bulk-prow">
          <span class="subs-bulk-pname">${x.subscriberName||'—'} <small>${x.sportName||''}</small></span>
          <span class="subs-bulk-pdates"><s>${DateUtil.format(x.startDate)} → ${DateUtil.format(x.endDate)}</s>
            <b>${start ? `${DateUtil.format(start)} → ${DateUtil.format(DateUtil.addMonths(start, monthsOf(x)))}` : '—'}</b></span>
        </div>`).join('');
      el.querySelector('#bulk-start-preview').innerHTML = rows +
        (items.length > 8 ? `<div class="text-muted" style="font-size:12px;padding-top:6px">+${items.length - 8} ${App.t('more_word')}</div>` : '');
    };
    el.querySelector('#bulk-start').addEventListener('change', preview);
    preview();
  }

  /* ── Bulk: change coach (commission follows the new coach) ── */
  function bulkCoach() {
    const items = _selItems(); if (!items.length) return;
    const opts = _coaches.map(c => `<option value="${c.id}">${c.name} (${c.commission||0}%)</option>`).join('');
    const el = _bulkModal({
      title: `🏋️ ${App.t('bulk_change_coach')}`,
      confirmText: `${App.t('apply_to')} ${items.length}`,
      body: `
        ${_selSummary(items)}
        <div class="form-group">
          <label class="form-label">${App.t('coach')}</label>
          <select class="form-select" id="bulk-coach"><option value="">${App.t('no_coach_lbl')}</option>${opts}</select>
        </div>
        <div class="text-muted" style="font-size:12px;margin:-4px 0 8px">${App.t('bulk_coach_hint')}</div>
        <div class="subs-bulk-warn" id="bulk-coach-warn" hidden></div>`,
      onConfirm: async () => {
        const coId = document.getElementById('bulk-coach').value;
        const coach = _coaches.find(c => c.id === coId) || null;
        const data = { coachId: coach?.id || null, coachName: coach?.name || null, coachCommission: coach?.commission || 0 };
        await _commitInChunks(items, (b, ref) => b.update(ref, data));
        await Promise.all(items.map(x => logActivity(_db, 'subscription_updated', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName, amount: x.totalAmount, paid: x.amountPaid })));
        Toast.success(`${items.length} ${App.t('bulk_updated')}`);
        _selected.clear(); await loadData();
      },
    });
    const sel = el.querySelector('#bulk-coach');
    const warn = el.querySelector('#bulk-coach-warn');
    const check = () => {
      const c = _coaches.find(x => x.id === sel.value);
      const specs = (c?.specialties || []).map(sp => sp.sportId);
      const off = c && specs.length ? items.filter(x => !specs.includes(x.sportId)).length : 0;
      warn.hidden = !off;
      if (off) warn.innerHTML = `⚠️ ${off} ${App.t('bulk_coach_sport_warn')}`;
    };
    sel.addEventListener('change', check);
  }

  /* ── Bulk: delete ── */
  function bulkDelete() {
    const items = _selItems(); if (!items.length) return;
    const names = [...new Set(items.map(x => x.subscriberName || '—'))];
    const list = names.slice(0, 5).join(document.body.classList.contains('lang-ar') ? '، ' : ', ') + (names.length > 5 ? ` +${names.length - 5}` : '');
    Modal.confirm({
      title: App.t('bulk_delete_title'),
      message: `${App.t('bulk_delete_msg').replace('{n}', `<strong>${items.length}</strong>`)}<br><span class="text-muted" style="font-size:12px">${list}</span>`,
      type: 'danger', confirmText: `${App.t('delete')} (${items.length})`,
      onConfirm: async () => {
        try {
          await _commitInChunks(items, (b, ref) => b.delete(ref));
          await Promise.all(items.map(x => logActivity(_db, 'subscription_deleted', { subscriber: x.subscriberName, subscriberId: x.subscriberId, sport: x.sportName })));
          Toast.success(`${items.length} ${App.t('bulk_deleted')}`);
          _selected.clear(); await loadData();
        } catch (e) { console.error(e); Toast.error(App.t('error_generic')); }
      },
    });
  }

  function del(id){
    const s=_all.find(x=>x.id===id);
    Modal.confirm({title:App.t('delete'),message:App.t('delete_confirm'),type:'danger',confirmText:App.t('delete'),onConfirm:async()=>{
      await _db.collection(COL.SUBSCRIPTIONS).doc(id).delete();
      if(s) await logActivity(_db,'subscription_deleted',{subscriber:s.subscriberName,subscriberId:s.subscriberId,sport:s.sportName});
      Toast.success(App.t('deleted'));await loadData();
    }});
  }

  return {render,openNew,openEdit,save,payRemaining,del,
           toggleSelect,selectGroup,selectPage,clearSelection,bulkStartDate,bulkCoach,bulkDelete,
           openFreeze,openUnfreeze,bulkFreeze,bulkUnfreeze,
           toggleDebtPanel,refreshDebtPanel:()=>renderDebtPanel(),debtToggleAll,debtFilter,debtView,debtRemind,debtSettle,onSearch,onFilter,onDateFilter,goPage,toggleGroup,toggleAllGroups,processAutoRenewals,
           onSubscriberSearch,selectSubscriber,hideSubscriberDropdown,
           showSearchSuggestions,hideSearchSuggestions,selectSearchTerm};
})();