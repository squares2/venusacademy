// ═══════════════════════════════════════════════════
//  VENUS GYM — Sport Courses Module
//  Courses live alongside Subscriptions but track a
//  self-contained program: name/duration/price/place,
//  a roster of coaches (each with their own cost), a
//  roster of members (subscribers or guests, each with
//  their own fee + payment status), and a running list
//  of expenses that can be added any time during the
//  course's life.
// ═══════════════════════════════════════════════════
const CourseModule = (() => {
  let _db, _profile;
  let _all = [], _filtered = [];
  let _coachesList = [], _subscribersList = [];
  let _page = 1; const PER_PAGE = 9;
  let _activeCourseId = null, _activeTab = 'overview';
  let _createCoaches = [], _createExpenses = [];
  let _createDateBound = false;

  /* ── Helpers ──────────────────────────────────────── */
  function computeEndDate(startDate, value, unit) {
    if (!startDate || !value || unit === 'sessions') return '';
    const d = new Date(startDate);
    const n = Number(value) || 0;
    if (unit === 'days') d.setDate(d.getDate() + n);
    else if (unit === 'weeks') d.setDate(d.getDate() + n * 7);
    else if (unit === 'months') d.setMonth(d.getMonth() + n);
    return d.toISOString().split('T')[0];
  }

  function durationLabel(c) {
    const n = c.durationValue || 0;
    const unitKeyMap = { days: 'duration_days', weeks: 'duration_weeks', months: 'duration_months', sessions: 'duration_sessions' };
    let label = App.t(unitKeyMap[c.durationUnit] || c.durationUnit || '');
    if (App.lang !== 'ar' && n === 1) label = label.replace(/s$/, '');
    return `${n} ${label}`;
  }

  function courseStatus(c) {
    const today = DateUtil.today();
    if (c.endDate && c.endDate < today) return 'completed';
    if (c.startDate && c.startDate > today) return 'upcoming';
    return 'active';
  }

  function courseStats(c) {
    const members = c.members || [];
    const coaches = c.coaches || [];
    const expenses = c.expenses || [];
    const expectedRevenue = members.reduce((t, m) => t + (m.fee ?? c.price ?? 0), 0);
    const collected = members.reduce((t, m) => t + (m.amountPaid || 0), 0);
    const coachCost = coaches.reduce((t, x) => t + (x.cost || 0), 0);
    const expenseTotal = expenses.reduce((t, e) => t + (e.amount || 0), 0);
    return {
      expectedRevenue, collected, coachCost, expenseTotal,
      netProfit: collected - coachCost - expenseTotal,
      memberCount: members.length, coachCount: coaches.length,
    };
  }

  function statusBadgeHTML(status) {
    return {
      upcoming:  `<span class="badge badge-info">◔ ${App.t('status_upcoming')}</span>`,
      active:    `<span class="badge badge-active">● ${App.t('active')}</span>`,
      completed: `<span class="badge badge-expired">● ${App.t('status_completed')}</span>`,
    }[status] || '';
  }

  /* ── Render Page ──────────────────────────────────── */
  async function render(db, profile) {
    _db = db; _profile = profile;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('sport_courses')}</h1>
          <p class="page-subtitle" id="course-count"></p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="CourseModule.openCreate()">+ ${t('new_course')}</button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="course-search" placeholder="${t('course_search_placeholder')}" autocomplete="off" oninput="CourseModule.onSearch()">
        </div>
        <select class="filter-select" id="course-filter-status" onchange="CourseModule.onFilter()">
          <option value="">${t('all_status')}</option>
          <option value="upcoming">${t('status_upcoming')}</option>
          <option value="active">${t('active')}</option>
          <option value="completed">${t('status_completed')}</option>
        </select>
      </div>
      <div class="courses-grid" id="courses-grid"></div>
      <div class="table-footer" style="border-radius:var(--radius-md);border:1px solid var(--border-subtle);margin-top:16px">
        <span id="course-pag-info"></span>
        <div class="pagination" id="course-pagination"></div>
      </div>
      ${modalCreate()}
      ${modalWorkspace()}
    `;
    await loadDeps();
    await loadData();
  }

  async function loadDeps() {
    const [co, su] = await Promise.all([
      _db.collection(COL.COACHES).orderBy('name').get(),
      _db.collection(COL.SUBSCRIBERS).orderBy('name').get(),
    ]);
    _coachesList = co.docs.map(d => ({ id: d.id, ...d.data() }));
    _subscribersList = su.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function loadData() {
    const snap = await _db.collection(COL.COURSES).orderBy('startDate', 'desc').get();
    _all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const countEl = document.getElementById('course-count');
    if (countEl) countEl.textContent = `${_all.length} ${App.t(_all.length === 1 ? 'course_word' : 'courses_word')}`;
    applyFilters();
  }

  /* ── Search / Filter / Pagination ─────────────────── */
  function applyFilters() {
    const q = (document.getElementById('course-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('course-filter-status')?.value || '';
    _filtered = _all.filter(c => {
      const matchQ = !q || c.name?.toLowerCase().includes(q) || c.place?.toLowerCase().includes(q)
        || (c.coaches || []).some(x => x.coachName?.toLowerCase().includes(q))
        || (c.members || []).some(x => x.name?.toLowerCase().includes(q));
      const matchStatus = !status || courseStatus(c) === status;
      return matchQ && matchStatus;
    });
    _page = 1;
    renderGrid(_filtered);
  }
  const onSearch = debounce(() => applyFilters(), 280);
  function onFilter() { applyFilters(); }
  function goPage(p) { _page = p; renderGrid(_filtered); }

  /* ── Grid Cards ────────────────────────────────────── */
  function renderGrid(list) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (_page > totalPages) _page = 1;
    const slice = list.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    grid.innerHTML = slice.length ? slice.map(c => {
      const stats = courseStats(c);
      const status = courseStatus(c);
      const pct = stats.expectedRevenue > 0 ? Math.min(100, Math.round(stats.collected / stats.expectedRevenue * 100)) : 0;
      const esc = (c.name || '').replace(/'/g, "\\'");
      const memberWord = App.t(stats.memberCount === 1 ? 'member_singular' : 'member_plural');
      const coachWord = App.t(stats.coachCount === 1 ? 'coach_singular' : 'coach_plural');
      return `
        <div class="course-card" onclick="CourseModule.openWorkspace('${c.id}')">
          <div class="course-card-head">
            <div class="course-card-name">${c.name || '—'}</div>
            ${statusBadgeHTML(status)}
          </div>
          <div class="course-card-meta">
            ${c.place ? `<span>📍 ${c.place}</span>` : ''}
            <span>⏱ ${durationLabel(c)}</span>
            <span>💵 ${Currency.formatUSD(c.price || 0)}</span>
          </div>
          <div class="course-card-stats">
            <span>👥 <b>${stats.memberCount}</b> ${memberWord}</span>
            <span>🧑‍🏫 <b>${stats.coachCount}</b> ${coachWord}</span>
          </div>
          <div>
            <div class="course-progress-wrap"><div class="course-progress-bar" style="width:${pct}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px">
              <span>${Currency.formatUSD(stats.collected)} ${App.t('collected').toLowerCase()}</span><span>${Currency.formatUSD(stats.expectedRevenue)} ${App.t('expected_revenue').toLowerCase()}</span>
            </div>
          </div>
          <div class="course-card-footer" onclick="event.stopPropagation()">
            <button class="btn btn-outline btn-sm" onclick="CourseModule.openWorkspace('${c.id}')">${App.t('manage')} ▸</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.deleteCourse('${c.id}','${esc}')">🗑</button>
          </div>
        </div>`;
    }).join('') : `<p class="text-muted" style="padding:20px 4px">${App.t('no_data')}</p>`;

    const pagInfo = document.getElementById('course-pag-info');
    if (pagInfo) pagInfo.textContent = total ? `Showing ${Math.min((_page - 1) * PER_PAGE + 1, total)}–${Math.min(_page * PER_PAGE, total)} of ${total}` : '';
    renderPagination('course-pagination', _page, totalPages, 'CourseModule.goPage');
  }

  /* ── Firestore mutation helper — one path for every write ── */
  async function mutateCourse(courseId, patch, successMsg) {
    try {
      await _db.collection(COL.COURSES).doc(courseId).update({ ...patch, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await loadData();
      if (_activeCourseId === courseId) renderWorkspaceTab();
      if (successMsg) Toast.success(successMsg);
      return true;
    } catch (e) {
      console.error(e);
      Toast.error(App.t('error_generic'));
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════
     CREATE MODAL
     ═══════════════════════════════════════════════════ */
  function modalCreate() {
    const t = App.t.bind(App);
    return `
    <div class="modal-overlay" id="modal-course-create">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">${t('new_course')}</span>
          <button class="modal-close" onclick="Modal.close('modal-course-create')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-section-title">${t('course_details')}</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('course_name')} <span class="required">*</span></label>
              <input class="form-input" id="cf-name" placeholder="${t('course_name_placeholder')}">
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('place')}</label>
              <input class="form-input" id="cf-place" placeholder="${t('place_placeholder')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('price_per_member')} <span class="required">*</span></label>
              <div class="currency-input-wrap"><span class="currency-prefix">$</span><input class="form-input" id="cf-price" type="number" min="0" placeholder="0"></div>
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('start_date')} <span class="required">*</span></label>
              <input class="form-input" id="cf-start" type="date">
              <div class="form-error-msg"></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('duration')}</label>
              <div class="flex gap-2">
                <input class="form-input" id="cf-duration-value" type="number" min="1" value="1" style="max-width:90px">
                <select class="form-select" id="cf-duration-unit">
                  <option value="months">${t('duration_months')}</option>
                  <option value="weeks">${t('duration_weeks')}</option>
                  <option value="days">${t('duration_days')}</option>
                  <option value="sessions">${t('duration_sessions')}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('end_date')} (auto)</label>
              <input class="form-input" id="cf-end" type="date" readonly>
            </div>
          </div>
          <div class="form-row cols-1">
            <div class="form-group">
              <label class="form-label">${t('notes')}</label>
              <textarea class="form-textarea" id="cf-notes" rows="2"></textarea>
            </div>
          </div>

          <div class="form-section-title" style="margin-top:22px">${t('coaches')} <span class="text-muted" style="font-weight:400;font-size:11px">${t('optional_add_later')}</span></div>
          <div id="cf-coach-rows"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="CourseModule.addCreateCoachRow()">+ ${t('add_coach')}</button>

          <div class="form-section-title" style="margin-top:22px">${t('tab_expenses')} <span class="text-muted" style="font-weight:400;font-size:11px">${t('optional_add_later')}</span></div>
          <div id="cf-expense-rows"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="CourseModule.addCreateExpenseRow()">${t('add_expense_btn')}</button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-course-create')">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="CourseModule.saveCreate()">💾 ${t('save')}</button>
        </div>
      </div>
    </div>`;
  }

  function renderCreateCoachRows() {
    const wrap = document.getElementById('cf-coach-rows');
    if (!wrap) return;
    wrap.innerHTML = _createCoaches.length ? _createCoaches.map((row, i) => `
      <div class="flex gap-2" style="margin-bottom:8px">
        <select class="form-select" style="flex:2" onchange="CourseModule.setCreateCoach(${i},this.value)">
          <option value="">${App.t('select_coach_placeholder')}</option>
          ${_coachesList.map(co => `<option value="${co.id}" ${row.coachId === co.id ? 'selected' : ''}>${co.name}</option>`).join('')}
        </select>
        <div class="currency-input-wrap" style="flex:0 0 130px">
          <span class="currency-prefix">$</span>
          <input class="form-input" type="number" min="0" value="${row.cost || ''}" placeholder="${App.t('cost')}" onchange="CourseModule.setCreateCoachCost(${i},this.value)">
        </div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.removeCreateCoachRow(${i})">🗑</button>
      </div>`).join('') : `<p class="text-muted text-sm">${App.t('no_coaches_added_create')}</p>`;
  }
  function addCreateCoachRow() { _createCoaches.push({ coachId: '', cost: 0 }); renderCreateCoachRows(); }
  function setCreateCoach(i, val) { _createCoaches[i].coachId = val; }
  function setCreateCoachCost(i, val) { _createCoaches[i].cost = Number(val) || 0; }
  function removeCreateCoachRow(i) { _createCoaches.splice(i, 1); renderCreateCoachRows(); }

  function renderCreateExpenseRows() {
    const wrap = document.getElementById('cf-expense-rows');
    if (!wrap) return;
    wrap.innerHTML = _createExpenses.length ? _createExpenses.map((row, i) => `
      <div class="flex gap-2" style="margin-bottom:8px">
        <input class="form-input" style="flex:2" placeholder="${App.t('label')}" value="${row.label || ''}" onchange="CourseModule.setCreateExpense(${i},'label',this.value)">
        <div class="currency-input-wrap" style="flex:0 0 120px">
          <span class="currency-prefix">$</span>
          <input class="form-input" type="number" min="0" value="${row.amount || ''}" onchange="CourseModule.setCreateExpense(${i},'amount',this.value)">
        </div>
        <input class="form-input" type="date" style="flex:0 0 150px" value="${row.date || ''}" onchange="CourseModule.setCreateExpense(${i},'date',this.value)">
        <button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.removeCreateExpenseRow(${i})">🗑</button>
      </div>`).join('') : `<p class="text-muted text-sm">${App.t('no_expenses_added_create')}</p>`;
  }
  function addCreateExpenseRow() { _createExpenses.push({ label: '', amount: 0, date: DateUtil.today() }); renderCreateExpenseRows(); }
  function setCreateExpense(i, field, val) { _createExpenses[i][field] = field === 'amount' ? (Number(val) || 0) : val; }
  function removeCreateExpenseRow(i) { _createExpenses.splice(i, 1); renderCreateExpenseRows(); }

  function calcCreateEnd() {
    const s = document.getElementById('cf-start')?.value;
    const v = document.getElementById('cf-duration-value')?.value;
    const u = document.getElementById('cf-duration-unit')?.value;
    const endEl = document.getElementById('cf-end');
    if (endEl) endEl.value = computeEndDate(s, v, u);
  }
  function bindCreateAutoCalc() {
    if (_createDateBound) return;
    ['cf-duration-value', 'cf-duration-unit', 'cf-start'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', calcCreateEnd); el.addEventListener('change', calcCreateEnd); }
    });
    _createDateBound = true;
  }

  function openCreate() {
    _createCoaches = []; _createExpenses = [];
    ['cf-name', 'cf-place', 'cf-price', 'cf-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('cf-start').value = DateUtil.today();
    document.getElementById('cf-duration-value').value = '1';
    document.getElementById('cf-duration-unit').value = 'months';
    renderCreateCoachRows();
    renderCreateExpenseRows();
    bindCreateAutoCalc();
    calcCreateEnd();
    Modal.open('modal-course-create');
  }

  async function saveCreate() {
    const valid = Validate.form([
      { id: 'cf-name', rules: ['required'], label: App.t('course_name') },
      { id: 'cf-price', rules: ['required'], label: App.t('price_per_member') },
      { id: 'cf-start', rules: ['required'], label: App.t('start_date') },
    ]);
    if (!valid) return;

    const name = document.getElementById('cf-name').value.trim();
    const place = document.getElementById('cf-place').value.trim();
    const price = Number(document.getElementById('cf-price').value) || 0;
    const startDate = document.getElementById('cf-start').value;
    const durationValue = Number(document.getElementById('cf-duration-value').value) || 1;
    const durationUnit = document.getElementById('cf-duration-unit').value;
    const endDate = computeEndDate(startDate, durationValue, durationUnit);
    const notes = document.getElementById('cf-notes').value.trim();

    const coaches = _createCoaches.filter(r => r.coachId).map(r => ({
      id: generateId(), coachId: r.coachId, coachName: _coachesList.find(c => c.id === r.coachId)?.name || '', cost: Number(r.cost) || 0,
    }));
    const expenses = _createExpenses.filter(r => r.label && r.label.trim()).map(r => ({
      id: generateId(), label: r.label.trim(), amount: Number(r.amount) || 0, date: r.date || DateUtil.today(),
    }));

    const data = {
      name, place, price, startDate, endDate, durationValue, durationUnit, notes,
      coaches, expenses, members: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      const ref = await _db.collection(COL.COURSES).add(data);
      await logActivity(_db, 'course_added', { name });
      Toast.success(App.t('saved'));
      Modal.close('modal-course-create');
      await loadData();
      openWorkspace(ref.id, 'overview');
    } catch (e) {
      Toast.error(App.t('error_generic'));
    }
  }

  /* ═══════════════════════════════════════════════════
     WORKSPACE MODAL — tabs: Overview / Coaches / Members / Expenses
     ═══════════════════════════════════════════════════ */
  function modalWorkspace() {
    const t = App.t.bind(App);
    return `
    <div class="modal-overlay" id="modal-course-workspace">
      <div class="modal modal-xl">
        <div class="modal-header">
          <span class="modal-title" id="course-workspace-title">${t('course_word')}</span>
          <button class="modal-close" onclick="Modal.close('modal-course-workspace')">✕</button>
        </div>
        <div class="cw-tabs">
          <button class="cw-tab-btn active" data-tab="overview" onclick="CourseModule.switchTab('overview')">📋 ${t('tab_overview')}</button>
          <button class="cw-tab-btn" data-tab="coaches" onclick="CourseModule.switchTab('coaches')">🧑‍🏫 ${t('coaches')}</button>
          <button class="cw-tab-btn" data-tab="members" onclick="CourseModule.switchTab('members')">👥 ${t('tab_members')}</button>
          <button class="cw-tab-btn" data-tab="expenses" onclick="CourseModule.switchTab('expenses')">🧾 ${t('tab_expenses')}</button>
        </div>
        <div class="modal-body" id="course-workspace-body"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-course-workspace')">${t('close')}</button>
        </div>
      </div>
    </div>`;
  }

  function openWorkspace(id, tab = 'overview') {
    _activeCourseId = id;
    _activeTab = tab;
    renderWorkspaceTab();
    Modal.open('modal-course-workspace');
  }

  function switchTab(tab) { _activeTab = tab; renderWorkspaceTab(); }

  function renderWorkspaceTab() {
    const c = _all.find(x => x.id === _activeCourseId);
    if (!c) { Modal.close('modal-course-workspace'); return; }
    const titleEl = document.getElementById('course-workspace-title');
    if (titleEl) titleEl.textContent = c.name || App.t('course_word');
    document.querySelectorAll('.cw-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === _activeTab));
    const body = document.getElementById('course-workspace-body');
    if (!body) return;
    if (_activeTab === 'overview') { body.innerHTML = renderOverviewTab(c); bindOverviewAutoCalc(); }
    else if (_activeTab === 'coaches') body.innerHTML = renderCoachesTab(c);
    else if (_activeTab === 'members') body.innerHTML = renderMembersTab(c);
    else if (_activeTab === 'expenses') body.innerHTML = renderExpensesTab(c);
  }

  /* ── Tab: Overview ─────────────────────────────────── */
  function renderOverviewTab(c) {
    const t = App.t.bind(App);
    const stats = courseStats(c);
    const status = courseStatus(c);
    const esc = (c.name || '').replace(/'/g, "\\'");
    return `
      <div class="kpi-grid course-kpi-grid">
        <div class="kpi-card"><div class="kpi-value">${Currency.formatUSD(stats.expectedRevenue)}</div><div class="kpi-label">${t('expected_revenue')}</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:var(--success)">${Currency.formatUSD(stats.collected)}</div><div class="kpi-label">${t('collected')}</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:var(--warning)">${Currency.formatUSD(stats.coachCost + stats.expenseTotal)}</div><div class="kpi-label">${t('coach_cost_expenses')}</div></div>
        <div class="kpi-card"><div class="kpi-value" style="color:${stats.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Currency.formatUSD(stats.netProfit)}</div><div class="kpi-label">${t('net_profit')}</div></div>
      </div>
      <div class="form-section-title">${t('course_details')} ${statusBadgeHTML(status)}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('course_name')} <span class="required">*</span></label>
          <input class="form-input" id="ov-name" value="${(c.name || '').replace(/"/g, '&quot;')}">
          <div class="form-error-msg"></div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('place')}</label>
          <input class="form-input" id="ov-place" value="${(c.place || '').replace(/"/g, '&quot;')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('price_per_member')}</label>
          <div class="currency-input-wrap"><span class="currency-prefix">$</span><input class="form-input" id="ov-price" type="number" min="0" value="${c.price || 0}"></div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('start_date')}</label>
          <input class="form-input" id="ov-start" type="date" value="${c.startDate || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('duration')}</label>
          <div class="flex gap-2">
            <input class="form-input" id="ov-duration-value" type="number" min="1" value="${c.durationValue || 1}" style="max-width:90px">
            <select class="form-select" id="ov-duration-unit">
              <option value="days" ${c.durationUnit === 'days' ? 'selected' : ''}>${t('duration_days')}</option>
              <option value="weeks" ${c.durationUnit === 'weeks' ? 'selected' : ''}>${t('duration_weeks')}</option>
              <option value="months" ${c.durationUnit === 'months' ? 'selected' : ''}>${t('duration_months')}</option>
              <option value="sessions" ${c.durationUnit === 'sessions' ? 'selected' : ''}>${t('duration_sessions')}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('end_date')} (auto)</label>
          <input class="form-input" id="ov-end" type="date" value="${c.endDate || ''}" readonly>
        </div>
      </div>
      <div class="form-row cols-1">
        <div class="form-group">
          <label class="form-label">${t('notes')}</label>
          <textarea class="form-textarea" id="ov-notes" rows="2">${c.notes || ''}</textarea>
        </div>
      </div>
      <div class="flex gap-2" style="margin-top:6px;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="CourseModule.saveOverview('${c.id}')">💾 ${t('save')}</button>
        <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="CourseModule.deleteCourse('${c.id}','${esc}')">${t('delete_course_btn')}</button>
      </div>`;
  }

  function bindOverviewAutoCalc() {
    const v = document.getElementById('ov-duration-value');
    const u = document.getElementById('ov-duration-unit');
    const s = document.getElementById('ov-start');
    const e = document.getElementById('ov-end');
    const calc = () => { if (e) e.value = computeEndDate(s?.value, v?.value, u?.value); };
    [v, u, s].forEach(el => el && el.addEventListener('input', calc));
    [v, u, s].forEach(el => el && el.addEventListener('change', calc));
  }

  async function saveOverview(courseId) {
    const valid = Validate.form([{ id: 'ov-name', rules: ['required'], label: App.t('course_name') }]);
    if (!valid) return;
    const durationValue = Number(document.getElementById('ov-duration-value').value) || 1;
    const durationUnit = document.getElementById('ov-duration-unit').value;
    const startDate = document.getElementById('ov-start').value || '';
    const patch = {
      name: document.getElementById('ov-name').value.trim(),
      place: document.getElementById('ov-place').value.trim(),
      price: Number(document.getElementById('ov-price').value) || 0,
      startDate, durationValue, durationUnit,
      endDate: computeEndDate(startDate, durationValue, durationUnit),
      notes: document.getElementById('ov-notes').value.trim(),
    };
    await mutateCourse(courseId, patch, App.t('saved'));
  }

  /* ── Tab: Coaches ──────────────────────────────────── */
  function renderCoachesTab(c) {
    const t = App.t.bind(App);
    const coaches = c.coaches || [];
    const rows = coaches.length ? coaches.map(cc => {
      const esc = (cc.coachName || '').replace(/'/g, "\\'");
      return `<tr>
        <td><div class="flex items-center gap-2"><div class="avatar">${initials(cc.coachName)}</div><span style="font-weight:600">${cc.coachName}</span></div></td>
        <td>
          <div class="currency-input-wrap" style="max-width:130px">
            <span class="currency-prefix">$</span>
            <input class="form-input" type="number" min="0" value="${cc.cost || 0}" onchange="CourseModule.updateCoachCost('${c.id}','${cc.id}',this.value)">
          </div>
        </td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.removeCoach('${c.id}','${cc.id}','${esc}')">🗑</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="3" class="text-muted text-sm" style="text-align:center;padding:20px">${t('no_coaches_yet')}</td></tr>`;

    const assignedIds = new Set(coaches.map(x => x.coachId));
    const available = _coachesList.filter(co => !assignedIds.has(co.id));

    return `
      <div class="workspace-toolbar">
        <select class="form-select" id="coach-add-select" style="flex:2">
          <option value="">${available.length ? t('select_coach_to_add') : t('all_coaches_assigned')}</option>
          ${available.map(co => `<option value="${co.id}">${co.name}${co.commission ? ` (${co.commission}%)` : ''}</option>`).join('')}
        </select>
        <div class="currency-input-wrap" style="flex:0 0 130px">
          <span class="currency-prefix">$</span>
          <input class="form-input" id="coach-add-cost" type="number" min="0" placeholder="${t('cost')}">
        </div>
        <button class="btn btn-primary btn-sm" onclick="CourseModule.addCoach('${c.id}')">${t('add')}</button>
      </div>
      <div class="table-scroll" style="margin-top:14px">
        <table><thead><tr><th>${t('coach')}</th><th>${t('cost')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
  }

  function addCoach(courseId) {
    const sel = document.getElementById('coach-add-select');
    const costInput = document.getElementById('coach-add-cost');
    const coachId = sel.value;
    if (!coachId) { Toast.warning(App.t('pick_coach_first')); return; }
    const coach = _coachesList.find(x => x.id === coachId);
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const coaches = [...(c.coaches || []), { id: generateId(), coachId, coachName: coach?.name || '', cost: Number(costInput.value) || 0 }];
    mutateCourse(courseId, { coaches }, App.t('saved'));
  }
  function updateCoachCost(courseId, entryId, val) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const coaches = (c.coaches || []).map(x => x.id === entryId ? { ...x, cost: Number(val) || 0 } : x);
    mutateCourse(courseId, { coaches });
  }
  function removeCoach(courseId, entryId, name) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    Modal.confirm({
      title: App.t('remove_coach_title'), message: `${App.t('remove_btn')} <strong>${name}</strong>?`, type: 'danger', confirmText: App.t('remove_btn'),
      onConfirm: async () => { const coaches = (c.coaches || []).filter(x => x.id !== entryId); await mutateCourse(courseId, { coaches }); },
    });
  }

  /* ── Tab: Members ──────────────────────────────────── */
  function renderMembersTab(c) {
    const t = App.t.bind(App);
    const members = c.members || [];
    const rows = members.length ? members.map(m => {
      const remaining = (m.fee || 0) - (m.amountPaid || 0);
      const status = remaining <= 0 ? 'paid' : (m.amountPaid > 0 ? 'partial' : 'unpaid');
      const badge = {
        paid:    `<span class="badge badge-active">● ${t('paid')}</span>`,
        partial: `<span class="badge badge-info">⊘ ${t('partial')}</span>`,
        unpaid:  `<span class="badge badge-expired">✕ ${t('unpaid')}</span>`,
      }[status];
      const esc = (m.name || '').replace(/'/g, "\\'");
      const tagHTML = m.subscriberId
        ? `<span class="badge badge-subscriber" style="margin-left:4px">${t('subscriber_tag')}</span>`
        : `<span class="badge badge-gold" style="margin-left:4px">${t('guest_tag')}</span>`;
      const payBtn = remaining > 0 ? `<button class="btn btn-success btn-sm" onclick="CourseModule.payMember('${c.id}','${m.id}')">💰 ${t('paid')}</button>` : '';
      return `<tr>
        <td><div class="flex items-center gap-2"><div class="avatar">${initials(m.name)}</div><div>
          <div style="font-weight:600">${m.name}${tagHTML}</div>
          <div style="font-size:11px;color:var(--text-muted)">${m.phone || '—'}</div>
        </div></div></td>
        <td>${Currency.formatUSD(m.fee || 0)}</td>
        <td style="color:var(--success)">${Currency.formatUSD(m.amountPaid || 0)}</td>
        <td style="color:${remaining > 0 ? 'var(--danger)' : 'var(--success)'}">${Currency.formatUSD(remaining)}</td>
        <td>${badge}</td>
        <td><div class="flex gap-2">${payBtn}
          <button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.removeMember('${c.id}','${m.id}','${esc}')">🗑</button>
        </div></td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;padding:20px">${t('no_members_yet')}</td></tr>`;

    return `
      <div class="workspace-toolbar" style="position:relative">
        <div class="combo-select" style="flex:2;min-width:200px">
          <input class="form-input" id="member-name-input" placeholder="${t('search_subscriber_or_type')}" autocomplete="off"
            oninput="CourseModule.onMemberSearch(this.value)"
            onfocus="CourseModule.onMemberSearch(this.value)"
            onblur="setTimeout(CourseModule.hideMemberDropdown, 150)">
          <div class="combo-dropdown" id="member-search-dropdown"></div>
        </div>
        <input class="form-input" id="member-phone-input" placeholder="${t('phone_optional')}" style="flex:1;min-width:120px">
        <div class="currency-input-wrap" style="flex:0 0 110px">
          <span class="currency-prefix">$</span>
          <input class="form-input" id="member-fee-input" type="number" min="0" placeholder="${t('fee')}" value="${c.price || ''}">
        </div>
        <input type="hidden" id="member-selected-id">
        <button class="btn btn-primary btn-sm" onclick="CourseModule.addMember('${c.id}')">${t('add')}</button>
      </div>
      <div class="table-scroll" style="margin-top:14px">
        <table><thead><tr><th>${t('member')}</th><th>${t('fee')}</th><th>${t('paid')}</th><th>${t('remaining')}</th><th>${t('status_lbl')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
  }

  function onMemberSearch(val) {
    const hidden = document.getElementById('member-selected-id');
    if (hidden) hidden.value = '';
    renderMemberDropdown(val);
  }
  function renderMemberDropdown(query) {
    const dd = document.getElementById('member-search-dropdown');
    if (!dd) return;
    const q = (query || '').trim().toLowerCase();
    const c = _all.find(x => x.id === _activeCourseId);
    const existingIds = new Set((c?.members || []).map(m => m.subscriberId).filter(Boolean));
    const matches = (!q ? _subscribersList : _subscribersList.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q)))
      .filter(s => !existingIds.has(s.id)).slice(0, 8);
    dd.innerHTML = matches.length ? matches.map(s => {
      const esc = (s.name || '').replace(/'/g, "\\'");
      const escPhone = (s.phone || '').replace(/'/g, "\\'");
      return `<div class="combo-item" onmousedown="event.preventDefault();CourseModule.selectMember('${s.id}','${esc}','${escPhone}')">
        <span>${s.name}</span>${s.phone ? `<span class="combo-item-sub">${s.phone}</span>` : ''}
      </div>`;
    }).join('') : `<div class="combo-item combo-empty">${App.t('no_subscriber_match')}</div>`;
    dd.classList.add('open');
  }
  function selectMember(id, name, phone) {
    document.getElementById('member-name-input').value = name;
    document.getElementById('member-phone-input').value = phone || '';
    document.getElementById('member-selected-id').value = id;
    hideMemberDropdown();
  }
  function hideMemberDropdown() {
    const dd = document.getElementById('member-search-dropdown');
    if (dd) dd.classList.remove('open');
  }

  function addMember(courseId) {
    const nameInput = document.getElementById('member-name-input');
    const phoneInput = document.getElementById('member-phone-input');
    const feeInput = document.getElementById('member-fee-input');
    const idInput = document.getElementById('member-selected-id');
    const name = (nameInput.value || '').trim();
    if (!name) { Toast.warning(App.t('enter_name_or_pick')); return; }
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const entry = {
      id: generateId(),
      subscriberId: idInput.value || null,
      name,
      phone: (phoneInput.value || '').trim(),
      fee: Number(feeInput.value) || Number(c.price) || 0,
      amountPaid: 0,
      joinedAt: DateUtil.today(),
    };
    const members = [...(c.members || []), entry];
    mutateCourse(courseId, { members }, App.t('saved'));
  }

  function payMember(courseId, memberId) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const m = (c.members || []).find(x => x.id === memberId);
    if (!m) return;
    const remaining = (m.fee || 0) - (m.amountPaid || 0);
    Modal.confirm({
      title: App.t('record_payment_title'), message: `${App.t('confirm_payment_of')} <strong>${Currency.formatUSD(remaining)}</strong> ${App.t('for_member')} <strong>${m.name}</strong>?`,
      type: 'success', confirmText: App.t('confirm_payment_btn'),
      onConfirm: async () => {
        const members = c.members.map(x => x.id === memberId ? { ...x, amountPaid: x.fee || 0 } : x);
        await mutateCourse(courseId, { members }, App.t('payment_recorded'));
      },
    });
  }
  function removeMember(courseId, memberId, name) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    Modal.confirm({
      title: App.t('remove_member_title'), message: `${App.t('remove_btn')} <strong>${name}</strong>?`, type: 'danger', confirmText: App.t('remove_btn'),
      onConfirm: async () => { const members = (c.members || []).filter(x => x.id !== memberId); await mutateCourse(courseId, { members }); },
    });
  }

  /* ── Tab: Expenses ─────────────────────────────────── */
  function renderExpensesTab(c) {
    const t = App.t.bind(App);
    const expenses = (c.expenses || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const rows = expenses.length ? expenses.map(e => {
      const esc = (e.label || '').replace(/'/g, "\\'");
      return `<tr>
        <td><input class="form-input" value="${(e.label || '').replace(/"/g, '&quot;')}" onchange="CourseModule.updateExpense('${c.id}','${e.id}','label',this.value)"></td>
        <td>
          <div class="currency-input-wrap" style="max-width:120px">
            <span class="currency-prefix">$</span>
            <input class="form-input" type="number" min="0" value="${e.amount || 0}" onchange="CourseModule.updateExpense('${c.id}','${e.id}','amount',this.value)">
          </div>
        </td>
        <td><input class="form-input" type="date" value="${e.date || ''}" onchange="CourseModule.updateExpense('${c.id}','${e.id}','date',this.value)"></td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="CourseModule.removeExpense('${c.id}','${e.id}','${esc}')">🗑</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="4" class="text-muted text-sm" style="text-align:center;padding:20px">${t('no_expenses_yet')}</td></tr>`;

    return `
      <div class="workspace-toolbar">
        <input class="form-input" id="expense-label-input" placeholder="${t('expense_label_placeholder')}" style="flex:2">
        <div class="currency-input-wrap" style="flex:0 0 120px">
          <span class="currency-prefix">$</span>
          <input class="form-input" id="expense-amount-input" type="number" min="0" placeholder="0">
        </div>
        <input class="form-input" id="expense-date-input" type="date" value="${DateUtil.today()}" style="flex:0 0 150px">
        <button class="btn btn-primary btn-sm" onclick="CourseModule.addExpense('${c.id}')">${t('add')}</button>
      </div>
      <div class="table-scroll" style="margin-top:14px">
        <table><thead><tr><th>${t('label')}</th><th>${t('amount')}</th><th>${t('date')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
  }

  function addExpense(courseId) {
    const label = (document.getElementById('expense-label-input').value || '').trim();
    const amount = Number(document.getElementById('expense-amount-input').value) || 0;
    const date = document.getElementById('expense-date-input').value || DateUtil.today();
    if (!label) { Toast.warning(App.t('enter_expense_label')); return; }
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const expenses = [...(c.expenses || []), { id: generateId(), label, amount, date }];
    mutateCourse(courseId, { expenses }, App.t('saved'));
  }
  function updateExpense(courseId, expenseId, field, val) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    const expenses = (c.expenses || []).map(x => x.id === expenseId ? { ...x, [field]: field === 'amount' ? (Number(val) || 0) : val } : x);
    mutateCourse(courseId, { expenses });
  }
  function removeExpense(courseId, expenseId, label) {
    const c = _all.find(x => x.id === courseId);
    if (!c) return;
    Modal.confirm({
      title: App.t('remove_expense_title'), message: `${App.t('remove_btn')} <strong>${label}</strong>?`, type: 'danger', confirmText: App.t('remove_btn'),
      onConfirm: async () => { const expenses = (c.expenses || []).filter(x => x.id !== expenseId); await mutateCourse(courseId, { expenses }); },
    });
  }

  /* ── Delete whole course ───────────────────────────── */
  function deleteCourse(courseId, name) {
    Modal.confirm({
      title: App.t('delete_course_title'),
      message: `${App.t('delete_confirm')}<br><strong>${name}</strong>`,
      type: 'danger', confirmText: App.t('delete'),
      onConfirm: async () => {
        try {
          await _db.collection(COL.COURSES).doc(courseId).delete();
          await logActivity(_db, 'course_deleted', { name });
          Toast.success(App.t('deleted'));
          if (_activeCourseId === courseId) { Modal.close('modal-course-workspace'); _activeCourseId = null; }
          await loadData();
        } catch (e) { Toast.error(App.t('error_generic')); }
      },
    });
  }

  return {
    render, openCreate, saveCreate,
    addCreateCoachRow, setCreateCoach, setCreateCoachCost, removeCreateCoachRow,
    addCreateExpenseRow, setCreateExpense, removeCreateExpenseRow,
    openWorkspace, switchTab, saveOverview,
    addCoach, updateCoachCost, removeCoach,
    onMemberSearch, selectMember, hideMemberDropdown, addMember, payMember, removeMember,
    addExpense, updateExpense, removeExpense,
    deleteCourse, onSearch, onFilter, goPage,
  };
})();