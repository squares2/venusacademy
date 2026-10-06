// ═══════════════════════════════════════════════════
//  VENUS GYM — NetGuard (connection watchdog)
//  • Measures real internet quality (not just "Wi-Fi on")
//  • Watches every Firestore read/write the app makes and
//    warns when one is slow, stuck, or queued offline
//  • Locks the button that started a save until it finishes
//    (stops double entries on a slow line)
//  • Reconnects Firestore without a page refresh, refreshes
//    the current page's data, and offers a safe reload
// ═══════════════════════════════════════════════════
const NetGuard = (() => {
  /* ── Tunables ─────────────────────────────────────── */
  const PROBE_URL      = 'https://www.gstatic.com/generate_204';
  const PROBE_TIMEOUT  = 6000;   // ms before a probe counts as failed
  const SLOW_RTT       = 1500;   // ms round-trip considered "slow"
  const OP_SLOW_MS     = 3000;   // an operation pending this long → "slow" notice
  const OP_STUCK_MS    = 15000;  // pending this long → "stuck" prompt
  const EVERY_OK_MS    = 20000;  // probe interval when healthy
  const EVERY_BAD_MS   = 5000;   // probe interval when slow / offline
  const SLEEP_MS       = 60000;  // tab hidden longer than this → reconnect on return

  let _db = null;
  let _state = 'online';           // online | slow | offline
  let _rtt = null;
  let _fails = 0, _slowHits = 0;
  let _probeTimer = null, _hiddenAt = 0;
  let _reconnecting = false;
  let _lastClick = { btn: null, at: 0 };
  const _ops = new Map(); let _seq = 0;

  const t = (k, fb) => { try { const v = App.t(k); return v === k ? (fb || k) : v; } catch (_) { return fb || k; } };
  const pendingWrites = () => [..._ops.values()].filter(o => o.kind === 'write');

  /* ══ UI ═══════════════════════════════════════════ */
  function buildUI() {
    if (document.getElementById('ng-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'ng-progress'; bar.className = 'ng-progress';
    document.body.appendChild(bar);

    const banner = document.createElement('div');
    banner.id = 'ng-banner'; banner.className = 'ng-banner'; banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span class="ng-banner-icon" id="ng-banner-icon"></span>
      <span class="ng-banner-text" id="ng-banner-text"></span>
      <span class="ng-banner-actions">
        <button type="button" class="ng-btn" data-ng="reconnect"></button>
        <button type="button" class="ng-btn ng-btn-ghost" data-ng="reload"></button>
        <button type="button" class="ng-btn ng-btn-x" data-ng="dismiss" aria-label="close">✕</button>
      </span>`;
    document.body.appendChild(banner);

    const pop = document.createElement('div');
    pop.id = 'ng-pop'; pop.className = 'ng-pop';
    document.body.appendChild(pop);

    document.addEventListener('click', e => {
      const a = e.target.closest('[data-ng]');
      if (a) {
        const act = a.dataset.ng;
        if (act === 'reconnect') reconnect({ manual: true });
        else if (act === 'reload') safeReload();
        else if (act === 'dismiss') { _dismissedFor = bannerKey(); renderBanner(); }
        else if (act === 'pill') togglePop();
        return;
      }
      if (!e.target.closest('#ng-pop')) pop.classList.remove('open');
    });
  }

  let _dismissedFor = '';
  function bannerKey() {
    const w = pendingWrites();
    const stuck = w.some(o => Date.now() - o.start >= OP_STUCK_MS);
    const slowOp = [..._ops.values()].some(o => Date.now() - o.start >= OP_SLOW_MS);
    if (_reconnecting) return 'reconnecting';
    if (_state === 'offline') return 'offline';
    if (stuck) return 'stuck';
    if (slowOp && w.length) return 'pending';
    if (slowOp) return 'loading';
    if (_state === 'slow') return 'slow';
    return '';
  }

  function renderBanner() {
    const el = document.getElementById('ng-banner'); if (!el) return;
    const k = bannerKey();
    const show = k && k !== _dismissedFor;
    el.className = `ng-banner ng-${k || 'none'}${show ? ' open' : ''}`;
    if (!show) return;
    const cfg = {
      reconnecting: ['🔄', t('ng_reconnecting', 'Reconnecting…'), false, false],
      offline:      ['📡', t('ng_banner_offline'), true, false],
      stuck:        ['⛔', t('ng_banner_stuck'), true, true],
      pending:      ['⏳', t('ng_banner_pending'), false, false],
      loading:      ['⏳', t('ng_banner_loading'), true, false],
      slow:         ['🐢', t('ng_banner_slow'), true, false],
    }[k];
    document.getElementById('ng-banner-icon').textContent = cfg[0];
    const n = pendingWrites().length;
    document.getElementById('ng-banner-text').innerHTML = cfg[1] + (n && k !== 'pending' ? ` <b>(${n} ${t('ng_waiting_short', 'waiting')})</b>` : '');
    const [rc, rl] = el.querySelectorAll('.ng-btn:not(.ng-btn-x)');
    rc.textContent = '↻ ' + t('ng_reconnect', 'Reconnect'); rc.hidden = !cfg[2];
    rl.textContent = t('ng_reload', 'Reload app');          rl.hidden = !cfg[3];
  }

  function renderPill() {
    const pill = document.getElementById('ng-pill'); if (!pill) return;
    const st = _reconnecting ? 'reconnecting' : _state;
    pill.className = `ng-pill ng-pill-${st}`;
    const lbl = { online: t('ng_online', 'Online'), slow: t('ng_slow', 'Slow'), offline: t('ng_offline', 'Offline'), reconnecting: t('ng_reconnecting', 'Reconnecting…') }[st];
    pill.querySelector('.ng-pill-label').textContent = lbl;
    pill.title = `${t('ng_status', 'Connection')}: ${lbl}${_rtt != null ? ` · ${_rtt} ms` : ''}`;
  }

  function renderProgress() {
    const bar = document.getElementById('ng-progress'); if (!bar) return;
    const w = pendingWrites();
    bar.classList.toggle('open', w.length > 0);
    bar.classList.toggle('is-slow', w.some(o => Date.now() - o.start >= OP_SLOW_MS));
  }

  function togglePop() {
    const pop = document.getElementById('ng-pop'), pill = document.getElementById('ng-pill');
    if (!pop || !pill) return;
    if (pop.classList.contains('open')) { pop.classList.remove('open'); return; }
    renderPop();
    const r = pill.getBoundingClientRect();
    pop.style.top = `${r.bottom + 8}px`;
    const rtl = document.documentElement.dir === 'rtl';
    pop.style.left = rtl ? `${Math.max(8, r.left)}px` : '';
    pop.style.right = rtl ? '' : `${Math.max(8, window.innerWidth - r.right)}px`;
    pop.classList.add('open');
  }

  function renderPop() {
    const pop = document.getElementById('ng-pop'); if (!pop) return;
    const st = _reconnecting ? 'reconnecting' : _state;
    const quality = _rtt == null ? '—' : _rtt < 400 ? t('ng_q_good', 'Good') : _rtt < SLOW_RTT ? t('ng_q_fair', 'Fair') : t('ng_q_poor', 'Poor');
    pop.innerHTML = `
      <div class="ng-pop-row"><span>${t('ng_status', 'Connection')}</span><b class="ng-c-${st}">${{ online: t('ng_online', 'Online'), slow: t('ng_slow', 'Slow'), offline: t('ng_offline', 'Offline'), reconnecting: t('ng_reconnecting', 'Reconnecting…') }[st]}</b></div>
      <div class="ng-pop-row"><span>${t('ng_latency', 'Response time')}</span><b>${_rtt != null ? _rtt + ' ms · ' + quality : '—'}</b></div>
      <div class="ng-pop-row"><span>${t('ng_pending_ops', 'Waiting to save')}</span><b>${pendingWrites().length}</b></div>
      <div class="ng-pop-actions">
        <button type="button" class="ng-btn" data-ng="reconnect">↻ ${t('ng_reconnect', 'Reconnect')}</button>
        <button type="button" class="ng-btn ng-btn-ghost" data-ng="reload">${t('ng_reload', 'Reload app')}</button>
      </div>`;
  }

  function renderAll() { renderPill(); renderBanner(); renderProgress(); if (document.getElementById('ng-pop')?.classList.contains('open')) renderPop(); }

  /* ══ State machine ═════════════════════════════════ */
  function setState(next) {
    if (next === _state) { renderAll(); return; }
    const prev = _state; _state = next;
    if (next !== 'online') _dismissedFor = ''; // a new problem always shows
    renderAll();
    if (prev === 'offline' && next !== 'offline') {
      Toast.success(t('ng_back_online', 'Back online ✓'));
      reconnect({ quiet: true });            // revive Firestore streams + refresh data
    }
    if (next === 'offline' && prev !== 'offline' && pendingWrites().length) {
      Toast.warning(t('ng_queued'));
    }
    schedule(0);
  }

  /* ══ Probe ═════════════════════════════════════════ */
  async function probe() {
    if (!navigator.onLine) return { ok: false };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
    const t0 = performance.now();
    try {
      await fetch(`${PROBE_URL}?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
      return { ok: true, ms: Math.round(performance.now() - t0) };
    } catch (_) { return { ok: false }; }
    finally { clearTimeout(timer); }
  }

  async function check() {
    const r = await probe();
    if (!r.ok) {
      _fails++;
      if (!navigator.onLine || _fails >= 2) setState('offline'); else schedule(1500);
      return;
    }
    _fails = 0; _rtt = r.ms;
    _slowHits = r.ms > SLOW_RTT ? _slowHits + 1 : Math.max(0, _slowHits - 1);
    setState(_slowHits >= 2 ? 'slow' : 'online');
  }

  function schedule(ms) {
    clearTimeout(_probeTimer);
    if (document.hidden) return;
    const wait = ms ?? (_state === 'online' ? EVERY_OK_MS : EVERY_BAD_MS);
    _probeTimer = setTimeout(async () => { await check(); schedule(); }, wait);
  }

  /* ══ Reconnect (no page refresh) ═══════════════════ */
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  async function reconnect({ manual = false, quiet = false } = {}) {
    if (_reconnecting) return;
    _reconnecting = true; _dismissedFor = ''; renderAll();
    let ok = false;
    try {
      if (_db) {
        // Tearing the network layer down and up revives a hung Firestore stream
        // (the usual cause of "buttons don't respond" after a drop).
        try { await withTimeout(_db.disableNetwork(), 5000); } catch (_) {}
        try { await withTimeout(_db.enableNetwork(), 8000); } catch (_) {}
      }
      const r = await probe();
      ok = r.ok; if (r.ok) { _rtt = r.ms; _fails = 0; }
    } finally {
      _reconnecting = false;
    }
    if (ok) {
      _state = _rtt > SLOW_RTT ? 'slow' : 'online';
      renderAll();
      if (manual) Toast.success(t('ng_reconnected', 'Connection restored ✓'));
      refreshCurrentPage();
    } else {
      _state = 'offline'; renderAll();
      if (manual || !quiet) Toast.error(t('ng_reconnect_failed'));
    }
    schedule();
  }

  // Reload the visible page's data — but never under an open form or unsaved write.
  function refreshCurrentPage() {
    try {
      if (document.querySelector('.modal-overlay.open')) return;
      if (pendingWrites().length) return;
      if (typeof App !== 'undefined' && App.profile && App.page) App.navigate(App.page);
    } catch (_) {}
  }

  function safeReload() {
    const n = pendingWrites().length;
    if (!n) { location.reload(); return; }
    Modal.confirm({
      title: t('ng_reload_confirm_title', 'Unsaved changes'),
      message: t('ng_reload_confirm_msg').replace('{n}', `<strong>${n}</strong>`),
      type: 'warning', confirmText: t('ng_reload_anyway', 'Reload anyway'),
      onConfirm: () => { _ops.clear(); location.reload(); },
    });
  }

  /* ══ Firestore operation tracking ══════════════════ */
  function lockButton(btn) {
    if (!btn || btn.disabled) return null;
    btn.disabled = true; btn.classList.add('ng-busy'); btn.setAttribute('aria-busy', 'true');
    return btn;
  }
  function unlockButton(btn) {
    if (!btn) return;
    // only release it if no other write is still holding it
    if ([..._ops.values()].some(o => o.btn === btn)) return;
    btn.disabled = false; btn.classList.remove('ng-busy'); btn.removeAttribute('aria-busy');
  }

  function track(promise, kind) {
    const id = ++_seq;
    const op = { kind, start: Date.now(), btn: null, slow: false };
    if (kind === 'write' && _lastClick.btn && Date.now() - _lastClick.at < 2000 && document.contains(_lastClick.btn)) {
      op.btn = lockButton(_lastClick.btn) || (_lastClick.btn.classList.contains('ng-busy') ? _lastClick.btn : null);
    }
    _ops.set(id, op);
    if (kind === 'write' && _state === 'offline') Toast.warning(t('ng_queued'));
    renderProgress();
    const tSlow = setTimeout(() => { if (_ops.has(id)) { op.slow = true; _dismissedFor = ''; renderAll(); } }, OP_SLOW_MS);
    const tStuck = setTimeout(() => { if (_ops.has(id)) { _dismissedFor = ''; renderAll(); check(); } }, OP_STUCK_MS);
    const done = (err) => {
      clearTimeout(tSlow); clearTimeout(tStuck);
      _ops.delete(id);
      unlockButton(op.btn);
      if (!err && kind === 'write' && op.slow) Toast.success(t('ng_saved_late', 'Saved ✓'));
      if (err && /unavailable|offline|network|deadline/i.test(`${err.code || ''} ${err.message || ''}`)) check();
      renderAll();
    };
    promise.then(() => done(), err => done(err));
    return promise;
  }

  function wrap(proto, method, kind) {
    if (!proto || typeof proto[method] !== 'function' || proto[method].__ng) return;
    const orig = proto[method];
    const fn = function (...args) {
      const p = orig.apply(this, args);
      return p && typeof p.then === 'function' ? track(p, kind) : p;
    };
    fn.__ng = true;
    proto[method] = fn;
  }

  function patchFirestore() {
    const fs = window.firebase && firebase.firestore;
    if (!fs) return;
    wrap(fs.DocumentReference?.prototype, 'set', 'write');
    wrap(fs.DocumentReference?.prototype, 'update', 'write');
    wrap(fs.DocumentReference?.prototype, 'delete', 'write');
    wrap(fs.CollectionReference?.prototype, 'add', 'write');
    wrap(fs.WriteBatch?.prototype, 'commit', 'write');
    wrap(fs.Firestore?.prototype, 'runTransaction', 'write');
    wrap(fs.DocumentReference?.prototype, 'get', 'read');
    wrap(fs.Query?.prototype, 'get', 'read');
  }

  /* ══ Boot ══════════════════════════════════════════ */
  function init(db) {
    _db = db;
    buildUI();
    renderAll();

    // remember the button the operator pressed, to lock it while its save runs
    document.addEventListener('click', e => {
      const b = e.target.closest('button, .btn');
      if (b) _lastClick = { btn: b, at: Date.now() };
    }, true);

    window.addEventListener('offline', () => { _fails = 2; setState('offline'); });
    window.addEventListener('online', () => { _fails = 0; check(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { _hiddenAt = Date.now(); clearTimeout(_probeTimer); return; }
      const slept = _hiddenAt && Date.now() - _hiddenAt > SLEEP_MS;
      _hiddenAt = 0;
      if (slept) reconnect({ quiet: true }); else { check(); schedule(); }
    });
    // keep the operator from closing the app while changes are still being sent
    window.addEventListener('beforeunload', e => {
      if (pendingWrites().length) { e.preventDefault(); e.returnValue = ''; }
    });
    // re-label everything when the language switches
    new MutationObserver(renderAll).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setInterval(renderAll, 1000 * 5); // keeps "pending" timers honest even without events

    if (!navigator.onLine) setState('offline');
    check(); schedule();
  }

  patchFirestore(); // firebase compat scripts load before this file

  return { init, reconnect, check, get state() { return _state; }, get rtt() { return _rtt; } };
})();
