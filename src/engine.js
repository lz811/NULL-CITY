"use strict";
const PAL = {
  '.': null,          // transparent
  '0': '#080d18',     // void
  '1': '#101722',     // night base
  '2': '#172633',     // asphalt dark
  '3': '#1b3042',     // asphalt
  '4': '#294152',     // asphalt wet
  '5': '#315878',     // navy
  '6': '#54758a',     // navy light
  '7': '#202830',     // charcoal
  '8': '#36434b',     // charcoal light
  '9': '#4c575a',     // concrete dark
  'a': '#66716e',     // concrete
  'b': '#88918a',     // concrete light
  'c': '#a6aaa0',     // stone highlight
  'd': '#cacbbb',     // pale grey
  'e': '#e5e4d8',     // near white
  'f': '#2a1238',     // purple deep
  'g': '#4a1e62',     // purple
  'h': '#7a3aa0',     // purple light
  'i': '#0c5c58',     // teal deep
  'j': '#14c4a8',     // teal
  'k': '#44d6d4',     // cyan
  'l': '#b0d9cf',     // cyan bright
  'm': '#1a146e',     // blue deep
  'n': '#3c48f0',     // electric blue
  'o': '#7aa8ff',     // blue light
  'p': '#5d6990',     // violet
  'q': '#697c9a',     // violet light
  'r': '#b0166a',     // magenta deep
  's': '#f15c92',     // magenta
  't': '#de93a4',     // magenta light
  'u': '#4d8a1f',     // green deep
  'v': '#acb383',     // lime
  'w': '#9a4a12',     // amber deep
  'x': '#ff7a28',     // orange
  'y': '#e6a965',     // amber
  'z': '#ffe8b0',     // warm white
  '!': '#58ffb4',     // alien lamp glow
  '@': '#d6fff0',     // alien lamp core
  'A': '#6b4630', 'B': '#8c5a3a', 'C': '#b9805a', 'D': '#e0a97e', 'E': '#f0cfae',
  'F': '#1a1512', 'G': '#40281a', 'H': '#8a2b2b', 'I': '#d6334a',
  'J': '#0f1b16', 'K': '#1d4030', 'L': '#2e6b46', 'M': '#46a05e',
  'N': '#06212c', 'O': '#0b3a49', 'P': '#145a66',
  'Q': '#3a1f10', 'R': '#5c3a1c', 'S': '#7d5a2e',
};

const RGB = {};
for (const k in PAL) {
  if (!PAL[k]) { RGB[k] = null; continue; }
  const h = PAL[k];
  RGB[k] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/* --- deterministic noise so ground tiles are stable between sessions ------ */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- raw pixel buffer ---------------------------------------------------- */
class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, ch, alpha) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = RGB[ch];
    if (!c) return;
    const i = (y * this.w + x) * 4;
    const a = alpha === undefined ? 255 : (alpha * 255) | 0;
    if (a >= 255) {
      this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255;
    } else {
      const sa = a / 255, da = this.data[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      if (oa <= 0) return;
      this.data[i] = (c[0] * sa + this.data[i] * da * (1 - sa)) / oa;
      this.data[i + 1] = (c[1] * sa + this.data[i + 1] * da * (1 - sa)) / oa;
      this.data[i + 2] = (c[2] * sa + this.data[i + 2] * da * (1 - sa)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }
  rect(x, y, w, h, ch, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch, a); }
  frame(x, y, w, h, ch, a) {
    for (let i = 0; i < w; i++) { this.set(x + i, y, ch, a); this.set(x + i, y + h - 1, ch, a); }
    for (let j = 0; j < h; j++) { this.set(x, y + j, ch, a); this.set(x + w - 1, y + j, ch, a); }
  }
  hline(x, y, w, ch, a) { for (let i = 0; i < w; i++) this.set(x + i, y, ch, a); }
  vline(x, y, h, ch, a) { for (let j = 0; j < h; j++) this.set(x, y + j, ch, a); }
  /* dithered fill — a 50% checker between two ramp steps, the classic way to
     extend a limited palette without inventing new colours */
  dither(x, y, w, h, ch, phase) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (((x + i + y + j + (phase || 0)) & 1) === 0) this.set(x + i, y + j, ch);
    }
  }
  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return c;
  }
}

/* --- authored character art --> Pix --------------------------------------- */
function art(rows, remap) {
  const h = rows.length, w = rows[0].length;
  const p = new Pix(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      let ch = row[x];
      if (ch === '.' || ch === ' ' || ch === undefined) continue;
      if (remap && remap[ch]) ch = remap[ch];
      p.set(x, y, ch);
    }
  }
  return p;
}

/* --- the sprite bank ------------------------------------------------------ */
const BANK = Object.create(null);   // name -> {canvas,w,h,ox,oy,frames}

function bake(name, pix, opt) {
  opt = opt || {};
  const entry = {
    canvas: pix.toCanvas(), w: pix.w, h: pix.h,
    ox: opt.ox === undefined ? 0 : opt.ox,
    oy: opt.oy === undefined ? 0 : opt.oy,
    fw: opt.fw || pix.w, fh: opt.fh || pix.h,
    frames: opt.frames || 1,
    tag: opt.tag || 'misc',
  };
  BANK[name] = entry;
  return entry;
}

/* horizontal strip of frames baked from an array of Pix of equal size */
function bakeStrip(name, list, opt) {
  const fw = list[0].w, fh = list[0].h;
  const strip = new Pix(fw * list.length, fh);
  list.forEach((p, i) => {
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const si = (y * p.w + x) * 4;
      if (p.data[si + 3] === 0) continue;
      const di = (y * strip.w + (i * fw + x)) * 4;
      strip.data[di] = p.data[si]; strip.data[di + 1] = p.data[si + 1];
      strip.data[di + 2] = p.data[si + 2]; strip.data[di + 3] = p.data[si + 3];
    }
  });
  return bake(name, strip, Object.assign({}, opt, { fw, fh, frames: list.length }));
}

function S(name) { return BANK[name]; }

/* draw a sprite (optionally a frame of a strip) at integer coordinates */
function blit(ctx, name, x, y, frame, alpha) {
  const s = BANK[name];
  if (!s) return;
  const f = frame ? (frame % s.frames) : 0;
  if (alpha !== undefined && alpha !== 1) { ctx.globalAlpha = alpha; }
  ctx.drawImage(s.canvas, f * (s.sw || s.fw), 0, s.sw || s.fw, s.sh || s.fh, (x - s.ox) | 0, (y - s.oy) | 0, s.fw, s.fh);
  if (alpha !== undefined && alpha !== 1) { ctx.globalAlpha = 1; }
}

/* Mirrored draw. Flipping around the pivot column (not the sprite's edge) is
   what keeps a turning character from jumping one pixel sideways. */
function blitFlip(ctx, name, x, y, frame, alpha, vertical) {
  const s = BANK[name];
  if (!s) return;
  const f = frame ? (frame % s.frames) : 0;
  ctx.save();
  if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
  if (vertical) {
    ctx.translate(0, y | 0); ctx.scale(1, -1);
    ctx.drawImage(s.canvas, f * (s.sw || s.fw), 0, s.sw || s.fw, s.sh || s.fh, (x - s.ox) | 0, -(s.oy + 1), s.fw, s.fh);
  } else {
    ctx.translate(x | 0, 0); ctx.scale(-1, 1);
    ctx.drawImage(s.canvas, f * (s.sw || s.fw), 0, s.sw || s.fw, s.sh || s.fh, -(s.ox + 1), (y - s.oy) | 0, s.fw, s.fh);
  }
  ctx.restore();
}

const TILE = 16;

/* ===== 02_tiles.js ===== */
/* ==========================================================================
   GROUND / TILE SHEET  —  tile_*
   16x16 logical pixels. Everything the player walks on. The rule for this
   layer: dark, low contrast, and quiet. It must never compete with neon.
   ========================================================================== */

function buildTiles() {

  /* ---- asphalt ---------------------------------------------------------- */
  const asphalt = (seed, wet) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, wet ? '3' : '3');
    for (let i = 0; i < 54; i++) {
      const x = (r() * 16) | 0, y = (r() * 16) | 0, v = r();
      p.set(x, y, v < .4 ? '2' : (v < .74 ? '7' : (v < .93 ? '8' : '9')));
    }
    // a thin film of water lying on the camber, which is what stops night
    // asphalt from reading as a hole in the screen
    for (let i = 0; i < 5; i++) {
      const x = (r() * 15) | 0, y = (r() * 15) | 0;
      p.rect(x, y, 2 + ((r() * 4) | 0), 1, '5', .32);
    }
    if (wet) {
      // recently-rained sheen: flat cold patches, hard edged, no gradient
      for (let i = 0; i < 3; i++) {
        const x = (r() * 12) | 0, y = (r() * 12) | 0, w = 3 + ((r() * 5) | 0), h = 2 + ((r() * 3) | 0);
        p.rect(x, y, w, h, '4');
        p.hline(x, y, w, '5', .5);
      }
    }
    return p;
  };
  bake('tile_road_asphalt_a', asphalt(11, false), { tag: 'ground' });
  bake('tile_road_asphalt_b', asphalt(29, false), { tag: 'ground' });
  bake('tile_road_asphalt_c', asphalt(77, false), { tag: 'ground' });
  bake('tile_road_wet_a', asphalt(5, true), { tag: 'ground' });
  bake('tile_road_wet_b', asphalt(91, true), { tag: 'ground' });

  /* lane markings — worn, never pure white */
  const dashH = asphalt(13, false); dashH.rect(2, 7, 8, 2, 'a'); dashH.rect(2, 7, 8, 1, 'b', .5);
  bake('tile_road_dash_h', dashH, { tag: 'ground' });
  const dashV = asphalt(14, false); dashV.rect(7, 2, 2, 8, 'a'); dashV.vline(7, 2, 8, 'b', .5);
  bake('tile_road_dash_v', dashV, { tag: 'ground' });
  const edgeH = asphalt(15, false); edgeH.rect(0, 1, 16, 1, 'a', .75);
  bake('tile_road_edge_h', edgeH, { tag: 'ground' });

  /* crosswalk */
  const cw = (vert) => {
    const p = asphalt(21, true);
    for (let i = 1; i < 16; i += 5) {
      if (vert) { p.rect(i, 0, 3, 16, 'b', .82); p.rect(i, 0, 1, 16, 'c', .5); }
      else { p.rect(0, i, 16, 3, 'b', .82); p.rect(0, i, 16, 1, 'c', .5); }
    }
    return p;
  };
  bake('tile_crosswalk_h', cw(false), { tag: 'ground' });
  bake('tile_crosswalk_v', cw(true), { tag: 'ground' });

  /* ---- sidewalk --------------------------------------------------------- */
  const sidewalk = (seed) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, '9');
    for (let i = 0; i < 26; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < .6 ? '8' : 'a');
    // paving seams
    p.hline(0, 0, 16, '7', .8); p.vline(0, 0, 16, '7', .8);
    p.hline(0, 8, 16, '7', .55); p.vline(8, 0, 16, '7', .55);
    p.hline(0, 1, 16, 'a', .25); p.hline(0, 9, 16, 'a', .25);
    return p;
  };
  bake('tile_sidewalk', sidewalk(3), { tag: 'ground' });
  bake('tile_sidewalk_b', sidewalk(43), { tag: 'ground' });
  const swCrack = sidewalk(61);
  swCrack.set(4, 3, '7'); swCrack.set(5, 4, '7'); swCrack.set(5, 5, '7'); swCrack.set(6, 6, '7');
  swCrack.set(6, 7, '7'); swCrack.set(7, 8, '7'); swCrack.set(8, 9, '7');
  bake('tile_sidewalk_crack', swCrack, { tag: 'ground' });

  /* curbs — the visual promise that the pavement is a step above the road */
  /* A kerb is a raised lip on whichever sides meet the road. A pavement that
     turns a corner meets it on two, so those get their own tile: two straight
     kerbs butted together leave a notch that reads as a bitten-off corner. */
  const curb = (dirs) => {
    const p = sidewalk(7);
    if (dirs.includes('s')) { p.rect(0, 13, 16, 2, '7'); p.hline(0, 12, 16, 'b', .7); p.hline(0, 15, 16, '2'); }
    if (dirs.includes('n')) { p.rect(0, 1, 16, 2, '7'); p.hline(0, 3, 16, 'b', .7); p.hline(0, 0, 16, '2'); }
    if (dirs.includes('e')) { p.rect(13, 0, 2, 16, '7'); p.vline(12, 0, 16, 'b', .7); p.vline(15, 0, 16, '2'); }
    if (dirs.includes('w')) { p.rect(1, 0, 2, 16, '7'); p.vline(3, 0, 16, 'b', .7); p.vline(0, 0, 16, '2'); }
    return p;
  };
  ['n', 's', 'e', 'w', 'se', 'sw', 'ne', 'nw'].forEach(d => bake('tile_curb_' + d, curb(d), { tag: 'ground' }));

  /* ---- plaza ------------------------------------------------------------ */
  const plaza = (seed, inlay) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, '8');
    for (let i = 0; i < 20; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < .5 ? '7' : '9');
    // Only the slab joint repeats. An inner frame on every single tile turns a
    // civic square into graph paper, so the second detail is broken up instead.
    p.hline(0, 0, 16, '7', .55); p.vline(0, 0, 16, '7', .55);
    p.hline(0, 15, 16, 'a', .16); p.vline(15, 0, 16, 'a', .16);
    if (seed % 3 === 0) { p.hline(3, 12, 10, '7', .3); p.vline(12, 3, 10, '7', .3); }
    if (inlay) { p.frame(5, 5, 6, 6, 'i', .7); p.set(7, 7, 'j'); p.set(8, 8, 'j'); }
    return p;
  };
  bake('tile_plaza', plaza(9, false), { tag: 'ground' });
  bake('tile_plaza_b', plaza(33, false), { tag: 'ground' });
  bake('tile_plaza_inlay', plaza(9, true), { tag: 'ground' });

  /* ---- alley ------------------------------------------------------------ */
  const alley = (seed) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, '2');
    for (let i = 0; i < 40; i++) { const v = r(); p.set((r() * 16) | 0, (r() * 16) | 0, v < .5 ? '1' : (v < .85 ? '7' : '3')); }
    for (let i = 0; i < 2; i++) { const x = (r() * 12) | 0, y = (r() * 12) | 0; p.rect(x, y, 3 + ((r() * 3) | 0), 2, '1'); }
    return p;
  };
  bake('tile_alley', alley(17), { tag: 'ground' });
  bake('tile_alley_b', alley(53), { tag: 'ground' });
  const grime = alley(71);
  grime.rect(4, 6, 7, 4, 'f', .5); grime.rect(5, 7, 4, 2, 'g', .4);
  bake('tile_grime', grime, { tag: 'ground' });

  /* ---- water & drainage furniture --------------------------------------- */
  bake('tile_manhole', art([
    '3333333333333333',
    '3333777777773333',
    '3337988889997333',
    '3379888888899733',
    '3798887788889973',
    '3988877777888893',
    '3988777777788893',
    '3987777777778893',
    '3987777777778893',
    '3988777777788893',
    '3988877777888893',
    '3798887788889973',
    '3379888888899733',
    '3337988889997333',
    '3333777777773333',
    '3333333333333333']), { tag: 'ground' });

  bake('tile_drain', art([
    '9999999999999999',
    '9999999999999999',
    '9777777777777779',
    '9722222222222279',
    '9711111111111179',
    '9722222222222279',
    '9711111111111179',
    '9722222222222279',
    '9711111111111179',
    '9777777777777779',
    '9999999999999999',
    '99999a9999a99999',
    '9999999999999999',
    '9999999999999999',
    '9999999999999999',
    '9999999999999999']), { tag: 'ground' });

  /* puddles: pixel reflections, never smooth mirrors */
  const puddle = (seed, tint) => {
    const p = asphalt(seed, true), r = mulberry(seed + 5);
    const cx = 8, cy = 8;
    for (let y = 2; y < 14; y++) for (let x = 1; x < 15; x++) {
      const d = Math.abs(x - cx) * .8 + Math.abs(y - cy) * 1.15 + r() * 1.4;
      if (d < 6.2) p.set(x, y, '4');
      if (d < 4.4) p.set(x, y, '5');
    }
    // banded reflection of whatever neon is overhead
    p.rect(5, 6, 5, 1, tint, .55);
    p.rect(6, 8, 3, 1, tint, .35);
    p.rect(5, 10, 4, 1, tint, .22);
    p.hline(3, 4, 9, '6', .4);
    return p;
  };
  bake('tile_puddle_cyan', puddle(23, 'k'), { tag: 'ground' });
  bake('tile_puddle_magenta', puddle(41, 's'), { tag: 'ground' });
  bake('tile_puddle_amber', puddle(59, 'y'), { tag: 'ground' });
  bake('tile_puddle_plain', puddle(67, '6'), { tag: 'ground' });

  /* ---- park ------------------------------------------------------------- */
  const grass = (seed) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, 'J');
    for (let i = 0; i < 70; i++) { const v = r(); p.set((r() * 16) | 0, (r() * 16) | 0, v < .55 ? 'K' : (v < .9 ? 'J' : 'L')); }
    for (let i = 0; i < 5; i++) { const x = (r() * 15) | 0, y = (r() * 14) | 0; p.set(x, y, 'L'); p.set(x, y + 1, 'K'); }
    return p;
  };
  bake('tile_grass', grass(2), { tag: 'ground' });
  bake('tile_grass_b', grass(88), { tag: 'ground' });
  const path = (seed) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, 'Q');
    for (let i = 0; i < 40; i++) { const v = r(); p.set((r() * 16) | 0, (r() * 16) | 0, v < .5 ? '7' : (v < .85 ? 'R' : 'Q')); }
    return p;
  };
  bake('tile_park_path', path(6), { tag: 'ground' });

  /* ---- canal ------------------------------------------------------------ */
  /* Frequencies are integer multiples of 2*PI/16 so the swell wraps exactly
     at the tile edge and the canal never shows a seam. */
  const K = Math.PI * 2 / 16;
  const water = (phase) => {
    const p = new Pix(16, 16);
    const ph = phase * Math.PI / 2;
    p.rect(0, 0, 16, 16, 'N');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = Math.sin(K * x + K * 2 * y + ph) + .7 * Math.sin(K * 2 * x - K * y - ph * .6);
      if (w > .45) p.set(x, y, 'O');
      if (w > 1.15) p.set(x, y, 'P');
      // one crest gets a cold specular dash, the only bright pixel in the canal
      if (w > 1.62) p.set(x, y, 'i', .8);
    }
    return p;
  };
  bakeStrip('tile_water', [water(0), water(1), water(2), water(3)], { tag: 'ground' });

  const quay = (seed) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    p.rect(0, 0, 16, 16, 'Q');
    for (let i = 0; i < 30; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < .5 ? '7' : 'R');
    p.hline(0, 0, 16, '1', .8); p.hline(0, 5, 16, '1', .7); p.hline(0, 10, 16, '1', .7); p.hline(0, 15, 16, '1', .5);
    p.hline(0, 1, 16, 'R', .3); p.hline(0, 6, 16, 'R', .3); p.hline(0, 11, 16, 'R', .3);
    return p;
  };
  bake('tile_quay', quay(12), { tag: 'ground' });
  bake('tile_quay_b', quay(64), { tag: 'ground' });

  const quayEdge = quay(12);
  quayEdge.rect(0, 13, 16, 3, '7'); quayEdge.hline(0, 13, 16, '9'); quayEdge.hline(0, 15, 16, '0');
  bake('tile_quay_edge', quayEdge, { tag: 'ground' });

  /* ---- level changes ---------------------------------------------------- */
  const stairs = new Pix(16, 16);
  stairs.rect(0, 0, 16, 16, '8');
  for (let i = 0; i < 4; i++) { stairs.rect(0, i * 4, 16, 3, '9'); stairs.hline(0, i * 4, 16, 'b', .6); stairs.hline(0, i * 4 + 3, 16, '7'); }
  bake('tile_stairs', stairs, { tag: 'ground' });

  const ramp = new Pix(16, 16);
  ramp.rect(0, 0, 16, 16, '9');
  for (let y = 0; y < 16; y++) ramp.hline(0, y, 16, y < 8 ? 'a' : '8', .25);
  ramp.hline(0, 0, 16, '7', .8); ramp.hline(0, 15, 16, '7', .8);
  for (let x = 2; x < 16; x += 4) ramp.vline(x, 2, 12, 'b', .35);
  bake('tile_ramp', ramp, { tag: 'ground' });

  /* Underground entrance. A single 32x32 module: a stair-well cut into the
     pavement, hazard kerbs on both flanks, and a cyan lintel strip as the only
     bright thing on it. Each tread is darker than the one above, so the eye
     reads depth without any gradient. */
  const hatch = new Pix(32, 32), hr = mulberry(808);
  hatch.rect(0, 0, 32, 32, '9');
  for (let i = 0; i < 36; i++) hatch.set((hr() * 32) | 0, (hr() * 32) | 0, hr() < .5 ? '8' : 'a');
  hatch.rect(1, 1, 30, 30, '7'); hatch.frame(1, 1, 30, 30, 'a', .55);
  for (let y = 3; y < 29; y += 4) { hatch.rect(2, y, 2, 2, 'y', .8); hatch.rect(28, y, 2, 2, 'y', .8); }
  hatch.rect(6, 5, 20, 23, '0');
  for (let i = 0; i < 6; i++) {
    const y = 7 + i * 3.5 | 0, inset = i;
    hatch.rect(7 + inset, y, 18 - inset * 2, 3, i < 2 ? '4' : (i < 4 ? '3' : '2'));
    hatch.hline(7 + inset, y, 18 - inset * 2, '6', .5);
  }
  hatch.rect(5, 3, 22, 2, 'k'); hatch.hline(5, 5, 22, 'i');
  hatch.vline(5, 5, 23, 'i'); hatch.vline(26, 5, 23, 'i');
  hatch.rect(14, 8, 4, 1, 'l'); hatch.rect(15, 9, 2, 1, 'l');   // chevron: down
  hatch.hline(4, 29, 24, '1', .8);
  bake('tile_under_entry', hatch, { tag: 'ground' });

  /* industrial rail tracks */
  const tracks = asphalt(35, false);
  tracks.rect(0, 3, 16, 2, '8'); tracks.rect(0, 11, 16, 2, '8');
  tracks.hline(0, 3, 16, 'a', .6); tracks.hline(0, 11, 16, 'a', .6);
  for (let x = 1; x < 16; x += 5) tracks.rect(x, 2, 3, 12, '7', .5);
  bake('tile_tracks', tracks, { tag: 'ground' });
}

/* ===== 03_buildings.js ===== */
/* ==========================================================================
   MODULAR BUILDINGS  —  roof_* / facade_* / neon_*
   No building is a unique illustration. Every block in the city is assembled
   from these 16x16 pieces, so a street can be rebuilt anywhere for free.
   ========================================================================== */

const BUILD_TYPES = {
  apartment:  { wall: '5', dark: '4', trim: '6', accent: 'o', lit: 'y', sign: 'HAB-BLOCK', roof: 'a' },
  shop:       { wall: '7', dark: '2', trim: '9', accent: 's', lit: 'z', sign: 'OPEN', roof: 'a' },
  tech:       { wall: '4', dark: '2', trim: '6', accent: 'k', lit: 'l', sign: 'NEURO-LAB', roof: 'b' },
  konbini:    { wall: '8', dark: '7', trim: 'a', accent: 'v', lit: 'z', sign: '24H', roof: 'a' },
  bar:        { wall: 'f', dark: '1', trim: 'g', accent: 's', lit: 'y', sign: 'BAR', roof: 'a' },
  cafe:       { wall: '7', dark: '2', trim: '9', accent: 'x', lit: 'z', sign: 'CAFE', roof: 'a' },
  workshop:   { wall: '8', dark: '7', trim: '9', accent: 'y', lit: 'y', sign: 'REPAIR', roof: 'b' },
  office:     { wall: '5', dark: '3', trim: '6', accent: 'n', lit: 'o', sign: 'CORP', roof: 'b' },
  industrial: { wall: '7', dark: '1', trim: '8', accent: 'x', lit: 'x', sign: 'PLANT', roof: 'c' },
  warehouse:  { wall: '8', dark: '2', trim: '9', accent: 'j', lit: 'j', sign: 'DEPOT', roof: 'c' },
};

function buildBuildings() {

  /* ---- roofs ------------------------------------------------------------ */
  const roofBase = (seed, family) => {
    const p = new Pix(16, 16), r = mulberry(seed);
    const base = family === 'c' ? '7' : (family === 'b' ? '8' : '7');
    p.rect(0, 0, 16, 16, base);
    for (let i = 0; i < 44; i++) { const v = r(); p.set((r() * 16) | 0, (r() * 16) | 0, v < .45 ? '2' : (v < .82 ? '8' : '9')); }
    if (family === 'b') { // tarred panels
      p.hline(0, 5, 16, '2', .5); p.hline(0, 11, 16, '2', .5); p.vline(7, 0, 16, '2', .35);
    }
    if (family === 'c') { // corrugated industrial
      for (let x = 0; x < 16; x += 3) { p.vline(x, 0, 16, '2', .55); p.vline(x + 1, 0, 16, '9', .25); }
    }
    return p;
  };
  ['a', 'b', 'c'].forEach(f => {
    bake('roof_' + f + '_1', roofBase(101, f), { tag: 'building' });
    bake('roof_' + f + '_2', roofBase(131, f), { tag: 'building' });
    bake('roof_' + f + '_3', roofBase(167, f), { tag: 'building' });
  });

  /* parapet edges — the lip that tells you where the roof stops */
  const parapet = (dir, family) => {
    const p = roofBase(113, family);
    const put = (x, y, w, h) => { p.rect(x, y, w, h, '9'); };
    if (dir === 'n') { put(0, 0, 16, 3); p.hline(0, 0, 16, 'b', .7); p.hline(0, 3, 16, '1', .7); }
    if (dir === 'w') { put(0, 0, 3, 16); p.vline(0, 0, 16, 'b', .7); p.vline(3, 0, 16, '1', .7); }
    if (dir === 'e') { put(13, 0, 3, 16); p.vline(15, 0, 16, 'b', .7); p.vline(12, 0, 16, '1', .7); }
    return p;
  };
  ['a', 'b', 'c'].forEach(f => ['n', 'w', 'e'].forEach(d => bake('roof_edge_' + d + '_' + f, parapet(d, f), { tag: 'building' })));

  /* corners */
  ['a', 'b', 'c'].forEach(f => {
    const nw = parapet('n', f); nw.rect(0, 0, 3, 16, '9'); nw.vline(0, 0, 16, 'b', .7); nw.vline(3, 3, 13, '1', .7);
    bake('roof_edge_nw_' + f, nw, { tag: 'building' });
    const ne = parapet('n', f); ne.rect(13, 0, 3, 16, '9'); ne.vline(15, 0, 16, 'b', .7); ne.vline(12, 3, 13, '1', .7);
    bake('roof_edge_ne_' + f, ne, { tag: 'building' });
  });

  /* ---- rooftop equipment (drawn over roof tiles) ------------------------ */
  bake('roof_ac', art([
    '................',
    '................',
    '..99999999999...',
    '..9bbbbbbbbb9...',
    '..9b8a8a8a8b9...',
    '..9ba8a8a8ab9...',
    '..9b8a8a8a8b9...',
    '..9bbbbbbbbb9...',
    '..999999999a9...',
    '..1111111111....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']), { tag: 'building' });

  bake('roof_tank', art([
    '................',
    '....99999999....',
    '...9aaaaaaaa9...',
    '...9a8888888a...',
    '...9a8777778a...',
    '...9a8777778a...',
    '...9a8777778a...',
    '...9a8888888a...',
    '...9aaaaaaaa9...',
    '....99999999....',
    '....9......9....',
    '....9......9....',
    '....111..111....',
    '................',
    '................',
    '................']), { tag: 'building' });

  bake('roof_vent', art([
    '................',
    '................',
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '....9a777a9.....',
    '....9a777a9.....',
    '....9aaaaa9.....',
    '.....99999......',
    '......111.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']), { tag: 'building' });

  bake('roof_antenna', art([
    '.......a........',
    '.......a........',
    '......kak.......',
    '.......a........',
    '.....k.a.k......',
    '.......a........',
    '.......a........',
    '.......a........',
    '......9a9.......',
    '.....9.a.9......',
    '....9..a..9.....',
    '...99999999.....',
    '....1111111.....',
    '................',
    '................',
    '................']), { tag: 'building' });

  bake('roof_skylight', art([
    '................',
    '................',
    '..9999999999....',
    '..9oooo9oooo9...',
    '..9oyyo9oooo9...',
    '..9oooo9ooyo9...',
    '..9999999999a...',
    '...11111111.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']), { tag: 'building' });

  bake('roof_pipes', art([
    '................',
    '..9999999999999.',
    '..a88888888888a.',
    '..9999999999999.',
    '................',
    '.....9......9...',
    '.99999999999999.',
    '.a8888888888888.',
    '.99999999999999.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']), { tag: 'building' });

  /* ---- façades ---------------------------------------------------------- */
  /* Each type gets the same five modules so streets can be recombined. */
  for (const key in BUILD_TYPES) {
    const T = BUILD_TYPES[key];

    const shell = () => {
      const p = new Pix(16, 16), r = mulberry(key.charCodeAt(0) * 7 + 3);
      p.rect(0, 0, 16, 16, T.wall);
      for (let i = 0; i < 22; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < .6 ? T.dark : T.trim);
      return p;
    };

    // plain wall
    const wall = shell();
    wall.vline(0, 0, 16, T.dark, .6);
    bake('facade_' + key + '_wall', wall, { tag: 'building' });

    // dark window
    const wd = shell();
    wd.rect(3, 3, 10, 9, '1'); wd.frame(3, 3, 10, 9, T.trim, .9);
    wd.vline(8, 4, 7, T.dark, .5); wd.hline(4, 7, 8, T.dark, .35);
    bake('facade_' + key + '_window_dark', wd, { tag: 'building' });

    // lit window — someone is home
    const wl = shell();
    wl.rect(3, 3, 10, 9, T.lit, .9); wl.rect(4, 4, 8, 7, T.lit);
    wl.frame(3, 3, 10, 9, T.trim, .95);
    wl.rect(5, 5, 3, 2, '1', .45); wl.rect(9, 8, 2, 3, '1', .3);
    wl.vline(8, 4, 7, T.trim, .5);
    bake('facade_' + key + '_window_lit', wl, { tag: 'building' });

    // lit window, alternate silhouette (a body in the frame)
    const wl2 = shell();
    wl2.rect(3, 3, 10, 9, T.lit, .75); wl2.frame(3, 3, 10, 9, T.trim, .95);
    wl2.rect(6, 5, 4, 7, '1', .7); wl2.rect(6, 4, 4, 2, '1', .7);
    bake('facade_' + key + '_window_body', wl2, { tag: 'building' });

    // door
    const dr = shell();
    dr.rect(3, 2, 10, 14, '1');
    dr.frame(3, 2, 10, 14, T.trim);
    dr.rect(4, 3, 8, 5, T.accent, .32);
    dr.rect(5, 4, 6, 3, T.accent, .55);
    dr.set(11, 10, T.accent); dr.set(11, 11, T.accent);
    dr.hline(2, 15, 12, T.accent, .3);
    bake('facade_' + key + '_door', dr, { tag: 'building' });

    // rolled shutter (closed shop)
    const sh = shell();
    sh.rect(2, 2, 12, 14, T.dark);
    for (let y = 3; y < 16; y += 2) sh.hline(2, y, 12, '7', .8);
    for (let y = 4; y < 16; y += 2) sh.hline(2, y, 12, '9', .35);
    sh.frame(2, 2, 12, 14, T.trim, .8);
    // graffiti tag, because nobody repaints anything down here
    sh.rect(4, 7, 2, 4, T.accent, .5); sh.rect(6, 9, 4, 1, T.accent, .5); sh.rect(9, 6, 2, 5, T.accent, .5);
    bake('facade_' + key + '_shutter', sh, { tag: 'building' });

    // ground-floor sign band
    const sg = shell();
    sg.rect(0, 4, 16, 8, '1');
    sg.hline(0, 4, 16, T.trim, .8); sg.hline(0, 11, 16, T.trim, .8);
    sg.rect(2, 6, 12, 1, T.accent, .85);
    sg.rect(3, 8, 4, 1, T.accent, .55); sg.rect(8, 8, 6, 1, T.accent, .55);
    bake('facade_' + key + '_sign', sg, { tag: 'building' });

    // awning over the pavement
    const aw = shell();
    aw.rect(0, 9, 16, 5, '1');
    for (let x = 0; x < 16; x += 4) { aw.rect(x, 9, 2, 5, T.accent, .55); aw.rect(x + 2, 9, 2, 5, T.dark); }
    aw.hline(0, 9, 16, T.trim); aw.hline(0, 13, 16, '0', .7);
    bake('facade_' + key + '_awning', aw, { tag: 'building' });

    // wall vent + pipe + cable, the grubby detail layer
    const vt = shell();
    vt.rect(4, 4, 8, 6, '1'); vt.frame(4, 4, 8, 6, T.trim, .8);
    for (let y = 5; y < 10; y += 2) vt.hline(5, y, 6, '9', .7);
    vt.rect(2, 11, 2, 5, '8'); vt.vline(2, 11, 5, 'a', .5);
    bake('facade_' + key + '_vent', vt, { tag: 'building' });

    const pp = shell();
    pp.rect(3, 0, 2, 16, '8'); pp.vline(3, 0, 16, 'a', .45);
    pp.rect(2, 5, 4, 2, '9'); pp.rect(2, 12, 4, 2, '9');
    pp.rect(11, 0, 2, 16, '8'); pp.vline(11, 0, 16, 'a', .35);
    bake('facade_' + key + '_pipe', pp, { tag: 'building' });
  }

  /* ---- hanging cables (drawn across alleys and between blocks) ---------- */
  const cable = (sag) => {
    const p = new Pix(16, 8);
    for (let x = 0; x < 16; x++) {
      const y = 1 + Math.round(Math.sin((x / 15) * Math.PI) * sag);
      p.set(x, y, '1'); p.set(x, y + 1, '7', .7);
    }
    return p;
  };
  bake('prop_cable_1', cable(2), { tag: 'building' });
  bake('prop_cable_2', cable(4), { tag: 'building' });
  // spans a two-tile alley in one clean sag; drawn overhead, above the player
  const span = new Pix(32, 8);
  for (let x = 0; x < 32; x++) {
    const y = 1 + Math.round(Math.sin((x / 31) * Math.PI) * 4);
    span.set(x, y, '9'); span.set(x, y + 1, '1', .8);
  }
  span.rect(0, 0, 2, 2, 'b'); span.rect(30, 0, 2, 2, 'b');
  bake('prop_cable_span', span, { ox: 16, oy: 8, tag: 'prop' });

  /* ---- neon signage ----------------------------------------------------- */
  /* Signs are the loudest thing in the game, so there are only a handful of
     shapes and they are placed sparingly. Two frames: on and dimmed. */
  function neon(name, rows, colOn, colDim) {
    const on = art(rows, { '*': colOn, '+': colOn, '-': colDim });
    // bloom is faked with one hard halo ring — no gaussian anywhere
    const halo = new Pix(on.w, on.h);
    for (let y = 0; y < on.h; y++) for (let x = 0; x < on.w; x++) {
      const i = (y * on.w + x) * 4;
      if (on.data[i + 3] === 0) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => halo.set(x + dx, y + dy, colDim, .34));
    }
    for (let y = 0; y < on.h; y++) for (let x = 0; x < on.w; x++) {
      const i = (y * on.w + x) * 4;
      if (on.data[i + 3] > 0) { const j = i; halo.data[j] = on.data[i]; halo.data[j + 1] = on.data[i + 1]; halo.data[j + 2] = on.data[i + 2]; halo.data[j + 3] = 255; }
    }
    const off = art(rows, { '*': colDim, '+': '1', '-': '1' });
    bakeStrip(name, [halo, off], { tag: 'neon' });
  }

  neon('neon_bar', [
    '..************..',
    '.*............*.',
    '*..**..**..**..*',
    '*..*....*..*...*',
    '*..**...*..**..*',
    '*..*....*..*...*',
    '*..**..**..**..*',
    '.*............*.',
    '..************..',
    '.......--.......',
    '.......--.......'], 's', 'r');

  neon('neon_arrow', [
    '.......**.......',
    '......****......',
    '.....******.....',
    '....********....',
    '.......**.......',
    '.......**.......',
    '.......**.......',
    '.......--.......'], 'k', 'i');

  neon('neon_bars', [
    '**..**..**..**..',
    '**..**..**..**..',
    '**..**..**..**..',
    '**..**..**..**..',
    '................',
    '**..**..**..**..',
    '**..**..**..**..',
    '................',
    '.......--.......'], 'q', 'h');

  neon('neon_kanji', [
    '..************..',
    '..*..........*..',
    '..*..******..*..',
    '..*..*....*..*..',
    '..*..*.**.*..*..',
    '..*..*....*..*..',
    '..*..******..*..',
    '..*..........*..',
    '..************..',
    '......-..-......'], 'k', 'j');

  neon('neon_circle', [
    '.....****.....',
    '...**....**...',
    '..*........*..',
    '.*...****...*.',
    '*...**..**...*',
    '*...*....*...*',
    '*...**..**...*',
    '.*...****...*.',
    '..*........*..',
    '...**....**...',
    '.....****.....',
    '......--......'], 'x', 'w');

  neon('neon_stripe', [
    '****************',
    '................',
    '****************',
    '................',
    '..**..**..**..**',
    '.......--.......'], 'n', 'm');

  neon('neon_diamond', [
    '.......**.......',
    '.....******.....',
    '...**********...',
    '.****......****.',
    '**..**....**..**',
    '.****......****.',
    '...**********...',
    '.....******.....',
    '.......**.......',
    '.......--.......'], 'v', 'u');

  /* holographic street advert — three frames, subtle scanline drift */
  /* A hologram is a suggestion, not a light source. Only the projector base
     and a few scanlines are solid; the body of it barely registers, which is
     what stops it from flattening the street behind it. */
  const holo = (off) => {
    const p = new Pix(16, 28);
    for (let y = 4; y < 24; y++) {
      if ((y + off) % 2 === 0) continue;
      const wdt = 3 + Math.round(Math.sin((y - 4) / 5) * 3);
      for (let x = 8 - wdt; x <= 7 + wdt; x++) p.set(x, y, off % 2 ? 's' : 'i', .2);
    }
    p.rect(6, 7, 4, 1, 'k', .6);
    p.rect(5, 12, 6, 1, off % 2 ? 't' : 'k', .45);
    p.rect(6, 17, 4, 1, 'q', .35);
    p.set(8, 9 + (off % 3), 'l', .8);
    p.rect(5, 25, 6, 2, '8');
    p.rect(6, 25, 4, 1, 'i', .7);
    p.hline(4, 27, 8, '1');
    return p;
  };
  bakeStrip('prop_hologram', [holo(0), holo(1), holo(2)], { ox: 8, oy: 28, tag: 'neon' });
}

/* ===== 04_props.js ===== */
/* ==========================================================================
   CITY PROPS  —  prop_*
   Pivot is bottom-centre on everything so a prop can be dropped on any tile
   and still sit on the ground correctly. Props are the texture of the city;
   they are deliberately not placed on every free tile.
   ========================================================================== */

function buildProps() {
  const P = (name, rows, tag) => {
    const p = art(rows);
    bake(name, p, { ox: (p.w / 2) | 0, oy: p.h, tag: tag || 'prop' });
    return p;
  };

  /* ---- lighting --------------------------------------------------------- */
  // street lamp: two frames so it can flicker
  const lampRows = (lit) => ([
    '....zzzzzz....'.replace(/z/g, lit ? '@' : '9'),
    '...z......z...'.replace(/z/g, lit ? '!' : '8'),
    '...z.yyyy.z...'.replace(/y/g, lit ? '!' : '8').replace(/z/g, lit ? '!' : '8'),
    '....yyyyyy....'.replace(/y/g, lit ? '!' : '8'),
    '.....9aa9.....',
    '......99......',
    '......9a......',
    '......9a......',
    '......9a......',
    '......9a......',
    '......9a......',
    '......9a......',
    '......9a......',
    '......9a......',
    '.....9aa9.....',
    '....99aa99....',
    '....11111.....']);
  bakeStrip('prop_lamp', [art(lampRows(true)), art(lampRows(false))], { ox: 7, oy: 17, tag: 'prop' });

  P('prop_lamp_wall', [
    '9999..........',
    '9aa9..........',
    '99a9..........',
    '..a999........',
    '..a9zz9.......',
    '..99yy99......',
    '...9yy9.......',
    '....11........']);

  /* ---- seating & waste -------------------------------------------------- */
  P('prop_bench', [
    '..............',
    '..9aaaaaaaa9..',
    '.9a99999999a9.',
    '.9aaaaaaaaaa9.',
    '.99999999999..',
    '.9a99999999a..',
    '..9..99..99...',
    '..9..99..99...',
    '..1..11..11...']);

  P('prop_trash', [
    '..............',
    '...99999999...',
    '..9a888888a9..',
    '..97777777a9..',
    '..9a888888a9..',
    '..97777777a9..',
    '..9a888888a9..',
    '..99999999a9..',
    '...11111111...']);

  P('prop_dumpster', [
    '................',
    '..999999999999..',
    '.9iiiiiiiiiiii9.',
    '.9i7777777777i9.',
    '.9iiiiiiiiiiii9.',
    '.9i7777777777i9.',
    '.9iiiiiiiiiiii9.',
    '.9i7777777777i9.',
    '.99999999999999.',
    '..9..........9..',
    '..1111111111 1..']);

  P('prop_newsbox', [
    '..............',
    '...99999999...',
    '..9s111111s9..',
    '..9s1dddd1s9..',
    '..9s1dddd1s9..',
    '..9s111111s9..',
    '..9ssssssss9..',
    '..99999999 9..',
    '...9......9...',
    '...11....11...']);

  /* ---- machines --------------------------------------------------------- */
  // vending machine, two frames (its display cycles)
  const vend = (alt) => art([
    '................',
    '..9999999999999.',
    '.9aaaaaaaaaaaa9.',
    '.9a1111111111a9.',
    ('.9a1' + (alt ? 'kkkk' : 'ssss') + '1111a9.'),
    ('.9a1' + (alt ? 'kkkk' : 'ssss') + '1111a9.'),
    '.9a1111111111a9.',
    ('.9a1' + (alt ? 'ssss' : 'kkkk') + '1111a9.'),
    ('.9a1' + (alt ? 'ssss' : 'kkkk') + '1111a9.'),
    '.9a1111111111a9.',
    '.9aaaaaaaaaaaa9.',
    '.9a9999999999a9.',
    '.9aaaaaaaaaaaa9.',
    '.99999999999999.',
    '..111111111111..']);
  bakeStrip('prop_vending_machine', [vend(false), vend(true)], { ox: 8, oy: 15, tag: 'prop' });

  const vend2 = (alt) => art([
    '................',
    '..9999999999999.',
    '.9888888888888a.',
    '.987777777777a9.',
    ('.987' + (alt ? 'vvvvvv' : '111111') + '77a9.'),
    '.9871111111177a9'.slice(0, 16),
    ('.987' + (alt ? '111111' : 'vvvvvv') + '77a9.'),
    '.987777777777a9.',
    '.9877777777 7a9.',
    '.9888888888888a.',
    '.98zz77777777a9.',
    '.98zz77777777a9.',
    '.9888888888888a.',
    '.99999999999999.',
    '..111111111111..']);
  bakeStrip('prop_vending_machine_food', [vend2(false), vend2(true)], { ox: 8, oy: 15, tag: 'prop' });

  P('prop_payphone', [
    '..............',
    '...9999999....',
    '..9a11111a9...',
    '..9a1kkk1a9...',
    '..9a11111a9...',
    '..9aa777aa9...',
    '..9a77777a9...',
    '...9aaaaa9....',
    '.....9a9......',
    '.....9a9......',
    '....99a99.....',
    '....11111.....']);

  // animated street advert screen
  const screen = (f) => {
    const p = new Pix(16, 22);
    p.rect(1, 0, 14, 16, '9');
    p.rect(2, 1, 12, 14, '1');
    const cols = ['n', 's', 'k'];
    const c = cols[f % 3];
    p.rect(3, 2, 10, 5, c, .75);
    p.rect(3, 8, 10, 1, c, .5);
    p.rect(3, 10, 6, 1, c, .4);
    p.rect(3, 12, 8, 1, c, .3);
    for (let y = 1 + (f % 2); y < 15; y += 3) p.hline(2, y, 12, '0', .28);
    p.rect(7, 16, 2, 5, '8');
    p.rect(5, 21, 6, 1, '1');
    return p;
  };
  bakeStrip('prop_ad_screen', [screen(0), screen(1), screen(2)], { ox: 8, oy: 22, tag: 'prop' });

  P('prop_camera', [
    '..............',
    '..999.........',
    '..9a9.........',
    '..9a99999.....',
    '..9aaaaa79....',
    '..99999s99....',
    '....9.........',
    '....9.........',
    '....9.........',
    '....9.........',
    '....9.........',
    '...191........']);

  P('prop_elecbox', [
    '..............',
    '..9999999999..',
    '.9a88888888a9.',
    '.9a87777778a9.',
    '.9a87vv77v78a9'.slice(0, 14),
    '.9a87777778a9.',
    '.9a88888888a9.',
    '.9aaaaaaaaa9..',
    '.99999999999..',
    '..111111111...']);

  /* ---- street infrastructure -------------------------------------------- */
  P('prop_pole', [
    '.....9a9......',
    '..99999a99999.',
    '.....9a9......',
    '.....9a9......',
    '..9999a9999...',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '....99a99.....',
    '....11111.....']);

  P('prop_bollard', [
    '......kk......',
    '.....9aa9.....',
    '.....9779.....',
    '.....9aa9.....',
    '.....9779.....',
    '.....9aa9.....',
    '....999999....',
    '....111111....']);

  P('prop_hydrant', [
    '.....999......',
    '....9III9.....',
    '...9IIIII9....',
    '..99IIIII99...',
    '..9aIIIIIa9...',
    '...9IIIII9....',
    '...9IIIII9....',
    '..999999999...',
    '..111111111...']);

  P('prop_barrier', [
    '................',
    '.99999999999999.',
    '.9xx11xx11xx119.',
    '.9xx11xx11xx119.',
    '.99999999999999.',
    '.9x11xx11xx11x9.',
    '.9x11xx11xx11x9.',
    '.99999999999999.',
    '..9..........9..',
    '.999........999.',
    '.111........111.']);

  P('prop_cone', [
    '......xx......',
    '......xx......',
    '.....xxxx.....',
    '.....eeee.....',
    '....xxxxxx....',
    '....xxxxxx....',
    '...xxxxxxxx...',
    '..7xxxxxxxx7..',
    '..77777777 7..',
    '..1111111111..']);

  P('prop_sign_post', [
    '..............',
    '..9999999999..',
    '..9k111111k9..',
    '..9k1kkkk1k9..',
    '..9k111111k9..',
    '..9999999999..',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '.....9a9......',
    '....99a99.....',
    '....11111.....']);

  P('prop_poster', [
    '..99999999....',
    '..9s111111....',
    '..9s1eee11....',
    '..9s111111....',
    '..9s11ee11....',
    '..9s111111....',
    '..99999999....',
    '..............']);

  /* ---- containers ------------------------------------------------------- */
  P('prop_crate', [
    '..............',
    '..R9999999R...',
    '..9QRRRRRQ9...',
    '..9RQ7777QR...',
    '..9R7RRRR7R...',
    '..9R7RRRR7R...',
    '..9RQ7777QR...',
    '..9QRRRRRQ9...',
    '..R9999999R...',
    '..11111111....']);

  P('prop_box', [
    '..............',
    '....999999....',
    '...9877778a...',
    '...9777777a...',
    '...98jjjj7a...',
    '...9777777a...',
    '...9aaaaaa9...',
    '....111111....']);

  P('prop_pallet', [
    '..............',
    '..............',
    '..............',
    '..RRRRRRRRRR..',
    '..Q7QQ7QQ7QQ..',
    '..RRRRRRRRRR..',
    '..Q7QQ7QQ7QQ..',
    '..RRRRRRRRRR..',
    '..1111111111..']);

  /* ---- greenery --------------------------------------------------------- */
  // a small tree, two frames for a slow breeze
  const tree = (sway) => art([
    ('.....' + (sway ? 'KLLK.' : '.KLLK') + '....'),
    (sway ? '...KLMMLLK....' : '....KLMMLLK...'),
    (sway ? '..KLMMMMMLK...' : '...KLMMMMMLK..'),
    (sway ? '..LMMLMMMML9..' : '...LMMLMMMML9.'),
    (sway ? '..KLMMMMMMLK..' : '...KLMMMMMMLK.'),
    (sway ? '...KLMMMMLK...' : '....KLMMMMLK..'),
    '....KLLLLK....',
    '......GG......',
    '......GG......',
    '.....GQG......',
    '.....GGQ......',
    '....JJJJJ.....',
    '....11111.....']);
  bakeStrip('prop_tree', [tree(false), tree(true)], { ox: 7, oy: 13, tag: 'prop' });

  const tree2 = (sway) => art([
    (sway ? '....KLLK......' : '.....KLLK.....'),
    (sway ? '...KLMMLK.....' : '....KLMMLK....'),
    (sway ? '..KLMMMMLK....' : '...KLMMMMLK...'),
    (sway ? '..KLMMMMMLK...' : '...KLMMMMMLK..'),
    (sway ? '...KLMMMMLK...' : '....KLMMMMLK..'),
    (sway ? '....KLMMLK....' : '.....KLMMLK...'),
    '.....KLLK.....',
    '......GG......',
    '......GG......',
    '.....JJJJ.....',
    '.....1111.....']);
  bakeStrip('prop_tree_slim', [tree2(false), tree2(true)], { ox: 7, oy: 11, tag: 'prop' });

  P('prop_bush', [
    '..............',
    '...KLLKKLK....',
    '..KLMMLMMLK...',
    '..KLMMMMMLK...',
    '...KLMMMLK....',
    '....KLLLK.....',
    '....JJJJ......',
    '....1111......']);

  P('prop_planter', [
    '..............',
    '...KLLKKLLK...',
    '..KLMMLMMMLK..',
    '..9KLLKKLLK9..',
    '.9aaaaaaaaaa9.',
    '.9a99999999a9.',
    '.9aaaaaaaaaa9.',
    '.99999999999..',
    '..1111111111..']);

  /* ---- boundaries ------------------------------------------------------- */
  P('prop_fence', [
    '..............',
    '.9a9a9a9a9a9a.',
    '.9a9a9a9a9a9a.',
    '.999999999999.',
    '.9a9a9a9a9a9a.',
    '.9a9a9a9a9a9a.',
    '.999999999999.',
    '.9a9a9a9a9a9a.',
    '.111111111111.']);

  P('prop_rail', [
    '..............',
    '..............',
    '..............',
    '.999999999999.',
    '.9..........9.',
    '.999999999999.',
    '.9..9....9..9.',
    '.9..9....9..9.',
    '.1..1....1..1.']);

  P('prop_gate', [
    '.9..........9.',
    '.9kkkkkkkkkk9.',
    '.9..........9.',
    '.9a9a9a9a9a9a.',
    '.9a9a9a9a9a9a.',
    '.999999999999.',
    '.9a9a9a9a9a9a.',
    '.9a9a9a9a9a9a.',
    '.111111111111.']);

  /* ---- atmosphere ------------------------------------------------------- */
  // steam from a vent: four frames, rising and thinning
  const steam = (f) => {
    const p = new Pix(16, 20), r = mulberry(200 + f);
    for (let i = 0; i < 26; i++) {
      const t = r();
      const y = 19 - ((t * 17 + f * 3) % 18);
      const spread = (19 - y) * .35;
      const x = 8 + ((r() - .5) * (2 + spread * 2)) | 0;
      const a = .26 * (1 - (19 - y) / 22);
      p.set(x, y, '6', a); p.set(x + 1, y, '5', a * .7);
    }
    return p;
  };
  bakeStrip('fx_steam', [steam(0), steam(1), steam(2), steam(3)], { ox: 8, oy: 20, tag: 'fx' });

  // rain splash on the ground
  const splash = (f) => {
    const p = new Pix(8, 5);
    if (f === 0) { p.set(4, 3, 'b', .55); }
    if (f === 1) { p.set(3, 3, 'b', .45); p.set(5, 3, 'b', .45); p.set(4, 2, 'c', .3); }
    if (f === 2) { p.set(2, 3, 'b', .28); p.set(6, 3, 'b', .28); p.set(4, 3, '6', .3); }
    return p;
  };
  bakeStrip('fx_splash', [splash(0), splash(1), splash(2)], { ox: 4, oy: 4, tag: 'fx' });

  /* ---- interactive fixtures (game systems, not decoration) -------------- */
  // network node: the thing Mission 01 is actually about
  const node = (state, f) => {
    const p = new Pix(16, 22);
    p.rect(3, 20, 10, 2, '0', .5);
    p.rect(4, 12, 8, 8, '8'); p.frame(4, 12, 8, 8, '9');
    p.rect(6, 6, 4, 7, '9'); p.vline(7, 6, 7, 'a', .5);
    p.rect(2, 2, 12, 6, '7'); p.frame(2, 2, 12, 6, state === 'on' ? 'k' : '9');
    const c = state === 'on' ? 'k' : (state === 'off' ? 'i' : 'a');
    p.rect(4, 4, 8, 2, c, state === 'on' ? .95 : .55);
    if (f % 2 === 0) p.set(4 + (f % 8), 4, 'l');
    p.set(12, 5, state === 'on' ? 'l' : 'i');
    if (state === 'on') { p.rect(2, 1, 12, 1, 'k', .45); p.rect(1, 3, 1, 4, 'k', .3); p.rect(14, 3, 1, 4, 'k', .3); }
    return p;
  };
  bakeStrip('prop_node_off', [node('off', 0), node('off', 1), node('off', 2), node('off', 3)], { ox: 8, oy: 22, tag: 'game' });
  bakeStrip('prop_node_on', [node('on', 0), node('on', 1), node('on', 2), node('on', 3)], { ox: 8, oy: 22, tag: 'game' });

  // interaction marker floating above interactables
  const mark = (f) => {
    const p = new Pix(10, 10);
    const y = f === 0 ? 0 : (f === 1 ? 1 : 2);
    p.rect(3, y + 1, 4, 4, 'k'); p.rect(4, y, 2, 6, 'k');
    p.set(4, y + 1, 'l'); p.set(5, y + 1, 'l');
    p.rect(3, y + 6, 4, 1, 'i', .5);
    return p;
  };
  bakeStrip('fx_marker', [mark(0), mark(1), mark(2), mark(1)], { ox: 5, oy: 14, tag: 'fx' });
}

/* ===== 05_chars.js ===== */
/* ==========================================================================
   CHARACTER SYSTEM  —  player_* / npc_*
   One set of authored 16x23 poses with symbolic colour slots. Every archetype
   is the same skeleton wearing a different ramp, which is how the cast stays
   visually coherent and cheap. Feet sit on row 22; pivot is (8,23).
   ========================================================================== */

/* slot legend:  o outline  s skin  S skin shade  h hair  H hair shade
                 j jacket  J jacket shade  k jacket light  p trousers
                 P trouser shade  b boots  a neon accent  e eye/visor
                 g gear  G gear shade  w bright detail                     */

const POSE = {
  head_down: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '....ohhhhhho....',
    '....osssssso....',
    '....osesseso....',
    '....ossssSso....',
    '.....oSSSSo.....'],
  head_up: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '....ohhhhhho....',
    '....ohhhhhho....',
    '....ohhhhhho....',
    '....ohHhhHho....',
    '.....oHHHHo.....'],
  head_side: [
    '................',
    '....oooooo......',
    '...ohhhhhho.....',
    '...ohhhhsso.....',
    '...ohssseso.....',
    '...ohssSSso.....',
    '....oSSSso......',
    '....oSSSo.......'],

  torso_down: [
    '...ojjjjjjjjo...',
    '...oJkjjjjkJo...',
    '...oJjaaaajJo...',
    '...oJjjjjjjJo...',
    '...oJjjjjjjJo...',
    '...oJjjjjjjJo...',
    '....ojjjjjjo....'],
  torso_up: [
    '...ojjjjjjjjo...',
    '...oJjjjjjjJo...',
    '...oJjgggjjJo...',
    '...oJjgggjjJo...',
    '...oJjGGGjjJo...',
    '...oJjjjjjjJo...',
    '....ojjjjjjo....'],
  torso_side: [
    '..ogjjjjjjo.....',
    '..ogjjkjjjo.....',
    '..ogjjaajjo.....',
    '..ogjjjjjjo.....',
    '..oGjjjjjjo.....',
    '...ojjjjjo......',
    '...ojjjjjo......'],
  /* reaching out — used for the interact beat */
  torso_reach_down: [
    '...ojjjjjjjjo...',
    '...oJkjjjjkJo...',
    '...oJjaaaajJo...',
    '...oJjjjjjjjos..',
    '...oJjjjjjjoS...',
    '...oJjjjjjjJo...',
    '....ojjjjjjo....'],
  torso_reach_side: [
    '..ogjjjjjjo.....',
    '..ogjjkjjjo.....',
    '..ogjjaajjossss.',
    '..ogjjjjjjoSSSS.',
    '..oGjjjjjjo.....',
    '...ojjjjjo......',
    '...ojjjjjo......'],

  legs_front_stand: [
    '....oppppppo....',
    '....oppppppo....',
    '....oppppppo....',
    '....opPooPpo....',
    '....opPooPpo....',
    '....opPooPpo....',
    '....obboobbo....',
    '...obbboobbbo...'],
  legs_front_stepA: [
    '....oppppppo....',
    '....oppppppo....',
    '....oppppppo....',
    '...opPooPpo.....',
    '...opPooPpo.....',
    '...opPooPpo.....',
    '...obboobbo.....',
    '..obbboobbbo....'],
  legs_front_stepB: [
    '....oppppppo....',
    '....oppppppo....',
    '....oppppppo....',
    '.....opPooPpo...',
    '.....opPooPpo...',
    '.....opPooPpo...',
    '.....obboobbo...',
    '....obbboobbbo..'],
  legs_side_stand: [
    '...opppppo......',
    '...opppppo......',
    '...opppppo......',
    '...opPPpo.......',
    '...opPPpo.......',
    '...opPPpo.......',
    '...obbbbo.......',
    '..obbbbbbo......'],
  legs_side_stepA: [
    '...opppppo......',
    '...opppppo......',
    '...opppppo......',
    '..opPPpPpo......',
    '..opPo.Ppo......',
    '..opPo.Ppo......',
    '..obbo.bbo......',
    '.obbbo.obbbo....'],
  legs_side_stepB: [
    '...opppppo......',
    '...opppppo......',
    '...opppppo......',
    '...opPpPPpo.....',
    '...opP.oPpo.....',
    '...opP.oPpo.....',
    '...obb.obbo.....',
    '..obbbo.obbbo...'],
};

/* colour ramps. The rule across the cast: one neon accent each, never two,
   so nobody out-shouts the signage. */
/* Values matter more than hues here. Trousers sit two ramp steps above the
   outline and boots sit one below them, otherwise the whole lower half turns
   into a single dark blob at this size. */
const CAST = {
  player: { name: 'OPERATOR', o: '0', s: 'C', S: 'B', h: '6', H: '4', j: '5', J: '3', k: '6', p: '9', P: '7', b: '1', a: 'k', e: 'l', g: '4', G: '2', w: 'e' },
  worker: { name: 'STREET WORKER', o: '0', s: 'B', S: 'A', h: 'F', H: '0', j: 'x', J: 'w', k: 'y', p: '8', P: '7', b: '1', a: 'z', e: '1', g: '9', G: '8' },
  hacker: { name: 'HACKER', o: '0', s: 'D', S: 'C', h: 'g', H: 'f', j: 'h', J: 'f', k: 'q', p: '7', P: '1', b: '0', a: 'v', e: 'v', g: 'g', G: 'f' },
  technician: { name: 'TECHNICIAN', o: '0', s: 'C', S: 'A', h: 'G', H: 'F', j: 'j', J: 'i', k: 'k', p: 'i', P: '1', b: '7', a: 'k', e: 'l', g: '9', G: '8' },
  shopkeeper: { name: 'SHOPKEEPER', o: '0', s: 'D', S: 'C', h: 'd', H: 'a', j: 'a', J: '8', k: 'b', p: '8', P: '7', b: '1', a: 'y', e: '1', g: '9', G: '8' },
  corporate: { name: 'CORPORATE', o: '0', s: 'E', S: 'D', h: 'F', H: '0', j: '6', J: '4', k: 'o', p: '5', P: '3', b: '0', a: 'n', e: 'o', g: '5', G: '3' },
  punk: { name: 'STREET PUNK', o: '0', s: 'C', S: 'B', h: 's', H: 'r', j: '8', J: '7', k: '9', p: '7', P: '1', b: '0', a: 's', e: 't', g: '8', G: '7' },
  courier: { name: 'COURIER', o: '0', s: 'B', S: 'A', h: 'F', H: '0', j: '8', J: '7', k: '9', p: '7', P: '2', b: '1', a: 'y', e: 'y', g: 'x', G: 'w' },
  bartender: { name: 'BARTENDER', o: '0', s: 'C', S: 'A', h: 'F', H: '0', j: 'H', J: '7', k: 'I', p: '7', P: '1', b: '0', a: 'y', e: '1', g: '7', G: '1' },
  mechanic: { name: 'MECHANIC', o: '0', s: 'B', S: 'A', h: 'G', H: 'F', j: 'S', J: 'R', k: 'S', p: 'R', P: 'Q', b: '1', a: 'x', e: '1', g: '9', G: '8' },
  security: { name: 'SECURITY', o: '0', s: 'A', S: '7', h: 'F', H: '0', j: '8', J: '7', k: '9', p: '8', P: '7', b: '0', a: 'I', e: 'I', g: '8', G: '7' },
  locksmith: { name: 'THE LOCKSMITH', o: '0', s: 'C', S: 'A', h: 'c', H: '9', j: 'h', J: 'g', k: 'q', p: '7', P: '1', b: '1', a: 'k', e: 'l', g: 'g', G: 'f' },
};

/* Rim light. In a city lit only by signage every figure catches a cold edge
   on one side. One pixel of it is the difference between a readable
   silhouette and a smudge, and it costs nothing at runtime. */
function rimLight(p, ch, alpha) {
  const orig = new Uint8ClampedArray(p.data);
  const solid = (x, y) => (x >= 0 && y >= 0 && x < p.w && y < p.h && orig[(y * p.w + x) * 4 + 3] > 0);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!solid(x, y)) continue;
    if (!solid(x - 1, y) || !solid(x, y - 1)) p.set(x, y, ch, alpha);
  }
  return p;
}

function compose(head, torso, legs, bob) {
  const rows = [];
  for (let i = 0; i < bob; i++) rows.push('................');
  head.forEach(r => rows.push(r));
  torso.forEach(r => rows.push(r));
  legs.forEach(r => rows.push(r));
  while (rows.length < 23) rows.push('................');
  return rows.slice(0, 23);
}

function buildChars() {
  for (const key in CAST) {
    const ramp = CAST[key];
    const make = (rows) => rimLight(art(rows, ramp), key === 'player' ? 'l' : 'o', key === 'player' ? .26 : .18);
    const prefix = key === 'player' ? 'player' : 'npc_' + key;

    /* idle: two frames, a single pixel of breathing */
    ['down', 'up', 'side'].forEach(dir => {
      const head = POSE['head_' + dir], torso = POSE['torso_' + dir];
      const legs = POSE[dir === 'side' ? 'legs_side_stand' : 'legs_front_stand'];
      bakeStrip(prefix + '_idle_' + dir, [
        make(compose(head, torso, legs, 0)),
        make(compose(head, torso, legs, 1)),
      ], { ox: 8, oy: 23, tag: 'character' });
    });

    /* walk: contact, pass, contact, pass */
    ['down', 'up'].forEach(dir => {
      const head = POSE['head_' + dir], torso = POSE['torso_' + dir];
      bakeStrip(prefix + '_walk_' + dir, [
        make(compose(head, torso, POSE.legs_front_stand, 0)),
        make(compose(head, torso, POSE.legs_front_stepA, 1)),
        make(compose(head, torso, POSE.legs_front_stand, 0)),
        make(compose(head, torso, POSE.legs_front_stepB, 1)),
      ], { ox: 8, oy: 23, tag: 'character' });
    });
    bakeStrip(prefix + '_walk_side', [
      make(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stand, 0)),
      make(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stepA, 1)),
      make(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stand, 0)),
      make(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stepB, 1)),
    ], { ox: 8, oy: 23, tag: 'character' });

    /* interact */
    bakeStrip(prefix + '_interact_down', [
      make(compose(POSE.head_down, POSE.torso_reach_down, POSE.legs_front_stand, 0)),
    ], { ox: 8, oy: 23, tag: 'character' });
    bakeStrip(prefix + '_interact_side', [
      make(compose(POSE.head_side, POSE.torso_reach_side, POSE.legs_side_stand, 0)),
    ], { ox: 8, oy: 23, tag: 'character' });
  }

  /* the player also sprints: same cycle, leaning one pixel into the run */
  const lean = (rows) => {
    const out = rows.slice();
    for (let i = 0; i < 15; i++) out[i] = out[i].slice(1) + '.';
    return out;
  };
  const ramp = CAST.player;
  const run = (rows) => rimLight(art(lean(rows), ramp), 'l', .3);
  ['down', 'up'].forEach(dir => {
    const head = POSE['head_' + dir], torso = POSE['torso_' + dir];
    bakeStrip('player_sprint_' + dir, [
      run(compose(head, torso, POSE.legs_front_stepA, 1)),
      run(compose(head, torso, POSE.legs_front_stepB, 0)),
    ], { ox: 8, oy: 23, tag: 'character' });
  });
  bakeStrip('player_sprint_side', [
    run(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stepA, 1)),
    run(compose(POSE.head_side, POSE.torso_side, POSE.legs_side_stepB, 0)),
  ], { ox: 8, oy: 23, tag: 'character' });

  /* soft contact shadow, shared by everything that stands up */
  const sh = new Pix(14, 6);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
    const d = Math.abs(x - 6.5) / 7 + Math.abs(y - 2.5) / 3;
    if (d < 1) sh.set(x, y, '0', d < .6 ? .45 : .22);
  }
  bake('fx_shadow', sh, { ox: 7, oy: 5, tag: 'fx' });
}


/* ===== 06_vehicles.js ===== */
/* ==========================================================================
   VEHICLES  —  vehicle_*
   Boxy top-down silhouettes. Built from rectangles on purpose: a car read
   from above is a box with a darker box on it, and pretending otherwise at
   this resolution just makes mud. Horizontal sheets face right, vertical
   sheets face down; the renderer flips for the other two headings.
   ========================================================================== */

function buildVehicles() {

  /* ---- horizontal (facing right) ---------------------------------------- */
  function carH(spec) {
    const L = spec.len, W = spec.wid || 13;
    const p = new Pix(L + 4, W + 3);
    const x0 = 2, y0 = 1;
    const { body, dark, light, accent } = spec;

    // ground shadow
    p.rect(x0, y0 + W - 1, L, 3, '0', .35);
    // chassis
    p.rect(x0, y0 + 1, L, W - 2, dark);
    p.rect(x0 + 1, y0, L - 2, W, body);
    p.rect(x0 + 1, y0 + 1, L - 2, 2, light, .6);
    p.rect(x0 + 1, y0 + W - 3, L - 2, 2, dark, .55);
    // nose taper
    p.set(x0 + 1, y0, dark); p.set(x0 + L - 2, y0, dark);
    p.set(x0 + 1, y0 + W - 1, dark); p.set(x0 + L - 2, y0 + W - 1, dark);

    // cabin
    const cx = x0 + ((spec.cabin === undefined ? 5 : spec.cabin));
    const cw = spec.cabinW || (L - 12);
    p.rect(cx, y0 + 2, cw, W - 4, '1');
    p.rect(cx + 1, y0 + 3, cw - 2, W - 6, spec.glass || '5');
    p.rect(cx + 1, y0 + 3, cw - 2, 1, spec.glass2 || '6', .8);
    // windscreen post
    p.vline(cx + cw - 3, y0 + 2, W - 4, '1', .8);

    // wheels
    if (!spec.noWheels) {
      p.rect(x0 + 2, y0, 4, 1, '0'); p.rect(x0 + L - 7, y0, 4, 1, '0');
      p.rect(x0 + 2, y0 + W - 1, 4, 1, '0'); p.rect(x0 + L - 7, y0 + W - 1, 4, 1, '0');
    }
    // roof detail
    if (spec.roofBar) { p.rect(cx + 1, y0 + 5, cw - 2, 3, spec.roofBar); p.rect(cx + 2, y0 + 6, 2, 1, 'e', .6); }
    if (spec.checker) for (let i = 0; i < L - 4; i += 4) { p.rect(x0 + 2 + i, y0 + W - 4, 2, 2, '1'); }
    if (spec.stripe) p.rect(x0 + 1, y0 + W - 5, L - 2, 1, accent, .85);
    return { p, x0, y0, L, W };
  }

  function lightsH(base, spec, on) {
    const { p, x0, y0, L, W } = base;
    if (!on) return p;
    const c = p;
    // headlights sweep forward
    c.rect(x0 + L - 2, y0 + 2, 2, 2, 'z');
    c.rect(x0 + L - 2, y0 + W - 4, 2, 2, 'z');
    for (let i = 1; i <= 5; i++) {
      c.rect(x0 + L + i, y0 + 2 - (i > 2 ? 1 : 0), 1, 2 + (i > 2 ? 2 : 0), 'y', .3 - i * .04);
      c.rect(x0 + L + i, y0 + W - 4 - (i > 2 ? 1 : 0), 1, 2 + (i > 2 ? 2 : 0), 'y', .3 - i * .04);
    }
    // tail lights
    c.rect(x0, y0 + 2, 1, 2, 'I'); c.rect(x0, y0 + W - 4, 1, 2, 'I');
    c.rect(x0 - 1, y0 + 2, 1, 2, 'H', .5); c.rect(x0 - 1, y0 + W - 4, 1, 2, 'H', .5);
    // underglow, the one cyberpunk indulgence allowed per vehicle
    if (spec.glow) c.rect(x0 + 2, y0 + W, L - 4, 1, spec.accent, .4);
    return c;
  }

  /* ---- vertical (facing down) ------------------------------------------- */
  function carV(spec) {
    const L = spec.len, W = spec.wid || 13;
    const p = new Pix(W + 3, L + 4);
    const x0 = 1, y0 = 2;
    const { body, dark, light, accent } = spec;
    p.rect(x0 + W - 1, y0, 3, L, '0', .3);
    p.rect(x0 + 1, y0, W - 2, L, dark);
    p.rect(x0, y0 + 1, W, L - 2, body);
    p.rect(x0 + 1, y0 + 1, 2, L - 2, light, .55);
    p.rect(x0 + W - 3, y0 + 1, 2, L - 2, dark, .55);
    const cy = y0 + (spec.cabin === undefined ? 5 : spec.cabin);
    const ch = spec.cabinW || (L - 12);
    p.rect(x0 + 2, cy, W - 4, ch, '1');
    p.rect(x0 + 3, cy + 1, W - 6, ch - 2, spec.glass || '5');
    p.hline(x0 + 3, cy + 1, W - 6, spec.glass2 || '6', .8);
    p.hline(x0 + 3, cy + ch - 3, W - 6, '1', .8);
    if (!spec.noWheels) {
      p.rect(x0, y0 + 2, 1, 4, '0'); p.rect(x0, y0 + L - 7, 1, 4, '0');
      p.rect(x0 + W - 1, y0 + 2, 1, 4, '0'); p.rect(x0 + W - 1, y0 + L - 7, 1, 4, '0');
    }
    if (spec.roofBar) { p.rect(x0 + 5, cy + 1, 3, ch - 2, spec.roofBar); }
    if (spec.stripe) p.vline(x0 + W - 5, y0 + 1, L - 2, accent, .85);
    return { p, x0, y0, L, W };
  }

  function lightsV(base, spec, on) {
    const { p, x0, y0, L, W } = base;
    if (!on) return p;
    p.rect(x0 + 2, y0 + L - 2, 2, 2, 'z');
    p.rect(x0 + W - 4, y0 + L - 2, 2, 2, 'z');
    for (let i = 1; i <= 5; i++) {
      p.rect(x0 + 2 - (i > 2 ? 1 : 0), y0 + L + i, 2 + (i > 2 ? 2 : 0), 1, 'y', .3 - i * .04);
      p.rect(x0 + W - 4 - (i > 2 ? 1 : 0), y0 + L + i, 2 + (i > 2 ? 2 : 0), 1, 'y', .3 - i * .04);
    }
    p.rect(x0 + 2, y0, 2, 1, 'I'); p.rect(x0 + W - 4, y0, 2, 1, 'I');
    if (spec.glow) p.vline(x0 + W, y0 + 2, L - 4, spec.accent, .4);
    return p;
  }

  const FLEET = {
    compact_car: { len: 26, wid: 13, body: '5', dark: '3', light: '6', accent: 'o', glass: '4', glow: true },
    taxi: { len: 28, wid: 13, body: 'w', dark: 'Q', light: 'x', accent: 'y', glass: '4', checker: true, roofBar: 'y', glow: true },
    delivery_van: { len: 34, wid: 14, body: '8', dark: '7', light: '9', accent: 'j', glass: '4', cabin: 4, cabinW: 8, glow: false },
    police: { len: 29, wid: 13, body: '2', dark: '1', light: '7', accent: 'n', glass: '4', stripe: true, roofBar: 'n', glow: true },
    utility: { len: 30, wid: 14, body: 'i', dark: '1', light: 'i', accent: 'k', glass: '4', stripe: true, glow: true },
  };

  for (const key in FLEET) {
    const spec = FLEET[key];
    bakeStrip('vehicle_' + key + '_right', [
      lightsH(carH(spec), spec, false),
      lightsH(carH(spec), spec, true),
    ], { ox: 2, oy: ((spec.wid || 13) + 3) >> 1, tag: 'vehicle' });
    bakeStrip('vehicle_' + key + '_down', [
      lightsV(carV(spec), spec, false),
      lightsV(carV(spec), spec, true),
    ], { ox: ((spec.wid || 13) + 3) >> 1, oy: 2, tag: 'vehicle' });
  }

  /* ---- motorcycle ------------------------------------------------------- */
  const motoH = (on) => {
    const p = new Pix(20, 11);
    p.rect(2, 8, 14, 2, '0', .35);
    p.rect(2, 3, 3, 4, '1'); p.rect(14, 3, 3, 4, '1');       // wheels
    p.rect(5, 4, 10, 3, '7');
    p.rect(6, 3, 7, 4, 'r');
    p.rect(6, 3, 7, 1, 's', .7);
    p.rect(11, 2, 3, 6, '1');                                  // rider seat block
    p.rect(9, 1, 3, 8, '4');                                   // rider
    p.rect(9, 3, 3, 3, 'f');
    p.set(10, 2, 'C');
    if (on) { p.rect(17, 4, 2, 2, 'z'); p.rect(19, 4, 1, 2, 'y', .4); p.rect(1, 4, 1, 2, 'I'); p.rect(4, 8, 11, 1, 's', .45); }
    return p;
  };
  bakeStrip('vehicle_motorcycle_right', [motoH(false), motoH(true)], { ox: 2, oy: 5, tag: 'vehicle' });

  const motoV = (on) => {
    const p = new Pix(11, 20);
    p.rect(8, 2, 2, 14, '0', .3);
    p.rect(3, 2, 4, 3, '1'); p.rect(3, 14, 4, 3, '1');
    p.rect(4, 5, 3, 10, '7');
    p.rect(3, 6, 4, 7, 'r');
    p.vline(3, 6, 7, 's', .7);
    p.rect(2, 9, 6, 3, '4');
    p.rect(3, 10, 4, 3, 'f');
    p.set(4, 9, 'C');
    if (on) { p.rect(4, 17, 2, 2, 'z'); p.rect(4, 19, 2, 1, 'y', .4); p.rect(4, 1, 2, 1, 'I'); }
    return p;
  };
  bakeStrip('vehicle_motorcycle_down', [motoV(false), motoV(true)], { ox: 5, oy: 2, tag: 'vehicle' });
}

/* ===== 07_world.js ===== */
/* ==========================================================================
   DISTRICT GENERATOR
   A district is assembled from road rectangles, block rectangles and a
   building packer. Nothing decorative is ever allowed to become a collider,
   and the result is flood-filled at build time to prove every point of
   interest can still be reached on foot.
   ========================================================================== */

const MW = 120, MH = 84;                     // tiles
const PW = MW * TILE, PH = MH * TILE;        // 1920 x 1344 px

const G = {
  SIDEWALK: 0, ROAD: 1, ROADWET: 2, CROSS: 3, PLAZA: 4, ALLEY: 5,
  GRASS: 6, PATH: 7, QUAY: 8, WATER: 9, BUILDING: 10, TRACKS: 11, UNDER: 12, STAIRS: 13, RAMP: 14,
};
const WALKABLE = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 11: 1, 12: 1, 13: 1, 14: 1 };

const D_NONE = 0, D_MANHOLE = 1, D_DRAIN = 2, D_PUDDLE = 3, D_GRIME = 4, D_DASH_H = 5, D_DASH_V = 6, D_CRACK = 7;

/* Each district is the same city grammar read with a different accent and a
   different mix of tenants, so switching chapters actually changes the place
   instead of just recolouring a HUD. */
const DISTRICT_ART = {
  streets: {
    poi: [['tech', 'Tech row'], ['bar', 'Neon bar'], ['cafe', 'Café corner'], ['workshop', 'Workshop lane'], ['konbini', '24H konbini']],
    seed: 1207, accent: 'k', accent2: 's', lamp: 'y',
    mix: ['apartment', 'apartment', 'shop', 'konbini', 'cafe', 'tech', 'bar', 'workshop'],
    park: true, canal: true, industrial: true, rain: 1, litWindows: .28,
    signs: ['neon_kanji', 'neon_bar', 'neon_arrow', 'neon_stripe'],
  },
  corporation: {
    poi: [['office', 'Corporate tower'], ['tech', 'Research annex'], ['cafe', 'Atrium café']],
    seed: 3313, accent: 'q', accent2: 'o', lamp: 'o',
    mix: ['office', 'office', 'office', 'tech', 'cafe', 'apartment'],
    park: false, canal: true, industrial: false, rain: .6, litWindows: .52,
    signs: ['neon_stripe', 'neon_bars', 'neon_circle'],
  },
  soc: {
    poi: [['tech', 'Operations centre'], ['office', 'Analyst offices'], ['warehouse', 'Evidence depot']],
    seed: 5051, accent: 'o', accent2: 'k', lamp: 'o',
    mix: ['office', 'tech', 'tech', 'industrial', 'warehouse', 'workshop'],
    park: false, canal: false, industrial: true, rain: .8, litWindows: .4,
    signs: ['neon_stripe', 'neon_arrow', 'neon_diamond'],
  },
  mind: {
    poi: [['bar', 'Confessional bar'], ['cafe', 'Whisper café'], ['shop', 'Rumour market']],
    seed: 7717, accent: 'y', accent2: 't', lamp: 'y',
    mix: ['cafe', 'bar', 'apartment', 'shop', 'konbini', 'apartment'],
    park: true, canal: true, industrial: false, rain: .45, litWindows: .6,
    signs: ['neon_circle', 'neon_bar', 'neon_kanji'],
  },
  undercity: {
    poi: [['bar', 'Back-room bar'], ['workshop', 'Chop shop'], ['warehouse', 'Cold storage']],
    seed: 9109, accent: 's', accent2: 'v', lamp: 'x',
    mix: ['industrial', 'warehouse', 'workshop', 'bar', 'industrial', 'warehouse'],
    park: false, canal: true, industrial: true, rain: 1.3, litWindows: .14,
    signs: ['neon_bar', 'neon_diamond', 'neon_bars'],
  },
  void: {
    poi: [['office', 'Empty offices'], ['tech', 'Dead terminal']],
    seed: 11113, accent: 'e', accent2: 'q', lamp: 'd',
    mix: ['office', 'apartment', 'tech', 'office'],
    park: false, canal: false, industrial: false, rain: .25, litWindows: .06,
    signs: ['neon_stripe'],
  },
};

// Assign 50 reference storefronts without nearby duplicates. Named venues keep
// a thematically appropriate exterior; the other IDs are each used once before
// another facade is reused, and reuse is placed as far away as possible.
const VENUE_FACADES={
  '52,40':38, // MARA / WORKSHOP
  '64,37':4,  // MIDNIGHT RAMEN / diner
  '73,37':41,// apartments
  '41,37':21,// data office / radio building
  '65,47':29,// NEON THREAD / clothing
  '53,34':14,'39,44':43,'53,48':23,'73,46':22,
};
function assignFacadeArt(W){
 const used=new Set(),prior=[];
 for(const b of W.buildings){
   const id=VENUE_FACADES[`${b.x},${b.y}`];
   if(W.id==='streets'&&id){b.facadeId=id;used.add(id);prior.push(b);}
 }
 const unused=Array.from({length:50},(_,i)=>i+1).filter(i=>!used.has(i));
 // An order based on geographic tiles distributes eye-catching storefronts.
 const remaining=W.buildings.filter(b=>!b.facadeId).sort((a,b)=>a.y-b.y||a.x-b.x);
 for(const b of remaining){
   if(unused.length){
     const n=(b.x*37+b.y*19+b.seed)>>>0;
     const i=n%unused.length;
     b.facadeId=unused.splice(i,1)[0];
   }else{
     // If the district contains more than 50 buildings, the repeated facade
     // must be far from its previous copy, not in the next shop window.
     let best=1,bestScore=-Infinity;
     for(let id=1;id<=50;id++){
       const copies=prior.filter(p=>p.facadeId===id);
       const score=copies.length?Math.min(...copies.map(p=>Math.hypot((b.x-p.x)*1.3,b.y-p.y))):1000;
       const jitter=hash2(b.x,b.y,id)*.1;
       if(score+jitter>bestScore){best=id;bestScore=score+jitter;}
     }
     b.facadeId=best;
   }
   prior.push(b);
 }
}

function makeWorld(districtId) {
  if(typeof Minipixel!=="undefined")return Minipixel.get().world(districtId);
  const cfg = DISTRICT_ART[districtId] || DISTRICT_ART.streets;
  const rnd = mulberry(cfg.seed);
  const W = {
    cfg, id: districtId, w: MW, h: MH,
    ground: new Uint8Array(MW * MH),
    solid: new Uint8Array(MW * MH),
    vary: new Uint8Array(MW * MH),
    decal: new Uint8Array(MW * MH),
    buildings: [], props: [], lights: [], pois: [], signs: [],
    lanes: [], spawn: { x: 58 * TILE, y: 40 * TILE },
  };
  const idx = (x, y) => y * MW + x;
  const set = (x, y, g) => { if (x >= 0 && y >= 0 && x < MW && y < MH) W.ground[idx(x, y)] = g; };
  const fill = (x, y, w, h, g) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, g); };
  const get = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? G.BUILDING : W.ground[idx(x, y)];

  /* ---- 1. pavement everywhere, then cut the streets into it -------------- */
  fill(0, 0, MW, MH, G.SIDEWALK);
  for (let i = 0; i < MW * MH; i++) W.vary[i] = (rnd() * 3) | 0;

  const roads = [
    { x: 0, y: 16, w: MW, h: 5, dir: 'h' },     // north avenue
    { x: 0, y: 58, w: MW, h: 5, dir: 'h' },     // south avenue
    { x: 7, y: 0, w: 5, h: 76, dir: 'v' },
    { x: 30, y: 0, w: 5, h: 76, dir: 'v' },
    { x: 88, y: 0, w: 5, h: 76, dir: 'v' },
    { x: 110, y: 0, w: 5, h: 76, dir: 'v' },
    { x: 56, y: 0, w: 6, h: 35, dir: 'v' },     // central axis into the plaza
    { x: 56, y: 51, w: 6, h: 8, dir: 'v' },     // plaza south exit
    { x: 33, y: 41, w: 6, h: 6, dir: 'h' },     // plaza west exit
    { x: 81, y: 41, w: 8, h: 6, dir: 'h' },     // plaza east exit
  ];
  roads.forEach(r => { fill(r.x, r.y, r.w, r.h, G.ROAD); W.lanes.push(r); });

  /* lane markings down the middle of the two avenues and the long streets */
  const mark = (r) => {
    if (r.dir === 'h' && r.h >= 5) {
      const my = r.y + ((r.h / 2) | 0);
      for (let x = r.x; x < r.x + r.w; x += 2) if (get(x, my) === G.ROAD) W.decal[idx(x, my)] = D_DASH_H;
    } else if (r.dir === 'v' && r.w >= 5 && r.h > 20) {
      const mx = r.x + ((r.w / 2) | 0);
      for (let y = r.y; y < r.y + r.h; y += 2) if (get(mx, y) === G.ROAD) W.decal[idx(mx, y)] = D_DASH_V;
    }
  };
  roads.forEach(mark);

  /* ---- 2. landmarks ------------------------------------------------------ */
  fill(38, 34, 44, 18, G.PLAZA);                       // central plaza
  for (let y = 37; y < 50; y += 4) for (let x = 42; x < 78; x += 6) W.vary[idx(x, y)] = 3;

  if (cfg.park) { fill(14, 0, 15, 15, G.GRASS); fill(20, 0, 3, 15, G.PATH); fill(14, 7, 15, 3, G.PATH); }
  if (cfg.canal) {
    fill(0, 70, MW, 6, G.QUAY);
    fill(0, 76, MW, 8, G.WATER);
    for (let x = 0; x < MW; x++) for (let y = 76; y < MH; y++) W.solid[idx(x, y)] = 1;
  } else {
    fill(0, 70, MW, 14, G.SIDEWALK);
  }
  if (cfg.industrial) { fill(36, 66, 44, 2, G.TRACKS); }

  /* ---- 3. crossings wherever a street meets an avenue -------------------- */
  const crossAt = (x, y, w, h, vert) => {
    // Derive the crossing span from the actual carriageway, including six-tile roads.
    const isRoad=(xx,yy)=>[G.ROAD,G.ROADWET,G.CROSS].includes(get(xx,yy));
    const paint=(xx,yy)=>{if(isRoad(xx,yy)){set(xx,yy,G.CROSS);W.decal[idx(xx,yy)]=D_NONE;W.vary[idx(xx,yy)]=vert?1:0;}};
    for(let line=0;line<(vert?h:w);line++){
      const fixed=(vert?y:x)+line,initial=vert?x:y,length=vert?w:h;
      let lo=initial,hi=initial+length-1;
      const roadAt=n=>vert?isRoad(n,fixed):isRoad(fixed,n);
      while(lo>0&&roadAt(lo-1))lo--;
      while(hi<(vert?MW:MH)-1&&roadAt(hi+1))hi++;
      // Do not turn the entire length of an intersecting avenue into a crossing.
      if(hi-lo>14){lo=initial;hi=initial+length-1;}
      for(let n=lo;n<=hi;n++)vert?paint(n,fixed):paint(fixed,n);
    }
  };
  [7, 30, 56, 88, 110].forEach(vx => { crossAt(vx, 14, 5, 2, true); crossAt(vx, 21, 5, 2, true); crossAt(vx, 56, 5, 2, true); crossAt(vx, 63, 5, 2, true); });
  [16, 58].forEach(hy => { crossAt(5, hy, 2, 5, false); crossAt(35, hy, 2, 5, false); crossAt(93, hy, 2, 5, false); });

  /* ---- 4. blocks -> buildings ------------------------------------------- */
  /* A block is packed with modular footprints that always leave a two-tile
     pavement collar plus alleys, so the street network can never be sealed. */
  function packBlock(bx, by, bw, bh, opts) {
    opts = opts || {};
    let inX = bx + 1, inY = by + 1, inW = bw - 2, inH = bh - 2;
    if (inW < 4 || inH < 4) return;
    // Split long strips into compact aligned shop rows. The previous random
    // branch produced 35-tile-high, 5-tile-wide stretched facades and empty lots.
    // A one-tile lane stays walkable all the way across the block.
    if(inH>12){
      const cut=by+1+Math.min(10,Math.max(7,Math.floor(inH/2)));
      fill(bx,cut,bw,1,G.ALLEY);
      packBlock(bx,by,bw,cut-by+1,opts);
      packBlock(bx,cut,bw,by+bh-cut,opts);
      return;
    }
    const cols = [];
    let x = inX;
    while (x < inX + inW) {
      const remain = inX + inW - x;
      if (remain < 4) break;
      let cw = 5 + ((rnd() * 5) | 0);
      if (remain - cw < 5) cw = remain;
      cols.push({ x, w: cw });
      x += cw;
      if (x < inX + inW - 6 && rnd() < .13) { fill(x, by, 1, bh, G.ALLEY); x += 1; }  // narrower service path
    }
    cols.forEach(c => addBuilding(c.x, inY, c.w, inH, opts));
  }

  function addBuilding(x, y, w, h, opts) {
    if (w < 4 || h < 4) return;
    const type = opts.types[(rnd() * opts.types.length) | 0];
    const b = {
      x, y, w, h, type, seed: (rnd() * 1e6) | 0,
      roofFam: BUILD_TYPES[type].roof,
      lit: [], gear: [], sign: null, door: null,
    };
    const r = mulberry(b.seed);
    // ground floor layout: one door, the rest shutters / sign bands / windows
    r(); // retain deterministic random stream for existing city layouts
    const doorAt = Math.floor(w/2);
    b.door = { x: x + doorAt, y: y + h - 1 };
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < 2; j++) {
        const fy = y + h - 1 - j;
        if (j === 0 && i === doorAt) continue;
        if (r() < cfg.litWindows) b.lit.push({ x: x + i, y: fy, alt: r() < .3 });
      }
    }
    // upper floors
    for (let j = 2; j < h - 1; j++) for (let i = 0; i < w; i++) {
      if (r() < cfg.litWindows * .8) b.lit.push({ x: x + i, y: y + h - 1 - j, alt: r() < .3, roof: true });
    }
    // Rooftop kit. Each piece takes its own tile so units never stack on top of
    // one another, and only interior tiles are used so nothing sits on the
    // parapet. The count scales with roof area: a big flat roof with one vent
    // on it reads as an empty rectangle, not a building.
    const gearPool = ['roof_ac', 'roof_tank', 'roof_vent', 'roof_skylight', 'roof_pipes', 'roof_antenna', 'roof_ac', 'roof_vent'];
    const count = Math.max(1, Math.min(9, Math.round((w * h) / 14)));
    const taken = new Set();
    for (let i = 0; i < count; i++) {
      const gx = x + 1 + ((r() * Math.max(1, w - 2)) | 0);
      const gy = y + 1 + ((r() * Math.max(1, h - 3)) | 0);
      const key = gx + ':' + gy;
      if (taken.has(key)) continue;
      taken.add(key);
      b.gear.push({ k: gearPool[(r() * gearPool.length) | 0], x: gx, y: gy });
    }
    // signage: only some buildings get one, and only on a street-facing wall
    if (type !== 'apartment' && r() < .34 && h >= 6) {
      const kind = cfg.signs[(r() * cfg.signs.length) | 0];
      const sx = x * TILE + ((w * TILE) >> 1);
      const sy = (y + h - 2) * TILE - 4;
      b.sign = { kind, x: sx, y: sy, phase: r() * 10, blink: r() < .35 };
      W.signs.push(b.sign);
      W.lights.push({ x: sx, y: sy + 6, r: 26, c: kind === 'neon_bar' ? cfg.accent2 : cfg.accent, a: .85, kind: 'neon', phase: b.sign.phase, blink: b.sign.blink });
    }
    fill(x, y, w, h, G.BUILDING);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) W.solid[idx(x + i, y + j)] = 1;
    // lit windows on the ground floor spill onto the pavement
    b.lit.forEach(l => { if (!l.roof && rnd() < .5) W.lights.push({ x: l.x * TILE + 8, y: l.y * TILE + 18, r: 17, c: cfg.lamp, a: .5, kind: 'window' }); });
    W.buildings.push(b);
    return b;
  }

  const mix = cfg.mix;
  const blocks = [
    [0, 0, 7, 16], [12, 0, 18, 16], [35, 0, 21, 16], [62, 0, 26, 16], [93, 0, 17, 16], [115, 0, 5, 16],
    [0, 21, 7, 37], [12, 21, 18, 37], [35, 21, 21, 13], [62, 21, 26, 13], [93, 21, 17, 37], [115, 21, 5, 37],
    [35, 52, 21, 6], [62, 52, 26, 6],
    [0, 63, 7, 7], [12, 63, 18, 7], [35, 63, 21, 7], [62, 63, 26, 7], [93, 63, 17, 7], [115, 63, 5, 7],
  ];
  blocks.forEach(([bx, by, bw, bh]) => {
    if (cfg.park && bx === 12 && by === 0) return;               // the park owns this block
    const industrialBand = by >= 63;
    const types = industrialBand && cfg.industrial ? ['warehouse', 'industrial', 'workshop'] : mix;
    packBlock(bx, by, bw, bh, { types });
  });

  // Authored market square: small businesses make the first chapter a place.
  if (districtId === 'streets') {
    addBuilding(52, 40, 6, 6, {types:['workshop']});
    addBuilding(64, 37, 7, 6, {types:['cafe']});
    addBuilding(73, 37, 6, 5, {types:['apartment']});
    addBuilding(41, 37, 6, 5, {types:['tech']});
    addBuilding(65, 47, 6, 4, {types:['konbini']});
    // SIGNAL LOST: split the empty plaza into walkable market lanes.
    addBuilding(53, 34, 5, 4, {types:['apartment']});
    addBuilding(39, 44, 4, 6, {types:['warehouse']});
    addBuilding(53, 48, 4, 4, {types:['shop']});
    addBuilding(73, 46, 4, 4, {types:['office']});
    // Fill two formerly oversized tree clearings with small attached storefronts.
    // Do not move or obstruct the fixed mission tiles (48,44) and (46,49).
    addBuilding(47, 34, 5, 6, {types:['cafe']});
    addBuilding(48, 47, 4, 4, {types:['apartment']});
    // Connected market crossroads; retain all collision footprints and quest coordinates.
    for(let y=34;y<52;y++)for(let x=38;x<82;x++)if(get(x,y)!==G.BUILDING&&((x>=59&&x<=62)||(y>=43&&y<=45))){set(x,y,G.ROAD);W.decal[idx(x,y)]=(x===60&&y%3===0)?D_DASH_V:(y===44&&x%3===0)?D_DASH_H:D_NONE;}
    crossAt(59,46,4,2,true);crossAt(59,39,4,2,true);crossAt(57,43,2,3,false);crossAt(63,43,2,3,false);
    W.parks=[{x:47,y:34,w:5,h:7},{x:44,y:46,w:8,h:6},{x:78,y:46,w:4,h:6}];
    for(const park of W.parks)for(let y=park.y;y<park.y+park.h;y++)for(let x=park.x;x<park.x+park.w;x++)if(get(x,y)!==G.BUILDING){const path=x===park.x+Math.floor(park.w/2)||y===park.y+Math.floor(park.h/2);set(x,y,path?G.PATH:G.GRASS);W.decal[idx(x,y)]=D_NONE;}

  }

  if(districtId!=='streets'){
    // A central civic axis joins two perimeter streets; side blocks retain alleys.
    addBuilding(53,34,14,10,{types:[districtId==='mind'?'cafe':districtId==='soc'?'tech':'office']});
    addBuilding(40,37,8,7,{types:['apartment']});addBuilding(73,37,8,7,{types:['office']});
    addBuilding(41,48,9,4,{types:['shop']});addBuilding(71,48,9,4,{types:['workshop']});
    fill(58,44,6,8,G.ROAD);fill(38,45,44,3,G.ROAD);crossAt(58,48,6,2,true);
    W.spawn={x:60*TILE+8,y:50*TILE+13};
    W.parks=districtId==='mind'?[{x:48,y:35,w:5,h:9},{x:67,y:35,w:6,h:9}]:[{x:48,y:39,w:5,h:5}];
    for(const p of W.parks)for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++)if(get(x,y)!==G.BUILDING)set(x,y,x===p.x+2?G.PATH:G.GRASS);
  }
  /* ---- 4b. features the block packer must never be allowed to bury -------- */
  /* Streets step down to the canal quay: stairs in the middle, ramps at the
     edges so the level change is walkable however you approach it. */
  if (cfg.canal) {
    roads.filter(r => r.dir === 'v' && r.y + r.h >= 70).forEach(r => {
      for (let i = 0; i < r.w; i++) set(r.x + i, 70, (i === 0 || i === r.w - 1) ? G.RAMP : G.STAIRS);
    });
  }

  /* The underground entrance is set into the promenade as one 2x2 module. It
     used to be laid down before the packer ran, and the first building to
     land on it deleted it. */
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) set(25 + i, 71 + j, G.UNDER);
  W.hatch = { x: 26 * TILE, y: 72 * TILE - 2 };
  W.lights.push({ x: 26 * TILE, y: 71 * TILE + 10, r: 30, c: 'k', a: .9, kind: 'neon', phase: 0 });

  /* Parked vehicles are the "large object" obstacles the brief calls for.
     They take the kerb lane of the two avenues only, never a junction or a
     crossing, and each blocks nothing but the tiles it actually sits on. */
  const PARKABLE = ['compact_car', 'taxi', 'delivery_van', 'police', 'utility', 'motorcycle', 'car_b', 'car_c', 'car_d', 'car_e', 'car_f', 'taxi_b', 'van_b', 'van_c', 'moto_b', 'moto_c'].filter(k => S('vehicle_' + k + '_right'));
  const vRoads = roads.filter(r => r.dir === 'v').concat([{ x: 56, y: 58, w: 6, h: 12 }]);
  const inJunction = (x, y) => vRoads.some(r => y >= r.y - 1 && y < r.y + r.h + 1 && x >= r.x - 2 && x < r.x + r.w + 2);
  [[16, 1], [20, -1], [58, 1], [62, -1]].forEach(([ry, face]) => {
    for (let x = 3; x < MW - 6; x++) {
      if (rnd() > .085) continue;
      const kind = PARKABLE[(rnd() * PARKABLE.length) | 0];
      const spr = S('vehicle_' + kind + '_right');
      if (!spr) continue;
      const span = Math.ceil(spr.fw / TILE);
      let ok = true;
      for (let i = -1; i <= span && ok; i++) {
        if (get(x + i, ry) !== G.ROAD || W.solid[idx(x + i, ry)] || inJunction(x + i, ry)) ok = false;
      }
      if (!ok) continue;
      for (let i = 0; i < span; i++) W.solid[idx(x + i, ry)] = 1;
      const left = x * TILE + ((span * TILE - spr.fw) >> 1);
      W.props.push({
        kind: 'vehicle_' + kind + '_right', parked: true, flip: face < 0, phase: 0, anim: 0, ty: ry,
        x: face < 0 ? left + spr.fw - spr.ox - 1 : left + spr.ox, y: ry * TILE + 8,
      });
      x += span + 2;
    }
  });

  /* Cables sag across the narrow service alleys. They are overhead, so the
     renderer draws them above the player. */
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 4; x++) {
    if (get(x, y) === G.ALLEY && get(x + 1, y) === G.ALLEY && get(x - 1, y) === G.BUILDING && get(x + 2, y) === G.BUILDING && rnd() < .16) {
      W.props.push({ kind: 'prop_cable_span', x: (x + 1) * TILE, y: y * TILE + 10, phase: 0, anim: 0, ty: y, over: true });
    }
  }

  /* ---- 5. surface detail ------------------------------------------------- */
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const g = W.ground[idx(x, y)];
    if (W.decal[idx(x, y)]) continue;
    const r = rnd();
    if (g === G.ROAD || g === G.CROSS) {
      if (r < .012) W.decal[idx(x, y)] = D_MANHOLE;
      else if (r < .05) W.decal[idx(x, y)] = D_PUDDLE;
    } else if (g === G.SIDEWALK) {
      if (r < .02) W.decal[idx(x, y)] = D_DRAIN;
      else if (r < .05) W.decal[idx(x, y)] = D_CRACK;
      else if (r < .07) W.decal[idx(x, y)] = D_PUDDLE;
    } else if (g === G.ALLEY) {
      if (r < .18) W.decal[idx(x, y)] = D_GRIME;
      else if (r < .28) W.decal[idx(x, y)] = D_PUDDLE;
    } else if (g === G.PLAZA) {
      // the biggest open space in the district should also be the wettest
      if (r < .04) W.decal[idx(x, y)] = D_PUDDLE;
      else if (r < .055) W.decal[idx(x, y)] = D_DRAIN;
      else if (r < .09) W.decal[idx(x, y)] = D_CRACK;
    }
  }

  /* ---- 6. props, placed against kerbs and walls only -------------------- */
  const freeForProp = (x, y) => {
    const g = get(x, y);
    if (g !== G.SIDEWALK && g !== G.PLAZA && g !== G.GRASS && g !== G.QUAY && g !== G.ALLEY) return false;
    if (W.solid[idx(x, y)]) return false;
    return true;
  };
  /* A prop is allowed to become a collider only where there is room to walk
     around it. Counting free neighbours is a cheap way to keep street
     furniture from quietly bricking up an alley. */
  const roomAround = (x, y) => {
    let free = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      if (!W.solid[idx(nx, ny)] && WALKABLE[W.ground[idx(nx, ny)]]) free++;
    }
    return free;
  };
  const addProp = (kind, x, y, opt) => {
    // Freestanding signal-like poles are removed from the city entirely.
    // Reject before creating either their sprite, collision or attached light.
    if(['prop_lamp','prop_pole','prop_sign_post'].includes(kind))return;
    opt = opt || {};
    if (!freeForProp(x, y)) return;
    if(['prop_lamp','prop_pole','prop_sign_post','prop_bollard','prop_barrier','prop_cone'].includes(kind)){
      // A tall sprite extends north of its feet. Keep its visible head off the road too.
      for(let yy=y-1;yy<=y;yy++)for(let xx=x-1;xx<=x+1;xx++)if([G.ROAD,G.ROADWET,G.CROSS].includes(get(xx,yy)))return;
      // Leave the sidewalk approaches to each zebra completely clear.
      for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)if(get(xx,yy)===G.CROSS)return;
      if(kind==='prop_lamp'&&W.props.some(p=>p.kind==='prop_lamp'&&Math.hypot(p.x-(x*16+8),p.y-(y*16+15))<96))return;
    }
    if (opt.solid && roomAround(x, y) < 5) opt = Object.assign({}, opt, { solid: false });
    W.props.push({ kind, x: x * TILE + 8, y: y * TILE + 15, phase: rnd() * 10, anim: opt.anim || 0, ty: y });
    if (opt.solid) W.solid[idx(x, y)] = 1;
    if (opt.light) W.lights.push({ x: x * TILE + 8, y: y * TILE + 2, r: opt.light.r, c: opt.light.c, a: opt.light.a, kind: opt.light.kind || 'lamp', phase: rnd() * 10 });
  };

  /* Street lighting is derived from the map rather than hand-listed, so any
     street the generator invents gets lit automatically and no corner of the
     district can end up an unreadable black hole. */
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const g = get(x, y);
    if (g !== G.SIDEWALK && g !== G.QUAY) continue;
    if (W.solid[idx(x, y)]) continue;
    const touchesRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const n = get(x + dx, y + dy);
      return n === G.ROAD || n === G.CROSS;
    });
    if (!touchesRoad) continue;
    if ((x * 2 + y * 3) % 13 !== 0) continue;
    addProp('prop_lamp', x, y, { anim: 1, light: { r: 30, c: cfg.lamp, a: .95, kind: 'lamp' } });
  }
  // open ground away from the kerb still needs lighting: promenade, park paths
  // and the square are places people walk, not places people drive.
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const g = get(x, y);
    if (g !== G.QUAY && g !== G.PATH && g !== G.GRASS) continue;
    if (W.solid[idx(x, y)]) continue;
    if ((x * 3 + y * 5) % 23 !== 0) continue;
    addProp('prop_lamp', x, y, { anim: 1, light: { r: 30, c: cfg.lamp, a: .9, kind: 'lamp' } });
  }
  // The plaza stays open; lighting belongs to its perimeter, not a grid of poles.

  // plaza furniture
  for (let i = 0; i < 6; i++) { addProp('prop_bench', 42 + i * 6, 36, {}); addProp('prop_bench', 42 + i * 6, 49, {}); }
  for (let i = 0; i < 5; i++) addProp('prop_planter', 44 + i * 8, 44, { solid: true });
  addProp('prop_hologram', 59, 43, { anim: 1, light: { r: 24, c: cfg.accent, a: .7, kind: 'neon' } });
  addProp('prop_ad_screen', 45, 36, { anim: 1, light: { r: 20, c: cfg.accent2, a: .7, kind: 'neon' } });
  addProp('prop_ad_screen', 74, 49, { anim: 1, light: { r: 20, c: cfg.accent, a: .7, kind: 'neon' } });

  for(const p of W.parks||[]){
    for(const [dx,dy]of [[1,1],[p.w-2,1],[1,p.h-2],[p.w-2,p.h-2]])if(get(p.x+dx,p.y+dy)===G.GRASS)addProp('prop_tree',p.x+dx,p.y+dy,{solid:true,anim:1});
    addProp('prop_bench',p.x,p.y+Math.floor(p.h/2)-1,{});
  }
  // park planting
  if (cfg.park) {
    for (let y = 1; y < 14; y += 3) for (let x = 15; x < 29; x += 3) {
      if (get(x, y) !== G.GRASS) continue;
      const r = rnd();
      if (r < .34) addProp('prop_tree', x, y, { anim: 1, solid: true });
      else if (r < .5) addProp('prop_tree_slim', x, y, { anim: 1, solid: true });
      else if (r < .68) addProp('prop_bush', x, y, {});
    }
    addProp('prop_bench', 18, 11, {}); addProp('prop_bench', 24, 11, {});

    // Boundary fence. It is solid, but it is only ever built with gaps: three
    // tiles wide where the east-west path leaves the park, and a one-tile
    // gateway between two gate posts on the south side.
    const fence = (x, y, kind) => {
      W.props.push({ kind: kind || 'prop_fence', x: x * TILE + 8, y: y * TILE + 15, phase: 0, anim: 0, ty: y });
      W.solid[idx(x, y)] = 1;
    };
    for (let y = 0; y < 15; y++) { if (y >= 7 && y <= 9) continue; fence(14, y); fence(28, y); }
    for (let x = 15; x <= 27; x++) { if (x >= 20 && x <= 22) continue; fence(x, 14); }
    fence(20, 14, 'prop_gate'); fence(22, 14, 'prop_gate');
    [[19, 15], [23, 15]].forEach(([x, y]) => addProp('prop_bollard', x, y, { light: { r: 14, c: 'k', a: .5, kind: 'neon' } }));
  }

  // marker posts around the underground entrance
  [[24, 71], [27, 71], [24, 72], [27, 72]].forEach(([x, y]) => addProp('prop_bollard', x, y, {}));

  // waterfront railing so nobody strolls into the canal by accident
  if (cfg.canal) {
    for (let x = 0; x < MW; x += 1) { W.props.push({ kind: 'prop_rail', x: x * TILE + 8, y: 75 * TILE + 15, phase: 0, anim: 0, ty: 75 }); W.solid[idx(x, 75)] = 1; }
    for (let x = 3; x < MW; x += 11) addProp('prop_lamp', x, 71, { anim: 1, light: { r: 28, c: cfg.lamp, a: .9, kind: 'lamp' } });
    for (let x = 8; x < MW; x += 17) addProp('prop_crate', x, 73, { solid: true });
  }

  // grubby street layer: one pass over every pavement tile that touches a wall
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    if (!freeForProp(x, y)) continue;
    const wall = W.solid[idx(x, y - 1)] && get(x, y - 1) === G.BUILDING;
    const g = get(x, y);
    const r = rnd();
    if (wall) {
      if (r < .05) addProp('prop_dumpster', x, y, { solid: true });
      else if (r < .09) addProp('prop_vending_machine', x, y, { anim: 1, solid: true, light: { r: 18, c: cfg.accent2, a: .7, kind: 'neon' } });
      else if (r < .12) addProp('prop_vending_machine_food', x, y, { anim: 1, solid: true, light: { r: 18, c: 'v', a: .65, kind: 'neon' } });
      else if (r < .15) addProp('prop_trash', x, y, {});
      else if (r < .175) addProp('prop_elecbox', x, y, { solid: true });
      else if (r < .19) addProp('prop_camera', x, y, {});
      else if (r < .205) addProp('prop_poster', x, y, {});
      else if (r < .225) addProp('fx_steam', x, y, { anim: 1 });
      else if (r < .24) addProp('prop_payphone', x, y, {});
      else if (r < .25) addProp('prop_newsbox', x, y, {});
    } else if (g === G.ALLEY) {
      if (r < .12) addProp('prop_crate', x, y, {});
      else if (r < .2) addProp('prop_box', x, y, {});
      else if (r < .25) addProp('prop_pallet', x, y, {});
    } else if (g === G.SIDEWALK) {
      if (r < .012) addProp('prop_hydrant', x, y, {});
      // No randomly scattered posts, barriers or cones on pedestrian routes.
    }
  }

  /* ---- 7. points of interest -------------------------------------------- */
  W.pois = [
    { id: 'plaza', name: 'Central plaza', x: 59, y: 43, r: 11 },
    { id: 'hatch', name: 'Underground entrance', x: 26, y: 70, r: 6 },
  ];
  if (cfg.park) W.pois.push({ id: 'park', name: 'Riverside park', x: 21, y: 7, r: 9 });
  if (cfg.canal) W.pois.push({ id: 'canal', name: 'Canal promenade', x: 60, y: 73, r: 8 });
  if (cfg.industrial) W.pois.push({ id: 'yard', name: 'Industrial yard', x: 58, y: 66, r: 6 });

  /* The rest take their name from the building that is actually there. A
     "tech row" that contains no tech shop would be a lie the player can see,
     so each label picks the matching building furthest from every landmark
     chosen so far, which also spreads them across the district. */
  const spread = (type) => {
    let best = null, bs = -1;
    W.buildings.forEach(b => {
      if (b.type !== type) return;
      const bx = b.door.x, by = b.door.y + 1;
      let m = 1e9;
      W.pois.forEach(p => { m = Math.min(m, Math.hypot(p.x - bx, p.y - by)); });
      if (m > bs) { bs = m; best = b; }
    });
    return best;
  };
  (cfg.poi || []).forEach(([type, label]) => {
    const b = spread(type);
    if (b) W.pois.push({ id: 'poi_' + type, name: label, x: b.door.x, y: b.door.y + 1, r: 6 });
  });
  // A landmark the packer happened to build over is no landmark, so every one
  // of them is pulled back out onto the nearest tile you can actually stand on.
  W.pois.forEach(p => { const o = findOpen(W, p.x, p.y); p.x = (o.x / TILE) | 0; p.y = (o.y / TILE) | 0; });

  /* ---- 8. traffic lanes -------------------------------------------------- */
  W.traffic = [
    { y: 17.5 * TILE, dir: 1, axis: 'h' }, { y: 19.5 * TILE, dir: -1, axis: 'h' },
    { y: 59.5 * TILE, dir: 1, axis: 'h' }, { y: 61.5 * TILE, dir: -1, axis: 'h' },
    { x: 8.5 * TILE, dir: 1, axis: 'v' }, { x: 10.5 * TILE, dir: -1, axis: 'v' },
    { x: 89.5 * TILE, dir: 1, axis: 'v' }, { x: 91.5 * TILE, dir: -1, axis: 'v' },
  ];

  // The capital is a walkable radial city, not a decorative menu diagram.
  if(districtId==='capital'){
    W.buildings=[];W.props=[];W.lights=[];W.signs=[];W.pois=[];W.parks=[];W.traffic=[];W.lanes=[];W.hatch=null;
    W.solid.fill(0);W.decal.fill(D_NONE);W.ground.fill(G.GRASS);
    W.capitalRings=[16,27,38];
    const radius=(x,y)=>Math.hypot((x-60)/1.35,y-42);
    for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
      const r=radius(x,y),ring=W.capitalRings.some(v=>Math.abs(r-v)<1.7);
      const spoke=r<40&&(Math.abs(x-60)<2||Math.abs(y-42)<2||Math.abs((x-60)/1.35-(y-42))<1.4||Math.abs((x-60)/1.35+(y-42))<1.4);
      set(x,y,ring||spoke?G.ROAD:W.capitalRings.some(v=>Math.abs(r-v)<3)?G.SIDEWALK:r<12?G.PLAZA:G.GRASS);
      if((ring||spoke)&&(x+y)%4===0)W.decal[idx(x,y)]=Math.abs(x-60)<2?D_DASH_V:D_DASH_H;
    }
    // Place small blocks only in the wedges between roads; never cut a ring.
    for(let y=5;y<76;y+=5)for(let x=8;x<109;x+=6){
      const r=radius(x+2,y+2);if(r<13||r>35||(x<53&&y>42))continue;
      let clear=true;for(let yy=y;yy<y+4;yy++)for(let xx=x;xx<x+4;xx++)if(![G.GRASS,G.SIDEWALK].includes(get(xx,yy)))clear=false;
      if(clear)addBuilding(x,y,4,4,{types:[r<22?'office':r<31?'tech':'shop']});
    }
    addBuilding(53,34,14,10,{types:['office']});
    fill(58,44,5,39,G.ROAD);
    W.capitalGates=[{id:'streets',x:60,y:79},{id:'mind',x:60,y:69},{id:'soc',x:60,y:58},{id:'corporation',x:60,y:46}];
    for(const gate of W.capitalGates){crossAt(58,gate.y,5,2,true);W.lights.push({x:60*TILE,y:gate.y*TILE,r:45,c:'k',a:.7,kind:'neon',phase:0});}
    for(let y=6;y<78;y+=3)for(let x=9;x<112;x+=4)if(get(x,y)===G.GRASS&&get(x+1,y)===G.GRASS&&radius(x,y)<40){addProp('prop_tree',x,y,{solid:true,anim:1});}
  }

  /* ---- 9. spawn on open ground ------------------------------------------ */
  W.spawn = findOpen(W, districtId==='capital'?60:58, districtId==='capital'?80:50);
  assignFacadeArt(W);
  return W;
}

function tileSolid(W, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const i = ty * MW + tx;
  return W.solid[i] === 1 || !WALKABLE[W.ground[i]];
}

function findOpen(W, tx, ty) {
  if(W.minipixel)return {...W.spawn};
  for (let r = 0; r < 30; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy;
      if (!tileSolid(W, x, y)) return { x: x * TILE + 8, y: y * TILE + 8 };
    }
  }
  return { x: tx * TILE, y: ty * TILE };
}

/* ---- walkability proof ---------------------------------------------------
   Run at build time. If a point of interest ends up walled in by a prop or a
   badly packed block, this is what catches it rather than the player. */
function auditWorld(W) {
  const seen = new Uint8Array(MW * MH);
  const sx = (W.spawn.x / TILE) | 0, sy = (W.spawn.y / TILE) | 0;
  const stack = [sy * MW + sx];
  seen[sy * MW + sx] = 1;
  let reached = 0;
  while (stack.length) {
    const i = stack.pop(); reached++;
    const x = i % MW, y = (i / MW) | 0;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) return;
      const j = ny * MW + nx;
      if (seen[j] || tileSolid(W, nx, ny)) return;
      seen[j] = 1; stack.push(j);
    };
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  let open = 0;
  for (let i = 0; i < MW * MH; i++) if (!tileSolid(W, i % MW, (i / MW) | 0)) open++;
  const unreachablePois = W.pois.filter(p => !seen[p.y * MW + p.x]).map(p => p.id);
  return { reached, open, orphaned: open - reached, unreachablePois, seen };
}

/* ===== 08_render.js ===== */
/* ==========================================================================
   RENDERER
   The ground and the architecture are baked once into a full-district canvas.
   Everything that moves, blinks or has to occlude the player is drawn live and
   sorted by its baseline. Light is a separate quantised pass, never a blur.
   ========================================================================== */

function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695040) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

function bakeStatic(W) {
  if(W.minipixel)return;
  const c = document.createElement('canvas');
  c.width = PW*2; c.height = PH*2;
  const g = c.getContext('2d');g.scale(2,2);
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL['0']; g.fillRect(0, 0, PW, PH);

  const gr = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? G.BUILDING : W.ground[y * MW + x];

  /* ---- ground ----------------------------------------------------------- */
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, t = W.ground[i], v = W.vary[i];
    const px = x * TILE, py = y * TILE;
    let name = null;
    switch (t) {
      case G.SIDEWALK: {
        // a kerb wherever the pavement meets the carriageway; a pavement that
        // turns a corner meets it on two sides and gets the corner tile
        const isRd = (a, b) => { const t2 = gr(a, b); return t2 === G.ROAD || t2 === G.CROSS; };
        const cs = isRd(x, y + 1), cn = isRd(x, y - 1), ce = isRd(x + 1, y), cw = isRd(x - 1, y);
        if (cs && ce) name = 'tile_curb_se';
        else if (cs && cw) name = 'tile_curb_sw';
        else if (cn && ce) name = 'tile_curb_ne';
        else if (cn && cw) name = 'tile_curb_nw';
        else if (cs) name = 'tile_curb_s';
        else if (cn) name = 'tile_curb_n';
        else if (ce) name = 'tile_curb_e';
        else if (cw) name = 'tile_curb_w';
        else name = v === 2 ? 'tile_sidewalk_b' : 'tile_sidewalk';
        break;
      }
      case G.ROAD:
        // roughly a third of the carriageway carries a film of standing water
        name = hash2(x, y, 17) < .34 ? (v === 1 ? 'tile_road_wet_b' : 'tile_road_wet_a')
          : ['tile_road_asphalt_a', 'tile_road_asphalt_b', 'tile_road_asphalt_c'][v];
        break;
      case G.CROSS: name = v === 1 ? 'tile_crosswalk_v' : 'tile_crosswalk_h'; break;
      case G.PLAZA: name = v === 3 ? 'tile_plaza_inlay' : (v === 1 ? 'tile_plaza_b' : 'tile_plaza'); break;
      case G.ALLEY: name = v === 1 ? 'tile_alley_b' : 'tile_alley'; break;
      case G.GRASS: name = v === 1 ? 'tile_grass_b' : 'tile_grass'; break;
      case G.PATH: name = 'tile_park_path'; break;
      case G.QUAY: name = gr(x, y + 1) === G.WATER ? 'tile_quay_edge' : (v === 1 ? 'tile_quay_b' : 'tile_quay'); break;
      case G.TRACKS: name = 'tile_tracks'; break;
      case G.UNDER: name = 'tile_sidewalk'; break;   // the 32x32 module is stamped over these below
      case G.STAIRS: name = 'tile_stairs'; break;
      case G.RAMP: name = 'tile_ramp'; break;
      case G.WATER: name = null; break;   // drawn live, it moves
      case G.BUILDING: name = null; break;
      default: name = 'tile_sidewalk';
    }
    if (name) blit(g, name, px, py);

    const d = W.decal[i];
    if (d) {
      const map = {
        [D_MANHOLE]: 'tile_manhole', [D_DRAIN]: 'tile_drain', [D_GRIME]: 'tile_grime',
        [D_DASH_H]: 'tile_road_dash_h', [D_DASH_V]: 'tile_road_dash_v', [D_CRACK]: 'tile_sidewalk_crack',
      };
      if (d === D_PUDDLE) {
        // a puddle borrows its colour from the nearest sign, which is what
        // makes a wet street read as a wet street
        const near = nearestLight(W, px + 8, py + 8, 90);
        const key = !near ? 'tile_puddle_plain'
          : (near.c === 'k' || near.c === 'j' || near.c === 'l') ? 'tile_puddle_cyan'
            : (near.c === 's' || near.c === 't' || near.c === 'q' || near.c === 'p') ? 'tile_puddle_magenta'
              : 'tile_puddle_amber';
        blit(g, key, px, py);
      } else if (map[d]) blit(g, map[d], px, py);
    }
  }

  // the underground entrance is one 32x32 module, not four repeated tiles
  if (W.hatch) blit(g, 'tile_under_entry', ((W.hatch.x / TILE) | 0) * TILE - TILE, (((W.hatch.y + 2) / TILE) | 0) * TILE - TILE);

  /* ---- architecture ------------------------------------------------------ */
  W.buildings.forEach(b => {
    if(b.objectAsset){g.fillStyle='#222a42';g.fillRect(b.x*TILE,b.y*TILE,b.w*TILE,b.h*TILE);return;}
    const fam = b.roofFam, T = b.type;
    const litSet = new Set(b.lit.map(l => l.x + ':' + l.y));
    const litAlt = new Set(b.lit.filter(l => l.alt).map(l => l.x + ':' + l.y));
    const facadeRows = b.h >= 6 ? 2 : 1;

    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      const tx = b.x + i, ty = b.y + j, px = tx * TILE, py = ty * TILE;
      const fromBottom = b.h - 1 - j;
      if (fromBottom < facadeRows) {
        /* façade */
        let name;
        if (fromBottom === 0 && tx === b.door.x) name = 'facade_' + T + '_door';
        else {
          const r = hash2(tx, ty, b.seed);
          if (fromBottom === 0) {
            name = r < .16 ? 'facade_' + T + '_shutter'
              : r < .3 ? 'facade_' + T + '_sign'
                : r < .42 ? 'facade_' + T + '_awning'
                  : r < .5 ? 'facade_' + T + '_vent'
                    : r < .56 ? 'facade_' + T + '_pipe'
                      : litSet.has(tx + ':' + ty) ? 'facade_' + T + (litAlt.has(tx + ':' + ty) ? '_window_body' : '_window_lit')
                        : (r < .8 ? 'facade_' + T + '_window_dark' : 'facade_' + T + '_wall');
          } else {
            name = litSet.has(tx + ':' + ty) ? 'facade_' + T + (litAlt.has(tx + ':' + ty) ? '_window_body' : '_window_lit')
              : r < .12 ? 'facade_' + T + '_pipe'
                : r < .2 ? 'facade_' + T + '_wall'
                  : 'facade_' + T + '_window_dark';
          }
        }
        blit(g, name, px, py);
      } else {
        /* roof */
        const n = j === 0, w = i === 0, e = i === b.w - 1;
        let name;
        if (n && w) name = 'roof_edge_nw_' + fam;
        else if (n && e) name = 'roof_edge_ne_' + fam;
        else if (n) name = 'roof_edge_n_' + fam;
        else if (w) name = 'roof_edge_w_' + fam;
        else if (e) name = 'roof_edge_e_' + fam;
        else name = 'roof_' + fam + '_' + (1 + ((hash2(tx, ty, b.seed + 7) * 3) | 0));
        blit(g, name, px, py);
      }
    }
    // rooftop clutter
    b.gear.forEach(gitem => blit(g, gitem.k, gitem.x * TILE, gitem.y * TILE));
    // the wall throws a hard shadow onto the pavement it stands on
    g.fillStyle = 'rgba(2,4,9,0.55)';
    g.fillRect(b.x * TILE, (b.y + b.h) * TILE, b.w * TILE, 3);
    g.fillStyle = 'rgba(2,4,9,0.28)';
    g.fillRect(b.x * TILE, (b.y + b.h) * TILE + 3, b.w * TILE, 3);

    /* A sign over a wet street smears downward into it. Drawn as a handful of
       broken vertical dashes rather than a mirrored copy: at this resolution a
       real reflection turns to mush, and broken dashes read as moving water. */
    if (b.sign) {
      const col = PAL[b.sign.kind === 'neon_bar' ? W.cfg.accent2 : W.cfg.accent] || '#fff';
      const bx = b.sign.x, by = (b.y + b.h) * TILE + 4;
      for (let i = 0; i < 26; i++) {
        const r1 = hash2(bx + i, by, b.seed + 31), r2 = hash2(bx, by + i, b.seed + 57);
        const dy = (r1 * 34) | 0;
        if (r2 < .42) continue;
        const dx = ((r2 - .5) * 20) | 0;
        if (tileSolid(W, ((bx + dx) / TILE) | 0, ((by + dy) / TILE) | 0)) continue;
        g.globalAlpha = 0.20 * (1 - dy / 40);
        g.fillStyle = col;
        g.fillRect((bx + dx) | 0, (by + dy) | 0, 1, 1 + ((r1 * 3) | 0));
      }
      g.globalAlpha = 1;
    }
  });

  polishCity(g, W);
  W.staticCanvas = c;
  return c;
}

function nearestLight(W, x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (let i = 0; i < W.lights.length; i++) {
    const l = W.lights[i];
    if (l.kind === 'window') continue;
    const dx = l.x - x, dy = l.y - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

/* ==========================================================================
   FRAME
   ========================================================================== */

class Renderer {
  constructor(canvas) {
    this.output = canvas;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.drops = [];
    this.splashes = [];
    this.vw = 0; this.vh = 0;
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  resize(vw, vh) {
    if (this.vw === vw && this.vh === vh) return;
    this.vw = vw; this.vh = vh;
    this.canvas.width = vw*2; this.canvas.height = vh*2;
    this.light.width = vw*2; this.light.height = vh*2;
    this.ctx.scale(2,2);this.lctx.scale(2,2);
    this.ctx.imageSmoothingEnabled = false;
    this.lctx.imageSmoothingEnabled = false;
    this.drops = [];
    for (let i = 0; i < 260; i++) this.drops.push({ x: Math.random() * vw, y: Math.random() * vh, v: 2.6 + Math.random() * 2.4, l: 2 + ((Math.random() * 3) | 0) });
  }

  configureView(width,height,oblique=false){
    this.screenW=width;this.screenH=height;this.pitch=oblique?.82:1;this.skew=oblique?.08:0;
    const h=Math.ceil(height/this.pitch),w=Math.ceil(width+this.skew*h);
    this.resize(w,h);this.offsetX=(width-w-this.skew*h)/2;this.offsetY=(height-this.pitch*h)/2;
    this.output.width=width*2;this.output.height=height*2;
  }
  screenToWorld(x,y,cam){
    const wy=(y-(this.offsetY||0))/(this.pitch||1);
    return {x:x-(this.offsetX||0)-(this.skew||0)*wy+cam.x,y:wy+cam.y};
  }
  present(){
    if(!this.screenW)return;
    const c=this.output.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.output.width,this.output.height);c.imageSmoothingEnabled=false;
    c.setTransform(1,0,this.skew,this.pitch,this.offsetX*2,this.offsetY*2);c.drawImage(this.canvas,0,0);c.setTransform(1,0,0,1,0,0);
  }

  /* A light pool is four hard concentric steps. Because each step is punched
     out of the darkness separately, the alphas compound toward the middle and
     the edge of each band stays visible — a lit patch of street, not a blur. */
  pool(ctx, x, y, r, strength) {
    const steps = this.quality==='cinematic'?12:6;
    const base = Math.min(.72, .62 * strength);
    for (let i = steps; i >= 1; i--) {
      ctx.globalAlpha = base * (1 - (i - 1) / steps);
      ctx.beginPath();
      ctx.arc(x | 0, y | 0, (r * i / steps) | 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  draw(game) {
    if(game.world.minipixel){Minipixel.get().render(game);return;}
    const { ctx, vw, vh } = this;
    const W = game.world, cam = game.cam, t = this.calm ? 0 : game.time;
    const ox = cam.x | 0, oy = cam.y | 0;
    // Overcast cities are never black: the cloud base bounces light back down.
    // The floor here is deliberately generous so an unlit pavement still reads
    // as pavement, which is what keeps the routes legible.
    const weather=updateCityWeather(this,game);
    const night = game.world.interior?'rgba(8,18,30,0.16)':`rgba(10,4,26,${weather.dark})`;

    ctx.clearRect(0, 0, vw, vh);

    /* --- static ground + architecture ------------------------------------ */
    ctx.drawImage(W.staticCanvas, ox*2, oy*2, vw*2, vh*2, 0, 0, vw, vh);

    /* --- reflection shimmer ------------------------------------------------
       Most of the time a puddle is still. Now and then a single highlight
       crosses it, which is all a wet street needs to read as wet. */
    {
      const sx0 = Math.max(0, (ox / TILE) | 0), sx1 = Math.min(MW, ((ox + vw) / TILE | 0) + 1);
      const sy0 = Math.max(0, (oy / TILE) | 0), sy1 = Math.min(MH, ((oy + vh) / TILE | 0) + 1);
      for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
        if (W.decal[y * MW + x] !== D_PUDDLE) continue;
        const ph = ((t / 560 + hash2(x, y, 9) * 9) | 0) % 7;
        if (ph > 1) continue;
        const px = x * TILE - ox + 3 + ((hash2(x, y, 4) * 8) | 0);
        const py = y * TILE - oy + 4 + ((hash2(x, y, 6) * 7) | 0);
        ctx.fillStyle = 'rgba(196,220,244,0.34)';
        ctx.fillRect(px, py, ph === 0 ? 3 : 2, 1);
      }
    }

    /* --- canal ------------------------------------------------------------ */
    if (W.cfg.canal) {
      const wf = ((t / 260) | 0) % 4;
      const y0 = Math.max(0, ((oy / TILE) | 0)), y1 = Math.min(MH, ((oy + vh) / TILE | 0) + 1);
      const x0 = Math.max(0, ((ox / TILE) | 0)), x1 = Math.min(MW, ((ox + vw) / TILE | 0) + 1);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (W.ground[y * MW + x] !== G.WATER) continue;
        blit(ctx, 'tile_water', x * TILE - ox, y * TILE - oy, wf + ((x + y) & 1));
      }
    }

    drawStreetWater(ctx,game,ox,oy);

    /* --- depth-sorted layer ---------------------------------------------- */
    const list = game.drawList(ox - 48, oy - 64, vw + 96, vh + 128);
    list.sort((a, b) => a.sy - b.sy);
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      o.draw(ctx, o.x - ox, o.y - oy, t);
    }

    if (!game.world.interior && typeof alienGrade === 'function') alienGrade(ctx, this, game);

    /* --- light ------------------------------------------------------------ */
    const L = this.lctx;
    L.globalCompositeOperation = 'source-over';
    // Clear first. Without this the night layer composites onto the previous
    // frame's residue and saturates to opaque black within a second.
    L.clearRect(0, 0, vw, vh);
    L.fillStyle = night;
    L.fillRect(0, 0, vw, vh);
    L.globalCompositeOperation = 'destination-out';
    L.fillStyle = '#000';
    const lights = game.visibleLights(ox, oy, vw, vh);
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      let a = l.a;
      if (l.kind === 'lamp') a *= 0.86 + 0.14 * Math.sin(t / 220 + l.phase * 3) + (!this.calm && hash2(l.x, l.y, 3) < .12 && ((t / 90 + l.phase * 10) | 0) % 17 === 0 ? -0.5 : 0);
      if (l.kind === 'neon' && l.blink) a *= (((t / 340 + l.phase) | 0) % 5 === 0) ? 0.25 : 1;
      this.pool(L, l.x - ox, l.y - oy, l.r, a);
    }
    L.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0,vw,vh);

    /* --- coloured spill ---------------------------------------------------
       Cutting darkness away only ever reveals grey concrete. The tint is what
       makes a pool read as a sodium lamp or a magenta sign, so it is a second,
       tighter pass with its own ramp rather than a scaled copy of the first. */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      ctx.fillStyle = (game.world.interior || typeof alienLight !== 'function' ? PAL[l.c] : alienLight(l.c)) || '#fff';
      let a = l.kind === 'neon' ? .07 : (l.kind === 'window' ? .09 : .08);
      if (l.kind === 'neon' && l.blink && (((t / 340 + l.phase) | 0) % 5 === 0)) a *= .22;
      const rr = l.r * .62;
      for (let k = 3; k >= 1; k--) {
        ctx.globalAlpha = a * (1 - (k - 1) / 3) * 0.5;
        ctx.beginPath();
        ctx.arc((l.x - ox) | 0, (l.y - oy) | 0, (rr * k / 3) | 0, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* --- weather ---------------------------------------------------------- */
    drawAtmosphere(ctx, game, ox, oy);
    this.rain(ctx, game);
    drawWeatherLight(ctx,game,ox,oy);

    /* --- network vision --------------------------------------------------- */
    drawDoorMarkers(ctx, game, ox, oy);
    if (game.vision) this.visionOverlay(ctx, game, ox, oy);
  }

  rain(ctx, game) {
    if (this.calm || this.rainEnabled===false || this.quality==='low') return;
    const amount = game.world.interior?0:(this.weatherFrame?.rain??game.world.cfg.rain);
    if (amount <= 0) return;
    const { vw, vh } = this;
    const n = (this.drops.length * Math.min(1, amount) * (this.quality==='cinematic'?.65:.35)) | 0;
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      d.y += d.v * 1.7; d.x += d.v * 0.36;
      if (d.y > vh) {
        if (this.splashes.length < 40) this.splashes.push({ x: d.x, y: vh * Math.random(), t: 0 });
        d.y = -4; d.x = Math.random() * vw;
      }
      if (d.x > vw) d.x = 0;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(170,255,225,0.30)' : i % 3 === 0 ? 'rgba(110,150,255,0.24)' : 'rgba(90,200,170,0.18)';
      ctx.fillRect(d.x | 0, d.y | 0, 1, d.l);
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.t += 1;
      if (s.t > 9) { this.splashes.splice(i, 1); continue; }
      blit(ctx, 'fx_splash', s.x | 0, s.y | 0, (s.t / 3) | 0);
    }
  }

  visionOverlay(ctx, game, ox, oy) {
    const { vw, vh } = this;
    ctx.fillStyle = 'rgba(3,12,18,0.58)';
    ctx.fillRect(0, 0, vw, vh);
    const nodes = game.questSites;
    ctx.strokeStyle = PAL['k'];
    ctx.lineWidth = 1;
    ctx.globalAlpha = .75;
    ctx.beginPath();
    for (let i = 0; i < nodes.length - 1; i++) {
      ctx.moveTo((nodes[i].x - ox) | 0, (nodes[i].y - oy - 8) | 0);
      ctx.lineTo((nodes[i + 1].x - ox) | 0, (nodes[i + 1].y - oy - 8) | 0);
    }
    ctx.stroke();
    // a packet crawling the route, so the graph reads as traffic not decoration
    const total = nodes.length - 1;
    if (total > 0) {
      const p = ((game.time / 2600) % 1) * total;
      const seg = Math.min(total - 1, p | 0), f = p - seg;
      const px = nodes[seg].x + (nodes[seg + 1].x - nodes[seg].x) * f;
      const py = nodes[seg].y + (nodes[seg + 1].y - nodes[seg].y) * f - 8;
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAL['l'];
      ctx.fillRect((px - ox - 2) | 0, (py - oy - 2) | 0, 4, 4);
    }
    ctx.globalAlpha = 1;
    nodes.forEach(n => {
      ctx.strokeStyle = n.found ? PAL['l'] : PAL['i'];
      ctx.strokeRect((n.x - ox - 9) | 0, (n.y - oy - 26) | 0, 18, 26);
    });
    game.npcs.forEach(n => {
      ctx.strokeStyle = PAL['h'];
      ctx.globalAlpha = .5;
      ctx.strokeRect((n.x - ox - 7) | 0, (n.y - oy - 22) | 0, 14, 22);
      ctx.globalAlpha = 1;
    });
  }
}

const SPEED_WALK = 62, SPEED_RUN = 104;
/* The carriageway of the long streets ends where the stairs to the canal
   begin. Traffic stops here and fades out instead of driving down them. */
const ROAD_END = 68 * TILE;
function carAlpha(c) {
  if (c.axis !== 'v') return 1;
  return Math.max(0, Math.min(1, (ROAD_END - c.y) / 30));
}

function canStand(W, x, y) {
  if(W.minipixel)return Minipixel.get().can({x,y});
  const hw = 5, top = y - 7, bot = y - 1;
  const pts = [[x - hw, top], [x + hw, top], [x - hw, bot], [x + hw, bot], [x, bot], [x, top]];
  for (const polygon of W.objectColliders||[]) {
    if(pts.some(([px,py])=>objectContains(polygon,px,py)))return false;
  }
  for (let i = 0; i < pts.length; i++) {
    if (tileSolid(W, (pts[i][0] / TILE) | 0, (pts[i][1] / TILE) | 0)) return false;
  }
  return true;
}

class Actor {
  constructor(cast, x, y, name, line) {
    this.cast = cast; this.x = x; this.y = y; this.name = name; this.line = line;
    this.dir = 'down'; this.flip = false; this.moving = false; this.run = false;
    this.anim = Math.random() * 1000; this.pause = Math.random() * 2000;
    this.tx = x; this.ty = y; this.speed = 26 + Math.random() * 14;
  }
  prefix() { return this.cast === 'player' ? 'player' : 'npc_' + this.cast; }
  sprite() {
    const p=this.prefix(),four=S(p+'_idle_down')?.directional;
    const dir=four&&this.dir==='side'?(this.flip?'left':'right'):this.dir;
    const action=this.hacking?'hack':this.interacting>0?'interact':!this.moving?'idle':this.run&&this.cast==='player'?'sprint':'walk';
    return p+'_'+action+'_'+dir;
  }
  frame() {
    const s = S(this.sprite());
    if (!s) return 0;
    const rate = this.hacking ? 160 : this.interacting>0 ? 100 : this.moving ? (this.run ? 90 : 135) : 620;
    return ((this.anim / rate) | 0) % s.frames;
  }
  face(dx, dy) {
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) > Math.abs(dy)) { this.dir = 'side'; this.flip = dx < 0; }
    else this.dir = dy > 0 ? 'down' : 'up';
  }
  drawSelf(ctx, sx, sy) {
    blit(ctx, 'fx_shadow', sx, sy + 1);
    const name = this.sprite(), sprite = S(name);
    if (!sprite) return;
    if (sprite.tag === 'character') {
      // Detailed source art keeps the original in-world footprint (16 x 24).
      // Only the identity editor presents the source pixels at a larger scale.
      ctx.save();ctx.translate(Math.round(sx),Math.round(sy));
      if(this.flip && this.dir === 'side'&&!sprite.directional)ctx.scale(-1,1);
      const h=sprite.worldHeight||24,w=h*2/3;
      ctx.drawImage(sprite.canvas,this.frame()*sprite.fw,0,sprite.fw,sprite.fh,-w/2,1-h,w,h);
      ctx.restore();
    } else if (this.flip && this.dir === 'side') blitFlip(ctx, name, sx, sy, this.frame());
    else blit(ctx, name, sx, sy, this.frame());
  }
}

class Game {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.renderer = new Renderer(canvas);
    this.keys = Object.create(null);
    this.time = 0;
    this.vision = false;
    this.paused = false;
    this.cam = { x: 0, y: 0 };
    this.energy = 100;
    this.prompt = null;
    this.toast = null;
    this.toastT = 0;
    this.world = null;
    this.zone = null;
    this.hatchLabel = 'Underground entrance';
  }

  loadDistrict(d, found) {
    this.district = d;
    this.zone = null;
    this.world = makeWorld(d.id);
    if(this.world.minipixel){
      const p=this.world.spawn;this.player=new Actor('player',p.x,p.y,'OPERATOR');
      this.mentor=new Actor(d.mentorCast,p.x+2,p.y+6,d.mentor);this.mentor.isMentor=true;
      this.npcs=[this.mentor,...NPC_ROSTER.map((r,i)=>{const at=Minipixel.get().point(i%2?18:-18,2470+i*120);const n=new Actor(r.cast,at.x,at.y,r.name,r.line);n.anchored=true;return n;})];this.nodes=[];this.questSites=[];this.cars=[];
      this.cam.x=p.x-this.renderer.vw/2;this.cam.y=p.y-this.renderer.vh*.6;
      return;
    }
    if(typeof attachObjectAssets==='function')attachObjectAssets(this.world);
    if(typeof assignBuildingSprites==='function')assignBuildingSprites(this.world);
    if(typeof assignParkScenes==='function')assignParkScenes(this.world);
    bakeStatic(this.world);
    const W = this.world;

    this.player = new Actor('player', W.spawn.x, W.spawn.y, 'OPERATOR');
    this.cam.x = this.player.x - this.renderer.vw / 2;
    this.cam.y = this.player.y - this.renderer.vh * .60;

    /* route nodes, snapped onto standable ground */
    this.nodes = NODE_DEFS.map(n => {
      const o = findOpen(W, n.tx, n.ty);
      return Object.assign({}, n, { x: o.x, y: o.y + 6, found: !!(found && found.has(d.id + ':' + n.id)) });
    });
    this.nodes.forEach(n => W.lights.push({ x: n.x, y: n.y - 14, r: 22, c: 'k', a: .8, kind: 'neon', phase: 0 }));

    this.questSites = [];
    const aq = activeQuest();
    if (aq && State.accepted.has(aq.id) && !State.done.has(aq.id)) {
      this.questSites = questSitesFor(aq);
      this.questSites.forEach(site => W.lights.push({ x:site.x, y:site.y-13, r:20, c:'k', a:.48, kind:'neon', phase:site.index }));
    }

    /* the mentor waits on the plaza, where you cannot miss them */
    const mo = findOpen(W, 62, 45);
    this.mentor = new Actor(d.mentorCast, mo.x, mo.y, d.mentor);
    this.mentor.speed = 0;
    this.mentor.isMentor = true;

    /* civilians spread across the district */
    this.npcs = [this.mentor];
    const spots = [[20, 30], [24, 50], [46, 26], [70, 24], [100, 30], [100, 50], [54, 47], [70, 46], [18, 66], [66, 68], [40, 12], [96, 12]];
    NPC_ROSTER.forEach((r, i) => {
      const s = spots[i % spots.length];
      const o = findOpen(W, s[0] + ((i * 3) % 5), s[1] + ((i * 2) % 4));
      this.npcs.push(new Actor(r.cast, o.x, o.y, r.name, r.line));
    });

    /* traffic */
    const kinds = ['compact_car', 'taxi', 'delivery_van', 'police', 'utility', 'motorcycle', 'car_b', 'bus_a', 'car_c', 'truck_a', 'car_d', 'van_b', 'taxi_b', 'bus_b', 'car_e', 'police_b', 'truck_b', 'moto_b', 'car_f', 'van_c', 'bus_c', 'truck_c', 'moto_c', 'moto_d'].filter(k => S('vehicle_' + k + '_right'));
    this.cars = [];
    W.traffic.forEach((lane, i) => {
      for (let k = 0; k < 2; k++) {
        const kind = kinds[(i * 2 + k) % kinds.length];
        this.cars.push({
          kind, axis: lane.axis, dir: lane.dir,
          x: lane.axis === 'h' ? Math.random() * PW : lane.x,
          y: lane.axis === 'h' ? lane.y : Math.random() * ROAD_END,
          v: 26 + Math.random() * 30,
        });
      }
    });

    this.hooks.onDistrict && this.hooks.onDistrict(d, W);
  }

  /* ---- input ------------------------------------------------------------ */
  key(code, down) { this.keys[code] = down; }
  axis() {
    const k = this.keys;
    let dx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    let dy = (k['KeyS'] || k['ArrowDown'] ? 1 : 0) - (k['KeyW'] || k['ArrowUp'] ? 1 : 0);
    if (dx && dy) { const m = Math.SQRT1_2; dx *= m; dy *= m; }
    return [dx, dy];
  }

  /* ---- simulation -------------------------------------------------------- */
  update(dt) {
    this.time += dt;
    if (this.paused || !this.world) return;
    const W = this.world, p = this.player;

    let [dx, dy] = this.axis();
    if (dx || dy) this.path = [];
    else if (this.path?.length) { const dest = this.path[0], ax = dest.x - p.x, ay = dest.y - p.y, dist = Math.hypot(ax, ay); if (dist < (W.minipixel?.08:3)) this.path.shift(); else { dx = ax / dist; dy = ay / dist; } }
    const wantRun = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && (dx || dy) && this.energy > 1;
    p.run = wantRun;
    p.moving = !!(dx || dy);
    let sp = (wantRun ? SPEED_RUN : SPEED_WALK) * dt / 1000 * (W.minipixel?.24:1);

    if(W.minipixel&&this.path?.length)sp=Math.min(sp,Math.hypot(this.path[0].x-p.x,this.path[0].y-p.y));
    if (wantRun) this.energy = Math.max(0, this.energy - dt * 0.022);
    else this.energy = Math.min(100, this.energy + dt * 0.012);

    if (p.moving) {
      p.anim += dt;
      p.face(dx, dy);
      const nx = p.x + dx * sp;
      if (canStand(W, nx, p.y)) p.x = nx;
      const ny = p.y + dy * sp;
      if (canStand(W, p.x, ny)) p.y = ny;
      p.x = Math.max(8, Math.min(PW - 8, p.x));
      p.y = Math.max(12, Math.min(PH - 4, p.y));
    } else {
      p.anim += dt;
    }
    if (p.interacting > 0) p.interacting -= dt;

    /* civilians wander between nearby standable tiles */
    this.npcs.forEach(n => {
      if (n.isMentor || n.anchored) { n.anim += dt; n.moving = false; return; }
      n.anim += dt;
      if (n.pause > 0) { n.pause -= dt; n.moving = false; return; }
      const ddx = n.tx - n.x, ddy = n.ty - n.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 3) {
        const o = findOpen(W, ((n.x / TILE) | 0) + ((Math.random() * 13) | 0) - 6, ((n.y / TILE) | 0) + ((Math.random() * 11) | 0) - 5);
        n.tx = o.x; n.ty = o.y; n.pause = 500 + Math.random() * 2600;
        n.moving = false;
        return;
      }
      const step = n.speed * dt / 1000;
      const ux = ddx / dist, uy = ddy / dist;
      n.moving = true;
      n.face(ux, uy);
      if (canStand(W, n.x + ux * step, n.y)) n.x += ux * step; else n.tx = n.x;
      if (canStand(W, n.x, n.y + uy * step)) n.y += uy * step; else n.ty = n.y;
    });

    /* traffic loops the avenues */
    this.cars.forEach(c => {
      const step = c.v * c.dir * dt / 1000;
      if (c.axis === 'h') { c.x += step; if (c.x < -60) c.x = PW + 40; if (c.x > PW + 60) c.x = -40; }
      else { c.y += step; if (c.y < -60) c.y = ROAD_END; if (c.y > ROAD_END) c.y = -40; }
    });

    /* camera */
    const vw = this.renderer.vw, vh = this.renderer.vh;
    const room = this.world.room;
    const tx = room && vw >= room.w ? room.x + room.w / 2 - vw / 2 : Math.max(0, Math.min(PW - vw, p.x - vw / 2));
    const ty = room && vh >= room.h ? room.y + room.h / 2 - vh / 2 : Math.max(0, Math.min(PH - vh, p.y - vh * .60));
    const k = Math.min(1, dt / 90);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;

    /* which landmark, if any, the player is standing in */
    let zone = null, zd = 1e9;
    const ptx = p.x / TILE, pty = p.y / TILE;
    W.pois.forEach(z => {
      const d = Math.hypot(z.x + .5 - ptx, z.y + .5 - pty);
      if (d < z.r && d < zd) { zd = d; zone = z; }
    });
    if (zone !== this.zone) {
      this.zone = zone;
      if (zone && this.hooks.onZone) this.hooks.onZone(zone);
    }

    this.prompt = this.findInteractable();
    if (this.toastT > 0) this.toastT -= dt;
  }

  findInteractable() {
    const p = this.player;
    let best = null, bd = this.world.minipixel ? 6*6 : 30*30;
    const test = (o, kind, label) => {
      const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
      if (d < bd) { bd = d; best = { kind, obj: o, label }; }
    };
    if (this.questSites) this.questSites.forEach((s, i) => {
      if (State.done.has(s.id)) return;
      test(s, 'questSite', s.action + ' · ' + s.label);
    });
    this.nodes.forEach(n => test(n, 'node', n.found ? n.label + ' · recorded' : 'Inspect ' + n.label));
    if (this.world.hatch) test(this.world.hatch, 'hatch', this.hatchLabel);
    (this.world.interactables || []).forEach(o => test(o,o.kind,o.label));
    this.npcs.forEach(n => test(n, n.isMentor ? 'mentor' : 'npc', 'Говорить: ' + n.name));
    return best;
  }

  interact() {
    const t = this.prompt;
    if (!t) return null;
    this.player.interacting = 420;
    this.player.face(t.obj.x - this.player.x, t.obj.y - this.player.y);
    return t;
  }

  say(text) { this.toast = text; this.toastT = 3400; }

  /* ---- what the renderer needs ------------------------------------------ */
  drawList(vx, vy, vw, vh) {
    const out = typeof objectDrawables==='function'&&!this.world.interior?objectDrawables(this.world):[];
    const W = this.world, t = this.renderer.calm ? 0 : this.time;
    const inView = (x, y) => x > vx && x < vx + vw && y > vy && y < vy + vh;

    for (let i = 0; i < W.props.length; i++) {
      const pr = W.props[i];
      if (!inView(pr.x, pr.y)) continue;
      out.push({
        x: pr.x, y: pr.y, sy: pr.over ? 1e7 : pr.y,
        draw: (ctx, sx, sy) => {
          if (pr.parked) {
            // parked: lights off, frame 0, facing whichever way its lane runs
            if (pr.flip) blitFlip(ctx, pr.kind, sx, sy, 0); else blit(ctx, pr.kind, sx, sy, 0);
            return;
          }
          let f = 0;
          switch (pr.kind) {
            case 'prop_lamp': f = (hash2(pr.x, pr.y, 5) < .14 && (((t / 110 + pr.phase * 9) | 0) % 23) < 2) ? 1 : 0; break;
            case 'prop_vending_machine': case 'prop_vending_machine_food': f = ((t / 900 + pr.phase) | 0) % 2; break;
            case 'prop_ad_screen': f = ((t / 700 + pr.phase) | 0) % 3; break;
            case 'prop_tree': case 'prop_tree_slim': f = ((t / 1150 + pr.phase) | 0) % 2; break;
            case 'fx_steam': f = ((t / 190 + pr.phase) | 0) % 4; break;
            case 'prop_hologram': f = ((t / 220 + pr.phase) | 0) % 3; break;
          }
          if(pr.kind==='prop_tree'||pr.kind==='prop_tree_slim'){if(typeof drawParkTree==='function'&&drawParkTree(ctx,sx,sy,Math.floor(pr.x+pr.y)))return;drawGardenTree(ctx,sx,sy,Math.floor(pr.x+pr.y));return;}
          if (pr.kind === 'prop_hologram') { blit(ctx, pr.kind, sx, sy, f, 0.62 + 0.38 * Math.sin(t / 520 + pr.phase)); return; }
          blit(ctx, pr.kind, sx, sy, f);
        },
      });
    }

    for (let i = 0; i < W.signs.length; i++) {
      const s = W.signs[i];
      if (!inView(s.x, s.y)) continue;
      out.push({
        x: s.x, y: s.y, sy: s.y - 1,
        draw: (ctx, sx, sy) => {
          const sp = S(s.kind);
          if (!sp) return;
          const off = s.blink && (((t / 340 + s.phase) | 0) % 5 === 0);
          ctx.drawImage(sp.canvas, (off ? 1 : 0) * sp.fw, 0, sp.fw, sp.fh,
            (sx - (sp.fw >> 1)) | 0, (sy - sp.fh) | 0, sp.fw, sp.fh);
        },
      });
    }

    (this.questSites || []).forEach((qs, i) => {
      if (!inView(qs.x, qs.y)) return;
      out.push({x:qs.x,y:qs.y,sy:qs.y,draw:(ctx,sx,sy)=>drawStation(ctx,sx,sy,qs,game)});
    });

    this.nodes.forEach(n => {
      if (!inView(n.x, n.y)) return;
      out.push({
        x: n.x, y: n.y, sy: n.y,
        draw: (ctx, sx, sy) => {
          blit(ctx, n.found ? 'prop_node_on' : 'prop_node_off', sx, sy, ((t / 220) | 0) % 4);
          if (!n.found) blit(ctx, 'fx_marker', sx, sy - 24, ((t / 260) | 0) % 4);
        },
      });
    });

    this.cars.forEach(c => {
      if (!inView(c.x, c.y)) return;
      out.push({
        x: c.x, y: c.y, sy: c.y + 6,
        draw: (ctx, sx, sy) => {
          const name = 'vehicle_' + c.kind + '_' + (c.axis === 'h' ? 'right' : 'down');
          // frame 1 is the moving version: headlights and rear lights lit
          const al = carAlpha(c);
          if (al <= 0) return;
          if (c.dir < 0) blitFlip(ctx, name, sx, sy, 1, al, c.axis === 'v');
          else blit(ctx, name, sx, sy, 1, al);
        },
      });
    });

    this.npcs.forEach(n => {
      if (!inView(n.x, n.y)) return;
      out.push({
        x: n.x, y: n.y, sy: n.y,
        draw: (ctx, sx, sy) => {
          n.drawSelf(ctx, sx, sy);
          if (n.isMentor || n.anchored) blit(ctx, 'fx_marker', sx, sy - 22, ((t / 260) | 0) % 4);
        },
      });
    });

    const p = this.player;
    out.push({ x: p.x, y: p.y, sy: p.y + 0.5, draw: (ctx, sx, sy) => p.drawSelf(ctx, sx, sy) });
    return out;
  }

  visibleLights(ox, oy, vw, vh) {
    const L = this.world.lights, out = [];
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      if (l.x < ox - l.r || l.x > ox + vw + l.r || l.y < oy - l.r || l.y > oy + vh + l.r) continue;
      out.push(l);
    }
    // the operator's own glow: small, cold, and the only thing that keeps the
    // protagonist legible on a dark stretch of street
    const pl = this.player;
    const pulse = this.renderer.calm ? 1 : (0.82 + 0.18 * Math.sin(this.time / 380));
    out.push({ x: pl.x, y: pl.y - 10, r: 23, c: 'k', a: .66 * pulse, kind: 'neon', phase: 0 });
    // headlights travel with the traffic
    this.cars.forEach(c => {
      if (c.x < ox - 60 || c.x > ox + vw + 60 || c.y < oy - 60 || c.y > oy + vh + 60) return;
      const fx = c.axis === 'h' ? c.x + c.dir * 22 : c.x;
      const fy = c.axis === 'h' ? c.y : c.y + c.dir * 22;
      const al = carAlpha(c);
      if (al > 0) out.push({ x: fx, y: fy, r: 24, c: 'y', a: .9 * al, kind: 'lamp', phase: 0 });
    });
    return out;
  }

  draw() { this.renderer.draw(this); if(!this.world.minipixel)this.renderer.present(); }
}

