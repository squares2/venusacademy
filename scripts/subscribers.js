// ═══════════════════════════════════════════════════
//  VENUS GYM — Subscribers Module
// ═══════════════════════════════════════════════════

const SubscribersModule = (() => {

  let _db, _profile;
  let _all = [], _filtered = [];
  let _page = 1;
  const PER_PAGE = 15;
  let _editId = null;

  /* ── Render Page ──────────────────────────────────── */
  async function render(db, profile) {
    _db = db; _profile = profile;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">${t('subscribers')}</h1>
          <p class="page-subtitle" id="sub-count-label">${t('loading')}</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-outline" onclick="SubscribersModule.exportCSV()">⬇ Export</button>
          <button class="btn btn-primary" onclick="SubscribersModule.openAdd()">+ ${t('add_subscriber')}</button>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="sub-search" placeholder="${t('search')}" oninput="SubscribersModule.onSearch(this.value)">
        </div>
        <select class="filter-select" id="sub-filter-status" onchange="SubscribersModule.onFilter()">
          <option value="">All Status</option>
          <option value="active">${t('active')}</option>
          <option value="expired">${t('expired')}</option>
          <option value="expiring">${t('expiring_soon')}</option>
        </select>
        <select class="filter-select" id="sub-filter-sport" onchange="SubscribersModule.onFilter()">
          <option value="">All Sports</option>
        </select>
      </div>

      <div class="table-wrap">
        <div class="table-scroll">
          <table id="sub-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${t('name')}</th>
                <th>${t('phone')}</th>
                <th>${t('sport')}</th>
                <th>${t('coach')}</th>
                <th>Status</th>
                <th>Expires</th>
                <th>${t('paid')}</th>
                <th>${t('actions')}</th>
              </tr>
            </thead>
            <tbody id="sub-tbody">
              <tr><td colspan="9" class="table-empty">${t('loading')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <span id="sub-pagination-info"></span>
          <div class="pagination" id="sub-pagination"></div>
        </div>
      </div>

      ${modalAddEdit()}
      ${modalProfile()}
    `;

    await loadSports();
    await loadData();
  }

  /* ── Load Sports for filter ───────────────────────── */
  async function loadSports() {
    try {
      const snap = await _db.collection(COL.SPORTS).orderBy('name').get();
      const sel = document.getElementById('sub-filter-sport');
      if (!sel) return;
      snap.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.data().name;
        sel.appendChild(opt);
      });
    } catch(e) {}
  }

  /* ── Load Subscribers from Firestore ─────────────── */
  async function loadData() {
    try {
      const snap = await _db.collection(COL.SUBSCRIBERS).orderBy('createdAt', 'desc').get();
      _all = [];

      // Get active subscriptions for each subscriber
      const subSnap = await _db.collection(COL.SUBSCRIPTIONS)
        .orderBy('endDate', 'desc').get();

      const subMap = {};
      subSnap.forEach(d => {
        const data = d.data();
        if (!subMap[data.subscriberId]) subMap[data.subscriberId] = data;
      });

      snap.forEach(d => {
        const sub = { id: d.id, ...d.data() };
        sub._subscription = subMap[d.id] || null;
        sub._status = calcStatus(sub._subscription);
        _all.push(sub);
      });

      _filtered = [..._all];
      document.getElementById('sub-count-label').textContent =
        `${_all.length} subscriber${_all.length !== 1 ? 's' : ''} total`;
      renderTable();
    } catch(e) {
      document.getElementById('sub-tbody').innerHTML =
        `<tr><td colspan="9" class="table-empty" style="color:var(--danger)">⚠ Failed to load data</td></tr>`;
    }
  }

  /* ── Status calculation ───────────────────────────── */
  function calcStatus(subscription) {
    if (!subscription || !subscription.endDate) return 'none';
    if (DateUtil.isExpired(subscription.endDate)) return 'expired';
    if (DateUtil.isExpiringSoon(subscription.endDate, 7)) return 'expiring';
    return 'active';
  }

  /* ── Render Table ────────────────────────────────── */
  function renderTable() {
    const tbody = document.getElementById('sub-tbody');
    const total = _filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (_page > totalPages) _page = 1;

    const slice = _filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">${App.t('no_data')}</td></tr>`;
    } else {
      tbody.innerHTML = slice.map((s, i) => {
        const num = (_page - 1) * PER_PAGE + i + 1;
        const sub = s._subscription;
        const statusBadge = {
          active:   `<span class="badge badge-active">● ${App.t('active')}</span>`,
          expired:  `<span class="badge badge-expired">● ${App.t('expired')}</span>`,
          expiring: `<span class="badge badge-warning">● ${App.t('expiring_soon')}</span>`,
          none:     `<span class="badge" style="background:var(--bg-hover);color:var(--text-muted)">—</span>`,
        }[s._status] || '';
        const expires = sub?.endDate ? DateUtil.format(sub.endDate) : '—';
        const paid = sub ? Currency.formatUSD(sub.amountPaid || 0) : '—';
        const esc = s.name.replace(/'/g,"\'");
        return `<tr onclick="SubscribersModule.openProfile('${s.id}')" style="cursor:pointer">
          <!-- DESKTOP cells -->
          <td class="dt-only" style="color:var(--text-muted)">${num}</td>
          <td class="dt-only"><div class="subscriber-name-cell">
            <div class="avatar">${initials(s.name)}</div>
            <div><div class="name">${s.name}</div><div class="phone">${s.phone||''}</div></div>
          </div></td>
          <td class="dt-only">${s.phone||'—'}</td>
          <td class="dt-only">${sub?.sportName||'—'}</td>
          <td class="dt-only">${sub?.coachName||'—'}</td>
          <td class="dt-only">${statusBadge}</td>
          <td class="dt-only" style="font-size:12px">${expires}</td>
          <td class="dt-only" style="color:var(--gold-400)">${paid}</td>
          <td class="dt-only" onclick="event.stopPropagation()"><div class="flex gap-2">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="SubscribersModule.whatsapp('${s.id}')">💬</button>
            <button class="btn btn-outline btn-sm btn-icon" onclick="SubscribersModule.openEdit('${s.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="SubscribersModule.deleteSubscriber('${s.id}','${esc}')">🗑</button>
          </div></td>
          <!-- MOBILE card cell -->
          <td class="mob-only" colspan="9" style="padding:6px 0;border:none" onclick="event.stopPropagation()">
            <div class="mobile-card" onclick="SubscribersModule.openProfile('${s.id}')">
              <div class="mobile-card-header">
                <div class="flex items-center gap-2">
                  <div class="avatar">${initials(s.name)}</div>
                  <div><div style="font-weight:700;font-size:14px">${s.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${s.phone||''}</div></div>
                </div>
                ${statusBadge}
              </div>
              <div class="mobile-card-body">
                <div class="mobile-card-row"><span>Sport</span><span>${sub?.sportName||'—'}</span></div>
                <div class="mobile-card-row"><span>Coach</span><span>${sub?.coachName||'—'}</span></div>
                <div class="mobile-card-row"><span>Expires</span><span>${expires}</span></div>
                <div class="mobile-card-row"><span>Paid</span><span style="color:var(--gold-400)">${paid}</span></div>
              </div>
              <div class="mobile-card-actions" onclick="event.stopPropagation()">
                <button class="btn btn-ghost btn-sm" onclick="SubscribersModule.whatsapp('${s.id}')">💬</button>
                <button class="btn btn-outline btn-sm" onclick="SubscribersModule.openEdit('${s.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="SubscribersModule.deleteSubscriber('${s.id}','${esc}')">🗑</button>
              </div>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    document.getElementById('sub-pagination-info').textContent =
      `Showing ${Math.min((_page-1)*PER_PAGE+1, total)}–${Math.min(_page*PER_PAGE, total)} of ${total}`;
    renderPagination('sub-pagination', _page, totalPages, 'SubscribersModule.goPage');
  }

  function goPage(p) { _page = p; renderTable(); }

  /* ── Search & Filter ──────────────────────────────── */
  const onSearch = debounce((val) => {
    applyFilters();
  }, 280);

  function onFilter() { applyFilters(); }

  function applyFilters() {
    const q      = (document.getElementById('sub-search')?.value || '').toLowerCase();
    const status = document.getElementById('sub-filter-status')?.value || '';
    const sport  = document.getElementById('sub-filter-sport')?.value || '';

    _filtered = _all.filter(s => {
      const matchQ = !q || s.name?.toLowerCase().includes(q) || s.phone?.includes(q);
      const matchStatus = !status || s._status === status;
      const matchSport  = !sport  || s._subscription?.sportId === sport;
      return matchQ && matchStatus && matchSport;
    });
    _page = 1;
    renderTable();
  }

  /* ── Modal: Add/Edit ─────────────────────────────── */
  function modalAddEdit() {
    const t = App.t.bind(App);
    return `
    <div class="modal-overlay" id="modal-subscriber">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title" id="sub-modal-title">${t('add_subscriber')}</span>
          <button class="modal-close" onclick="Modal.close('modal-subscriber')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-section-title">Personal Information</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('name')} <span class="required">*</span></label>
              <input class="form-input" id="sf-name" placeholder="e.g. Sara Al-Hassan">
              <div class="form-error-msg"></div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('phone')} <span class="required">*</span></label>
              <input class="form-input" id="sf-phone" placeholder="+961 xx xxx xxx">
              <div class="form-error-msg"></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('gender')}</label>
              <select class="form-select" id="sf-gender">
                <option value="">Select…</option>
                <option value="female">${t('female')}</option>
                <option value="male">${t('male')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('dob')}</label>
              <input class="form-input" id="sf-dob" type="date">
            </div>
          </div>
          <div class="form-row cols-1">
            <div class="form-group">
              <label class="form-label">${t('address')}</label>
              <input class="form-input" id="sf-address" placeholder="City, Area">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('email_lbl')}</label>
              <input class="form-input" id="sf-email" type="email" placeholder="email@example.com">
            </div>
            <div class="form-group">
              <label class="form-label">Emergency Contact</label>
              <input class="form-input" id="sf-emergency" placeholder="Name – Phone">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input class="form-input" id="sf-height" type="number" min="0" max="250" placeholder="170">
            </div>
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input class="form-input" id="sf-weight" type="number" min="0" max="300" placeholder="65">
            </div>
          </div>
          <div class="form-row cols-1">
            <div class="form-group">
              <label class="form-label">${t('notes')}</label>
              <textarea class="form-textarea" id="sf-notes" placeholder="Health notes, goals…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-subscriber')">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="SubscribersModule.saveSubscriber()">💾 ${t('save')}</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Modal: Profile / Detail ──────────────────────── */
  function modalProfile() {
    return `
    <div class="modal-overlay" id="modal-sub-profile">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">Subscriber Profile</span>
          <button class="modal-close" onclick="Modal.close('modal-sub-profile')">✕</button>
        </div>
        <div class="modal-body" id="sub-profile-body">
          <div class="page-loader"><div class="spinner"></div></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-sub-profile')">Close</button>
          <button class="btn btn-outline" id="profile-edit-btn">✏️ Edit</button>
          <button class="btn btn-primary" id="profile-subscribe-btn">📋 New Subscription</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Open Modals ──────────────────────────────────── */
  function openAdd() {
    _editId = null;
    document.getElementById('sub-modal-title').textContent = App.t('add_subscriber');
    clearForm();
    Modal.open('modal-subscriber');
  }

  function openEdit(id) {
    _editId = id;
    const sub = _all.find(s => s.id === id);
    if (!sub) return;
    document.getElementById('sub-modal-title').textContent = App.t('edit') + ': ' + sub.name;
    fillForm(sub);
    Modal.open('modal-subscriber');
  }

  async function openProfile(id) {
    Modal.open('modal-sub-profile');
    const body = document.getElementById('sub-profile-body');
    body.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;

    try {
      const sub = _all.find(s => s.id === id) || {};
      const subSnap = await _db.collection(COL.SUBSCRIPTIONS)
        .where('subscriberId','==',id).orderBy('startDate','desc').limit(5).get();
      const subs = subSnap.docs.map(d => ({id:d.id,...d.data()}));

      body.innerHTML = `
        <div class="profile-header">
          <div class="avatar avatar-xl">${initials(sub.name)}</div>
          <div class="profile-meta">
            <div class="profile-name">${sub.name}</div>
            <div class="profile-id">${sub.phone || ''} · ${sub.address || ''}</div>
            <div class="profile-badges" style="margin-top:8px">
              ${sub.gender ? `<span class="badge badge-info">${sub.gender === 'female' ? '♀' : '♂'} ${App.t(sub.gender)}</span>` : ''}
              ${sub._status ? `<span class="badge badge-${sub._status === 'active' ? 'active' : sub._status === 'expiring' ? 'warning' : 'expired'}">${App.t(sub._status)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="form-section-title">Details</div>
        ${detailRow('Email', sub.email || '—')}
        ${detailRow('Height / Weight', `${sub.height||'—'} cm / ${sub.weight||'—'} kg`)}
        ${detailRow('Emergency Contact', sub.emergency || '—')}
        ${detailRow('Notes', sub.notes || '—')}

        <div class="form-section-title" style="margin-top:20px">Subscription History</div>
        ${subs.length ? subs.map(s => `
          <div class="payment-item">
            <div class="payment-icon ${DateUtil.isExpired(s.endDate) ? 'partial' : 'paid'}">
              ${DateUtil.isExpired(s.endDate) ? '⏱' : '✓'}
            </div>
            <div class="payment-info">
              <div class="payment-desc">${s.sportName || '—'} · ${s.coachName || 'No coach'}</div>
              <div class="payment-date">${DateUtil.format(s.startDate)} → ${DateUtil.format(s.endDate)}</div>
            </div>
            <div class="payment-amount">${Currency.formatUSD(s.amountPaid || 0)}</div>
          </div>`).join('') : '<p class="text-muted text-sm">No subscriptions yet.</p>'}
      `;

      document.getElementById('profile-edit-btn').onclick = () => {
        Modal.close('modal-sub-profile'); openEdit(id);
      };
      document.getElementById('profile-subscribe-btn').onclick = async () => {
        Modal.close('modal-sub-profile');
        await App.navigate('subscriptions');
        SubscriptionsModule?.openNew(id, sub.name);
      };
    } catch(e) {
      body.innerHTML = `<p style="color:var(--danger)">Failed to load profile.</p>`;
    }
  }

  function detailRow(label, value) {
    return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
  }

  /* ── Form Helpers ────────────────────────────────── */
  function clearForm() {
    ['sf-name','sf-phone','sf-gender','sf-dob','sf-address','sf-email',
     'sf-emergency','sf-height','sf-weight','sf-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function fillForm(sub) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('sf-name', sub.name);
    set('sf-phone', sub.phone);
    set('sf-gender', sub.gender);
    set('sf-dob', sub.dob);
    set('sf-address', sub.address);
    set('sf-email', sub.email);
    set('sf-emergency', sub.emergency);
    set('sf-height', sub.height);
    set('sf-weight', sub.weight);
    set('sf-notes', sub.notes);
  }

  /* ── Save ────────────────────────────────────────── */
  async function saveSubscriber() {
    const ok = Validate.form([
      { id: 'sf-name',  rules: ['required'], label: App.t('name') },
      { id: 'sf-phone', rules: ['required'], label: App.t('phone') },
    ]);
    if (!ok) return;

    const data = {
      name:      document.getElementById('sf-name').value.trim(),
      phone:     document.getElementById('sf-phone').value.trim(),
      gender:    document.getElementById('sf-gender').value,
      dob:       document.getElementById('sf-dob').value,
      address:   document.getElementById('sf-address').value.trim(),
      email:     document.getElementById('sf-email').value.trim(),
      emergency: document.getElementById('sf-emergency').value.trim(),
      height:    document.getElementById('sf-height').value,
      weight:    document.getElementById('sf-weight').value,
      notes:     document.getElementById('sf-notes').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      if (_editId) {
        await _db.collection(COL.SUBSCRIBERS).doc(_editId).update(data);
        await logActivity(_db, 'subscriber_updated', { name: data.name, id: _editId });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await _db.collection(COL.SUBSCRIBERS).add(data);
        await logActivity(_db, 'subscriber_added', { name: data.name, id: ref.id });
      }
      Toast.success(App.t('saved'));
      Modal.close('modal-subscriber');
      await loadData();
    } catch(e) {
      Toast.error(App.t('error_generic'));
    }
  }

  /* ── Delete ──────────────────────────────────────── */
  function deleteSubscriber(id, name) {
    Modal.confirm({
      title: App.t('delete') + ' Subscriber',
      message: App.t('delete_confirm') + `<br><strong>${name}</strong>`,
      type: 'danger',
      confirmText: App.t('delete'),
      onConfirm: async () => {
        try {
          await _db.collection(COL.SUBSCRIBERS).doc(id).delete();
          await logActivity(_db, 'subscriber_deleted', { name, id });
          Toast.success(App.t('deleted'));
          await loadData();
        } catch(e) { Toast.error(App.t('error_generic')); }
      }
    });
  }

  /* ── WhatsApp ─────────────────────────────────────── */
  function whatsapp(id) {
    const sub = _all.find(s => s.id === id);
    if (!sub?.phone) return Toast.warning('No phone number');
    const msg = `Hello ${sub.name}, this is a message from Venus Gym. 🏋️`;
    window.open(buildWhatsAppLink(sub.phone, msg), '_blank');
  }

  /* ── CSV Export ──────────────────────────────────── */
  function exportCSV() {
    const rows = [['Name','Phone','Gender','Address','Status','Expires']];
    _filtered.forEach(s => {
      rows.push([s.name, s.phone, s.gender, s.address, s._status,
        s._subscription?.endDate || '']);
    });
    const csv = rows.map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `venus_subscribers_${DateUtil.today()}.csv`;
    a.click();
  }

  /* ── Public ──────────────────────────────────────── */
  return { render, openAdd, openEdit, openProfile, saveSubscriber,
           deleteSubscriber, whatsapp, onSearch, onFilter, goPage, exportCSV };
})();