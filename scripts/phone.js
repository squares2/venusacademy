// ═══════════════════════════════════════════════════
//  VENUS GYM — International phone input (flags + dial codes)
//  Any <input data-phone> is upgraded automatically: a country picker
//  (Lebanon by default) + a number box. The original input stays in the
//  form (hidden) and its .value is always the full number, e.g.
//  "+961 70123456" — so existing form code keeps working unchanged.
//  Setting .value (e.g. when editing) fills the picker back in.
// ═══════════════════════════════════════════════════
const PhoneInput = (() => {
  const DEFAULT = 'LB';
  // ISO + dial code; position = cell in assets/flags.webp (16 columns, 48×36 each)
  const RAW = 'AD376,AE971,AF93,AG1,AI1,AL355,AM374,AO244,AR54,AS1,AT43,AU61,AW297,AX358,AZ994,BA387,BB1,BD880,BE32,BF226,BG359,BH973,BI257,BJ229,BL590,BM1,BN673,BO591,BQ599,BR55,BS1,BT975,BW267,BY375,BZ501,CA1,CC61,CD243,CF236,CG242,CH41,CI225,CK682,CL56,CM237,CN86,CO57,CR506,CU53,CV238,CW599,CX61,CY357,CZ420,DE49,DJ253,DK45,DM1,DO1,DZ213,EC593,EE372,EG20,EH212,ER291,ES34,ET251,FI358,FJ679,FK500,FM691,FO298,FR33,GA241,GB44,GD1,GE995,GF594,GG44,GH233,GI350,GL299,GM220,GN224,GP590,GQ240,GR30,GT502,GU1,GW245,GY592,HK852,HN504,HR385,HT509,HU36,ID62,IE353,IL972,IM44,IN91,IO246,IQ964,IR98,IS354,IT39,JE44,JM1,JO962,JP81,KE254,KG996,KH855,KI686,KM269,KN1,KP850,KR82,KW965,KY1,KZ7,LA856,LB961,LC1,LI423,LK94,LR231,LS266,LT370,LU352,LV371,LY218,MA212,MC377,MD373,ME382,MF590,MG261,MH692,MK389,ML223,MM95,MN976,MO853,MP1,MQ596,MR222,MS1,MT356,MU230,MV960,MW265,MX52,MY60,MZ258,NA264,NC687,NE227,NF672,NG234,NI505,NL31,NO47,NP977,NR674,NU683,NZ64,OM968,PA507,PE51,PF689,PG675,PH63,PK92,PL48,PM508,PR1,PS970,PT351,PW680,PY595,QA974,RE262,RO40,RS381,RU7,RW250,SA966,SB677,SC248,SD249,SE46,SG65,SH290,SI386,SJ47,SK421,SL232,SM378,SN221,SO252,SR597,SS211,ST239,SV503,SX1,SY963,SZ268,TC1,TD235,TG228,TH66,TJ992,TK690,TL670,TM993,TN216,TO676,TR90,TT1,TV688,TW886,TZ255,UA380,UG256,US1,UY598,UZ998,VA39,VC1,VE58,VG1,VI1,VN84,VU678,WF681,WS685,XK383,YE967,YT262,ZA27,ZM260,ZW263';
  const MAIN = {"1":"US","7":"RU","20":"EG","27":"ZA","30":"GR","31":"NL","32":"BE","33":"FR","34":"ES","36":"HU","39":"IT","40":"RO","41":"CH","43":"AT","44":"GB","45":"DK","46":"SE","47":"NO","48":"PL","49":"DE","51":"PE","52":"MX","53":"CU","54":"AR","55":"BR","56":"CL","57":"CO","58":"VE","60":"MY","61":"AU","62":"ID","63":"PH","64":"NZ","65":"SG","66":"TH","81":"JP","82":"KR","84":"VN","86":"CN","90":"TR","91":"IN","92":"PK","93":"AF","94":"LK","95":"MM","98":"IR","211":"SS","212":"MA","213":"DZ","216":"TN","218":"LY","220":"GM","221":"SN","222":"MR","223":"ML","224":"GN","225":"CI","226":"BF","227":"NE","228":"TG","229":"BJ","230":"MU","231":"LR","232":"SL","233":"GH","234":"NG","235":"TD","236":"CF","237":"CM","238":"CV","239":"ST","240":"GQ","241":"GA","242":"CG","243":"CD","244":"AO","245":"GW","246":"IO","247":"AC","248":"SC","249":"SD","250":"RW","251":"ET","252":"SO","253":"DJ","254":"KE","255":"TZ","256":"UG","257":"BI","258":"MZ","260":"ZM","261":"MG","262":"RE","263":"ZW","264":"NA","265":"MW","266":"LS","267":"BW","268":"SZ","269":"KM","290":"SH","291":"ER","297":"AW","298":"FO","299":"GL","350":"GI","351":"PT","352":"LU","353":"IE","354":"IS","355":"AL","356":"MT","357":"CY","358":"FI","359":"BG","370":"LT","371":"LV","372":"EE","373":"MD","374":"AM","375":"BY","376":"AD","377":"MC","378":"SM","380":"UA","381":"RS","382":"ME","383":"XK","385":"HR","386":"SI","387":"BA","389":"MK","420":"CZ","421":"SK","423":"LI","500":"FK","501":"BZ","502":"GT","503":"SV","504":"HN","505":"NI","506":"CR","507":"PA","508":"PM","509":"HT","590":"GP","591":"BO","592":"GY","593":"EC","594":"GF","595":"PY","596":"MQ","597":"SR","598":"UY","599":"CW","670":"TL","672":"NF","673":"BN","674":"NR","675":"PG","676":"TO","677":"SB","678":"VU","679":"FJ","680":"PW","681":"WF","682":"CK","683":"NU","685":"WS","686":"KI","687":"NC","688":"TV","689":"PF","690":"TK","691":"FM","692":"MH","850":"KP","852":"HK","853":"MO","855":"KH","856":"LA","880":"BD","886":"TW","960":"MV","961":"LB","962":"JO","963":"SY","964":"IQ","965":"KW","966":"SA","967":"YE","968":"OM","970":"PS","971":"AE","972":"IL","973":"BH","974":"QA","975":"BT","976":"MN","977":"NP","992":"TJ","993":"TM","994":"AZ","995":"GE","996":"KG","998":"UZ"}; // dial code → main country (e.g. 1 → US, 44 → GB)
  const PINNED = ['LB','SY','JO','IQ','PS','EG','SA','AE','QA','KW','BH','OM','TR','CY','FR','DE','GB','US','CA','AU','BR','CI','SN','NG','GH'];
  const KEEP_ZERO = new Set(['IT','SM','VA']); // national numbers that keep their leading 0
  const COLS = 16;

  const LIST = RAW.split(',').map((s, i) => ({ iso: s.slice(0, 2), dial: s.slice(2), idx: i }));
  const BY_ISO = Object.fromEntries(LIST.map(c => [c.iso, c]));
  const _names = {};
  function nameOf(iso, forced) {
    const lang = forced || ((typeof App !== 'undefined' && App.lang === 'ar') ? 'ar' : 'en');
    const k = lang + iso;
    if (!(k in _names)) { try { _names[k] = new Intl.DisplayNames([lang], { type: 'region' }).of(iso) || iso; } catch (_) { _names[k] = iso; } }
    return _names[k];
  }
  const L = k => {
    const ar = typeof App !== 'undefined' && App.lang === 'ar';
    return ({ search: ar ? 'ابحث عن دولة أو رمز…' : 'Search country or code…', none: ar ? 'لا توجد نتائج' : 'No match',
              number: ar ? 'رقم الهاتف' : 'Phone number', pick: ar ? 'اختر الدولة' : 'Choose country' })[k];
  };
  const flagHTML = (iso, cls = 'pi-flag') => {
    const c = BY_ISO[iso] || BY_ISO[DEFAULT];
    const x = (c.idx % COLS), y = Math.floor(c.idx / COLS);
    return `<span class="${cls}" style="background-position:${x * 100 / (COLS - 1)}% ${y * 100 / (Math.ceil(LIST.length / COLS) - 1)}%" aria-hidden="true"></span>`;
  };

  /* ── parse / format ── */
  function parse(raw) {
    const s = String(raw || '').trim();
    if (!s) return { iso: DEFAULT, national: '' };
    let d = s.replace(/\D/g, '');
    const intl = s.startsWith('+') || d.startsWith('00');
    if (d.startsWith('00')) d = d.slice(2);
    if (intl || (d.startsWith('961') && d.length >= 10)) {
      for (let n = 3; n >= 1; n--) {
        const code = d.slice(0, n), iso = MAIN[code];
        if (iso && BY_ISO[iso]) return { iso, national: d.slice(n) };
      }
    }
    return { iso: DEFAULT, national: d.replace(/^0+/, '') }; // a local Lebanese number
  }
  function format(iso, national) {
    const c = BY_ISO[iso] || BY_ISO[DEFAULT];
    let n = String(national || '').replace(/\D/g, '');
    if (!KEEP_ZERO.has(c.iso)) n = n.replace(/^0+/, '');
    return n ? `+${c.dial} ${n}` : '';
  }
  // 76884643 → 768 846 43 (groups of 3, never a lonely last digit)
  function _group3(n) {
    const g = n.match(/\d{1,3}/g) || [];
    if (g.length > 1 && g[g.length - 1].length === 1) { const last = g.pop(); g[g.length - 1] = g[g.length - 1].slice(0, -1) + ' ' + g[g.length - 1].slice(-1) + last; return g.join(' ').replace(/ (\d) (\d+)$/, ' $1$2'); }
    return g.join(' ');
  }
  // "+961 70123456" → "+961 70 123 456" for display
  function pretty(raw) {
    const p = parse(raw); if (!p.national) return String(raw || '');
    const c = BY_ISO[p.iso];
    const n = p.iso === 'LB' ? p.national.replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1 $2 $3') : _group3(p.national);
    return `+${c.dial} ${n}`;
  }

  /* ── upgrade one input ── */
  function enhance(input) {
    if (!input || input._pi) return;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    const state = { iso: DEFAULT };
    const wrap = document.createElement('div');
    wrap.className = 'pi-field'; wrap.dir = 'ltr';
    if (input.style.cssText) wrap.style.cssText = input.style.cssText;
    wrap.innerHTML = `
      <button type="button" class="pi-country" title="${L('pick')}" aria-haspopup="listbox"></button>
      <input class="pi-number" type="tel" inputmode="tel" autocomplete="tel-national">`;
    const btn = wrap.querySelector('.pi-country'), num = wrap.querySelector('.pi-number');
    if (input.disabled) { btn.disabled = true; num.disabled = true; }
    input.parentNode.insertBefore(wrap, input);
    input.type = 'hidden';
    input._pi = { wrap, btn, num, state };

    const paint = () => {
      const c = BY_ISO[state.iso];
      btn.innerHTML = `${flagHTML(state.iso)}<span class="pi-dial">+${c.dial}</span><span class="pi-caret">▾</span>`;
      btn.setAttribute('aria-label', `${nameOf(state.iso)} +${c.dial}`);
      num.placeholder = state.iso === 'LB' ? '70 123 456' : L('number');
    };
    const setFrom = raw => { const p = parse(raw); state.iso = p.iso; num.value = p.national; paint(); };

    // the hidden input's .value is the full international number
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() { return format(state.iso, num.value); },
      set(v) { setFrom(v); proto.set.call(this, format(state.iso, num.value)); },
    });
    const fire = () => { proto.set.call(input, input.value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); };

    num.addEventListener('input', () => {
      const v = num.value;
      if (/^\s*(\+|00)/.test(v)) { // pasted / typed an international number → switch country
        const p = parse(v); if (p.national || v.replace(/\D/g, '').length > 3) { state.iso = p.iso; num.value = p.national; paint(); }
      } else {
        const clean = v.replace(/[^\d\s\-()]/g, ''); if (clean !== v) num.value = clean;
      }
      if (input.classList.contains('error')) { input.classList.remove('error'); const m = input.parentElement?.querySelector('.form-error-msg'); if (m) m.textContent = ''; }
      fire();
    });
    btn.addEventListener('click', e => { e.preventDefault(); open(input); });
    num.addEventListener('focus', () => wrap.classList.add('focus'));
    num.addEventListener('blur', () => wrap.classList.remove('focus'));

    setFrom(input.getAttribute('value') || proto.get.call(input) || '');
    if (input.placeholder && /\d/.test(input.placeholder) === false) num.placeholder = input.placeholder;
  }

  /* ── country dropdown (one shared panel, attached to <body> so modals never clip it) ── */
  let _panel = null, _for = null, _hi = 0, _items = [];
  function _ensurePanel() {
    if (_panel) return _panel;
    _panel = document.createElement('div');
    _panel.className = 'pi-panel'; _panel.hidden = true;
    _panel.innerHTML = `<div class="pi-search-wrap"><span>🔍</span><input class="pi-search" type="text" autocomplete="off"></div><div class="pi-list" role="listbox"></div>`;
    document.body.appendChild(_panel);
    const s = _panel.querySelector('.pi-search');
    s.addEventListener('input', () => { _hi = 0; _renderList(s.value); });
    s.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); _move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (_items[_hi]) _choose(_items[_hi]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    });
    _panel.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the search box
    _panel.addEventListener('click', e => { const it = e.target.closest('.pi-item'); if (it) _choose(it.dataset.iso); });
    document.addEventListener('mousedown', e => { if (!_panel.hidden && !_panel.contains(e.target) && !e.target.closest('.pi-country')) close(); }, true);
    window.addEventListener('resize', () => close());
    document.addEventListener('scroll', e => { if (!_panel.hidden && !_panel.contains(e.target)) _place(); }, true);
    return _panel;
  }
  function _place() {
    if (!_for) return;
    const r = _for._pi.wrap.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(320, vw - 16);
    let left = Math.min(Math.max(8, r.left), vw - w - 8);
    const below = vh - r.bottom, h = Math.min(340, Math.max(below, r.top) - 12);
    _panel.style.width = w + 'px'; _panel.style.left = left + 'px';
    _panel.style.maxHeight = Math.max(180, h) + 'px';
    if (below >= 220 || below >= r.top) { _panel.style.top = (r.bottom + 6) + 'px'; _panel.style.bottom = 'auto'; }
    else { _panel.style.bottom = (vh - r.top + 6) + 'px'; _panel.style.top = 'auto'; }
  }
  function _renderList(q) {
    q = (q || '').trim().toLowerCase().replace(/^\+/, '');
    const cur = _for?._pi.state.iso;
    const match = c => !q || c.iso.toLowerCase() === q || c.dial.startsWith(q) || nameOf(c.iso, 'en').toLowerCase().includes(q) || nameOf(c.iso, 'ar').includes(q);
    const sortByName = (a, b) => nameOf(a.iso).localeCompare(nameOf(b.iso), (typeof App !== 'undefined' && App.lang === 'ar') ? 'ar' : 'en');
    const pinned = q ? [] : PINNED.map(i => BY_ISO[i]).filter(Boolean);
    const rest = LIST.filter(c => match(c) && (q || !PINNED.includes(c.iso))).sort(sortByName);
    _items = [...pinned, ...rest].map(c => c.iso);
    const row = c => `<div class="pi-item${c.iso === cur ? ' sel' : ''}" role="option" data-iso="${c.iso}">${flagHTML(c.iso)}<span class="pi-name">${nameOf(c.iso)}</span><span class="pi-code">+${c.dial}</span></div>`;
    const list = _panel.querySelector('.pi-list');
    list.innerHTML = _items.length ? (pinned.map(row).join('') + (pinned.length ? '<div class="pi-sep"></div>' : '') + rest.map(row).join('')) : `<div class="pi-empty">${L('none')}</div>`;
    _hilite();
  }
  function _hilite() {
    _panel.querySelectorAll('.pi-item').forEach(el => el.classList.toggle('hi', el.dataset.iso === _items[_hi]));
    _panel.querySelector('.pi-item.hi')?.scrollIntoView({ block: 'nearest' });
  }
  function _move(d) { if (!_items.length) return; _hi = (_hi + d + _items.length) % _items.length; _hilite(); }
  function _choose(iso) {
    const inp = _for; if (!inp) return;
    inp._pi.state.iso = iso;
    inp.value = format(iso, inp._pi.num.value); // repaints through the setter
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    close(); inp._pi.num.focus();
  }
  function open(input) {
    _ensurePanel();
    if (!_panel.hidden && _for === input) { close(); return; }
    _for = input; _panel.hidden = false; input._pi.wrap.classList.add('open');
    const s = _panel.querySelector('.pi-search'); s.value = ''; s.placeholder = L('search');
    _renderList('');
    _hi = Math.max(0, _items.indexOf(input._pi.state.iso));
    _hilite(); _place();
    setTimeout(() => s.focus(), 0);
  }
  function close(refocus) {
    if (!_panel || _panel.hidden) return;
    _panel.hidden = true;
    const f = _for; _for = null;
    if (f) { f._pi.wrap.classList.remove('open'); if (refocus) f._pi.num.focus(); }
  }

  /* ── auto-upgrade every <input data-phone> as pages / modals render ── */
  function scan(root = document) { root.querySelectorAll?.('input[data-phone]').forEach(enhance); }
  function start() {
    scan();
    new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches?.('input[data-phone]')) enhance(n); else if (n.querySelector?.('input[data-phone]')) scan(n);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* ── showing a phone: flag + spaced number, always left-to-right on one line ── */
  const _escH = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function display(raw, opts = {}) {
    const s = String(raw || '').trim();
    if (!s) return opts.empty ?? '';
    if ((s.match(/\d/g) || []).length < 5) return _escH(s); // not really a phone (free text) → show as typed
    const p = parse(s);
    return `<span class="pi-view${opts.small ? ' sm' : ''}" dir="ltr" title="${_escH(nameOf(p.iso))}">${flagHTML(p.iso)}<span class="pi-view-num">${_escH(pretty(s))}</span></span>`;
  }
  // phone search that ignores spaces, "+961" and a leading 0 (so "03 434 267", "3434267", "+9613434267" all match)
  function matches(raw, q) {
    const qd = String(q || '').replace(/\D/g, ''); if (qd.length < 2) return false;
    const pd = String(raw || '').replace(/\D/g, ''); if (!pd) return false;
    const p = parse(raw), nat = p.national, full = (BY_ISO[p.iso]?.dial || '') + nat;
    const q0 = qd.replace(/^0+/, '');
    return pd.includes(qd) || nat.includes(q0) || full.includes(qd.replace(/^00/, ''));
  }
  // digits for wa.me (handles old local Lebanese numbers like "70123456")
  function waDigits(raw) { const p = parse(raw); return p.national ? (BY_ISO[p.iso].dial + p.national.replace(KEEP_ZERO.has(p.iso) ? /^$/ : /^0+/, '')) : ''; }

  return { enhance, scan, parse, format, pretty, display, matches, waDigits, nameOf, LIST };
})();
