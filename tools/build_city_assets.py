#!/usr/bin/env python3
"""Cuts the NULL//CITY art sheets into clean, tileable, truly transparent atlases.
Input : the 8 sheets of NULL_CITY_COMPLETE_ASSET_PACK (checkerboard baked into RGB).
Output: assets/city/terrain.png + terrain.json   (32px tiles, seamless)
Run   : python3 tools/build_city_assets.py <pack_dir>
"""
import sys, json, os
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image

PACK = sys.argv[1] if len(sys.argv) > 1 else 'pack'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'city')
T = 32  # baked pixels per game tile (the engine bakes the ground at 2x of its 16px grid)

def load_alpha(path):
    rgb = np.array(Image.open(path).convert('RGB'))
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    cand = (mn >= 176) & ((mx - mn) <= 22)          # checkerboard greys/whites
    lab, _ = ndi.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))                  # flood from outside only: white paint inside sprites survives
    return rgb, fg

def components(fg, min_area):
    f = cv2.dilate(fg.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2)
    lab, _ = ndi.label(f)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if ((lab[sl] == i) & fg[sl]).sum() < min_area: continue
        out.append((sl[1].start, sl[0].start, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start))
    out.sort(key=lambda c: (c[1] // 90, c[0]))
    return out

rgb, fg = load_alpha(os.path.join(PACK, '02_ROADS/roads_and_markings.png'))
boxes = components(fg, 400)

def crop(idx, x0, y0, x1, y1):
    bx, by = boxes[idx][:2]
    return rgb[by + y0:by + y1, bx + x0:bx + x1].astype(np.float32)

def rs(a, w, h):
    return cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)

def seamless(a):
    """Cosine-window blend with a half-shifted copy: no seam when the tile repeats."""
    h, w = a.shape[:2]
    wy = (0.5 - 0.5 * np.cos(2 * np.pi * (np.arange(h) + .5) / h))[:, None, None]
    wx = (0.5 - 0.5 * np.cos(2 * np.pi * (np.arange(w) + .5) / w))[None, :, None]
    s = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    m = a * (1 - wy) + s * wy
    s2 = np.roll(m, w // 2, 1)
    return m * (1 - wx) + s2 * wx

def tonemap(a, mean=None, gain=1.0):
    if mean is not None: a = a - a.mean((0, 1)) + mean
    return np.clip(a * gain, 0, 255)

def rgba(a, alpha=None):
    a = np.clip(a, 0, 255).astype(np.uint8)
    al = np.full(a.shape[:2] + (1,), 255, np.uint8) if alpha is None else alpha.astype(np.uint8)[..., None]
    return np.concatenate([a, al], 2)


hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(int)
Hh, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
asph_ok = (V < 95) & (V > 22) & (S < 70) & fg
slab_ok = (V > 105) & (V < 215) & (S > 35) & (S < 150) & (Hh >= 5) & (Hh <= 25) & fg

def region(ids):
    m = np.zeros(fg.shape, bool)
    for i in ids:
        x, y, w, h = boxes[i]; m[y:y + h, x:x + w] = True
    return m

def windows(mask, size, n, minfrac):
    """Axis-aligned windows that are (almost) entirely paint-free material."""
    h, w = mask.shape
    ii = cv2.integral(mask.astype(np.uint8))
    s = ii[size:h, size:w] - ii[0:h - size, size:w] - ii[size:h, 0:w - size] + ii[0:h - size, 0:w - size]
    cand = np.argwhere(s / (size * size) >= minfrac)
    rng = np.random.default_rng(1); rng.shuffle(cand)
    out, taken = [], np.zeros(mask.shape, bool)
    for y, x in cand:
        if taken[y:y + size, x:x + size].any(): continue
        out.append((int(x), int(y))); taken[y:y + size, x:x + size] = True
        if len(out) >= n: break
    return out

def win(a, x, y, s): return rgb[y:y + s, x:x + s].astype(np.float32)

tiles = {}
# ---- asphalt: 64px windows that contain nothing but asphalt, seamless, 4 variants --------------------------------
asph_clean = cv2.erode(asph_ok.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)   # keep 2px away from any paint
AW = windows(asph_clean & region(range(0, 38)), 64, 8, 1.0)
asph_mean = np.mean([win(rgb, x, y, 64).mean((0, 1)) for x, y in AW], 0)
asph = []
for k in range(4):
    x, y = AW[k]
    a = seamless(tonemap(win(rgb, x, y, 64), asph_mean))
    a = rs(a, T, T); asph.append(a); tiles[f'asph{k}'] = rgba(a)
for k in range(2):                                        # wet look: cooler, darker, soft light streaks
    a = asph[k] * np.array([.93, .97, 1.07]); rng = np.random.default_rng(40 + k)
    for _ in range(4):
        x, y, l = rng.integers(0, T), rng.integers(0, T), rng.integers(5, 11)
        for i in range(l): a[(y + i // 5) % T, (x + i) % T] += [6, 11, 20]
    tiles[f'wet{k}'] = rgba(a)

# ---- pavement slabs: 40px windows from inside one slab, joints redrawn on the tile edge ---------------------------------
SW = windows(cv2.erode(slab_ok.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & region([38, 39, 40, 41, 52, 53, 54, 55, 62, 63, 65, 75]), 32, 8, .95)
slab_mean = np.mean([win(rgb, x, y, 32).mean((0, 1)) for x, y in SW], 0)
JD, JL = np.array([44, 34, 38], np.float32), np.array([204, 176, 140], np.float32)
walk = []
for k in range(4):
    x, y = SW[k % len(SW)]
    a = seamless(tonemap(win(rgb, x, y, 32), slab_mean)); a = rs(a, T, T).copy()
    a[0:1] = a[0:1] * .35 + JD * .65; a[:, 0:1] = a[:, 0:1] * .35 + JD * .65
    a[1:2, 1:] = a[1:2, 1:] * .78 + JL * .22; a[1:, 1:2] = a[1:, 1:2] * .78 + JL * .22
    walk.append(a); tiles[f'walk{k}'] = rgba(a)

# ---- kerb strip, sampled from the real kerb in the sheet (south edge of tile 9) -------------------------------------
bx, by = boxes[9][:2]
ks = rgb[by + 112:by + 146, bx + 10:bx + 106].astype(np.float32)     # 96 x 34
kerb_h = 10
strip = rs(ks, T * 3, kerb_h * 2)
strip = seamless(np.tile(strip, (2, 1, 1)))[:kerb_h * 2]
strip = rs(strip, T, kerb_h)
def with_kerb(base, sides):
    a = base.copy()
    for s in sides:
        if s == 's': a[T - kerb_h:, :] = strip
        if s == 'n': a[:kerb_h, :] = strip[::-1]
        if s == 'w': a[:, :kerb_h] = np.transpose(strip[::-1], (1, 0, 2))
        if s == 'e': a[:, T - kerb_h:] = np.transpose(strip, (1, 0, 2))
    return a
for s in 'nesw': tiles[f'kerb_{s}'] = rgba(with_kerb(walk[1], s))
yy, xx = np.mgrid[0:T, 0:T]
for c in ('ne', 'nw', 'se', 'sw'):
    a = with_kerb(walk[1], c)
    cy = 0 if 'n' in c else T - 1; cx = 0 if 'w' in c else T - 1; r = 9
    dy, dx = np.abs(yy - cy), np.abs(xx - cx)
    cut = (dy < r) & (dx < r) & ((r - dy) ** 2 + (r - dx) ** 2 > r * r)   # rounded outer corner -> back to asphalt
    a[cut] = asph[0][cut]
    tiles[f'kerb_{c}'] = rgba(a)

# ---- crosswalk + lane dash from the real paint in the sheet ---------------------------------------------------------------
white = (V > 175) & (S < 70) & fg
x0, y0, w0, h0 = boxes[24]
prof = white[y0 + 90:y0 + 175, x0 + 40:x0 + w0 - 40].sum(0)
cols = np.where(prof > 40)[0] + x0 + 40
runs = np.split(cols, np.where(np.diff(cols) > 1)[0] + 1)
runs = [r for r in runs if len(r) >= 6]
r0 = runs[len(runs) // 2]                                  # a stripe from the middle of the zebra
sx0, sx1 = int(r0[0]), int(r0[-1]) + 1
rows = np.where(white[y0 + 90:y0 + 175, sx0:sx1].mean(1) > .5)[0] + y0 + 90
sy0, sy1 = int(rows[0]), int(rows[-1]) + 1
stripe_rgb = rgb[sy0:sy1, sx0:sx1].astype(np.float32)
stripe_al = white[sy0:sy1, sx0:sx1].astype(np.float32)
def crosswalk(vertical, base):
    a = base.copy(); per, sw = 16, 7
    sp = rs(stripe_rgb, sw, T); sa = rs(stripe_al, sw, T)[..., None]
    for k in range(2):
        xs = 3 + k * per
        wear = 0.80 + 0.20 * np.random.default_rng(7 + k).random((T, sw, 1))      # worn, uneven paint
        wear[np.random.default_rng(70 + k).random((T, sw, 1)) > .94] = .35
        al = sa * wear * .93
        a[:, xs:xs + sw] = a[:, xs:xs + sw] * (1 - al) + (sp * .92) * al
    return a if vertical else np.transpose(a, (1, 0, 2)).copy()
tiles['cross_v'] = rgba(crosswalk(True, asph[2])); tiles['cross_h'] = rgba(crosswalk(False, asph[2]))

yl = (S > 110) & (V > 150) & (Hh > 12) & (Hh < 30) & fg
bx0, by0, bw0, bh0 = boxes[0]
ycols = np.where(yl[by0 + 20:by0 + bh0 - 20, bx0 + 40:bx0 + bw0 - 40].sum(0) > 6)[0] + bx0 + 40
yrows = np.where(yl[by0:by0 + bh0, int(ycols.mean()) - 6:int(ycols.mean()) + 6].sum(1) > 1)[0] + by0
seg = np.split(yrows, np.where(np.diff(yrows) > 2)[0] + 1)
seg = max(seg, key=len)
cx = int(ycols.mean())
dash_rgb = rgb[seg[0]:seg[-1] + 1, cx - 4:cx + 4].astype(np.float32)
dash_al = yl[seg[0]:seg[-1] + 1, cx - 4:cx + 4].astype(np.float32)
dw, dh = 4, 14
dsp, dsa = rs(dash_rgb, dw, dh), rs(dash_al, dw, dh)
dv = np.zeros((T, T, 4), np.uint8)
dv[9:9 + dh, 14:14 + dw, :3] = np.clip(dsp, 0, 255); dv[9:9 + dh, 14:14 + dw, 3] = np.clip(dsa * 300, 0, 235)
tiles['dash_v'] = dv; tiles['dash_h'] = np.transpose(dv, (1, 0, 2)).copy()

# ---- manhole + drain, cut from their own sprites ---------------------------------------------------------------------------
def disc(idx, d):
    bx, by, bw, bh = boxes[idx]
    sp = rs(rgb[by + 3:by + bh - 3, bx + 3:bx + bw - 3].astype(np.float32), d, d)
    yy2, xx2 = np.mgrid[0:d, 0:d]
    al = (((yy2 - d / 2 + .5) ** 2 + (xx2 - d / 2 + .5) ** 2) <= (d / 2) ** 2) * 255
    o = np.zeros((T, T, 4), np.uint8); o0 = (T - d) // 2; o[o0:o0 + d, o0:o0 + d] = rgba(sp, al); return o
tiles['manhole'] = disc(48, 24)
bx, by, bw, bh = boxes[46]
o = np.zeros((T, T, 4), np.uint8); o[4:28, 4:28] = rgba(rs(rgb[by + 4:by + bh - 4, bx + 4:bx + bw - 4].astype(np.float32), 24, 24)); tiles['drain'] = o

# ---- plaza / alley / path -----------------------------------------------------------------------------------------------------
for k in range(3):
    a = walk[(k + 2) % 4].copy() * np.array([1.0, .99, 1.03])
    a[T // 2:T // 2 + 1] = a[T // 2:T // 2 + 1] * .6 + JD * .4; a[:, T // 2:T // 2 + 1] = a[:, T // 2:T // 2 + 1] * .6 + JD * .4
    tiles[f'plaza{k}'] = rgba(a)
for k in range(2): tiles[f'alley{k}'] = rgba(asph[k + 2] * np.array([.94, .9, .88]))
tiles['path0'] = rgba(walk[2] * np.array([.9, .92, .86]))

# ---- pack ---------------------------------------------------------------------------------------------------------------------------
names = list(tiles); cols = 8; rows_n = (len(names) + cols - 1) // cols
atlas = np.zeros((rows_n * T, cols * T, 4), np.uint8); meta = {'tile': T, 'tiles': {}}
for i, n in enumerate(names):
    x, y = (i % cols) * T, (i // cols) * T
    atlas[y:y + T, x:x + T] = tiles[n]; meta['tiles'][n] = [x, y]
os.makedirs(OUT, exist_ok=True)
Image.fromarray(atlas).save(os.path.join(OUT, 'terrain.png'), optimize=True)
json.dump(meta, open(os.path.join(OUT, 'terrain.json'), 'w'))
print('terrain atlas', atlas.shape, len(names), 'tiles; asphalt windows', len(AW), 'slab windows', len(SW))

# =====================================================================================================================
# BUILDINGS: 48 + 30 sprites from the two building sheets -> one atlas with real alpha, trimmed and halo-cleaned.
# =====================================================================================================================
def cut_sprites(path, min_area):
    img, fgm = load_alpha(path)
    # a light, neutral pixel that touches the background is checkerboard halo, not artwork
    bgm = ~fgm
    near_bg = cv2.dilate(bgm.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=3).astype(bool)
    mx, mn = img.max(2).astype(int), img.min(2).astype(int)
    halo = near_bg & (mn >= 118) & ((mx - mn) <= 44)
    fgm = fgm & ~halo
    fgm = ndi.binary_opening(fgm, structure=np.ones((2, 2)))
    out = []
    for (x, y, w, h) in components(fgm, min_area):
        m = fgm[y:y + h, x:x + w]
        lab, n = ndi.label(m)
        if n > 1:                                         # keep the main body, drop specks from neighbours
            sizes = ndi.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(sizes)))
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sp = np.dstack([img[y:y + h, x:x + w][y0:y1, x0:x1], (m[y0:y1, x0:x1] * 255).astype(np.uint8)])
        out.append(sp)
    return out

sprites = cut_sprites(os.path.join(PACK, '03_BUILDINGS/buildings_collection.png'), 3000) + \
          cut_sprites(os.path.join(PACK, '03_BUILDINGS/wide_buildings.png'), 3000)
sprites = [s for s in sprites if s.shape[0] >= 70 and s.shape[1] >= 70]
# shelf-pack
order = sorted(range(len(sprites)), key=lambda i: -sprites[i].shape[0])
AW_ = 1536; x = y = rowh = 0; place = {}
for i in order:
    h, w = sprites[i].shape[:2]
    if x + w + 2 > AW_: x = 0; y += rowh + 2; rowh = 0
    place[i] = (x, y); x += w + 2; rowh = max(rowh, h)
AH_ = y + rowh + 2
batlas = np.zeros((AH_, AW_, 4), np.uint8)
bmeta = []
for i in range(len(sprites)):
    h, w = sprites[i].shape[:2]; px, py = place[i]
    batlas[py:py + h, px:px + w] = sprites[i]
    bmeta.append([px, py, w, h])
# 256-colour palette + 1-bit-ish alpha keeps the pixel look and cuts the file ~4x
q = Image.fromarray(batlas).quantize(colors=250, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
q.save(os.path.join(OUT, 'buildings.png'), optimize=True)
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'city-meta.js'), 'w') as f:
    f.write("'use strict';\n// generated by tools/build_city_assets.py\nconst CITY_BUILDING_SRC='assets/city/buildings.png';\nconst CITY_BUILDINGS=" + json.dumps(bmeta, separators=(',', ':')) + ";\n")
print('building sprites', len(sprites), 'atlas', batlas.shape)
