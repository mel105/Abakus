'use strict';
/* ===================== ABAKUS – rozhranie ===================== */
const C = CORE, VERZIA = '1.2';
const F = {};
const $ = function (s, r) { return (r || document).querySelector(s); };
function h(tag, attrs, kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k];
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { if (c != null) el.append(c); });
  return el;
}
function store(k, v) { try { if (v === undefined) { const s = localStorage.getItem('abakus.' + k); return s == null ? null : JSON.parse(s); } localStorage.setItem('abakus.' + k, JSON.stringify(v)); } catch (e) { } return null; }
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1400); }
function copy(text) {
  text = String(text);
  const done = function () { toast('Skopírované: ' + (text.length > 42 ? text.slice(0, 40) + '…' : text)); };
  const legacy = function () { const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0;left:0' }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Kopírovanie zlyhalo'); } ta.remove(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, legacy); else legacy();
}
function download(canvas, name) {
  canvas.toBlob(function (b) { const a = h('a', { href: URL.createObjectURL(b), download: name }); document.body.append(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Uložené: ' + name); }, 'image/png');
}
function downloadText(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })), download: name }); document.body.append(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Uložené: ' + name);
}
const SVGNS = 'http://www.w3.org/2000/svg';
/* malý graf: o = {x, y, line, red: [indexy], fit: {icpt, slope}, hline, bars: [počty], title} */
function miniChart(o) {
  const W = 400, H = 180, pl = 62, pr = 10, pt = 22, pb = 22, svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'plot mini'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', o.title);
  const ext = function (a) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < a.length; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; } if (!(hi > lo)) { const d = Math.abs(lo) * 0.01 || 1; lo -= d; hi += d; } return [lo, hi]; };
  const ex = ext(o.x), ey = o.bars ? [0, Math.max.apply(null, o.bars)] : ext(o.y), my = o.bars ? 0 : (ey[1] - ey[0]) * 0.06, y0 = ey[0] - my, y1 = ey[1] + my;
  const X = function (v) { return pl + (v - ex[0]) / (ex[1] - ex[0]) * (W - pl - pr); }, Y = function (v) { return pt + (y1 - v) / (y1 - y0) * (H - pt - pb); };
  let g = '<text class="tt" x="' + pl + '" y="14">' + o.title + '</text><rect class="fr" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (H - pt - pb) + '"/>';
  g += '<text class="tk" text-anchor="end" x="' + (pl - 5) + '" y="' + (Y(ey[1]) + 4) + '">' + C.fmt(ey[1], 6) + '</text><text class="tk" text-anchor="end" x="' + (pl - 5) + '" y="' + (Y(ey[0]) + 4) + '">' + C.fmt(ey[0], 6) + '</text>';
  g += '<text class="tk" x="' + pl + '" y="' + (H - 6) + '">' + C.fmt(ex[0], 6) + '</text><text class="tk" text-anchor="end" x="' + (W - pr) + '" y="' + (H - 6) + '">' + C.fmt(ex[1], 6) + '</text>';
  if (o.bars) { const bw = (W - pl - pr) / o.bars.length; o.bars.forEach(function (c, i) { if (c) g += '<rect class="bar" x="' + (pl + i * bw + 0.5).toFixed(1) + '" y="' + Y(c).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + (Y(0) - Y(c)).toFixed(1) + '"/>'; }); }
  else {
    const n = o.x.length, step = Math.max(1, Math.ceil(n / 3000));
    if (o.hline != null) g += '<line class="med" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(o.hline).toFixed(1) + '" y2="' + Y(o.hline).toFixed(1) + '"/>';
    if (o.line) { let d = ''; for (let i = 0; i < n; i += step) d += (d ? 'L' : 'M') + X(o.x[i]).toFixed(1) + ' ' + Y(o.y[i]).toFixed(1); g += '<path class="ser" d="' + d + '"/>'; }
    if (!o.line || n <= 400) for (let i = 0; i < n; i += step) g += '<circle class="dot" cx="' + X(o.x[i]).toFixed(1) + '" cy="' + Y(o.y[i]).toFixed(1) + '" r="' + (n > 300 ? 1.3 : 2.2) + '"/>';
    if (o.fit) g += '<line class="fit" x1="' + X(ex[0]) + '" y1="' + Y(o.fit.icpt + o.fit.slope * ex[0]).toFixed(1) + '" x2="' + X(ex[1]) + '" y2="' + Y(o.fit.icpt + o.fit.slope * ex[1]).toFixed(1) + '"/>';
    (o.red || []).forEach(function (i) { g += '<circle class="out" cx="' + X(o.x[i]).toFixed(1) + '" cy="' + Y(o.y[i]).toFixed(1) + '" r="3.6"/>'; });
  }
  svg.innerHTML = g; return svg;
}
function histBins(x) { const n = x.length, k = Math.max(5, Math.min(40, Math.ceil(Math.sqrt(n)))), s = C.stats(x), w = (s.max - s.min) / k || 1, b = new Array(k).fill(0); x.forEach(function (v) { b[Math.min(k - 1, Math.floor((v - s.min) / w))]++; }); return b; }
function dataPlots(pl) {
  const idx = pl.x.map(function (_, i) { return i + 1; }), box = h('div', { class: 'minis' }); let charts;
  if (pl.y) {
    const d = pl.x.map(function (v, i) { return pl.y[i] - v; });
    charts = [miniChart({ x: pl.x, y: pl.y, fit: pl.fit, title: 'stĺpec 2 voči stĺpcu 1, r = ' + pl.fit.r.toFixed(4) }), miniChart({ x: idx, y: d, line: true, hline: C.stats(d).median, red: C.outliers(d), title: 'rozdiel (2 − 1) podľa poradia' })];
  } else {
    const out = C.outliers(pl.x);
    charts = [miniChart({ x: idx, y: pl.x, line: true, hline: C.stats(pl.x).median, red: out, title: 'priebeh podľa poradia' + (out.length ? ', odľahlé: ' + out.length : '') }), miniChart({ x: [C.stats(pl.x).min, C.stats(pl.x).max], bars: histBins(pl.x), title: 'histogram' })];
  }
  charts.forEach(function (c, i) { box.append(h('div', {}, [c, h('button', { class: 'ib png', type: 'button', text: 'PNG', onclick: function () { svgToPng(c, 'abakus_data_' + (i + 1) + '.png'); } })])); });
  return box;
}
function svgToPng(svg, name, cap) {
  const vb = svg.viewBox.baseVal; if (!vb || !vb.width || !svg.childNodes.length) { toast('Nie je čo uložiť'); return; }
  const clone = svg.cloneNode(true), src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*'), sc = Math.max(2, Math.ceil(1400 / vb.width)), capH = cap ? 30 : 0;
  src.forEach(function (el, i) { const cs = getComputedStyle(el); ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'font-weight'].forEach(function (p) { dst[i].style.setProperty(p, cs.getPropertyValue(p)); }); });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', vb.width); clone.setAttribute('height', vb.height); clone.removeAttribute('class');
  const img = new Image();
  img.onload = function () {
    const cv = document.createElement('canvas'); cv.width = vb.width * sc; cv.height = (vb.height + capH) * sc; const g = cv.getContext('2d');
    g.fillStyle = css('--bg'); g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, vb.width * sc, vb.height * sc);
    if (cap) { g.fillStyle = css('--ink'); g.font = (12 * sc) + 'px ui-monospace, Consolas, monospace'; g.textBaseline = 'middle'; g.fillText(cap, 12 * sc, (vb.height + capH / 2) * sc, cv.width - 24 * sc); }
    download(cv, name);
  };
  img.onerror = function () { toast('Export zlyhal'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
/* pole: {g: skupina, ro: len na čítanie, u: jednotka, ph: placeholder, val, wide} */
function fld(id, label, o) {
  o = o || {};
  const inp = h('input', { id: id, type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: o.ph || null, readonly: o.ro ? '' : null, 'data-g': o.g || null, inputmode: o.text ? null : 'decimal' });
  if (o.val != null) inp.value = o.val;
  F[id] = inp;
  return h('div', { class: 'f' + (o.ro ? ' ro' : '') + (o.wide ? ' wide' : '') }, [
    h('label', { for: id }, [label, o.u ? h('small', { text: o.u }) : null]),
    h('div', { class: 'fi' }, [inp, h('button', { class: 'cp', type: 'button', title: 'Kopírovať', 'aria-label': 'Kopírovať ' + label, text: '⧉', onclick: function () { if (inp.value) copy(inp.value); } })])
  ]);
}
function sel(id, label, opts, val, g) {
  const s = h('select', { id: id, 'data-g': g || null }, opts.map(function (o) { const v = Array.isArray(o) ? o : [o, o]; return h('option', { value: v[0], text: v[1] }); }));
  if (val != null) s.value = val; F[id] = s;
  return h('div', { class: 'f' }, [h('label', { for: id, text: label }), h('div', { class: 'fi' }, [s])]);
}
function grp(title, kids, note) { return h('section', { class: 'g' }, [h('h3', { text: title }), h('div', { class: 'grid' }, kids), note ? h('p', { class: 'note', html: note }) : null]); }
function btn(text, fn, cls) { return h('button', { type: 'button', class: 'btn ' + (cls || ''), text: text, onclick: fn }); }
function v(id) { return F[id].value.trim(); }
function n(id) { return C.num(F[id].value); }
function nz(id) { return v(id) === '' ? 0 : n(id); }
function ang(id) { return C.parseAngle(F[id].value); }
function setv(id, val) { if (document.activeElement !== F[id]) F[id].value = val; }
function bad(ids, on) { ids.forEach(function (id) { F[id].classList.toggle('bad', !!on); }); }
const ELL_OPTS = Object.keys(C.ELLIPSOIDS);
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ===================== PRÍKAZOVÝ RIADOK ===================== */
const env = { vars: C.baseVars() };
let hist = store('hist') || [], histPos = -1, draft = '';
function replRender(input, res, err) {
  const log = $('#log'), e = h('div', { class: 'ent' });
  e.append(h('div', { class: 'q', title: 'Klik = vrátiť do riadku', text: input.length > 300 ? input.slice(0, 300) + ' …' : input, onclick: function () { const i = $('#cmd'); i.value = input; i.focus(); autosize(); } }));
  const kv = function (lines) { return h('div', { class: 'kv' }, lines.map(function (l) { return h('div', { class: 'row' }, [h('span', { class: 'k', text: l[0] }), h('span', { class: 'v', text: l[1], title: 'Klik = skopírovať', onclick: function () { copy(l[1].replace(/\s+\((pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)\)$/, '')); } })]); })); };
  if (err) e.append(h('div', { class: 'err', text: err }));
  else if (res.type === 'val') {
    e.append(h('div', { class: 'val' }, [res.note ? h('span', { class: 'k', text: res.note + ' ' }) : null, h('span', { class: 'v big', text: res.text, title: 'Klik = skopírovať', onclick: function () { copy(typeof res.value === 'number' ? C.fmt(res.value, 16) : res.text); } })]));
    if (res.hints && res.hints.length) e.append(kv(res.hints));
  } else if (res.type === 'kv') e.append(kv(res.lines));
  else if (res.type === 'groups') e.append(h('div', { class: 'groups' }, res.groups.map(function (g) { return h('div', {}, [h('div', { class: 'gh', text: g[0] }), kv(g[1])]); })));
  else if (res.type === 'help') e.append(h('div', { class: 'kv help' }, res.lines.map(function (l) { return h('div', { class: 'row' }, [h('span', { class: 'k', text: l[0] }), h('span', { class: 'v', text: l[1] })]); })));
  if (res && res.plot && res.plot.x.length >= 3) { try { e.append(dataPlots(res.plot)); $('#log').classList.add('tall'); } catch (ex) { } }
  log.append(e); log.scrollTop = log.scrollHeight;
}
function replRun(input) {
  if (/^\s*(clear|cls|vymaz)\s*$/i.test(input)) { $('#log').textContent = ''; return; }
  let res = null, err = null;
  try { res = C.replEval(input, env); } catch (ex) { err = ex.message || String(ex); }
  if (res === null && !err) return;
  replRender(input, res, err);
  const uv = {}, base = C.baseVars(); for (const k in env.vars) if (!(k in base) && typeof env.vars[k] === 'number') uv[k] = env.vars[k]; store('vars', uv);
}
function autosize() { const i = $('#cmd'); i.style.height = 'auto'; i.style.height = Math.min(160, i.scrollHeight) + 'px'; }
function replInit() {
  const i = $('#cmd'), uv = store('vars'); if (uv) for (const k in uv) env.vars[k] = uv[k];
  i.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault(); const s = i.value; if (!s.trim()) return;
      if (hist[hist.length - 1] !== s && s.length < 2000) { hist.push(s); if (hist.length > 100) hist.shift(); store('hist', hist); }
      histPos = -1; i.value = ''; autosize(); replRun(s);
    } else if (ev.key === 'ArrowUp' && i.value.indexOf('\n') < 0) {
      if (!hist.length) return; ev.preventDefault(); if (histPos < 0) { draft = i.value; histPos = hist.length; } histPos = Math.max(0, histPos - 1); i.value = hist[histPos]; autosize();
    } else if (ev.key === 'ArrowDown' && histPos >= 0 && i.value.indexOf('\n') < 0) {
      ev.preventDefault(); histPos++; if (histPos >= hist.length) { histPos = -1; i.value = draft; } else i.value = hist[histPos]; autosize();
    }
  });
  i.addEventListener('input', autosize);
  i.addEventListener('paste', function () { setTimeout(function () { autosize(); if (i.value.indexOf('\n') >= 0 && C.parseData(i.value)) { const s = i.value; i.value = ''; autosize(); replRun(s); } }, 0); });
  $('#helpbtn').addEventListener('click', function () { replRun('help'); i.focus(); });
  $('#clearbtn').addEventListener('click', function () { $('#log').textContent = ''; i.focus(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { i.focus(); i.select(); } });
  replRender('help', { type: 'help', lines: C.HELP.slice(0, 4).concat([C.HELP[8]]) });
}

/* ===================== KARTA ČAS ===================== */
let tMs = Date.now();
const T_GROUPS = { utc: ['t_utc'], mjd: ['t_mjd'], jd: ['t_jd'], ydoy: ['t_year', 't_doy', 't_sod'], gps: ['t_week', 't_sow'], gpssec: ['t_gpssec'], unix: ['t_unix'] };
function tRender(except) {
  const t = C.timeAll(tMs), W = function (g, id, val) { if (g !== except) setv(id, val); };
  W('utc', 't_utc', t.utc); W('mjd', 't_mjd', C.fmt(+t.mjd.toFixed(9), 15)); W('jd', 't_jd', C.fmt(+t.jd.toFixed(8), 16));
  W('ydoy', 't_year', t.year); W('ydoy', 't_doy', t.doy); W('ydoy', 't_sod', C.fmt(+t.sod.toFixed(3)));
  W('gps', 't_week', t.week); W('gps', 't_sow', C.fmt(+t.sow.toFixed(3))); W('gpssec', 't_gpssec', C.fmt(+t.gpsSec.toFixed(3))); W('unix', 't_unix', C.fmt(+t.unix.toFixed(3)));
  setv('t_dow', t.dow); setv('t_isow', t.isoWeek); setv('t_decy', t.decYear.toFixed(6)); setv('t_gdow', t.gpsDow + ' (' + ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'][t.gpsDow] + ')');
  setv('t_wmod', t.weekMod); setv('t_gpst', t.gpst); setv('t_tai', t.tai); setv('t_leap', t.leap + ' s'); setv('t_gleap', t.gpsLeap + ' s');
  $('#t_warn').textContent = tMs < Date.UTC(1972, 0, 1) ? 'Pred rokom 1972 nie sú priestupné sekundy definované; GPST a TAI sú len orientačné.' : (tMs < C.gpsSecToUtc(0) ? 'Pred 1980-01-06 je GPS čas záporný (GPS ešte nebežal).' : '');
}
function tFrom(g) {
  let ms = NaN;
  if (g === 'utc') { const p = C.parseDateTime(v('t_utc')); ms = p === null ? NaN : p; }
  else if (g === 'mjd') ms = C.mjdToUtc(n('t_mjd'));
  else if (g === 'jd') ms = C.mjdToUtc(n('t_jd') - 2400000.5);
  else if (g === 'ydoy') ms = C.ydoyToUtc(n('t_year'), n('t_doy'), nz('t_sod'));
  else if (g === 'gps') ms = C.gpsSecToUtc(n('t_week') * 604800 + nz('t_sow'));
  else if (g === 'gpssec') ms = C.gpsSecToUtc(n('t_gpssec'));
  else if (g === 'unix') ms = n('t_unix') * 1000;
  const ok = isFinite(ms) && Math.abs(ms) < 8.6e15;
  for (const k in T_GROUPS) bad(T_GROUPS[k], k === g && !ok);
  if (ok) { tMs = ms; tRender(g); }
}
function cardTime(root) {
  const set = function (ms) { tMs = ms; for (const k in T_GROUPS) bad(T_GROUPS[k], false); tRender(); };
  root.append(h('div', { class: 'bar' }, [btn('Teraz', function () { set(Math.floor(Date.now() / 1000) * 1000); }, 'pri'), btn('Dnes 00:00', function () { set(Math.floor(Date.now() / 864e5) * 864e5); }),
    btn('− 1 deň', function () { set(tMs - 864e5); }), btn('+ 1 deň', function () { set(tMs + 864e5); }), btn('− 1 týždeň', function () { set(tMs - 7 * 864e5); }), btn('+ 1 týždeň', function () { set(tMs + 7 * 864e5); })]),
    h('p', { class: 'note', text: 'Prepíš ľubovoľné pole, ostatné sa prepočítajú. Všetky vstupy sú v UTC.' }),
    grp('Kalendár (UTC)', [fld('t_utc', 'dátum a čas', { g: 'utc', ph: 'RRRR-MM-DD HH:MM:SS', wide: true, text: true }), fld('t_dow', 'deň v týždni', { ro: 1 }), fld('t_isow', 'ISO týždeň', { ro: 1 }), fld('t_decy', 'desatinný rok', { ro: 1 })]),
    grp('Juliánsky dátum', [fld('t_mjd', 'MJD', { g: 'mjd' }), fld('t_jd', 'JD', { g: 'jd' })]),
    grp('Rok a deň v roku', [fld('t_year', 'rok', { g: 'ydoy' }), fld('t_doy', 'DOY', { g: 'ydoy' }), fld('t_sod', 'sekunda dňa', { g: 'ydoy', u: 's' })]),
    grp('GPS čas', [fld('t_week', 'GPS týždeň', { g: 'gps' }), fld('t_sow', 'sekunda týždňa (SOW)', { g: 'gps', u: 's' }), fld('t_gdow', 'deň GPS týždňa', { ro: 1 }), fld('t_wmod', 'týždeň mod 1024', { ro: 1 }), fld('t_gpssec', 'GPS sekundy od 1980-01-06', { g: 'gpssec', u: 's', wide: true })],
      'GPS týždeň a SOW sa počítajú v škále GPST (nie UTC). Deň 0 = nedeľa.'),
    grp('Unix', [fld('t_unix', 'Unix čas', { g: 'unix', u: 's' })]),
    grp('Časové škály', [fld('t_gpst', 'GPST', { ro: 1, wide: true }), fld('t_tai', 'TAI', { ro: 1, wide: true }), fld('t_gleap', 'GPST − UTC', { ro: 1 }), fld('t_leap', 'TAI − UTC', { ro: 1 })],
      'Tabuľka priestupných sekúnd končí záznamom 2017-01-01 (TAI − UTC = 37 s). Po vyhlásení novej sekundy treba doplniť riadok do <code>LEAPS</code>.'),
    h('p', { class: 'warn', id: 't_warn' }));
  root.addEventListener('input', function (e) { const g = e.target.dataset.g; if (g) tFrom(g); });
  set(Math.floor(Date.now() / 1000) * 1000);
}

/* ===================== KARTA SÚRADNICE ===================== */
const P = { lat: 50.0875, lon: 14.4214, h: 235 };
const C_GROUPS = { bpv: ['c_H'], geod: ['c_lat', 'c_lon', 'c_h'], dms: ['c_latd', 'c_lond'], ecef: ['c_X', 'c_Y', 'c_Z'], utm: ['c_uz', 'c_uh', 'c_uE', 'c_uN'], jtsk: ['c_jY', 'c_jX'], wm: ['c_wx', 'c_wy'] };
function cEll() { return C.ell(F.c_ell.value); }
function cIsEtrs() { return F.c_ell.value === 'WGS84' || F.c_ell.value === 'GRS80'; }
function cRender(except) {
  const E = cEll(), la = P.lat * C.D2R, lo = P.lon * C.D2R, W = function (g, id, val) { if (g !== except) setv(id, val); };
  W('geod', 'c_lat', C.fx(P.lat, 9)); W('geod', 'c_lon', C.fx(P.lon, 9)); if (except !== 'geod') setv('c_h', C.fx(P.h, 4));
  W('dms', 'c_latd', C.fmtDMS(P.lat, 5)); W('dms', 'c_lond', C.fmtDMS(P.lon, 5));
  const X = C.geod2ecef(E, la, lo, P.h); W('ecef', 'c_X', C.fx(X[0], 4)); W('ecef', 'c_Y', C.fx(X[1], 4)); W('ecef', 'c_Z', C.fx(X[2], 4));
  const zt = C.crZeta(P.lat, P.lon); W('bpv', 'c_H', zt === null ? '' : C.fx(P.h - zt, 3)); setv('c_zeta', zt === null ? 'mimo ČR' : C.fx(zt, 3)); F.c_H.disabled = zt === null;
  const s = C.ecef2sphere(X[0], X[1], X[2]); setv('c_slat', C.fx(s[0] * C.R2D, 9)); setv('c_slon', C.fx(s[1] * C.R2D, 9)); setv('c_sR', C.fx(s[2], 4));
  setv('c_gon', C.fx(P.lat / 0.9, 9) + ' / ' + C.fx(P.lon / 0.9, 9)); setv('c_rad', C.fx(la, 11) + ' / ' + C.fx(lo, 11));
  const etrs = cIsEtrs(); $('#c_proj').classList.toggle('off', !etrs);
  $('#c_projnote').textContent = etrs ? '' : 'Zobrazenia sú definované pre ETRS89/WGS84. Pri elipsoide ' + F.c_ell.value + ' sa nepočítajú.';
  if (etrs) {
    if (except !== 'utm') { const u = C.utmFwd(la, lo); setv('c_uz', u.zone); setv('c_uh', u.hemi); setv('c_uE', C.fx(u.E, 3)); setv('c_uN', C.fx(u.N, 3)); }
    const j = C.etrs2jtsk(la, lo, P.h); W('jtsk', 'c_jY', C.fx(j.Y, 3)); W('jtsk', 'c_jX', C.fx(j.X, 3)); setv('c_jacc', j.acc === 'grid' ? 'mriežka ČÚZK, cm' : 'Helmert, ~1 m');
    setv('c_j5514', C.fx(-j.Y, 3) + ' / ' + C.fx(-j.X, 3)); setv('c_jb', C.fmtDMS(j.latB * C.R2D, 4) + ' / ' + C.fmtDMS(j.lonB * C.R2D, 4));
    $('#c_jwarn').textContent = !C.inJtskArea(P.lat, P.lon) ? 'Bod je mimo územia ČR/SR, S-JTSK tu nemá zmysel.' : (j.acc === 'grid' ? '' : 'Bod je mimo opravnej tabuľky ČÚZK (pokrýva len ČR): použitá je Helmertova transformácia s presnosťou okolo 1 m.');
    const w = C.webMercFwd(la, lo); W('wm', 'c_wx', C.fx(w[0], 3)); W('wm', 'c_wy', C.fx(w[1], 3));
    const l = C.laeaEurope(la, lo), c = C.lccEurope(la, lo); setv('c_laea', C.fx(l[0], 3) + ' / ' + C.fx(l[1], 3)); setv('c_lcc', C.fx(c[0], 3) + ' / ' + C.fx(c[1], 3));
  }
  $('#c_mapy').href = 'https://mapy.cz/zakladni?x=' + P.lon.toFixed(7) + '&y=' + P.lat.toFixed(7) + '&z=16&source=coor&id=' + P.lon.toFixed(7) + '%2C' + P.lat.toFixed(7);
  $('#c_osm').href = 'https://www.openstreetmap.org/?mlat=' + P.lat.toFixed(7) + '&mlon=' + P.lon.toFixed(7) + '#map=16/' + P.lat.toFixed(5) + '/' + P.lon.toFixed(5);
}
function cFrom(g) {
  const E = cEll(); let lat = NaN, lon = NaN, hh = P.h;
  if (g === 'geod') { lat = ang('c_lat'); lon = ang('c_lon'); hh = nz('c_h'); }
  else if (g === 'bpv') { lat = P.lat; lon = P.lon; const zt = C.crZeta(P.lat, P.lon); hh = zt === null ? NaN : n('c_H') + zt; }
  else if (g === 'dms') { lat = ang('c_latd'); lon = ang('c_lond'); }
  else if (g === 'ecef') { const r = C.ecef2geod(E, n('c_X'), n('c_Y'), n('c_Z')); lat = r[0] * C.R2D; lon = r[1] * C.R2D; hh = r[2]; }
  else if (g === 'utm') { const z = n('c_uz'); if (z >= 1 && z <= 60) { const r = C.utmInv(z, v('c_uh') || 'N', n('c_uE'), n('c_uN')); lat = r[0] * C.R2D; lon = r[1] * C.R2D; } }
  else if (g === 'jtsk') { let Y = Math.abs(n('c_jY')), X = Math.abs(n('c_jX')); if (Y > X) { const t = Y; Y = X; X = t; } const r = C.jtsk2etrs(Y, X, P.h); lat = r[0] * C.R2D; lon = r[1] * C.R2D; }
  else if (g === 'wm') { const r = C.webMercInv(n('c_wx'), n('c_wy')); lat = r[0] * C.R2D; lon = r[1] * C.R2D; }
  const ok = isFinite(lat) && isFinite(lon) && isFinite(hh) && Math.abs(lat) <= 90 && Math.abs(lon) <= 360;
  for (const k in C_GROUPS) bad(C_GROUPS[k], k === g && !ok);
  if (ok) { P.lat = lat; P.lon = C.wrap180(lon); P.h = hh; cRender(g); store('pt', P); }
}
function cardCoord(root) {
  const sp = store('pt'); if (sp && isFinite(sp.lat) && isFinite(sp.lon) && isFinite(sp.h)) { P.lat = sp.lat; P.lon = sp.lon; P.h = sp.h; }
  root.append(h('div', { class: 'bar' }, [sel('c_ell', 'elipsoid pre φ, λ, h ↔ X, Y, Z', ELL_OPTS, 'WGS84'),
    h('a', { id: 'c_mapy', class: 'btn', target: '_blank', rel: 'noopener', text: 'Mapy.cz ↗' }), h('a', { id: 'c_osm', class: 'btn', target: '_blank', rel: 'noopener', text: 'OpenStreetMap ↗' })]),
    h('p', { class: 'note', text: 'Prepíš ľubovoľnú skupinu, ostatné sa prepočítajú. Uhly: 50.0875 · 50 05 15 · 50°05′15″N. Dĺžka kladná na východ.' }),
    grp('Geodetické (φ, λ, h)', [fld('c_lat', 'šírka φ', { g: 'geod', u: '°', text: true }), fld('c_lon', 'dĺžka λ', { g: 'geod', u: '°', text: true }), fld('c_h', 'elipsoidická výška h', { g: 'geod', u: 'm' }), fld('c_H', 'nadmorská výška H (Bpv)', { g: 'bpv', u: 'm' }), fld('c_zeta', 'kvázigeoid ζ (CR-2005)', { ro: 1, u: 'm' }),
      fld('c_latd', 'φ DMS', { g: 'dms', text: true }), fld('c_lond', 'λ DMS', { g: 'dms', text: true }), fld('c_gon', 'φ / λ', { ro: 1, u: 'gon' }), fld('c_rad', 'φ / λ', { ro: 1, u: 'rad', wide: true })]),
    grp('ECEF (X, Y, Z)', [fld('c_X', 'X', { g: 'ecef', u: 'm' }), fld('c_Y', 'Y', { g: 'ecef', u: 'm' }), fld('c_Z', 'Z', { g: 'ecef', u: 'm' })]),
    grp('Sférické (geocentrické)', [fld('c_slat', 'geocentrická šírka', { ro: 1, u: '°' }), fld('c_slon', 'dĺžka', { ro: 1, u: '°' }), fld('c_sR', 'sprievodič R', { ro: 1, u: 'm' })]),
    h('div', { id: 'c_proj' }, [
      grp('UTM (ETRS89 / GRS80)', [fld('c_uz', 'zóna', { g: 'utm' }), fld('c_uh', 'pologuľa N/S', { g: 'utm', text: true }), fld('c_uE', 'E', { g: 'utm', u: 'm' }), fld('c_uN', 'N', { g: 'utm', u: 'm' })],
        'Zóna sa určí z dĺžky. Pre ČR vychádza 33N, východ SR 34N.'),
      grp('S-JTSK (Křovák, ČR)', [fld('c_jY', 'Y', { g: 'jtsk', u: 'm' }), fld('c_jX', 'X', { g: 'jtsk', u: 'm' }), fld('c_jacc', 'spôsob a presnosť', { ro: 1 }), fld('c_j5514', 'EPSG:5514 (východ / sever)', { ro: 1, u: 'm' }), fld('c_jb', 'φ / λ na Besseli', { ro: 1, wide: true })],
        'V ČR postup ČÚZK: Helmert do S-JTSK/05, modifikované Křovákovo zobrazenie a opravná tabuľka <code>table_-y-x_3_v1710</code>. <b>Presnosť niekoľko cm</b> (EPSG uvádza 3,5 cm). Výška Bpv = h − ζ z kvázigeoidu CR-2005 (asi 5 cm). Mimo tabuľky sa použije Helmert s presnosťou okolo 1 m.'),
      h('p', { class: 'warn', id: 'c_jwarn' }),
      grp('Ďalšie zobrazenia', [fld('c_wx', 'Web Mercator x', { g: 'wm', u: 'm' }), fld('c_wy', 'Web Mercator y', { g: 'wm', u: 'm' }), fld('c_laea', 'ETRS89-LAEA (EPSG:3035) E / N', { ro: 1, u: 'm', wide: true }), fld('c_lcc', 'ETRS89-LCC (EPSG:3034) E / N', { ro: 1, u: 'm', wide: true })])
    ]),
    h('p', { class: 'warn', id: 'c_projnote' }),
    h('p', { class: 'note', text: 'ETRS89 a WGS84 sa tu berú ako totožné. V skutočnosti sa v Európe líšia o necelý meter (pohyb euroázijskej dosky, asi 2,5 cm za rok od 1989).' }));
  root.addEventListener('input', function (e) { const g = e.target.dataset.g; if (g) cFrom(g); });
  F.c_ell.addEventListener('change', function () { cRender(); });
  cRender();
}

/* ===================== KARTA DVA BODY ===================== */
function niceStep(span) { const st = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 45, 90]; for (let i = 0; i < st.length; i++) if (span / st[i] <= 6) return st[i]; return 90; }
function dSketch(E, la1, lo1, la2, lo2, vi, rh) {
  const el = $('#d_svg'), geo = [], lox = [], N = 64;
  if (!(vi.s > 0) || !vi.ok) { el.innerHTML = ''; return; }
  for (let i = 0; i <= N; i++) {
    const g = C.vincentyDir(E, la1, lo1, vi.az1 * C.D2R, vi.s * i / N); geo.push([g.lon * C.R2D, g.lat * C.R2D]);
    const t = i / N, psi = C.isoLat(E, la1) + t * rh.dpsi;
    lox.push([(lo1 + t * rh.dl) * C.R2D, (Math.abs(rh.dpsi) < 1e-12 ? la1 : C.isoLatInv(E, psi)) * C.R2D]);
  }
  const all = geo.concat(lox); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  all.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  const k = Math.max(0.15, Math.cos((y0 + y1) / 2 * C.D2R)); let dx = (x1 - x0) * k, dy = y1 - y0; const m = Math.max(dx, dy, 1e-6) * 0.12;
  x0 -= m / k; x1 += m / k; y0 -= m; y1 += m; dx = (x1 - x0) * k; dy = y1 - y0;
  const Wd = 720, Hd = 340, pl = 46, pb = 22, sc = Math.min((Wd - pl - 8) / dx, (Hd - pb - 8) / dy);
  const ox = pl + ((Wd - pl - 8) - dx * sc) / 2, oy = 8 + ((Hd - pb - 8) - dy * sc) / 2;
  const X = function (lon) { return ox + (lon - x0) * k * sc; }, Y = function (lat) { return oy + (y1 - lat) * sc; };
  const path = function (a) { return a.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(''); };
  let g = ''; const sx = niceStep(x1 - x0), sy = niceStep(y1 - y0), lab = function (v, s) { return (s < 1 ? v.toFixed(s < 0.01 ? 3 : s < 0.1 ? 2 : 1) : v.toFixed(0)) + '°'; };
  for (let a = Math.ceil(x0 / sx) * sx; a <= x1; a += sx) g += '<line class="gr" x1="' + X(a) + '" x2="' + X(a) + '" y1="' + Y(y1) + '" y2="' + Y(y0) + '"/><text class="tk" text-anchor="middle" x="' + X(a) + '" y="' + (Y(y0) + 14) + '">' + lab(C.wrap180(a), sx) + '</text>';
  for (let a = Math.ceil(y0 / sy) * sy; a <= y1; a += sy) g += '<line class="gr" x1="' + X(x0) + '" x2="' + X(x1) + '" y1="' + Y(a) + '" y2="' + Y(a) + '"/><text class="tk" text-anchor="end" x="' + (X(x0) - 5) + '" y="' + (Y(a) + 4) + '">' + lab(a, sy) + '</text>';
  el.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
  el.innerHTML = g + '<path class="lox" d="' + path(lox) + '"/><path class="geo" d="' + path(geo) + '"/>' +
    '<circle class="pt" cx="' + X(geo[0][0]) + '" cy="' + Y(geo[0][1]) + '" r="4.5"/><text class="pl" x="' + (X(geo[0][0]) + 8) + '" y="' + (Y(geo[0][1]) - 7) + '">1</text>' +
    '<circle class="pt" cx="' + X(geo[N][0]) + '" cy="' + Y(geo[N][1]) + '" r="4.5"/><text class="pl" x="' + (X(geo[N][0]) + 8) + '" y="' + (Y(geo[N][1]) - 7) + '">2</text>';
}
function dCalc() {
  const E = C.ell(F.d_ell.value), a = ['d_lat1', 'd_lon1', 'd_lat2', 'd_lon2'].map(ang), h1 = nz('d_h1'), h2 = nz('d_h2');
  ['d_lat1', 'd_lon1', 'd_lat2', 'd_lon2'].forEach(function (id, i) { bad([id], !isFinite(a[i]) || (i % 2 === 0 && Math.abs(a[i]) > 90)); });
  bad(['d_h1'], isNaN(h1)); bad(['d_h2'], isNaN(h2));
  if (a.some(function (x) { return !isFinite(x); }) || isNaN(h1) || isNaN(h2) || Math.abs(a[0]) > 90 || Math.abs(a[2]) > 90) return;
  const la1 = a[0] * C.D2R, lo1 = a[1] * C.D2R, la2 = a[2] * C.D2R, lo2 = a[3] * C.D2R;
  const vi = C.vincentyInv(E, la1, lo1, la2, lo2), hv = C.haversine(la1, lo1, la2, lo2), rh = C.rhumb(E, la1, lo1, la2, lo2);
  const x1 = C.geod2ecef(E, la1, lo1, h1), x2 = C.geod2ecef(E, la2, lo2, h2), d = [x2[0] - x1[0], x2[1] - x1[1], x2[2] - x1[2]], enu = C.ecef2enu(d, la1, lo1), aes = C.enu2aes(enu);
  [[x1, 1], [x2, 2]].forEach(function (q) { ['X', 'Y', 'Z'].forEach(function (k, i) { setv('d_' + k + q[1], C.fx(q[0][i], 4)); }); });
  setv('d_vs', vi.ok ? C.fx(vi.s, 4) : 'nekonverguje'); setv('d_az1', vi.ok ? C.fx(vi.az1, 8) : ''); setv('d_az2', vi.ok ? C.fx(vi.az2, 8) : '');
  setv('d_az1d', vi.ok ? C.fmtDMS(vi.az1, 4) : ''); setv('d_hs', C.fx(hv.s, 3)); setv('d_hd', vi.ok ? C.fx(hv.s - vi.s, 3) + '  (' + C.fx((hv.s - vi.s) / Math.max(vi.s, 1e-9) * 100, 4) + ' %)' : '');
  setv('d_rs', C.fx(rh.s, 4)); setv('d_raz', C.fx(rh.az, 8)); setv('d_rd', vi.ok ? C.fx(rh.s - vi.s, 4) : '');
  setv('d_ch', C.fx(Math.hypot(d[0], d[1], d[2]), 4)); setv('d_dx', C.fx(d[0], 4) + ' / ' + C.fx(d[1], 4) + ' / ' + C.fx(d[2], 4));
  setv('d_e', C.fx(enu[0], 4)); setv('d_n', C.fx(enu[1], 4)); setv('d_u', C.fx(enu[2], 4)); setv('d_aaz', C.fx(aes[0], 7)); setv('d_ael', C.fx(aes[1], 7)); setv('d_asl', C.fx(aes[2], 4));
  $('#d_warn').textContent = vi.ok ? '' : 'Vincentyho inverzná úloha pre takmer protiľahlé body nekonverguje.';
  dSketch(E, la1, lo1, la2, lo2, vi, rh);
  store('two', ['d_lat1', 'd_lon1', 'd_h1', 'd_lat2', 'd_lon2', 'd_h2'].map(v));
}
function cardTwo(root) {
  const s = store('two') || ['50.0875', '14.4214', '235', '49.1951', '16.6068', '237'];
  const pt = function (i) { return grp('Bod ' + i, [fld('d_lat' + i, 'šírka φ', { u: '°', text: true, val: s[(i - 1) * 3] }), fld('d_lon' + i, 'dĺžka λ', { u: '°', text: true, val: s[(i - 1) * 3 + 1] }), fld('d_h' + i, 'výška h', { u: 'm', val: s[(i - 1) * 3 + 2] }), fld('d_X' + i, 'X', { u: 'm', g: 'e' + i }), fld('d_Y' + i, 'Y', { u: 'm', g: 'e' + i }), fld('d_Z' + i, 'Z', { u: 'm', g: 'e' + i })], i === 1 ? 'Bod sa dá zadať ako φ, λ, h alebo ako X, Y, Z. Pre družicu: bod 1 = prijímač, bod 2 = družica, výsledok je azimut, elevácia a šikmá vzdialenosť nižšie.' : null); };
  root.append(h('div', { class: 'bar' }, [sel('d_ell', 'elipsoid', ELL_OPTS, 'WGS84'),
    btn('Vymeniť body', function () { ['lat', 'lon', 'h'].forEach(function (k) { const t = F['d_' + k + '1'].value; F['d_' + k + '1'].value = F['d_' + k + '2'].value; F['d_' + k + '2'].value = t; }); dCalc(); }),
    btn('Bod 1 ← Súradnice', function () { F.d_lat1.value = C.fx(P.lat, 9); F.d_lon1.value = C.fx(P.lon, 9); F.d_h1.value = C.fx(P.h, 4); dCalc(); }),
    btn('Bod 2 ← Súradnice', function () { F.d_lat2.value = C.fx(P.lat, 9); F.d_lon2.value = C.fx(P.lon, 9); F.d_h2.value = C.fx(P.h, 4); dCalc(); })]),
    h('div', { class: 'two' }, [pt(1), pt(2)]),
    grp('Geodetická čiara (Vincenty, na elipsoide)', [fld('d_vs', 'dĺžka', { ro: 1, u: 'm' }), fld('d_az1', 'azimut 1 → 2', { ro: 1, u: '°' }), fld('d_az2', 'azimut 2 → 1', { ro: 1, u: '°' }), fld('d_az1d', 'azimut 1 → 2 DMS', { ro: 1 })]),
    grp('Ortodróma na guli (haversine, R = 6 371 008,8 m)', [fld('d_hs', 'dĺžka', { ro: 1, u: 'm' }), fld('d_hd', 'rozdiel voči Vincentymu', { ro: 1, u: 'm' })]),
    grp('Loxodróma (na elipsoide)', [fld('d_rs', 'dĺžka', { ro: 1, u: 'm' }), fld('d_raz', 'stály azimut', { ro: 1, u: '°' }), fld('d_rd', 'o koľko je dlhšia', { ro: 1, u: 'm' })]),
    grp('Priestorová spojnica (s výškami)', [fld('d_ch', 'šikmá vzdialenosť', { ro: 1, u: 'm' }), fld('d_dx', 'ΔX / ΔY / ΔZ', { ro: 1, u: 'm', wide: true })]),
    grp('Bod 2 v lokálnej sústave bodu 1', [fld('d_e', 'E', { ro: 1, u: 'm' }), fld('d_n', 'N', { ro: 1, u: 'm' }), fld('d_u', 'U', { ro: 1, u: 'm' }), fld('d_aaz', 'azimut', { ro: 1, u: '°' }), fld('d_ael', 'elevácia', { ro: 1, u: '°' }), fld('d_asl', 'šikmá vzdialenosť', { ro: 1, u: 'm' })]),
    h('p', { class: 'warn', id: 'd_warn' }),
    h('section', { class: 'g' }, [h('h3', { text: 'Náčrt (φ, λ)' }), h('svg', { id: 'd_svg', class: 'plot', role: 'img', 'aria-label': 'Geodetická čiara a loxodróma' }),
      h('p', { class: 'legend', html: '<span class="sw geo"></span> geodetická čiara <span class="sw lox"></span> loxodróma' }),
      h('div', { class: 'bar', style: 'margin:10px 0 0' }, [btn('Stiahnuť PNG', function () { svgToPng($('#d_svg'), 'abakus_dva_body.png', 'modrá: geodetická čiara ' + v('d_vs') + ' m · červená: loxodróma ' + v('d_rs') + ' m · ' + F.d_ell.value); })])]),
    grp('Priama úloha: z bodu 1 pod azimutom na vzdialenosť', [fld('d_daz', 'azimut', { u: '°', text: true, val: '90' }), fld('d_ds', 'dĺžka', { u: 'm', val: '100000' }),
      h('div', { class: 'f' }, [h('label', { text: ' ' }), btn('Vypočítať bod 2', function () {
        const az = ang('d_daz'), s = n('d_ds'), la = ang('d_lat1'), lo = ang('d_lon1'); bad(['d_daz'], isNaN(az)); bad(['d_ds'], isNaN(s)); if (isNaN(az) || isNaN(s) || isNaN(la) || isNaN(lo)) return;
        const r = C.vincentyDir(C.ell(F.d_ell.value), la * C.D2R, lo * C.D2R, az * C.D2R, s); F.d_lat2.value = C.fx(r.lat * C.R2D, 9); F.d_lon2.value = C.fx(C.wrap180(r.lon * C.R2D), 9); dCalc();
      }, 'pri')])]));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'd_svg'; svg.setAttribute('class', 'plot'); $('#d_svg', root).replaceWith(svg);
  root.addEventListener('input', function (e) {
    const g = e.target.dataset.g;
    if (g === 'e1' || g === 'e2') { const i = g[1], X = [n('d_X' + i), n('d_Y' + i), n('d_Z' + i)]; bad(['d_X' + i, 'd_Y' + i, 'd_Z' + i], X.some(isNaN)); if (X.some(isNaN)) return;
      const r = C.ecef2geod(C.ell(F.d_ell.value), X[0], X[1], X[2]); F['d_lat' + i].value = C.fx(r[0] * C.R2D, 10); F['d_lon' + i].value = C.fx(r[1] * C.R2D, 10); F['d_h' + i].value = C.fx(r[2], 4); }
    dCalc();
  });
  F.d_ell.addEventListener('change', dCalc); dCalc();
}

/* ===================== KARTA HROMADNÝ PREVOD ===================== */
let bRes = null;
function bCalcBatch() {
  const from = F.b_from.value, to = F.b_to.value, zone = Math.round(nz('b_zone')) || 33, out = $('#b_out'), txt = F.b_in.value;
  F.b_zone.disabled = from !== 'utm'; bad(['b_zone'], from === 'utm' && !(zone >= 1 && zone <= 60));
  $('#b_fmt').textContent = { geod: 'Na riadok: [názov] φ λ [h]. Stupne desatinne, λ kladná na východ, h elipsoidická v metroch.', ecef: 'Na riadok: [názov] X Y Z v metroch.', utm: 'Na riadok: [názov] E N [h]. Zónu zadaj vpravo (ČR: 33, východ SR: 34).', jtsk: 'Na riadok: [názov] Y X [H]. Y, X kladné alebo záporné (EPSG:5514), H = výška Bpv.' }[from] + ' Oddeľovač: medzera, tabulátor alebo bodkočiarka. Desatinná čiarka funguje. Riadky s # sa preskočia.';
  store('batch', { from: from, to: to, zone: zone, txt: txt.length < 20000 ? txt : '' });
  if (!txt.trim()) { out.innerHTML = ''; bRes = null; return; }
  if (from === to) { out.innerHTML = '<p class="warn">Vstupný a výstupný systém sú rovnaké.</p>'; bRes = null; return; }
  const r = C.batchConvert(txt, from, to, { zone: zone }); bRes = r;
  let html = '<p class="note">Prevedených bodov: <b>' + r.rows.length + '</b>' + (r.bad.length ? ' · <span class="err">nečitateľné riadky: ' + r.bad.slice(0, 12).join(', ') + (r.bad.length > 12 ? ' …' : '') + '</span>' : '') + '</p>';
  if (r.notes.helm) html += '<p class="warn">Niektoré body sú mimo opravnej tabuľky ČÚZK: S-JTSK tam má presnosť len okolo 1 m.</p>';
  if (r.notes.noH) html += '<p class="warn">Niektoré body sú mimo modelu CR-2005: výška pri nich zostala bez prevodu medzi h a H.</p>';
  const hasName = r.rows.some(function (x) { return x.name; });
  html += '<div class="tw"><table class="ut"><thead><tr>' + (hasName ? '<th>bod</th>' : '') + r.head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
    r.rows.slice(0, 500).map(function (x) { return '<tr>' + (hasName ? '<td>' + x.name.replace(/[<&]/g, '') + '</td>' : '') + x.vals.map(function (q) { return '<td class="num">' + q + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
    (r.rows.length > 500 ? '<p class="note">V tabuľke je prvých 500 bodov, kopírovanie a CSV obsahujú všetky.</p>' : '');
  out.innerHTML = html;
}
function bText(sep) { if (!bRes) return ''; const hasName = bRes.rows.some(function (x) { return x.name; }); return [(hasName ? ['bod'] : []).concat(bRes.head).join(sep)].concat(bRes.rows.map(function (x) { return (hasName ? [x.name] : []).concat(x.vals).join(sep); })).join('\n'); }
function cardBatch(root) {
  const st = store('batch') || {}, so = Object.keys(C.BATCH_SYS).map(function (k) { return [k, C.BATCH_SYS[k]]; }), ta = h('textarea', { id: 'b_in', rows: '9', spellcheck: 'false', 'aria-label': 'Zoznam bodov', placeholder: 'P1 50.0875 14.4214 235\nP2 49.1951 16.6068 237' });
  ta.value = st.txt || 'P1 50.0875 14.4214 235\nP2 49.1951 16.6068 237\nP3 49.7437 13.3736 360'; F.b_in = ta;
  root.append(h('div', { class: 'bar' }, [sel('b_from', 'vstup', so.filter(function (o) { return o[0] !== 'enu'; }), st.from || 'geod'), sel('b_to', 'výstup', so, st.to || 'jtsk'), fld('b_zone', 'zóna UTM na vstupe', { val: st.zone || 33 })]),
    h('section', { class: 'g' }, [h('h3', { text: 'Body' }), ta, h('p', { class: 'note', id: 'b_fmt' })]),
    h('section', { class: 'g' }, [h('h3', { text: 'Výsledok' }), h('div', { class: 'bar' }, [btn('Kopírovať (do Excelu)', function () { if (bRes) copy(bText('\t')); }), btn('Stiahnuť CSV', function () { if (bRes) downloadText('abakus_body_' + F.b_from.value + '_' + F.b_to.value + '.csv', bText(';')); })]), h('div', { id: 'b_out' })]),
    h('p', { class: 'note', text: 'Všetko sa počíta v ETRS89 (GRS80). S-JTSK ide cez opravnú tabuľku ČÚZK, výšky cez kvázigeoid CR-2005.' }));
  root.addEventListener('input', bCalcBatch); [F.b_from, F.b_to].forEach(function (x) { x.addEventListener('change', bCalcBatch); }); bCalcBatch();
}

/* ===================== KARTA RÁMCE (ITRF ↔ ETRF) ===================== */
function rEpoch() { const s = v('r_ep'), d = C.parseDateTime(s); if (d !== null) return C.timeAll(d).decYear; const x = C.num(s); return x > 1900 && x < 2200 ? x : NaN; }
function rCalc(src) {
  const E = C.ell('GRS80');
  if (src === 'geod') { const la = ang('r_lat'), lo = ang('r_lon'), hh = nz('r_h'); bad(['r_lat', 'r_lon', 'r_h'], !isFinite(la) || !isFinite(lo) || isNaN(hh) || Math.abs(la) > 90);
    if (isFinite(la) && isFinite(lo) && !isNaN(hh) && Math.abs(la) <= 90) { const x = C.geod2ecef(E, la * C.D2R, lo * C.D2R, hh); ['r_X', 'r_Y', 'r_Z'].forEach(function (id, i) { F[id].value = C.fx(x[i], 4); }); } }
  const X = [n('r_X'), n('r_Y'), n('r_Z')], ep = rEpoch(), okX = !X.some(isNaN) && Math.hypot(X[0], X[1], X[2]) > 1e6;
  bad(['r_X', 'r_Y', 'r_Z'], !okX); bad(['r_ep'], isNaN(ep));
  const outIds = ['r_oX', 'r_oY', 'r_oZ', 'r_olat', 'r_olon', 'r_oh', 'r_dxyz', 'r_de', 'r_dn', 'r_du', 'r_d2', 'r_d3'];
  if (!okX || isNaN(ep)) { outIds.forEach(function (id) { setv(id, ''); }); return; }
  const g = C.ecef2geod(E, X[0], X[1], X[2]); if (src !== 'geod') { setv('r_lat', C.fx(g[0] * C.R2D, 10)); setv('r_lon', C.fx(g[1] * C.R2D, 10)); setv('r_h', C.fx(g[2], 4)); }
  const toE = F.r_dir.value === 'ie', a = toE ? F.r_itrf.value : F.r_etrf.value, b = toE ? F.r_etrf.value : F.r_itrf.value, Y = C.frameTransform(X, a, b, ep), go = C.ecef2geod(E, Y[0], Y[1], Y[2]);
  const d = [Y[0] - X[0], Y[1] - X[1], Y[2] - X[2]], enu = C.ecef2enu(d, g[0], g[1]);
  setv('r_oX', C.fx(Y[0], 4)); setv('r_oY', C.fx(Y[1], 4)); setv('r_oZ', C.fx(Y[2], 4)); setv('r_olat', C.fx(go[0] * C.R2D, 10)); setv('r_olon', C.fx(go[1] * C.R2D, 10)); setv('r_oh', C.fx(go[2], 4));
  setv('r_dxyz', C.fx(d[0], 4) + ' / ' + C.fx(d[1], 4) + ' / ' + C.fx(d[2], 4)); setv('r_de', C.fx(enu[0], 4)); setv('r_dn', C.fx(enu[1], 4)); setv('r_du', C.fx(enu[2], 4));
  setv('r_d2', C.fx(Math.hypot(enu[0], enu[1]), 4)); setv('r_d3', C.fx(Math.hypot(d[0], d[1], d[2]), 4));
  $('#r_head').textContent = 'Výsledok: ' + b + ' v epoche ' + ep.toFixed(3); $('#r_inhead').textContent = 'Vstup: ' + a;
  const P7 = C.framePar(F.r_itrf.value, F.r_etrf.value, ep);
  $('#r_par').textContent = F.r_itrf.value + ' → ' + F.r_etrf.value + ' v epoche ' + ep.toFixed(3) + ':  T = ' + P7.T.map(function (x) { return (x * 1000).toFixed(2); }).join(', ') + ' mm · R = ' + P7.r.map(function (x) { return (x * 1000).toFixed(3); }).join(', ') + ' mas · mierka = ' + (P7.s * 1000).toFixed(3) + ' ppb';
}
function cardFrame(root) {
  const x0 = C.geod2ecef(C.ell('GRS80'), P.lat * C.D2R, P.lon * C.D2R, P.h);
  root.append(h('div', { class: 'bar' }, [sel('r_dir', 'smer', [['ie', 'ITRF → ETRF'], ['ei', 'ETRF → ITRF']], 'ie'), sel('r_itrf', 'rámec ITRF', C.ITRFS, 'ITRF2020'), sel('r_etrf', 'rámec ETRF', C.ETRFS, 'ETRF2000'),
    fld('r_ep', 'epocha (rok alebo dátum)', { val: C.timeAll(Date.now()).decYear.toFixed(3), text: true }),
    btn('Vstup ← Súradnice', function () { const x = C.geod2ecef(C.ell('GRS80'), P.lat * C.D2R, P.lon * C.D2R, P.h); ['r_X', 'r_Y', 'r_Z'].forEach(function (id, i) { F[id].value = C.fx(x[i], 4); }); rCalc(); }),
    btn('Výsledok → Súradnice', function () { const la = n('r_olat'), lo = n('r_olon'), hh = n('r_oh'); if (isNaN(la)) return; P.lat = la; P.lon = lo; P.h = hh; cRender(); store('pt', P); toast('Bod prenesený na kartu Súradnice'); })]),
    h('section', { class: 'g' }, [h('h3', { id: 'r_inhead', text: 'Vstup' }), h('div', { class: 'grid' }, [fld('r_X', 'X', { u: 'm', g: 'xyz', val: C.fx(x0[0], 4) }), fld('r_Y', 'Y', { u: 'm', g: 'xyz', val: C.fx(x0[1], 4) }), fld('r_Z', 'Z', { u: 'm', g: 'xyz', val: C.fx(x0[2], 4) }),
      fld('r_lat', 'φ', { u: '°', g: 'geod', text: true }), fld('r_lon', 'λ', { u: '°', g: 'geod', text: true }), fld('r_h', 'h', { u: 'm', g: 'geod' })])]),
    h('section', { class: 'g' }, [h('h3', { id: 'r_head', text: 'Výsledok' }), h('div', { class: 'grid' }, [fld('r_oX', 'X', { ro: 1, u: 'm' }), fld('r_oY', 'Y', { ro: 1, u: 'm' }), fld('r_oZ', 'Z', { ro: 1, u: 'm' }), fld('r_olat', 'φ', { ro: 1, u: '°' }), fld('r_olon', 'λ', { ro: 1, u: '°' }), fld('r_oh', 'h', { ro: 1, u: 'm' })])]),
    grp('Posun (výsledok − vstup)', [fld('r_de', 'na východ', { ro: 1, u: 'm' }), fld('r_dn', 'na sever', { ro: 1, u: 'm' }), fld('r_du', 'nahor', { ro: 1, u: 'm' }), fld('r_d2', 'vodorovne spolu', { ro: 1, u: 'm' }), fld('r_d3', 'priestorovo spolu', { ro: 1, u: 'm' }), fld('r_dxyz', 'ΔX / ΔY / ΔZ', { ro: 1, u: 'm', wide: true })]),
    h('p', { class: 'note mono', id: 'r_par' }),
    h('ul', { class: 'hl', html: '<li>14-parametrová Helmertova transformácia podľa EUREF (parametre z databázy EPSG). Výsledok je v <b>tej istej epoche</b> ako vstup.</li>' +
      '<li>ITRF sa voči Európe pohybuje asi 2,5 cm za rok. Preto epocha rozhoduje: zadaj dátum merania, nie dnešok.</li>' +
      '<li>Súradnice z GNSS: presné produkty IGS a PPP sú v ITRF2020 (IGS20). Vysielané efemeridy GPS sú vo WGS84, ktorý sa s ITRF zhoduje na centimetre (G2139 ≈ ITRF2014, G2296 ≈ ITRF2020).</li>' +
      '<li>V ČR je ETRS89 realizovaný rámcom ETRF2000. Vlastný pohyb bodu vnútri dosky (rádovo mm za rok) transformácia nerieši.</li>' }));
  root.addEventListener('input', function (e) { rCalc(e.target.dataset.g === 'geod' ? 'geod' : ''); }); ['r_dir', 'r_itrf', 'r_etrf'].forEach(function (id) { F[id].addEventListener('change', function () { rCalc(); }); });
  rCalc();
}

/* ===================== KARTA ELIPSOID ===================== */
function eCalc() {
  const E = C.ell(F.e_ell.value), lat = ang('e_lat'), hh = nz('e_h'); bad(['e_lat'], !isFinite(lat) || Math.abs(lat) > 90); bad(['e_h'], isNaN(hh));
  setv('e_a', C.fx(E.a, 4)); setv('e_b', C.fx(E.b, 4)); setv('e_f', C.fmt(E.f, 13)); setv('e_invf', C.fmt(E.invf, 13)); setv('e_e2', C.fmt(E.e2, 13)); setv('e_ep2', C.fmt(E.ep2, 13));
  setv('e_e', C.fmt(E.e, 13)); setv('e_n', C.fmt(E.n, 13)); setv('e_ab', C.fx(E.a - E.b, 4)); setv('e_q', C.fx(C.meridianArc(E, Math.PI / 2), 4));
  if (!isFinite(lat) || Math.abs(lat) > 90 || isNaN(hh)) return;
  const la = lat * C.D2R, r = C.radii(E, la), g = C.normalGravity(la, hh);
  setv('e_W', C.fmt(r.W, 13)); setv('e_N', C.fx(r.N, 4)); setv('e_M', C.fx(r.M, 4)); setv('e_R', C.fx(r.R, 4)); setv('e_rp', C.fx(r.rp, 4)); setv('e_arc', C.fx(C.meridianArc(E, la), 4));
  setv('e_d1lat', C.fx((r.M + hh) * C.D2R, 4)); setv('e_s1lat', C.fx((r.M + hh) * C.D2R / 3600, 5)); setv('e_d1lon', C.fx((r.N + hh) * Math.cos(la) * C.D2R, 4)); setv('e_s1lon', C.fx((r.N + hh) * Math.cos(la) * C.D2R / 3600, 5));
  setv('e_m1lat', C.fmt(1 / ((r.M + hh) * C.D2R / 3600), 8)); setv('e_m1lon', C.fmt(1 / ((r.N + hh) * Math.cos(la) * C.D2R / 3600), 8));
  setv('e_g0', C.fx(g.g0, 8)); setv('e_gh', C.fx(g.gh, 8));
}
function cardEll(root) {
  root.append(h('div', { class: 'bar' }, [sel('e_ell', 'elipsoid', ELL_OPTS.map(function (k) { return [k, k + ' – ' + C.ELLIPSOIDS[k].pozn]; }), 'WGS84')]),
    grp('Konštanty elipsoidu', [fld('e_a', 'veľká poloos a', { ro: 1, u: 'm' }), fld('e_b', 'malá poloos b', { ro: 1, u: 'm' }), fld('e_ab', 'a − b', { ro: 1, u: 'm' }), fld('e_invf', '1/f', { ro: 1 }), fld('e_f', 'sploštenie f', { ro: 1 }),
      fld('e_e2', 'e²', { ro: 1 }), fld('e_e', 'e', { ro: 1 }), fld('e_ep2', 'e′²', { ro: 1 }), fld('e_n', 'tretie sploštenie n', { ro: 1 }), fld('e_q', 'kvadrant poludníka', { ro: 1, u: 'm' })]),
    grp('Bod', [fld('e_lat', 'šírka φ', { u: '°', text: true, val: '50' }), fld('e_h', 'výška h', { u: 'm', val: '0' })]),
    grp('Polomery krivosti v šírke φ', [fld('e_W', 'W = √(1 − e² sin²φ)', { ro: 1 }), fld('e_N', 'priečny N', { ro: 1, u: 'm' }), fld('e_M', 'meridiánový M', { ro: 1, u: 'm' }), fld('e_R', 'stredný √(MN)', { ro: 1, u: 'm' }),
      fld('e_rp', 'polomer rovnobežky', { ro: 1, u: 'm' }), fld('e_arc', 'oblúk poludníka od rovníka', { ro: 1, u: 'm' })]),
    grp('Koľko metrov je uhol (vo výške h)', [fld('e_d1lat', '1° v šírke', { ro: 1, u: 'm' }), fld('e_s1lat', '1″ v šírke', { ro: 1, u: 'm' }), fld('e_m1lat', '1 m v šírke', { ro: 1, u: '″' }),
      fld('e_d1lon', '1° v dĺžke', { ro: 1, u: 'm' }), fld('e_s1lon', '1″ v dĺžke', { ro: 1, u: 'm' }), fld('e_m1lon', '1 m v dĺžke', { ro: 1, u: '″' })]),
    grp('Normálne tiažové zrýchlenie (GRS80, Somigliana)', [fld('e_g0', 'γ₀ na elipsoide', { ro: 1, u: 'm/s²' }), fld('e_gh', 'γ vo výške h', { ro: 1, u: 'm/s²' })],
      'Vždy pre GRS80 bez ohľadu na zvolený elipsoid. Prevod medzi elipsoidickou výškou h a výškou Bpv (kvázigeoid CR-2005) je na karte Súradnice.'));
  root.addEventListener('input', eCalc); F.e_ell.addEventListener('change', eCalc); eCalc();
}

/* ===================== KARTA KOVARIANCIA ===================== */
const SYS = { ecef: { n: ['X', 'Y', 'Z'], u: ['m', 'm', 'm'] }, geod: { n: ['φ', 'λ', 'h'], u: ['°', '°', 'm'] }, enu: { n: ['E', 'N', 'U'], u: ['m', 'm', 'm'] }, sphere: { n: ['φ geoc.', 'λ', 'R'], u: ['°', '°', 'm'] } };
const SYS_OPTS = [['ecef', 'ECEF (X, Y, Z)'], ['geod', 'GEOD (φ, λ, h)'], ['enu', 'ENU (E, N, U)'], ['sphere', 'SPHERE (φ, λ, R)']];
const K_IDS = ['k_c00', 'k_c01', 'k_c02', 'k_c11', 'k_c12', 'k_c22'], K_IJ = [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2], [2, 2]];
let kRes = null, kTimer = null;
function kIsAng(sys) { return SYS[sys].u[0] === '°'; }
function kPoint(sys) { return kIsAng(sys) ? [ang('k_v0'), ang('k_v1'), n('k_v2')] : [n('k_v0'), n('k_v1'), n('k_v2')]; }
function kPointOk(sys, x) { return !x.some(isNaN) && (!kIsAng(sys) || (Math.abs(x[0]) <= 90 && Math.abs(x[1]) <= 360)); }
/* metre na 1 stupeň pre zložky φ, λ */
function kMPerDeg(sys, x, E) {
  if (sys === 'geod') { const r = C.radii(E, x[0] * C.D2R); return [C.D2R * (r.M + x[2]), C.D2R * (r.N + x[2]) * Math.cos(x[0] * C.D2R)]; }
  return [C.D2R * x[2], C.D2R * x[2] * Math.cos(x[0] * C.D2R)];
}
/* násobiteľ: σ zapísaná v poli -> σ v jednotke súradnice (deg alebo m) */
function kScale(sys, x, E) {
  if (!kIsAng(sys)) return [1, 1, 1];
  const u = F.k_sunit.value; if (u === 'deg') return [1, 1, 1]; if (u === 'sec') return [1 / 3600, 1 / 3600, 1];
  const m = kMPerDeg(sys, x, E); return [1 / m[0], 1 / m[1], 1];
}
function kReadS(sys, x, E) {
  const c = K_IDS.map(n); if (c.some(isNaN)) return null;
  if (F.k_mode.value === 'cov') return [[c[0], c[1], c[2]], [c[1], c[3], c[4]], [c[2], c[4], c[5]]];
  const k = kScale(sys, x, E), s = [c[0] * k[0], c[3] * k[1], c[5] * k[2]];
  return [[s[0] * s[0], c[1] * s[0] * s[1], c[2] * s[0] * s[2]], [c[1] * s[0] * s[1], s[1] * s[1], c[4] * s[1] * s[2]], [c[2] * s[0] * s[2], c[4] * s[1] * s[2], s[2] * s[2]]];
}
function kWriteS(S, sys, x, E) {
  let vals;
  if (F.k_mode.value === 'cov') vals = K_IJ.map(function (q) { return S[q[0]][q[1]]; });
  else { const k = kScale(sys, x, E), sg = [0, 1, 2].map(function (i) { return Math.sqrt(S[i][i]); }); vals = K_IJ.map(function (q) { return q[0] === q[1] ? sg[q[0]] / k[q[0]] : S[q[0]][q[1]] / (sg[q[0]] * sg[q[1]]); }); }
  vals.forEach(function (val, i) { F[K_IDS[i]].value = C.fmt(val, 10); });
}
function kLabels() {
  const sys = F.k_from.value, s = SYS[sys], sig = F.k_mode.value === 'sig', angU = { m: 'm', sec: '″', deg: '°' }[F.k_sunit.value];
  const lab = function (id, t, u) { const l = $('label[for=' + id + ']'); l.firstChild.textContent = t + ' '; l.querySelector('small').textContent = u; };
  [0, 1, 2].forEach(function (i) { lab('k_v' + i, s.n[i], s.u[i]); });
  K_IJ.forEach(function (q, i) {
    const ui = s.u[q[0]] === '°' ? 'deg' : 'm', uj = s.u[q[1]] === '°' ? 'deg' : 'm';
    if (sig) lab(K_IDS[i], q[0] === q[1] ? 'σ ' + s.n[q[0]] : 'ρ ' + s.n[q[0]] + ', ' + s.n[q[1]], q[0] === q[1] ? (s.u[q[0]] === '°' ? angU : 'm') : '−1 až 1');
    else lab(K_IDS[i], 'C' + q[0] + q[1] + ' (' + s.n[q[0]] + ', ' + s.n[q[1]] + ')', ui === uj ? ui + '²' : 'deg·m');
  });
  F.k_sunit.disabled = !(sig && kIsAng(sys));
  $('#k_mhint').textContent = sig ? (kIsAng(sys) ? 'Smerodajné odchýlky φ a λ zadávaš v jednotke zvolenej vyššie (odporúčam metre), h alebo R v metroch. Korelácie sú bez jednotky.' : 'Smerodajné odchýlky v metroch, korelácie bez jednotky.')
    : (kIsAng(sys) ? 'Uhlové prvky sú v deg². Pozor: σ = 1 cm v šírke je asi 9·10⁻⁸°, teda C00 ≈ 8·10⁻¹⁵ deg². Pohodlnejší je režim „σ a korelácie“ s jednotkou metre.' : 'Všetky prvky v m². Poradie je rovnaké ako vo vstupnom súbore LOKI.');
}
function matTable(M, names, f) {
  return '<table class="mt"><tr><th></th>' + names.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' +
    M.map(function (r, i) { return '<tr><th>' + names[i] + '</th>' + r.map(function (x) { return '<td>' + f(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
}
function kCalc() {
  const from = F.k_from.value, to = F.k_to.value, E = C.ell(F.k_ell.value), out = $('#k_out'), ids = K_IDS;
  const stop = function (msg) { out.innerHTML = msg ? '<p class="warn">' + msg + '</p>' : ''; kRes = null; kDraw(); };
  const x = kPoint(from), nS = Math.round(n('k_n')), p = n('k_p'), angIn = kIsAng(from);
  bad(['k_v0', 'k_v1', 'k_v2'], x.some(isNaN)); bad(ids, false); bad(['k_n'], !(nS >= 100 && nS <= 200000)); bad(['k_p'], !(p > 0 && p < 1));
  if (x.some(isNaN) || !(nS >= 100 && nS <= 200000) || !(p > 0 && p < 1)) return stop('');
  if (!kPointOk(from, x)) { bad(['k_v0', 'k_v1'], true); return stop('Vstup je v systéme ' + from.toUpperCase() + ': φ musí byť v stupňoch (−90 až 90), λ v stupňoch. Zadané hodnoty vyzerajú ako metre.'); }
  const S = kReadS(from, x, E);
  if (!S) { bad(ids, true); return stop(''); }
  if (!C.chol3(S)) { bad(ids, true); return stop(F.k_mode.value === 'sig' ? 'Matica nie je pozitívne definitná. Skontroluj, že σ sú kladné a korelácie spolu dávajú zmysel (každá medzi −1 a 1).' : 'Matica nie je pozitívne definitná (Choleského rozklad zlyhal).'); }
  if (from === to) return stop('Vstupný a výstupný systém sú rovnaké.');
  let kWarn = '';
  if (angIn && (Math.sqrt(S[0][0]) > 0.5 || Math.sqrt(S[1][1]) > 0.5)) kWarn = '<p class="warn">Smerodajná odchýlka uhla je väčšia ako 0,5°. Pri takej neistote linearizácia neplatí a analytický výsledok sa od Monte Carla rozíde.</p>';
  let org; const ol = [v('k_olat'), v('k_olon'), v('k_oh')];
  if (ol[0] !== '' && ol[1] !== '') { org = [ang('k_olat') * C.D2R, ang('k_olon') * C.D2R, nz('k_oh')]; bad(['k_olat', 'k_olon'], org.some(isNaN)); if (org.some(isNaN)) return stop(''); }
  else {
    bad(['k_olat', 'k_olon'], false);
    if (from === 'enu') return stop('Pre vstup v ENU zadaj počiatok (φ₀, λ₀, h₀).');
    const x0 = C.sysTransform(x, from, 'ecef', E, null), g0 = C.ecef2geod(E, x0[0], x0[1], x0[2]); org = g0;
  }
  const pr = C.propagate(x, S, from, to, E, org), mc = C.monteCarlo(x, S, from, to, E, org, nS, 20260508);
  const so = SYS[to], si = SYS[from], sig = [0, 1, 2].map(function (i) { return Math.sqrt(pr.S[i][i]); }), sigm = [0, 1, 2].map(function (i) { return Math.sqrt(mc.S[i][i]); });
  const corr = pr.S.map(function (r, i) { return r.map(function (xx, j) { return xx / (sig[i] * sig[j]); }); });
  let maxrel = 0; const rel = [0, 1, 2].map(function (i) { const r = (mc.S[i][i] - pr.S[i][i]) / pr.S[i][i]; maxrel = Math.max(maxrel, Math.abs(r)); return r; });
  const mOut = kIsAng(to) ? kMPerDeg(to, pr.out, E) : null, mIn = angIn ? kMPerDeg(from, x, E) : null;
  const inM = function (i) { return so.u[i] !== '°' ? '' : C.fmt(sig[i] * mOut[i], 6) + ' m'; };
  const sIn = function (i) { const sv = Math.sqrt(S[i][i]); return si.u[i] === '°' ? C.fmt(sv, 6) + '° <small>= ' + C.fmt(sv * mIn[i], 5) + ' m</small>' : C.fmt(sv, 6) + ' m'; };
  const dec = function (i) { return so.u[i] === '°' ? 10 : 4; };
  let html = '<div class="tw"><table class="mt res"><tr><th></th><th>hodnota</th><th>σ vstup</th><th>σ analyticky</th><th>σ v metroch</th><th>σ Monte Carlo</th><th>rozdiel rozptylu</th></tr>';
  for (let i = 0; i < 3; i++) html += '<tr><th>' + so.n[i] + ' [' + so.u[i] + ']</th><td class="cpy">' + C.fx(pr.out[i], dec(i)) + '</td><td>' + sIn(i) + ' <small>(' + si.n[i] + ')</small></td><td class="cpy">' + C.fmt(sig[i], 8) + '</td><td>' + inM(i) + '</td><td>' + C.fmt(sigm[i], 8) + '</td><td>' + (rel[i] * 100).toFixed(2) + ' %</td></tr>';
  html += '</table></div><p class="note">Najväčší relatívny rozdiel analytického a Monte Carlo rozptylu: <b>' + (maxrel * 100).toFixed(2) + ' %</b> pri ' + nS + ' vzorkách (očakávaný šum ≈ ' + (Math.sqrt(2 / nS) * 100).toFixed(1) + ' %).' +
    (to === 'enu' || from === 'enu' ? ' Počiatok ENU: φ₀ = ' + C.fx(org[0] * C.R2D, 8) + '°, λ₀ = ' + C.fx(org[1] * C.R2D, 8) + '°, h₀ = ' + C.fx(org[2], 3) + ' m.' : '') + '</p>';
  const nm = so.n;
  html += '<div class="mats"><div><h4>Kovariančná matica (analyticky)</h4><div class="tw">' + matTable(pr.S, nm, function (xx) { return '<span class="cpy">' + C.fmt(xx, 8) + '</span>'; }) + '</div></div>' +
    '<div><h4>Korelačná matica</h4><div class="tw">' + matTable(corr, nm, function (xx) { return xx.toFixed(5); }) + '</div></div>' +
    '<div><h4>Jakobián ∂(' + nm.join(',') + ')/∂(' + si.n.join(',') + ')</h4><div class="tw">' + matTable(pr.J, nm, function (xx) { return C.fmt(xx, 7); }) + '</div></div></div>';
  out.innerHTML = kWarn + html;
  kRes = { mc: mc, Sa: pr.S, mean: pr.out, names: so.n, fac: so.u.map(function (u, i) { return u === '°' ? mOut[i] : 1; }), units: ['m', 'm', 'm'], p: p,
    cap: from.toUpperCase() + ' → ' + to.toUpperCase() + ' · ' + F.k_ell.value + ' · elipsy p = ' + p + ' · Monte Carlo n = ' + nS, file: 'abakus_kovariancia_' + from + '_' + to + '.png' };
  kDraw();
}
function kDraw(o) {
  o = o || {};
  const cv = o.canvas || $('#k_cv'), Wc = o.W || Math.max(300, Math.min(960, cv.parentElement.clientWidth || 900)), dpr = o.dpr || window.devicePixelRatio || 1, capH = o.canvas ? 52 : 0;
  if (!o.canvas) { cv.style.width = Wc + 'px'; cv.style.height = Wc + 'px'; }
  cv.width = Wc * dpr; cv.height = (Wc + capH) * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wc, Wc + capH);
  if (o.canvas) { g.fillStyle = css('--surface'); g.fillRect(0, 0, Wc, Wc + capH); }
  if (!kRes) return;
  const col = { ink: css('--ink'), mut: css('--muted'), line: css('--line'), an: css('--c-an'), em: css('--c-em'), he: css('--c-he'), pt: css('--c-pt') };
  const r = kRes, nS = r.mc.samples[0].length, cell = Wc / 3, pad = { l: 44, r: 10, t: 26, b: 26 }, kk = C.confScale(r.p), small = Wc < 560;
  const sa = [0, 1, 2].map(function (i) { return Math.sqrt(r.Sa[i][i]) * r.fac[i]; }), sm = [0, 1, 2].map(function (i) { return Math.sqrt(r.mc.S[i][i]) * r.fac[i]; });
  const lim = sa.map(function (s, i) { return Math.max(s, sm[i]) * Math.max(3.4, kk * 1.25); });
  const val = function (i, k) { return (r.mc.samples[i][k] - r.mean[i]) * r.fac[i]; };
  g.font = (small ? 9 : 11) + 'px ui-monospace, Consolas, monospace'; g.lineWidth = 1;
  const tick = function (x) { const a = Math.abs(x); return a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : a >= 1 ? x.toFixed(2) : x.toPrecision(2); };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x0 = j * cell + pad.l, y0 = i * cell + pad.t, w = cell - pad.l - pad.r, hh = cell - pad.t - pad.b;
    const X = function (vv) { return x0 + (vv + lim[j]) / (2 * lim[j]) * w; };
    g.strokeStyle = col.line; g.strokeRect(x0 + .5, y0 + .5, w, hh);
    g.fillStyle = col.mut; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(tick(-lim[j] * 0.8), X(-lim[j] * 0.8), y0 + hh + 4); g.fillText('0', X(0), y0 + hh + 4); g.fillText(tick(lim[j] * 0.8), X(lim[j] * 0.8), y0 + hh + 4);
    g.fillStyle = col.ink; g.textBaseline = 'bottom';
    g.save(); g.beginPath(); g.rect(x0, y0, w, hh); g.clip();
    let title = '';
    if (i === j) {
      const nb = 41, bins = new Array(nb).fill(0); for (let k = 0; k < nS; k++) { const b = Math.floor((val(i, k) + lim[i]) / (2 * lim[i]) * nb); if (b >= 0 && b < nb) bins[b]++; }
      const bw = 2 * lim[i] / nb, dens = bins.map(function (b) { return b / (nS * bw); }), top = Math.max(Math.max.apply(null, dens), 0.4 / Math.min(sa[i], sm[i])) * 1.08, Yd = function (d) { return y0 + hh - d / top * hh; };
      g.fillStyle = col.pt; for (let b = 0; b < nb; b++) g.fillRect(x0 + b / nb * w + .5, Yd(dens[b]), w / nb - 1, y0 + hh - Yd(dens[b]));
      [[sm[i], col.em], [sa[i], col.an]].forEach(function (sc) { g.strokeStyle = sc[1]; g.lineWidth = 1.8; g.beginPath(); for (let q = 0; q <= 120; q++) { const xv = -lim[i] + q / 120 * 2 * lim[i], d = Math.exp(-xv * xv / (2 * sc[0] * sc[0])) / (sc[0] * Math.sqrt(2 * Math.PI)); q ? g.lineTo(X(xv), Yd(d)) : g.moveTo(X(xv), Yd(d)); } g.stroke(); });
      title = 'Δ' + r.names[i] + ' [' + r.units[i] + ']  σ = ' + C.fmt(sa[i], 4) + (small ? '' : '  MC ' + C.fmt(sm[i], 4));
    } else {
      const Y = function (vv) { return y0 + hh - (vv + lim[i]) / (2 * lim[i]) * hh; };
      g.fillStyle = col.pt; const np = Math.min(nS, 2500); for (let k = 0; k < np; k++) g.fillRect(X(val(j, k)) - 1, Y(val(i, k)) - 1, 2, 2);
      const fi = r.fac[i], fj = r.fac[j], cxx = r.Sa[j][j] * fj * fj, cyy = r.Sa[i][i] * fi * fi, cxy = r.Sa[i][j] * fi * fj;
      if (i > j) {
        const ell = function (sxx, syy, sxy, colr, dash) { const e = C.errEllipse(sxx, syy, sxy); g.strokeStyle = colr; g.lineWidth = 1.8; g.setLineDash(dash || []); g.beginPath();
          for (let q = 0; q <= 90; q++) { const t = q / 90 * 2 * Math.PI, ex = kk * (e.a * Math.cos(t) * Math.cos(e.theta) - e.b * Math.sin(t) * Math.sin(e.theta)), ey = kk * (e.a * Math.cos(t) * Math.sin(e.theta) + e.b * Math.sin(t) * Math.cos(e.theta)); q ? g.lineTo(X(ex), Y(ey)) : g.moveTo(X(ex), Y(ey)); } g.stroke(); g.setLineDash([]); };
        ell(r.mc.S[j][j] * fj * fj, r.mc.S[i][i] * fi * fi, r.mc.S[i][j] * fi * fj, col.em); ell(cxx, cyy, cxy, col.an);
        g.strokeStyle = col.he; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
        for (let q = 0; q <= 120; q++) { const al = q / 120 * 2 * Math.PI, rr = kk * C.helmertR(cxx, cyy, cxy, al); q ? g.lineTo(X(rr * Math.cos(al)), Y(rr * Math.sin(al))) : g.moveTo(X(rr * Math.cos(al)), Y(rr * Math.sin(al))); } g.stroke(); g.setLineDash([]);
        title = 'cov(' + r.names[j] + ',' + r.names[i] + ') = ' + C.fmt(r.Sa[i][j], 4);
      } else {
        const xs = new Array(nS), ys = new Array(nS); for (let k = 0; k < nS; k++) { xs[k] = val(j, k); ys[k] = val(i, k); }
        const pe = C.pearson(xs, ys); g.strokeStyle = col.he; g.lineWidth = 1.8; g.beginPath(); g.moveTo(X(-lim[j]), Y(pe.icpt - pe.slope * lim[j])); g.lineTo(X(lim[j]), Y(pe.icpt + pe.slope * lim[j])); g.stroke();
        title = 'r = ' + pe.r.toFixed(4) + (pe.p < 1e-15 ? '  p < 1e-15' : '  p = ' + ( pe.p < 1e-4 ? pe.p.toExponential(1) : pe.p.toFixed(4)));
      }
    }
    g.restore();
    g.fillStyle = col.ink; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(title, x0, y0 - 5);
    if (i !== j) { g.fillStyle = col.mut; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(tick(lim[i] * 0.8), x0 - 4, y0 + hh * 0.1); g.fillText('0', x0 - 4, y0 + hh / 2); g.fillText(tick(-lim[i] * 0.8), x0 - 4, y0 + hh * 0.9); }
  }
  if (o.canvas) {
    g.font = '13px ui-monospace, Consolas, monospace'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = col.ink; g.fillText(r.cap, pad.l, Wc + 12);
    let lx = pad.l; [[col.an, 'analyticky', []], [col.em, 'Monte Carlo', []], [col.he, 'Helmertova krivka / regresná priamka', [5, 4]]].forEach(function (L) {
      g.strokeStyle = L[0]; g.lineWidth = 2.5; g.setLineDash(L[2]); g.beginPath(); g.moveTo(lx, Wc + 34); g.lineTo(lx + 26, Wc + 34); g.stroke(); g.setLineDash([]);
      g.fillStyle = col.mut; g.fillText(L[1], lx + 32, Wc + 34); lx += 44 + g.measureText(L[1]).width; });
  }
}
const K_HELP = '<div class="tw"><table class="ut full"><thead><tr><th>systém</th><th>súradnice bodu</th><th>presnosť (kovariancie)</th><th>počet desatinných miest</th></tr></thead><tbody>' +
  '<tr><td class="mono">ECEF</td><td>X, Y, Z v metroch</td><td>všetko v m²</td><td>4 (= 0,1 mm)</td></tr>' +
  '<tr><td class="mono">GEOD</td><td>φ, λ v desatinných stupňoch, h v metroch. Ide aj <code>48 08 55.0</code> alebo <code>48°08′55″N</code>. λ kladná na východ.</td><td>C00, C01, C11 v deg² · C02, C12 v deg·m · C22 v m²</td><td>φ, λ: 9 až 10 (1·10⁻⁹° ≈ 0,1 mm) · h: 4</td></tr>' +
  '<tr><td class="mono">ENU</td><td>E, N, U v metroch voči počiatku. Počiatok (φ₀, λ₀, h₀) je povinný.</td><td>všetko v m²</td><td>4</td></tr>' +
  '<tr><td class="mono">SPHERE</td><td>geocentrická šírka a dĺžka v stupňoch, sprievodič R v metroch</td><td>ako GEOD (deg², deg·m, m²)</td><td>ako GEOD</td></tr></tbody></table></div>' +
  '<ul class="hl"><li><b>Najjednoduchší postup:</b> zadaj bod, prepni „Presnosť zadávam ako“ na <i>σ a korelácie</i> a jednotku uhlov na <i>metre</i>. Potom píšeš napr. σ = 0.012, 0.015, 0.030 a korelácie 0 až ±1. Na deg² si to apka prepočíta sama.</li>' +
  '<li><b>Mám σ, nie kovarianciu:</b> kovariancia C<sub>ij</sub> = ρ<sub>ij</sub>·σ<sub>i</sub>·σ<sub>j</sub>, na uhlopriečke C<sub>ii</sub> = σ<sub>i</sub>². Bez korelácií daj ρ = 0.</li>' +
  '<li><b>Riadok z LOKI:</b> vlož celý riadok <code>X;Y;Z;C00;C01;C02;C11;C12;C22</code> do poľa „Vložiť riadok“. Tri čísla = len bod.</li>' +
  '<li><b>Prepnutie vstupného systému</b> prepočíta bod aj maticu, netreba nič prepisovať ručne.</li>' +
  '<li><b>Kedy výsledku veriť:</b> rozdiel analytického a Monte Carlo rozptylu má byť do približne trojnásobku očakávaného šumu. Viac znamená príliš veľkú neistotu na linearizáciu.</li>' +
  '<li><b>Obrázok do správy:</b> prepni na svetlý režim (◐ Režim) a klikni Stiahnuť PNG.</li></ul>';
function cardCov(root) {
  root.append(h('div', { class: 'bar' }, [sel('k_from', 'vstupný systém', SYS_OPTS, 'ecef'), sel('k_to', 'výstupný systém', SYS_OPTS, 'geod'), sel('k_ell', 'elipsoid', ELL_OPTS, 'WGS84')]),
    h('details', { class: 'g help' }, [h('summary', { text: 'Ako zadať vstup: formát, jednotky, presnosť' }), h('div', { html: K_HELP })]),
    grp('Bod', [fld('k_v0', 'X', { u: 'm', val: '4074868.2239', text: true }), fld('k_v1', 'Y', { u: 'm', val: '1254192.6279', text: true }), fld('k_v2', 'Z', { u: 'm', val: '4728016.3177' }),
      fld('k_paste', 'Vložiť riadok (bod alebo bod + matica)', { wide: true, text: true, ph: 'X;Y;Z;C00;C01;C02;C11;C12;C22' })]),
    h('section', { class: 'g' }, [h('h3', { text: 'Presnosť vstupu' }),
      h('div', { class: 'grid' }, [sel('k_mode', 'presnosť zadávam ako', [['cov', 'kovariančnú maticu'], ['sig', 'σ a korelácie']], 'cov'), sel('k_sunit', 'jednotka σ pre uhly', [['m', 'metre'], ['sec', 'oblúkové sekundy'], ['deg', 'stupne']], 'm')]),
      h('div', { class: 'grid', style: 'margin-top:9px' }, [fld('k_c00', 'C00', { val: '1000', u: 'm²' }), fld('k_c01', 'C01', { val: '30', u: 'm²' }), fld('k_c02', 'C02', { val: '50', u: 'm²' }), fld('k_c11', 'C11', { val: '800', u: 'm²' }), fld('k_c12', 'C12', { val: '30', u: 'm²' }), fld('k_c22', 'C22', { val: '200', u: 'm²' })]),
      h('p', { class: 'note', id: 'k_mhint' })]),
    grp('Nastavenie', [fld('k_n', 'počet vzoriek Monte Carlo', { val: '10000' }), fld('k_p', 'hladina spoľahlivosti elipsy', { val: '0.95' }),
      fld('k_olat', 'počiatok ENU φ₀', { u: '°', text: true, ph: 'prázdne = bod' }), fld('k_olon', 'počiatok ENU λ₀', { u: '°', text: true, ph: 'prázdne = bod' }), fld('k_oh', 'počiatok ENU h₀', { u: 'm' })]),
    h('section', { class: 'g' }, [h('h3', { text: 'Výsledok' }), h('div', { id: 'k_out' })]),
    h('section', { class: 'g' }, [h('h3', { text: 'Panel 3 × 3 (odchýlky od transformovaného bodu)' }), h('div', { class: 'cvw' }, [h('canvas', { id: 'k_cv', role: 'img', 'aria-label': 'Histogramy, scatter grafy a elipsy chýb' })]),
      h('p', { class: 'legend', html: '<span class="sw an"></span> analyticky (Jakobián) <span class="sw em"></span> Monte Carlo <span class="sw he"></span> Helmertova krivka / regresná priamka' }),
      h('div', { class: 'bar', style: 'margin:10px 0 0' }, [btn('Stiahnuť PNG', function () { if (!kRes) { toast('Nie je čo uložiť'); return; } const cv = document.createElement('canvas'); kDraw({ canvas: cv, W: 1200, dpr: 2 }); download(cv, kRes.file); })]),
      h('p', { class: 'note', text: 'Uhlopriečka: histogram vzoriek a hustoty. Pod uhlopriečkou: elipsy chýb na zvolenej hladine a Helmertova krivka. Nad uhlopriečkou: regresná priamka, r a p-hodnota. Uhlové zložky (φ, λ) sú v grafe prepočítané na metre, aby mali všetky osi rovnakú jednotku.' })]),
    h('p', { class: 'note', text: 'Jakobián sa počíta numericky centrálnymi diferenciami (LOKI ho má analyticky). Výsledok je rovnaký na 7 a viac platných číslic.' }));
  const run = function () { clearTimeout(kTimer); kTimer = setTimeout(kCalc, 150); };
  root.addEventListener('input', function (e) { if (e.target.id !== 'k_paste') run(); });
  ['k_to', 'k_ell'].forEach(function (id) { F[id].addEventListener('change', run); });
  /* zmena spôsobu zápisu presnosti: hodnoty v poliach sa prepočítajú */
  const prev = { k_mode: 'cov', k_sunit: 'm', k_from: 'ecef' };
  ['k_mode', 'k_sunit'].forEach(function (id) {
    F[id].addEventListener('change', function () {
      const now = F[id].value, sys = F.k_from.value, E = C.ell(F.k_ell.value), x = kPoint(sys); let S = null;
      F[id].value = prev[id]; if (kPointOk(sys, x)) S = kReadS(sys, x, E); F[id].value = now; prev[id] = now;
      if (S && C.chol3(S)) kWriteS(S, sys, x, E);
      kLabels(); run();
    });
  });
  /* zmena vstupného systému: bod aj matica sa prepočítajú */
  F.k_from.addEventListener('change', function () {
    const old = prev.k_from, now = F.k_from.value; prev.k_from = now;
    try {
      const E = C.ell(F.k_ell.value), x = kPoint(old), S = kPointOk(old, x) ? kReadS(old, x, E) : null;
      if (old !== now && S && C.chol3(S)) {
        let org = null;
        if (v('k_olat') !== '' && v('k_olon') !== '') org = [ang('k_olat') * C.D2R, ang('k_olon') * C.D2R, nz('k_oh')];
        if (!org && old !== 'enu') { const x0 = C.sysTransform(x, old, 'ecef', E, null); org = C.ecef2geod(E, x0[0], x0[1], x0[2]); }
        if (org && !org.some(isNaN)) {
          const pr = C.propagate(x, S, old, now, E, org);
          [0, 1, 2].forEach(function (i) { F['k_v' + i].value = C.fx(pr.out[i], kIsAng(now) && i < 2 ? 10 : 4); });
          kWriteS(pr.S, now, pr.out, E);
          if (now === 'enu') { F.k_olat.value = C.fx(org[0] * C.R2D, 10); F.k_olon.value = C.fx(org[1] * C.R2D, 10); F.k_oh.value = C.fx(org[2], 4); }
          toast('Bod aj matica prepočítané do ' + now.toUpperCase());
        }
      }
    } catch (e) { }
    kLabels(); run();
  });
  F.k_paste.addEventListener('input', function () {
    const t = v('k_paste').split(/[;\s]+/).filter(Boolean).map(C.num);
    if ((t.length !== 3 && t.length !== 9) || t.some(isNaN)) { bad(['k_paste'], v('k_paste') !== ''); return; }
    [0, 1, 2].forEach(function (i) { F['k_v' + i].value = String(t[i]); });
    if (t.length === 9) { F.k_mode.value = 'cov'; prev.k_mode = 'cov'; K_IDS.forEach(function (id, i) { F[id].value = String(t[3 + i]); }); kLabels(); }
    F.k_paste.value = ''; bad(['k_paste'], false); toast(t.length === 9 ? 'Vložený bod aj matica' : 'Vložený bod'); run();
  });
  $('#k_out', root).addEventListener('click', function (e) { const t = e.target.closest('.cpy'); if (t) copy(t.textContent); });
  window.addEventListener('resize', function () { if (!$('#card-cov').hidden) kDraw(); });
}

/* ===================== KARTA ELIPSA CHÝB ===================== */
function xCalc(src) {
  let sx = n('x_sx'), sy = n('x_sy'), sxy = n('x_sxy'), rho = n('x_rho'); const p = n('x_p');
  if (src === 'x_rho') { sxy = rho * sx * sy; if (isFinite(sxy)) F.x_sxy.value = C.fmt(sxy, 10); } else { rho = sxy / (sx * sy); if (isFinite(rho)) setv('x_rho', C.fmt(rho, 8)); }
  const ok = sx > 0 && sy > 0 && isFinite(sxy) && Math.abs(rho) < 1 && p > 0 && p < 1;
  bad(['x_sx'], !(sx > 0)); bad(['x_sy'], !(sy > 0)); bad(['x_sxy', 'x_rho'], !(Math.abs(rho) < 1)); bad(['x_p'], !(p > 0 && p < 1));
  const svg = $('#x_svg'); if (!ok) { svg.innerHTML = ''; return; }
  const e = C.errEllipse(sx * sx, sy * sy, sxy), k = C.confScale(p), th = e.theta * C.R2D;
  setv('x_a', C.fmt(e.a, 10)); setv('x_b', C.fmt(e.b, 10)); setv('x_ap', C.fmt(e.a * k, 10)); setv('x_bp', C.fmt(e.b * k, 10)); setv('x_th', C.fx(C.wrap360(th) % 180, 6));
  setv('x_k', C.fmt(k, 10)); setv('x_sp', C.fmt(Math.hypot(sx, sy), 10)); setv('x_sm', C.fmt(Math.hypot(sx, sy) / Math.SQRT2, 10)); setv('x_p1', (100 * (1 - Math.exp(-0.5))).toFixed(2) + ' %');
  setv('x_area', C.fmt(Math.PI * e.a * e.b * k * k, 8));
  const L = Math.max(e.a * k, sx, sy) * 1.18, S = 360, X = function (xx) { return S / 2 + xx / L * (S / 2 - 26); }, Y = function (yy) { return S / 2 - yy / L * (S / 2 - 26); };
  const elp = function (kk) { let d = ''; for (let q = 0; q <= 120; q++) { const t = q / 120 * 2 * Math.PI, ex = kk * (e.a * Math.cos(t) * Math.cos(e.theta) - e.b * Math.sin(t) * Math.sin(e.theta)), ey = kk * (e.a * Math.cos(t) * Math.sin(e.theta) + e.b * Math.sin(t) * Math.cos(e.theta)); d += (q ? 'L' : 'M') + X(ex).toFixed(1) + ' ' + Y(ey).toFixed(1); } return d + 'Z'; };
  let hd = ''; for (let q = 0; q <= 180; q++) { const al = q / 180 * 2 * Math.PI, r = C.helmertR(sx * sx, sy * sy, sxy, al); hd += (q ? 'L' : 'M') + X(r * Math.cos(al)).toFixed(1) + ' ' + Y(r * Math.sin(al)).toFixed(1); }
  const ax = e.a * Math.cos(e.theta), ay = e.a * Math.sin(e.theta), bx = -e.b * Math.sin(e.theta), by = e.b * Math.cos(e.theta);
  svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
  svg.innerHTML = '<line class="gr" x1="14" x2="' + (S - 14) + '" y1="' + S / 2 + '" y2="' + S / 2 + '"/><line class="gr" y1="14" y2="' + (S - 14) + '" x1="' + S / 2 + '" x2="' + S / 2 + '"/>' +
    '<text class="tk" x="' + (S - 16) + '" y="' + (S / 2 - 6) + '" text-anchor="end">x</text><text class="tk" x="' + (S / 2 + 7) + '" y="22">y</text>' +
    '<rect class="box" x="' + X(-sx) + '" y="' + Y(sy) + '" width="' + (X(sx) - X(-sx)) + '" height="' + (Y(-sy) - Y(sy)) + '"/>' +
    '<path class="ep" d="' + elp(k) + '"/><path class="e1" d="' + elp(1) + '"/><path class="he" d="' + hd + 'Z"/>' +
    '<line class="axa" x1="' + X(-ax) + '" y1="' + Y(-ay) + '" x2="' + X(ax) + '" y2="' + Y(ay) + '"/><line class="axa" x1="' + X(-bx) + '" y1="' + Y(-by) + '" x2="' + X(bx) + '" y2="' + Y(by) + '"/>';
}
function cardEllipse(root) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'x_svg'; svg.setAttribute('class', 'plot sq'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Elipsa chýb a Helmertova krivka');
  root.append(h('div', { class: 'split' }, [h('div', {}, [
    grp('Vstup', [fld('x_sx', 'σx', { val: '0.030' }), fld('x_sy', 'σy', { val: '0.020' }), fld('x_sxy', 'kovariancia σxy', { val: '0.0003' }), fld('x_rho', 'korelácia ρ', {}), fld('x_p', 'hladina spoľahlivosti p', { val: '0.95' })],
      'Zadaj σxy alebo ρ, druhé sa dopočíta.'),
    grp('Elipsa chýb', [fld('x_a', 'hlavná poloos a (1σ)', { ro: 1 }), fld('x_b', 'vedľajšia poloos b (1σ)', { ro: 1 }), fld('x_th', 'natočenie a od osi x', { ro: 1, u: '°' }), fld('x_k', 'mierka pre p: √(−2 ln(1−p))', { ro: 1 }),
      fld('x_ap', 'a na hladine p', { ro: 1 }), fld('x_bp', 'b na hladine p', { ro: 1 }), fld('x_area', 'plocha elipsy na hladine p', { ro: 1 }), fld('x_p1', 'pravdepodobnosť elipsy 1σ', { ro: 1 })],
      'Natočenie sa meria od kladnej osi x smerom k osi y. Ak je x sever a y východ (geodetická konvencia), je to priamo smerník hlavnej osi.'),
    grp('Charakteristiky presnosti', [fld('x_sp', 'stredná polohová chyba √(σx² + σy²)', { ro: 1, wide: true }), fld('x_sm', 'stredná súradnicová chyba', { ro: 1 })])]),
  h('section', { class: 'g' }, [h('h3', { text: 'Graf' }), svg,
    h('p', { class: 'legend', html: '<span class="sw e1"></span> elipsa 1σ <span class="sw an"></span> elipsa na hladine p <span class="sw he"></span> Helmertova krivka (1σ) <span class="sw bx"></span> obdĺžnik ±σx, ±σy' }),
    h('div', { class: 'bar', style: 'margin:10px 0 0' }, [btn('Stiahnuť PNG', function () { svgToPng($('#x_svg'), 'abakus_elipsa_chyb.png', 'σx = ' + v('x_sx') + ' · σy = ' + v('x_sy') + ' · ρ = ' + C.fmt(n('x_rho'), 4) + ' · a = ' + C.fmt(n('x_a'), 5) + ' · b = ' + C.fmt(n('x_b'), 5) + ' · θ = ' + C.fmt(n('x_th'), 5) + '° · p = ' + v('x_p')); })])])]));
  root.addEventListener('input', function (e) { xCalc(e.target.id); }); xCalc();
}

/* ===================== KARTA JEDNOTKY A MIERKY ===================== */
function uCalc() {
  const cat = F.u_cat.value, val = n('u_val'), unit = F.u_unit.value, tb = $('#u_out'); bad(['u_val'], isNaN(val)); tb.innerHTML = ''; if (isNaN(val)) return;
  const base = C.toBase(cat, unit, val);
  Object.keys(C.UNITS[cat]).forEach(function (u) { const r = C.fmt(C.fromBase(cat, u, base), 12); tb.append(h('tr', { class: u === unit ? 'cur' : '' }, [h('td', { class: 'num cpy', text: r, title: 'Klik = skopírovať', onclick: function () { copy(r); } }), h('td', { text: u })])); });
  if (cat === 'uhol') { const r = C.fmt(base * C.R_MEAN, 10); tb.append(h('tr', {}, [h('td', { class: 'num cpy', text: r, onclick: function () { copy(r); } }), h('td', { text: 'm oblúka na Zemi (R = 6 371 km)' })])); }
  if (cat === 'čas') { const r = C.fmt(base * C.C_LIGHT, 12); tb.append(h('tr', {}, [h('td', { class: 'num cpy', text: r, onclick: function () { copy(r); } }), h('td', { text: 'm (dráha svetla)' })])); }
}
function uUnits() { const cat = F.u_cat.value; F.u_unit.innerHTML = ''; Object.keys(C.UNITS[cat]).forEach(function (u) { F.u_unit.append(h('option', { value: u, text: u })); }); }
function sCalc(src) {
  const M = n('s_m'); bad(['s_m'], !(M > 0)); if (!(M > 0)) return;
  if (src === 's_real') { const r = n('s_real'); if (isFinite(r)) F.s_map.value = C.fmt(r / M * 1000, 8); } else { const m = n('s_map'); if (isFinite(m)) setv('s_real', C.fmt(m * M / 1000, 10)); }
  if (src === 's_areal') { const r = n('s_areal'); if (isFinite(r)) F.s_amap.value = C.fmt(r / (M * M) * 1e4, 8); } else { const a = n('s_amap'); if (isFinite(a)) { setv('s_areal', C.fmt(a * M * M / 1e4, 10)); } }
  const ar = n('s_areal'); setv('s_aha', isFinite(ar) ? C.fmt(ar / 1e4, 10) : '');
  setv('s_1cm', C.fmt(M / 100, 10) + ' m'); setv('s_1km', C.fmt(1e6 / M, 8) + ' mm');
}
function bCalc(src) {
  let db = n('b_db');
  if (src === 'b_pw') { db = 10 * Math.log10(n('b_pw')); if (isFinite(db)) F.b_db.value = C.fmt(db, 10); } else if (src === 'b_am') { db = 20 * Math.log10(n('b_am')); if (isFinite(db)) F.b_db.value = C.fmt(db, 10); }
  if (!isFinite(db)) return; if (src !== 'b_pw') setv('b_pw', C.fmt(Math.pow(10, db / 10), 10)); if (src !== 'b_am') setv('b_am', C.fmt(Math.pow(10, db / 20), 10));
}
function cardUnits(root) {
  root.append(h('div', { class: 'split' }, [
    h('section', { class: 'g' }, [h('h3', { text: 'Jednotky' }), h('div', { class: 'grid' }, [sel('u_cat', 'veličina', Object.keys(C.UNITS), 'rýchlosť'), fld('u_val', 'hodnota', { val: '120' }), sel('u_unit', 'jednotka', [], null)]),
      h('div', { class: 'tw' }, [h('table', { class: 'ut' }, [h('tbody', { id: 'u_out' })])])]),
    h('div', {}, [
      grp('Mierka mapy', [fld('s_m', 'mierka 1 :', { val: '25000' }), fld('s_map', 'dĺžka na mape', { u: 'mm', val: '10' }), fld('s_real', 'dĺžka v skutočnosti', { u: 'm' }), fld('s_amap', 'plocha na mape', { u: 'cm²', val: '1' }), fld('s_areal', 'plocha v skutočnosti', { u: 'm²' }), fld('s_aha', 'plocha v skutočnosti', { ro: 1, u: 'ha' }),
        fld('s_1cm', '1 cm na mape', { ro: 1 }), fld('s_1km', '1 km na mape', { ro: 1 })]),
      grp('Decibely', [fld('b_db', 'úroveň', { u: 'dB', val: '3' }), fld('b_pw', 'pomer výkonov', {}), fld('b_am', 'pomer amplitúd', {})])])]));
  uUnits(); F.u_unit.value = 'km/h';
  F.u_cat.addEventListener('change', function () { uUnits(); uCalc(); }); F.u_unit.addEventListener('change', uCalc); F.u_val.addEventListener('input', uCalc);
  ['s_m', 's_map', 's_real', 's_amap', 's_areal'].forEach(function (id) { F[id].addEventListener('input', function () { sCalc(id); }); });
  ['b_db', 'b_pw', 'b_am'].forEach(function (id) { F[id].addEventListener('input', function () { bCalc(id); }); });
  uCalc(); sCalc(); bCalc();
}

/* ===================== KARTA GNSS ===================== */
function gCalc(src) {
  if (src === 'g_l') { const l = n('g_l'); if (l > 0) F.g_f.value = C.fmt(C.C_LIGHT / l / 1e6, 12); } else { const f = n('g_f'); if (f > 0) setv('g_l', C.fmt(C.C_LIGHT / (f * 1e6), 12)); }
  if (src === 'g_d') { const d = n('g_d'); if (isFinite(d)) F.g_t.value = C.fmt(d / C.C_LIGHT * 1e9, 12); } else { const t = n('g_t'); if (isFinite(t)) setv('g_d', C.fmt(t * 1e-9 * C.C_LIGHT, 12)); }
  const f1 = +F.g_s1.value, f2 = +F.g_s2.value;
  if (f1 !== f2) { const c = C.gnssCombo(f1, f2); setv('g_wl', C.fx(c.wl, 6)); setv('g_nl', C.fx(c.nl, 6)); setv('g_ifa', C.fmt(c.a, 10)); setv('g_ifb', C.fmt(c.b, 10)); setv('g_ifn', C.fmt(c.noise, 6)); setv('g_gam', C.fmt(f1 * f1 / (f2 * f2), 10)); }
  else ['g_wl', 'g_nl', 'g_ifa', 'g_ifb', 'g_ifn', 'g_gam'].forEach(function (id) { setv(id, '—'); });
  const k = n('g_k'); bad(['g_k'], !(k >= -7 && k <= 6)); if (k >= -7 && k <= 6) { const a = 1602 + k * 0.5625, b = 1246 + k * 0.4375; setv('g_g1', C.fmt(a, 9) + ' MHz · ' + C.fx(C.C_LIGHT / a / 1e4, 4) + ' cm'); setv('g_g2', C.fmt(b, 9) + ' MHz · ' + C.fx(C.C_LIGHT / b / 1e4, 4) + ' cm'); }
}
function cardGnss(root) {
  const so = C.GNSS_SIGNALS.map(function (s) { return [s[2], s[0] + ' ' + s[1] + ' (' + s[2] + ')']; });
  const tb = h('tbody', {}, C.GNSS_SIGNALS.map(function (s) { const l = C.fx(C.C_LIGHT / s[2] / 1e4, 4), f = String(s[2]);
    return h('tr', {}, [h('td', { text: s[0] }), h('td', { text: s[1] }), h('td', { class: 'num cpy', text: f, onclick: function () { copy(f); } }), h('td', { class: 'num cpy', text: l, onclick: function () { copy(l); } }), h('td', { class: 'num', text: C.fmt(s[2] / 10.23, 8) })]); }));
  root.append(h('div', { class: 'split' }, [
    h('section', { class: 'g' }, [h('h3', { text: 'Signály' }), h('div', { class: 'tw' }, [h('table', { class: 'ut full' }, [h('thead', { html: '<tr><th>systém</th><th>signál</th><th>f [MHz]</th><th>λ [cm]</th><th>× 10,23 MHz</th></tr>' }), tb])])]),
    h('div', {}, [
      grp('Frekvencia ↔ vlnová dĺžka', [fld('g_f', 'frekvencia', { u: 'MHz', val: '1575.42' }), fld('g_l', 'vlnová dĺžka', { u: 'm' })]),
      grp('Čas ↔ vzdialenosť (c)', [fld('g_t', 'čas', { u: 'ns', val: '1' }), fld('g_d', 'vzdialenosť', { u: 'm' })]),
      h('section', { class: 'g' }, [h('h3', { text: 'Kombinácie dvoch frekvencií' }), h('div', { class: 'grid' }, [sel('g_s1', 'f₁', so, 1575.42), sel('g_s2', 'f₂', so, 1227.6),
        fld('g_wl', 'wide-lane λ', { ro: 1, u: 'm' }), fld('g_nl', 'narrow-lane λ', { ro: 1, u: 'm' }), fld('g_ifa', 'iono-free koef. pri f₁', { ro: 1 }), fld('g_ifb', 'iono-free koef. pri f₂', { ro: 1 }), fld('g_ifn', 'zosilnenie šumu IF', { ro: 1 }), fld('g_gam', 'γ = f₁²/f₂²', { ro: 1 })])]),
      grp('GLONASS FDMA', [fld('g_k', 'číslo kanála k (−7 … 6)', { val: '0' }), fld('g_g1', 'G1', { ro: 1 }), fld('g_g2', 'G2', { ro: 1 })])])]));
  ['g_f', 'g_l', 'g_t', 'g_d', 'g_k'].forEach(function (id) { F[id].addEventListener('input', function () { gCalc(id); }); });
  ['g_s1', 'g_s2'].forEach(function (id) { F[id].addEventListener('change', function () { gCalc(); }); });
  gCalc();
}

/* ===================== KARTA KURZY ===================== */
let FX = store('fx') || null, fxLoaded = false;
const FX_MAIN = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'HUF', 'JPY', 'SEK', 'NOK', 'CAD'];
function fxRender() {
  const st = $('#f_status'), tb = $('#f_tab'); tb.innerHTML = '';
  if (!FX) { st.textContent = 'Kurzy nie sú načítané. Zadaj kurz ručne nižšie alebo skús Načítať.'; }
  else {
    st.textContent = 'Kurzy platné k ' + FX.date + ' · zdroj: ' + FX.src + (FX.stale ? ' · uložené z minula (teraz sa nepodarilo načítať)' : '');
    const cur = Object.keys(FX.rates).sort(function (a, b) { const ia = FX_MAIN.indexOf(a), ib = FX_MAIN.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
    const keep = [F.f_from.value || 'EUR', F.f_to.value || 'CZK'];
    [F.f_from, F.f_to].forEach(function (s, i) { s.innerHTML = ''; ['CZK'].concat(cur).forEach(function (c) { s.append(h('option', { value: c, text: c })); }); s.value = keep[i]; if (!s.value) s.value = i ? 'CZK' : 'EUR'; });
    cur.forEach(function (c) { const r = C.fmt(FX.rates[c], 8), inv = C.fmt(1 / FX.rates[c], 6); tb.append(h('tr', {}, [h('td', { text: '1 ' + c }), h('td', { class: 'num cpy', text: r, onclick: function () { copy(r); } }), h('td', { text: 'CZK' }), h('td', { class: 'num', text: '1 CZK = ' + inv + ' ' + c })])); });
  }
  fxCalc();
}
function fxCalc() {
  if (!FX) { setv('f_res', ''); return; }
  const a = n('f_amt'), fr = F.f_from.value, to = F.f_to.value, r = function (c) { return c === 'CZK' ? 1 : FX.rates[c]; }; bad(['f_amt'], isNaN(a)); if (isNaN(a) || !r(fr) || !r(to)) return;
  setv('f_res', C.fmt(+(a * r(fr) / r(to)).toFixed(4)) + ' ' + to); setv('f_rate', '1 ' + fr + ' = ' + C.fmt(r(fr) / r(to), 8) + ' ' + to);
}
function fxSet(date, rates, src) { FX = { date: date, rates: rates, src: src }; store('fx', FX); fxRender(); }
function fxLoad() {
  $('#f_status').textContent = 'Načítavam…';
  const j = function (url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  const viaServer = function () { if (location.protocol.indexOf('http') !== 0) return Promise.reject(); return j('/api/kurzy').then(function (d) { if (!d.rates) throw 0; fxSet(d.date, d.rates, 'ČNB'); }); };
  const viaCnb = function () { return j('https://api.cnb.cz/cnbapi/exrates/daily?lang=EN').then(function (d) { const r = {}; d.rates.forEach(function (x) { r[x.currencyCode] = x.rate / x.amount; }); fxSet(d.rates[0].validFor, r, 'ČNB'); }); };
  const viaEcb = function () { return j('https://api.frankfurter.dev/v1/latest?base=EUR').then(function (d) { const czk = d.rates.CZK, r = { EUR: czk }; for (const c in d.rates) if (c !== 'CZK') r[c] = czk / d.rates[c]; fxSet(d.date, r, 'ECB (frankfurter.dev)'); }); };
  viaServer().catch(viaCnb).catch(viaEcb).catch(function () { if (FX) FX.stale = true; fxRender(); if (!FX) $('#f_status').textContent = 'Kurzy sa nepodarilo načítať (bez internetu alebo blokované). Zadaj kurz ručne.'; });
}
function cardFx(root) {
  root.append(h('div', { class: 'bar' }, [btn('Načítať kurzy', fxLoad, 'pri'), h('span', { id: 'f_status', class: 'status' })]),
    h('div', { class: 'split' }, [h('div', {}, [
      h('section', { class: 'g' }, [h('h3', { text: 'Prepočet' }), h('div', { class: 'grid' }, [fld('f_amt', 'suma', { val: '100' }), sel('f_from', 'z meny', ['EUR', 'CZK'], 'EUR'), sel('f_to', 'do meny', ['CZK', 'EUR'], 'CZK'), fld('f_res', 'výsledok', { ro: 1 }), fld('f_rate', 'kurz', { ro: 1, wide: true })])]),
      grp('Ručný kurz (keď nie je internet)', [fld('f_meur', '1 EUR v CZK', {}), fld('f_musd', '1 USD v CZK', {}), h('div', { class: 'f' }, [h('label', { text: ' ' }), btn('Použiť', function () {
        const e = n('f_meur'), u = n('f_musd'), r = {}; if (e > 0) r.EUR = e; if (u > 0) r.USD = u; if (!Object.keys(r).length) return; fxSet(new Date().toISOString().slice(0, 10), r, 'ručne zadané'); })])])]),
    h('section', { class: 'g' }, [h('h3', { text: 'Kurzový lístok' }), h('div', { class: 'tw' }, [h('table', { class: 'ut full' }, [h('tbody', { id: 'f_tab' })])])])]),
    h('p', { class: 'note', text: 'Kurzy devízového trhu ČNB (stred), vyhlasované v pracovné dni okolo 14:30. Jediná časť Abakusu, ktorá potrebuje internet.' }));
  root.addEventListener('input', fxCalc); [F.f_from, F.f_to].forEach(function (s) { s.addEventListener('change', fxCalc); });
  fxRender();
}

/* ===================== KARTA KONŠTANTY ===================== */
function cardConst(root) {
  const tb = h('tbody', {}, C.CONSTANTS.map(function (c) { const val = C.fmt(c[1], 16); return h('tr', {}, [h('td', { class: 'mono', text: c[0] }), h('td', { class: 'num cpy', text: val, title: 'Klik = skopírovať', onclick: function () { copy(val); } }), h('td', { text: c[2] }), h('td', { text: c[3] })]); }));
  root.append(h('section', { class: 'g' }, [h('h3', { text: 'Konštanty' }), h('p', { class: 'note', text: 'Klik na hodnotu ju skopíruje. Názvy v prvom stĺpci fungujú aj v príkazovom riadku, napr. 2*pi*a_WGS84 alebo sqrt(GM_WGS84/26560e3^3).' }),
    h('div', { class: 'tw' }, [h('table', { class: 'ut full' }, [h('thead', { html: '<tr><th>názov</th><th>hodnota</th><th>jednotka</th><th>popis</th></tr>' }), tb])])]),
    h('section', { class: 'g' }, [h('h3', { text: 'Priestupné sekundy (TAI − UTC)' }), h('div', { class: 'tw' }, [h('table', { class: 'ut' }, [h('thead', { html: '<tr><th>platí od</th><th>TAI − UTC</th><th>GPST − UTC</th></tr>' }),
      h('tbody', {}, C.LEAPS.slice().reverse().map(function (l) { return h('tr', {}, [h('td', { class: 'mono', text: l[0] + '-' + C.pad(l[1]) + '-01' }), h('td', { class: 'num', text: l[2] + ' s' }), h('td', { class: 'num', text: (l[2] - 19) + ' s' })]); }))])])]));
}

/* ===================== ŠTART ===================== */
const CARDS = [['time', 'Čas', cardTime], ['coord', 'Súradnice', cardCoord], ['two', 'Dva body', cardTwo], ['batch', 'Hromadný prevod', cardBatch], ['frame', 'Rámce', cardFrame], ['ell', 'Elipsoid', cardEll], ['cov', 'Kovariancia', cardCov], ['ellipse', 'Elipsa chýb', cardEllipse],
  ['units', 'Jednotky a mierky', cardUnits], ['gnss', 'GNSS', cardGnss], ['fx', 'Kurzy', cardFx], ['const', 'Konštanty', cardConst]];
function show(id) {
  CARDS.forEach(function (c) { $('#card-' + c[0]).hidden = c[0] !== id; $('#tab-' + c[0]).setAttribute('aria-selected', c[0] === id ? 'true' : 'false'); });
  store('tab', id);
  if (id === 'cov') { if (!kRes) kCalc(); else kDraw(); }
  if (id === 'fx' && !fxLoaded) { fxLoaded = true; fxLoad(); }
}
function clock() { const t = C.timeAll(Date.now()); $('#clock').textContent = t.utc.slice(0, 16) + ' UTC · DOY ' + C.pad(t.doy, 3) + ' · MJD ' + Math.floor(t.mjd) + ' · GPS ' + t.week + '/' + t.gpsDow; }
function theme(set) {
  const cur = document.documentElement.getAttribute('data-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = set || (cur === 'dark' ? 'light' : 'dark'); document.documentElement.setAttribute('data-theme', next); store('theme', next);
  if (kRes && !$('#card-cov').hidden) kDraw();
}
function init() {
  const th = store('theme'); if (th) document.documentElement.setAttribute('data-theme', th);
  const tabs = $('#tabs'), main = $('#cards');
  CARDS.forEach(function (c) {
    tabs.append(h('button', { id: 'tab-' + c[0], role: 'tab', type: 'button', text: c[1], onclick: function () { show(c[0]); } }));
    const sec = h('div', { id: 'card-' + c[0], class: 'card', role: 'tabpanel', hidden: '' }); main.append(sec);
    try { c[2](sec); } catch (e) { sec.append(h('p', { class: 'err', text: 'Chyba karty: ' + e.message })); console.error(e); }
  });
  kLabels();
  $('#themebtn').addEventListener('click', function () { theme(); });
  if (location.protocol.indexOf('http') === 0) { const b = $('#offbtn'); b.hidden = false; b.addEventListener('click', function () { if (!confirm('Vypnúť Abakus? Server sa zastaví, stránku potom zatvor.')) return; fetch('/api/vypnut', { method: 'POST' }).then(function () { document.body.innerHTML = '<p style="padding:40px;font:16px system-ui">Abakus je vypnutý. Kartu môžeš zatvoriť.</p>'; }, function () { }); }); }
  replInit(); clock(); setInterval(clock, 20000);
  const t0 = store('tab'); show(CARDS.some(function (c) { return c[0] === t0; }) ? t0 : 'time');
  $('#ver').textContent = 'v' + VERZIA;
  $('#cmd').focus();
}
document.addEventListener('DOMContentLoaded', init);
