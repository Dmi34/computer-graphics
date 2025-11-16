document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("rasterCanvas");
  const ctx = canvas.getContext("2d");

  const lineTimeSpan = document.getElementById("lineTime");
  const circleTimeSpan = document.getElementById("circleTime");

  let currentGrid = null;
  const GRID_PADDING = 2;


  function getIntFromInput(id, nameForError) {
    const el = document.getElementById(id);
    const value = parseInt(el.value, 10);
    if (Number.isNaN(value)) {
      throw new Error(`Введите целое число для поля "${nameForError}".`);
    }
    return value;
  }

  function showError(message) {
    alert(message);
  }

  function computeBoundsForLine(x0, y0, x1, y1) {
    let minX = Math.min(x0, x1, 0);
    let maxX = Math.max(x0, x1, 0);
    let minY = Math.min(y0, y1, 0);
    let maxY = Math.max(y0, y1, 0);

    minX -= GRID_PADDING;
    maxX += GRID_PADDING;
    minY -= GRID_PADDING;
    maxY += GRID_PADDING;

    return { minX, maxX, minY, maxY };
  }

  function computeBoundsForCircle(xc, yc, r) {
    let minX = Math.min(xc - r, 0);
    let maxX = Math.max(xc + r, 0);
    let minY = Math.min(yc - r, 0);
    let maxY = Math.max(yc + r, 0);

    minX -= GRID_PADDING;
    maxX += GRID_PADDING;
    minY -= GRID_PADDING;
    maxY += GRID_PADDING;

    return { minX, maxX, minY, maxY };
  }

  function computeGridParams(bounds) {
    const margin = 40;

    const width = canvas.width;
    const height = canvas.height;

    const usableWidth = width - margin * 2;
    const usableHeight = height - margin * 2;

    const cols = bounds.maxX - bounds.minX + 1;
    const rows = bounds.maxY - bounds.minY + 1;

    let cellSize = Math.floor(
      Math.min(usableWidth / cols, usableHeight / rows)
    );
    if (cellSize < 4) cellSize = 4;

    const gridWidth = cellSize * cols;
    const gridHeight = cellSize * rows;

    const offsetX = (width - gridWidth) / 2;
    const offsetY = (height - gridHeight) / 2;

    return {
      ...bounds,
      cols,
      rows,
      cellSize,
      gridWidth,
      gridHeight,
      offsetX,
      offsetY,
    };
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function worldToCanvas(x, y, grid) {
    const col = x - grid.minX;
    const row = grid.maxY - y;

    const px = grid.offsetX + col * grid.cellSize;
    const py = grid.offsetY + row * grid.cellSize;

    return { px, py };
  }


  function drawGridAndAxes(grid) {
    clearCanvas();

    ctx.save();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";

    for (let c = 0; c <= grid.cols; c++) {
      const x = grid.offsetX + c * grid.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, grid.offsetY);
      ctx.lineTo(x, grid.offsetY + grid.gridHeight);
      ctx.stroke();
    }

    for (let r = 0; r <= grid.rows; r++) {
      const y = grid.offsetY + r * grid.cellSize;
      ctx.beginPath();
      ctx.moveTo(grid.offsetX, y);
      ctx.lineTo(grid.offsetX + grid.gridWidth, y);
      ctx.stroke();
    }

    const axisColor = "#4b5563";
    ctx.lineWidth = 2;
    ctx.strokeStyle = axisColor;

    const arrowSize = Math.min(16, Math.max(6, grid.cellSize * 0.35));
    if (grid.minX <= 0 && grid.maxX >= 0) {
      const px0 = grid.offsetX + (0 - grid.minX) * grid.cellSize;
      const topY = grid.offsetY;
      ctx.beginPath();
      ctx.moveTo(px0, topY);
      ctx.lineTo(px0, grid.offsetY + grid.gridHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px0, topY - arrowSize);
      ctx.lineTo(px0 - arrowSize / 2, topY);
      ctx.lineTo(px0 + arrowSize / 2, topY);
      ctx.closePath();
      ctx.fillStyle = axisColor;
      ctx.fill();
    }

    if (grid.minY <= 0 && grid.maxY >= 0) {
      const py0 = grid.offsetY + (grid.maxY - 0) * grid.cellSize;
      const rightX = grid.offsetX + grid.gridWidth;
      ctx.beginPath();
      ctx.moveTo(grid.offsetX, py0);
      ctx.lineTo(rightX, py0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightX + arrowSize, py0);
      ctx.lineTo(rightX, py0 - arrowSize / 2);
      ctx.lineTo(rightX, py0 + arrowSize / 2);
      ctx.closePath();
      ctx.fillStyle = axisColor;
      ctx.fill();
    }

    ctx.fillStyle = "#374151";
    ctx.font = "12px system-ui";

    const origin = worldToCanvas(0, 0, grid);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("0", origin.px + 4, origin.py + 2);

    const xLabelPos = worldToCanvas(grid.maxX, 0, grid);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("x", grid.offsetX + grid.gridWidth + 16, xLabelPos.py);

    const yLabelPos = worldToCanvas(0, grid.maxY, grid);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("y", yLabelPos.px, grid.offsetY - 14);

    const maxLabels = 10;
    const stepX = Math.max(1, Math.ceil(grid.cols / maxLabels));
    const stepY = Math.max(1, Math.ceil(grid.rows / maxLabels));

    for (let x = grid.minX; x <= grid.maxX; x += stepX) {
      const pos = worldToCanvas(x, 0, grid);
      ctx.beginPath();
      ctx.moveTo(pos.px, pos.py - 4);
      ctx.lineTo(pos.px, pos.py + 4);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(x), pos.px, pos.py + 6);
    }

    for (let y = grid.minY; y <= grid.maxY; y += stepY) {
      const pos = worldToCanvas(0, y, grid);
      ctx.beginPath();
      ctx.moveTo(pos.px - 4, pos.py);
      ctx.lineTo(pos.px + 4, pos.py);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(y), pos.px - 6, pos.py);
    }

    ctx.restore();
  }


  function uniquePoints(points) {
    const seen = new Set();
    const result = [];
    for (const p of points) {
      const key = `${p.x},${p.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
    return result;
  }

  function stepLinePoints(x0, y0, x1, y1) {
    const points = [];
    const dx = x1 - x0;
    const dy = y1 - y0;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) {
      points.push({ x: x0, y: y0 });
      return points;
    }

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }

    return uniquePoints(points);
  }

  function ddaLinePoints(x0, y0, x1, y1) {
    const points = [];
    const dx = x1 - x0;
    const dy = y1 - y0;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) {
      points.push({ x: x0, y: y0 });
      return points;
    }

    const xStep = dx / steps;
    const yStep = dy / steps;

    let x = x0;
    let y = y0;

    for (let i = 0; i <= steps; i++) {
      points.push({ x: Math.round(x), y: Math.round(y) });
      x += xStep;
      y += yStep;
    }

    return uniquePoints(points);
  }

  function bresenhamLinePoints(x0, y0, x1, y1) {
    const points = [];

    let x = x0;
    let y = y0;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    while (true) {
      points.push({ x, y });

      if (x === x1 && y === y1) {
        break;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return points;
  }

  function bresenhamCirclePoints(xc, yc, r) {
    const points = [];

    let x = 0;
    let y = r;
    let d = 3 - 2 * r;

    function addSymmetricPoints(cx, cy, x, y) {
      points.push({ x: cx + x, y: cy + y });
      points.push({ x: cx - x, y: cy + y });
      points.push({ x: cx + x, y: cy - y });
      points.push({ x: cx - x, y: cy - y });

      points.push({ x: cx + y, y: cy + x });
      points.push({ x: cx - y, y: cy + x });
      points.push({ x: cx + y, y: cy - x });
      points.push({ x: cx - y, y: cy - x });
    }

    while (y >= x) {
      addSymmetricPoints(xc, yc, x, y);

      if (d <= 0) {
        d = d + 4 * x + 6;
      } else {
        d = d + 4 * (x - y) + 10;
        y--;
      }
      x++;
    }

    return uniquePoints(points);
  }


  function drawPixels(points, grid, color) {
    ctx.save();
    ctx.fillStyle = color;

    for (const p of points) {
      const { px, py } = worldToCanvas(p.x, p.y + 1, grid);
      ctx.fillRect(px + 1, py + 1, grid.cellSize - 2, grid.cellSize - 2);
    }

    ctx.restore();
  }


  function handleDrawLine() {
    try {
      const x0 = getIntFromInput("x0", "x₀");
      const y0 = getIntFromInput("y0", "y₀");
      const x1 = getIntFromInput("x1", "x₁");
      const y1 = getIntFromInput("y1", "y₁");

      const algorithm = document.getElementById("lineAlgorithm").value;

      const bounds = computeBoundsForLine(x0, y0, x1, y1);
      const grid = computeGridParams(bounds);
      currentGrid = grid;

      drawGridAndAxes(grid);

      let points;
      const t0 = performance.now ? performance.now() : Date.now();

      if (algorithm === "step") {
        points = stepLinePoints(x0, y0, x1, y1);
      } else if (algorithm === "dda") {
        points = ddaLinePoints(x0, y0, x1, y1);
      } else {
        points = bresenhamLinePoints(x0, y0, x1, y1);
      }

      const t1 = performance.now ? performance.now() : Date.now();
      const dt = t1 - t0;
      lineTimeSpan.textContent = dt.toFixed(3) + " мс";

      const color =
        algorithm === "step"
          ? "#2563eb"
          : algorithm === "dda"
          ? "#16a34a"
          : "#ea580c";

      drawPixels(points, grid, color);
    } catch (e) {
      showError(e.message);
    }
  }

  function handleDrawCircle() {
    try {
      const xc = getIntFromInput("xc", "x центра");
      const yc = getIntFromInput("yc", "y центра");
      const r = getIntFromInput("radius", "радиуса");

      if (r <= 0) {
        throw new Error("Радиус должен быть положительным целым числом.");
      }

      const bounds = computeBoundsForCircle(xc, yc, r);
      const grid = computeGridParams(bounds);
      currentGrid = grid;

      drawGridAndAxes(grid);

      const t0 = performance.now ? performance.now() : Date.now();
      const points = bresenhamCirclePoints(xc, yc, r);
      const t1 = performance.now ? performance.now() : Date.now();
      const dt = t1 - t0;
      circleTimeSpan.textContent = dt.toFixed(3) + " мс";

      const color = "#7c3aed";
      drawPixels(points, grid, color);
    } catch (e) {
      showError(e.message);
    }
  }

  function handleExampleLine() {
    document.getElementById("x0").value = 2;
    document.getElementById("y0").value = 1;
    document.getElementById("x1").value = 10;
    document.getElementById("y1").value = 6;
    document.getElementById("lineAlgorithm").value = "bresenham";

    handleDrawLine();
  }

  function handleClear() {
    if (currentGrid) {
      drawGridAndAxes(currentGrid);
    } else {
      const bounds = computeBoundsForLine(-5, -5, 5, 5);
      currentGrid = computeGridParams(bounds);
      drawGridAndAxes(currentGrid);
    }
  }

  document
    .getElementById("drawLineBtn")
    .addEventListener("click", handleDrawLine);
  document
    .getElementById("drawCircleBtn")
    .addEventListener("click", handleDrawCircle);
  document
    .getElementById("exampleLineBtn")
    .addEventListener("click", handleExampleLine);
  document.getElementById("clearBtn").addEventListener("click", handleClear);

  const initialBounds = computeBoundsForLine(-5, -5, 5, 5);
  currentGrid = computeGridParams(initialBounds);
  drawGridAndAxes(currentGrid);
});
