"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("viewport");
  const ctx = canvas.getContext("2d");

  const segmentsInput = document.getElementById("segmentsInput");
  const rectInput = document.getElementById("rectInput");
  const polygonInput = document.getElementById("polygonInput");

  const btnLiang = document.getElementById("btnLiang");
  const btnPolygon = document.getElementById("btnPolygon");
  const btnReset = document.getElementById("btnReset");
  const statusEl = document.getElementById("status");

  const EPS = 1e-9;
  const floatRe = /[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

  const state = {
    mode: "empty",
    segments: [],
    rect: null,
    polygonEdges: null,
  };

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("error", !!isError);
  }

  function extractNumbers(line) {
    const matches = line.match(floatRe);
    return matches ? matches.map(Number) : [];
  }

  function parseSegments(text) {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new Error("Введите хотя бы один отрезок.");
    }

    let idx = 0;
    let n;
    const firstNums = extractNumbers(lines[0]);

    if (firstNums.length === 1 && lines.length - 1 >= firstNums[0]) {
      n = firstNums[0] | 0;
      idx = 1;
    } else {
      n = lines.length;
      idx = 0;
    }

    const segments = [];

    for (let i = 0; i < n; i++) {
      const line = lines[idx + i];
      if (!line) {
        throw new Error(
          `Не хватает строк с отрезками: ожидалось ${n}, есть ${i}.`
        );
      }
      const nums = extractNumbers(line);
      if (nums.length < 4) {
        throw new Error(
          `Строка с отрезком №${
            i + 1
          } должна содержать как минимум 4 числа (x0, a, y0, b).`
        );
      }
      const x0 = nums[0];
      const a = nums[1];
      const y0 = nums[2];
      const b = nums[3];
      const x1 = x0 + a;
      const y1 = y0 + b;
      segments.push({ x0, y0, x1, y1 });
    }

    return segments;
  }

  function parseRect(text) {
    const nums = extractNumbers(text);
    if (nums.length < 4) {
      throw new Error(
        "Для прямоугольного окна нужно ввести 4 числа: Xmin Ymin Xmax Ymax."
      );
    }
    let [xmin, ymin, xmax, ymax] = nums;
    if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
    if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
    if (Math.abs(xmax - xmin) < EPS || Math.abs(ymax - ymin) < EPS) {
      throw new Error(
        "Прямоугольное окно вырождено (Xmin ≠ Xmax, Ymin ≠ Ymax)."
      );
    }
    return { xmin, ymin, xmax, ymax };
  }

  function parsePolygon(text) {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new Error("Введите хотя бы одну сторону многоугольника.");
    }

    let idx = 0;
    let m;
    const firstNums = extractNumbers(lines[0]);

    if (firstNums.length === 1 && lines.length - 1 >= firstNums[0]) {
      m = firstNums[0] | 0;
      idx = 1;
    } else {
      m = lines.length;
      idx = 0;
    }

    const edges = [];

    for (let i = 0; i < m; i++) {
      const line = lines[idx + i];
      if (!line) {
        throw new Error(
          `Не хватает строк со сторонами многоугольника: ожидалось ${m}, есть ${i}.`
        );
      }
      const nums = extractNumbers(line);
      if (nums.length < 4) {
        throw new Error(
          `Строка со стороной №${i + 1} должна содержать 4 числа: X1 Y1 X2 Y2.`
        );
      }
      const [x1, y1, x2, y2] = nums;
      edges.push({ x1, y1, x2, y2 });
    }

    if (edges.length < 3) {
      throw new Error("Выпуклый многоугольник должен иметь минимум 3 стороны.");
    }

    return edges;
  }

  function liangBarskyClipSegment(seg, rect) {
    const x0 = seg.x0;
    const y0 = seg.y0;
    const dx = seg.x1 - seg.x0;
    const dy = seg.y1 - seg.y0;

    let t0 = 0;
    let t1 = 1;

    const p = [-dx, dx, -dy, dy];
    const q = [x0 - rect.xmin, rect.xmax - x0, y0 - rect.ymin, rect.ymax - y0];

    for (let i = 0; i < 4; i++) {
      const pi = p[i];
      const qi = q[i];

      if (Math.abs(pi) < EPS) {
        if (qi < 0) {
          return null;
        }
      } else {
        const r = qi / pi;
        if (pi < 0) {
          if (r > t1) return null;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return null;
          if (r < t1) t1 = r;
        }
      }
    }

    const x0c = x0 + t0 * dx;
    const y0c = y0 + t0 * dy;
    const x1c = x0 + t1 * dx;
    const y1c = y0 + t1 * dy;

    return { x0: x0c, y0: y0c, x1: x1c, y1: y1c };
  }

  function computePolygonOrientation(edges) {
    const vertices = edges.map((e) => ({ x: e.x1, y: e.y1 }));
    const n = vertices.length;
    if (n < 3) return 1;

    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;
      area += xi * yj - xj * yi;
    }
    return area >= 0 ? 1 : -1;
  }

  function cyrusBeckClipSegment(seg, edges, orientation) {
    const P0 = { x: seg.x0, y: seg.y0 };
    const P1 = { x: seg.x1, y: seg.y1 };
    const D = { x: P1.x - P0.x, y: P1.y - P0.y };

    let tE = 0;
    let tL = 1;

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const ex = e.x2 - e.x1;
      const ey = e.y2 - e.y1;

      const nx = -orientation * ey;
      const ny = orientation * ex;

      const Wx = P0.x - e.x1;
      const Wy = P0.y - e.y1;

      const num = nx * Wx + ny * Wy;
      const denom = nx * D.x + ny * D.y;

      if (Math.abs(denom) < EPS) {
        if (num < 0) {
          return null;
        }
        continue;
      }

      const t = -num / denom;

      if (denom > 0) {
        if (t > tL) return null;
        if (t > tE) tE = t;
      } else {
        if (t < tE) return null;
        if (t < tL) tL = t;
      }
    }

    if (tE > tL) return null;

    const x0c = P0.x + tE * D.x;
    const y0c = P0.y + tE * D.y;
    const x1c = P0.x + tL * D.x;
    const y1c = P0.y + tL * D.y;

    return { x0: x0c, y0: y0c, x1: x1c, y1: y1c };
  }

  function niceStep(range) {
    if (!isFinite(range) || range <= 0) return 1;
    const rough = range / 8;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const frac = rough / pow10;
    let niceFrac;
    if (frac < 1.5) niceFrac = 1;
    else if (frac < 3) niceFrac = 2;
    else if (frac < 7) niceFrac = 5;
    else niceFrac = 10;
    return niceFrac * pow10;
  }

  function computeBounds(segments, rect, polygonEdges, extraSegments) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    function includePoint(x, y) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    (segments || []).forEach((s) => {
      includePoint(s.x0, s.y0);
      includePoint(s.x1, s.y1);
    });

    (extraSegments || []).forEach((s) => {
      includePoint(s.x0, s.y0);
      includePoint(s.x1, s.y1);
    });

    if (rect) {
      includePoint(rect.xmin, rect.ymin);
      includePoint(rect.xmax, rect.ymax);
    }

    (polygonEdges || []).forEach((e) => {
      includePoint(e.x1, e.y1);
      includePoint(e.x2, e.y2);
    });

    if (!isFinite(minX) || !isFinite(minY)) {
      minX = -10;
      maxX = 10;
      minY = -10;
      maxY = 10;
    }

    minX = Math.min(minX, 0);
    maxX = Math.max(maxX, 0);
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);

    if (Math.abs(maxX - minX) < EPS) {
      minX -= 1;
      maxX += 1;
    }
    if (Math.abs(maxY - minY) < EPS) {
      minY -= 1;
      maxY += 1;
    }

    const padFactor = 0.05;
    const padX = (maxX - minX) * padFactor;
    const padY = (maxY - minY) * padFactor;

    return {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minY - padY,
      maxY: maxY + padY,
    };
  }

  function makeTransform(canvas, bounds) {
    const padding = 50;
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    const scaleX = (canvas.width - 2 * padding) / w;
    const scaleY = (canvas.height - 2 * padding) / h;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding - bounds.minX * scale;
    const offsetY = canvas.height - padding + bounds.minY * scale;

    function worldToScreen(x, y) {
      return {
        x: offsetX + x * scale,
        y: offsetY - y * scale,
      };
    }

    return { scale, offsetX, offsetY, worldToScreen, padding, bounds };
  }

  function formatNumber(x) {
    if (Math.abs(x) < 1e-6) return "0";
    const abs = Math.abs(x);
    if (abs >= 1000 || abs < 0.01) return x.toExponential(1);
    const s = x.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function drawGridAndAxes(ctx, transform) {
    const { worldToScreen, bounds } = transform;
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const stepX = niceStep(rangeX);
    const stepY = niceStep(rangeY);

    const hasXAxis = bounds.minY <= 0 && bounds.maxY >= 0;
    const hasYAxis = bounds.minX <= 0 && bounds.maxX >= 0;

    ctx.save();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e0e0e0";

    let xStart = Math.ceil(bounds.minX / stepX) * stepX;
    for (let x = xStart; x <= bounds.maxX + 1e-9; x += stepX) {
      const p1 = worldToScreen(x, bounds.minY);
      const p2 = worldToScreen(x, bounds.maxY);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    let yStart = Math.ceil(bounds.minY / stepY) * stepY;
    for (let y = yStart; y <= bounds.maxY + 1e-9; y += stepY) {
      const p1 = worldToScreen(bounds.minX, y);
      const p2 = worldToScreen(bounds.maxX, y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#444";
    ctx.fillStyle = "#444";
    ctx.font =
      "11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    if (hasXAxis) {
      const p1 = worldToScreen(bounds.minX, 0);
      const p2 = worldToScreen(bounds.maxX, 0);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const arrowLen = 8;
      const arrowWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - arrowLen, p2.y - arrowWidth);
      ctx.lineTo(p2.x - arrowLen, p2.y + arrowWidth);
      ctx.closePath();
      ctx.fill();

      ctx.fillText("x", p2.x + 6, p2.y - 4);
    }

    if (hasYAxis) {
      const p1 = worldToScreen(0, bounds.minY);
      const p2 = worldToScreen(0, bounds.maxY);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const arrowLen = 8;
      const arrowWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - arrowWidth, p2.y + arrowLen);
      ctx.lineTo(p2.x + arrowWidth, p2.y + arrowLen);
      ctx.closePath();
      ctx.fill();

      ctx.fillText("y", p2.x + 4, p2.y + 14);
    }

    ctx.fillStyle = "#666";
    const axisYpx = hasXAxis ? worldToScreen(0, 0).y : canvas.height - 5;
    xStart = Math.ceil(bounds.minX / stepX) * stepX;
    for (let x = xStart; x <= bounds.maxX + 1e-9; x += stepX) {
      const p = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, axisYpx - 3);
      ctx.lineTo(p.x, axisYpx + 3);
      ctx.strokeStyle = "#888";
      ctx.stroke();

      ctx.fillText(formatNumber(x), p.x + 2, axisYpx + 11);
    }

    const axisXpx = hasYAxis ? worldToScreen(0, 0).x : 5;
    yStart = Math.ceil(bounds.minY / stepY) * stepY;
    for (let y = yStart; y <= bounds.maxY + 1e-9; y += stepY) {
      const p = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(axisXpx - 3, p.y);
      ctx.lineTo(axisXpx + 3, p.y);
      ctx.strokeStyle = "#888";
      ctx.stroke();

      ctx.fillText(formatNumber(y), axisXpx + 5, p.y - 3);
    }

    ctx.restore();
  }

  function drawRectWindow(ctx, rect, transform) {
    if (!rect) return;
    const { worldToScreen } = transform;
    const pMin = worldToScreen(rect.xmin, rect.ymin);
    const pMax = worldToScreen(rect.xmax, rect.ymax);

    const left = Math.min(pMin.x, pMax.x);
    const right = Math.max(pMin.x, pMax.x);
    const top = Math.min(pMin.y, pMax.y);
    const bottom = Math.max(pMin.y, pMax.y);
    const w = right - left;
    const h = bottom - top;

    ctx.save();
    ctx.fillStyle = "rgba(46, 204, 113, 0.06)";
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(left, top, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPolygon(ctx, edges, transform) {
    if (!edges || !edges.length) return;
    const { worldToScreen } = transform;

    ctx.save();
    ctx.fillStyle = "rgba(46, 204, 113, 0.06)";
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2;

    const first = worldToScreen(edges[0].x1, edges[0].y1);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const p2 = worldToScreen(e.x2, e.y2);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSegments(ctx, segments, transform, color, width, alpha) {
    if (!segments || !segments.length) return;
    const { worldToScreen } = transform;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha != null ? alpha : 1;

    for (const s of segments) {
      const p0 = worldToScreen(s.x0, s.y0);
      const p1 = worldToScreen(s.x1, s.y1);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawSceneLiang(segments, rect) {
    const clipped = [];
    for (const s of segments) {
      const c = liangBarskyClipSegment(s, rect);
      if (c) clipped.push(c);
    }

    const bounds = computeBounds(segments, rect, null, clipped);
    const transform = makeTransform(canvas, bounds);

    clearCanvas();
    drawGridAndAxes(ctx, transform);
    drawRectWindow(ctx, rect, transform);
    drawSegments(ctx, segments, transform, "#2980b9", 1.5, 0.8);
    drawSegments(ctx, clipped, transform, "#e74c3c", 3, 1);
  }

  function drawScenePolygon(segments, polygonEdges) {
    const orientation = computePolygonOrientation(polygonEdges);
    const clipped = [];

    for (const s of segments) {
      const c = cyrusBeckClipSegment(s, polygonEdges, orientation);
      if (c) clipped.push(c);
    }

    const bounds = computeBounds(segments, null, polygonEdges, clipped);
    const transform = makeTransform(canvas, bounds);

    clearCanvas();
    drawGridAndAxes(ctx, transform);
    drawPolygon(ctx, polygonEdges, transform);
    drawSegments(ctx, segments, transform, "#2980b9", 1.5, 0.8);
    drawSegments(ctx, clipped, transform, "#e74c3c", 3, 1);
  }

  function drawEmptyScene() {
    const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    const transform = makeTransform(canvas, bounds);
    clearCanvas();
    drawGridAndAxes(ctx, transform);
  }

  function render() {
    if (state.mode === "liang" && state.segments.length && state.rect) {
      drawSceneLiang(state.segments, state.rect);
    } else if (
      state.mode === "polygon" &&
      state.segments.length &&
      state.polygonEdges
    ) {
      drawScenePolygon(state.segments, state.polygonEdges);
    } else {
      drawEmptyScene();
    }
  }

  function resizeCanvasToPanel() {
    const panel = canvas.parentElement;
    const rect = panel.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    render();
  }

  window.addEventListener("resize", resizeCanvasToPanel);

  btnLiang.addEventListener("click", () => {
    try {
      const segments = parseSegments(segmentsInput.value);
      const rect = parseRect(rectInput.value);

      state.mode = "liang";
      state.segments = segments;
      state.rect = rect;
      state.polygonEdges = null;

      render();
      setStatus("Отсечение по Лиангу–Барски выполнено.", false);
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Ошибка при разборе данных.", true);
    }
  });

  btnPolygon.addEventListener("click", () => {
    try {
      const segments = parseSegments(segmentsInput.value);
      const polygonEdges = parsePolygon(polygonInput.value);

      state.mode = "polygon";
      state.segments = segments;
      state.rect = null;
      state.polygonEdges = polygonEdges;

      render();
      setStatus(
        "Отсечение отрезков выпуклым многоугольником выполнено.",
        false
      );
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Ошибка при разборе данных.", true);
    }
  });

  btnReset.addEventListener("click", () => {
    segmentsInput.value = "";
    rectInput.value = "";
    polygonInput.value = "";

    state.mode = "empty";
    state.segments = [];
    state.rect = null;
    state.polygonEdges = null;

    render();
    setStatus("Ввод очищен.", false);
  });

  resizeCanvasToPanel();
});
