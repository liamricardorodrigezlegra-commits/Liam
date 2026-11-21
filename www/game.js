/* Ecos de Aethel — RPG isométrico de mundo abierto en pixel art.
   Todo el arte se genera por código al iniciar (sin imágenes externas). */
'use strict';
(() => {
// ============================================================ utilidades
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, o = 4) {
  let t = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) { t += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2; }
  return t / n;
}
function C(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0]; }
function dark(c, f) { return [c[0] * f | 0, c[1] * f | 0, c[2] * f | 0]; }
function css(c, a = 1) { return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`; }
const OUT = C('#1a1424');

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mk(w, h, fn) {
  const c = canvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  const set = (x, y, col, a = 255) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
  };
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
  fn(set, get, w, h);
  g.putImageData(id, 0, 0);
  return c;
}
function outlined(src, col = OUT) {
  const sw = src.width, sh = src.height, w = sw + 2, h = sh + 2;
  const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const A = (x, y) => x >= 0 && y >= 0 && x < sw && y < sh && sd[(y * sw + x) * 4 + 3] > 0;
  return mk(w, h, (set) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (A(x - 1, y - 1)) { const j = ((y - 1) * sw + x - 1) * 4; set(x, y, [sd[j], sd[j + 1], sd[j + 2]], sd[j + 3]); }
      else if (A(x - 2, y - 1) || A(x, y - 1) || A(x - 1, y - 2) || A(x - 1, y)) set(x, y, col);
    }
  });
}
function flipped(src) { const c = canvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function whitened(src) { const c = canvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c; }
function scaled(src, k) { const c = canvas(src.width * k, src.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height); return c; }
function fromMap(rows, pal) {
  const w = Math.max(...rows.map(r => r.length));
  const P = {}; for (const k in pal) P[k] = C(pal[k]);
  return outlined(mk(w, rows.length, (set) => {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch !== '.' && P[ch]) set(x, y, P[ch]); } });
  }));
}
function spriteSet(c) { return { r: c, l: flipped(c), w: whitened(c), wl: flipped(whitened(c)) }; }

// ============================================================ fuente pixel 3x5
const FONT = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
  F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
  K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
  P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
  Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
  '4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111',
  '9':'111101111001110','.':'000000000000010',',':'000000000010100','!':'010010010000010','?':'110001010000010',
  ':':'000010000010000','/':'001001010100100','-':'000000111000000','+':'000010111010000','%':'101001010100101',
  '(':'010100100100010',')':'010001001001010',"'":'010010000000000','¡':'010000010010010','¿':'010000010100011',
  '>':'100010001010100','<':'001010100010001','*':'000101010101000',' ':'000000000000000'
};
const ACC = { 'Á':['A',1],'É':['E',1],'Í':['I',1],'Ó':['O',1],'Ú':['U',1],'Ñ':['N',2],'Ü':['U',3] };
const textCache = new Map();
function glyphW(ch) {
  if (ch === ' ') return 2;
  const g = FONT[ch]; if (!g) return 3;
  let l = 3, r = -1;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y * 3 + x] === '1') { l = Math.min(l, x); r = Math.max(r, x); }
  return r < 0 ? 3 : (l === 1 && r === 1 ? 1 : 3);
}
function textCanvas(str, col) {
  const key = str + '|' + col;
  let c = textCache.get(key); if (c) return c;
  str = str.toUpperCase();
  let w = 0; const items = [];
  for (const raw of str) {
    let ch = raw, mark = 0;
    if (ACC[raw]) { ch = ACC[raw][0]; mark = ACC[raw][1]; }
    const gw = glyphW(ch);
    items.push([ch, mark, w, gw]); w += gw + 1;
  }
  w = Math.max(1, w - 1);
  const cc = C(col);
  c = mk(w, 6, (set) => {
    for (const [ch, mark, ox, gw] of items) {
      const g = FONT[ch] || FONT['?'];
      const off = gw === 1 ? 1 : 0;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y * 3 + x] === '1') set(ox + x - off, y + 1, cc);
      if (mark === 1) { set(ox + 1, 0, cc); set(ox + 2, 0, cc); }
      if (mark === 2) { set(ox, 0, cc); set(ox + 1, 0, cc); set(ox + 2, 0, cc); }
      if (mark === 3) { set(ox, 0, cc); set(ox + 2, 0, cc); }
    }
  });
  if (textCache.size > 600) textCache.clear();
  textCache.set(key, c);
  return c;
}
function textW(str, s = 1) { return textCanvas(str, '#ffffff').width * s; }
function drawText(str, x, y, col = '#f4ecd8', align = 'left', s = 1, shadow = '#140e1c', alpha = 1) {
  str = String(str);
  const c = textCanvas(str, col);
  const w = c.width * s;
  let ox = align === 'center' ? x - (w >> 1) : align === 'right' ? x - w : x;
  ox |= 0; y |= 0;
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (shadow) { const sc = textCanvas(str, shadow); ctx.drawImage(sc, ox + s, y + s, w, c.height * s); ctx.drawImage(sc, ox, y + s, w, c.height * s); }
  ctx.drawImage(c, ox, y, w, c.height * s);
  if (alpha < 1) ctx.globalAlpha = 1;
}

// ============================================================ lienzo y escala
const cv = document.getElementById('game');
const ctx = cv.getContext('2d', { alpha: false });
let SCALE = 4, W = 480, H = 270;
function resize() {
  const iw = window.innerWidth, ih = window.innerHeight;
  SCALE = Math.max(2, Math.round(Math.min(iw, ih) / 215));
  W = Math.ceil(iw / SCALE); H = Math.ceil(ih / SCALE);
  cv.width = W; cv.height = H;
  cv.style.width = W * SCALE + 'px'; cv.style.height = H * SCALE + 'px';
  ctx.imageSmoothingEnabled = false;
  layoutUI();
}

// ============================================================ biomas y paletas
const B_MEADOW = 0, B_FOREST = 1, B_SNOW = 2, B_PRISM = 3, B_RUINS = 4;
const BIO = [
  { name: 'PRADOS DE LUMEN', top: ['#3f8a45', '#55a852', '#6fc25f', '#94dc74'], face: ['#6e4b3a', '#865c44', '#5a3c30'], lip: ['#55a852', '#3f8a45'], mini: '#5aa852' },
  { name: 'BOSQUE UMBRÍO', top: ['#215a46', '#2c7052', '#3c8a5e', '#5aa86c'], face: ['#4f3a36', '#634640', '#3c2c2c'], lip: ['#2c7052', '#215a46'], mini: '#2c7052' },
  { name: 'PICOS ALBOS', top: ['#a6b6d6', '#c6d4ee', '#e2eafa', '#ffffff'], face: ['#6f7898', '#8590b0', '#575f7c'], lip: ['#e2eafa', '#c6d4ee'], mini: '#d4dff2' },
  { name: 'ARBOLEDA PRISMA', top: ['#2c9e8a', '#43bc9c', '#62d6b0', '#96eecb'], face: ['#4c4f8f', '#5f63a8', '#3c3d70'], lip: ['#43bc9c', '#2c9e8a'], mini: '#4cc4a2' },
  { name: 'RUINAS DE AETHEL', top: ['#86708a', '#9e8aa2', '#b6a4b8', '#d4c2d2'], face: ['#6a5068', '#7e6280', '#54405a'], lip: ['#7fae6a', '#5d8c52'], mini: '#a48aa2' },
];
const SAND = { top: ['#c4a06a', '#d8b880', '#e8cf9a', '#f6e4b6'], face: ['#9a7450', '#ae8660', '#7e5c40'], lip: ['#d8b880', '#c4a06a'] };
const WATER = [['#2a5c9a', '#3270ae', '#4a8ccc', '#a6d4f2'], ['#3a8ab4', '#4aa2c6', '#68bcd8', '#c6eef6']];

// ============================================================ generación de sprites
function makeTop(cols, seed, kind) {
  const P = cols.map(C), r = rng(seed);
  return mk(32, 16, (set) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const dd = Math.abs(x + 0.5 - 16) / 16 + Math.abs(y + 0.5 - 8) / 8;
      if (dd > 1.02) continue;
      const n = vnoise(x * 0.28, y * 0.55, seed), rr = r();
      let c = P[1];
      if (n < 0.3) c = P[0]; else if (n > 0.68) c = P[2];
      if (rr < 0.05) c = P[0]; else if (rr > 0.965) c = P[3];
      if (kind === 'ruins') {
        if (((x + 2 * y) % 16) === 0 || ((x - 2 * y + 64) % 16) === 0) c = dark(P[0], 0.85);
        else if (n > 0.8 && rr < 0.3) c = C('#7fae6a');
      }
      if (kind === 'snow' && rr > 0.985) c = [255, 255, 255];
      if (dd > 0.88 && y < 8) c = mix(c, P[3], 0.5);
      set(x, y, c);
    }
    if (kind === 'grass') for (let k = 0; k < 5; k++) {
      const x = 8 + r() * 16 | 0, y = 4 + r() * 8 | 0;
      set(x, y, P[3]); set(x, y + 1, P[2]);
    }
  });
}
function makeWater(cols, f, seed) {
  const P = cols.map(C);
  return mk(32, 16, (set) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const dd = Math.abs(x + 0.5 - 16) / 16 + Math.abs(y + 0.5 - 8) / 8;
      if (dd > 1.02) continue;
      const n = vnoise(x * 0.2, y * 0.4, seed);
      const w = Math.sin(x * 0.39 + y * 0.78 + f * TAU / 4 + n * 5);
      let c = n < 0.35 ? P[0] : P[1];
      if (w > 0.93) c = P[3]; else if (w > 0.7) c = P[2];
      set(x, y, c);
    }
  });
}
const faceCache = new Map();
function getFace(mat, side, depth, deep, v) {
  const key = mat + side + depth + (deep ? 'd' : '') + v;
  let c = faceCache.get(key); if (c) return c;
  const src = mat === 'sand' ? SAND : BIO[mat];
  const F = src.face.map(C), L = src.lip.map(C);
  const sideF = side === 'L' ? 1 : 0.74;
  const extra = deep ? 46 : 0;
  c = mk(16, 9 + depth + extra, (set) => {
    for (let i = 0; i < 16; i++) {
      const top = side === 'L' ? (i >> 1) : 7 - (i >> 1);
      const jag = deep ? Math.round(10 + vnoise(i * 0.33, v * 3.1 + side.charCodeAt(0), 99) * 34) : 0;
      const len = depth + jag;
      const lipLen = 2 + (hash2(i, v, 7) < 0.3 ? 2 + (hash2(i, v, 8) * 3 | 0) : 0);
      for (let k = 0; k <= len; k++) {
        const y = top + k;
        const band = (((k + (i >> 2) * (side === 'L' ? 1 : -1) + 40) / 4) | 0) % 3;
        let col = band === 0 ? F[1] : band === 1 ? F[0] : F[2];
        const n = hash2(i * 7 + k, v, 3);
        if (n < 0.06) col = F[2]; else if (n > 0.95) col = mix(F[1], [255, 255, 255], 0.15);
        col = dark(col, sideF);
        if (k >= depth && deep) col = dark(col, 1 - (k - depth) / (jag + 1) * 0.55);
        if (k < lipLen && mat !== 'sand') col = k === lipLen - 1 ? L[1] : L[0];
        if (k === len && deep) col = OUT;
        set(i, y, col);
      }
      if (deep && hash2(i, v, 11) < 0.18) {
        const rl = 3 + hash2(i, v, 12) * 9 | 0;
        for (let k = 1; k <= rl; k++) set(i, top + len + k, mat === 2 ? [200, 220, 240] : C('#3a5e3a'));
      }
    }
  });
  faceCache.set(key, c);
  return c;
}
const fallCache = new Map();
function getFall(side, f) {
  const key = side + f;
  let c = fallCache.get(key); if (c) return c;
  const P = WATER[1].map(C);
  c = mk(16, 80, (set) => {
    for (let i = 0; i < 16; i++) {
      const top = side === 'L' ? (i >> 1) : 7 - (i >> 1);
      const len = 50 + (hash2(i, 5, 2) * 20 | 0);
      for (let k = 0; k <= len; k++) {
        const s = (k - f * 3 + i * 7 + 400) % 9;
        let col = s < 2 ? P[3] : s < 4 ? P[2] : P[1];
        const a = k > len - 16 ? Math.max(0, (len - k) / 16) : 1;
        set(i, top + k, col, a * 235 | 0);
      }
    }
  });
  fallCache.set(key, c);
  return c;
}
function blob(set, bx, by, br, P, seed, squish = 1.1) {
  for (let y = Math.floor(by - br - 1); y <= by + br + 1; y++) for (let x = Math.floor(bx - br - 1); x <= bx + br + 1; x++) {
    const dx = x - bx, dy = y - by, d = Math.hypot(dx, dy * squish);
    if (d > br) continue;
    const l = (-dx - dy) / br, nn = hash2(x, y, seed);
    let c = l > 0.42 ? P[2] : l < -0.3 ? P[0] : P[1];
    if (nn < 0.07) c = P[0]; else if (nn > 0.95) c = P[2];
    if (d > br - 1.3 && dy > 0) c = P[0];
    set(x, y, c);
  }
}
const BARK = [C('#4a3230'), C('#6b4a3c'), C('#8a6450')];
function makeTree(cols, seed, big) {
  const r = rng(seed), P = cols.map(C);
  const w = big ? 50 : 42, h = big ? 66 : 56;
  return outlined(mk(w, h, (set) => {
    const cx = w >> 1, tt = (h * 0.45) | 0;
    for (let y = tt; y < h; y++) {
      const wv = 2 + (y > h - 5 ? 1 : 0) + (y > h - 2 ? 1 : 0), off = Math.round(Math.sin(y * 0.18 + seed) * 1.2);
      for (let x = -wv; x <= wv; x++) set(cx + x + off, y, x < 0 ? BARK[2] : x > 0 ? BARK[0] : BARK[1]);
    }
    for (let b = 0; b < 2; b++) {
      const dir = b ? 1 : -1; let bx = cx, by = tt + 4 + (r() * 6 | 0);
      for (let k = 0; k < 8; k++) { set(bx, by, BARK[1]); set(bx, by + 1, BARK[0]); bx += dir; if (k % 2) by--; }
    }
    const blobs = [];
    const n = 5 + (r() * 3 | 0), R0 = big ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = r() * R0;
      blobs.push([cx + Math.cos(a) * d * 1.35, h * 0.3 + Math.sin(a) * d * 0.75, R0 * 0.8 + r() * 4]);
    }
    blobs.push([cx, h * 0.27, R0 + 2]);
    blobs.sort((a, b) => a[1] - b[1]);
    for (const [bx, by, br] of blobs) blob(set, bx, by, br, P, seed);
    for (let i = 0; i < 3; i++) {
      const x = cx + (r() - 0.5) * R0 * 2.4, y = h * 0.3 + R0 * 0.7 + r() * 3;
      for (let k = 0; k < 2 + r() * 4; k++) set(x, y + k, P[0]);
    }
  }));
}
function makePine(seed, snowy) {
  const P = [C('#1c4446'), C('#285e5a'), C('#3c8070')];
  const S = [C('#c6d4ee'), C('#ffffff')];
  return outlined(mk(28, 50, (set) => {
    const cx = 14;
    for (let y = 40; y < 50; y++) for (let x = -1; x <= 1; x++) set(cx + x, y, BARK[x + 1]);
    for (let t = 0; t < 4; t++) {
      const ty = 3 + t * 9, wd = 5 + t * 3;
      for (let k = 0; k < 13; k++) {
        const half = (k / 12) * wd;
        for (let x = -Math.round(half); x <= Math.round(half); x++) {
          let c = x < -half * 0.25 ? P[2] : x > half * 0.35 ? P[0] : P[1];
          if (k > 10) c = P[0];
          if (hash2(x, k + t * 20, seed) < 0.08) c = P[0];
          if (snowy && (k < 3 || (k < 6 && x < 0 && hash2(x, k, seed + 1) < 0.5))) c = k < 2 ? S[1] : S[0];
          set(cx + x, ty + k, c);
        }
      }
    }
  }));
}
function makeBush(cols, seed) {
  const P = cols.map(C);
  return outlined(mk(20, 13, (set) => { blob(set, 7, 7, 5.5, P, seed); blob(set, 12, 6, 6, P, seed + 1); blob(set, 10, 8, 4, P, seed + 2); }));
}
function makeRock(cols, seed) {
  const P = cols.map(C);
  return outlined(mk(16, 11, (set) => { blob(set, 7, 6, 5.5, P, seed, 1.5); blob(set, 10, 7, 4, P, seed + 3, 1.4); }));
}
function makeFlowers(seed, palette) {
  const r = rng(seed);
  return mk(24, 10, (set) => {
    for (let i = 0; i < 6; i++) {
      const x = 2 + r() * 20 | 0, y = 3 + r() * 6 | 0, c = C(palette[r() * palette.length | 0]);
      set(x, y + 1, C('#3c7a3a')); set(x, y, c); set(x - 1, y, c); set(x + 1, y, c); set(x, y - 1, c); set(x, y, C('#fff2b0'));
    }
  });
}
function makeTuft(cols, seed) {
  const P = cols.map(C), r = rng(seed);
  return mk(14, 7, (set) => {
    for (let i = 0; i < 5; i++) {
      const x = 2 + r() * 10 | 0, hh = 2 + r() * 4 | 0;
      for (let k = 0; k < hh; k++) set(x + (k > 2 ? (i % 2 ? 1 : -1) : 0), 6 - k, k === hh - 1 ? P[3] : P[2]);
    }
  });
}
function makeCrystal(seed, cols) {
  const r = rng(seed), P = cols.map(C);
  return outlined(mk(20, 28, (set) => {
    const shards = [[10, 27, 4, 24], [5, 27, 3, 14], [15, 27, 3, 17]];
    for (const [sx, sy, hw, hh] of shards) {
      const lean = (r() - 0.5) * 0.4;
      for (let k = 0; k < hh; k++) {
        const t = k / hh, half = t < 0.75 ? hw : hw * (1 - (t - 0.75) / 0.25);
        const cx = sx + lean * k;
        for (let x = -Math.round(half); x <= Math.round(half); x++) {
          const c = x < 0 ? (x === -Math.round(half) ? P[1] : P[2]) : x === 0 ? P[3] : P[0];
          set(cx + x, sy - k, c);
        }
      }
    }
  }));
}
function makePillar(seed, broken) {
  const P = [C('#6a5068'), C('#8e7690'), C('#b6a0b4'), C('#d6c6d4')];
  const h = broken ? 26 : 38;
  return outlined(mk(16, h, (set) => {
    for (let y = 0; y < h; y++) for (let x = 2; x < 14; x++) {
      const isCap = (!broken && y < 4) || y > h - 4;
      if (!isCap && (x < 4 || x > 11)) continue;
      if (broken && y < 4 && hash2(x, 1, seed) * 5 > y) continue;
      let c = x < 6 ? P[2] : x > 10 ? P[0] : P[1];
      if (!isCap && (x === 6 || x === 9)) c = P[0];
      if (isCap) c = y === 0 || y === h - 4 ? P[3] : P[1];
      if (hash2(x, y, seed) < 0.05) c = P[0];
      if (hash2(x, y >> 2, seed + 5) < 0.12 && y > h * 0.4) c = C('#5d8c52');
      set(x, y, c);
    }
  }));
}
function makeChest(open) {
  const W1 = [C('#5a3826'), C('#8a5634'), C('#b47a48')], G = [C('#a8741e'), C('#e8b040'), C('#fff0a0')];
  return outlined(mk(16, 13, (set) => {
    for (let y = 0; y < 13; y++) for (let x = 0; x < 16; x++) {
      if (open && y < 4) { if (y > 1) set(x, y, x % 5 === 0 ? G[1] : W1[0]); continue; }
      let c = y < 5 ? W1[2] : W1[1];
      if (y === 5 || y === 12) c = W1[0];
      if (x === 0 || x === 15 || x === 4 || x === 11) c = G[0];
      if (y === 0) c = G[1];
      if (!open && x >= 7 && x <= 8 && y >= 4 && y <= 7) c = G[2];
      set(x, y, c);
    }
    if (open) for (let x = 3; x < 13; x++) set(x, 4, G[2]);
  }));
}
function makeObelisk(on) {
  const P = [C('#2c2440'), C('#3e3458'), C('#584c78')];
  const R = on ? C('#8ffcff') : C('#5a4a7a');
  return outlined(mk(14, 40, (set) => {
    for (let y = 0; y < 40; y++) {
      const half = y < 6 ? Math.max(0, y) * 0.9 : 5 - y / 40 * 1.5 + (y > 35 ? 2 : 0);
      for (let x = -Math.round(half); x <= Math.round(half); x++) {
        let c = x < -1 ? P[2] : x > 1 ? P[0] : P[1];
        if (x === 0 && y > 8 && y < 33 && y % 4 !== 0) c = R;
        if ((x === -2 || x === 2) && y % 6 === 2 && y > 8 && y < 33) c = R;
        set(7 + x, y, c);
      }
    }
  }));
}
function makeShrine() {
  const P = [C('#6a5068'), C('#9e8aa2'), C('#d4c2d2')];
  return outlined(mk(18, 16, (set) => {
    for (let y = 0; y < 16; y++) {
      const hw = y < 3 ? 8 : y < 12 ? 5 : 8;
      for (let x = -hw; x <= hw; x++) set(9 + x, y, y === 0 || y === 12 ? P[2] : x < -2 ? P[2] : x > 2 ? P[0] : P[1]);
    }
  }));
}
function makeAltar() {
  return mk(32, 16, (set) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const dd = Math.abs(x + 0.5 - 16) / 16 + Math.abs(y + 0.5 - 8) / 8;
      const e = Math.hypot((x + 0.5 - 16) / 2, y + 0.5 - 8);
      if (dd > 0.95) continue;
      if (Math.abs(e - 6) < 0.7) set(x, y, C('#e070b0'));
      else if (Math.abs(e - 3) < 0.6) set(x, y, C('#f6c0e0'));
      else if (dd > 0.85) set(x, y, C('#54405a'));
    }
  });
}
function makeLight(col, r) {
  const c = canvas(r * 2, r * 2), g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, css(C(col), 0.9)); gr.addColorStop(0.4, css(C(col), 0.35)); gr.addColorStop(1, css(C(col), 0));
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  return c;
}
function makeShadow(w, h) {
  return mk(w, h, (set) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2;
      if (d <= 1) set(x, y, [20, 14, 30], 90);
    }
  });
}

// ---- personajes
const PLAYER_MAP = [
  '...hhhh...',
  '..hHHhhh..',
  '.hHHhhhhh.',
  '.hHhhhfff.',
  '.hhhhfefe.',
  '.hhhhffff.',
  '..ggggggg.',
  '.tggtttttT',
  'tTtttttttT',
  'tTttttttTT',
  '.bbbbbbbb.',
  '.tTttttTt.',
  '.TtttttTT.',
  '..TTTTTT..',
];
const PLAYER_PAL = { h: '#2f6f73', H: '#55aaa0', f: '#141220', e: '#ffe27a', t: '#e8dcc0', T: '#b4a488', b: '#6b4a3a', g: '#e8a33a' };
const SLIME_MAP = ['....gggg....', '..ggGGgggg..', '.gGGGggggggg', '.gGgwkgggwkg', 'gggggggggggg', 'gggggggggggd', 'dgggggggggdd', '.dddddddddd.'];
const WOLF_MAP = [
  '....s.s.s..f....',
  '...sfsfsf.fff...',
  '..ffffffffffFfr.',
  '.fFFffffffffffff',
  'ffFfffffffffffk.',
  'f.ffffffffffff..',
  '..dff.....dff...',
  '..df......df....',
  '..dd......dd....',
];
const GOLEM_MAP = [
  '....ssssss....',
  '...sSSssssd...',
  '...sSccsccd...',
  '...ssssssdd...',
  '.sssSSssssddd.',
  'sSSsSccccsssdd',
  'sSssScCCcssddd',
  'sSs.sccccss.dd',
  'ss..ssssss..dd',
  'ss..sssssd..d.',
  '...ssd..ssd...',
  '...ssd..ssd...',
  '..sssd..sssd..',
];
const SPR = {};
function buildSprites() {
  SPR.player = spriteSet(fromMap(PLAYER_MAP, PLAYER_PAL));
  SPR.slime = {
    green: spriteSet(fromMap(SLIME_MAP, { g: '#4aa84e', G: '#8ee07a', d: '#2a6a3a', w: '#ffffff', k: '#141220' })),
    dark: spriteSet(fromMap(SLIME_MAP, { g: '#2c7a66', G: '#5ec2a0', d: '#1a4a40', w: '#ffffff', k: '#141220' })),
    pink: spriteSet(fromMap(SLIME_MAP, { g: '#d65d92', G: '#f8a6c8', d: '#9a3a6a', w: '#ffffff', k: '#141220' })),
    ice: spriteSet(fromMap(SLIME_MAP, { g: '#7aa6e0', G: '#d0e6ff', d: '#4a6aa8', w: '#ffffff', k: '#141220' })),
  };
  SPR.wolf = {
    green: spriteSet(fromMap(WOLF_MAP, { f: '#5a4a5a', F: '#8a7a8a', s: '#6fc25f', r: '#ff5a5a', k: '#141220', d: '#3a2e3a' })),
    dark: spriteSet(fromMap(WOLF_MAP, { f: '#2e3a3e', F: '#52666a', s: '#46936a', r: '#ffd25a', k: '#141220', d: '#1e2628' })),
    ice: spriteSet(fromMap(WOLF_MAP, { f: '#c6d4ee', F: '#ffffff', s: '#7ab8e8', r: '#3a8aff', k: '#141220', d: '#8590b0' })),
    pink: spriteSet(fromMap(WOLF_MAP, { f: '#6a4a68', F: '#9a7898', s: '#f598c0', r: '#ff9ae0', k: '#141220', d: '#4a3048' })),
  };
  SPR.golem = {
    pink: spriteSet(fromMap(GOLEM_MAP, { s: '#8a7a96', S: '#b6a8c2', d: '#5a4c66', c: '#f070b8', C: '#ffd0ee' })),
    dark: spriteSet(fromMap(GOLEM_MAP, { s: '#5f63a8', S: '#8a8ed0', d: '#3c3d70', c: '#62e6ff', C: '#e0fcff' })),
    green: spriteSet(fromMap(GOLEM_MAP, { s: '#7a7a6a', S: '#a2a28a', d: '#4e4e44', c: '#a6f06a', C: '#f0ffd0' })),
    ice: spriteSet(fromMap(GOLEM_MAP, { s: '#8590b0', S: '#c6d4ee', d: '#575f7c', c: '#62b6ff', C: '#e0f4ff' })),
  };
  SPR.boss = spriteSet(scaled(fromMap(GOLEM_MAP, { s: '#4a3458', S: '#7a5a8e', d: '#2a1c36', c: '#ff4a9a', C: '#fff0f8' }), 2));
  SPR.shadow = [makeShadow(12, 5), makeShadow(18, 7), makeShadow(34, 12)];
  SPR.coin = fromMap(['.yy.', 'yYyy', 'yyyo', '.oo.'], { y: '#e8b040', Y: '#fff0a0', o: '#a8741e' });
  SPR.potion = fromMap(['.cc.', '.ww.', 'rRrr', 'rrrr', 'rrrd', '.dd.'], { c: '#8a5634', w: '#d8e0ec', r: '#d0283c', R: '#ff8a8a', d: '#7a1020' });
  SPR.gem = fromMap(['.c.', 'cCc', 'ccc', '.c.'], { c: '#c070f0', C: '#f6d0ff' });

  // mundo
  const TS = {};
  for (let b = 0; b < 5; b++) TS[b] = [0, 1, 2].map(v => makeTop(BIO[b].top, 100 + b * 10 + v, b === B_RUINS ? 'ruins' : b === B_SNOW ? 'snow' : 'grass'));
  TS.sand = [0, 1, 2].map(v => makeTop(SAND.top, 300 + v, 'sand'));
  SPR.tops = TS;
  SPR.water = [0, 1].map(s => [0, 1, 2, 3].map(f => makeWater(WATER[s], f, 77)));
  const TREE_COLS = {
    [B_MEADOW]: [['#2f7a3a', '#4aa24a', '#86d46a'], ['#3a8a3a', '#5cb84e', '#a2e27a']],
    [B_FOREST]: [['#1a4a3a', '#28684c', '#438e66'], ['#1e4436', '#2c6448', '#4c946a']],
    [B_PRISM]: [['#a03a6a', '#d65d92', '#f8a6c8'], ['#b0861a', '#dcb22e', '#f6e27a'], ['#1f6a8a', '#2f93b5', '#66c8e2'], ['#2f8a3a', '#4fb84e', '#92e27a'], ['#6a3aa0', '#8f5fd0', '#c6a0f2']],
    [B_RUINS]: [['#a04a78', '#d06a9a', '#f6b0d0'], ['#2f7a3a', '#4aa24a', '#86d46a']],
    [B_SNOW]: [['#2f6a5a', '#3f8a70', '#7ac0a0']],
  };
  SPR.trees = {}; SPR.bushes = {}; SPR.rocks = {}; SPR.tufts = {};
  for (let b = 0; b < 5; b++) {
    SPR.trees[b] = [];
    TREE_COLS[b].forEach((cols, ci) => { for (let v = 0; v < 2; v++) SPR.trees[b].push(makeTree(cols, 500 + b * 40 + ci * 5 + v, b === B_FOREST)); });
    SPR.bushes[b] = [0, 1].map(v => makeBush(TREE_COLS[b][v % TREE_COLS[b].length], 900 + b * 7 + v));
    const f = BIO[b].face;
    SPR.rocks[b] = [0, 1].map(v => makeRock([f[2], f[1], mix(C(f[1]), [255, 255, 255], 0.35).reduce((s, n) => s + n.toString(16).padStart(2, '0'), '#')], 700 + b * 3 + v));
    SPR.tufts[b] = [0, 1].map(v => makeTuft(BIO[b].top, 1200 + b * 5 + v));
  }
  SPR.pines = [makePine(1, true), makePine(2, true), makePine(3, false)];
  SPR.flowers = {
    [B_MEADOW]: [makeFlowers(1, ['#ffffff', '#f6e27a', '#f598c0']), makeFlowers(2, ['#9ab8ff', '#ffffff'])],
    [B_PRISM]: [makeFlowers(3, ['#f598c0', '#c6a0f2', '#66c8e2']), makeFlowers(4, ['#f6e27a', '#ffffff', '#f598c0'])],
  };
  SPR.crystals = [makeCrystal(1, ['#2f6aa8', '#5aa6e0', '#9ee2ff', '#ffffff']), makeCrystal(2, ['#a0407a', '#e070b0', '#ffb6e0', '#ffffff'])];
  SPR.pillars = [makePillar(1, false), makePillar(2, true), makePillar(3, false)];
  SPR.chest = [makeChest(false), makeChest(true)];
  SPR.obelisk = [makeObelisk(false), makeObelisk(true)];
  SPR.shrine = makeShrine();
  SPR.altar = makeAltar();
  SPR.light = { warm: makeLight('#ffc070', 40), cyan: makeLight('#7ff0ff', 30), pink: makeLight('#ff80c0', 30), fire: makeLight('#ff9030', 22), small: makeLight('#fff0a0', 8), white: makeLight('#ffffff', 26) };
  buildIcons();
  buildSky();
}

// ---- iconos de habilidades
const ICON = {};
function buildIcons() {
  ICON.atk = fromMap([
    '............ww',
    '...........wWw',
    '..........wWw.',
    '.........wWw..',
    '........wWw...',
    '.......wWw....',
    '..g...wWw.....',
    '..gg.wWw......',
    '...ggWw.......',
    '....gg........',
    '...bggg.......',
    '..bb..gg......',
    '.bb...........',
    'bb............',
  ], { w: '#9fb4c8', W: '#eef6ff', g: '#e8a33a', b: '#6b4a3a' });
  ICON.q = outlined(mk(14, 14, (set) => {
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const dx = x - 6.5, dy = y - 8;
      const inside = dy >= 0 ? Math.hypot(dx, dy) < 5.2 : Math.abs(dx) < 5.2 * (1 + dy / 8) - Math.sin(y * 1.3 + x) * 0.6;
      if (!inside) continue;
      const d = Math.hypot(dx, dy * 0.8);
      set(x, y, d < 2.2 ? C('#fff6b0') : d < 3.8 ? C('#ffb030') : C('#e0482a'));
    }
  }));
  ICON.w = outlined(mk(14, 14, (set) => {
    for (let a = 0; a < Math.PI * 3.2; a += 0.05) {
      const r = 1 + a * 0.6; set(7 + Math.cos(a) * r, 7 + Math.sin(a) * r * 0.85, a > 6 ? C('#eef6ff') : C('#8ee0d0'));
    }
  }));
  ICON.e = outlined(mk(14, 12, (set) => {
    for (let k = 0; k < 3; k++) for (let x = 0; x < 6 + k * 2; x++) set(x, 2 + k * 3, k === 1 ? C('#ffffff') : C('#9ec8ff'));
    for (let k = 0; k < 5; k++) { set(9 + k, 1 + k, C('#ffffff')); set(9 + k, 9 - k, C('#ffffff')); set(8 + k, 1 + k, C('#9ec8ff')); set(8 + k, 9 - k, C('#9ec8ff')); }
  }));
  ICON.pot = scaled(SPR.potion, 2);
}

// ---- cielo y fondos
const SKY = {};
function buildSky() {
  // montañas lejanas
  SKY.mtn = mk(640, 120, (set) => {
    for (let x = 0; x < 640; x++) {
      const hgt = 40 + fbm(x * 0.008, 3, 41, 4) * 120 - 50;
      const top = 120 - Math.max(10, hgt);
      for (let y = top | 0; y < 120; y++) {
        const slope = fbm((x + 1) * 0.008, 3, 41, 4) - fbm(x * 0.008, 3, 41, 4);
        let c = slope > 0 ? C('#9a8ec0') : C('#b8acd8');
        if (y - top < 6 + hash2(x, 1, 2) * 4 && top < 60) c = slope > 0 ? C('#d8d2f0') : C('#f4f0ff');
        set(x, y, c);
      }
    }
  });
  SKY.hills = mk(640, 90, (set) => {
    for (let x = 0; x < 640; x++) {
      const top = 90 - (18 + fbm(x * 0.015, 9, 51, 3) * 50);
      for (let y = top | 0; y < 90; y++) set(x, y, y - top < 2 ? C('#6aa894') : C('#4e8a7e'));
      if (hash2(x, 3, 3) < 0.07) { // siluetas de pinos
        const ph = 6 + hash2(x, 4, 3) * 8 | 0;
        for (let k = 0; k < ph; k++) for (let i = -((ph - k) >> 2); i <= (ph - k) >> 2; i++) set(x + i, top - k + 2, C('#3e7a6e'));
      }
    }
  });
  SKY.islands = mk(900, 130, (set) => {
    const R = rng(4242);
    for (let n = 0; n < 5; n++) {
      const cx = 60 + n * 170 + R() * 60, cy = 30 + R() * 60, w = 20 + R() * 34;
      for (let x = -w; x <= w; x++) {
        const depth = (1 - Math.abs(x / w)) ** 0.8 * (w * 1.1) * (0.7 + vnoise(x * 0.2, n, 9) * 0.6);
        for (let k = 0; k < depth; k++) set(cx + x, cy + k, k < 3 ? C('#a6c2a0') : x < 0 ? C('#a898b8') : C('#9080a6'));
      }
      if (R() < 0.6) { // torres en ruinas
        const tx = cx + (R() - 0.5) * w, th = 15 + R() * 30;
        for (let k = 0; k < th; k++) for (let i = -2; i <= 2; i++) set(tx + i, cy - k, i < 0 ? C('#b2a4c2') : C('#9686ac'));
      }
      if (R() < 0.7) { const fx = cx + (R() - 0.5) * w * 0.6; for (let k = 0; k < 40; k++) set(fx, cy + w * 0.5 + k, C('#e8f4ff'), 200 - k * 4); }
    }
  });
  const cloudLayer = (seed, w, h, n, cols) => mk(w, h, (set) => {
    const R = rng(seed), P = cols.map(C);
    for (let i = 0; i < n; i++) {
      const cx = R() * w, cy = h * 0.4 + R() * h * 0.4, cw = 20 + R() * 40;
      for (let p = 0; p < 6; p++) {
        const px = cx + (R() - 0.5) * cw * 1.6, py = cy - R() * 10, pr = 6 + R() * 10;
        for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) {
          if (x * x + y * y > pr * pr) continue;
          const l = (-x - y * 1.5) / pr;
          const c = l > 0.6 ? P[0] : l > -0.5 ? P[1] : P[2];
          for (const ox of [0, w]) set((px + x + ox) % w, py + y, c);
        }
      }
    }
  });
  SKY.cloudsFar = cloudLayer(7, 700, 80, 9, ['#ffffff', '#f2e8e4', '#d8cad6']);
  SKY.cloudsNear = cloudLayer(8, 800, 110, 10, ['#fffaf2', '#f4e6de', '#d6c4cc']);
  SKY.stars = mk(400, 160, (set) => { for (let i = 0; i < 90; i++) set(hash2(i, 1, 5) * 400, hash2(i, 2, 5) * 160, [255, 255, 240], 120 + hash2(i, 3, 5) * 135 | 0); });
}

// ============================================================ mundo
const N = 160, SEED = 20261121;
const HT = new Int8Array(N * N), BI = new Uint8Array(N * N), OB = new Uint8Array(N * N);
const TV = new Uint8Array(N * N), SANDT = new Uint8Array(N * N), REACH = new Uint8Array(N * N);
const O_TREE = 1, O_PINE = 2, O_BUSH = 3, O_ROCK = 4, O_FLOW = 5, O_PILLAR = 6, O_CRYST = 7, O_CHEST = 8, O_OBEL = 9, O_SHRINE = 10, O_TUFT = 11, O_CHESTO = 12, O_ALTAR = 13;
const BLOCK = [0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0];
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const idx = (x, y) => y * N + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const hAt = (x, y) => (inb(x, y) ? HT[y * N + x] : -1);
const W_ = { spawn: [0, 0], obelisks: [], chests: [], shrines: [], altar: [0, 0], land: 0 };
let miniC = null;

function bfs(sx, sy) {
  REACH.fill(0);
  const q = new Int32Array(N * N); let qh = 0, qt = 0;
  const s = idx(sx, sy); q[qt++] = s; REACH[s] = 1; let count = 1;
  while (qh < qt) {
    const i = q[qh++], x = i % N, y = (i / N) | 0, h = HT[i];
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
      const j = idx(nx, ny); if (REACH[j]) continue;
      const nh = HT[j]; if (nh < 1 || BLOCK[OB[j]] || Math.abs(nh - h) > 1) continue;
      REACH[j] = 1; q[qt++] = j; count++;
    }
  }
  return count;
}
function genWorld() {
  const R = rng(SEED);
  const ruins = [[N / 2, N / 2, 12]];
  for (let k = 0; k < 2; k++) { const a = R() * TAU, d = 38 + R() * 12; ruins.push([N / 2 + Math.cos(a) * d, N / 2 + Math.sin(a) * d, 7]); }
  let land = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y);
    const nx = (x - N / 2) / (N / 2), ny = (y - N / 2) / (N / 2), d = Math.sqrt(nx * nx + ny * ny);
    const mask = 1 - d * 1.08 + (fbm(x * 0.06, y * 0.06, SEED + 1, 3) - 0.5) * 0.6;
    if (mask < 0.06) { HT[i] = -1; continue; }
    let e = fbm(x * 0.03, y * 0.03, SEED + 2, 5) * 1.15 + Math.min(mask, 0.45) * 0.4 - 0.19;
    let h = e < 0.36 ? 0 : 1 + Math.floor((e - 0.36) / 0.075);
    const lake = fbm(x * 0.045, y * 0.045, SEED + 5, 3);
    if (lake > 0.64 && mask > 0.2) h = 0;
    h = Math.min(h, 6);
    const t = fbm(x * 0.022, y * 0.022, SEED + 3, 3), m = fbm(x * 0.026, y * 0.026, SEED + 4, 3);
    let b = B_MEADOW;
    if (h >= 5 || (h >= 4 && t < 0.4)) b = B_SNOW;
    else if (m > 0.54 && t > 0.47) b = B_PRISM;
    else if (m > 0.47) b = B_FOREST;
    for (const [rx, ry, rr] of ruins) if (Math.hypot(x - rx, y - ry) < rr * (0.75 + fbm(x * 0.1, y * 0.1, SEED + 6, 2) * 0.6)) { b = B_RUINS; if (h === 0) h = 1; }
    HT[i] = h; BI[i] = b; TV[i] = (hash2(x, y, SEED) * 3) | 0;
    if (h > 0) land++;
  }
  W_.land = land;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y); if (HT[i] < 1) continue;
    let nearW = false; for (const [dx, dy] of D4) if (hAt(x + dx, y + dy) === 0) nearW = true;
    if (nearW && BI[i] !== B_SNOW && BI[i] !== B_RUINS) SANDT[i] = 1;
    const r = hash2(x, y, SEED + 9), b = BI[i];
    let o = 0;
    if (SANDT[i]) o = r < 0.03 ? O_ROCK : r < 0.08 ? O_TUFT : 0;
    else if (b === B_MEADOW) o = r < 0.05 ? O_TREE : r < 0.08 ? O_BUSH : r < 0.095 ? O_ROCK : r < 0.2 ? O_FLOW : r < 0.34 ? O_TUFT : 0;
    else if (b === B_FOREST) o = r < 0.2 ? O_TREE : r < 0.26 ? O_BUSH : r < 0.28 ? O_ROCK : r < 0.44 ? O_TUFT : 0;
    else if (b === B_SNOW) o = r < 0.11 ? O_PINE : r < 0.15 ? O_ROCK : 0;
    else if (b === B_PRISM) o = r < 0.12 ? O_TREE : r < 0.155 ? O_CRYST : r < 0.27 ? O_FLOW : r < 0.36 ? O_TUFT : 0;
    else if (b === B_RUINS) o = r < 0.06 ? O_PILLAR : r < 0.08 ? O_TREE : r < 0.095 ? O_ROCK : r < 0.16 ? O_TUFT : 0;
    OB[i] = o;
  }
  // punto de inicio
  const cands = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y), d = Math.hypot(x - N / 2, y - N / 2);
    if (BI[i] === B_MEADOW && HT[i] >= 2 && HT[i] <= 4 && d > 22 && d < 45 && !SANDT[i]) cands.push([x, y]);
  }
  for (let k = cands.length - 1; k > 0; k--) { const j = R() * (k + 1) | 0; [cands[k], cands[j]] = [cands[j], cands[k]]; }
  let sp = cands[0] || [N / 2, N / 2];
  for (const c of cands.slice(0, 40)) {
    const save = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(c[0] + dx, c[1] + dy)) save.push(idx(c[0] + dx, c[1] + dy));
    if (save.some(i => HT[i] < 1)) continue;
    const old = save.map(i => OB[i]); save.forEach(i => { OB[i] = 0; });
    if (bfs(c[0], c[1]) > land * 0.4) { sp = c; break; }
    save.forEach((i, k) => { OB[i] = old[k]; });
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(sp[0] + dx, sp[1] + dy)) OB[idx(sp[0] + dx, sp[1] + dy)] = 0;
  bfs(sp[0], sp[1]);
  W_.spawn = sp;
  const reach = []; for (let i = 0; i < N * N; i++) if (REACH[i]) reach.push(i);
  const pick = (filter, tries = 4000) => { for (let t = 0; t < tries; t++) { const i = reach[R() * reach.length | 0]; if (filter(i % N, (i / N) | 0, i)) return [i % N, (i / N) | 0]; } return null; };
  const clearAround = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy) && (dx || dy)) { const j = idx(x + dx, y + dy); if (BLOCK[OB[j]]) OB[j] = O_TUFT; } };
  // santuario inicial
  OB[idx(sp[0] + 1, sp[1] - 1)] = O_SHRINE; W_.shrines.push([sp[0] + 1, sp[1] - 1]);
  // altar del guardián
  let best = null, bd = 1e9;
  for (const i of reach) { if (BI[i] !== B_RUINS) continue; const x = i % N, y = (i / N) | 0, d = Math.hypot(x - N / 2, y - N / 2); if (d < bd) { bd = d; best = [x, y]; } }
  if (!best) best = pick((x, y) => Math.hypot(x - sp[0], y - sp[1]) > 40) || [sp[0] + 3, sp[1]];
  W_.altar = best; OB[idx(best[0], best[1])] = O_ALTAR; clearAround(best[0], best[1], 3);
  // obeliscos
  for (const bio of [B_PRISM, B_SNOW, B_FOREST]) {
    const ok = (x, y, i) => !OB[i] && Math.hypot(x - sp[0], y - sp[1]) > 30 && W_.obelisks.every(o => Math.hypot(o.x - x, o.y - y) > 30) && Math.hypot(x - best[0], y - best[1]) > 15;
    const p = pick((x, y, i) => BI[i] === bio && ok(x, y, i)) || pick((x, y, i) => ok(x, y, i)) || pick((x, y, i) => !OB[i]);
    OB[idx(p[0], p[1])] = O_OBEL; clearAround(p[0], p[1], 1);
    W_.obelisks.push({ x: p[0], y: p[1], on: false });
  }
  for (let k = 0; k < 22; k++) {
    const p = pick((x, y, i) => !OB[i] && Math.hypot(x - sp[0], y - sp[1]) > 9 && (BI[i] !== B_MEADOW || R() < 0.4) && W_.chests.every(c => Math.hypot(c[0] - x, c[1] - y) > 8));
    if (p) { OB[idx(p[0], p[1])] = O_CHEST; W_.chests.push(p); }
  }
  for (let k = 0; k < 5; k++) {
    const p = pick((x, y, i) => !OB[i] && W_.shrines.every(s => Math.hypot(s[0] - x, s[1] - y) > 26));
    if (p) { OB[idx(p[0], p[1])] = O_SHRINE; W_.shrines.push(p); clearAround(p[0], p[1], 1); }
  }
  bfs(sp[0], sp[1]);
  // minimapa
  miniC = mk(N, N, (set) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = idx(x, y), h = HT[i];
      if (h < 0) continue;
      let c = h === 0 ? C('#3a78b8') : SANDT[i] ? C('#dcc08a') : C(BIO[BI[i]].mini);
      if (h > 0) c = mix(dark(c, 0.75), c, Math.min(1, h / 5));
      if (OB[i] === O_TREE || OB[i] === O_PINE) c = dark(c, 0.78);
      set(x, y, c);
    }
  });
}

// ============================================================ estado de juego
const P = {
  x: 0, y: 0, z: 2, fx: 1, fy: 0, face: 1, lvl: 1, xp: 0, hp: 100, mp: 50, gold: 0, pots: 3, bonus: 0,
  acd: 0, cdQ: 0, cdW: 0, cdE: 0, pcd: 0, swing: 0, swingAng: 0, whirl: 0, dash: 0, dvx: 0, dvy: 0, inv: 0,
  walk: 0, moving: false, cp: [0, 0], dead: 0, chan: 0, chanIdx: -1, hurtFx: 0,
};
const maxHp = () => 90 + P.lvl * 20;
const maxMp = () => 40 + P.lvl * 10;
const atk = () => 8 + P.lvl * 3 + P.bonus;
const needXp = (l) => Math.round(40 * Math.pow(l, 1.55));
const COST = { q: 12, w: 22, e: 10 };
const CD = { q: 0.55, w: 3.5, e: 1.6 };
let enemies = [], projs = [], parts = [], floats = [], pickups = [], msgs = [];
let mode = 'title', gtime = 0, dayT = 0.27, shake = 0, region = -1, regionT = 0, bossOn = false, bossDone = false, spawnT = 0;
let openedChests = new Set(), lastShrine = -1, saveT = 0, hasSave = false;
let camX = 0, camY = 0, deathT = 0, winT = 0;

const ET = {
  slime: { hp: 26, dmg: 6, spd: 1.7, xp: 9, r: 0.3, range: 0.75, wind: 0.35, cd: 1.1, aggro: 6, sh: 0 },
  wolf: { hp: 38, dmg: 9, spd: 3.0, xp: 14, r: 0.35, range: 0.8, wind: 0.3, cd: 1.0, aggro: 7.5, sh: 1 },
  wisp: { hp: 26, dmg: 8, spd: 2.2, xp: 15, r: 0.3, range: 0, wind: 0, cd: 2.1, aggro: 8, sh: 0, ranged: true },
  golem: { hp: 105, dmg: 16, spd: 1.15, xp: 32, r: 0.45, range: 1.0, wind: 0.65, cd: 1.7, aggro: 6, sh: 1, aoe: 1.5 },
  boss: { hp: 1500, dmg: 24, spd: 1.35, xp: 450, r: 0.75, range: 1.5, wind: 0.8, cd: 1.6, aggro: 30, sh: 2, aoe: 2.3 },
};
const BIO_SPAWN = {
  [B_MEADOW]: [['slime', 'green', 0.75], ['wolf', 'green', 1]],
  [B_FOREST]: [['wolf', 'dark', 0.5], ['slime', 'dark', 0.85], ['golem', 'green', 1]],
  [B_SNOW]: [['wisp', 'ice', 0.45], ['wolf', 'ice', 0.8], ['golem', 'ice', 1]],
  [B_PRISM]: [['slime', 'pink', 0.45], ['wisp', 'pink', 0.75], ['golem', 'dark', 1]],
  [B_RUINS]: [['golem', 'pink', 0.45], ['wolf', 'pink', 0.8], ['wisp', 'pink', 1]],
};
const WISP_COL = { ice: '#9ee2ff', pink: '#ff9ae0' };

function spawnEnemy(type, skin, x, y, lvl) {
  const T = ET[type];
  const e = {
    type, skin, x, y, z: hAt(x | 0, y | 0), lvl, hp: 0, max: 0, dmg: T.dmg * (1 + 0.18 * (lvl - 1)), r: T.r,
    state: 'idle', t: 0, cd: 0.5 + Math.random(), face: 1, flash: 0, kx: 0, ky: 0, wt: 0, wx: 0, wy: 0, anim: Math.random() * 10,
    aggro: false, sumT: 6, shardT: 3,
  };
  e.max = e.hp = Math.round(T.hp * (1 + 0.3 * (lvl - 1)));
  enemies.push(e);
  return e;
}

// ============================================================ guardado
const SAVE_KEY = 'ecos-aethel-v1';
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      lvl: P.lvl, xp: P.xp, gold: P.gold, pots: P.pots, bonus: P.bonus, cp: P.cp,
      ob: W_.obelisks.map(o => o.on), ch: [...openedChests], boss: bossDone, day: dayT,
    }));
  } catch (e) { /* almacenamiento no disponible */ }
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.lvl ? s : null; } catch (e) { return null; }
}
function applySave(s) {
  P.lvl = s.lvl; P.xp = s.xp; P.gold = s.gold; P.pots = s.pots; P.bonus = s.bonus || 0;
  if (s.cp) P.cp = s.cp;
  (s.ob || []).forEach((on, i) => { if (W_.obelisks[i]) W_.obelisks[i].on = on; });
  openedChests = new Set(s.ch || []);
  openedChests.forEach(i => { const c = W_.chests[i]; if (c) OB[idx(c[0], c[1])] = O_CHESTO; });
  bossDone = !!s.boss; if (typeof s.day === 'number') dayT = s.day;
}
function resetGame(fresh) {
  if (fresh) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ } }
  Object.assign(P, { lvl: 1, xp: 0, gold: 0, pots: 3, bonus: 0, cp: [W_.spawn[0] + 0.5, W_.spawn[1] + 0.5] });
  W_.obelisks.forEach(o => { o.on = false; });
  openedChests.forEach(i => { const c = W_.chests[i]; if (c) OB[idx(c[0], c[1])] = O_CHEST; });
  openedChests = new Set(); bossDone = false; bossOn = false;
  if (!fresh) { const s = loadSave(); if (s) applySave(s); }
  P.x = P.cp[0]; P.y = P.cp[1]; P.z = hAt(P.x | 0, P.y | 0);
  P.hp = maxHp(); P.mp = maxMp(); P.dead = 0;
  enemies = []; projs = []; pickups = []; parts = []; floats = [];
  region = -1;
  if (W_.obelisks.every(o => o.on) && !bossDone) summonBoss(true);
}

// ============================================================ audio
let AC = null;
function unlockAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}
const SFX = {
  swing: ['triangle', 340, 110, 0.09, 0.07], hit: ['square', 200, 60, 0.1, 0.06], fire: ['sawtooth', 520, 140, 0.25, 0.04],
  whirl: ['triangle', 180, 560, 0.32, 0.06], dash: ['sine', 760, 180, 0.13, 0.06], pick: ['square', 880, 1500, 0.07, 0.035],
  lvl: ['triangle', 440, 1320, 0.7, 0.08], hurt: ['sawtooth', 150, 55, 0.2, 0.07], potion: ['sine', 300, 760, 0.3, 0.07],
  chest: ['triangle', 520, 1180, 0.4, 0.06], boom: ['sawtooth', 130, 35, 0.45, 0.08], obel: ['sine', 220, 880, 1.2, 0.08], die: ['triangle', 300, 40, 1.0, 0.08],
};
function sfx(type) {
  if (!AC) return;
  const p = SFX[type]; if (!p) return;
  try {
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = p[0]; o.frequency.setValueAtTime(p[1], t); o.frequency.exponentialRampToValueAtTime(p[2], t + p[3]);
    g.gain.setValueAtTime(p[4], t); g.gain.exponentialRampToValueAtTime(0.0008, t + p[3]);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + p[3] + 0.03);
  } catch (e) { /* audio no disponible */ }
}

// ============================================================ entrada
const keys = {};
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const held = {};
const pressedEdge = {};
const UI = {};
function layoutUI() {
  UI.atk = { x: W - 31, y: H - 32, r: 19 };
  UI.q = { x: W - 76, y: H - 20, r: 12 };
  UI.w = { x: W - 71, y: H - 57, r: 12 };
  UI.e = { x: W - 37, y: H - 78, r: 12 };
  UI.hp = { x: (W / 2 | 0) - 64, y: H - 22, r: 18 };
  UI.mp = { x: (W / 2 | 0) + 64, y: H - 22, r: 18 };
  UI.pot = { x: (W / 2 | 0) - 26, y: H - 12, r: 9 };
  UI.mini = { x: W - 34, y: 33, r: 27 };
  if (W < 400) { UI.hp.x = (W / 2 | 0) - 50; UI.mp.x = (W / 2 | 0) + 50; UI.pot.x = (W / 2 | 0) - 18; }
}
const BTN_IDS = ['atk', 'q', 'w', 'e', 'pot'];
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; }
function hitBtn(p) {
  for (const id of BTN_IDS) { const b = UI[id]; if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 5) return id; }
  return null;
}
function tryFullscreen() {
  const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* nada */ } }).catch(() => {}); } catch (e) { /* nada */ }
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); unlockAudio();
  const p = toLogical(e);
  if (mode === 'title') { titleClick(p); return; }
  if (mode !== 'play') return;
  const b = hitBtn(p);
  if (b) { held[b] = e.pointerId; pressedEdge[b] = true; return; }
  if (p.x < W * 0.5 && joy.id === null) { joy.id = e.pointerId; joy.ox = joy.x = p.x; joy.oy = joy.y = p.y; }
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) { const p = toLogical(e); joy.x = p.x; joy.y = p.y; }
});
const release = (e) => {
  if (e.pointerId === joy.id) joy.id = null;
  for (const id of BTN_IDS) if (held[id] === e.pointerId) held[id] = undefined;
};
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('contextmenu', (e) => e.preventDefault());
const KEYMAP = { Space: 'atk', KeyJ: 'atk', Digit1: 'q', KeyK: 'q', Digit2: 'w', KeyL: 'w', Digit3: 'e', ShiftLeft: 'e', Semicolon: 'e', KeyQ: 'pot', Digit4: 'pot', KeyH: 'pot' };
window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(false); e.preventDefault(); return; }
  if (!keys[e.code] && KEYMAP[e.code]) pressedEdge[KEYMAP[e.code]] = true;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.id = null; });
function isHeld(id) {
  if (held[id] !== undefined) return true;
  for (const k in KEYMAP) if (KEYMAP[k] === id && keys[k]) return true;
  return false;
}
function moveInput() {
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (mx || my) { const l = Math.hypot(mx, my); return [mx / l, my / l, 1]; }
  if (joy.id !== null) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy);
    if (l > 3) { const m = Math.min(1, l / 22); return [dx / l, dy / l, m]; }
  }
  return [0, 0, 0];
}
// dirección en pantalla -> dirección en el mundo isométrico
function screenToWorldDir(sx, sy) {
  const x = sx / 32 + sy / 16, y = sy / 16 - sx / 32, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

// ============================================================ física y colisiones
function canStand(e, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inb(tx, ty)) return false;
  const i = idx(tx, ty), h = HT[i];
  if (h < 1 || BLOCK[OB[i]]) return false;
  return Math.abs(h - hAt(Math.floor(e.x), Math.floor(e.y))) <= 1;
}
function tryMove(e, dx, dy) {
  const r = 0.24; let moved = false;
  if (dx) { const nx = e.x + dx; if (canStand(e, nx + Math.sign(dx) * r, e.y)) { e.x = nx; moved = true; } }
  if (dy) { const ny = e.y + dy; if (canStand(e, e.x, ny + Math.sign(dy) * r)) { e.y = ny; moved = true; } }
  return moved;
}
const scrX = (x, y) => (x - y) * 16;
const scrY = (x, y, z) => (x + y) * 8 - z * 8;

// ============================================================ efectos
function burst(x, y, z, col, n, spd = 40, life = 0.5, g = 60, size = 1) {
  const px = scrX(x, y), py = scrY(x, y, z) - 6;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, s = spd * (0.3 + Math.random());
    parts.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - spd * 0.4, life: life * (0.6 + Math.random() * 0.6), max: life, col, g, size, glow: false });
  }
}
function floatText(x, y, z, text, col) {
  floats.push({ x: scrX(x, y) + (Math.random() - 0.5) * 8, y: scrY(x, y, z) - 22, text: String(text), col, life: 0.9 });
}
function notify(text, col = '#f6e27a', dur = 3) { msgs.push({ text, col, life: dur, max: dur }); if (msgs.length > 3) msgs.shift(); }

// ============================================================ combate
function aim() {
  let best = null, bd = 4.5;
  for (const e of enemies) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = e; } }
  if (best) { const dx = best.x - P.x, dy = best.y - P.y, l = Math.hypot(dx, dy) || 1; P.fx = dx / l; P.fy = dy / l; }
  const sx = P.fx - P.fy; if (Math.abs(sx) > 0.05) P.face = sx > 0 ? 1 : -1;
}
function damageEnemy(e, amt, kb = 2.5, fromX = P.x, fromY = P.y) {
  const crit = Math.random() < 0.12;
  amt = Math.round(amt * (crit ? 1.8 : 1));
  e.hp -= amt; e.flash = 0.12; e.aggro = true;
  const dx = e.x - fromX, dy = e.y - fromY, l = Math.hypot(dx, dy) || 1;
  const kbm = e.type === 'boss' ? 0.15 : e.type === 'golem' ? 0.5 : 1;
  e.kx = dx / l * kb * kbm; e.ky = dy / l * kb * kbm;
  floatText(e.x, e.y, e.z, crit ? amt + '!' : amt, crit ? '#ffd040' : '#ffffff');
  burst(e.x, e.y, e.z, [255, 240, 220], 4, 50, 0.25, 0);
  sfx('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const T = ET[e.type];
  const xp = Math.round(T.xp * (1 + 0.25 * (e.lvl - 1)));
  gainXp(xp);
  const skinCol = { green: [110, 200, 90], dark: [70, 150, 120], pink: [240, 130, 190], ice: [180, 210, 255] }[e.skin] || [200, 200, 200];
  burst(e.x, e.y, e.z, skinCol, e.type === 'boss' ? 60 : 14, 60, 0.7, 80, e.type === 'boss' ? 2 : 1);
  const nc = 1 + (Math.random() * 3 | 0) + (e.type === 'golem' ? 2 : 0);
  for (let k = 0; k < nc; k++) pickups.push({ x: e.x + (Math.random() - 0.5) * 0.6, y: e.y + (Math.random() - 0.5) * 0.6, kind: 'coin', val: 1 + Math.round(e.lvl * (1 + Math.random() * 2)), t: Math.random() * 6 });
  if (Math.random() < (e.type === 'golem' ? 0.3 : 0.1)) pickups.push({ x: e.x, y: e.y, kind: 'potion', val: 1, t: 0 });
  if (e.type === 'boss') {
    bossOn = false; bossDone = true;
    for (let k = 0; k < 4; k++) pickups.push({ x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), kind: 'potion', val: 1, t: 0 });
    for (let k = 0; k < 3; k++) pickups.push({ x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), kind: 'gem', val: 1, t: 0 });
    for (let k = 0; k < 20; k++) pickups.push({ x: e.x + (Math.random() - 0.5) * 2, y: e.y + (Math.random() - 0.5) * 2, kind: 'coin', val: 20, t: Math.random() * 6 });
    shake = 10; sfx('boom'); winT = 6;
    notify('¡EL GUARDIÁN DEL VELO HA CAÍDO!', '#ffd040', 6);
    save();
  }
}
function gainXp(n) {
  P.xp += n;
  while (P.xp >= needXp(P.lvl)) {
    P.xp -= needXp(P.lvl); P.lvl++;
    P.hp = maxHp(); P.mp = maxMp();
    notify('¡NIVEL ' + P.lvl + '!', '#ffd040', 3);
    burst(P.x, P.y, P.z, [255, 220, 100], 40, 70, 1.0, -20);
    sfx('lvl'); save();
  }
}
function hurtPlayer(d) {
  if (P.inv > 0 || P.dead) return;
  d = Math.round(d * (0.9 + Math.random() * 0.2));
  P.hp -= d; P.inv = 0.45; P.hurtFx = 0.3; shake = Math.max(shake, 3);
  floatText(P.x, P.y, P.z, '-' + d, '#ff5a5a');
  sfx('hurt');
  if (P.hp <= 0) { P.hp = 0; P.dead = 1; deathT = 3; sfx('die'); burst(P.x, P.y, P.z, [232, 220, 192], 30, 60, 1, 60); }
}
function doAttack() {
  if (P.acd > 0) return;
  aim();
  P.acd = 0.36; P.swing = 0.2;
  const sx = (P.fx - P.fy) * 16, sy = (P.fx + P.fy) * 8;
  P.swingAng = Math.atan2(sy, sx);
  sfx('swing');
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    if (d < 1.5 + e.r && ((dx * P.fx + dy * P.fy) / (d || 1) > 0.1 || d < 0.6)) damageEnemy(e, atk() * (0.9 + Math.random() * 0.2), 3);
  }
}
function castQ() {
  if (P.cdQ > 0 || P.mp < COST.q) return;
  aim(); P.mp -= COST.q; P.cdQ = CD.q;
  projs.push({ x: P.x + P.fx * 0.4, y: P.y + P.fy * 0.4, z: P.z, vx: P.fx * 10, vy: P.fy * 10, life: 1.1, from: 'p', dmg: atk() * 2.1, kind: 'fire', r: 0.45 });
  sfx('fire');
}
function castW() {
  if (P.cdW > 0 || P.mp < COST.w) return;
  P.mp -= COST.w; P.cdW = CD.w; P.whirl = 0.45; shake = 3;
  sfx('whirl');
  for (const e of enemies) { if (e.dead) continue; if (Math.hypot(e.x - P.x, e.y - P.y) < 2.4 + e.r) damageEnemy(e, atk() * 1.6, 7); }
  const px = scrX(P.x, P.y), py = scrY(P.x, P.y, P.z) - 8;
  for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; parts.push({ x: px, y: py, vx: Math.cos(a) * 110, vy: Math.sin(a) * 55, life: 0.35, max: 0.35, col: [200, 255, 240], g: 0, size: 1, glow: true }); }
}
function castE() {
  if (P.cdE > 0 || P.mp < COST.e) return;
  const [mx, my, m] = moveInput();
  let dx = P.fx, dy = P.fy;
  if (m > 0) [dx, dy] = screenToWorldDir(mx, my);
  P.mp -= COST.e; P.cdE = CD.e; P.dash = 0.17; P.dvx = dx * 20; P.dvy = dy * 20; P.inv = Math.max(P.inv, 0.3);
  sfx('dash');
}
function usePotion() {
  if (P.pcd > 0 || P.pots <= 0 || P.hp >= maxHp()) return;
  P.pots--; P.pcd = 1; const heal = Math.round(maxHp() * 0.5); P.hp = Math.min(maxHp(), P.hp + heal);
  floatText(P.x, P.y, P.z, '+' + heal, '#7cff8a');
  burst(P.x, P.y, P.z, [255, 120, 140], 16, 30, 0.8, -30);
  sfx('potion');
}
function summonBoss(silent) {
  if (bossOn || bossDone) return;
  bossOn = true;
  const [ax, ay] = W_.altar;
  const b = spawnEnemy('boss', 'pink', ax + 0.5, ay + 0.5, Math.max(P.lvl, 6));
  b.aggro = false;
  if (!silent) { notify('EL GUARDIÁN DEL VELO DESPIERTA EN LAS RUINAS', '#ff80c0', 6); sfx('boom'); shake = 8; }
}

// ============================================================ actualización
function updatePlayer(dt) {
  const T = gtime;
  P.acd -= dt; P.cdQ -= dt; P.cdW -= dt; P.cdE -= dt; P.pcd -= dt; P.inv -= dt; P.swing -= dt; P.whirl -= dt; P.hurtFx -= dt;
  if (P.dead) {
    deathT -= dt;
    if (deathT <= 0) {
      P.dead = 0; P.x = P.cp[0]; P.y = P.cp[1]; P.z = hAt(P.x | 0, P.y | 0);
      P.hp = maxHp(); P.mp = maxMp(); P.gold = Math.floor(P.gold * 0.9);
      enemies = enemies.filter(e => e.type === 'boss');
      enemies.forEach(e => { e.aggro = false; e.hp = e.max; e.x = W_.altar[0] + 0.5; e.y = W_.altar[1] + 0.5; });
      notify('HAS DESPERTADO EN EL SANTUARIO', '#c6d4ee', 3);
    }
    return;
  }
  P.hp = Math.min(maxHp(), P.hp + dt * (0.6 + P.lvl * 0.15));
  P.mp = Math.min(maxMp(), P.mp + dt * (4 + P.lvl * 0.4));
  const [mx, my, m] = moveInput();
  P.moving = false;
  if (P.dash > 0) {
    P.dash -= dt;
    tryMove(P, P.dvx * dt, P.dvy * dt);
    if (Math.random() < 0.9) parts.push({ x: scrX(P.x, P.y), y: scrY(P.x, P.y, P.z) - 8, vx: 0, vy: 0, life: 0.25, max: 0.25, col: [160, 220, 255], g: 0, size: 2, glow: true });
  } else if (m > 0) {
    const [wx, wy] = screenToWorldDir(mx, my);
    const spd = 4.3 * m;
    tryMove(P, wx * spd * dt, wy * spd * dt);
    if (P.swing <= 0) { P.fx = wx; P.fy = wy; if (Math.abs(mx) > 0.1) P.face = mx > 0 ? 1 : -1; }
    P.moving = true; P.walk += dt * 11 * m;
  }
  const th = hAt(P.x | 0, P.y | 0);
  P.z = lerp(P.z, th, Math.min(1, dt * 14));
  // acciones
  if (isHeld('atk')) doAttack();
  if (pressedEdge.q) castQ();
  if (pressedEdge.w) castW();
  if (pressedEdge.e) castE();
  if (pressedEdge.pot) usePotion();
  // interacción con el mundo
  W_.chests.forEach((c, i) => {
    if (openedChests.has(i)) return;
    if (Math.hypot(c[0] + 0.5 - P.x, c[1] + 0.5 - P.y) < 1.35) {
      openedChests.add(i); OB[idx(c[0], c[1])] = O_CHESTO; sfx('chest');
      const g = 15 + Math.round(Math.random() * 25 * P.lvl);
      for (let k = 0; k < 6; k++) pickups.push({ x: c[0] + 0.5 + (Math.random() - 0.5) * 1.4, y: c[1] + 0.5 + (Math.random() - 0.5) * 1.4, kind: 'coin', val: Math.ceil(g / 6), t: Math.random() * 6 });
      if (Math.random() < 0.6) pickups.push({ x: c[0] + 0.9, y: c[1] + 0.9, kind: 'potion', val: 1, t: 0 });
      if (Math.random() < 0.35) pickups.push({ x: c[0] + 0.2, y: c[1] + 1.0, kind: 'gem', val: 1, t: 0 });
      burst(c[0] + 0.5, c[1] + 0.5, hAt(c[0], c[1]), [255, 220, 120], 20, 50, 0.8, 40);
      notify('COFRE ABIERTO', '#f6e27a', 2); save();
    }
  });
  let chanNear = -1;
  W_.obelisks.forEach((o, i) => { if (!o.on && Math.hypot(o.x + 0.5 - P.x, o.y + 0.5 - P.y) < 1.8) chanNear = i; });
  if (chanNear >= 0) {
    if (P.chanIdx !== chanNear) { P.chanIdx = chanNear; P.chan = 0; }
    P.chan += dt / 1.6;
    if (Math.random() < 0.5) { const o = W_.obelisks[chanNear]; parts.push({ x: scrX(o.x + 0.5, o.y + 0.5) + (Math.random() - 0.5) * 20, y: scrY(o.x + 0.5, o.y + 0.5, hAt(o.x, o.y)) - Math.random() * 30, vx: 0, vy: -20, life: 0.6, max: 0.6, col: [130, 250, 255], g: 0, size: 1, glow: true }); }
    if (P.chan >= 1) {
      const o = W_.obelisks[chanNear]; o.on = true; P.chan = 0; P.chanIdx = -1;
      const n = W_.obelisks.filter(q => q.on).length;
      notify('OBELISCO DESPERTADO (' + n + '/3)', '#8ffcff', 4); sfx('obel'); shake = 5;
      burst(o.x + 0.5, o.y + 0.5, hAt(o.x, o.y), [140, 250, 255], 40, 80, 1.2, -10);
      gainXp(30 * P.lvl);
      for (let k = 0; k < 3; k++) { const a = Math.random() * TAU; const sx = o.x + 0.5 + Math.cos(a) * 4, sy = o.y + 0.5 + Math.sin(a) * 4; if (canStand({ x: sx, y: sy }, sx, sy)) { const opts = BIO_SPAWN[BI[idx(sx | 0, sy | 0)]]; const ch = opts[k % opts.length]; spawnEnemy(ch[0], ch[1], sx, sy, P.lvl).aggro = true; } }
      if (n === 3) setTimeout(() => summonBoss(false), 2500);
      save();
    }
  } else { P.chan = 0; P.chanIdx = -1; }
  W_.shrines.forEach((s, i) => {
    if (Math.hypot(s[0] + 0.5 - P.x, s[1] + 0.5 - P.y) < 1.7) {
      if (lastShrine !== i) {
        lastShrine = i; P.cp = [P.x, P.y]; P.hp = maxHp(); P.mp = maxMp();
        notify('SANTUARIO: SALUD RESTAURADA', '#9ee2ff', 2.5);
        burst(s[0] + 0.5, s[1] + 0.5, hAt(s[0], s[1]), [160, 230, 255], 24, 40, 1, -30); sfx('potion'); save();
      }
    }
  });
  // región
  const b = SANDT[idx(P.x | 0, P.y | 0)] ? BI[idx(P.x | 0, P.y | 0)] : BI[idx(P.x | 0, P.y | 0)];
  if (b !== region) { region = b; regionT = 3.2; }
}
function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dead) continue;
    const T = ET[e.type];
    e.anim += dt; e.flash -= dt; e.cd -= dt;
    if (Math.abs(e.kx) + Math.abs(e.ky) > 0.05) { tryMove(e, e.kx * dt, e.ky * dt); const f = Math.pow(0.002, dt); e.kx *= f; e.ky *= f; }
    e.z = lerp(e.z, hAt(e.x | 0, e.y | 0), Math.min(1, dt * 12));
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
    if (e.state === 'wind') {
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'idle'; e.cd = T.cd;
        if (T.aoe) {
          shake = Math.max(shake, e.type === 'boss' ? 7 : 3); sfx('boom');
          const px = scrX(e.x, e.y), py = scrY(e.x, e.y, e.z);
          for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; parts.push({ x: px, y: py, vx: Math.cos(a) * T.aoe * 45, vy: Math.sin(a) * T.aoe * 22, life: 0.4, max: 0.4, col: e.type === 'boss' ? [255, 90, 170] : [200, 190, 170], g: 0, size: 2, glow: e.type === 'boss' }); }
          if (d < T.aoe + 0.3) hurtPlayer(e.dmg);
        } else if (d < T.range + 0.5) hurtPlayer(e.dmg);
      }
      continue;
    }
    if (!P.dead && (d < T.aggro || (e.aggro && d < T.aggro * 2.2))) e.aggro = true; else if (d > T.aggro * 2.2 || P.dead) e.aggro = false;
    const sxd = dx - dy;
    if (e.aggro) {
      if (Math.abs(sxd) > 0.1) e.face = sxd > 0 ? 1 : -1;
      const step = (sgn) => { const l = d || 1; if (!tryMove(e, sgn * dx / l * T.spd * dt, sgn * dy / l * T.spd * dt)) tryMove(e, -dy / l * T.spd * dt, dx / l * T.spd * dt); };
      if (e.type === 'boss') {
        e.shardT -= dt; e.sumT -= dt;
        if (e.shardT <= 0) {
          e.shardT = e.hp < e.max * 0.5 ? 2.4 : 3.6;
          const n = e.hp < e.max * 0.5 ? 16 : 10, off = Math.random();
          for (let k = 0; k < n; k++) { const a = (k + off) / n * TAU; projs.push({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 2.2, from: 'e', dmg: e.dmg * 0.55, kind: 'shard', r: 0.35 }); }
          sfx('fire');
        }
        if (e.hp < e.max * 0.5 && e.sumT <= 0) {
          e.sumT = 12;
          for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, sx = e.x + Math.cos(a) * 2, sy = e.y + Math.sin(a) * 2; if (canStand(e, sx, sy)) spawnEnemy('slime', 'pink', sx, sy, e.lvl - 2).aggro = true; }
        }
      }
      if (T.ranged) {
        if (d > 5) step(1); else if (d < 3) step(-1);
        if (e.cd <= 0 && d < 8.5) {
          e.cd = T.cd; const l = d || 1;
          projs.push({ x: e.x, y: e.y, z: e.z, vx: dx / l * 6, vy: dy / l * 6, life: 1.8, from: 'e', dmg: e.dmg, kind: 'ice', r: 0.35, col: e.skin });
        }
      } else if (d > T.range) step(1);
      else if (e.cd <= 0) { e.state = 'wind'; e.t = T.wind; }
    } else {
      e.wt -= dt;
      if (e.wt <= 0) { e.wt = 1 + Math.random() * 2.5; if (Math.random() < 0.6) { const a = Math.random() * TAU; e.wx = Math.cos(a); e.wy = Math.sin(a); } else { e.wx = e.wy = 0; } }
      if (e.wx || e.wy) { tryMove(e, e.wx * T.spd * 0.4 * dt, e.wy * T.spd * 0.4 * dt); const s = e.wx - e.wy; if (Math.abs(s) > 0.1) e.face = s > 0 ? 1 : -1; }
    }
    // separación
    for (const o of enemies) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = e.r + o.r;
      if (od < min && od > 0.001) { const push = (min - od) * 0.5; tryMove(e, ox / od * push, oy / od * push); }
    }
  }
  enemies = enemies.filter(e => !e.dead && (e.type === 'boss' || Math.hypot(e.x - P.x, e.y - P.y) < 26));
  // aparición
  spawnT -= dt;
  const cap = 10 + Math.min(6, P.lvl);
  if (spawnT <= 0 && !P.dead && mode === 'play') {
    spawnT = 1.1;
    if (enemies.length < cap) {
      for (let t = 0; t < 10; t++) {
        const a = Math.random() * TAU, dd = 10 + Math.random() * 6;
        const x = P.x + Math.cos(a) * dd, y = P.y + Math.sin(a) * dd;
        const tx = x | 0, ty = y | 0;
        if (!inb(tx, ty) || !REACH[idx(tx, ty)] || BLOCK[OB[idx(tx, ty)]]) continue;
        if (Math.hypot(x - W_.spawn[0], y - W_.spawn[1]) < 6) continue;
        if (W_.shrines.some(s => Math.hypot(s[0] - x, s[1] - y) < 4)) continue;
        const b = BI[idx(tx, ty)], opts = BIO_SPAWN[b], r = Math.random();
        const ch = opts.find(o => r <= o[2]) || opts[0];
        const dist = Math.hypot(x - W_.spawn[0], y - W_.spawn[1]);
        const base = 1 + Math.floor(dist / 13) + (b === B_SNOW || b === B_RUINS ? 1 : 0);
        const lvl = Math.max(1, Math.round((base + P.lvl) / 2 + (Math.random() < 0.15 ? 1 : 0)));
        spawnEnemy(ch[0], ch[1], x, y, lvl);
        break;
      }
    }
  }
}
function updateProjs(dt) {
  for (const p of projs) {
    p.life -= dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, tx = nx | 0, ty = ny | 0;
    const th = hAt(tx, ty);
    if (!inb(tx, ty) || (th > Math.round(p.z) + 1) || BLOCK[OB[idx(tx, ty)]]) p.life = Math.min(p.life, 0);
    else { p.x = nx; p.y = ny; if (th >= 0) p.z = lerp(p.z, Math.max(th, p.z - 1), dt * 4); }
    const px = scrX(p.x, p.y), py = scrY(p.x, p.y, p.z) - 9;
    if (p.kind === 'fire') parts.push({ x: px + (Math.random() - 0.5) * 3, y: py + (Math.random() - 0.5) * 3, vx: 0, vy: -10, life: 0.3, max: 0.3, col: Math.random() < 0.5 ? [255, 200, 60] : [255, 90, 40], g: 0, size: 1, glow: true });
    if (p.from === 'p') {
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r) { p.life = 0; break; }
      }
      if (p.life <= 0 && !p.done) {
        p.done = true;
        for (const e of enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 1.3 + e.r) damageEnemy(e, p.dmg * (0.9 + Math.random() * 0.2), 4, p.x, p.y);
        burst(p.x, p.y, p.z, [255, 150, 50], 18, 60, 0.45, 20); sfx('boom');
      }
    } else if (!P.dead && Math.hypot(P.x - p.x, P.y - p.y) < p.r + 0.25) {
      p.life = 0; hurtPlayer(p.dmg);
    }
  }
  projs = projs.filter(p => p.life > 0);
}
function updateMisc(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  for (const f of floats) { f.life -= dt; f.y -= dt * 22; }
  floats = floats.filter(f => f.life > 0);
  for (const m of msgs) m.life -= dt;
  msgs = msgs.filter(m => m.life > 0);
  regionT -= dt; winT -= dt;
  for (const k of pickups) {
    k.t += dt;
    const dx = P.x - k.x, dy = P.y - k.y, d = Math.hypot(dx, dy);
    if (P.dead || k.t < 0.4) continue;
    if (d < 2.6) { const s = (2.8 - d) * 6 * dt; k.x += dx / (d || 1) * s; k.y += dy / (d || 1) * s; }
    if (d < 0.4) {
      k.got = true;
      if (k.kind === 'coin') { P.gold += k.val; sfx('pick'); }
      if (k.kind === 'potion') { P.pots++; floatText(P.x, P.y, P.z, '+POCIÓN', '#ff8a9a'); sfx('pick'); }
      if (k.kind === 'gem') { P.bonus += 2; floatText(P.x, P.y, P.z, '+2 PODER', '#e0a0ff'); sfx('chest'); }
    }
  }
  pickups = pickups.filter(k => !k.got);
  // partículas ambientales según bioma y hora
  const night = nightAmt();
  const rate = 10 * (1 / 60);
  if (Math.random() < rate * 6) {
    const wx = camX + Math.random() * W, wy = camY + Math.random() * H;
    let col = null, vy = 0, vx = 0, g = 0, glow = false, life = 4;
    if (night > 0.4 && Math.random() < 0.6) { col = [255, 240, 120]; glow = true; vx = (Math.random() - 0.5) * 8; vy = (Math.random() - 0.5) * 8; }
    else if (region === B_SNOW) { col = [255, 255, 255]; vy = 14; vx = -6; }
    else if (region === B_FOREST) { col = Math.random() < 0.5 ? [90, 160, 90] : [200, 170, 80]; vy = 10; vx = 8; }
    else if (region === B_PRISM) { col = [[255, 160, 210], [160, 230, 255], [255, 240, 150]][Math.random() * 3 | 0]; vy = -5; glow = true; }
    else if (region === B_RUINS) { col = [255, 180, 210]; vy = 9; vx = 12; }
    else { col = [255, 250, 220]; vy = -2; vx = 5; }
    parts.push({ x: wx, y: wy, vx, vy, life, max: life, col, g, size: 1, glow, amb: true });
  }
}
function nightAmt() {
  // 0 = día, 1 = noche cerrada
  const t = dayT;
  if (t < 0.2) return 1; if (t < 0.3) return 1 - (t - 0.2) / 0.1;
  if (t < 0.7) return 0; if (t < 0.8) return (t - 0.7) / 0.1; return 1;
}

let saveTimer = 0;
function update(dt) {
  gtime += dt;
  dayT = (dayT + dt / 480) % 1;
  shake = Math.max(0, shake - dt * 18);
  if (mode === 'title') {
    const a = gtime * 0.04, cx = W_.spawn[0] + Math.cos(a) * 14, cy = W_.spawn[1] + Math.sin(a) * 14;
    camX = scrX(cx, cy) - W / 2; camY = scrY(cx, cy, 3) - H / 2;
    updateMisc(dt);
    return;
  }
  updatePlayer(dt);
  updateEnemies(dt);
  updateProjs(dt);
  updateMisc(dt);
  for (const k in pressedEdge) pressedEdge[k] = false;
  const tx = scrX(P.x, P.y) - W / 2, ty = scrY(P.x, P.y, P.z) - H / 2 + 6;
  camX = lerp(camX, tx, Math.min(1, dt * 8)); camY = lerp(camY, ty, Math.min(1, dt * 8));
  saveTimer += dt; if (saveTimer > 12) { saveTimer = 0; save(); }
}

// ============================================================ render del mundo
const SKY_KEYS = [
  [0.0, '#0e1230', '#262c5a'], [0.2, '#141a40', '#3a3468'], [0.26, '#e07a8a', '#f6c8a8'], [0.33, '#f2a49c', '#f8dcc0'],
  [0.42, '#5d7cf0', '#a8c4f6'], [0.62, '#4f6ee8', '#9cbaf2'], [0.72, '#7a5aa8', '#f2a070'], [0.78, '#3a2e6a', '#a06a8a'], [0.85, '#121638', '#2a2c58'], [1.0, '#0e1230', '#262c5a'],
];
function skyCols() {
  let a = SKY_KEYS[0], b = SKY_KEYS[1];
  for (let k = 0; k < SKY_KEYS.length - 1; k++) if (dayT >= SKY_KEYS[k][0] && dayT <= SKY_KEYS[k + 1][0]) { a = SKY_KEYS[k]; b = SKY_KEYS[k + 1]; break; }
  const t = (dayT - a[0]) / (b[0] - a[0] || 1);
  return [mix(C(a[1]), C(b[1]), t), mix(C(a[2]), C(b[2]), t)];
}
function wrapDraw(img, offX, y, alpha = 1) {
  const w = img.width; let x = -(((offX % w) + w) % w);
  if (alpha < 1) ctx.globalAlpha = alpha;
  for (; x < W; x += w) ctx.drawImage(img, x | 0, y | 0);
  if (alpha < 1) ctx.globalAlpha = 1;
}
function drawSky() {
  const [top, bot] = skyCols();
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = css(mix(top, bot, i / (bands - 1)));
    ctx.fillRect(0, (i * H / bands) | 0, W, Math.ceil(H / bands) + 1);
  }
  const night = nightAmt();
  if (night > 0.05) wrapDraw(SKY.stars, camX * 0.02, 0, night);
  // sol / luna
  const sunA = (dayT - 0.25) / 0.5 * Math.PI;
  if (dayT > 0.22 && dayT < 0.78) { const sx = W * 0.15 + (dayT - 0.22) / 0.56 * W * 0.7, sy = H * 0.5 - Math.sin(sunA) * H * 0.38; ctx.drawImage(SPR.light.white, sx - 26, sy - 26); ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sx | 0, sy | 0, 6, 0, TAU); ctx.fill(); }
  else { const tt = dayT < 0.5 ? dayT + 1 : dayT; const mx = W * 0.15 + (tt - 0.78) / 0.44 * W * 0.7, my = H * 0.2; ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(mx | 0, my | 0, 5, 0, TAU); ctx.fill(); }
  const vy = -camY * 0.03;
  wrapDraw(SKY.mtn, camX * 0.04 + gtime * 0.5, H * 0.36 + vy);
  wrapDraw(SKY.islands, camX * 0.07 + gtime * 1.2, H * 0.14 + vy * 1.5, 0.85);
  wrapDraw(SKY.cloudsFar, camX * 0.1 + gtime * 3, H * 0.22 + vy * 2, 0.9);
  wrapDraw(SKY.hills, camX * 0.12, H * 0.62 + vy * 2);
  const cy0 = H * 0.66 + vy * 3;
  wrapDraw(SKY.cloudsNear, camX * 0.18 + gtime * 5, cy0);
  const below = mix(bot, [242, 230, 222], 0.55);
  ctx.fillStyle = css(below); ctx.fillRect(0, (cy0 + 96) | 0, W, H);
  wrapDraw(SKY.cloudsFar, camX * 0.24 + gtime * 7 + 300, cy0 + 70);
  wrapDraw(SKY.cloudsNear, camX * 0.3 + gtime * 9 + 200, cy0 + 110);
  wrapDraw(SKY.cloudsNear, camX * 0.4 + gtime * 12 + 450, cy0 + 170);
}

const lights = [];
function objSprite(o, i, b) {
  const v = TV[i];
  switch (o) {
    case O_TREE: { const arr = SPR.trees[b] || SPR.trees[0]; return arr[(hash2(i, 3, 1) * arr.length) | 0]; }
    case O_PINE: return SPR.pines[b === B_SNOW ? v % 2 : 2];
    case O_BUSH: return SPR.bushes[b][v % 2];
    case O_ROCK: return SPR.rocks[b][v % 2];
    case O_FLOW: return (SPR.flowers[b] || SPR.flowers[0])[v % 2];
    case O_TUFT: return SPR.tufts[SANDT[i] || b === B_RUINS ? 0 : b][v % 2];
    case O_PILLAR: return SPR.pillars[v];
    case O_CRYST: return SPR.crystals[v % 2];
    case O_CHEST: return SPR.chest[0];
    case O_CHESTO: return SPR.chest[1];
    case O_SHRINE: return SPR.shrine;
    default: return null;
  }
}
function drawEntity(e, sx, sy) {
  const T = ET[e.type];
  ctx.drawImage(SPR.shadow[T.sh], sx - (SPR.shadow[T.sh].width >> 1), sy - (SPR.shadow[T.sh].height >> 1));
  if (e.type === 'wisp') {
    const bob = Math.sin(e.anim * 4) * 2, col = C(WISP_COL[e.skin] || '#9ee2ff');
    const cy = sy - 14 + bob;
    lights.push([e.skin === 'pink' ? 'pink' : 'cyan', sx, cy]);
    ctx.fillStyle = e.flash > 0 ? '#fff' : css(dark(col, 0.6)); ctx.fillRect(sx - 4, cy - 3, 8, 7); ctx.fillRect(sx - 3, cy - 4, 6, 9);
    ctx.fillStyle = e.flash > 0 ? '#fff' : css(col); ctx.fillRect(sx - 3, cy - 3, 6, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2, cy - 2, 2, 2);
    ctx.fillStyle = '#141220'; ctx.fillRect(sx - 2 + (e.face > 0 ? 2 : 0), cy, 1, 1); ctx.fillRect(sx + (e.face > 0 ? 2 : 0), cy, 1, 1);
    if (Math.random() < 0.3) parts.push({ x: sx + camX + (Math.random() - 0.5) * 4, y: cy + camY + 4, vx: 0, vy: 12, life: 0.4, max: 0.4, col, g: 0, size: 1, glow: true });
  } else {
    const set = e.type === 'boss' ? SPR.boss : SPR[e.type][e.skin];
    const img = e.flash > 0 ? (e.face > 0 ? set.w : set.wl) : (e.face > 0 ? set.r : set.l);
    let bob = 0, sqx = 1, sqy = 1;
    if (e.type === 'slime') { const s = Math.sin(e.anim * 6); sqx = 1 + s * 0.08; sqy = 1 - s * 0.1; }
    else bob = Math.abs(Math.sin(e.anim * (e.type === 'wolf' ? 10 : 5))) * (e.aggro ? 1.5 : 0.5);
    if (e.state === 'wind') { sqx = 1.12; sqy = 0.9; if ((gtime * 20 | 0) % 2) bob += 1; }
    const w = Math.round(img.width * sqx), h = Math.round(img.height * sqy);
    ctx.drawImage(img, sx - (w >> 1), sy - h + 2 - Math.round(bob), w, h);
    if (e.type === 'golem' || e.type === 'boss') lights.push([e.type === 'boss' ? 'pink' : 'cyan', sx, sy - h * 0.6]);
    if (e.state === 'wind' && T.aoe) { ctx.strokeStyle = 'rgba(255,90,90,0.5)'; ctx.beginPath(); ctx.ellipse(sx, sy, T.aoe * 16 * (1 - e.t / T.wind), T.aoe * 8 * (1 - e.t / T.wind), 0, 0, TAU); ctx.stroke(); }
  }
  if (e.hp < e.max && e.type !== 'boss') {
    const bw = 14, by = sy - (e.type === 'golem' ? 30 : e.type === 'wolf' ? 18 : 20);
    ctx.fillStyle = '#1a1424'; ctx.fillRect(sx - bw / 2 - 1, by - 1, bw + 2, 4);
    ctx.fillStyle = '#5a1020'; ctx.fillRect(sx - bw / 2, by, bw, 2);
    ctx.fillStyle = '#e04050'; ctx.fillRect(sx - bw / 2, by, Math.max(0, Math.round(bw * e.hp / e.max)), 2);
  }
}
function drawPlayer(sx, sy, ghost) {
  if (P.dead) return;
  if (!ghost) ctx.drawImage(SPR.shadow[0], sx - 6, sy - 2);
  if (P.inv > 0 && P.dash <= 0 && !ghost && (gtime * 20 | 0) % 2) return;
  const f = P.face, w = P.walk;
  const bob = P.moving ? Math.round(Math.abs(Math.sin(w)) * 1) : Math.round(Math.sin(gtime * 2.5) * 0.5);
  const top = sy - 21 - bob;
  // bufanda / capa
  const L = P.moving ? 13 : 8;
  for (let k = 0; k < L; k++) {
    const x = sx - f * (k + 1) - (f > 0 ? 1 : -1) * 0;
    const y = top + 9 + k * (P.moving ? 0.25 : 0.6) + Math.sin(gtime * 10 - k * 0.7) * (0.3 + k * 0.12) * (P.moving ? 1.4 : 0.6);
    const th = k > L - 3 ? 2 : 3;
    ctx.fillStyle = '#1a1424'; ctx.fillRect(x | 0, (y | 0) - 1, 1, th + 2);
  }
  for (let k = 0; k < L; k++) {
    const x = sx - f * (k + 1);
    const y = top + 9 + k * (P.moving ? 0.25 : 0.6) + Math.sin(gtime * 10 - k * 0.7) * (0.3 + k * 0.12) * (P.moving ? 1.4 : 0.6);
    const th = k > L - 3 ? 2 : 3;
    ctx.fillStyle = '#f6cd6a'; ctx.fillRect(x | 0, y | 0, 1, 1);
    ctx.fillStyle = '#e8a33a'; ctx.fillRect(x | 0, (y | 0) + 1, 1, th - 1);
    if (th > 2) { ctx.fillStyle = '#b56f2a'; ctx.fillRect(x | 0, (y | 0) + 2, 1, 1); }
  }
  // piernas
  const s1 = P.moving ? Math.round(Math.sin(w) * 2) : 0;
  for (const [lx, o] of [[-3, s1], [1, -s1]]) {
    ctx.fillStyle = '#1a1424'; ctx.fillRect(sx + lx + o - 1, sy - 7, 4, 7);
    ctx.fillStyle = '#3a2f45'; ctx.fillRect(sx + lx + o, sy - 7, 2, 4);
    ctx.fillStyle = '#241c2c'; ctx.fillRect(sx + lx + o, sy - 3, 2, 2);
  }
  const spr = f > 0 ? SPR.player.r : SPR.player.l;
  ctx.drawImage(P.hurtFx > 0.15 ? (f > 0 ? SPR.player.w : SPR.player.wl) : spr, sx - 6, top);
  // espada
  const hx = sx + f * 4, hy = top + 12;
  let ang;
  if (P.swing > 0) { const t = 1 - P.swing / 0.2; ang = P.swingAng - 1.3 + t * 2.6; }
  else ang = f > 0 ? 1.9 : Math.PI - 1.9;
  for (let k = 0; k < 10; k++) {
    const x = hx + Math.cos(ang) * k, y = hy + Math.sin(ang) * k * (P.swing > 0 ? 0.7 : 1);
    ctx.fillStyle = k < 2 ? '#e8a33a' : k === 2 ? '#6b4a3a' : (k % 3 === 0 ? '#9fb4c8' : '#eef6ff');
    ctx.fillRect(x | 0, y | 0, 1, 1);
  }
  if (P.swing > 0) {
    const t = 1 - P.swing / 0.2;
    for (let a = -1.2; a <= 1.2; a += 0.07) {
      if (a > -1.2 + t * 2.6) continue;
      for (let rr = 13; rr <= 17; rr++) {
        const x = sx + Math.cos(P.swingAng + a) * rr, y = sy - 9 + Math.sin(P.swingAng + a) * rr * 0.6;
        ctx.fillStyle = rr === 17 ? 'rgba(160,240,255,0.5)' : 'rgba(255,255,255,0.85)';
        ctx.fillRect(x | 0, y | 0, 1, 1);
      }
    }
  }
  if (P.whirl > 0) {
    const r = (1 - P.whirl / 0.45) * 40;
    ctx.strokeStyle = `rgba(200,255,240,${P.whirl * 2})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy - 4, r, r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
}
function drawWorld() {
  lights.length = 0;
  const cx = Math.round(camX + (shake ? (Math.random() - 0.5) * shake : 0));
  const cy = Math.round(camY + (shake ? (Math.random() - 0.5) * shake : 0));
  const wf = (gtime * 3 | 0) % 4, ff = (gtime * 12 | 0) % 3;
  // agrupar entidades por casilla
  const bucket = new Map();
  const add = (x, y, item) => { const k = idx(clamp(x | 0, 0, N - 1), clamp(y | 0, 0, N - 1)); let a = bucket.get(k); if (!a) bucket.set(k, a = []); a.push(item); };
  if (mode !== 'title' && !P.dead) add(P.x, P.y, P);
  for (const e of enemies) add(e.x, e.y, e);
  for (const k of pickups) add(k.x, k.y, k);
  for (const p of projs) add(p.x, p.y, p);
  const sMin = Math.floor((cy - 60) / 8), sMax = Math.ceil((cy + H + 120) / 8);
  const dMin = Math.floor((cx - 40) / 16), dMax = Math.ceil((cx + W + 40) / 16);
  for (let s = sMin; s <= sMax; s++) {
    for (let d = dMin; d <= dMax; d++) {
      if (((s + d) & 1) !== 0) continue;
      const x = (s + d) >> 1, y = (s - d) >> 1;
      if (!inb(x, y)) continue;
      const i = idx(x, y), h = HT[i];
      if (h < 0) continue;
      const bx = (x - y) * 16 - cx, by = (x + y) * 8 - h * 8 - cy;
      if (by > H + 10 || by < -60) { if (by > H + 10) continue; }
      const b = BI[i];
      if (h === 0) {
        if (hAt(x, y + 1) < 0) ctx.drawImage(getFall('L', ff), bx - 16, by + 8);
        if (hAt(x + 1, y) < 0) ctx.drawImage(getFall('R', ff), bx, by + 8);
        let sh = 0; for (const [ddx, ddy] of D4) if (hAt(x + ddx, y + ddy) > 0) sh = 1;
        ctx.drawImage(SPR.water[sh][(wf + (x + y) % 4) % 4], bx - 16, by);
      } else {
        const mat = SANDT[i] ? 'sand' : b, v = TV[i];
        const nl = hAt(x, y + 1), nr = hAt(x + 1, y);
        if (nl < h) ctx.drawImage(getFace(mat, 'L', nl < 0 ? h * 8 + 8 : (h - nl) * 8, nl < 0, v), bx - 16, by + 8);
        if (nr < h) ctx.drawImage(getFace(mat, 'R', nr < 0 ? h * 8 + 8 : (h - nr) * 8, nr < 0, v), bx, by + 8);
        ctx.drawImage(SANDT[i] ? SPR.tops.sand[v] : SPR.tops[b][v], bx - 16, by);
      }
      const o = OB[i];
      const tcx = bx, tcy = by + 8;
      if (o === O_ALTAR) {
        ctx.drawImage(SPR.altar, bx - 16, by);
        if (bossOn) lights.push(['pink', tcx, tcy]);
      } else if (o === O_OBEL) {
        const ob = W_.obelisks.find(q => q.x === x && q.y === y), on = ob && ob.on;
        const img = SPR.obelisk[on ? 1 : 0];
        ctx.drawImage(img, tcx - (img.width >> 1), tcy - img.height + 3);
        if (on) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(120,240,255,0.18)'; ctx.fillRect(tcx - 2, 0, 5, tcy - img.height + 3);
          ctx.fillStyle = 'rgba(200,255,255,0.3)'; ctx.fillRect(tcx, 0, 1, tcy - img.height + 3);
          ctx.globalCompositeOperation = 'source-over';
          lights.push(['cyan', tcx, tcy - 20]);
        } else if ((gtime * 2 | 0) % 2 === 0) lights.push(['small', tcx, tcy - 20]);
      } else if (o) {
        const img = objSprite(o, i, b);
        if (img) {
          const sway = (o === O_TREE || o === O_PINE) ? 0 : 0;
          ctx.drawImage(img, tcx - (img.width >> 1) + sway, tcy - img.height + (o === O_TUFT || o === O_FLOW ? 4 : 3));
          if (o === O_SHRINE) {
            const oy = tcy - 22 + Math.sin(gtime * 2) * 2;
            ctx.fillStyle = '#1a1424'; ctx.fillRect(tcx - 3, oy - 3, 7, 7);
            ctx.fillStyle = '#9ee2ff'; ctx.fillRect(tcx - 2, oy - 2, 5, 5);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(tcx - 1, oy - 1, 2, 2);
            lights.push(['cyan', tcx, oy]);
          }
          if (o === O_CRYST) lights.push([TV[i] % 2 ? 'pink' : 'cyan', tcx, tcy - 10]);
        }
      }
      const items = bucket.get(i);
      if (items) {
        items.sort((a, c) => (a.x + a.y) - (c.x + c.y));
        for (const it of items) {
          const ez = it === P ? P.z : (it.z !== undefined ? it.z : hAt(it.x | 0, it.y | 0));
          const ex = Math.round(scrX(it.x, it.y) - cx), ey = Math.round(scrY(it.x, it.y, ez) - cy);
          if (it === P) { drawPlayer(ex, ey, false); lights.push(['warm', ex, ey - 10]); }
          else if (it.type) drawEntity(it, ex, ey);
          else if (it.kind === 'coin' || it.kind === 'potion' || it.kind === 'gem') {
            const img = it.kind === 'coin' ? SPR.coin : it.kind === 'potion' ? SPR.potion : SPR.gem;
            const bb = Math.round(Math.abs(Math.sin(it.t * 4)) * 3);
            ctx.drawImage(SPR.shadow[0], ex - 6, ey - 2);
            ctx.drawImage(img, ex - (img.width >> 1), ey - img.height - bb);
            if (it.kind !== 'coin') lights.push(['small', ex, ey - 6]);
          } else if (it.kind) { // proyectil
            const py = ey - 9;
            if (it.kind === 'fire') { ctx.fillStyle = '#ff6a2a'; ctx.fillRect(ex - 3, py - 3, 6, 6); ctx.fillStyle = '#ffd060'; ctx.fillRect(ex - 2, py - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(ex - 1, py - 1, 2, 2); lights.push(['fire', ex, py]); }
            else if (it.kind === 'shard') { ctx.fillStyle = '#ff4a9a'; ctx.fillRect(ex - 2, py - 2, 4, 4); ctx.fillStyle = '#fff0f8'; ctx.fillRect(ex - 1, py - 1, 2, 2); lights.push(['pink', ex, py]); }
            else { const c = WISP_COL[it.col] || '#9ee2ff'; ctx.fillStyle = c; ctx.fillRect(ex - 2, py - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(ex - 1, py - 1, 2, 2); lights.push([it.col === 'pink' ? 'pink' : 'cyan', ex, py]); }
          }
        }
      }
    }
  }
  // partículas
  for (const p of parts) {
    const a = Math.min(1, p.life / p.max * 2);
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    if (p.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = css(p.col, a);
    const sz = p.size;
    if (p.amb && p.glow) { const tw = Math.sin(gtime * 6 + p.x) > 0 ? 1 : 0.4; ctx.fillStyle = css(p.col, a * tw); }
    ctx.fillRect(x, y, sz, sz);
    if (p.glow) ctx.globalCompositeOperation = 'source-over';
  }
  return [cx, cy];
}
function drawLighting(cx, cy) {
  const night = nightAmt();
  const dusk = dayT > 0.22 && dayT < 0.36 ? 1 - Math.abs(dayT - 0.29) / 0.07 : dayT > 0.66 && dayT < 0.8 ? 1 - Math.abs(dayT - 0.73) / 0.07 : 0;
  if (night > 0.01 || dusk > 0.01) {
    ctx.globalCompositeOperation = 'multiply';
    const nc = mix([255, 255, 255], [70, 82, 150], night * 0.85);
    const dc = mix(nc, [255, 200, 190], Math.max(0, dusk) * 0.35);
    ctx.fillStyle = css(dc); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (night > 0.1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, night) * 0.75;
    for (const [k, x, y] of lights) { const L = SPR.light[k]; ctx.drawImage(L, x - (L.width >> 1), y - (L.height >> 1)); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ============================================================ HUD
const orbC = canvas(48, 48), orbG = orbC.getContext('2d');
function drawOrb(o, frac, cols, label) {
  const r = o.r, size = r * 2 + 8, c0 = r + 4;
  const id = orbG.createImageData(size, size), d = id.data;
  const L = cols.map(C);
  const surf = -r + (1 - frac) * 2 * r;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - c0, dy = y + 0.5 - c0, dd = Math.hypot(dx, dy);
    let col = null, a = 255;
    if (dd <= r) {
      const sv = surf + Math.sin(dx * 0.35 + gtime * 3) * (frac > 0.02 && frac < 0.98 ? 1.2 : 0);
      if (dy > sv) {
        const l = (-dx * 0.6 - dy * 0.3) / r;
        col = l > 0.3 ? L[2] : l < -0.35 ? L[0] : L[1];
        if (dd > r - 2) col = L[0];
        if (dy < sv + 1.2 && frac < 0.98) col = mix(L[2], [255, 255, 255], 0.3);
        if (hash2(x, (y + gtime * 14) | 0, 3) < 0.02) col = L[2];
      } else col = mix([22, 12, 20], L[0], 0.25 - dd / r * 0.2);
      if (dd > r - 5 && dd < r - 3 && dx < -r * 0.15 && dy < -r * 0.25) col = mix(col, [255, 255, 255], 0.45);
    } else if (dd <= r + 2) {
      const l = (-dx - dy) / dd;
      col = l > 0.3 ? [240, 200, 110] : l < -0.3 ? [120, 80, 34] : [200, 150, 60];
      if (hash2(Math.round(Math.atan2(dy, dx) * 4), 1, 2) < 0.2 && dd > r + 1) col = [255, 230, 160];
    } else if (dd <= r + 3.2) col = [20, 14, 28];
    if (col) { const i = (y * size + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a; }
  }
  orbG.clearRect(0, 0, 48, 48);
  orbG.putImageData(id, 0, 0);
  ctx.drawImage(orbC, 0, 0, size, size, o.x - c0, o.y - c0, size, size);
  drawText(label, o.x, o.y - 3, '#ffffff', 'center');
}
function drawButton(id, b, icon, cd, cdMax, cost, keyLbl) {
  const r = b.r;
  const pressed = isHeld(id);
  ctx.fillStyle = 'rgba(20,14,28,0.75)'; ctx.beginPath(); ctx.arc(b.x, b.y, r + 2, 0, TAU); ctx.fill();
  ctx.fillStyle = pressed ? '#4a3a58' : '#2e2438'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c8963c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, r - 0.5, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#6b4a22'; ctx.beginPath(); ctx.arc(b.x, b.y, r - 1.5, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  const k = id === 'atk' ? 1.4 : 1;
  const iw = icon.width * k, ih = icon.height * k;
  ctx.drawImage(icon, (b.x - iw / 2) | 0, (b.y - ih / 2) | 0, iw, ih);
  if (cost && P.mp < cost) { ctx.fillStyle = 'rgba(30,50,160,0.55)'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill(); }
  if (cd > 0) {
    ctx.fillStyle = 'rgba(10,6,14,0.65)'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / cdMax)); ctx.closePath(); ctx.fill();
    if (cdMax > 1) drawText(cd.toFixed(cd < 1 ? 1 : 0), b.x, b.y - 3, '#ffffff', 'center');
  }
  if (keyLbl && !IS_TOUCH) drawText(keyLbl, b.x + r - 3, b.y + r - 6, '#f6e27a', 'center');
}
function drawHUD() {
  // panel central
  const pw = UI.mp.x - UI.hp.x, px0 = UI.hp.x, py0 = H - 20;
  ctx.fillStyle = '#1a1424'; ctx.fillRect(px0, py0 - 1, pw, 21);
  ctx.fillStyle = '#2e2438'; ctx.fillRect(px0, py0, pw, 20);
  ctx.fillStyle = '#3e3248'; ctx.fillRect(px0, py0, pw, 1);
  ctx.fillStyle = '#c8963c'; ctx.fillRect(px0, py0 - 2, pw, 1);
  for (let x = px0 + 4; x < px0 + pw; x += 9) { ctx.fillStyle = '#251d2e'; ctx.fillRect(x, py0 + 3, 1, 16); }
  // barra de experiencia
  const xw = pw - 44, xx = px0 + 22, xy = py0 + 2;
  ctx.fillStyle = '#140e1c'; ctx.fillRect(xx - 1, xy - 1, xw + 2, 5);
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(xx, xy, xw, 3);
  ctx.fillStyle = '#e8b040'; ctx.fillRect(xx, xy, Math.round(xw * P.xp / needXp(P.lvl)), 3);
  ctx.fillStyle = '#fff0a0'; ctx.fillRect(xx, xy, Math.round(xw * P.xp / needXp(P.lvl)), 1);
  // pociones
  const pb = UI.pot;
  ctx.fillStyle = '#140e1c'; ctx.fillRect(pb.x - 8, pb.y - 6, 17, 15);
  ctx.fillStyle = isHeld('pot') ? '#4a3a58' : '#3a2e46'; ctx.fillRect(pb.x - 7, pb.y - 5, 15, 13);
  ctx.drawImage(SPR.potion, pb.x - 3, pb.y - 4);
  drawText(P.pots, pb.x + 7, pb.y + 3, '#ffffff', 'right');
  if (!IS_TOUCH) drawText('Q', pb.x - 6, pb.y - 4, '#f6e27a');
  // nivel y oro
  drawText('NV ' + P.lvl, (UI.hp.x + UI.mp.x) / 2 + 2, py0 + 8, '#f6e27a', 'center');
  ctx.drawImage(SPR.coin, UI.mp.x - 33, py0 + 9);
  drawText(P.gold, UI.mp.x - 27, py0 + 9, '#f6e27a', 'left');
  // orbes
  drawOrb(UI.hp, P.hp / maxHp(), ['#5a0c18', '#b01a30', '#ec5060'], Math.ceil(P.hp) + '');
  drawOrb(UI.mp, P.mp / maxMp(), ['#0c1a5a', '#2040b8', '#5a88f4'], Math.floor(P.mp) + '');
  // botones
  drawButton('atk', UI.atk, ICON.atk, P.acd, 0.36, 0, 'J');
  drawButton('q', UI.q, ICON.q, P.cdQ, CD.q, COST.q, '1');
  drawButton('w', UI.w, ICON.w, P.cdW, CD.w, COST.w, '2');
  drawButton('e', UI.e, ICON.e, P.cdE, CD.e, COST.e, '3');
  // retrato
  ctx.fillStyle = '#1a1424'; ctx.fillRect(4, 4, 22, 22);
  ctx.fillStyle = '#c8963c'; ctx.fillRect(5, 5, 20, 20);
  ctx.fillStyle = '#2e2438'; ctx.fillRect(6, 6, 18, 18);
  ctx.drawImage(SPR.player.r, 0, 0, 12, 10, 9, 9, 12, 10);
  ctx.fillStyle = '#1a1424'; ctx.fillRect(18, 18, 11, 9);
  ctx.fillStyle = '#7a1020'; ctx.fillRect(19, 19, 9, 7);
  drawText(P.lvl, 24, 20, '#ffffff', 'center', 1, null);
  drawText('ERRANTE', 31, 6, '#f4ecd8');
  const quest = bossDone ? 'EXPLORA AETHEL LIBREMENTE' : bossOn ? 'DERROTA AL GUARDIÁN EN LAS RUINAS' : 'DESPIERTA LOS OBELISCOS ' + W_.obelisks.filter(o => o.on).length + '/3';
  drawText('> ' + quest, 31, 14, '#c6d4ee');
  // minimapa
  drawMinimap();
  // canalización
  if (P.chan > 0) {
    const bw = 40, bx = (W / 2 | 0) - bw / 2, by = (H / 2 | 0) - 40;
    ctx.fillStyle = '#140e1c'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = '#8ffcff'; ctx.fillRect(bx, by, Math.round(bw * P.chan), 3);
    drawText('DESPERTANDO...', W / 2, by - 8, '#8ffcff', 'center');
  }
  // jefe
  const boss = enemies.find(e => e.type === 'boss');
  if (boss && boss.aggro) {
    const bw = Math.min(200, W - 140), bx = (W / 2 | 0) - bw / 2, by = 28;
    drawText('GUARDIÁN DEL VELO', W / 2, by - 8, '#ff80c0', 'center');
    ctx.fillStyle = '#140e1c'; ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
    ctx.fillStyle = '#c8963c'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = '#3a0a1a'; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = '#e0306a'; ctx.fillRect(bx, by, Math.round(bw * boss.hp / boss.max), 4);
    ctx.fillStyle = '#ff90b8'; ctx.fillRect(bx, by, Math.round(bw * boss.hp / boss.max), 1);
  }
  // región
  if (regionT > 0 && region >= 0) {
    const a = Math.min(1, regionT, (3.2 - regionT) * 3);
    drawText(BIO[region].name, W / 2, 46, '#f4ecd8', 'center', 2, '#140e1c', a);
  }
  msgs.forEach((m, k) => drawText(m.text, W / 2, 64 + k * 9, m.col, 'center', 1, '#140e1c', Math.min(1, m.life)));
  // números flotantes
  for (const f of floats) drawText(f.text, Math.round(f.x - camX), Math.round(f.y - camY), f.col, 'center', 1, '#140e1c', Math.min(1, f.life * 2));
  // joystick
  if (joy.id !== null) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 22, 0, TAU); ctx.stroke();
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy), m = Math.min(l, 22);
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(joy.ox + (l ? dx / l * m : 0), joy.oy + (l ? dy / l * m : 0), 8, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (IS_TOUCH && gtime < 40) {
    drawText('DESLIZA AQUÍ PARA MOVERTE', 60, H - 60, '#f4ecd8', 'center', 1, '#140e1c', 0.6);
  }
  // daño recibido
  if (P.hurtFx > 0 || P.hp < maxHp() * 0.25) {
    const a = P.hurtFx > 0 ? P.hurtFx : 0.15 + Math.sin(gtime * 5) * 0.08;
    ctx.fillStyle = `rgba(200,20,40,${a})`;
    ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
  }
}
function drawMinimap() {
  const m = UI.mini, k = 1.3;
  ctx.save();
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#1c2440'; ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
  ctx.translate(m.x, m.y);
  ctx.transform(k, k * 0.5, -k, k * 0.5, 0, 0);
  ctx.drawImage(miniC, -P.x, -P.y);
  ctx.restore();
  const toM = (x, y) => [m.x + ((x - P.x) - (y - P.y)) * k, m.y + ((x - P.x) + (y - P.y)) * k * 0.5];
  const dot = (x, y, col, s = 2, clampEdge = false) => {
    let [mx, my] = toM(x, y);
    const dx = mx - m.x, dy = my - m.y, d = Math.hypot(dx, dy);
    if (d > m.r - 3) { if (!clampEdge) return; mx = m.x + dx / d * (m.r - 3); my = m.y + dy / d * (m.r - 3); if ((gtime * 3 | 0) % 2) return; }
    ctx.fillStyle = '#140e1c'; ctx.fillRect((mx | 0) - 1, (my | 0) - 1, s + 2, s + 2);
    ctx.fillStyle = col; ctx.fillRect(mx | 0, my | 0, s, s);
  };
  for (const s of W_.shrines) dot(s[0] + 0.5, s[1] + 0.5, '#9ee2ff', 2);
  for (const e of enemies) if (e.type !== 'boss') dot(e.x, e.y, '#ff4a4a', 1);
  const nextOb = W_.obelisks.filter(o => !o.on).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
  for (const o of W_.obelisks) dot(o.x + 0.5, o.y + 0.5, o.on ? '#8ffcff' : '#ffd040', 3, o === nextOb);
  if (bossOn) dot(W_.altar[0] + 0.5, W_.altar[1] + 0.5, '#ff4a9a', 3, true);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(m.x - 1, m.y - 1, 3, 3);
  ctx.strokeStyle = '#140e1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 1.5, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#c8963c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 0.5, 0, TAU); ctx.stroke();
  const tod = dayT < 0.25 || dayT > 0.78 ? 'NOCHE' : dayT < 0.36 ? 'ALBA' : dayT > 0.68 ? 'OCASO' : 'DÍA';
  drawText(tod, m.x, m.y + m.r + 4, '#c6d4ee', 'center');
}

// ============================================================ título
function titleButtons() {
  const bw = 96, bx = (W / 2 | 0) - bw / 2;
  const list = [];
  const y0 = (H * 0.6) | 0;
  if (hasSave) { list.push({ id: 'cont', label: 'CONTINUAR', x: bx, y: y0, w: bw, h: 15 }); list.push({ id: 'new', label: 'NUEVA PARTIDA', x: bx, y: y0 + 20, w: bw, h: 15 }); }
  else list.push({ id: 'new', label: 'COMENZAR', x: bx, y: y0, w: bw, h: 15 });
  return list;
}
let confirmNew = 0;
function titleClick(p) {
  for (const b of titleButtons()) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      if (b.id === 'new' && hasSave && confirmNew <= 0) { confirmNew = 3; return; }
      startGame(b.id === 'new');
      return;
    }
  }
}
function startGame(fresh) {
  tryFullscreen();
  resetGame(fresh);
  if (fresh) dayT = 0.3;
  camX = scrX(P.x, P.y) - W / 2; camY = scrY(P.x, P.y, P.z) - H / 2;
  mode = 'play';
  notify('DESPIERTA LOS TRES OBELISCOS DE AETHEL', '#f6e27a', 5);
  save();
}
function drawTitle() {
  ctx.fillStyle = 'rgba(20,14,30,0.35)'; ctx.fillRect(0, 0, W, H);
  const t = gtime;
  drawText('ECOS DE AETHEL', W / 2, (H * 0.2) | 0, '#ffd27a', 'center', 4, '#3a1a2a');
  drawText('UN RPG DE MUNDO ABIERTO', W / 2, (H * 0.2 + 30) | 0, '#f4ecd8', 'center', 1);
  confirmNew -= 1 / 60;
  for (const b of titleButtons()) {
    ctx.fillStyle = '#140e1c'; ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
    ctx.fillStyle = '#c8963c'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#2e2438'; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    const lbl = b.id === 'new' && confirmNew > 0 ? '¿BORRAR PROGRESO?' : b.label;
    drawText(lbl, b.x + b.w / 2, b.y + 4, b.id === 'new' && confirmNew > 0 ? '#ff8a8a' : '#f4ecd8', 'center');
  }
  if ((t * 1.5 | 0) % 2 === 0) drawText(IS_TOUCH ? 'TOCA UN BOTÓN' : 'PULSA ENTER', W / 2, H - 22, '#c6d4ee', 'center');
  if (!IS_TOUCH) drawText('WASD MOVER  J ATACAR  1 2 3 HABILIDADES  Q POCIÓN', W / 2, H - 12, '#9e8aa2', 'center');
}

// ============================================================ bucle principal
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
function render() {
  drawSky();
  const [cx, cy] = drawWorld();
  drawLighting(cx, cy);
  if (mode === 'play') {
    // silueta del jugador cuando queda tapado
    if (!P.dead) { ctx.globalAlpha = 0.28; drawPlayer(Math.round(scrX(P.x, P.y) - cx), Math.round(scrY(P.x, P.y, P.z) - cy), true); ctx.globalAlpha = 1; }
    drawHUD();
    if (P.dead) {
      ctx.fillStyle = 'rgba(30,0,10,0.5)'; ctx.fillRect(0, 0, W, H);
      drawText('HAS CAÍDO', W / 2, H / 2 - 14, '#ff5a6a', 'center', 3, '#140e1c');
    }
    if (winT > 0) drawText('VICTORIA', W / 2, H / 2 - 50, '#ffd040', 'center', 3, '#3a1a2a', Math.min(1, winT));
  } else drawTitle();
  if (H > W * 1.05) {
    ctx.fillStyle = 'rgba(20,14,30,0.85)'; ctx.fillRect(0, 0, W, H);
    drawText('GIRA TU DISPOSITIVO', W / 2, H / 2 - 4, '#f4ecd8', 'center', 1);
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
function boot() {
  resize();
  window.addEventListener('resize', resize);
  buildSprites();
  genWorld();
  hasSave = !!loadSave();
  P.x = W_.spawn[0] + 0.5; P.y = W_.spawn[1] + 0.5; P.cp = [P.x, P.y];
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') save(); });
  requestAnimationFrame((t) => { last = t; frame(t); });
  window.__aethel = { P, W_, get enemies() { return enemies; }, get mode() { return mode; }, startGame, setDay: (v) => { dayT = v; }, HT, BI, N };
}
boot();
})();
