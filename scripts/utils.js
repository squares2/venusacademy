// ═══════════════════════════════════════════════════
//  VENUS GYM — Shared Utilities
// ═══════════════════════════════════════════════════

/* ── Currency ─────────────────────────────────────── */
const Currency = {
  dollarRate: 89500,

  setRate(rate) { this.dollarRate = Number(rate) || 89500; },

  formatUSD(amount) {
    return `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatLBP(amount) {
    return `${Number(amount || 0).toLocaleString('en-US')} ل.ل`;
  },

  usdToLbp(usd) { return usd * this.dollarRate; },
  lbpToUsd(lbp) { return lbp / this.dollarRate; },

  formatBoth(usd) {
    return `${this.formatUSD(usd)} / ${this.formatLBP(this.usdToLbp(usd))}`;
  },

  // Display based on stored currency type
  display(amount, currency = 'USD') {
    if (currency === 'USD') return this.formatUSD(amount);
    return this.formatLBP(amount);
  }
};

/* ── Date / Time ──────────────────────────────────── */
const DateUtil = {
  today() { return new Date().toISOString().split('T')[0]; },

  addMonths(dateStr, months) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  },

  diffDays(dateStr1, dateStr2 = null) {
    const a = new Date(dateStr1);
    const b = dateStr2 ? new Date(dateStr2) : new Date();
    return Math.ceil((a - b) / (1000 * 60 * 60 * 24));
  },

  format(dateStr, locale = 'en') {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'ar' ? 'ar-LB' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  formatShort(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toISOString().split('T')[0];
  },

  timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - (timestamp?.toMillis?.() || timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return App.t('just_now');
    if (mins < 60) return `${mins}${App.t('min_ago')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${App.t('hr_ago')}`;
    const days = Math.floor(hrs / 24);
    return `${days}${App.t('day_ago')}`;
  },

  isExpired(dateStr) { return this.diffDays(dateStr) < 0; },
  isExpiringSoon(dateStr, days = 7) {
    const d = this.diffDays(dateStr);
    return d >= 0 && d <= days;
  }
};

/* ── Toast Notifications ──────────────────────────── */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-size:16px">${icons[type]||'ℹ'}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 5000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); }
};

/* ── Modal Manager ────────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  },

  // Dynamic confirm dialog
  confirm({ title, message, type = 'danger', confirmText, cancelText, onConfirm }) {
    const existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();

    const icons = { danger: '🗑️', warning: '⚠️', success: '✓' };
    const t = App?.t || (k => k);

    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'modal-confirm';
    el.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" onclick="Modal.close('modal-confirm')">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:28px 24px">
          <div class="confirm-icon ${type}">${icons[type] || '⚠️'}</div>
          <p class="confirm-message">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-confirm')">${cancelText || t('cancel')}</button>
          <button class="btn btn-${type}" id="confirm-action-btn">${confirmText || t('confirm')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('open'), 10);

    document.getElementById('confirm-action-btn').addEventListener('click', () => {
      Modal.close('modal-confirm');
      if (onConfirm) onConfirm();
    });
    el.addEventListener('click', e => { if (e.target === el) Modal.close('modal-confirm'); });
  }
};

/* ── Validation ───────────────────────────────────── */
const Validate = {
  phone(val) { return /^[\d\s\+\-\(\)]{7,15}$/.test(val?.trim()); },
  email(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val?.trim()); },
  required(val) { return val !== undefined && val !== null && String(val).trim() !== ''; },

  form(fields) {
    // fields: [{id, rules: ['required','phone','email'], label}]
    let valid = true;
    fields.forEach(({ id, rules, label }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('error');
      const errEl = el.parentElement.querySelector('.form-error-msg');
      if (errEl) errEl.textContent = '';

      for (const rule of rules) {
        let ok = true;
        let msg = '';
        if (rule === 'required') { ok = this.required(el.value); msg = `${label} is required`; }
        if (rule === 'phone')    { ok = this.phone(el.value); msg = 'Invalid phone number'; }
        if (rule === 'email')    { ok = this.email(el.value); msg = 'Invalid email address'; }
        if (!ok) {
          el.classList.add('error');
          if (errEl) errEl.textContent = msg;
          valid = false;
          break;
        }
      }
    });
    return valid;
  }
};

/* ── DOM Helpers ──────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; }
function setText(id, txt)  { const el = $(id); if (el) el.textContent = txt; }
function show(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = $(id); if (el) el.classList.add('hidden'); }
function toggle(id, condition) { condition ? show(id) : hide(id); }

function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── WhatsApp Link Builder ────────────────────────── */
function buildWhatsAppLink(phone, message) {
  const clean = phone.replace(/\D/g, '');
  const num = clean.startsWith('0') ? '961' + clean.slice(1) : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/* ── Activity Logger ─────────────────────────────── */
async function logActivity(db, action, details = {}) {
  try {
    const user = firebase.auth().currentUser;
    await db.collection(COL.ACTIVITIES).add({
      action,
      details,
      userId: user?.uid || 'system',
      userName: user?.displayName || 'System',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* silent */ }
}

/* ── Pagination Helper ────────────────────────────── */
function renderPagination(containerId, current, total, onPage) {
  const el = $(containerId);
  if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }
  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="${onPage}(${current - 1})">‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<button class="page-btn${i === current ? ' active' : ''}" onclick="${onPage}(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    }
  }
  if (current < total) html += `<button class="page-btn" onclick="${onPage}(${current + 1})">›</button>`;
  el.innerHTML = html;
}

/* ── Icon Library ─────────────────────────────────────
   A small set of hand-built outline icons (24x24, currentColor
   stroke) so the sidebar and dashboard use a single consistent
   icon style instead of mixed emoji, which render inconsistently
   across OS/browser font sets. Usage: Icon.render('dashboard').
   ───────────────────────────────────────────────────── */
const Icon = (() => {
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    subscribers: '<circle cx="9" cy="8" r="3.2"/><path d="M3.2 20c0-3.7 2.6-6.3 5.8-6.3s5.8 2.6 5.8 6.3"/><circle cx="17" cy="8.2" r="2.3"/><path d="M15.3 14c2.4.5 4 2.7 4 6"/>',
    subscriptions: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3.4h6a1 1 0 0 1 1 1V6H8V4.4a1 1 0 0 1 1-1Z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
    coaches: '<rect x="1.8" y="9.2" width="3" height="5.6" rx="1.1"/><rect x="19.2" y="9.2" width="3" height="5.6" rx="1.1"/><path d="M4.8 12h2.2M17 12h2.2"/><rect x="7" y="10.4" width="10" height="3.2" rx="1.2"/>',
    sports: '<circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    pos: '<circle cx="9.2" cy="20" r="1.3" fill="currentColor" stroke="none"/><circle cx="17.8" cy="20" r="1.3" fill="currentColor" stroke="none"/><path d="M2.3 3h2.4l2.1 11.2a2 2 0 0 0 2 1.65h8.5a2 2 0 0 0 2-1.6L21 7.4H6.1"/>',
    reports: '<path d="M4.2 20.3V10.8M11 20.3V4M17.8 20.3v-7.2"/><path d="M2.5 20.3h19"/>',
    diet: '<path d="M5 19c8 1 14-5 14-13 0-1 0-2-.3-3-7 0-13 5-14 13-.3 1-.2 2 .3 3Z"/><path d="M6.3 17.7C10 14 14 9.7 17.7 6"/>',
    users: '<path d="M12 3.2l6.8 2.9v4.7c0 4.7-2.9 7.9-6.8 9.4-3.9-1.5-6.8-4.7-6.8-9.4V6.1L12 3.2Z"/><circle cx="12" cy="10.3" r="2"/><path d="M8.9 15.2c0-1.8 1.4-3 3.1-3s3.1 1.2 3.1 3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.6c.1-.5.15-1 .15-1.6s-.05-1.1-.15-1.6l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2h-4l-.4 2.9a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6c-.1.5-.15 1-.15 1.6s.05 1.1.15 1.6l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 2.6 1.5L10 22h4l.4-2.9a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z"/>',
    backup: '<ellipse cx="12" cy="5.6" rx="7.4" ry="2.7"/><path d="M4.6 5.6V12c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7V5.6"/><path d="M4.6 12v6.4c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7V12"/>',
    revenue: '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.5v11M15 9.3c0-1.3-1.3-2.3-3-2.3s-3 .9-3 2.2c0 3 6 1.4 6 4.3 0 1.3-1.3 2.3-3 2.3s-3-1-3-2.3"/>',
    active: '<circle cx="12" cy="12" r="8.6"/><path d="M8 12.3l2.7 2.7L16.2 9"/>',
    activity: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3.4h6a1 1 0 0 1 1 1V6H8V4.4a1 1 0 0 1 1-1Z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
    warning: '<path d="M12 3.5 22 20.5H2Z"/><path d="M12 9.5v5.2"/><circle cx="12" cy="17.6" r="0.9" fill="currentColor" stroke="none"/>',
  };

  function render(name, size = '1em') {
    const p = PATHS[name];
    if (!p) return '';
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  }

  return { render };
})();