#!/usr/bin/env python3
"""Cuts NULL_CITY_NEW_ASSETS_PACK into game atlases (long buildings, vehicles, characters, parks).
Usage: python3 tools/build_city_assets2.py <pack2_dir>"""
import sys, os, json
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut_pack2 import *

P = sys.argv[1] if len(sys.argv) > 1 else 'pack2'
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'city'); os.makedirs(OUT, exist_ok=True)

def shelf_pack(sprites, width, pad=2):
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i].shape[0])
    x = y = rowh = 0; place = {}
    for i in order:
        h, w = sprites[i].shape[:2]
        if x + w + pad > width: x = 0; y += rowh + pad; rowh = 0
        place[i] = (x, y); x += w + pad; rowh = max(rowh, h)
    atlas = np.zeros((y + rowh + pad, width, 4), np.uint8); meta = [None] * len(sprites)
    for i, (px, py) in place.items():
        h, w = sprites[i].shape[:2]; atlas[py:py + h, px:px + w] = sprites[i]; meta[i] = [px, py, w, h]
    return atlas, meta

def save_png(arr, name, colors=250):
    im = Image.fromarray(arr)
    im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, name), optimize=True)

META = {}
# ------------------------------------------------------------------ 16 long residential roofs (4 x 4 grid)
rgb = load(os.path.join(P, 'buildings/vertical_long_residential_roofs.png'))
bg = np.median(np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3)]), 0)
body = (np.abs(rgb.astype(int) - bg).sum(2) > 24)
body = ndi.binary_fill_holes(ndi.binary_closing(ndi.binary_opening(body, np.ones((2, 2))), np.ones((5, 5))))
H, W = body.shape; long_b = []
for r in range(4):
    for c in range(4):
        x0, x1, y0, y1 = c * W // 4, (c + 1) * W // 4, r * H // 4, (r + 1) * H // 4
        m = body[y0:y1, x0:x1]; lab, n = ndi.label(m)
        m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
        m = ndi.binary_fill_holes(cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool))
        ys, xs = np.where(m)
        sp = np.dstack([rgb[y0:y1, x0:x1], (m * 255).astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        long_b.append(sp)
a, m = shelf_pack(long_b, 1100); save_png(a, 'long_buildings.png'); META['LONG_BUILDINGS'] = m
print('long buildings', len(long_b), [s.shape[:2] for s in long_b][:3])

# ------------------------------------------------------------------ vehicles
rgb, body_v, bgv, boxes = dark_sheet(load(os.path.join(P, 'vehicles/top_down_vehicles.png')), thr=26, shadow=True, min_area=1800)
veh = []
for b in sorted(boxes, key=lambda b: (b[1] // 150, b[0])):
    if b[2] * b[3] < 3500: continue
    veh.append(cut_dark(rgb, body_v, bgv, b, shadow=True))
a, m = shelf_pack(veh, 1500); save_png(a, 'vehicles.png', 250)
META['VEHICLE_SPRITES'] = m
print('vehicles', len(veh))

# ------------------------------------------------------------------ characters: front (upper) + back (lower) per column
rgbc = load(os.path.join(P, 'characters/cartoon_characters.png')); fgc, _ = light_sheet(rgbc, 1200)
S = 1536 / 1344
GROUPS = {  # name: (x0, y0, x1, y1) in the 1344-wide preview, two rows (front/back)
    'main': (8, 30, 300, 225), 'civilian': (325, 30, 760, 225), 'worker': (780, 30, 1045, 225), 'security': (1060, 30, 1340, 225),
    'gang': (8, 255, 480, 460), 'business': (487, 255, 725, 460), 'tech': (730, 255, 1065, 460), 'student': (1070, 255, 1340, 460),
}
def runs(v, gap=1, minlen=1):
    idx = np.where(v)[0]
    if len(idx) == 0: return []
    parts = np.split(idx, np.where(np.diff(idx) > gap)[0] + 1)
    return [(p[0], p[-1] + 1) for p in parts if len(p) >= minlen]
def trim(rgba):
    ys, xs = np.where(rgba[..., 3] > 8); return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
chars = []; cmeta = []
for gname, (a0, b0, a1, b1) in GROUPS.items():
    x0, y0, x1, y1 = int(a0 * S), int(b0 * S), int(a1 * S), int(b1 * S)
    sub = fgc[y0:y1, x0:x1]
    sub = sub.copy(); sub[:int(22 * S)] &= False if gname in ('main', 'civilian', 'worker', 'security') and False else True
    cols = runs(sub.sum(0) > 2, gap=2, minlen=28)
    fixed = []
    for (c0, c1) in cols:                                  # touching neighbours merge into one wide run: split evenly
        n = max(1, round((c1 - c0) / 56)) if (c1 - c0) > 74 else 1
        edges = np.linspace(c0, c1, n + 1).astype(int)
        fixed += [(edges[k], edges[k + 1]) for k in range(n)]
    for (cx0, cx1) in fixed:
        col = sub[:, cx0:cx1]
        rws = runs(col.sum(1) > 2, gap=3, minlen=40)
        # drop the header label strip (dark box) that sits at the very top of the group
        rws = [r for r in rws if r[1] - r[0] >= 60]
        if len(rws) == 1 and rws[0][1] - rws[0][0] > 140:      # front and back touch: cut at the thinnest row in the middle
            r0, r1 = rws[0]; prof = col.sum(1)
            lo, hi = r0 + int((r1 - r0) * .38), r0 + int((r1 - r0) * .62)
            cut = lo + int(np.argmin(prof[lo:hi])); rws = [(r0, cut), (cut, r1)]
        if len(rws) < 2 or cx1 - cx0 > 100 or cx1 - cx0 < 24: continue
        pair = []
        for (ry0, ry1) in rws[:2]:
            m = np.zeros_like(fgc); m[y0 + ry0:y0 + ry1, x0 + cx0:x0 + cx1] = fgc[y0 + ry0:y0 + ry1, x0 + cx0:x0 + cx1]
            ys, xs = np.where(m); 
            lab, n = ndi.label(m[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
            mm = lab == (1 + int(np.argmax(ndi.sum(lab > 0, lab, range(1, n + 1)))))
            sp = np.dstack([rgbc[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (mm * 255).astype(np.uint8)])
            pair.append(trim(sp))
        chars.extend(pair); cmeta.append([gname, len(chars) - 2, len(chars) - 1])
a, m = shelf_pack(chars, 1400); save_png(a, 'characters.png', 250)
META['CHARACTER_SPRITES'] = m; META['CHARACTER_PAIRS'] = cmeta
print('characters', len(cmeta), 'pairs')
with open(os.path.join(ROOT, 'src', 'city-meta2.js'), 'w') as f:
    f.write("'use strict';\n// generated by tools/build_city_assets2.py\n" + ''.join(f"const {k}={json.dumps(v, separators=(',', ':'))};\n" for k, v in META.items()))

# =====================================================================================================================
# GAME-READY vehicles (2x res, front pointing down + pre-rotated "right"), characters (32x48 cells) --------------------
# =====================================================================================================================
def fit(sp, target_w=None, target_h=None, res=2):
    h, w = sp.shape[:2]
    s = (target_w * res / w) if target_w else (target_h * res / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    a = sp.astype(np.float32); a[..., :3] *= a[..., 3:4] / 255.0          # premultiply -> no dark fringes when shrinking
    a = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_AREA)
    al = a[..., 3:4]; a[..., :3] = np.where(al > 0, a[..., :3] * 255.0 / np.maximum(al, 1), 0)
    return np.clip(a, 0, 255).astype(np.uint8)

# kind -> (sprite index, game-px width, rotate180 so that the FRONT faces down)
VK = {
 'compact_car': (4, 16, 0), 'car_b': (5, 16, 0), 'car_c': (9, 16, 1), 'car_d': (16, 16, 0), 'car_e': (13, 16, 1), 'car_f': (2, 16, 1),
 'taxi': (10, 16, 0), 'taxi_b': (7, 16, 0),
 'police': (24, 16, 0), 'police_b': (26, 16, 0),
 'delivery_van': (36, 17, 1), 'van_b': (32, 17, 1), 'van_c': (25, 17, 1),
 'utility': (45, 17, 0), 'truck_a': (46, 17, 0), 'truck_b': (48, 17, 0), 'truck_c': (44, 17, 0),
 'bus_a': (38, 17, 0), 'bus_b': (39, 17, 0), 'bus_c': (40, 17, 0),
 'motorcycle': (52, 11, 1), 'moto_b': (53, 11, 1), 'moto_c': (59, 11, 1), 'moto_d': (60, 11, 1),
}
vcells = []; vmeta = {}
for kind, (idx, gw, rot) in VK.items():
    sp = veh[idx]
    if rot: sp = sp[::-1, ::-1].copy()
    down = fit(sp, target_w=gw)
    right = np.ascontiguousarray(np.rot90(down, 1))
    vmeta[kind] = {'down': len(vcells), 'right': len(vcells) + 1}
    vcells += [down, right]
a, m = shelf_pack(vcells, 1100); save_png(a, 'vehicles_game.png', 250)
META['VEHICLE_KINDS'] = vmeta; META['VEHICLE_CELLS'] = m
print('game vehicles', len(VK))

# characters: one 32x48 (2x res) cell per front/back sprite, feet on the bottom row, centred
def cell(sp):
    a = fit(sp, target_h=44, res=2)            # 44 game px... drawn into a 16x24 box: 88x? -> keep within 64x96 then halve below
    return a
CW, CH = 32, 48
ccells = []
for sp in chars:
    h, w = sp.shape[:2]
    s = min((CH - 2) / h, (CW - 2) / w)
    a = sp.astype(np.float32); a[..., :3] *= a[..., 3:4] / 255.0
    a = cv2.resize(a, (max(1, round(w * s)), max(1, round(h * s))), interpolation=cv2.INTER_AREA)
    al = a[..., 3:4]; a[..., :3] = np.where(al > 0, a[..., :3] * 255.0 / np.maximum(al, 1), 0)
    a = np.clip(a, 0, 255).astype(np.uint8)
    out = np.zeros((CH, CW, 4), np.uint8); hh, ww = a.shape[:2]
    out[CH - 1 - hh + 1:CH, (CW - ww) // 2:(CW - ww) // 2 + ww] = a[:CH]
    ccells.append(out)
atlas = np.concatenate([np.concatenate(ccells[i:i + 12] + [np.zeros((CH, CW, 4), np.uint8)] * (12 - len(ccells[i:i + 12])), 1) for i in range(0, len(ccells), 12)], 0)
save_png(atlas, 'characters_game.png', 250)
META['CHARACTER_CELLS'] = {'cw': CW, 'ch': CH, 'cols': 12, 'n': len(ccells)}
print('character cells', len(ccells), atlas.shape)
with open(os.path.join(ROOT, 'src', 'city-meta2.js'), 'w') as f:
    f.write("'use strict';\n// generated by tools/build_city_assets2.py\nconst CITY_LONG_SRC='assets/city/long_buildings.png',CITY_VEH_SRC='assets/city/vehicles_game.png',CITY_CHAR_SRC='assets/city/characters_game.png';\n" + ''.join(f"const {k}={json.dumps(v, separators=(',', ':'))};\n" for k, v in META.items() if k in ('LONG_BUILDINGS', 'VEHICLE_KINDS', 'VEHICLE_CELLS', 'CHARACTER_PAIRS', 'CHARACTER_CELLS')))

# =====================================================================================================================
# PARKS: scenes (whole park lots) + a few props (trees, hedge, benches, fence, bin)
# =====================================================================================================================
rgbp = load(os.path.join(P, 'parks/parks_and_greenery.png')); fgp, pboxes = light_sheet(rgbp, 150)
pboxes = sorted(pboxes, key=lambda b: (b[1] // 40, b[0]))
psp = [cut_light(rgbp, fgp, b) for b in pboxes]
SCENES = [i for i, b in enumerate(pboxes) if 40000 < b[2] * b[3] < 120000 and b[2] > 150 and b[3] > 150 and i != 24]
PROPS = {'tree_a': 46, 'tree_b': 34, 'tree_c': 72, 'hedge': 14, 'hedge_b': 27, 'bench_a': 42, 'bench_b': 40, 'bench_c': 41, 'fence': 48, 'bin': 44}
pcells = [psp[i] for i in SCENES] + [psp[i] for i in PROPS.values()]
a, m = shelf_pack(pcells, 1500); save_png(a, 'parks.png', 250)
pm = {'scenes': m[:len(SCENES)], 'props': {k: m[len(SCENES) + j] for j, k in enumerate(PROPS)}}
with open(os.path.join(ROOT, 'src', 'city-meta3.js'), 'w') as f:
    f.write("'use strict';\n// generated by tools/build_city_assets2.py\nconst CITY_PARKS_SRC='assets/city/parks.png';\nconst CITY_PARKS=" + json.dumps(pm, separators=(',', ':')) + ";\n")
print('park scenes', len(SCENES), [pboxes[i][2:] for i in SCENES][:16], 'props', len(PROPS), 'atlas', a.shape)
