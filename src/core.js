'use strict';
/* ===================== ABAKUS – výpočtové jadro (bez DOM) ===================== */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const C_LIGHT = 299792458;

/* ---------- elipsoidy ---------- */
const ELLIPSOIDS = {
  WGS84: { a: 6378137.0, invf: 298.257223563, pozn: 'GPS, globálny štandard' },
  GRS80: { a: 6378137.0, invf: 298.257222101, pozn: 'ETRS89, európske siete' },
  Bessel: { a: 6377397.155, invf: 299.1528128, pozn: 'S-JTSK' },
  Krasovsky: { a: 6378245.0, invf: 298.3, pozn: 'S-42' },
  Clarke1866: { a: 6378206.4, invf: 294.9786982, pozn: 'NAD27' }
};
function ell(name) {
  const E = ELLIPSOIDS[name] || ELLIPSOIDS.WGS84;
  const f = 1 / E.invf, b = E.a * (1 - f), e2 = f * (2 - f);
  return { name, a: E.a, invf: E.invf, f, b, e2, e: Math.sqrt(e2), ep2: e2 / (1 - e2), n: f / (2 - f) };
}

/* ---------- formátovanie a parsovanie čísel ---------- */
function num(s) {
  if (typeof s === 'number') return s;
  if (s == null) return NaN;
  s = String(s).trim().replace(/\s+/g, '').replace(',', '.').replace(/−/g, '-');
  if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}
function fmt(x, sig) {
  if (typeof x !== 'number') return String(x);
  if (!isFinite(x)) return isNaN(x) ? 'NaN' : (x > 0 ? '∞' : '-∞');
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (Number.isInteger(x) && ax < 1e15) return String(x);
  if (ax >= 1e15 || ax < 1e-6) return x.toExponential((sig || 12) - 1).replace(/\.?0+e/, 'e');
  let s = x.toPrecision(sig || 12);
  if (s.indexOf('e') >= 0) return String(parseFloat(s));
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
function fx(x, d) { return isFinite(x) ? x.toFixed(d) : 'NaN'; }
function pad(n, w) { return String(n).padStart(w || 2, '0'); }

/* uhol: "50.1", "50 05 12.3", "50°05'12.3\"N", "-14 25 0" -> stupne */
function parseAngle(str) {
  if (typeof str === 'number') return str;
  let s = String(str || '').trim().replace(/−/g, '-');
  if (!s) return NaN;
  let sign = 1;
  const hm = s.match(/[NSEW]/i);
  if (hm) { if (/[SW]/i.test(hm[0])) sign = -1; s = s.replace(/[NSEW]/ig, ' '); }
  if (/^\s*-/.test(s)) sign *= -1;
  if (!/[\s°'"′″dm:]/.test(s.trim())) { const v = num(s); return isNaN(v) ? NaN : (hm ? sign * Math.abs(v) : v); }
  const parts = s.replace(/,/g, '.').match(/\d+\.?\d*|\.\d+/g);
  if (!parts || parts.length > 3) return NaN;
  const p = parts.map(parseFloat);
  return sign * (p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600);
}
function fmtDMS(deg, dec) {
  if (!isFinite(deg)) return 'NaN';
  dec = dec == null ? 4 : dec;
  const sgn = deg < 0 ? '-' : '';
  let a = Math.abs(deg), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = (mf - m) * 60;
  const k = Math.pow(10, dec); s = Math.round(s * k) / k;
  if (s >= 60) { s -= 60; m += 1; } if (m >= 60) { m -= 60; d += 1; }
  return sgn + d + '° ' + pad(m) + '′ ' + (s < 10 ? '0' : '') + s.toFixed(dec) + '″';
}
function wrap180(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d === -180 ? 180 : d; }
function wrap360(d) { return ((d % 360) + 360) % 360; }

/* ===================== ČAS ===================== */
/* TAI-UTC [s] od daného dátumu (IERS Bulletin C). Posledná priestupná sekunda: 2017-01-01. */
const LEAPS = [[1972,1,10],[1972,7,11],[1973,1,12],[1974,1,13],[1975,1,14],[1976,1,15],[1977,1,16],[1978,1,17],
  [1979,1,18],[1980,1,19],[1981,7,20],[1982,7,21],[1983,7,22],[1985,7,23],[1988,1,24],[1990,1,25],[1991,1,26],
  [1992,7,27],[1993,7,28],[1994,7,29],[1996,1,30],[1997,7,31],[1999,1,32],[2006,1,33],[2009,1,34],[2012,7,35],
  [2015,7,36],[2017,1,37]];
const LEAP_T = LEAPS.map(function (l) { return [Date.UTC(l[0], l[1] - 1, 1), l[2]]; });
const DAY_MS = 86400000, GPS0 = Date.UTC(1980, 0, 6), MJD_UNIX = 40587;
const DNI = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
function taiUtc(ms) { let v = 10; for (let i = 0; i < LEAP_T.length; i++) { if (ms >= LEAP_T[i][0]) v = LEAP_T[i][1]; else break; } return v; }
function gpsUtc(ms) { return taiUtc(ms) - 19; }
function utcToGpsSec(ms) { return (ms - GPS0) / 1000 + gpsUtc(ms); }
function gpsSecToUtc(s) { let ms = GPS0 + s * 1000; for (let i = 0; i < 4; i++) ms = GPS0 + (s - gpsUtc(ms)) * 1000; return ms; }
function mjdToUtc(mjd) { return Math.round((mjd - MJD_UNIX) * DAY_MS); }
function utcToMjd(ms) { return MJD_UNIX + ms / DAY_MS; }
function ydoyToUtc(y, doy, sod) { return Date.UTC(y, 0, 1) + (doy - 1) * DAY_MS + Math.round((sod || 0) * 1000); }
function isoStr(ms) {
  if (!isFinite(ms)) return 'NaN';
  const d = new Date(ms); if (isNaN(d.getTime())) return 'NaN';
  let s = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' +
    pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  const msr = d.getUTCMilliseconds(); if (msr) s += '.' + pad(msr, 3);
  return s;
}
/* "2026-10-08", "2026-10-08 12:30:15.5", "2026-10-08T12:30", "8.10.2026 12:30", "2026/10/08" -> ms UTC | null */
function parseDateTime(str) {
  const s = String(str || '').trim();
  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}(?:[.,]\d+)?))?)?\s*(?:Z|UTC)?$/i);
  let y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}(?:[.,]\d+)?))?)?$/);
    if (!m) return null; d = +m[1]; mo = +m[2]; y = +m[3];
  }
  const hh = +(m[4] || 0), mi = +(m[5] || 0), ss = parseFloat(String(m[6] || 0).replace(',', '.'));
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 24 || mi > 59 || ss >= 61) return null;
  const ms = Date.UTC(y, mo - 1, d, hh, mi, 0) + Math.round(ss * 1000);
  if (new Date(Date.UTC(y, mo - 1, d)).getUTCDate() !== d) return null;
  return ms;
}
function isoWeek(ms) {
  const d = new Date(ms), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - y0) / DAY_MS + 1) / 7);
}
function timeAll(ms) {
  const d = new Date(ms), y = d.getUTCFullYear(), y0 = Date.UTC(y, 0, 1), y1 = Date.UTC(y + 1, 0, 1);
  const doy = Math.floor((ms - y0) / DAY_MS) + 1, sod = (ms - y0 - (doy - 1) * DAY_MS) / 1000;
  const gs = utcToGpsSec(ms), week = Math.floor(gs / 604800), sow = gs - week * 604800;
  const leap = taiUtc(ms);
  return {
    ms, utc: isoStr(ms), mjd: utcToMjd(ms), jd: utcToMjd(ms) + 2400000.5, year: y, doy, sod,
    gpsSec: gs, week, sow, gpsDow: Math.floor(sow / 86400), weekMod: ((week % 1024) + 1024) % 1024,
    unix: ms / 1000, dow: DNI[d.getUTCDay()], leap, gpsLeap: leap - 19,
    gpst: isoStr(ms + (leap - 19) * 1000), tai: isoStr(ms + leap * 1000),
    decYear: y + (ms - y0) / (y1 - y0), isoWeek: isoWeek(ms)
  };
}
function timeLines(ms) {
  const t = timeAll(ms);
  return [['UTC', t.utc + ' (' + t.dow + ')'], ['MJD', fmt(+t.mjd.toFixed(8))], ['JD', fmt(+t.jd.toFixed(8), 16)],
    ['rok DOY', t.year + ' ' + pad(t.doy, 3)], ['GPS týždeň, deň', t.week + ' ' + t.gpsDow], ['GPS SOW', fmt(+t.sow.toFixed(3))],
    ['GPS sekundy', fmt(+t.gpsSec.toFixed(3))], ['Unix', fmt(+t.unix.toFixed(3))], ['GPST', t.gpst], ['TAI', t.tai],
    ['GPST−UTC', t.gpsLeap + ' s']];
}

/* ===================== SÚRADNICE ===================== */
function geod2ecef(E, lat, lon, h) {
  const s = Math.sin(lat), c = Math.cos(lat), N = E.a / Math.sqrt(1 - E.e2 * s * s);
  return [(N + h) * c * Math.cos(lon), (N + h) * c * Math.sin(lon), (N * (1 - E.e2) + h) * s];
}
function ecef2geod(E, X, Y, Z) {
  const p = Math.hypot(X, Y), lon = Math.atan2(Y, X);
  if (p < 1e-9) { return [Z >= 0 ? Math.PI / 2 : -Math.PI / 2, 0, Math.abs(Z) - E.b]; }
  let lat = Math.atan2(Z, p * (1 - E.e2)), h = 0;
  for (let i = 0; i < 30; i++) {
    const s = Math.sin(lat), W = Math.sqrt(1 - E.e2 * s * s), N = E.a / W;
    h = p * Math.cos(lat) + Z * s - E.a * W;
    const nl = Math.atan2(Z, p * (1 - E.e2 * N / (N + h)));
    if (Math.abs(nl - lat) < 1e-15) { lat = nl; break; }
    lat = nl;
  }
  const s = Math.sin(lat);
  h = p * Math.cos(lat) + Z * s - E.a * Math.sqrt(1 - E.e2 * s * s);
  return [lat, lon, h];
}
function ecef2enu(d, lat0, lon0) {
  const sp = Math.sin(lat0), cp = Math.cos(lat0), sl = Math.sin(lon0), cl = Math.cos(lon0);
  return [-sl * d[0] + cl * d[1], -sp * cl * d[0] - sp * sl * d[1] + cp * d[2], cp * cl * d[0] + cp * sl * d[1] + sp * d[2]];
}
function enu2ecef(v, lat0, lon0) {
  const sp = Math.sin(lat0), cp = Math.cos(lat0), sl = Math.sin(lon0), cl = Math.cos(lon0);
  return [-sl * v[0] - sp * cl * v[1] + cp * cl * v[2], cl * v[0] - sp * sl * v[1] + cp * sl * v[2], cp * v[1] + sp * v[2]];
}
function enu2aes(v) { return [wrap360(Math.atan2(v[0], v[1]) * R2D), Math.atan2(v[2], Math.hypot(v[0], v[1])) * R2D, Math.hypot(v[0], v[1], v[2])]; }
function ecef2sphere(X, Y, Z) { return [Math.atan2(Z, Math.hypot(X, Y)), Math.atan2(Y, X), Math.hypot(X, Y, Z)]; }
function sphere2ecef(lat, lon, R) { return [R * Math.cos(lat) * Math.cos(lon), R * Math.cos(lat) * Math.sin(lon), R * Math.sin(lat)]; }

/* polomery krivosti a oblúk poludníka */
function radii(E, lat) {
  const s = Math.sin(lat), W = Math.sqrt(1 - E.e2 * s * s), N = E.a / W, M = E.a * (1 - E.e2) / (W * W * W);
  return { W, N, M, R: Math.sqrt(M * N), rp: N * Math.cos(lat) };
}
function meridianArc(E, lat) {
  const n = E.n, n2 = n * n, n3 = n2 * n, n4 = n3 * n;
  return E.a / (1 + n) * ((1 + n2 / 4 + n4 / 64) * lat - 1.5 * (n - n3 / 8) * Math.sin(2 * lat) +
    15 / 16 * (n2 - n4 / 4) * Math.sin(4 * lat) - 35 / 48 * n3 * Math.sin(6 * lat) + 315 / 512 * n4 * Math.sin(8 * lat));
}
/* normálne tiažové zrýchlenie GRS80 (Somigliana) + výšková redukcia */
function normalGravity(lat, h) {
  const E = ell('GRS80'), ge = 9.7803267715, k = 0.001931851353, m = 0.00344978600308;
  const s2 = Math.sin(lat) * Math.sin(lat), g0 = ge * (1 + k * s2) / Math.sqrt(1 - E.e2 * s2);
  h = h || 0;
  return { g0, gh: g0 * (1 - 2 / E.a * (1 + E.f + m - 2 * E.f * s2) * h + 3 * h * h / (E.a * E.a)) };
}

/* ---------- priečne Mercatorovo zobrazenie (Krüger, n-rad) -> UTM ---------- */
function tmFwd(E, lat, lon, lon0, k0, E0, N0) {
  const n = E.n, n2 = n * n, n3 = n2 * n, n4 = n3 * n, A = E.a / (1 + n) * (1 + n2 / 4 + n4 / 64);
  const al = [n / 2 - 2 * n2 / 3 + 5 * n3 / 16 + 41 * n4 / 180, 13 * n2 / 48 - 3 * n3 / 5 + 557 * n4 / 1440, 61 * n3 / 240 - 103 * n4 / 140, 49561 * n4 / 161280];
  const c = 2 * Math.sqrt(n) / (1 + n), t = Math.sinh(Math.atanh(Math.sin(lat)) - c * Math.atanh(c * Math.sin(lat)));
  const dl = lon - lon0, xi = Math.atan2(t, Math.cos(dl)), eta = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let x = eta, y = xi;
  for (let j = 1; j <= 4; j++) { x += al[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); y += al[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); }
  return [E0 + k0 * A * x, N0 + k0 * A * y];
}
function tmInv(E, x, y, lon0, k0, E0, N0) {
  const n = E.n, n2 = n * n, n3 = n2 * n, n4 = n3 * n, A = E.a / (1 + n) * (1 + n2 / 4 + n4 / 64);
  const be = [n / 2 - 2 * n2 / 3 + 37 * n3 / 96 - n4 / 360, n2 / 48 + n3 / 15 - 437 * n4 / 1440, 17 * n3 / 480 - 37 * n4 / 840, 4397 * n4 / 161280];
  const de = [2 * n - 2 * n2 / 3 - 2 * n3 + 116 * n4 / 45, 7 * n2 / 3 - 8 * n3 / 5 - 227 * n4 / 45, 56 * n3 / 15 - 136 * n4 / 35, 4279 * n4 / 630];
  const xi = (y - N0) / (k0 * A), eta = (x - E0) / (k0 * A);
  let xp = xi, ep = eta;
  for (let j = 1; j <= 4; j++) { xp -= be[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); ep -= be[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); }
  const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
  let lat = chi; for (let j = 1; j <= 4; j++) lat += de[j - 1] * Math.sin(2 * j * chi);
  return [lat, lon0 + Math.atan2(Math.sinh(ep), Math.cos(xp))];
}
function utmZone(lonDeg) { return Math.min(60, Math.max(1, Math.floor((wrap180(lonDeg) + 180) / 6) + 1)); }
function utmFwd(lat, lon, zone) {
  const E = ell('GRS80'); zone = zone || utmZone(lon * R2D);
  const en = tmFwd(E, lat, lon, (zone * 6 - 183) * D2R, 0.9996, 500000, lat < 0 ? 10000000 : 0);
  return { zone, hemi: lat < 0 ? 'S' : 'N', E: en[0], N: en[1] };
}
function utmInv(zone, hemi, x, y) { return tmInv(ell('GRS80'), x, y, (zone * 6 - 183) * D2R, 0.9996, 500000, /s/i.test(hemi) ? 10000000 : 0); }

/* ---------- Křovák (S-JTSK), elipsoid Bessel ---------- */
function mkKrovak(alSec) {
  const E = ell('Bessel'), e = E.e, e2 = E.e2;
  const phic = 49.5 * D2R, lon0 = (24 + 50 / 60) * D2R, alc = (30 + 17 / 60 + alSec / 3600) * D2R, phip = 78.5 * D2R, kp = 0.9999;
  const A = E.a * Math.sqrt(1 - e2) / (1 - e2 * Math.sin(phic) * Math.sin(phic));
  const B = Math.sqrt(1 + e2 * Math.pow(Math.cos(phic), 4) / (1 - e2));
  const g0 = Math.asin(Math.sin(phic) / B);
  const t0 = Math.tan(Math.PI / 4 + g0 / 2) * Math.pow((1 + e * Math.sin(phic)) / (1 - e * Math.sin(phic)), e * B / 2) / Math.pow(Math.tan(Math.PI / 4 + phic / 2), B);
  const n = Math.sin(phip), r0 = kp * A / Math.tan(phip);
  return { E, e, lon0, alc, phip, B, t0, n, r0 };
}
/* Modifikovaný Křovák (S-JTSK/05) používa rovnaké konštanty ako Křovák (kartografický pól 59°42'42,69689"), rovnako ako PROJ. */
const KROVAK = mkKrovak(17.30311), KROVAK05 = KROVAK;
/* Besselove φ, λ [rad] -> [Y, X] (kladné: Y na západ, X na juh) */
function krovakFwd(lat, lon, K) {
  K = K || KROVAK; const e = K.e;
  const U = 2 * (Math.atan(K.t0 * Math.pow(Math.tan(lat / 2 + Math.PI / 4), K.B) / Math.pow((1 + e * Math.sin(lat)) / (1 - e * Math.sin(lat)), e * K.B / 2)) - Math.PI / 4);
  const V = K.B * (K.lon0 - lon);
  const T = Math.asin(Math.cos(K.alc) * Math.sin(U) + Math.sin(K.alc) * Math.cos(U) * Math.cos(V));
  const D = Math.asin(Math.cos(U) * Math.sin(V) / Math.cos(T));
  const th = K.n * D, r = K.r0 * Math.pow(Math.tan(Math.PI / 4 + K.phip / 2), K.n) / Math.pow(Math.tan(T / 2 + Math.PI / 4), K.n);
  return [r * Math.sin(th), r * Math.cos(th)];
}
function krovakInv(Y, X, K) {
  K = K || KROVAK; const e = K.e, r = Math.hypot(X, Y), th = Math.atan2(Y, X), D = th / Math.sin(K.phip);
  const T = 2 * (Math.atan(Math.pow(K.r0 / r, 1 / K.n) * Math.tan(Math.PI / 4 + K.phip / 2)) - Math.PI / 4);
  const U = Math.asin(Math.cos(K.alc) * Math.sin(T) - Math.sin(K.alc) * Math.cos(T) * Math.cos(D));
  const V = Math.asin(Math.cos(T) * Math.sin(D) / Math.cos(U));
  let lat = U;
  for (let i = 0; i < 20; i++) {
    const nl = 2 * (Math.atan(Math.pow(K.t0, -1 / K.B) * Math.pow(Math.tan(U / 2 + Math.PI / 4), 1 / K.B) * Math.pow((1 + e * Math.sin(lat)) / (1 - e * Math.sin(lat)), e / 2)) - Math.PI / 4);
    if (Math.abs(nl - lat) < 1e-15) { lat = nl; break; } lat = nl;
  }
  return [lat, K.lon0 - V / K.B];
}
/* Helmert S-JTSK(Bessel) -> ETRS89/WGS84, 7 parametrov (position vector), presnosť ~1 m */
const JTSK_HELMERT = { T: [570.8, 85.7, 462.8], r: [4.998, 1.587, 5.261], s: 3.56 };
function helmertMat(P) {
  const k = D2R / 3600, rx = P.r[0] * k, ry = P.r[1] * k, rz = P.r[2] * k;
  return [[1, -rz, ry], [rz, 1, -rx], [-ry, rx, 1]];
}
function helmertFwd(P, X) { const R = helmertMat(P), m = 1 + P.s * 1e-6, v = mv(R, X); return [P.T[0] + m * v[0], P.T[1] + m * v[1], P.T[2] + m * v[2]]; }
function helmertInv(P, X) { const R = inv3(helmertMat(P)), m = 1 + P.s * 1e-6; return mv(R, [(X[0] - P.T[0]) / m, (X[1] - P.T[1]) / m, (X[2] - P.T[2]) / m]); }
/* ---- presná cesta ČÚZK: Helmert (S-JTSK/05) + modifikovaný Křovák + tabuľka table_-y-x_3_v1710, výšky CR-2005 ---- */
const CUZK_HELMERT = { T: [572.213, 85.334, 461.94], r: [4.9732, 1.529, 5.2484], s: 3.5378 };
function b64arr(b64, Type) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Type(u.buffer); }
let _grids = null;
function grids() {
  if (_grids !== null) return _grids;
  if (typeof GRIDS === 'undefined' || !GRIDS) { _grids = false; return _grids; }
  _grids = { yx: Object.assign({}, GRIDS.yx, { a: b64arr(GRIDS.yx.b64, Int16Array) }), cr: Object.assign({}, GRIDS.cr, { a: b64arr(GRIDS.cr.b64, Uint16Array) }) };
  return _grids;
}
function q3(t, f0, f1, f2) { const d0 = f1 - f0, d1 = f2 - f1; return f0 + t * d0 + 0.5 * t * (t - 1) * (d1 - d0); }
/* oprava [dE, dN] v m pre bod EPSG:5514 (E = −Y, N = −X); bikvadratická interpolácia 3×3 ako v PROJ; null mimo tabuľky */
function yxShift(E, N) {
  const G = grids(); if (!G) return null;
  const g = G.yx, fx = (E - g.e0) / g.d, fy = (g.n0 - N) / g.d;
  if (!(fx >= 0 && fy >= 0 && fx <= g.w - 1 && fy <= g.h - 1)) return null;
  const ci = Math.min(g.w - 2, Math.max(1, Math.round(fx))), cj = Math.min(g.h - 2, Math.max(1, Math.round(fy))), tx = fx - (ci - 1), ty = fy - (cj - 1), out = [0, 0];
  for (let b = 0; b < 2; b++) {
    const r = [];
    for (let j = 0; j < 3; j++) { const v = []; for (let i = 0; i < 3; i++) { const raw = g.a[((cj - 1 + j) * g.w + (ci - 1 + i)) * 2 + b]; if (raw === -32768) return null; v.push(raw * g.q); } r.push(q3(tx, v[0], v[1], v[2])); }
    out[b] = q3(ty, r[0], r[1], r[2]);
  }
  return out;
}
/* výška kvázigeoidu CR-2005 [m] nad GRS80; bilineárne; null mimo ČR */
function crZeta(latDeg, lonDeg) {
  const G = grids(); if (!G) return null;
  const g = G.cr, fx = (lonDeg - g.lon0) / g.dlon, fy = (g.lat0 - latDeg) / g.dlat;
  if (!(fx >= 0 && fy >= 0 && fx <= g.w - 1 && fy <= g.h - 1)) return null;
  const i = Math.min(g.w - 2, Math.floor(fx)), j = Math.min(g.h - 2, Math.floor(fy)), a = fx - i, b = fy - j, at = function (ii, jj) { return g.a[jj * g.w + ii] * g.q; };
  return (1 - a) * (1 - b) * at(i, j) + a * (1 - b) * at(i + 1, j) + (1 - a) * b * at(i, j + 1) + a * b * at(i + 1, j + 1);
}
function modDxDy(Xr, Yr) {
  const C1 = 2.946529277E-02, C2 = 2.515965696E-02, C3 = 1.193845912E-07, C4 = -4.668270147E-07, C5 = 9.233980362E-12, C6 = 1.523735715E-12, C7 = 1.696780024E-18, C8 = 4.408314235E-18, C9 = -8.331083518E-24, C10 = -3.689471323E-24;
  const X2 = Xr * Xr, Y2 = Yr * Yr, X4 = X2 * X2, Y4 = Y2 * Y2;
  return [C1 + C3 * Xr - C4 * Yr - 2 * C6 * Xr * Yr + C5 * (X2 - Y2) + C7 * Xr * (X2 - 3 * Y2) - C8 * Yr * (3 * X2 - Y2) + 4 * C9 * Xr * Yr * (X2 - Y2) + C10 * (X4 + Y4 - 6 * X2 * Y2),
    C2 + C3 * Yr + C4 * Xr + 2 * C5 * Xr * Yr + C6 * (X2 - Y2) + C8 * Xr * (X2 - 3 * Y2) + C7 * Yr * (3 * X2 - Y2) - 4 * C10 * Xr * Yr * (X2 - Y2) + C9 * (X4 + Y4 - 6 * X2 * Y2)];
}
function helmertInvT(P, X) { const R = tr(helmertMat(P)), m = 1 + P.s * 1e-6; return mv(R, [(X[0] - P.T[0]) / m, (X[1] - P.T[1]) / m, (X[2] - P.T[2]) / m]); }
/* ETRS89 φ, λ, h [rad, m] -> S-JTSK. acc: 'grid' (ČÚZK, cm) alebo 'helmert' (~1 m). H = výška Bpv (null mimo ČR). */
function etrs2jtsk(lat, lon, h, noGrid) {
  const GR = ell('GRS80'), z = crZeta(lat * R2D, lon * R2D), H = z === null ? null : h - z;
  if (!noGrid && grids()) {
    const xb = HINV(CUZK_HELMERT, geod2ecef(GR, lat, lon, h)), g = ecef2geod(KROVAK.E, xb[0], xb[1], xb[2]);
    const yx = krovakFwd(g[0], g[1], KROVAK05), d = modDxDy(yx[1] - 1089000, yx[0] - 654000), e = -(yx[0] - d[1]), n = -(yx[1] - d[0]), sh = yxShift(e, n);
    if (sh) return { Y: -(e - sh[0]), X: -(n - sh[1]), latB: g[0], lonB: g[1], hB: g[2], acc: 'grid', H: H, zeta: z };
  }
  const xb = helmertInv(JTSK_HELMERT, geod2ecef(GR, lat, lon, h)), g = ecef2geod(KROVAK.E, xb[0], xb[1], xb[2]), yx = krovakFwd(g[0], g[1]);
  return { Y: yx[0], X: yx[1], latB: g[0], lonB: g[1], hB: g[2], acc: 'helmert', H: H, zeta: z };
}
/* S-JTSK Y, X + elipsoidická výška h (ETRS89) -> [φ, λ, h] ETRS89; výsledok má .acc */
function jtsk2etrs(Y, X, h, noGrid) {
  const GR = ell('GRS80'); h = h || 0;
  const back = function (g, P) { let hB = h, r = null; for (let i = 0; i < 3; i++) { const xe = helmertFwd(P, geod2ecef(KROVAK.E, g[0], g[1], hB)); r = ecef2geod(GR, xe[0], xe[1], xe[2]); hB += h - r[2]; } return r; };
  const sh = (!noGrid && grids()) ? yxShift(-Y, -X) : null;
  if (sh) {
    const Ym = -(-Y + sh[0]), Xm = -(-X + sh[1]), d = modDxDy(Xm - 1089000, Ym - 654000), r = back(krovakInv(Ym + d[1], Xm + d[0], KROVAK05), CUZK_HELMERT);
    r.acc = 'grid'; return r;
  }
  const r = back(krovakInv(Y, X), JTSK_HELMERT); r.acc = 'helmert'; return r;
}
let HINV = helmertInvT;

/* ---- ITRF <-> ETRF, 14 parametrov (EPSG / EUREF TN-1); T [m], r [″], s [ppm], zmeny za rok, position vector ---- */
const FRAME_PAR = {
  'ITRF2020>ETRF2000': [0.0538, 0.0518, -0.0822, 0.002106, 0.01274, -0.020592, 0.00225, 0.0001, 0, -0.0017, 0.000081, 0.00049, -0.000792, 0.00011, 2015],
  'ITRF2020>ETRF2014': [-0.0014, -0.0009, 0.0014, 0.00221, 0.013806, -0.02002, -0.00042, 0, -0.0001, 0.0002, 0.000085, 0.000531, -0.00077, 0, 2015],
  'ITRF2020>ETRF2020': [0, 0, 0, 0.002236, 0.013494, -0.019578, 0, 0, 0, 0, 0.000086, 0.000519, -0.000753, 0, 2015],
  'ITRF2014>ETRF2000': [0.0547, 0.0522, -0.0741, 0.001701, 0.01029, -0.016632, 0.00212, 0.0001, 0.0001, -0.0019, 0.000081, 0.00049, -0.000792, 0.00011, 2010],
  'ITRF2014>ETRF2014': [0, 0, 0, 0.001785, 0.011151, -0.01617, 0, 0, 0, 0, 0.000085, 0.000531, -0.00077, 0, 2010],
  'ITRF2014>ETRF2020': [0.0014, 0.0009, -0.0014, 0.002236, 0.013494, -0.019578, 0.00042, 0, 0.0001, -0.0002, 0.000086, 0.000519, -0.000753, 0, 2015],
  'ITRF2008>ETRF2000': [0.0521, 0.0493, -0.0585, 0.000891, 0.00539, -0.008712, 0.00134, 0.0001, 0.0001, -0.0018, 0.000081, 0.00049, -0.000792, 0.00008, 2000],
  'ITRF2008>ETRF2014': [-0.0016, -0.0019, -0.0024, 0.001785, 0.011151, -0.01617, 0.00002, 0, 0, 0.0001, 0.000085, 0.000531, -0.00077, -0.00003, 2010],
  'ITRF2008>ETRF2020': [-0.0002, -0.001, -0.0033, 0.002236, 0.013494, -0.019578, 0.00029, 0, 0.0001, -0.0001, 0.000086, 0.000519, -0.000753, -0.00003, 2015]
};
const ITRFS = ['ITRF2020', 'ITRF2014', 'ITRF2008'], ETRFS = ['ETRF2000', 'ETRF2014', 'ETRF2020'];
function framePar(itrf, etrf, epoch) {
  const p = FRAME_PAR[itrf + '>' + etrf]; if (!p) return null; const dt = epoch - p[14];
  return { T: [p[0] + p[7] * dt, p[1] + p[8] * dt, p[2] + p[9] * dt], r: [p[3] + p[10] * dt, p[4] + p[11] * dt, p[5] + p[12] * dt], s: p[6] + p[13] * dt };
}
/* X [m] v rámci from v epoche epoch (desatinný rok) -> rámec to v tej istej epoche */
function frameTransform(X, from, to, epoch) {
  let P = framePar(from, to, epoch); if (P) return helmertFwd(P, X);
  P = framePar(to, from, epoch); if (P) return HINV(P, X);
  return null;
}

function inJtskArea(latDeg, lonDeg) { return latDeg > 47.5 && latDeg < 51.5 && lonDeg > 11.5 && lonDeg < 23; }

/* ---------- Web Mercator, LAEA (EPSG:3035), LCC (EPSG:3034) ---------- */
function webMercFwd(lat, lon) { const R = 6378137; return [R * lon, R * Math.log(Math.tan(Math.PI / 4 + lat / 2))]; }
function webMercInv(x, y) { const R = 6378137; return [2 * Math.atan(Math.exp(y / R)) - Math.PI / 2, x / R]; }
function laeaEurope(lat, lon) {
  const E = ell('GRS80'), e = E.e, e2 = E.e2, lat0 = 52 * D2R, lon0 = 10 * D2R;
  const q = function (p) { const s = Math.sin(p); return (1 - e2) * (s / (1 - e2 * s * s) - 1 / (2 * e) * Math.log((1 - e * s) / (1 + e * s))); };
  const qp = q(Math.PI / 2), b = Math.asin(q(lat) / qp), b0 = Math.asin(q(lat0) / qp), Rq = E.a * Math.sqrt(qp / 2);
  const D = E.a * (Math.cos(lat0) / Math.sqrt(1 - e2 * Math.sin(lat0) * Math.sin(lat0))) / (Rq * Math.cos(b0));
  const Bc = Rq * Math.sqrt(2 / (1 + Math.sin(b0) * Math.sin(b) + Math.cos(b0) * Math.cos(b) * Math.cos(lon - lon0)));
  return [4321000 + Bc * D * Math.cos(b) * Math.sin(lon - lon0), 3210000 + Bc / D * (Math.cos(b0) * Math.sin(b) - Math.sin(b0) * Math.cos(b) * Math.cos(lon - lon0))];
}
function lccEurope(lat, lon) {
  const E = ell('GRS80'), e = E.e, e2 = E.e2, lat0 = 52 * D2R, lon0 = 10 * D2R, p1 = 35 * D2R, p2 = 65 * D2R;
  const m = function (p) { return Math.cos(p) / Math.sqrt(1 - e2 * Math.sin(p) * Math.sin(p)); };
  const t = function (p) { return Math.tan(Math.PI / 4 - p / 2) / Math.pow((1 - e * Math.sin(p)) / (1 + e * Math.sin(p)), e / 2); };
  const n = (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2))), F = m(p1) / (n * Math.pow(t(p1), n));
  const r = E.a * F * Math.pow(t(lat), n), r0 = E.a * F * Math.pow(t(lat0), n), th = n * (lon - lon0);
  return [4000000 + r * Math.sin(th), 2800000 + r0 - r * Math.cos(th)];
}

/* ===================== GEODETICKÉ ÚLOHY ===================== */
function vincentyInv(E, lat1, lon1, lat2, lon2) {
  const f = E.f, a = E.a, b = E.b, L = lon2 - lon1;
  const U1 = Math.atan((1 - f) * Math.tan(lat1)), U2 = Math.atan((1 - f) * Math.tan(lat2));
  const sU1 = Math.sin(U1), cU1 = Math.cos(U1), sU2 = Math.sin(U2), cU2 = Math.cos(U2);
  let lam = L, sS, cS, sig, sA, c2A, c2sm, it = 0, ok = false;
  if (Math.abs(L) < 1e-15 && Math.abs(lat1 - lat2) < 1e-15) return { s: 0, az1: 0, az2: 0, ok: true, it: 0 };
  for (; it < 200; it++) {
    const sl = Math.sin(lam), cl = Math.cos(lam);
    sS = Math.sqrt(Math.pow(cU2 * sl, 2) + Math.pow(cU1 * sU2 - sU1 * cU2 * cl, 2));
    if (sS === 0) return { s: 0, az1: 0, az2: 0, ok: true, it };
    cS = sU1 * sU2 + cU1 * cU2 * cl; sig = Math.atan2(sS, cS);
    sA = cU1 * cU2 * sl / sS; c2A = 1 - sA * sA;
    c2sm = c2A !== 0 ? cS - 2 * sU1 * sU2 / c2A : 0;
    const C = f / 16 * c2A * (4 + f * (4 - 3 * c2A)), lp = lam;
    lam = L + (1 - C) * f * sA * (sig + C * sS * (c2sm + C * cS * (-1 + 2 * c2sm * c2sm)));
    if (Math.abs(lam - lp) < 1e-13) { ok = true; break; }
  }
  const u2 = c2A * (a * a - b * b) / (b * b);
  const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2))), B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const dS = B * sS * (c2sm + B / 4 * (cS * (-1 + 2 * c2sm * c2sm) - B / 6 * c2sm * (-3 + 4 * sS * sS) * (-3 + 4 * c2sm * c2sm)));
  const sl = Math.sin(lam), cl = Math.cos(lam);
  return { s: b * A * (sig - dS), az1: wrap360(Math.atan2(cU2 * sl, cU1 * sU2 - sU1 * cU2 * cl) * R2D),
    az2: wrap360(Math.atan2(cU1 * sl, -sU1 * cU2 + cU1 * sU2 * cl) * R2D + 180), ok, it };
}
function vincentyDir(E, lat1, lon1, az1, s) {
  const f = E.f, a = E.a, b = E.b, sa1 = Math.sin(az1), ca1 = Math.cos(az1);
  const tU1 = (1 - f) * Math.tan(lat1), cU1 = 1 / Math.sqrt(1 + tU1 * tU1), sU1 = tU1 * cU1;
  const s1 = Math.atan2(tU1, ca1), sA = cU1 * sa1, c2A = 1 - sA * sA, u2 = c2A * (a * a - b * b) / (b * b);
  const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2))), B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  let sig = s / (b * A), c2sm = 0, sS = 0, cS = 1;
  for (let i = 0; i < 200; i++) {
    c2sm = Math.cos(2 * s1 + sig); sS = Math.sin(sig); cS = Math.cos(sig);
    const dS = B * sS * (c2sm + B / 4 * (cS * (-1 + 2 * c2sm * c2sm) - B / 6 * c2sm * (-3 + 4 * sS * sS) * (-3 + 4 * c2sm * c2sm)));
    const ns = s / (b * A) + dS; if (Math.abs(ns - sig) < 1e-14) { sig = ns; break; } sig = ns;
  }
  c2sm = Math.cos(2 * s1 + sig); sS = Math.sin(sig); cS = Math.cos(sig);
  const tmp = sU1 * sS - cU1 * cS * ca1;
  const lat2 = Math.atan2(sU1 * cS + cU1 * sS * ca1, (1 - f) * Math.sqrt(sA * sA + tmp * tmp));
  const lam = Math.atan2(sS * sa1, cU1 * cS - sU1 * sS * ca1), C = f / 16 * c2A * (4 + f * (4 - 3 * c2A));
  const L = lam - (1 - C) * f * sA * (sig + C * sS * (c2sm + C * cS * (-1 + 2 * c2sm * c2sm)));
  return { lat: lat2, lon: lon1 + L, az2: wrap360(Math.atan2(sA, -tmp) * R2D + 180) };
}
const R_MEAN = 6371008.8;
function haversine(lat1, lon1, lat2, lon2, R) {
  const h = Math.pow(Math.sin((lat2 - lat1) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2), x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return { s: 2 * (R || R_MEAN) * Math.asin(Math.min(1, Math.sqrt(h))), az1: wrap360(Math.atan2(y, x) * R2D) };
}
function isoLat(E, lat) { return Math.atanh(Math.sin(lat)) - E.e * Math.atanh(E.e * Math.sin(lat)); }
function isoLatInv(E, psi) {
  let lat = 2 * Math.atan(Math.exp(psi)) - Math.PI / 2;
  for (let i = 0; i < 20; i++) { const es = E.e * Math.sin(lat), nl = 2 * Math.atan(Math.exp(psi) * Math.pow((1 + es) / (1 - es), E.e / 2)) - Math.PI / 2; if (Math.abs(nl - lat) < 1e-15) return nl; lat = nl; }
  return lat;
}
function rhumb(E, lat1, lon1, lat2, lon2) {
  let dl = lon2 - lon1; if (dl > Math.PI) dl -= 2 * Math.PI; if (dl < -Math.PI) dl += 2 * Math.PI;
  const dpsi = isoLat(E, lat2) - isoLat(E, lat1), az = Math.atan2(dl, dpsi);
  const s = Math.abs(lat2 - lat1) < 1e-11 ? radii(E, lat1).rp * Math.abs(dl) : (meridianArc(E, lat2) - meridianArc(E, lat1)) / Math.cos(az);
  return { s: Math.abs(s), az: wrap360(az * R2D), dl, dpsi };
}

/* ===================== MATICE 3×3, KOVARIANCIA ===================== */
function mv(A, v) { return A.map(function (r) { return r[0] * v[0] + r[1] * v[1] + r[2] * v[2]; }); }
function mm(A, B) { return A.map(function (r) { return [0, 1, 2].map(function (j) { return r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]; }); }); }
function tr(A) { return [0, 1, 2].map(function (i) { return [A[0][i], A[1][i], A[2][i]]; }); }
function inv3(m) {
  const a = m[0][0], b = m[0][1], c = m[0][2], d = m[1][0], e = m[1][1], f = m[1][2], g = m[2][0], h = m[2][1], i = m[2][2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
function chol3(S) {
  const L = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) {
    let s = S[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (s <= 0) return null; L[i][j] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  return L;
}
/* systémy: ecef [X,Y,Z], geod [φ°,λ°,h], sphere [φ°,λ°,R], enu [E,N,U] (počiatok org = [lat,lon,h] rad) */
function sysToEcef(sys, v, E, org) {
  if (sys === 'geod') return geod2ecef(E, v[0] * D2R, v[1] * D2R, v[2]);
  if (sys === 'sphere') return sphere2ecef(v[0] * D2R, v[1] * D2R, v[2]);
  if (sys === 'enu') { const o = geod2ecef(E, org[0], org[1], org[2]), d = enu2ecef(v, org[0], org[1]); return [o[0] + d[0], o[1] + d[1], o[2] + d[2]]; }
  return v.slice();
}
function sysFromEcef(sys, X, E, org) {
  if (sys === 'geod') { const g = ecef2geod(E, X[0], X[1], X[2]); return [g[0] * R2D, g[1] * R2D, g[2]]; }
  if (sys === 'sphere') { const g = ecef2sphere(X[0], X[1], X[2]); return [g[0] * R2D, g[1] * R2D, g[2]]; }
  if (sys === 'enu') { const o = geod2ecef(E, org[0], org[1], org[2]); return ecef2enu([X[0] - o[0], X[1] - o[1], X[2] - o[2]], org[0], org[1]); }
  return X.slice();
}
function sysTransform(v, from, to, E, org) { return sysFromEcef(to, sysToEcef(from, v, E, org), E, org); }
function sysStep(sys) { return (sys === 'geod' || sys === 'sphere') ? [1e-6, 1e-6, 0.1] : [0.1, 0.1, 0.1]; }
function jacobian(v, from, to, E, org) {
  const st = sysStep(from), J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let j = 0; j < 3; j++) {
    const p = v.slice(), m = v.slice(); p[j] += st[j]; m[j] -= st[j];
    const fp = sysTransform(p, from, to, E, org), fm = sysTransform(m, from, to, E, org);
    for (let i = 0; i < 3; i++) J[i][j] = (fp[i] - fm[i]) / (2 * st[j]);
  }
  return J;
}
function propagate(v, S, from, to, E, org) { const J = jacobian(v, from, to, E, org); return { J, S: mm(mm(J, S), tr(J)), out: sysTransform(v, from, to, E, org) }; }
function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function monteCarlo(v, S, from, to, E, org, n, seed) {
  const L = chol3(S); if (!L) return null;
  const rnd = rng(seed || 12345), out = [new Float64Array(n), new Float64Array(n), new Float64Array(n)], mean = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const z = [0, 0, 0];
    for (let i = 0; i < 3; i++) { let u1 = rnd(); if (u1 < 1e-300) u1 = 1e-300; z[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rnd()); }
    const x = [v[0] + L[0][0] * z[0], v[1] + L[1][0] * z[0] + L[1][1] * z[1], v[2] + L[2][0] * z[0] + L[2][1] * z[1] + L[2][2] * z[2]];
    const y = sysTransform(x, from, to, E, org);
    for (let i = 0; i < 3; i++) { out[i][k] = y[i]; mean[i] += y[i]; }
  }
  for (let i = 0; i < 3; i++) mean[i] /= n;
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) for (let j = i; j < 3; j++) C[i][j] += (out[i][k] - mean[i]) * (out[j][k] - mean[j]);
  for (let i = 0; i < 3; i++) for (let j = i; j < 3; j++) { C[i][j] /= (n - 1); C[j][i] = C[i][j]; }
  return { samples: out, mean, S: C };
}
/* elipsa chýb z 2×2: poloosi (1σ), natočenie hlavnej osi od osi x [rad] */
function errEllipse(sxx, syy, sxy) {
  const m = (sxx + syy) / 2, d = Math.sqrt(Math.pow((sxx - syy) / 2, 2) + sxy * sxy);
  return { a: Math.sqrt(Math.max(0, m + d)), b: Math.sqrt(Math.max(0, m - d)), theta: 0.5 * Math.atan2(2 * sxy, sxx - syy) };
}
function confScale(p) { return Math.sqrt(-2 * Math.log(1 - p)); }
function helmertR(sxx, syy, sxy, al) { const c = Math.cos(al), s = Math.sin(al); return Math.sqrt(Math.max(0, sxx * c * c + 2 * sxy * s * c + syy * s * s)); }

/* ===================== ŠTATISTIKA A ROZDELENIA ===================== */
function lgamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
  for (let j = 0; j < 6; j++) s += g[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return sum * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
function betaI(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = function (a, b, x) {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
    for (let m = 1; m < 500; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(a, b, x) / a : 1 - bt * cf(b, a, 1 - x) / b;
}
function pnorm(x) { const p = 0.5 * gammaP(0.5, x * x / 2); return x >= 0 ? 0.5 + p : 0.5 - p; }
function pt(t, nu) { const p = 0.5 * betaI(nu / 2, 0.5, nu / (nu + t * t)); return t >= 0 ? 1 - p : p; }
function pchi2(x, k) { return x <= 0 ? 0 : gammaP(k / 2, x / 2); }
function invCdf(F, p, lo, hi) {
  if (!(p > 0 && p < 1)) return NaN;
  while (F(lo) > p) lo = lo < 0 ? lo * 2 : lo / 2 - 1; while (F(hi) < p) hi = hi > 0 ? hi * 2 : hi / 2 + 1;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (F(m) < p) lo = m; else hi = m; if (hi - lo < 1e-14 * Math.max(1, Math.abs(m))) break; }
  return (lo + hi) / 2;
}
function qnorm(p) { return invCdf(pnorm, p, -10, 10); }
function qt(p, nu) { return invCdf(function (x) { return pt(x, nu); }, p, -10, 10); }
function qchi2(p, k) { return invCdf(function (x) { return pchi2(x, k); }, p, 0, 10); }

function quantile(sorted, q) { const n = sorted.length; if (!n) return NaN; const h = (n - 1) * q, i = Math.floor(h); return i + 1 < n ? sorted[i] + (h - i) * (sorted[i + 1] - sorted[i]) : sorted[i]; }
function stats(x) {
  const n = x.length, s = x.slice().sort(function (a, b) { return a - b; });
  let sum = 0, sq = 0; for (let i = 0; i < n; i++) { sum += x[i]; sq += x[i] * x[i]; }
  const mean = sum / n; let m2 = 0, m3 = 0, m4 = 0;
  for (let i = 0; i < n; i++) { const d = x[i] - mean; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; }
  const sd = n > 1 ? Math.sqrt(m2 / (n - 1)) : NaN, med = quantile(s, 0.5);
  const dev = s.map(function (v) { return Math.abs(v - med); }).sort(function (a, b) { return a - b; });
  const skew = sd > 0 ? m3 / n / Math.pow(sd, 3) : NaN, kurt = sd > 0 ? m4 / n / Math.pow(sd, 4) - 3 : NaN;
  const jb = n / 6 * (skew * skew + kurt * kurt / 4), q1 = quantile(s, 0.25), q3 = quantile(s, 0.75);
  return { n, sum, mean, median: med, std: sd, sem: sd / Math.sqrt(n), min: s[0], max: s[n - 1], range: s[n - 1] - s[0], rms: Math.sqrt(sq / n),
    mad: quantile(dev, 0.5), skew, kurt, q1, q3, iqr: q3 - q1, jb, jbp: Math.exp(-jb / 2) };
}
function pearson(x, y) {
  const n = Math.min(x.length, y.length); let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
  const r = sxy / Math.sqrt(sxx * syy), t = r * Math.sqrt((n - 2) / Math.max(1e-300, 1 - r * r));
  return { r, p: n > 2 ? 2 * (1 - pt(Math.abs(t), n - 2)) : NaN, slope: sxy / sxx, icpt: my - sxy / sxx * mx };
}
function statLines(x, full) {
  const s = stats(x), L = [['n', fmt(s.n)], ['priemer', fmt(s.mean)], ['medián', fmt(s.median)], ['smer. odchýlka (n−1)', fmt(s.std)],
    ['min', fmt(s.min)], ['max', fmt(s.max)]];
  if (full !== false) L.push(['súčet', fmt(s.sum)], ['rozpätie', fmt(s.range)], ['RMS', fmt(s.rms)], ['chyba priemeru', fmt(s.sem)], ['MAD', fmt(s.mad)],
    ['Q1 / Q3 / IQR', fmt(s.q1) + ' / ' + fmt(s.q3) + ' / ' + fmt(s.iqr)], ['šikmosť', fmt(s.skew, 6)], ['špicatosť (exces)', fmt(s.kurt, 6)],
    ['Jarque-Bera', fmt(s.jb, 6) + '  (p = ' + fmt(s.jbp, 4) + (s.n < 30 ? ', málo dát' : '') + ')'], ['odľahlé (3 × 1,4826 × MAD)', String(outliers(x).length)]);
  return L;
}

/* ===================== JEDNOTKY ===================== */
const UNITS = {
  'dĺžka': { m: 1, km: 1000, dm: 0.1, cm: 0.01, mm: 0.001, 'µm': 1e-6, nm: 1e-9, mi: 1609.344, nmi: 1852, ft: 0.3048, in: 0.0254, yd: 0.9144, AU: 149597870700 },
  'rýchlosť': { 'm/s': 1, 'km/h': 1 / 3.6, 'mm/s': 0.001, mph: 0.44704, kn: 1852 / 3600, 'ft/s': 0.3048, c: C_LIGHT },
  'uhol': { deg: D2R, rad: 1, gon: Math.PI / 200, arcmin: D2R / 60, arcsec: D2R / 3600, mas: D2R / 3600e3, 'otáčka': 2 * Math.PI },
  'čas': { s: 1, ms: 1e-3, 'µs': 1e-6, ns: 1e-9, min: 60, h: 3600, d: 86400, 'týždeň': 604800, rok: 31557600 },
  'plocha': { m2: 1, km2: 1e6, ha: 1e4, a: 100, cm2: 1e-4, mm2: 1e-6 },
  'pomer': { '1': 1, '%': 0.01, '‰': 0.001, ppm: 1e-6, ppb: 1e-9 },
  'tlak': { Pa: 1, hPa: 100, kPa: 1000, bar: 1e5, mbar: 100, atm: 101325, mmHg: 133.322387415 },
  'hmotnosť': { kg: 1, g: 1e-3, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
  'frekvencia': { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 },
  'teplota': { '°C': [1, 273.15], K: [1, 0], '°F': [5 / 9, 459.67 * 5 / 9] }
};
const UNIT_ALIAS = { um: 'µm', us: 'µs', inch: 'in', kt: 'kn', kts: 'kn', kmh: 'km/h', kph: 'km/h', ms: 'ms', '°': 'deg', grad: 'gon', "'": 'arcmin', '"': 'arcsec',
  amin: 'arcmin', asec: 'arcsec', tyzden: 'týždeň', week: 'týždeň', wk: 'týždeň', day: 'd', hr: 'h', y: 'rok', yr: 'rok', 'm^2': 'm2', 'km^2': 'km2', 'm²': 'm2', 'km²': 'km2', ar: 'a',
  C: '°C', F: '°F', degC: '°C', degF: '°F', promile: '‰', percent: '%', turn: 'otáčka', sec: 's', 'm/sec': 'm/s' };
function findUnit(u, prefCat) {
  const cand = [u, UNIT_ALIAS[u], u.toLowerCase(), UNIT_ALIAS[u.toLowerCase()]];
  for (let k = 0; k < cand.length; k++) {
    const c = cand[k]; if (!c) continue;
    if (prefCat && UNITS[prefCat][c] !== undefined) return { cat: prefCat, u: c };
    for (const cat in UNITS) if (UNITS[cat][c] !== undefined) return { cat, u: c };
  }
  for (const cat in UNITS) for (const n in UNITS[cat]) if (n.toLowerCase() === u.toLowerCase()) return { cat, u: n };
  return null;
}
function toBase(cat, u, v) { const f = UNITS[cat][u]; return Array.isArray(f) ? v * f[0] + f[1] : v * f; }
function fromBase(cat, u, v) { const f = UNITS[cat][u]; return Array.isArray(f) ? (v - f[1]) / f[0] : v / f; }
function convert(v, from, to) {
  const a = findUnit(from); if (!a) throw new Error('neznáma jednotka: ' + from);
  const b = findUnit(to, a.cat); if (!b) throw new Error('neznáma jednotka: ' + to);
  if (a.cat !== b.cat) throw new Error('nezlučiteľné jednotky: ' + from + ' (' + a.cat + ') a ' + to + ' (' + b.cat + ')');
  return { v: fromBase(b.cat, b.u, toBase(a.cat, a.u, v)), from: a.u, to: b.u, cat: a.cat };
}

/* ===================== HROMADNÝ PREVOD ===================== */
const BATCH_SYS = { geod: 'φ, λ, h (ETRS89, stupne)', ecef: 'X, Y, Z (ECEF)', utm: 'UTM E, N, h', jtsk: 'S-JTSK Y, X, H (Bpv)', enu: 'E, N, U voči prvému bodu' };
function batchConvert(text, from, to, opt) {
  opt = opt || {}; const E = ell('GRS80'), rows = [], bad = [], notes = {}; let org = null;
  const head = { geod: ['φ [°]', 'λ [°]', 'h [m]'], ecef: ['X [m]', 'Y [m]', 'Z [m]'], utm: ['zóna', 'E [m]', 'N [m]', 'h [m]'], jtsk: ['Y [m]', 'X [m]', 'H Bpv [m]'], enu: ['E [m]', 'N [m]', 'U [m]'] }[to];
  String(text || '').split(/\r?\n/).forEach(function (line, li) {
    const l = line.replace(/[  ]/g, ' ').trim(); if (!l || l[0] === '#') return;
    let tk = /[;\t]/.test(l) ? l.split(/[;\t]/) : l.split(/[\s]+/); tk = tk.map(function (t) { return t.trim(); }).filter(function (t) { return t !== ''; });
    let name = ''; if (tk.length && isNaN(num(tk[0]))) name = tk.shift();
    const v = tk.map(num); if (v.length < 2 || v.slice(0, 3).some(isNaN)) { bad.push(li + 1); return; }
    const c = v[2] === undefined ? 0 : v[2]; let g;
    if (from === 'geod') g = [v[0] * D2R, v[1] * D2R, c];
    else if (from === 'ecef') { if (v.length < 3) { bad.push(li + 1); return; } g = ecef2geod(E, v[0], v[1], v[2]); }
    else if (from === 'utm') { const r = utmInv(opt.zone || 33, opt.hemi || 'N', v[0], v[1]); g = [r[0], r[1], c]; }
    else if (from === 'jtsk') {
      let Y = Math.abs(v[0]), X = Math.abs(v[1]); if (Y > X) { const t = Y; Y = X; X = t; }
      let r = jtsk2etrs(Y, X, c); const z = crZeta(r[0] * R2D, r[1] * R2D);
      if (z !== null) r = jtsk2etrs(Y, X, c + z); else notes.noH = true;
      if (r.acc !== 'grid') notes.helm = true; g = [r[0], r[1], z !== null ? c + z : c];
    }
    if (!g || g.some(function (x) { return !isFinite(x); }) || Math.abs(g[0]) > Math.PI / 2 + 1e-9) { bad.push(li + 1); return; }
    let out;
    if (to === 'geod') out = [fx(g[0] * R2D, 9), fx(wrap180(g[1] * R2D), 9), fx(g[2], 4)];
    else if (to === 'ecef') { const x = geod2ecef(E, g[0], g[1], g[2]); out = [fx(x[0], 4), fx(x[1], 4), fx(x[2], 4)]; }
    else if (to === 'utm') { const u = utmFwd(g[0], g[1], opt.zoneOut || undefined); out = [u.zone + u.hemi, fx(u.E, 3), fx(u.N, 3), fx(g[2], 4)]; }
    else if (to === 'jtsk') { const j = etrs2jtsk(g[0], g[1], g[2]); if (j.acc !== 'grid') notes.helm = true; if (j.H === null) notes.noH = true; out = [fx(j.Y, 3), fx(j.X, 3), fx(j.H === null ? g[2] : j.H, 3)]; }
    else if (to === 'enu') { if (!org) org = g; const o = geod2ecef(E, org[0], org[1], org[2]), x = geod2ecef(E, g[0], g[1], g[2]), d = ecef2enu([x[0] - o[0], x[1] - o[1], x[2] - o[2]], org[0], org[1]); out = [fx(d[0], 4), fx(d[1], 4), fx(d[2], 4)]; }
    rows.push({ name: name, vals: out });
  });
  return { head: head, rows: rows, bad: bad, notes: notes };
}
/* odľahlé hodnoty: |x − medián| > 3 · 1,4826 · MAD */
function outliers(x) { const s = stats(x), lim = 3 * 1.4826 * s.mad, idx = []; if (lim > 0) x.forEach(function (v, i) { if (Math.abs(v - s.median) > lim) idx.push(i); }); return idx; }

/* ===================== GNSS ===================== */
const GNSS_SIGNALS = [['GPS', 'L1', 1575.42], ['GPS', 'L2', 1227.60], ['GPS', 'L5', 1176.45],
  ['Galileo', 'E1', 1575.42], ['Galileo', 'E5a', 1176.45], ['Galileo', 'E5b', 1207.14], ['Galileo', 'E5 (AltBOC)', 1191.795], ['Galileo', 'E6', 1278.75],
  ['GLONASS', 'G1 (k=0)', 1602.0], ['GLONASS', 'G2 (k=0)', 1246.0], ['GLONASS', 'G3', 1202.025],
  ['BeiDou', 'B1I', 1561.098], ['BeiDou', 'B1C', 1575.42], ['BeiDou', 'B2a', 1176.45], ['BeiDou', 'B2b', 1207.14], ['BeiDou', 'B3I', 1268.52]];
function gnssCombo(f1, f2) {
  const a = f1 * f1 / (f1 * f1 - f2 * f2), b = -f2 * f2 / (f1 * f1 - f2 * f2);
  return { l1: C_LIGHT / (f1 * 1e6), l2: C_LIGHT / (f2 * 1e6), wl: C_LIGHT / (Math.abs(f1 - f2) * 1e6), nl: C_LIGHT / ((f1 + f2) * 1e6), a, b, noise: Math.sqrt(a * a + b * b) };
}

/* ===================== KONŠTANTY ===================== */
const CONSTANTS = [
  ['c', C_LIGHT, 'm/s', 'rýchlosť svetla'], ['GM_WGS84', 3.986004418e14, 'm³/s²', 'geocentrická gravitačná konštanta (WGS84)'],
  ['GM_GRS80', 3.986005e14, 'm³/s²', 'GM (GRS80, používa GPS ICD)'], ['omega_e', 7.2921151467e-5, 'rad/s', 'uhlová rýchlosť rotácie Zeme (GPS ICD)'],
  ['a_WGS84', 6378137, 'm', 'veľká poloos WGS84 / GRS80'], ['invf_WGS84', 298.257223563, '', '1/f WGS84'], ['invf_GRS80', 298.257222101, '', '1/f GRS80'],
  ['a_Bessel', 6377397.155, 'm', 'veľká poloos Bessel'], ['invf_Bessel', 299.1528128, '', '1/f Bessel'], ['R_mean', R_MEAN, 'm', 'stredný polomer Zeme (IUGG)'],
  ['J2', 1.08263e-3, '', 'dynamický tvarový faktor (GRS80)'], ['g0', 9.80665, 'm/s²', 'normálne tiažové zrýchlenie (konvenčné)'],
  ['G', 6.67430e-11, 'm³/(kg·s²)', 'gravitačná konštanta'], ['rho_sec', 206264.80624709636, '″/rad', 'ró sekundové'], ['rho_gon', 63.66197723675813, 'gon/rad', 'ró grádové'],
  ['pi_GPS', 3.1415926535898, '', 'π podľa GPS ICD'], ['F_rel', -4.442807633e-10, 's/√m', 'relativistická konštanta hodín (GPS ICD)'],
  ['f0_GNSS', 10.23e6, 'Hz', 'základná frekvencia GPS'], ['AU', 149597870700, 'm', 'astronomická jednotka'], ['k_B', 1.380649e-23, 'J/K', 'Boltzmannova konštanta'],
  ['MJD_J2000', 51544.5, 'd', 'MJD epochy J2000.0'], ['JD_MJD', 2400000.5, 'd', 'JD − MJD'], ['MJD_GPS0', 44244, 'd', 'MJD začiatku GPS času (1980-01-06)'],
  ['week_s', 604800, 's', 'sekúnd v týždni'], ['day_s', 86400, 's', 'sekúnd v dni']
];

/* ===================== VÝRAZY A PRÍKAZOVÝ RIADOK ===================== */
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sind: function (x) { return Math.sin(x * D2R); }, cosd: function (x) { return Math.cos(x * D2R); }, tand: function (x) { return Math.tan(x * D2R); },
  asind: function (x) { return Math.asin(x) * R2D; }, acosd: function (x) { return Math.acos(x) * R2D; }, atand: function (x) { return Math.atan(x) * R2D; },
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, round: function (x, d) { const k = Math.pow(10, d || 0); return Math.round(x * k) / k; }, sign: Math.sign,
  min: Math.min, max: Math.max, hypot: Math.hypot, mod: function (a, b) { return ((a % b) + b) % b; },
  deg: function (x) { return x * R2D; }, rad: function (x) { return x * D2R; }, dms: function (d, m, s) { return (d < 0 ? -1 : 1) * (Math.abs(d) + (m || 0) / 60 + (s || 0) / 3600); },
  sum: function () { return stats([].slice.call(arguments)).sum; }, mean: function () { return stats([].slice.call(arguments)).mean; },
  median: function () { return stats([].slice.call(arguments)).median; }, std: function () { return stats([].slice.call(arguments)).std; },
  rms: function () { return stats([].slice.call(arguments)).rms; },
  pnorm: pnorm, qnorm: qnorm, pt: pt, qt: qt, pchi2: pchi2, qchi2: qchi2, db: function (x) { return 10 * Math.log10(x); }, undb: function (x) { return Math.pow(10, x / 10); }
};
function baseVars() { const v = { pi: Math.PI, e: Math.E }; CONSTANTS.forEach(function (c) { v[c[0]] = c[1]; }); return v; }
function evalExpr(src, vars) {
  const toks = [], re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-zÀ-ž_][A-Za-zÀ-ž_0-9]*)|(\*\*|[-+*\/^%(),]))/y;
  let pos = 0; src = src.replace(/−/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/');
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos; const m = re.exec(src);
    if (!m) throw new Error('nerozumiem: „' + src.slice(pos).trim().slice(0, 12) + '“');
    pos = re.lastIndex;
    if (m[1] !== undefined) toks.push({ t: 'n', v: parseFloat(m[1]) }); else if (m[2] !== undefined) toks.push({ t: 'id', v: m[2] }); else toks.push({ t: 'op', v: m[3] === '**' ? '^' : m[3] });
  }
  let i = 0;
  const peek = function () { return toks[i]; }, isOp = function (v) { return toks[i] && toks[i].t === 'op' && toks[i].v === v; };
  function expr() { let v = term(); while (isOp('+') || isOp('-')) { const o = toks[i++].v, r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term() { let v = unary(); while (isOp('*') || isOp('/') || isOp('%')) { const o = toks[i++].v, r = unary(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; }
  function unary() { if (isOp('-')) { i++; return -unary(); } if (isOp('+')) { i++; return unary(); } return power(); }
  function power() { const b = primary(); if (isOp('^')) { i++; return Math.pow(b, unary()); } return b; }
  function primary() {
    const t = peek(); if (!t) throw new Error('neúplný výraz');
    if (t.t === 'n') { i++; return t.v; }
    if (t.t === 'id') {
      i++;
      if (isOp('(')) {
        i++; const args = [];
        if (!isOp(')')) { args.push(expr()); while (isOp(',')) { i++; args.push(expr()); } }
        if (!isOp(')')) throw new Error('chýba )'); i++;
        const f = FUNCS[t.v] || FUNCS[t.v.toLowerCase()]; if (!f) throw new Error('neznáma funkcia: ' + t.v);
        return f.apply(null, args);
      }
      if (vars && Object.prototype.hasOwnProperty.call(vars, t.v)) return vars[t.v];
      throw new Error('neznáma premenná: ' + t.v);
    }
    if (t.v === '(') { i++; const v = expr(); if (!isOp(')')) throw new Error('chýba )'); i++; return v; }
    throw new Error('nečakané: ' + t.v);
  }
  const v = expr(); if (i < toks.length) throw new Error('nečakané: ' + toks[i].v);
  return v;
}
/* dáta: stĺpec/riadok čísel -> {rows:[[...]], flat:[...]} | null */
function parseData(input) {
  if (!/^[\s;,\d.eE+\-−]+$/.test(input)) return null;
  const lines = input.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  const multi = lines.length > 1, rows = [];
  /* tisíce oddelené medzerou ("57 922", "1 234 567,5"): každý riadok je jedno číslo */
  const reT = /^[+\-\u2212]?\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?$/, reP = /^[+\-\u2212]?\d{1,3}(?:[.,]\d+)?$/;
  if (multi && lines.some(function (l) { return reT.test(l); }) && lines.every(function (l) { return reT.test(l) || reP.test(l); })) {
    const f = lines.map(function (l) { return num(l.replace(/[ \u00a0\u202f]/g, '')); });
    if (!f.some(isNaN)) return { rows: f.map(function (x) { return [x]; }), flat: f, cols: 1, thousands: true };
  }
  const commaSep = multi && lines.every(function (l) { return !/[\s;]/.test(l); }) && lines.some(function (l) { return l.split(',').length > 2 || (l.indexOf('.') >= 0 && l.indexOf(',') >= 0); });
  for (let li = 0; li < lines.length; li++) {
    let l = lines[li]; const hasSep = /[\s;]/.test(l);
    let toks = hasSep ? l.split(/[\s;]+/).map(function (t) { return t.replace(/,$/, ''); }).filter(Boolean) : (multi && !commaSep ? [l] : l.split(','));
    if (!multi && hasSep) for (let k = 1; k < toks.length; k++) if (/^[+\-−]/.test(toks[k])) return null;
    const r = toks.map(num); if (r.some(isNaN)) return null; rows.push(r);
  }
  const flat = [].concat.apply([], rows); if (flat.length < 2) return null;
  const k = rows[0].length, cols = multi && k > 1 && rows.length > 2 && rows.every(function (r) { return r.length === k; }) ? k : 1;
  return { rows, flat, cols };
}
const HELP = [
  ['výraz', 'sqrt(3^2+4^2) · sind(30) · 2*pi*R_mean · a = 6378137 · ans/2'],
  ['jednotky', '120 km/h in m/s · 0.5 deg in rad · 1 mas in rad · 20 °C in K'],
  ['čas', '2026-10-08 · 2026-10-08 12:30:00 · mjd 61321 · jd 2461321.5 · doy 2026 281 · gps 2439 345600 · gpss 1475539200 · unix 1791417600 · teraz'],
  ['dáta', 'vlož stĺpec čísel (Ctrl+V) → n, priemer, medián, odchýlka… · dva stĺpce → aj rozdiely a korelácia'],
  ['súradnice', 'ecef 50 14.5 300 · geod 3979316 1029126 4861502 · utm 50 14.5 · jtsk 50 14.5 · dist 50 14 49 17 · azel X1 Y1 Z1 X2 Y2 Z2 · dms 50.0875 · deg 50 5 15'],
  ['rozdelenia', 'qnorm(0.975) · qt(0.975, 10) · qchi2(0.95, 2) · pnorm(1.96) · pt(2, 10) · pchi2(5.99, 2)'],
  ['funkcie', 'sin cos tan asin acos atan atan2 (rad) · sind cosd tand asind… (°) · sqrt cbrt abs exp ln log log2 · round(x, n) floor ceil mod · min max hypot · mean median std rms sum · db undb'],
  ['konštanty', 'pi e c GM_WGS84 omega_e a_WGS84 R_mean rho_sec … (karta Konštanty)'],
  ['ovládanie', 'Enter = vypočítať · Shift+Enter = nový riadok · ↑ ↓ = história · klik na výsledok = skopírovať · clear = vymazať']
];
function replEval(input, env) {
  env.vars = env.vars || baseVars();
  const raw = String(input || '').replace(/[\u00a0\u202f]/g, ' '), s = raw.trim();
  if (!s) return null;
  const low = s.toLowerCase(), E = ell('WGS84');
  const setAns = function (v) { if (typeof v === 'number' && isFinite(v)) env.vars.ans = v; return v; };
  if (low === 'help' || low === '?' || low === 'pomoc') return { type: 'help', lines: HELP };
  if (low === 'teraz' || low === 'now') return { type: 'kv', lines: timeLines(env.now ? env.now() : Date.now()) };

  if (/^[+-]?\d+,\d+$/.test(s)) { const v = setAns(num(s)); return { type: 'val', text: fmt(v), value: v, note: 'desatinná čiarka:' }; }
  const data = parseData(raw);
  if (data) {
    if (data.cols === 2) {
      const x = data.rows.map(function (r) { return r[0]; }), y = data.rows.map(function (r) { return r[1]; }), d = x.map(function (v, i) { return y[i] - v; });
      const p = pearson(x, y), sd = stats(d); setAns(sd.mean);
      return { type: 'groups', groups: [['stĺpec 1', statLines(x, false)], ['stĺpec 2', statLines(y, false)],
        ['rozdiel (2 − 1)', [['priemer', fmt(sd.mean)], ['smer. odchýlka', fmt(sd.std)], ['RMS', fmt(sd.rms)], ['min / max', fmt(sd.min) + ' / ' + fmt(sd.max)]]],
        ['vzťah', [['korelácia r', fmt(p.r, 8)], ['p-hodnota', fmt(p.p, 4)], ['priamka y = a + b·x', 'a = ' + fmt(p.icpt, 8) + ', b = ' + fmt(p.slope, 8)]]]], plot: { x: x, y: y, fit: p } };
    }
    if (data.cols > 2) {
      const g = []; for (let c = 0; c < data.cols; c++) g.push(['stĺpec ' + (c + 1), statLines(data.rows.map(function (r) { return r[c]; }), false)]);
      return { type: 'groups', groups: g };
    }
    setAns(stats(data.flat).mean);
    return { type: 'kv', lines: statLines(data.flat).concat(data.thousands ? [['pozn.', 'medzeru som bral ako oddeľovač tisícov (1 stĺpec). Dva stĺpce oddeľ tabulátorom alebo bodkočiarkou.']] : []), plot: { x: data.flat } };
  }
  const dt = parseDateTime(s);
  if (dt !== null) return { type: 'kv', lines: timeLines(dt) };

  const cm = s.match(/^([A-Za-z]+)\s+(.+)$/);
  if (cm) {
    const cmd = cm[1].toLowerCase(), rest = cm[2].trim(), args = rest.split(/[\s;]+/);
    const ev = function (x) { return evalExpr(x, env.vars); }, nargs = function () { return args.map(ev); };
    const geoArgs = function () { const a = args.map(parseAngle); if (a.some(isNaN)) throw new Error('zlé argumenty'); return a; };
    if (cmd === 'mjd' || cmd === 'jd' || cmd === 'doy' || cmd === 'gpsw') {
      const d = parseDateTime(rest);
      if (d !== null) { const t = timeAll(d); const v = cmd === 'mjd' ? t.mjd : cmd === 'jd' ? t.jd : cmd === 'doy' ? t.doy : t.week; setAns(v);
        return { type: 'kv', lines: [[cmd.toUpperCase(), fmt(v, 16)]].concat(timeLines(d).slice(0, 1), cmd === 'gpsw' ? [['SOW', fmt(t.sow)]] : []) }; }
      if (cmd === 'mjd') return { type: 'kv', lines: timeLines(mjdToUtc(ev(rest))) };
      if (cmd === 'jd') return { type: 'kv', lines: timeLines(mjdToUtc(ev(rest) - 2400000.5)) };
      if (cmd === 'doy') { const a = nargs(); if (a.length < 2) throw new Error('použitie: doy ROK DEŇ [sekundy]'); return { type: 'kv', lines: timeLines(ydoyToUtc(a[0], a[1], a[2])) }; }
    }
    if (cmd === 'gps' || cmd === 'gpsw') { const a = nargs(); return { type: 'kv', lines: timeLines(gpsSecToUtc(a[0] * 604800 + (a[1] || 0))) }; }
    if (cmd === 'gpss') return { type: 'kv', lines: timeLines(gpsSecToUtc(ev(rest))) };
    if (cmd === 'unix') return { type: 'kv', lines: timeLines(ev(rest) * 1000) };
    if (cmd === 'dms') { const v = ev(rest); return { type: 'kv', lines: [['DMS', fmtDMS(v, 5)], ['rad', fmt(v * D2R)], ['gon', fmt(v / 0.9)]] }; }
    if (cmd === 'deg') { const v = parseAngle(rest); if (isNaN(v)) throw new Error('použitie: deg ST MIN SEK'); setAns(v); return { type: 'kv', lines: [['stupne', fmt(v)], ['rad', fmt(v * D2R)]] }; }
    if (cmd === 'ecef') { const a = geoArgs(), x = geod2ecef(E, a[0] * D2R, a[1] * D2R, a[2] || 0); return { type: 'kv', lines: [['X', fx(x[0], 4)], ['Y', fx(x[1], 4)], ['Z', fx(x[2], 4)]] }; }
    if (cmd === 'geod') { const a = nargs(); if (a.length < 3) throw new Error('použitie: geod X Y Z'); const g = ecef2geod(E, a[0], a[1], a[2]);
      return { type: 'kv', lines: [['φ', fx(g[0] * R2D, 9) + '°  (' + fmtDMS(g[0] * R2D) + ')'], ['λ', fx(g[1] * R2D, 9) + '°  (' + fmtDMS(g[1] * R2D) + ')'], ['h', fx(g[2], 4) + ' m']] }; }
    if (cmd === 'utm') { const a = geoArgs(), u = utmFwd(a[0] * D2R, a[1] * D2R); return { type: 'kv', lines: [['zóna', u.zone + u.hemi], ['E', fx(u.E, 3)], ['N', fx(u.N, 3)]] }; }
    if (cmd === 'jtsk') { const a = geoArgs(), j = etrs2jtsk(a[0] * D2R, a[1] * D2R, a[2] || 0);
      return { type: 'kv', lines: [['Y', fx(j.Y, 2)], ['X', fx(j.X, 2)], ].concat(j.H !== null ? [['H Bpv', fx(j.H, 3)]] : [], [['pozn.', j.acc === 'grid' ? 'mriežka ČÚZK, presnosť niekoľko cm' : 'mimo mriežky ČÚZK: Helmert, presnosť ~1 m' + (inJtskArea(a[0], a[1]) ? '' : '; bod je mimo ČR/SR')]]) }; }
    if (cmd === 'azel') { const a = nargs(); if (a.length < 6) throw new Error('použitie: azel X1 Y1 Z1 X2 Y2 Z2');
      const g = ecef2geod(E, a[0], a[1], a[2]), r = enu2aes(ecef2enu([a[3] - a[0], a[4] - a[1], a[5] - a[2]], g[0], g[1])); setAns(r[1]);
      return { type: 'kv', lines: [['azimut', fx(r[0], 6) + '°'], ['elevácia', fx(r[1], 6) + '°'], ['vzdialenosť', fx(r[2], 4) + ' m']] }; }
    if (cmd === 'dist') { const a = geoArgs(); if (a.length < 4) throw new Error('použitie: dist φ1 λ1 φ2 λ2');
      const v = vincentyInv(E, a[0] * D2R, a[1] * D2R, a[2] * D2R, a[3] * D2R), hv = haversine(a[0] * D2R, a[1] * D2R, a[2] * D2R, a[3] * D2R); setAns(v.s);
      return { type: 'kv', lines: [['Vincenty', fx(v.s, 4) + ' m'], ['azimut tam / späť', fx(v.az1, 7) + '° / ' + fx(v.az2, 7) + '°'], ['guľa (haversine)', fx(hv.s, 3) + ' m']] }; }
  }
  const um = s.match(/^(.+?)\s+(\S+)\s+(?:in|to|na|do|->|→)\s+(\S+)$/i);
  if (um) {
    let ok = true, v; try { v = evalExpr(um[1], env.vars); } catch (e) { ok = false; }
    if (ok && findUnit(um[2])) { const r = convert(v, um[2], um[3]); setAns(r.v); return { type: 'val', text: fmt(r.v) + ' ' + r.to, value: r.v, note: fmt(v) + ' ' + r.from + ' =' }; }
  }
  const am = s.match(/^([A-Za-zÀ-ž_][A-Za-zÀ-ž_0-9]*)\s*=\s*(.+)$/);
  if (am && !FUNCS[am[1]]) { const v = evalExpr(am[2], env.vars); env.vars[am[1]] = v; setAns(v); return { type: 'val', text: fmt(v), value: v, note: am[1] + ' =' }; }

  const v = evalExpr(s, env.vars); setAns(v);
  const res = { type: 'val', text: fmt(v), value: v, hints: [] };
  if (/^\d+(\.\d+)?$/.test(s)) {
    if (v >= 15020 && v <= 99999) res.hints.push(['ako MJD', isoStr(mjdToUtc(v)) + ' UTC']);
    if (v >= 2400000 && v <= 2500000) res.hints.push(['ako JD', isoStr(mjdToUtc(v - 2400000.5)) + ' UTC']);
    if (Number.isInteger(v) && v >= 500 && v <= 4000) res.hints.push(['ako GPS týždeň', 'začína ' + isoStr(GPS0 + v * 604800000).slice(0, 10) + ' (GPST)']);
    if (v >= 1e8 && v < 4e9) { res.hints.push(['ako Unix čas', isoStr(v * 1000) + ' UTC']); res.hints.push(['ako GPS sekundy', isoStr(gpsSecToUtc(v)) + ' UTC']); }
  }
  return res;
}

const CORE = { D2R, R2D, C_LIGHT, ELLIPSOIDS, ell, num, fmt, fx, pad, parseAngle, fmtDMS, wrap180, wrap360, LEAPS, taiUtc, gpsUtc, utcToGpsSec, gpsSecToUtc, mjdToUtc, utcToMjd,
  ydoyToUtc, isoStr, parseDateTime, timeAll, timeLines, geod2ecef, ecef2geod, ecef2enu, enu2ecef, enu2aes, ecef2sphere, sphere2ecef, radii, meridianArc, normalGravity,
  tmFwd, tmInv, utmZone, utmFwd, utmInv, krovakFwd, krovakInv, KROVAK05, JTSK_HELMERT, CUZK_HELMERT, grids, yxShift, crZeta, modDxDy, helmertFwd, helmertInv, helmertInvT, setHinv: function (f) { HINV = f; }, etrs2jtsk, jtsk2etrs, inJtskArea, FRAME_PAR, ITRFS, ETRFS, framePar, frameTransform, BATCH_SYS, batchConvert, outliers, webMercFwd, webMercInv, laeaEurope, lccEurope,
  vincentyInv, vincentyDir, haversine, R_MEAN, isoLat, isoLatInv, rhumb, mm, mv, tr, inv3, chol3, sysTransform, jacobian, propagate, monteCarlo, errEllipse, confScale, helmertR,
  pnorm, pt, pchi2, qnorm, qt, qchi2, stats, pearson, statLines, UNITS, findUnit, toBase, fromBase, convert, GNSS_SIGNALS, gnssCombo, CONSTANTS, FUNCS, baseVars, evalExpr,
  parseData, replEval, HELP };
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
