// ═══════════════════════════════════════════════════
//  VENUS GYM — Backup & Restore Module
//
//  Design notes (read this before touching the module):
//  • The collection list is NEVER hardcoded here. It is derived
//    from COL (scripts/firebase-config.js) at run time via
//    collectionsList(). The moment a new collection is added to
//    COL, it automatically appears in export/import/overview —
//    no changes needed in this file.
//  • Firestore-only Timestamp/GeoPoint values are wrapped into
//    plain-JSON-safe markers on export ({ __type:'ts'|'geo', ... })
//    and unwrapped back into real Firestore types on import, so
//    the backup file is portable, human-readable JSON.
//  • Firebase Authentication accounts (emails/passwords) are NOT
//    exported — only the Firestore "users" profile documents are.
//    Logins must still be recreated via User Management if a
//    project is rebuilt from scratch.
// ═══════════════════════════════════════════════════
const BackupModule = (() => {

  let _db, _profile;
  let _importPayload   = null;   // parsed backup file
  let _importSelected  = {};     // { collectionName: bool }
  let _exportSelected  = {};     // { collectionName: bool }
  let _resetSelected   = {};     // { collectionName: bool }
  let _restoreMode     = 'merge'; // 'merge' | 'replace'
  let _lastBackupAt    = null;
  let _busy            = false;

  /* ── Collection registry (always in sync with COL) ─── */
  function collectionsList() {
    // Object.values(COL) is the single source of truth for every
    // collection in the schema. Adding a new entry to COL is the
    // ONLY change required for it to be picked up here.
    return Object.entries(COL).map(([key, name]) => ({ key, name }));
  }

  /* ── Serialization helpers (Firestore <-> JSON) ──────── */
  function serializeVal(v) {
    if (v && typeof v.toDate === 'function' && typeof v.seconds === 'number') {
      return { __type: 'ts', seconds: v.seconds, nanoseconds: v.nanoseconds || 0 };
    }
    if (v instanceof firebase.firestore.GeoPoint) {
      return { __type: 'geo', lat: v.latitude, lng: v.longitude };
    }
    if (Array.isArray(v)) return v.map(serializeVal);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k in v) o[k] = serializeVal(v[k]);
      return o;
    }
    return v;
  }

  function deserializeVal(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (v.__type === 'ts')  return new firebase.firestore.Timestamp(v.seconds, v.nanoseconds || 0);
      if (v.__type === 'geo') return new firebase.firestore.GeoPoint(v.lat, v.lng);
      const o = {};
      for (const k in v) o[k] = deserializeVal(v[k]);
      return o;
    }
    if (Array.isArray(v)) return v.map(deserializeVal);
    return v;
  }

  /* ── Render ───────────────────────────────────────────── */
  async function render(db, profile) {
    _db = db; _profile = profile;
    const t = App.t.bind(App);
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">🗄️ ${t('backup_title')}</h1>
          <p class="page-subtitle">${t('backup_subtitle')}</p>
        </div>
      </div>

      <div class="backup-overview" id="backup-overview">
        <div class="page-loader"><div class="spinner"></div></div>
      </div>

      <div class="backup-grid">
        <div class="settings-card backup-card">
          <div class="settings-card-title">⬇️ ${t('backup_export_title')}</div>
          <p class="backup-hint">${t('backup_export_hint')}</p>
          <div class="backup-select-row">
            <span class="backup-select-label" id="export-select-label"></span>
            <button class="btn btn-ghost btn-sm" onclick="BackupModule.toggleAllExport()">${t('backup_toggle_all')}</button>
          </div>
          <div class="backup-checklist" id="export-checklist"></div>
          <button class="btn btn-primary backup-action-btn" id="export-btn" onclick="BackupModule.exportBackup()">
            💾 ${t('backup_export_btn')}
          </button>
          <div class="backup-progress hidden" id="export-progress">
            <div class="progress-bar-wrap"><div class="progress-bar-fill" id="export-progress-fill" style="width:0%"></div></div>
            <div class="backup-log" id="export-log"></div>
          </div>
        </div>

        <div class="settings-card backup-card">
          <div class="settings-card-title">⬆️ ${t('backup_import_title')}</div>
          <p class="backup-hint">${t('backup_import_hint')}</p>

          <div class="backup-dropzone" id="backup-dropzone" onclick="document.getElementById('backup-file-input').click()">
            <span class="backup-dropzone-icon">📄</span>
            <span id="backup-dropzone-text">${t('backup_choose_file')}</span>
            <input type="file" id="backup-file-input" accept="application/json,.json" class="hidden" onchange="BackupModule.handleFile(this.files[0])">
          </div>

          <div id="import-details" class="hidden">
            <div class="backup-meta" id="import-meta"></div>

            <div class="backup-select-row">
              <span class="backup-select-label" id="import-select-label"></span>
              <button class="btn btn-ghost btn-sm" onclick="BackupModule.toggleAllImport()">${t('backup_toggle_all')}</button>
            </div>
            <div class="backup-checklist" id="import-checklist"></div>

            <div class="backup-mode-row">
              <label class="backup-mode-option ${_restoreMode === 'merge' ? 'active' : ''}" id="mode-merge">
                <input type="radio" name="restore-mode" value="merge" ${_restoreMode === 'merge' ? 'checked' : ''} onchange="BackupModule.setMode('merge')">
                <div>
                  <div class="backup-mode-title">${t('backup_mode_merge')}</div>
                  <div class="backup-mode-desc">${t('backup_mode_merge_desc')}</div>
                </div>
              </label>
              <label class="backup-mode-option ${_restoreMode === 'replace' ? 'active' : ''}" id="mode-replace">
                <input type="radio" name="restore-mode" value="replace" ${_restoreMode === 'replace' ? 'checked' : ''} onchange="BackupModule.setMode('replace')">
                <div>
                  <div class="backup-mode-title">${t('backup_mode_replace')}</div>
                  <div class="backup-mode-desc">${t('backup_mode_replace_desc')}</div>
                </div>
              </label>
            </div>

            <button class="btn btn-danger backup-action-btn" id="restore-btn" onclick="BackupModule.confirmRestore()">
              ♻️ ${t('backup_restore_btn')}
            </button>
          </div>

          <div class="backup-progress hidden" id="import-progress">
            <div class="progress-bar-wrap"><div class="progress-bar-fill" id="import-progress-fill" style="width:0%"></div></div>
            <div class="backup-log" id="import-log"></div>
          </div>
        </div>
      </div>

      <div class="settings-card backup-card backup-card-danger">
        <div class="settings-card-title">🧨 ${t('backup_reset_title')}</div>
        <p class="backup-hint">${t('backup_reset_hint')}</p>
        <div class="backup-select-row">
          <span class="backup-select-label" id="reset-select-label"></span>
          <button class="btn btn-ghost btn-sm" onclick="BackupModule.toggleAllReset()">${t('backup_toggle_all')}</button>
        </div>
        <div class="backup-checklist" id="reset-checklist"></div>
        <button class="btn btn-danger backup-action-btn" id="reset-btn" onclick="BackupModule.confirmReset()" style="max-width:280px">
          🧨 ${t('backup_reset_btn')}
        </button>
        <div class="backup-progress hidden" id="reset-progress">
          <div class="progress-bar-wrap"><div class="progress-bar-fill" id="reset-progress-fill" style="width:0%"></div></div>
          <div class="backup-log" id="reset-log"></div>
        </div>
      </div>

      <p class="backup-footnote">${t('backup_auth_note')}</p>
    `;

    collectionsList().forEach(c => { _exportSelected[c.name] = true; _resetSelected[c.name] = false; });
    renderExportChecklist();
    renderResetChecklist();
    await loadOverview();
  }

  /* ── Collection overview (live doc counts) ───────────── */
  async function loadOverview() {
    const el = document.getElementById('backup-overview');
    if (!el) return;
    const cols = collectionsList();
    try {
      const counts = await Promise.all(cols.map(c =>
        _db.collection(c.name).get().then(s => s.size).catch(() => '—')
      ));
      let lastBackup = null;
      try {
        const s = await _db.collection(COL.SETTINGS).doc('global').get();
        if (s.exists) lastBackup = s.data().lastBackupAt;
      } catch (e) {}
      _lastBackupAt = lastBackup;

      el.innerHTML = `
        <div class="backup-stats-row">
          ${cols.map((c, i) => `
            <div class="backup-stat-chip">
              <span class="backup-stat-count">${counts[i]}</span>
              <span class="backup-stat-name">${c.name}</span>
            </div>`).join('')}
        </div>
        ${lastBackup ? `<div class="backup-last-run">
          ${App.t('backup_last_export')}: ${DateUtil.timeAgo(lastBackup)}
        </div>` : ''}
      `;
    } catch (e) {
      el.innerHTML = `<p class="text-muted text-sm">${App.t('backup_overview_fail')}</p>`;
    }
  }

  /* ── Export checklist rendering ──────────────────────── */
  function renderExportChecklist() {
    const el = document.getElementById('export-checklist');
    if (!el) return;
    el.innerHTML = collectionsList().map(c => `
      <label class="backup-check-item">
        <input type="checkbox" ${_exportSelected[c.name] ? 'checked' : ''} onchange="BackupModule.toggleExport('${c.name}', this.checked)">
        <span>${c.name}</span>
      </label>`).join('');
    updateExportLabel();
  }

  function toggleExport(name, checked) { _exportSelected[name] = checked; updateExportLabel(); }

  function toggleAllExport() {
    const all = Object.values(_exportSelected).every(v => v);
    collectionsList().forEach(c => { _exportSelected[c.name] = !all; });
    renderExportChecklist();
  }

  function updateExportLabel() {
    const total = collectionsList().length;
    const picked = Object.values(_exportSelected).filter(Boolean).length;
    setText('export-select-label', `${picked}/${total} ${App.t('backup_collections_selected')}`);
  }

  /* ── Reset (wipe) checklist rendering ─────────────────── */
  function renderResetChecklist() {
    const el = document.getElementById('reset-checklist');
    if (!el) return;
    el.innerHTML = collectionsList().map(c => `
      <label class="backup-check-item">
        <input type="checkbox" ${_resetSelected[c.name] ? 'checked' : ''} onchange="BackupModule.toggleReset('${c.name}', this.checked)">
        <span>${c.name}</span>
      </label>`).join('');
    updateResetLabel();
  }

  function toggleReset(name, checked) { _resetSelected[name] = checked; updateResetLabel(); }

  function toggleAllReset() {
    const all = Object.values(_resetSelected).every(v => v);
    collectionsList().forEach(c => { _resetSelected[c.name] = !all; });
    renderResetChecklist();
  }

  function updateResetLabel() {
    const total = collectionsList().length;
    const picked = Object.values(_resetSelected).filter(Boolean).length;
    setText('reset-select-label', `${picked}/${total} ${App.t('backup_collections_selected')}`);
  }

  /* ── Export flow ──────────────────────────────────────── */
  async function exportBackup() {
    if (_busy) return;
    const selected = collectionsList().filter(c => _exportSelected[c.name]);
    if (!selected.length) { Toast.warning(App.t('backup_select_one')); return; }

    _busy = true;
    const btn = document.getElementById('export-btn');
    const progressWrap = document.getElementById('export-progress');
    const fill = document.getElementById('export-progress-fill');
    const log = document.getElementById('export-log');
    btn.disabled = true;
    progressWrap.classList.remove('hidden');
    fill.style.width = '0%';
    log.innerHTML = '';

    const data = {};
    let totalDocs = 0;

    try {
      for (let i = 0; i < selected.length; i++) {
        const c = selected[i];
        appendLog(log, `⏳ ${c.name}…`);
        const snap = await _db.collection(c.name).get();
        data[c.name] = snap.docs.map(d => ({ _id: d.id, ...serializeVal(d.data()) }));
        totalDocs += snap.size;
        updateLastLog(log, `✓ ${c.name} — ${snap.size} ${App.t('backup_docs')}`);
        fill.style.width = `${Math.round(((i + 1) / selected.length) * 100)}%`;
      }

      const backup = {
        meta: {
          app: 'Venus Gym',
          exportVersion: 2,
          exportedAt: new Date().toISOString(),
          exportedBy: _profile?.displayName || _profile?.name || _profile?.email || 'unknown',
          collections: selected.map(c => c.name),
          totalDocs
        },
        data
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      a.href = url;
      a.download = `venus-gym-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await _db.collection(COL.SETTINGS).doc('global').set({
        lastBackupAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastBackupBy: _profile?.displayName || _profile?.email || 'unknown'
      }, { merge: true });

      await logActivity(_db, 'backup_export', { collections: selected.map(c => c.name), totalDocs });
      Toast.success(`${App.t('backup_export_success')} (${totalDocs} ${App.t('backup_docs')})`);
      loadOverview();
    } catch (e) {
      console.error('Export failed:', e);
      appendLog(log, `✕ ${App.t('error_generic')}`);
      Toast.error(App.t('error_generic'));
    } finally {
      _busy = false;
      btn.disabled = false;
    }
  }

  /* ── Import: read + validate file ────────────────────── */
  function handleFile(file) {
    if (!file) return;
    document.getElementById('backup-dropzone-text').textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      let parsed;
      try { parsed = JSON.parse(e.target.result); }
      catch (err) { Toast.error(App.t('backup_invalid_file')); return; }

      if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
        Toast.error(App.t('backup_invalid_file'));
        return;
      }

      _importPayload = parsed;
      _importSelected = {};
      Object.keys(parsed.data).forEach(name => { _importSelected[name] = true; });
      renderImportDetails();
    };
    reader.onerror = () => Toast.error(App.t('backup_invalid_file'));
    reader.readAsText(file);
  }

  function renderImportDetails() {
    const wrap = document.getElementById('import-details');
    const metaEl = document.getElementById('import-meta');
    const listEl = document.getElementById('import-checklist');
    if (!wrap || !_importPayload) return;

    const meta = _importPayload.meta || {};
    const knownNames = collectionsList().map(c => c.name);

    metaEl.innerHTML = `
      <div class="detail-row"><span class="detail-label">${App.t('backup_exported_at')}</span><span class="detail-value">${meta.exportedAt ? new Date(meta.exportedAt).toLocaleString() : '—'}</span></div>
      <div class="detail-row"><span class="detail-label">${App.t('backup_exported_by')}</span><span class="detail-value">${meta.exportedBy || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">${App.t('backup_total_docs')}</span><span class="detail-value">${meta.totalDocs ?? Object.values(_importPayload.data).reduce((n, arr) => n + arr.length, 0)}</span></div>
    `;

    listEl.innerHTML = Object.keys(_importPayload.data).map(name => {
      const count = _importPayload.data[name].length;
      const unknown = !knownNames.includes(name);
      return `
        <label class="backup-check-item">
          <input type="checkbox" ${_importSelected[name] ? 'checked' : ''} onchange="BackupModule.toggleImport('${name}', this.checked)">
          <span>${name} <span class="text-muted text-sm">(${count})</span></span>
          ${unknown ? `<span class="badge badge-warning" style="margin-inline-start:auto">${App.t('backup_unknown_collection')}</span>` : ''}
        </label>`;
    }).join('');

    updateImportLabel();
    wrap.classList.remove('hidden');
  }

  function toggleImport(name, checked) { _importSelected[name] = checked; updateImportLabel(); }

  function toggleAllImport() {
    const all = Object.values(_importSelected).every(v => v);
    Object.keys(_importSelected).forEach(name => { _importSelected[name] = !all; });
    renderImportDetails();
  }

  function updateImportLabel() {
    const total = Object.keys(_importSelected).length;
    const picked = Object.values(_importSelected).filter(Boolean).length;
    setText('import-select-label', `${picked}/${total} ${App.t('backup_collections_selected')}`);
  }

  function setMode(mode) {
    _restoreMode = mode;
    document.getElementById('mode-merge')?.classList.toggle('active', mode === 'merge');
    document.getElementById('mode-replace')?.classList.toggle('active', mode === 'replace');
  }

  /* ── Restore confirmation (typed safety gate) ────────── */
  function confirmRestore() {
    const selected = Object.keys(_importSelected).filter(n => _importSelected[n]);
    if (!selected.length) { Toast.warning(App.t('backup_select_one')); return; }

    const existing = document.getElementById('modal-restore-confirm');
    if (existing) existing.remove();

    const isReplace = _restoreMode === 'replace';
    const t = App.t.bind(App);

    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'modal-restore-confirm';
    el.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <span class="modal-title">⚠️ ${t('backup_confirm_title')}</span>
          <button class="modal-close" onclick="Modal.close('modal-restore-confirm')">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message" style="margin-bottom:14px">
            ${isReplace ? t('backup_confirm_replace_msg') : t('backup_confirm_merge_msg')}
          </p>
          <p class="text-muted text-sm" style="margin-bottom:10px">${t('backup_confirm_type')} <strong>RESTORE</strong></p>
          <input class="form-input" id="restore-confirm-input" placeholder="RESTORE" oninput="document.getElementById('restore-confirm-btn').disabled = this.value.trim() !== 'RESTORE'">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-restore-confirm')">${t('cancel')}</button>
          <button class="btn btn-danger" id="restore-confirm-btn" disabled onclick="Modal.close('modal-restore-confirm'); BackupModule.runRestore();">${t('backup_restore_btn')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('open'), 10);
    el.addEventListener('click', e => { if (e.target === el) Modal.close('modal-restore-confirm'); });
  }

  /* ── Chunked batch helpers (Firestore 500-op limit) ──── */
  async function chunkedSet(collectionName, docs, merge) {
    const CHUNK = 400;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = _db.batch();
      docs.slice(i, i + CHUNK).forEach(doc => {
        const { _id, ...fields } = doc;
        const ref = _db.collection(collectionName).doc(_id);
        batch.set(ref, deserializeVal(fields), merge ? { merge: true } : {});
      });
      await batch.commit();
    }
  }

  async function chunkedDeleteAll(collectionName) {
    const snap = await _db.collection(collectionName).get();
    const ids = snap.docs.map(d => d.ref);
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = _db.batch();
      ids.slice(i, i + CHUNK).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    return ids.length;
  }

  /* ── Restore execution ───────────────────────────────── */
  async function runRestore() {
    if (_busy || !_importPayload) return;
    _busy = true;

    const selected = Object.keys(_importSelected).filter(n => _importSelected[n]);
    const btn = document.getElementById('restore-btn');
    const progressWrap = document.getElementById('import-progress');
    const fill = document.getElementById('import-progress-fill');
    const log = document.getElementById('import-log');
    btn.disabled = true;
    progressWrap.classList.remove('hidden');
    fill.style.width = '0%';
    log.innerHTML = '';

    let restoredDocs = 0;
    const failures = [];

    for (let i = 0; i < selected.length; i++) {
      const name = selected[i];
      const docs = _importPayload.data[name] || [];
      appendLog(log, `⏳ ${name}…`);
      try {
        if (_restoreMode === 'replace') {
          const removed = await chunkedDeleteAll(name);
          updateLastLog(log, `🗑️ ${name} — ${removed} ${App.t('backup_removed')}`);
          appendLog(log, `⏳ ${name}…`);
        }
        await chunkedSet(name, docs, _restoreMode === 'merge');
        restoredDocs += docs.length;
        updateLastLog(log, `✓ ${name} — ${docs.length} ${App.t('backup_restored')}`);
      } catch (e) {
        console.error(`Restore failed [${name}]:`, e);
        updateLastLog(log, `✕ ${name} — ${App.t('error_generic')}`);
        failures.push(name);
      }
      fill.style.width = `${Math.round(((i + 1) / selected.length) * 100)}%`;
    }

    await logActivity(_db, 'backup_restore', { mode: _restoreMode, collections: selected, restoredDocs, failures });

    if (failures.length) {
      Toast.warning(`${App.t('backup_restore_partial')}: ${failures.join(', ')}`);
    } else {
      Toast.success(`${App.t('backup_restore_success')} (${restoredDocs} ${App.t('backup_docs')})`);
    }

    _busy = false;
    btn.disabled = false;
    loadOverview();
  }

  /* ── Reset (wipe) confirmation + execution ───────────── */
  function confirmReset() {
    const selected = collectionsList().filter(c => _resetSelected[c.name]);
    if (!selected.length) { Toast.warning(App.t('backup_select_one')); return; }

    const existing = document.getElementById('modal-reset-confirm');
    if (existing) existing.remove();
    const t = App.t.bind(App);

    const noRecentBackup = !_lastBackupAt;
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'modal-reset-confirm';
    el.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <span class="modal-title">🧨 ${t('backup_reset_confirm_title')}</span>
          <button class="modal-close" onclick="Modal.close('modal-reset-confirm')">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message" style="margin-bottom:10px">
            ${t('backup_reset_confirm_msg')} <strong>${selected.map(c => c.name).join(', ')}</strong>.
          </p>
          ${noRecentBackup ? `<p style="color:var(--warning);font-size:12.5px;margin-bottom:14px">⚠️ ${t('backup_no_recent_backup')}</p>` : ''}
          <p class="text-muted text-sm" style="margin-bottom:10px">${t('backup_confirm_type')} <strong>DELETE</strong></p>
          <input class="form-input" id="reset-confirm-input" placeholder="DELETE" oninput="document.getElementById('reset-confirm-btn').disabled = this.value.trim() !== 'DELETE'">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-reset-confirm')">${t('cancel')}</button>
          <button class="btn btn-danger" id="reset-confirm-btn" disabled onclick="Modal.close('modal-reset-confirm'); BackupModule.runReset();">${t('backup_reset_btn')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('open'), 10);
    el.addEventListener('click', e => { if (e.target === el) Modal.close('modal-reset-confirm'); });
  }

  async function runReset() {
    if (_busy) return;
    _busy = true;

    const selected = collectionsList().filter(c => _resetSelected[c.name]);
    const btn = document.getElementById('reset-btn');
    const progressWrap = document.getElementById('reset-progress');
    const fill = document.getElementById('reset-progress-fill');
    const log = document.getElementById('reset-log');
    btn.disabled = true;
    progressWrap.classList.remove('hidden');
    fill.style.width = '0%';
    log.innerHTML = '';

    let removedDocs = 0;
    const failures = [];

    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      appendLog(log, `⏳ ${c.name}…`);
      try {
        const removed = await chunkedDeleteAll(c.name);
        removedDocs += removed;
        updateLastLog(log, `🗑️ ${c.name} — ${removed} ${App.t('backup_removed')}`);
      } catch (e) {
        console.error(`Reset failed [${c.name}]:`, e);
        updateLastLog(log, `✕ ${c.name} — ${App.t('error_generic')}`);
        failures.push(c.name);
      }
      fill.style.width = `${Math.round(((i + 1) / selected.length) * 100)}%`;
    }

    await logActivity(_db, 'data_reset', { collections: selected.map(c => c.name), removedDocs, failures });

    if (failures.length) {
      Toast.warning(`${App.t('backup_restore_partial')}: ${failures.join(', ')}`);
    } else {
      Toast.success(`${App.t('backup_reset_success')} (${removedDocs} ${App.t('backup_docs')})`);
    }

    _busy = false;
    btn.disabled = false;
    loadOverview();
  }

  /* ── Log helpers ──────────────────────────────────────── */
  function appendLog(logEl, text) {
    const line = document.createElement('div');
    line.className = 'backup-log-line';
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function updateLastLog(logEl, text) {
    const last = logEl.lastElementChild;
    if (last) last.textContent = text;
    logEl.scrollTop = logEl.scrollHeight;
  }

  return {
    render, toggleExport, toggleAllExport, exportBackup,
    handleFile, toggleImport, toggleAllImport, setMode,
    confirmRestore, runRestore,
    toggleReset, toggleAllReset, confirmReset, runReset
  };
})();