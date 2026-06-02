/**
 * SubChart.jsx
 * RSI, MACD, MCDX — clone style AmiBroker VSA+VPA V5.1
 * MCDX: histogram đỏ/vàng/xanh theo zone, đường CA MAP màu xanh
 */
import { useRef, useEffect } from "react";

// ── SHARED DRAW HELPERS ───────────────────────────────────────────────────────
const FONT = "10px 'IBM Plex Mono',monospace";
const FONT_BOLD = "bold 10px 'IBM Plex Mono',monospace";

function drawGrid(ctx, W, H, pL, pR, levels, getY, getLabel) {
  ctx.setLineDash([1, 4]); ctx.lineWidth = 1;
  levels.forEach(v => {
    const y = getY(v);
    ctx.strokeStyle = "#1a2a40";
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
    ctx.fillStyle = "#4a6a88"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText(getLabel(v), W - pR + 3, y + 4);
  });
  ctx.setLineDash([]);
}

// ── RSI ──────────────────────────────────────────────────────────────────────
export function RSIChart({ rsi = [], height = 80 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 6, pR = 62, n = 120;
    const step = (W - pL - pR) / n;
    const full = rsi.slice(-n);
    const py = v => H - (v / 100) * H;

    // Zone fill
    ctx.fillStyle = "#ff3d5710";
    ctx.fillRect(pL, 0, W - pL - pR, py(70));
    ctx.fillStyle = "#00e67610";
    ctx.fillRect(pL, py(30), W - pL - pR, H - py(30));

    drawGrid(ctx, W, H, pL, pR, [20, 30, 50, 70, 80], py, v => v);

    // RSI line
    ctx.beginPath(); ctx.strokeStyle = "#ffd740"; ctx.lineWidth = 1.5;
    let s = false;
    full.forEach((v, i) => {
      if (!v) return;
      const x = pL + i * step + step / 2;
      s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
    });
    ctx.stroke();

    const last = full.filter(Boolean).slice(-1)[0];
    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("RSI(14)", pL + 4, 12);
    if (last != null) {
      const col = last > 70 ? "#ff3d57" : last < 30 ? "#00e676" : "#ffd740";
      ctx.fillStyle = col; ctx.font = FONT_BOLD; ctx.textAlign = "right";
      ctx.fillText(last.toFixed(1), W - pR - 4, 12);
    }
  }, [rsi, height]);
  return <canvas ref={ref} width={800} height={height} style={{ width: "100%", height, display: "block", background: "#0a0e1a" }} />;
}

// ── MACD ─────────────────────────────────────────────────────────────────────
export function MACDChart({ macd = {}, height = 80 }) {
  const ref = useRef(null);
  const { macdLine = [], signalLine = [], histogram = [] } = macd;
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 6, pR = 62, n = 120, step = (W - pL - pR) / n;
    const hist = histogram.slice(-n), ml = macdLine.slice(-n), sig = signalLine.slice(-n);
    const all = [...hist, ...ml, ...sig].filter(Boolean);
    if (!all.length) return;
    const minV = Math.min(...all), maxV = Math.max(...all), range = maxV - minV || 1;
    const py = v => H - ((v - minV) / range) * H;
    const zY = py(0);

    ctx.strokeStyle = "#1e2d45"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL, zY); ctx.lineTo(W - pR, zY); ctx.stroke();

    // Histogram — xanh/đỏ theo giá trị
    hist.forEach((v, i) => {
      if (!v) return;
      const x = pL + i * step + step * 0.1, bW = step * 0.8;
      ctx.fillStyle = v >= 0 ? "#00e67670" : "#ff3d5770";
      const top = Math.min(py(v), zY), bH = Math.abs(py(v) - zY);
      ctx.fillRect(x, top, bW, Math.max(1, bH));
    });

    // MACD & Signal lines
    [[ml, "#00aaff", 1.5], [sig, "#ff9100", 1.5]].forEach(([arr, col, lw]) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw;
      let s = false;
      arr.forEach((v, i) => {
        if (!v) return;
        const x = pL + i * step + step / 2;
        s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
      });
      ctx.stroke();
    });

    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("MACD(12,26,9)", pL + 4, 12);
    ctx.fillStyle = "#00aaff"; ctx.fillText(" MACD", pL + 90, 12);
    ctx.fillStyle = "#ff9100"; ctx.fillText(" Signal", pL + 148, 12);
  }, [macd, height]);
  return <canvas ref={ref} width={800} height={height} style={{ width: "100%", height, display: "block", background: "#0a0e1a" }} />;
}

// ── MCDX — Clone AmiBroker style ─────────────────────────────────────────────
// Histogram: đỏ (distribution, < 30), vàng (neutral 30-70), xanh (accumulation > 70)
// Đường CA MAP: smooth line màu xanh dương
export function MCDXChart({ mcdx = [], height = 100 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 6, pR = 62, n = 120, step = (W - pL - pR) / n;
    const vis = mcdx.slice(-n);
    const valid = vis.filter(v => v != null);
    if (!valid.length) {
      ctx.fillStyle = "#3a5878"; ctx.font = FONT; ctx.textAlign = "center";
      ctx.fillText("MCDX — cần ít nhất 30 phiên dữ liệu", W/2, H/2);
      return;
    }

    const py = v => H - 4 - ((v / 100) * (H - 8));

    // Zone backgrounds
    ctx.fillStyle = "#ff3d5710";
    ctx.fillRect(pL, py(30), W - pL - pR, H - py(30));  // bear zone
    ctx.fillStyle = "#00e67610";
    ctx.fillRect(pL, 0, W - pL - pR, py(70));             // bull zone

    // Grid lines
    drawGrid(ctx, W, H, pL, pR, [0, 10, 20, 30, 50, 70, 80, 100], py, v => v);

    // Labels zone
    ctx.fillStyle = "#ff3d5740"; ctx.font = "9px monospace"; ctx.textAlign = "left";
    ctx.fillText("PHÂN PHỐI", pL + 4, py(15));
    ctx.fillStyle = "#00e67640";
    ctx.fillText("TÍCH LŨY", pL + 4, py(85));

    // Histogram bars — 3 màu theo zone
    vis.forEach((v, i) => {
      if (v == null) return;
      const x  = pL + i * step + step * 0.08;
      const bW = step * 0.84;
      const y  = py(v);
      const bH = H - 4 - y;

      // Màu theo zone — clone AmiBroker
      let col;
      if (v >= 70)      col = "#00e676";   // xanh lá — accumulation
      else if (v >= 50) col = "#80ff40";   // xanh vàng — weak bull
      else if (v >= 30) col = "#ffd740";   // vàng — neutral
      else if (v >= 15) col = "#ff9100";   // cam — weak bear
      else              col = "#ff3d57";   // đỏ — distribution

      ctx.fillStyle = col + "cc";
      ctx.fillRect(x, y, bW, Math.max(1, bH));
      // Top highlight
      ctx.fillStyle = col;
      ctx.fillRect(x, y, bW, 2);
    });

    // CA MAP line — smooth EMA9 của MCDX (đường xanh dương trong ảnh anh)
    const caMap = [];
    const k = 2 / 10;
    let ema = null;
    vis.forEach(v => {
      if (v == null) { caMap.push(null); return; }
      ema = ema === null ? v : v * k + ema * (1 - k);
      caMap.push(+ema.toFixed(2));
    });

    ctx.beginPath(); ctx.strokeStyle = "#00aaff"; ctx.lineWidth = 2;
    let s = false;
    caMap.forEach((v, i) => {
      if (!v) return;
      const x = pL + i * step + step / 2;
      s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
    });
    ctx.stroke();

    // Labels
    const lastMCDX = valid.slice(-1)[0];
    const lastCA   = caMap.filter(Boolean).slice(-1)[0];
    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("MCDX Banker", pL + 4, 12);

    if (lastMCDX != null) {
      const col = lastMCDX >= 70 ? "#00e676" : lastMCDX <= 30 ? "#ff3d57" : "#ffd740";
      const lbl = lastMCDX >= 70 ? "TÍCH LŨY" : lastMCDX <= 30 ? "PHÂN PHỐI" : "TRUNG TÍNH";
      ctx.fillStyle = col; ctx.font = FONT_BOLD; ctx.textAlign = "right";
      ctx.fillText(`${lastMCDX} · ${lbl}`, W - pR - 4, 12);
    }
    if (lastCA != null) {
      ctx.fillStyle = "#00aaff"; ctx.font = FONT; ctx.textAlign = "right";
      ctx.fillText(`CA Map = ${lastCA.toFixed(1)}`, W - pR - 4, 24);
    }
  }, [mcdx, height]);
  return <canvas ref={ref} width={800} height={height} style={{ width: "100%", height, display: "block", background: "#0a0e1a" }} />;
}

// ── VPA SCORE ─────────────────────────────────────────────────────────────────
export function VPAScoreChart({ scores = [], height = 80 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 6, pR = 62, n = 120, step = (W - pL - pR) / n;
    const vis = scores.slice(-n);
    const py = v => H - (v / 20) * H;

    ctx.fillStyle = "#ff3d5710"; ctx.fillRect(pL, py(7), W - pL - pR, H - py(7));
    ctx.fillStyle = "#00e67610"; ctx.fillRect(pL, 0, W - pL - pR, py(13));
    drawGrid(ctx, W, H, pL, pR, [5, 10, 13, 15], py, v => v);

    vis.forEach((v, i) => {
      if (v == null) return;
      const x  = pL + i * step + step * 0.1, bW = step * 0.8;
      const col = v >= 13 ? "#00e676" : v <= 7 ? "#ff3d57" : "#ffd740";
      ctx.fillStyle = col + "aa";
      ctx.fillRect(x, py(v), bW, H - py(v));
      ctx.fillStyle = col; ctx.fillRect(x, py(v), bW, 2);
    });

    const last = vis.filter(v => v != null).slice(-1)[0];
    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("VPA Score (0–20)", pL + 4, 12);
    if (last != null) {
      const col = last >= 13 ? "#00e676" : last <= 7 ? "#ff3d57" : "#ffd740";
      ctx.fillStyle = col; ctx.font = FONT_BOLD; ctx.textAlign = "right";
      ctx.fillText(`${last}/20`, W - pR - 4, 12);
    }
  }, [scores, height]);
  return <canvas ref={ref} width={800} height={height} style={{ width: "100%", height, display: "block", background: "#0a0e1a" }} />;
}
