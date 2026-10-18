"""Segmentation helpers for NULL_CITY_NEW_ASSETS_PACK (dark-background and light-background sheets)."""
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image

def load(p): return np.array(Image.open(p).convert('RGB'))

def comps_from_mask(fg, min_area, grow=2):
    f = cv2.dilate(fg.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=grow)
    lab, n = ndi.label(f)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if ((lab[sl] == i) & fg[sl]).sum() < min_area: continue
        out.append((sl[1].start, sl[0].start, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start))
    return out

# ---------------------------------------------------------------- dark background (buildings, vehicles)
def dark_sheet(rgb, thr=20, shadow=False, min_area=2500):
    bg = np.median(np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3)]), 0)
    d = np.abs(rgb.astype(int) - bg).sum(2)
    V = rgb.max(2).astype(int)
    body = (d > thr) & (V >= (36 if shadow else 0))
    body = ndi.binary_opening(body, structure=np.ones((2, 2)))
    body = ndi.binary_closing(body, structure=np.ones((5, 5)))
    body = ndi.binary_fill_holes(body)
    # drop thin lines / specks, keep sprite-sized blobs
    boxes = comps_from_mask(body, min_area, grow=3)
    return rgb, body, bg, boxes

def cut_dark(rgb, body, bg, box, shadow=False, pad=14):
    x, y, w, h = box
    x0, y0 = max(0, x - pad), max(0, y - pad); x1, y1 = min(rgb.shape[1], x + w + pad), min(rgb.shape[0], y + h + pad)
    crop = rgb[y0:y1, x0:x1].astype(np.float32)
    m = body[y0:y1, x0:x1]
    lab, n = ndi.label(cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2))
    cx, cy = x - x0 + w // 2, y - y0 + h // 2
    keep = lab == lab[min(cy, lab.shape[0] - 1), min(cx, lab.shape[1] - 1)] if lab[min(cy, lab.shape[0] - 1), min(cx, lab.shape[1] - 1)] else lab > 0
    solid = cv2.dilate((m & keep).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool)  # keeps the black outline
    alpha = solid.astype(np.float32) * 255
    if shadow:
        bgV = bg.max()
        V = crop.max(2)
        near = cv2.dilate(solid.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=12).astype(bool)
        sh = np.clip((bgV - V) / bgV, 0, 1) * 230
        sh[V > bgV] = 0
        alpha = np.where(solid, 255, np.where(near, sh, 0))
        crop = np.where(solid[..., None], crop, 0)
    rgba = np.dstack([crop, alpha]).astype(np.uint8)
    ys, xs = np.where(rgba[..., 3] > 8)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# ---------------------------------------------------------------- light background (characters, parks)
def light_sheet(rgb, min_area=400):
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    cand = (mn >= 170) & ((mx - mn) <= 26)
    lab, _ = ndi.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    near = cv2.dilate((~fg).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2).astype(bool)
    fg &= ~(near & (mn >= 125) & ((mx - mn) <= 40))
    fg = ndi.binary_opening(fg, structure=np.ones((2, 2)))
    return fg, comps_from_mask(fg, min_area, grow=2)

def cut_light(rgb, fg, box):
    x, y, w, h = box
    m = fg[y:y + h, x:x + w]
    lab, n = ndi.label(m)
    if n > 1:
        s = ndi.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(s)))
    rgba = np.dstack([rgb[y:y + h, x:x + w], (m * 255).astype(np.uint8)])
    ys, xs = np.where(m)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
