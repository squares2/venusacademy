// ═══════════════════════════════════════════════════
//  VENUS GYM — WhatsApp automation
//  WaQueue    → builds messages from editable templates and stores
//               them in the `wa_queue` collection (no duplicates)
//  WaSender   → drives the "Venus WhatsApp Sender" Chrome extension,
//               which types & sends each message in WhatsApp Web
//  WaPage     → the WhatsApp page (queue, progress, history)
//  WaSettings → Settings ▸ WhatsApp (on/off per type + templates)
// ═══════════════════════════════════════════════════

/* ── Local dictionary (keeps app.js light) ─────────── */
const WaI18n = (() => {
  const EN = {
    title: 'WhatsApp Sender', subtitle: 'Automatic reminders sent through your WhatsApp Web',
    type_expiring: 'Expiring soon', type_unpaid: 'Unpaid balance', type_renewal: 'Renewal', type_payment: 'Payment received',
    desc_expiring: 'Sent once to each subscription that enters the "Expiring Soon" window.',
    desc_unpaid: 'One message per subscriber listing everything they still owe (repeats every N days while unpaid).',
    desc_renewal: 'Sent when a subscription is renewed automatically.',
    desc_payment: 'Sent whenever a payment is recorded — tells the member what was paid and what remains.',
    st_pending: 'Pending', st_sending: 'Sending', st_sent: 'Sent', st_failed: 'Failed', st_skipped: 'Skipped',
    ext_ok: 'Extension connected', ext_missing: 'Extension not detected', wa_tab_open: 'WhatsApp Web tab open', wa_tab_closed: 'WhatsApp Web tab will open automatically',
    sent_today: 'Sent today', pending_count: 'Waiting',
    start: 'Start sending', stop: 'Stop', scan: 'Scan now', open_wa: 'Open WhatsApp Web', settings: 'Message settings',
    sending_to: 'Sending to', next_in: 'Next message in', sec: 's', idle: 'Idle — press Start to send the waiting messages.',
    paused_login: 'WhatsApp Web is not logged in. Open it, scan the QR code with the gym phone, then press Start.',
    paused_limit: 'Daily limit reached. The remaining messages will be sent tomorrow.',
    paused_failures: '3 messages failed in a row. Check the WhatsApp Web tab, then press Start again.',
    paused_ext: 'The extension stopped responding. Reload the extension or this page, then press Start.',
    done_all: 'All waiting messages were sent ✓',
    scan_done: 'new message(s) added to the queue', scan_none: 'Nothing new to add',
    edit: 'Edit', skip: 'Skip', retry: 'Retry', del: 'Delete', manual: 'Send manually', mark_sent: 'Mark as sent',
    edit_title: 'Edit message', save: 'Save', cancel: 'Cancel', empty: 'Nothing here.',
    err_no_phone: 'No phone number', err_invalid_number: 'Not on WhatsApp / invalid number', err_timeout: 'Timed out',
    err_interrupted: 'Interrupted (app closed while sending)', err_no_extension: 'Extension not reachable', err_send_click_failed: 'Could not press Send',
    install_title: 'Install the WhatsApp Sender extension (one time)',
    install_1: 'Unzip <b>Venus_WA_Extension.zip</b> on the reception computer.',
    install_2: 'In Chrome or Edge open <b>chrome://extensions</b> (Edge: <b>edge://extensions</b>).',
    install_3: 'Turn on <b>Developer mode</b>, click <b>Load unpacked</b>, and choose the unzipped folder.',
    install_4: 'Open <b>web.whatsapp.com</b> and link the gym phone by scanning the QR code.',
    install_5: 'Reload this page — the badge above turns green.',
    tip: 'Keep Chrome open and the computer awake while sending. Messages go out slowly on purpose (random pause between each) to look natural.',
    // settings
    s_title: 'WhatsApp messages', s_sender: 'Sender', s_daily: 'Daily limit (messages)', s_min: 'Min pause (seconds)', s_max: 'Max pause (seconds)',
    s_unpaid_every: 'Repeat unpaid reminder every (days)', s_autoscan: 'Check for new reminders automatically when the app opens',
    s_types: 'Message types', s_active: 'Active', s_inactive: 'Inactive', s_template: 'Message', s_placeholders: 'Click to insert:',
    s_preview: 'Preview', s_remaining_line: 'Line when something is still unpaid', s_paid_line: 'Line when fully paid',
    s_saved: 'WhatsApp settings saved', s_reset: 'Restore default text',
    ph_name: 'member name', ph_sport: 'sport', ph_start: 'start date', ph_end: 'end date', ph_days_left: 'days left', ph_months: 'months',
    ph_amount: 'subscription price', ph_count: 'unpaid fees', ph_total_owed: 'total owed', ph_list: 'list of unpaid fees',
    ph_paid_now: 'amount just paid', ph_paid_total: 'paid so far', ph_total: 'subscription total', ph_remaining: 'remaining',
    ph_remaining_line: 'remaining / fully-paid line', ph_gym: 'gym name',
  };
  const AR = {
    title: 'مرسل واتساب', subtitle: 'تذكيرات تلقائية تُرسل عبر واتساب ويب الخاص بك',
    type_expiring: 'ينتهي قريباً', type_unpaid: 'رصيد غير مدفوع', type_renewal: 'تجديد', type_payment: 'استلام دفعة',
    desc_expiring: 'تُرسل مرة واحدة لكل اشتراك يدخل فترة «ينتهي قريباً».',
    desc_unpaid: 'رسالة واحدة لكل مشترك بكل المبالغ المستحقة عليه (تتكرر كل N يوم طالما لم يُدفع).',
    desc_renewal: 'تُرسل عند تجديد الاشتراك تلقائياً.',
    desc_payment: 'تُرسل عند تسجيل أي دفعة — تُعلم المشترك بما دفعه وما تبقى عليه.',
    st_pending: 'بالانتظار', st_sending: 'جارٍ الإرسال', st_sent: 'تم الإرسال', st_failed: 'فشل', st_skipped: 'تم التخطي',
    ext_ok: 'الإضافة متصلة', ext_missing: 'الإضافة غير موجودة', wa_tab_open: 'تبويب واتساب ويب مفتوح', wa_tab_closed: 'سيُفتح تبويب واتساب ويب تلقائياً',
    sent_today: 'أُرسل اليوم', pending_count: 'بالانتظار',
    start: 'بدء الإرسال', stop: 'إيقاف', scan: 'فحص الآن', open_wa: 'فتح واتساب ويب', settings: 'إعدادات الرسائل',
    sending_to: 'جارٍ الإرسال إلى', next_in: 'الرسالة التالية بعد', sec: 'ث', idle: 'متوقف — اضغط «بدء الإرسال» لإرسال الرسائل المنتظرة.',
    paused_login: 'واتساب ويب غير مسجّل الدخول. افتحه وامسح رمز QR بهاتف النادي ثم اضغط «بدء الإرسال».',
    paused_limit: 'تم بلوغ الحد اليومي. سيتم إرسال الباقي غداً.',
    paused_failures: 'فشلت 3 رسائل متتالية. تحقق من تبويب واتساب ويب ثم اضغط «بدء الإرسال» مجدداً.',
    paused_ext: 'الإضافة توقفت عن الاستجابة. أعد تحميل الإضافة أو هذه الصفحة ثم اضغط «بدء الإرسال».',
    done_all: 'تم إرسال كل الرسائل المنتظرة ✓',
    scan_done: 'رسالة/رسائل جديدة أُضيفت إلى القائمة', scan_none: 'لا يوجد جديد',
    edit: 'تعديل', skip: 'تخطي', retry: 'إعادة المحاولة', del: 'حذف', manual: 'إرسال يدوي', mark_sent: 'تعليم كمُرسل',
    edit_title: 'تعديل الرسالة', save: 'حفظ', cancel: 'إلغاء', empty: 'لا يوجد شيء هنا.',
    err_no_phone: 'لا يوجد رقم هاتف', err_invalid_number: 'الرقم غير موجود على واتساب / غير صالح', err_timeout: 'انتهت المهلة',
    err_interrupted: 'توقف (أُغلق التطبيق أثناء الإرسال)', err_no_extension: 'تعذّر الوصول إلى الإضافة', err_send_click_failed: 'تعذّر الضغط على إرسال',
    install_title: 'تثبيت إضافة مرسل واتساب (مرة واحدة)',
    install_1: 'فك ضغط <b>Venus_WA_Extension.zip</b> على كمبيوتر الاستقبال.',
    install_2: 'في Chrome أو Edge افتح <b>chrome://extensions</b> (في Edge: <b>edge://extensions</b>).',
    install_3: 'فعّل <b>وضع المطوّر</b> ثم اضغط <b>Load unpacked / تحميل غير مضغوط</b> واختر المجلد.',
    install_4: 'افتح <b>web.whatsapp.com</b> واربط هاتف النادي بمسح رمز QR.',
    install_5: 'أعد تحميل هذه الصفحة — ستتحول الشارة أعلاه إلى الأخضر.',
    tip: 'أبقِ المتصفح مفتوحاً والكمبيوتر يعمل أثناء الإرسال. الرسائل تُرسل ببطء عمداً (توقف عشوائي بين كل رسالة) لتبدو طبيعية.',
    s_title: 'رسائل واتساب', s_sender: 'المُرسِل', s_daily: 'الحد اليومي (رسائل)', s_min: 'أقل توقف (ثوانٍ)', s_max: 'أكثر توقف (ثوانٍ)',
    s_unpaid_every: 'تكرار تذكير الرصيد كل (أيام)', s_autoscan: 'البحث عن تذكيرات جديدة تلقائياً عند فتح التطبيق',
    s_types: 'أنواع الرسائل', s_active: 'مفعّل', s_inactive: 'غير مفعّل', s_template: 'نص الرسالة', s_placeholders: 'اضغط للإدراج:',
    s_preview: 'معاينة', s_remaining_line: 'السطر عند وجود مبلغ متبقٍ', s_paid_line: 'السطر عند التسديد الكامل',
    s_saved: 'تم حفظ إعدادات واتساب', s_reset: 'استعادة النص الافتراضي',
    ph_name: 'اسم المشترك', ph_sport: 'الرياضة', ph_start: 'تاريخ البدء', ph_end: 'تاريخ الانتهاء', ph_days_left: 'الأيام المتبقية', ph_months: 'الأشهر',
    ph_amount: 'سعر الاشتراك', ph_count: 'عدد الرسوم', ph_total_owed: 'إجمالي المستحق', ph_list: 'قائمة الرسوم',
    ph_paid_now: 'المبلغ المدفوع الآن', ph_paid_total: 'المدفوع حتى الآن', ph_total: 'إجمالي الاشتراك', ph_remaining: 'المتبقي',
    ph_remaining_line: 'سطر المتبقي / التسديد', ph_gym: 'اسم النادي',
  };
  return { t: k => ((typeof App !== 'undefined' && App.lang === 'ar') ? AR : EN)[k] || EN[k] || k };
})();

/* ═══════════════════════════════════════════════════ */
const WaQueue = (() => {
  const COL_Q = 'wa_queue';
  const TYPES = ['expiring', 'unpaid', 'renewal', 'payment'];
  const PLACEHOLDERS = {
    expiring: ['name', 'sport', 'start', 'end', 'days_left', 'months', 'amount', 'gym'],
    unpaid:   ['name', 'count', 'total_owed', 'list', 'gym'],
    renewal:  ['name', 'sport', 'months', 'start', 'end', 'amount', 'gym'],
    payment:  ['name', 'sport', 'months', 'start', 'end', 'paid_now', 'paid_total', 'total', 'remaining', 'remaining_line', 'gym'],
  };
  const DEFAULTS = {
    sender: { dailyLimit: 40, minDelay: 30, maxDelay: 90, unpaidEveryDays: 7, autoScan: true },
    types: {
      expiring: { active: true,  template: 'مرحباً {name} 👋\nنودّ تذكيرك بأن اشتراكك في {sport} ينتهي بتاريخ {end} (بعد {days_left} يوم).\nللتجديد يسعدنا استقبالك في {gym} 💪' },
      unpaid:   { active: false, template: 'مرحباً {name}،\nتذكير ودّي من {gym}: لديك {count} رسوم اشتراك غير مدفوعة بمجموع {total_owed}:\n{list}\nشكراً لتعاونك 🙏' },
      renewal:  { active: true,  template: 'مرحباً {name} 🎉\nتم تجديد اشتراكك في {sport} لمدة {months} شهر، من {start} إلى {end}.\nقيمة الاشتراك: {amount}. نتمنى لك تمريناً موفقاً 💪' },
      payment:  { active: true,  template: 'مرحباً {name} ✅\nتم استلام دفعة بقيمة {paid_now} عن اشتراك {sport} ({months} شهر: {start} ← {end}).\n{remaining_line}\nشكراً لك — {gym}',
                  remainingLine: 'المبلغ المتبقي للدفع لاحقاً: {remaining}', paidInFullLine: 'تم تسديد الاشتراك بالكامل ✓' },
    },
  };

  let _cache = null, _cacheAt = 0;
  const _phones = new Map();

  function merge(saved = {}, gymName = '') {
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    Object.assign(out.sender, saved.sender || {});
    TYPES.forEach(k => Object.assign(out.types[k], (saved.types || {})[k] || {}));
    out.gymName = gymName || 'Venus Gym';
    return out;
  }

  async function getSettings(db, force = false) {
    if (!force && _cache && Date.now() - _cacheAt < 60000) return _cache;
    let data = {};
    try { const d = await db.collection(COL.SETTINGS).doc('global').get(); if (d.exists) data = d.data(); } catch (_) {}
    _cache = merge(data.waSettings, data.gymName); _cacheAt = Date.now();
    return _cache;
  }
  function invalidate() { _cache = null; }

  function render(template, vars) {
    return String(template || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
  }

  // Lebanese-friendly normalisation: 03123456 / 70123456 / +961 70 123 456 → 96170123456
  function normalizePhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '961' + d.slice(1);
    else if (d.length <= 8) d = '961' + d;
    return d.length >= 10 ? d : '';
  }

  async function phoneOf(db, subscriberId) {
    if (!subscriberId) return '';
    if (_phones.has(subscriberId)) return _phones.get(subscriberId);
    let p = '';
    try { const d = await db.collection(COL.SUBSCRIBERS).doc(subscriberId).get(); if (d.exists) p = d.data().phone || ''; } catch (_) {}
    _phones.set(subscriberId, p);
    return p;
  }

  const safeId = k => String(k).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 140);
  const fmt$ = n => Currency.formatUSD(Number(n) || 0);
  const fmtD = d => DateUtil.format(d, (typeof App !== 'undefined' && App.lang) || 'en');

  // Adds one message unless that type is switched off or the same key already exists.
  async function enqueue(db, { type, key, subscriberId, name, phone, vars }) {
    const s = await getSettings(db);
    const cfg = s.types[type];
    if (!cfg || !cfg.active) return null;
    const rawPhone = phone || await phoneOf(db, subscriberId);
    const num = normalizePhone(rawPhone);
    const fullVars = { gym: s.gymName, name: name || '', ...vars };
    if (type === 'payment') {
      fullVars.remaining_line = render((Number(vars.remainingRaw) > 0 ? cfg.remainingLine : cfg.paidInFullLine), fullVars);
    }
    const text = render(cfg.template, fullVars);
    const ref = db.collection(COL_Q).doc(safeId(key));
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) return null;
      tx.set(ref, {
        type, key, subscriberId: subscriberId || null, name: name || '', phone: num, text,
        status: num ? 'pending' : 'skipped', error: num ? null : 'no_phone',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdDate: DateUtil.today(),
      });
      return ref.id;
    });
  }

  /* ── Event hooks (called by the Subscriptions module) ── */
  function onPayment(db, sub, paidNow) {
    if (!(Number(paidNow) > 0) || !sub) return Promise.resolve(null);
    const remaining = Math.max(0, (Number(sub.totalAmount) || 0) - (Number(sub.amountPaid) || 0));
    return enqueue(db, {
      type: 'payment', key: `payment_${sub.id || 'new'}_${Date.now()}`,
      subscriberId: sub.subscriberId, name: sub.subscriberName,
      vars: {
        sport: sub.sportName || '', months: sub.months || 1, start: fmtD(sub.startDate), end: fmtD(sub.endDate),
        paid_now: fmt$(paidNow), paid_total: fmt$(sub.amountPaid), total: fmt$(sub.totalAmount),
        remaining: fmt$(remaining), remainingRaw: remaining,
      },
    }).catch(e => { console.warn('WA payment enqueue failed', e); return null; });
  }

  function onRenewal(db, sub) {
    if (!sub) return Promise.resolve(null);
    return enqueue(db, {
      type: 'renewal', key: `renewal_${sub.id}`, subscriberId: sub.subscriberId, name: sub.subscriberName,
      vars: { sport: sub.sportName || '', months: sub.months || 1, start: fmtD(sub.startDate), end: fmtD(sub.endDate), amount: fmt$(sub.totalAmount) },
    }).catch(e => { console.warn('WA renewal enqueue failed', e); return null; });
  }

  /* ── Daily scan: expiring + unpaid ─────────────────── */
  let _scanning = null;
  function autoScan(db) {
    let last = ''; try { last = localStorage.getItem('venus_wa_scan') || ''; } catch (_) {}
    if (last === DateUtil.today()) return Promise.resolve(0);
    return getSettings(db).then(s => (s.sender.autoScan ? scan(db) : 0)).catch(() => 0);
  }

  function scan(db) {
    if (_scanning) return _scanning;
    _scanning = (async () => {
      const s = await getSettings(db, true);
      if (!s.types.expiring.active && !s.types.unpaid.active) return 0;
      const [subSnap, peopleSnap] = await Promise.all([
        db.collection(COL.SUBSCRIPTIONS).get(),
        db.collection(COL.SUBSCRIBERS).get(),
      ]);
      peopleSnap.docs.forEach(d => _phones.set(d.id, d.data().phone || ''));
      const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = DateUtil.today();
      let added = 0;

      if (s.types.expiring.active) {
        for (const x of subs) {
          if (x.frozen || x.renewedToId || !x.endDate || x.endDate < today) continue;
          if (!DateUtil.isExpiringSoon(x.endDate)) continue;
          // already renewed by hand (newer subscription for the same sport)?
          if (subs.some(o => o.id !== x.id && o.subscriberId === x.subscriberId && o.sportId === x.sportId && (o.endDate || '') > x.endDate)) continue;
          const id = await enqueue(db, {
            type: 'expiring', key: `expiring_${x.id}_${x.endDate}`, subscriberId: x.subscriberId, name: x.subscriberName,
            vars: { sport: x.sportName || '', start: fmtD(x.startDate), end: fmtD(x.endDate), days_left: Math.max(0, DateUtil.diffDays(x.endDate)), months: x.months || 1, amount: fmt$(x.totalAmount) },
          }).catch(() => null);
          if (id) added++;
        }
      }

      if (s.types.unpaid.active) {
        const every = Math.max(1, Number(s.sender.unpaidEveryDays) || 7);
        const bucket = Math.floor(Date.now() / 86400000 / every);
        const owed = new Map();
        subs.forEach(x => {
          const r = (Number(x.totalAmount) || 0) - (Number(x.amountPaid) || 0);
          if (!(r > 0) || !x.subscriberId) return;
          if (!owed.has(x.subscriberId)) owed.set(x.subscriberId, { name: x.subscriberName, items: [] });
          owed.get(x.subscriberId).items.push({ ...x, _r: r });
        });
        for (const [sid, o] of owed) {
          o.items.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
          const total = o.items.reduce((t, x) => t + x._r, 0);
          const list = o.items.map(x => `• ${x.sportName || ''} — ${fmtD(x.startDate)}: ${fmt$(x._r)}`).join('\n');
          const id = await enqueue(db, {
            type: 'unpaid', key: `unpaid_${sid}_${bucket}`, subscriberId: sid, name: o.name,
            vars: { count: o.items.length, total_owed: fmt$(total), list },
          }).catch(() => null);
          if (id) added++;
        }
      }
      try { localStorage.setItem('venus_wa_scan', today); } catch (_) {}
      return added;
    })().finally(() => { _scanning = null; });
    return _scanning;
  }

  /* ── Queue helpers for the sender/page ─────────────── */
  async function nextPending(db) {
    const snap = await db.collection(COL_Q).where('status', '==', 'pending').limit(100).get();
    const ts = d => d.createdAt?.toMillis?.() || 0;
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ts(a) - ts(b));
    return list[0] || null;
  }
  async function countSentToday(db) {
    const snap = await db.collection(COL_Q).where('sentDate', '==', DateUtil.today()).get();
    return snap.size;
  }
  function mark(db, id, data) { return db.collection(COL_Q).doc(id).update(data); }
  async function recoverInterrupted(db) {
    const snap = await db.collection(COL_Q).where('status', '==', 'sending').get();
    await Promise.all(snap.docs.map(d => d.ref.update({ status: 'failed', error: 'interrupted' })));
  }

  return { COL_Q, TYPES, PLACEHOLDERS, DEFAULTS, getSettings, invalidate, render, normalizePhone,
           enqueue, onPayment, onRenewal, scan, autoScan, nextPending, countSentToday, mark, recoverInterrupted };
})();

/* ═══════════════════════════════════════════════════ */
const WaSender = (() => {
  const L = WaI18n.t;
  let _running = false, _stop = false, _current = null, _nextAt = 0, _paused = '', _sentRun = 0, _failedRun = 0;
  const _subs = new Set();
  const emit = () => _subs.forEach(f => { try { f(); } catch (_) {} });

  /* bridge to the extension (content script relays window messages) */
  let _req = 0; const _wait = new Map();
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.source !== 'venus-ext') return;
    const d = e.data;
    if (d.replyTo && _wait.has('r' + d.replyTo)) { _wait.get('r' + d.replyTo)(d.resp); _wait.delete('r' + d.replyTo); }
    if (d.event && d.event.type === 'wa:result' && _wait.has('j' + d.event.jobId)) { _wait.get('j' + d.event.jobId)(d.event); _wait.delete('j' + d.event.jobId); }
  });
  const extVersion = () => document.documentElement.dataset.venusWa || '';
  function call(payload, timeout = 10000) {
    return new Promise(res => {
      const id = ++_req; _wait.set('r' + id, res);
      window.postMessage({ source: 'venus-app', id, payload }, '*');
      setTimeout(() => { if (_wait.has('r' + id)) { _wait.delete('r' + id); res({ ok: false, error: 'no_extension' }); } }, timeout);
    });
  }
  function waitResult(jobId, timeout) {
    return new Promise(res => {
      _wait.set('j' + jobId, res);
      setTimeout(() => { if (_wait.has('j' + jobId)) { _wait.delete('j' + jobId); res({ status: 'failed', error: 'timeout' }); } }, timeout);
    });
  }
  const ping = () => call({ type: 'wa:ping' }, 3000);
  const focusWa = () => call({ type: 'wa:focus' }, 3000);

  async function sendOne(item) {
    const jobId = `${item.id}_${Date.now()}`;
    const r = await call({ type: 'wa:send', jobId, phone: item.phone, text: item.text });
    if (!r || !r.ok) return { status: 'failed', error: (r && r.error) || 'no_extension' };
    return waitResult(jobId, 150000);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function pause(ms) {
    _nextAt = Date.now() + ms; emit();
    while (Date.now() < _nextAt && !_stop) await sleep(500);
    _nextAt = 0; emit();
  }

  async function start(db) {
    if (_running) return;
    if (!extVersion()) { Toast.error(L('ext_missing')); return; }
    _running = true; _stop = false; _paused = ''; _sentRun = 0; _failedRun = 0; emit();
    let fails = 0;
    try {
      await WaQueue.recoverInterrupted(db).catch(() => {});
      const s = await WaQueue.getSettings(db, true);
      let budget = s.sender.dailyLimit - await WaQueue.countSentToday(db);
      const minD = Math.max(5, Number(s.sender.minDelay) || 30), maxD = Math.max(minD, Number(s.sender.maxDelay) || 90);
      while (!_stop) {
        if (budget <= 0) { _paused = 'limit'; break; }
        const item = await WaQueue.nextPending(db);
        if (!item) { if (_sentRun || _failedRun) Toast.success(L('done_all')); break; }
        _current = item; emit();
        await WaQueue.mark(db, item.id, { status: 'sending' });
        const r = await sendOne(item);
        if (r.status === 'sent') {
          await WaQueue.mark(db, item.id, { status: 'sent', error: null, sentAt: firebase.firestore.FieldValue.serverTimestamp(), sentDate: DateUtil.today() });
          budget--; _sentRun++; fails = 0;
        } else if (r.status === 'not_logged_in') {
          await WaQueue.mark(db, item.id, { status: 'pending' });
          _paused = 'login'; break;
        } else if (r.status === 'invalid') {
          await WaQueue.mark(db, item.id, { status: 'failed', error: 'invalid_number' }); _failedRun++;
        } else {
          await WaQueue.mark(db, item.id, { status: 'failed', error: r.error || 'timeout' }); _failedRun++; fails++;
          if (r.error === 'no_extension') { _paused = 'ext'; break; }
          if (fails >= 3) { _paused = 'failures'; break; }
        }
        _current = null; emit();
        if (_stop) break;
        await pause((minD + Math.random() * (maxD - minD)) * 1000);
      }
    } catch (e) {
      console.error('WhatsApp sender stopped', e);
      Toast.error(App.t('error_generic'));
    } finally {
      _running = false; _current = null; _nextAt = 0; emit();
    }
  }
  function stop() { _stop = true; _nextAt = 0; emit(); }

  return {
    start, stop, ping, focusWa, extVersion,
    subscribe(f) { _subs.add(f); return () => _subs.delete(f); },
    get state() { return { running: _running, current: _current, nextAt: _nextAt, paused: _paused, sent: _sentRun, failed: _failedRun }; },
  };
})();

/* ═══════════════════════════════════════════════════ */
const WaPage = (() => {
  const L = WaI18n.t;
  let _db, _items = [], _tab = 'pending', _unsubSnap = null, _unsubSender = null, _tick = null, _waTab = false, _sentToday = 0, _limit = 40;
  const TYPE_ICON = { expiring: '⏳', unpaid: '💸', renewal: '🔁', payment: '✅' };

  async function render(db) {
    _db = db;
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">💬 ${L('title')}</h1>
          <p class="page-subtitle">${L('subtitle')}</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-outline" onclick="App.navigate('settings');setTimeout(()=>SettingsModule.switchTab('whatsapp'),60)">⚙️ ${L('settings')}</button>
        </div>
      </div>
      <div class="wa-status-row" id="wa-status-row"></div>
      <div class="wa-control" id="wa-control"></div>
      <div class="wa-install" id="wa-install"></div>
      <div class="wa-tabs" id="wa-tabs"></div>
      <div class="wa-list" id="wa-list"><div class="page-loader"><div class="spinner"></div></div></div>`;

    cleanup();
    _unsubSender = WaSender.subscribe(() => { renderControl(); renderStatus(); });
    _tick = setInterval(() => { if (!document.getElementById('wa-control')) return cleanup(); if (WaSender.state.nextAt) renderControl(); }, 1000);
    _unsubSnap = db.collection(WaQueue.COL_Q).orderBy('createdAt', 'desc').limit(400).onSnapshot(snap => {
      if (!document.getElementById('wa-list')) return cleanup();
      _items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _sentToday = _items.filter(x => x.sentDate === DateUtil.today()).length;
      renderStatus(); renderTabs(); renderList();
    }, () => {
      document.getElementById('wa-list').innerHTML = `<p style="color:var(--danger)">${App.t('failed_load_data')}</p>`;
    });

    WaQueue.getSettings(db).then(s => { _limit = s.sender.dailyLimit; renderStatus(); });
    renderControl(); renderInstall();
    refreshExt();
    WaQueue.autoScan(db).catch(() => {});
  }

  function cleanup() {
    if (_unsubSnap) { _unsubSnap(); _unsubSnap = null; }
    if (_unsubSender) { _unsubSender(); _unsubSender = null; }
    if (_tick) { clearInterval(_tick); _tick = null; }
  }

  async function refreshExt() {
    if (WaSender.extVersion()) { const r = await WaSender.ping(); _waTab = !!(r && r.waTab); }
    renderStatus(); renderInstall();
  }

  function renderStatus() {
    const el = document.getElementById('wa-status-row'); if (!el) return;
    const v = WaSender.extVersion();
    const pending = _items.filter(x => x.status === 'pending').length;
    el.innerHTML = `
      <div class="wa-stat ${v ? 'ok' : 'bad'}"><b>${v ? '🟢' : '🔴'} ${v ? L('ext_ok') : L('ext_missing')}</b><span>${v ? 'v' + v + ' · ' + (_waTab ? L('wa_tab_open') : L('wa_tab_closed')) : '—'}</span></div>
      <div class="wa-stat"><b>${_sentToday} / ${_limit}</b><span>${L('sent_today')}</span></div>
      <div class="wa-stat ${pending ? 'warn' : ''}"><b>${pending}</b><span>${L('pending_count')}</span></div>`;
  }

  function renderControl() {
    const el = document.getElementById('wa-control'); if (!el) return;
    const st = WaSender.state;
    let line = `<span class="text-muted">${L('idle')}</span>`;
    if (st.running && st.current) line = `<span class="wa-live"><span class="wa-live-dot"></span>${L('sending_to')} <b>${st.current.name || st.current.phone}</b>…</span>`;
    else if (st.running && st.nextAt) {
      const s = Math.max(0, Math.ceil((st.nextAt - Date.now()) / 1000));
      line = `<span class="wa-live">⏱ ${L('next_in')} <b>${s}${L('sec')}</b></span>`;
    }
    const paused = st.paused && !st.running
      ? `<div class="wa-paused">⚠️ ${L('paused_' + st.paused)}</div>` : '';
    const counters = (st.sent || st.failed) ? `<span class="wa-run-count">✅ ${st.sent} · ❌ ${st.failed}</span>` : '';
    el.innerHTML = `
      <div class="wa-control-bar">
        ${st.running
          ? `<button class="btn btn-danger" onclick="WaSender.stop()">⏹ ${L('stop')}</button>`
          : `<button class="btn btn-primary" onclick="WaPage.start()">▶ ${L('start')}</button>`}
        <button class="btn btn-outline" onclick="WaPage.scanNow(this)">🔍 ${L('scan')}</button>
        <button class="btn btn-ghost" onclick="WaSender.focusWa()" ${WaSender.extVersion() ? '' : 'disabled'}>🟩 ${L('open_wa')}</button>
        <div class="wa-control-line">${line} ${counters}</div>
      </div>
      ${paused}
      <div class="wa-tip">💡 ${L('tip')}</div>`;
  }

  function renderInstall() {
    const el = document.getElementById('wa-install'); if (!el) return;
    const v = WaSender.extVersion();
    el.innerHTML = `
      <details class="wa-install-box" ${v ? '' : 'open'}>
        <summary>🧩 ${L('install_title')}</summary>
        <ol>${[1, 2, 3, 4, 5].map(i => `<li>${L('install_' + i)}</li>`).join('')}</ol>
      </details>`;
  }

  function renderTabs() {
    const el = document.getElementById('wa-tabs'); if (!el) return;
    const c = s => _items.filter(x => (s === 'failed' ? (x.status === 'failed') : x.status === s) || (s === 'pending' && x.status === 'sending')).length;
    el.innerHTML = ['pending', 'sent', 'failed', 'skipped'].map(s =>
      `<button class="wa-tab ${_tab === s ? 'active' : ''}" onclick="WaPage.setTab('${s}')">${L('st_' + s)} <span>${c(s)}</span></button>`).join('');
  }

  function renderList() {
    const el = document.getElementById('wa-list'); if (!el) return;
    const list = _items.filter(x => x.status === _tab || (_tab === 'pending' && x.status === 'sending'));
    if (!list.length) { el.innerHTML = `<p class="text-muted" style="padding:24px 4px">${L('empty')}</p>`; return; }
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = list.map(x => {
      const err = x.error ? `<span class="wa-err">${L('err_' + x.error) !== 'err_' + x.error ? L('err_' + x.error) : esc(x.error)}</span>` : '';
      const when = x.sentAt?.toDate?.() || x.createdAt?.toDate?.();
      const manual = x.phone ? `<a class="btn btn-ghost btn-sm" target="_blank" href="https://wa.me/${x.phone}?text=${encodeURIComponent(x.text || '')}">💬 ${L('manual')}</a>` : '';
      const actions = {
        pending: `<button class="btn btn-outline btn-sm" onclick="WaPage.edit('${x.id}')">✏️ ${L('edit')}</button>
                  <button class="btn btn-ghost btn-sm" onclick="WaPage.setStatus('${x.id}','skipped')">⤼ ${L('skip')}</button>
                  ${manual}
                  ${x.phone ? `<button class="btn btn-ghost btn-sm" onclick="WaPage.markSent('${x.id}')">✔ ${L('mark_sent')}</button>` : ''}`,
        sending: '',
        sent: '',
        failed: `<button class="btn btn-outline btn-sm" onclick="WaPage.setStatus('${x.id}','pending')">↻ ${L('retry')}</button>${manual}`,
        skipped: `${x.phone ? `<button class="btn btn-outline btn-sm" onclick="WaPage.setStatus('${x.id}','pending')">↻ ${L('retry')}</button>` : ''}${manual}`,
      }[x.status] || '';
      return `
        <div class="wa-item wa-${x.status}">
          <div class="wa-item-head">
            <span class="wa-type wa-type-${x.type}">${TYPE_ICON[x.type] || '💬'} ${L('type_' + x.type)}</span>
            <b class="wa-name">${esc(x.name) || '—'}</b>
            <span class="wa-phone">${x.phone ? '+' + x.phone : ''}</span>
            <span class="wa-when">${when ? DateUtil.timeAgo(when.getTime()) : ''}</span>
            ${x.status === 'sending' ? `<span class="wa-sending">⏳ ${L('st_sending')}</span>` : ''}
            ${err}
          </div>
          <div class="wa-text" dir="auto">${esc(x.text).replace(/\n/g, '<br>')}</div>
          <div class="wa-actions">${actions}<button class="btn btn-ghost btn-sm wa-del" title="${L('del')}" onclick="WaPage.remove('${x.id}')">🗑</button></div>
        </div>`;
    }).join('');
  }

  function setTab(t) { _tab = t; renderTabs(); renderList(); }
  function start() { WaSender.start(_db).then(refreshExt); }
  async function scanNow(btn) {
    try { localStorage.removeItem('venus_wa_scan'); } catch (_) {}
    const n = await WaQueue.scan(_db).catch(() => 0);
    Toast.info(n ? `${n} ${L('scan_done')}` : L('scan_none'));
  }
  function setStatus(id, status) { return WaQueue.mark(_db, id, { status, error: null }); }
  function markSent(id) { return WaQueue.mark(_db, id, { status: 'sent', error: null, sentAt: firebase.firestore.FieldValue.serverTimestamp(), sentDate: DateUtil.today() }); }
  function remove(id) { return _db.collection(WaQueue.COL_Q).doc(id).delete(); }

  function edit(id) {
    const x = _items.find(i => i.id === id); if (!x) return;
    document.getElementById('modal-wa-edit')?.remove();
    const el = document.createElement('div');
    el.className = 'modal-overlay'; el.id = 'modal-wa-edit';
    el.innerHTML = `
      <div class="modal">
        <div class="modal-header"><span class="modal-title">✏️ ${L('edit_title')} — ${x.name || ''}</span>
          <button class="modal-close" onclick="Modal.close('modal-wa-edit')">✕</button></div>
        <div class="modal-body"><textarea class="form-textarea wa-edit-text" dir="auto" id="wa-edit-text" rows="8"></textarea></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-wa-edit')">${L('cancel')}</button>
          <button class="btn btn-primary" id="wa-edit-save">💾 ${L('save')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#wa-edit-text').value = x.text || '';
    el.querySelector('#wa-edit-save').addEventListener('click', async () => {
      await WaQueue.mark(_db, id, { text: el.querySelector('#wa-edit-text').value });
      Modal.close('modal-wa-edit');
    });
    Modal.open('modal-wa-edit');
  }

  return { render, setTab, start, scanNow, setStatus, markSent, remove, edit };
})();

/* ═══════════════════════════════════════════════════ */
const WaSettings = (() => {
  const L = WaI18n.t;
  let _db, _s;
  const SAMPLE = {
    name: 'أحمد', sport: 'Calisthenics', start: '1 Oct 2026', end: '1 Nov 2026', days_left: 5, months: 1, amount: '$35.00',
    count: 2, total_owed: '$70.00', list: '• Calisthenics — 1 Sep 2026: $35.00\n• Calisthenics — 1 Oct 2026: $35.00',
    paid_now: '$20.00', paid_total: '$20.00', total: '$35.00', remaining: '$15.00',
  };

  async function render(container, db) {
    _db = db;
    _s = await WaQueue.getSettings(db, true);
    const snd = _s.sender;
    container.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-title">📤 ${L('s_sender')}</div>
        <div class="wa-set-grid">
          <div class="form-group"><label class="form-label">${L('s_daily')}</label><input class="form-input" type="number" min="1" max="500" id="was-daily" value="${snd.dailyLimit}"></div>
          <div class="form-group"><label class="form-label">${L('s_min')}</label><input class="form-input" type="number" min="5" max="600" id="was-min" value="${snd.minDelay}"></div>
          <div class="form-group"><label class="form-label">${L('s_max')}</label><input class="form-input" type="number" min="5" max="900" id="was-max" value="${snd.maxDelay}"></div>
          <div class="form-group"><label class="form-label">${L('s_unpaid_every')}</label><input class="form-input" type="number" min="1" max="60" id="was-every" value="${snd.unpaidEveryDays}"></div>
        </div>
        <label class="form-check"><input type="checkbox" id="was-autoscan" ${snd.autoScan ? 'checked' : ''}><span class="form-check-label">${L('s_autoscan')}</span></label>
      </div>
      <div class="settings-card">
        <div class="settings-card-title">💬 ${L('s_types')}</div>
        ${WaQueue.TYPES.map(typeCard).join('')}
        <button class="btn btn-primary" onclick="WaSettings.save()">💾 ${App.t('save')}</button>
      </div>`;
    WaQueue.TYPES.forEach(k => { syncCard(k); preview(k); });
  }

  function typeCard(k) {
    const c = _s.types[k];
    const chips = WaQueue.PLACEHOLDERS[k].map(p => `<button type="button" class="wa-chip" title="${L('ph_' + p)}" onclick="WaSettings.insert('${k}','{${p}}')">{${p}}</button>`).join('');
    const extra = k === 'payment' ? `
      <div class="wa-set-grid two">
        <div class="form-group"><label class="form-label">${L('s_remaining_line')}</label><input class="form-input" dir="auto" id="wat-${k}-rem" value="${(c.remainingLine || '').replace(/"/g, '&quot;')}" oninput="WaSettings.preview('${k}')" onfocus="WaSettings.focus(this)"></div>
        <div class="form-group"><label class="form-label">${L('s_paid_line')}</label><input class="form-input" dir="auto" id="wat-${k}-full" value="${(c.paidInFullLine || '').replace(/"/g, '&quot;')}" oninput="WaSettings.preview('${k}')" onfocus="WaSettings.focus(this)"></div>
      </div>` : '';
    return `
      <div class="wa-type-card" id="wat-card-${k}">
        <div class="wa-type-head">
          <label class="wa-switch"><input type="checkbox" id="wat-${k}-on" ${c.active ? 'checked' : ''} onchange="WaSettings.sync('${k}')"><span></span></label>
          <div>
            <div class="wa-type-title">${L('type_' + k)} <span class="wa-type-state" id="wat-${k}-state"></span></div>
            <div class="wa-type-desc">${L('desc_' + k)}</div>
          </div>
        </div>
        <div class="wa-type-body">
          <label class="form-label">${L('s_template')}</label>
          <textarea class="form-textarea" dir="auto" rows="5" id="wat-${k}-tpl" oninput="WaSettings.preview('${k}')" onfocus="WaSettings.focus(this)"></textarea>
          ${extra}
          <div class="wa-chips"><span>${L('s_placeholders')}</span>${chips}</div>
          <div class="wa-preview"><div class="wa-preview-label">${L('s_preview')}</div><div class="wa-bubble" dir="auto" id="wat-${k}-prev"></div></div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="WaSettings.reset('${k}')">↺ ${L('s_reset')}</button>
        </div>
      </div>`;
  }

  let _focused = null;
  function focus(el) { _focused = el; }

  function syncCard(k) {
    const on = document.getElementById(`wat-${k}-on`)?.checked;
    document.getElementById(`wat-card-${k}`)?.classList.toggle('is-off', !on);
    const st = document.getElementById(`wat-${k}-state`); if (st) st.textContent = on ? L('s_active') : L('s_inactive');
    const ta = document.getElementById(`wat-${k}-tpl`); if (ta && !ta.dataset.init) { ta.value = _s.types[k].template || ''; ta.dataset.init = '1'; }
  }

  function preview(k) {
    const ta = document.getElementById(`wat-${k}-tpl`); const out = document.getElementById(`wat-${k}-prev`);
    if (!ta || !out) return;
    const vars = { ...SAMPLE, gym: _s.gymName };
    if (k === 'payment') vars.remaining_line = WaQueue.render(document.getElementById(`wat-${k}-rem`).value, vars);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    out.innerHTML = esc(WaQueue.render(ta.value, vars)).replace(/\n/g, '<br>');
  }

  function insert(k, token) {
    const target = (_focused && _focused.id && _focused.id.startsWith(`wat-${k}-`)) ? _focused : document.getElementById(`wat-${k}-tpl`);
    const s = target.selectionStart ?? target.value.length, e = target.selectionEnd ?? s;
    target.value = target.value.slice(0, s) + token + target.value.slice(e);
    target.focus(); target.selectionStart = target.selectionEnd = s + token.length;
    preview(k);
  }

  function reset(k) {
    const d = WaQueue.DEFAULTS.types[k];
    document.getElementById(`wat-${k}-tpl`).value = d.template;
    if (k === 'payment') { document.getElementById(`wat-${k}-rem`).value = d.remainingLine; document.getElementById(`wat-${k}-full`).value = d.paidInFullLine; }
    preview(k);
  }

  async function save() {
    const num = (id, def, min, max) => { const v = Math.round(Number(document.getElementById(id)?.value)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
    const minD = num('was-min', 30, 5, 600), maxD = Math.max(minD, num('was-max', 90, 5, 900));
    const waSettings = {
      sender: { dailyLimit: num('was-daily', 40, 1, 500), minDelay: minD, maxDelay: maxD, unpaidEveryDays: num('was-every', 7, 1, 60), autoScan: !!document.getElementById('was-autoscan')?.checked },
      types: {},
    };
    WaQueue.TYPES.forEach(k => {
      waSettings.types[k] = { active: !!document.getElementById(`wat-${k}-on`)?.checked, template: document.getElementById(`wat-${k}-tpl`)?.value || '' };
      if (k === 'payment') { waSettings.types[k].remainingLine = document.getElementById(`wat-${k}-rem`).value; waSettings.types[k].paidInFullLine = document.getElementById(`wat-${k}-full`).value; }
    });
    try {
      await _db.collection(COL.SETTINGS).doc('global').set({ waSettings, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      WaQueue.invalidate();
      Toast.success(L('s_saved'));
    } catch (e) { Toast.error(App.t('error_generic')); }
  }

  return { render, save, sync: syncCard, preview, insert, reset, focus };
})();
