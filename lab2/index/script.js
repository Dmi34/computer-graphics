(() => {
  "use strict";

  const presetImages = [
    {
      label: "Капибара в пончике (гауссовский шум)",
      short: "Капибара в пончике (гауссовский шум)",
      src: "images/noisy_gaussian_1.png",
    },
    {
      label: "Грустный Якубович (гауссовский шум)",
      short: "Грустный Якубович (гауссовский шум)",
      src: "images/noisy_gaussian_2.png",
    },
    {
      label: "Галантный котик (шум соли и перца)",
      short: "Галантный котик (шум соли и перца)",
      src: "images/noisy_salt_pepper_1.png",
    },
    {
      label: "Кошка-девочка (шум соли и перца)",
      short: "Кошка-девочка (шум соли и перца)",
      src: "images/noisy_salt_pepper_2.png",
    },
    {
      label: "Экзистенция на Зыбицкой (низкая контрастность, тёмное)",
      short: "Экзистенция на Зыбицкой (низкая контрастность, тёмное)",
      src: "images/low_contrast_dark_1.png",
    },
    {
      label: "Мохнатый боец (низкая контрастность, тёмное)",
      short: "Мохнатый боец (низкая контрастность, тёмное)",
      src: "images/low_contrast_dark_2.png",
    },
    {
      label: "Радостный солдат (низкая контрастность, яркое)",
      short: "Радостный солдат (низкая контрастность, яркое)",
      src: "images/low_contrast_bright_1.png",
    },
    {
      label: "Весёлый минский дом (низкая контрастность, туман)",
      short: "Весёлый минский дом (низкая контрастность, туман)",
      src: "images/low_contrast_foggy_1.png",
    },
    {
      label: "Лучший вид отдыха (плоские цветовые области)",
      short: "Лучший вид отдыха (плоские цветовые области)",
      src: "images/color_flat_areas_1.png",
    },
    {
      label: "Позитивный тюлень (плоские цветовые области)",
      short: "Позитивный тюлень (плоские цветовые области)",
      src: "images/color_flat_areas_2.png",
    },
  ];

  let originalCanvas, originalCtx;
  let processedCanvas, processedCtx;
  let histogramCanvas, histogramCtx;

  let originalImageData = null;
  let currentImageData = null;
  let lastImageData = null;

  let presetSelectEl = null;
  let presetShortLabelEl = null;

  const MAX_WIDTH = 1000;
  const MAX_HEIGHT = 450;
  const HIST_EQ_STRENGTH = 0.65;

  window.addEventListener("DOMContentLoaded", init);

  function init() {
    originalCanvas = document.getElementById("originalCanvas");
    processedCanvas = document.getElementById("processedCanvas");
    histogramCanvas = document.getElementById("histogramCanvas");

    if (!originalCanvas || !processedCanvas || !histogramCanvas) {
      console.error("Не найдены canvas-элементы.");
      return;
    }

    originalCtx = originalCanvas.getContext("2d");
    processedCtx = processedCanvas.getContext("2d");
    histogramCtx = histogramCanvas.getContext("2d");

    presetSelectEl = document.getElementById("presetSelect");
    presetShortLabelEl = document.getElementById("presetShortLabel");

    const loadPresetBtn = document.getElementById("loadPresetBtn");
    const fileInput = document.getElementById("fileInput");

    const applySmoothingBtn = document.getElementById("applySmoothingBtn");
    const linearContrastBtn = document.getElementById("linearContrastBtn");
    const histEqRgbBtn = document.getElementById("histEqRgbBtn");
    const histEqHsvBtn = document.getElementById("histEqHsvBtn");

    const undoBtn = document.getElementById("undoBtn");
    const resetBtn = document.getElementById("resetBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const copyBtn = document.getElementById("copyBtn");

    if (presetSelectEl) {
      presetImages.forEach((img, index) => {
        const opt = document.createElement("option");
        opt.value = img.src;
        opt.textContent = img.label;
        if (index === 0) opt.selected = true;
        presetSelectEl.appendChild(opt);
      });

      updatePresetShortLabel();
      presetSelectEl.addEventListener("change", updatePresetShortLabel);
    }

    if (loadPresetBtn) {
      loadPresetBtn.addEventListener("click", () => {
        if (!presetSelectEl) return;
        const src = presetSelectEl.value;
        if (src) loadImageFromUrl(src);
      });
    }

    if (presetImages.length > 0) {
      loadImageFromUrl(presetImages[0].src);
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => drawImageToCanvases(img);
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (applySmoothingBtn) {
      applySmoothingBtn.addEventListener("click", () => {
        applyTransform(applySmoothing);
      });
    }

    if (linearContrastBtn) {
      linearContrastBtn.addEventListener("click", () => {
        applyTransform(applyLinearContrastHSV);
      });
    }

    if (histEqRgbBtn) {
      histEqRgbBtn.addEventListener("click", () => {
        applyTransform(applyHistogramEqualizationRGB);
      });
    }

    if (histEqHsvBtn) {
      histEqHsvBtn.addEventListener("click", () => {
        applyTransform(applyHistogramEqualizationHSVValue);
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener("click", undoLastChange);
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", resetToOriginal);
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", downloadProcessedImage);
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", copyProcessedImageToClipboard);
    }
  }

  function updatePresetShortLabel() {
    if (!presetSelectEl || !presetShortLabelEl) return;
    const idx = presetSelectEl.selectedIndex;
    if (idx < 0 || idx >= presetImages.length) {
      presetShortLabelEl.textContent = "";
      presetShortLabelEl.title = "";
      return;
    }
    const img = presetImages[idx];
    presetShortLabelEl.textContent = img.short || img.label;
    presetShortLabelEl.title = img.label;
  }

  function loadImageFromUrl(url) {
    const img = new Image();
    img.onload = () => drawImageToCanvases(img);
    img.onerror = () => {
      alert("Не удалось загрузить изображение: " + url);
    };
    img.src = url;
  }

  function drawImageToCanvases(img) {
    const ratio = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    originalCanvas.width = w;
    originalCanvas.height = h;
    processedCanvas.width = w;
    processedCanvas.height = h;

    originalCtx.clearRect(0, 0, w, h);
    processedCtx.clearRect(0, 0, w, h);

    originalCtx.drawImage(img, 0, 0, w, h);

    originalImageData = originalCtx.getImageData(0, 0, w, h);
    const copy = cloneImageData(originalImageData);
    lastImageData = null;
    setCurrentImageData(copy);
  }

  function cloneImageData(imageData) {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  function setCurrentImageData(imageData) {
    currentImageData = imageData;
    processedCtx.putImageData(imageData, 0, 0);
    updateHistogram(imageData);
  }

  function applyTransform(transformFn) {
    if (!currentImageData) return;
    const prev = cloneImageData(currentImageData);
    const next = transformFn(currentImageData);
    if (!next) return;
    lastImageData = prev;
    setCurrentImageData(next);
  }

  function undoLastChange() {
    if (!lastImageData) return;
    const now = currentImageData ? cloneImageData(currentImageData) : null;
    const prev = lastImageData;
    lastImageData = now;
    setCurrentImageData(prev);
  }

  function resetToOriginal() {
    if (!originalImageData) return;
    if (currentImageData) {
      lastImageData = cloneImageData(currentImageData);
    }
    const copy = cloneImageData(originalImageData);
    setCurrentImageData(copy);
  }

  function updateHistogram(imageData) {
    if (!imageData) return;

    const data = imageData.data;
    const hist = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      hist[luminance]++;
    }

    const maxVal = hist.reduce((m, v) => (v > m ? v : m), 0) || 1;
    const w = histogramCanvas.width;
    const h = histogramCanvas.height;

    histogramCtx.clearRect(0, 0, w, h);

    histogramCtx.fillStyle = "#f9fafb";
    histogramCtx.fillRect(0, 0, w, h);

    histogramCtx.strokeStyle = "#e5e7eb";
    histogramCtx.beginPath();
    histogramCtx.moveTo(0, h - 0.5);
    histogramCtx.lineTo(w, h - 0.5);
    histogramCtx.stroke();

    histogramCtx.fillStyle = "#6366f1";
    const step = w / 256;
    for (let x = 0; x < 256; x++) {
      const v = hist[x];
      const barHeight = (v / maxVal) * (h - 8);
      const y = h - barHeight;
      histogramCtx.fillRect(x * step, y, Math.max(1, step), barHeight);
    }
  }

  function applySmoothing(imageData) {
    const select = document.getElementById("smoothingSelect");
    if (!select) return null;
    const type = select.value;

    let kernel;
    if (type === "mean3") {
      kernel = createBoxKernel(3);
    } else if (type === "mean5") {
      kernel = createBoxKernel(5);
    } else if (type === "gauss3") {
      kernel = createGaussian3x3Kernel();
    } else {
      return null;
    }
    return convolve(imageData, kernel);
  }

  function createBoxKernel(size) {
    const n = size * size;
    const value = 1.0 / n;
    const kernel = new Float32Array(n);
    for (let i = 0; i < n; i++) kernel[i] = value;
    return { size, data: kernel };
  }

  function createGaussian3x3Kernel() {
    const values = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const sum = values.reduce((a, b) => a + b, 0);
    const kernel = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      kernel[i] = values[i] / sum;
    }
    return { size: 3, data: kernel };
  }

  function convolve(imageData, kernel) {
    const { width, height, data: src } = imageData;
    const dst = new Uint8ClampedArray(src.length);

    const k = kernel.data;
    const kSize = kernel.size;
    const half = Math.floor(kSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0;
        const dstIndex = (y * width + x) * 4;

        for (let ky = 0; ky < kSize; ky++) {
          const ny = clamp(y + ky - half, 0, height - 1);
          for (let kx = 0; kx < kSize; kx++) {
            const nx = clamp(x + kx - half, 0, width - 1);
            const srcIndex = (ny * width + nx) * 4;
            const w = k[ky * kSize + kx];

            r += src[srcIndex] * w;
            g += src[srcIndex + 1] * w;
            b += src[srcIndex + 2] * w;
          }
        }

        dst[dstIndex] = r;
        dst[dstIndex + 1] = g;
        dst[dstIndex + 2] = b;
        dst[dstIndex + 3] = src[dstIndex + 3];
      }
    }

    return new ImageData(dst, width, height);
  }

  function applyLinearContrastHSV(imageData) {
    const { width, height, data } = imageData;
    const totalPixels = width * height;

    const histV = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.max(data[i], data[i + 1], data[i + 2]) | 0;
      histV[v]++;
    }

    const clipLow = 0.01;
    const clipHigh = 0.01;
    const lowCount = totalPixels * clipLow;
    const highCount = totalPixels * (1 - clipHigh);

    let cumulative = 0;
    let vLow = 0;
    let vHigh = 255;

    for (let i = 0; i < 256; i++) {
      cumulative += histV[i];
      if (cumulative >= lowCount) {
        vLow = i;
        break;
      }
    }

    cumulative = 0;
    for (let i = 0; i < 256; i++) {
      cumulative += histV[i];
      if (cumulative >= highCount) {
        vHigh = i;
        break;
      }
    }

    if (vHigh <= vLow) {
      return cloneImageData(imageData);
    }

    const scale = 1.0 / (vHigh - vLow);
    const dst = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [h, s, v] = rgbToHsv(r, g, b);
      let oldV = v * 255.0;
      let newV255 = (oldV - vLow) * scale * 255.0;
      newV255 = clamp(newV255, 0, 255);
      const newV = newV255 / 255.0;

      const [nr, ng, nb] = hsvToRgb(h, s, newV);

      dst[i] = nr;
      dst[i + 1] = ng;
      dst[i + 2] = nb;
      dst[i + 3] = data[i + 3];
    }

    return new ImageData(dst, width, height);
  }

  function applyHistogramEqualizationRGB(imageData) {
    const { width, height, data } = imageData;
    const dst = new Uint8ClampedArray(data.length);

    const totalPixels = width * height;

    const histR = new Array(256).fill(0);
    const histG = new Array(256).fill(0);
    const histB = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      histR[data[i]]++;
      histG[data[i + 1]]++;
      histB[data[i + 2]]++;
    }

    const lutR = buildEqualizationLUT(histR, totalPixels);
    const lutG = buildEqualizationLUT(histG, totalPixels);
    const lutB = buildEqualizationLUT(histB, totalPixels);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const eqR = lutR[r];
      const eqG = lutG[g];
      const eqB = lutB[b];

      dst[i] = Math.round(HIST_EQ_STRENGTH * eqR + (1 - HIST_EQ_STRENGTH) * r);
      dst[i + 1] = Math.round(
        HIST_EQ_STRENGTH * eqG + (1 - HIST_EQ_STRENGTH) * g
      );
      dst[i + 2] = Math.round(
        HIST_EQ_STRENGTH * eqB + (1 - HIST_EQ_STRENGTH) * b
      );
      dst[i + 3] = data[i + 3];
    }

    return new ImageData(dst, width, height);
  }

  function applyHistogramEqualizationHSVValue(imageData) {
    const { width, height, data } = imageData;
    const dst = new Uint8ClampedArray(data.length);

    const totalPixels = width * height;
    const hist = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const v = Math.max(r, g, b);
      const idx = v | 0;
      hist[idx]++;
    }

    const lutV = buildEqualizationLUT(hist, totalPixels);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [h, s, v] = rgbToHsv(r, g, b);
      const oldVIndex = clamp(Math.round(v * 255), 0, 255);
      const newV = lutV[oldVIndex] / 255.0;

      const [er, eg, eb] = hsvToRgb(h, s, newV);

      dst[i] = Math.round(HIST_EQ_STRENGTH * er + (1 - HIST_EQ_STRENGTH) * r);
      dst[i + 1] = Math.round(
        HIST_EQ_STRENGTH * eg + (1 - HIST_EQ_STRENGTH) * g
      );
      dst[i + 2] = Math.round(
        HIST_EQ_STRENGTH * eb + (1 - HIST_EQ_STRENGTH) * b
      );
      dst[i + 3] = data[i + 3];
    }

    return new ImageData(dst, width, height);
  }

  function buildEqualizationLUT(hist, totalPixels) {
    const lut = new Uint8Array(256);
    const cdf = new Array(256);
    let cumulative = 0;

    for (let i = 0; i < 256; i++) {
      cumulative += hist[i];
      cdf[i] = cumulative;
    }

    const total = totalPixels || cdf[255] || 1;

    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    if (cdfMin === 0 || cdfMin === total) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    const denom = total - cdfMin;

    for (let i = 0; i < 256; i++) {
      let val = (cdf[i] - cdfMin) / denom;
      if (val < 0) val = 0;
      if (val > 1) val = 1;
      lut[i] = Math.round(val * 255);
    }

    return lut;
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : d / max;

    if (d !== 0) {
      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h /= 6;
    }

    return [h, s, v];
  }

  function hsvToRgb(h, s, v) {
    let r, g, b;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
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
      case 5:
      default:
        r = v;
        g = p;
        b = q;
        break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function downloadProcessedImage() {
    if (!processedCanvas) return;
    const link = document.createElement("a");
    link.href = processedCanvas.toDataURL("image/png");
    link.download = "processed_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copyProcessedImageToClipboard() {
    if (!processedCanvas) return;

    if (typeof ClipboardItem === "undefined" || !navigator.clipboard) {
      alert(
        "Копирование не поддерживается этим браузером. Используйте скачивание."
      );
      return;
    }

    processedCanvas.toBlob((blob) => {
      if (!blob) {
        alert("Не удалось получить данные изображения.");
        return;
      }
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard
        .write([item])
        .then(() => {
          alert("Изображение скопировано в буфер обмена.");
        })
        .catch((err) => {
          console.error(err);
          alert("Не удалось скопировать изображение. Используйте скачивание.");
        });
    }, "image/png");
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }
})();
