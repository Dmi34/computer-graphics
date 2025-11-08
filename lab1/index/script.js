"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const previewSwatch = $("preview-swatch");
  const colorPicker = $("color-picker");

  const rgb = {
    r: $("rgb-r"),
    g: $("rgb-g"),
    b: $("rgb-b"),
    rRange: $("rgb-r-range"),
    gRange: $("rgb-g-range"),
    bRange: $("rgb-b-range"),
  };

  const cmyk = {
    c: $("cmyk-c"),
    m: $("cmyk-m"),
    y: $("cmyk-y"),
    k: $("cmyk-k"),
    cRange: $("cmyk-c-range"),
    mRange: $("cmyk-m-range"),
    yRange: $("cmyk-y-range"),
    kRange: $("cmyk-k-range"),
  };

  const hsv = {
    h: $("hsv-h"),
    s: $("hsv-s"),
    v: $("hsv-v"),
    hRange: $("hsv-h-range"),
    sRange: $("hsv-s-range"),
    vRange: $("hsv-v-range"),
  };

  const HUE_GRADIENT =
    "linear-gradient(to right," +
    "rgb(255,0,0) 0%," +
    "rgb(255,255,0) 17%," +
    "rgb(0,255,0) 33%," +
    "rgb(0,255,255) 50%," +
    "rgb(0,0,255) 67%," +
    "rgb(255,0,255) 83%," +
    "rgb(255,0,0) 100%)";

  let isSyncing = false;

  const currentColor = {
    rgb: { r: 255, g: 0, b: 0 },
    cmyk: { c: 0, m: 100, y: 100, k: 0 },
    hsv: { h: 0, s: 100, v: 100 },
    hex: "#ff0000",
  };

  const clamp = (value, min, max) => {
    let v = Number(value);
    if (Number.isNaN(v)) v = 0;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  };

  const linkNumberAndRange = (numberEl, rangeEl, min, max, onChange) => {
    numberEl.addEventListener("input", () => {
      const v = clamp(numberEl.value, min, max);
      numberEl.value = v;
      rangeEl.value = v;
      if (!isSyncing) onChange();
    });

    rangeEl.addEventListener("input", () => {
      const v = clamp(rangeEl.value, min, max);
      rangeEl.value = v;
      numberEl.value = v;
      if (!isSyncing) onChange();
    });
  };

  const ColorMath = {
    rgbToCmyk(r, g, b) {
      const rp = r / 255;
      const gp = g / 255;
      const bp = b / 255;

      const k = 1 - Math.max(rp, gp, bp);
      if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };

      const c = (1 - rp - k) / (1 - k);
      const m = (1 - gp - k) / (1 - k);
      const y = (1 - bp - k) / (1 - k);

      return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100),
      };
    },

    cmykToRgb(c100, m100, y100, k100) {
      const c = c100 / 100;
      const m = m100 / 100;
      const y = y100 / 100;
      const k = k100 / 100;

      const r = Math.round(255 * (1 - c) * (1 - k));
      const g = Math.round(255 * (1 - m) * (1 - k));
      const b = Math.round(255 * (1 - y) * (1 - k));

      return { r, g, b };
    },

    rgbToHsv(r, g, b) {
      const rp = r / 255;
      const gp = g / 255;
      const bp = b / 255;

      const max = Math.max(rp, gp, bp);
      const min = Math.min(rp, gp, bp);
      const delta = max - min;

      let h = 0;
      const v = max;
      let s = max === 0 ? 0 : delta / max;

      if (delta !== 0) {
        if (max === rp) {
          h = ((gp - bp) / delta) % 6;
        } else if (max === gp) {
          h = (bp - rp) / delta + 2;
        } else {
          h = (rp - gp) / delta + 4;
        }
        h *= 60;
        if (h < 0) h += 360;
      }

      return {
        h: Math.round(h),
        s: Math.round(s * 100),
        v: Math.round(v * 100),
      };
    },

    hsvToRgb(h, s100, v100) {
      const s = s100 / 100;
      const v = v100 / 100;
      const hh = (((h % 360) + 360) % 360) / 60;

      const i = Math.floor(hh);
      const f = hh - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      let r, g, b;
      switch (i) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        default:
          r = v;
          g = p;
          b = q;
      }

      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      };
    },

    rgbToHex(r, g, b) {
      const toHex = (v) => v.toString(16).padStart(2, "0");
      return "#" + toHex(r) + toHex(g) + toHex(b);
    },

    hexToRgb(hexString) {
      if (!hexString) return null;
      let hex = hexString.trim();
      if (hex.startsWith("#")) hex = hex.slice(1);
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
      const n = parseInt(hex, 16);
      const r = (n >> 16) & 0xff;
      const g = (n >> 8) & 0xff;
      const b = n & 0xff;
      return { r, g, b };
    },
  };

  const rgbCss = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

  function setColorFromRgb(r, g, b, options = {}) {
    isSyncing = true;

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    const rgbVals = { r, g, b };

    rgb.r.value = r;
    rgb.g.value = g;
    rgb.b.value = b;
    rgb.rRange.value = r;
    rgb.gRange.value = g;
    rgb.bRange.value = b;

    const cmykVal = options.cmykOverride ?? ColorMath.rgbToCmyk(r, g, b);
    cmyk.c.value = cmykVal.c;
    cmyk.m.value = cmykVal.m;
    cmyk.y.value = cmykVal.y;
    cmyk.k.value = cmykVal.k;
    cmyk.cRange.value = cmykVal.c;
    cmyk.mRange.value = cmykVal.m;
    cmyk.yRange.value = cmykVal.y;
    cmyk.kRange.value = cmykVal.k;

    const hsvVal = ColorMath.rgbToHsv(r, g, b);
    hsv.h.value = hsvVal.h;
    hsv.s.value = hsvVal.s;
    hsv.v.value = hsvVal.v;
    hsv.hRange.value = hsvVal.h;
    hsv.sRange.value = hsvVal.s;
    hsv.vRange.value = hsvVal.v;

    const hex = ColorMath.rgbToHex(r, g, b).toLowerCase();
    currentColor.hex = hex;
    if (colorPicker) {
      colorPicker.value = hex;
    }

    const rgbString = rgbCss(r, g, b);
    previewSwatch.style.background = rgbString;

    document.body.style.background = `radial-gradient(circle at top, rgba(${r}, ${g}, ${b}, 0.28) 0, #f9fafb 55%, #e5e7eb 100%)`;

    currentColor.rgb = rgbVals;
    currentColor.cmyk = cmykVal;
    currentColor.hsv = hsvVal;

    updateGradients(rgbVals, cmykVal, hsvVal);

    isSyncing = false;
  }

  function handleRgbChange() {
    if (isSyncing) return;
    const r = clamp(rgb.r.value, 0, 255);
    const g = clamp(rgb.g.value, 0, 255);
    const b = clamp(rgb.b.value, 0, 255);
    setColorFromRgb(r, g, b);
  }

  function handleCmykChange() {
    if (isSyncing) return;
    const c = clamp(cmyk.c.value, 0, 100);
    const m = clamp(cmyk.m.value, 0, 100);
    const y = clamp(cmyk.y.value, 0, 100);
    const k = clamp(cmyk.k.value, 0, 100);
    const { r, g, b } = ColorMath.cmykToRgb(c, m, y, k);
    setColorFromRgb(r, g, b, { cmykOverride: { c, m, y, k } });
  }

  function handleHsvChange() {
    if (isSyncing) return;
    const h = clamp(hsv.h.value, 0, 360);
    const s = clamp(hsv.s.value, 0, 100);
    const v = clamp(hsv.v.value, 0, 100);
    const { r, g, b } = ColorMath.hsvToRgb(h, s, v);
    setColorFromRgb(r, g, b);
  }

  function handleColorPickerChange() {
    if (isSyncing) return;
    const parsed = ColorMath.hexToRgb(colorPicker.value);
    if (!parsed) return;
    setColorFromRgb(parsed.r, parsed.g, parsed.b);
  }

  function updateRgbGradients(rgbVals) {
    const { r, g, b } = rgbVals;

    rgb.rRange.style.background = `linear-gradient(to right, ${rgbCss(
      0,
      g,
      b
    )}, ${rgbCss(255, g, b)})`;

    rgb.gRange.style.background = `linear-gradient(to right, ${rgbCss(
      r,
      0,
      b
    )}, ${rgbCss(r, 255, b)})`;

    rgb.bRange.style.background = `linear-gradient(to right, ${rgbCss(
      r,
      g,
      0
    )}, ${rgbCss(r, g, 255)})`;
  }

  function updateCmykGradients(cmykVals) {
    const base = cmykVals;

    const c0 = ColorMath.cmykToRgb(0, base.m, base.y, base.k);
    const c100 = ColorMath.cmykToRgb(100, base.m, base.y, base.k);
    cmyk.cRange.style.background = `linear-gradient(to right, ${rgbCss(
      c0.r,
      c0.g,
      c0.b
    )}, ${rgbCss(c100.r, c100.g, c100.b)})`;

    const m0 = ColorMath.cmykToRgb(base.c, 0, base.y, base.k);
    const m100 = ColorMath.cmykToRgb(base.c, 100, base.y, base.k);
    cmyk.mRange.style.background = `linear-gradient(to right, ${rgbCss(
      m0.r,
      m0.g,
      m0.b
    )}, ${rgbCss(m100.r, m100.g, m100.b)})`;

    const y0 = ColorMath.cmykToRgb(base.c, base.m, 0, base.k);
    const y100 = ColorMath.cmykToRgb(base.c, base.m, 100, base.k);
    cmyk.yRange.style.background = `linear-gradient(to right, ${rgbCss(
      y0.r,
      y0.g,
      y0.b
    )}, ${rgbCss(y100.r, y100.g, y100.b)})`;

    const k0 = ColorMath.cmykToRgb(base.c, base.m, base.y, 0);
    const k100 = ColorMath.cmykToRgb(base.c, base.m, base.y, 100);
    cmyk.kRange.style.background = `linear-gradient(to right, ${rgbCss(
      k0.r,
      k0.g,
      k0.b
    )}, ${rgbCss(k100.r, k100.g, k100.b)})`;
  }

  function updateHsvGradients(hsvVals) {
    const { h, s, v } = hsvVals;

    const s0 = ColorMath.hsvToRgb(h, 0, v);
    const s100 = ColorMath.hsvToRgb(h, 100, v);
    hsv.sRange.style.background = `linear-gradient(to right, ${rgbCss(
      s0.r,
      s0.g,
      s0.b
    )}, ${rgbCss(s100.r, s100.g, s100.b)})`;

    const v0 = ColorMath.hsvToRgb(h, s, 0);
    const v100 = ColorMath.hsvToRgb(h, s, 100);
    hsv.vRange.style.background = `linear-gradient(to right, ${rgbCss(
      v0.r,
      v0.g,
      v0.b
    )}, ${rgbCss(v100.r, v100.g, v100.b)})`;
  }

  function updateGradients(rgbVals, cmykVals, hsvVals) {
    updateRgbGradients(rgbVals);
    updateCmykGradients(cmykVals);
    updateHsvGradients(hsvVals);
  }

  function getFormattedColor(format) {
    switch (format) {
      case "rgb": {
        const { r, g, b } = currentColor.rgb;
        return `rgb(${r}, ${g}, ${b})`;
      }
      case "cmyk": {
        const { c, m, y, k } = currentColor.cmyk;
        return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
      }
      case "hsv": {
        const { h, s, v } = currentColor.hsv;
        return `hsv(${h}, ${s}%, ${v}%)`;
      }
      default:
        return "";
    }
  }

  function setupCopyButtons() {
    const buttons = document.querySelectorAll(".btn--panel-copy");
    buttons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const format = btn.dataset.format;
        const text = getFormattedColor(format);
        if (!text) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            const original = btn.textContent;
            btn.textContent = "скопировано!";
            setTimeout(() => {
              btn.textContent = original;
            }, 900);
          }
        } catch {}
      });
    });
  }

  linkNumberAndRange(rgb.r, rgb.rRange, 0, 255, handleRgbChange);
  linkNumberAndRange(rgb.g, rgb.gRange, 0, 255, handleRgbChange);
  linkNumberAndRange(rgb.b, rgb.bRange, 0, 255, handleRgbChange);

  linkNumberAndRange(cmyk.c, cmyk.cRange, 0, 100, handleCmykChange);
  linkNumberAndRange(cmyk.m, cmyk.mRange, 0, 100, handleCmykChange);
  linkNumberAndRange(cmyk.y, cmyk.yRange, 0, 100, handleCmykChange);
  linkNumberAndRange(cmyk.k, cmyk.kRange, 0, 100, handleCmykChange);

  linkNumberAndRange(hsv.h, hsv.hRange, 0, 360, handleHsvChange);
  linkNumberAndRange(hsv.s, hsv.sRange, 0, 100, handleHsvChange);
  linkNumberAndRange(hsv.v, hsv.vRange, 0, 100, handleHsvChange);

  if (colorPicker) {
    colorPicker.addEventListener("input", handleColorPickerChange);
  }

  hsv.hRange.style.background = HUE_GRADIENT;

  setupCopyButtons();

  setColorFromRgb(255, 0, 0);
});
