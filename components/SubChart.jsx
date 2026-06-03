/**
 * SubChart.jsx
 * MCDX port chính xác từ AFL:
 *   Banker  = clamp(BankerSen * (RSI(BankerPeriod) - BankerBase), 0, 20)
 *   Hot     = clamp(HotSen    * (RSI(HotPeriod)    - HotBase),    0, 20)
 *   Retail  = 20 (constant baseline — nền xanh)
 *   MAbanker = MA(Banker, 10)
 *   BankerColor = đỏ nếu Banker >= MAbanker, cam nếu Banker < MAbanker
 *
 * Bố cục chồng lớp (giống AmiBroker):
 *   [nền xanh nhạt = Retail 20]
 *   [vàng = Hot Money]
 *   [đỏ/cam = Banker/Cá Mập]
 *   [đường xanh = MA Banker]
 *   [3 đường kẻ ngang trắng nhạt: 5, 10, 15]
 */
import { useRef, useEffect, useState } from "react";

const VISIBLE = 120;
const PAD_L   = 6;
const PAD_R   = 52;
const FONT    = "10px monospace";
const FONT_B  = "bold 10px monospace";

// ── RSI tính nội bộ ───────────────────────────────────────────────────────────
function calcRSIArr(data, period = 14) {
  const n      = data.length;
  const result = new Array(n).fill(null);
  if (n <= period) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i-1].close;
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  result[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = period + 1; i < n; i++) {
    const d = data[i].close - data[i-1].close;
    avgG = (avgG * (period - 1) + Math.max(d, 0))  / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return result;
}

function calcMAArr(arr, period) {
  const result = new Array(arr.length).fill(null);
  for (let i = period - 1; i < arr.length; i++) {
    const slice = arr.slice(i - period + 1, i + 1).filter(v => v !== null);
    if (slice.length === period) result[i] = slice.reduce((s, v) => s + v, 0) / period;
  }
  return result;
}

// ── Tính MCDX từ data OHLCV ───────────────────────────────────────────────────
export function calcMCDXFromData(data, params = {}) {
  const {
    bankerBase    = 50,
    bankerPeriod  = 50,
    hotBase       = 30,
    hotPeriod     = 40,
    bankerSen     = 1.5,
    hotSen        = 0.7,
    maBankerPer   = 10,
  } = params;

  const rsiB  = calcRSIArr(data, bankerPeriod);
  const rsiH  = calcRSIArr(data, hotPeriod);

  const banker = rsiB.map(v => {
    if (v === null) return null;
    const raw = bankerSen * (v - bankerBase);
    return Math.max(0, Math.min(20, raw));
  });

  const hot = rsiH.map(v => {
    if (v === null) return null;
    const raw = hotSen * (v - hotBase);
    return Math.max(0, Math.min(20, raw));
  });

  const maB = calcMAArr(banker, maBankerPer);

  return { banker, hot, maB };
}

function drawCrosshair(ctx, W, H, cx, step) {
  if (cx === null || cx === undefined) return;
  const i = Math.round((cx - PAD_L) / step - 0.5);
  const snapX = PAD_L + i * step + step / 2;
  if (snapX < PAD_L || snapX > W - PAD_R) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(snapX, 0); ctx.lineTo(snapX, H); ctx.stroke();
  ctx.restore();
}

// ── MCDX CHART ────────────────────────────────────────────────────────────────
export function MCDXChart({ data = [], height = 110, crosshairX = null, params = {} }) {
  const ref     = useRef(null);
  const [localParams, setLocalParams] = useState({
    bankerBase: 50, bankerPeriod: 50,
    hotBase: 30,    hotPeriod: 40,
    bankerSen: 1.5, hotSen: 0.7,
    maBankerPer: 10,
  });

  const p = { ...localParams, ...params };

  useEffect(() => {
    const c = ref.current; if (!c || !data.length) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);

    const { banker, hot, maB } = calcMCDXFromData(data, p);
    const vis_b  = banker.slice(-VISIBLE);
    const vis_h  = hot.slice(-VISIBLE);
    const vis_m  = maB.slice(-VISIBLE);
    const n      = vis_b.length;
    const step   = (W - PAD_L - PAD_R) / VISIBLE;

    // Scale: 0–20 → canvas height
    const py = v => H - 4 - ((v / 20) * (H - 8));
    const bH_fn = v => (v / 20) * (H - 8);

    // ── NỀN: Retail = 20 (màu xanh lá nhạt cố định) ──────────────────────
    const retailH = H - 4; // bH_fn(20)
    const greenGrad = ctx.createLinearGradient(0, py(20), 0, H);
    greenGrad.addColorStop(0, "rgba(0, 200, 80, 0.18)");
    greenGrad.addColorStop(1, "rgba(0, 200, 80, 0.04)");
    ctx.fillStyle = greenGrad;
    ctx.fillRect(PAD_L, py(20), W - PAD_L - PAD_R, retailH);

    // ── 3 đường kẻ ngang: 5, 10, 15 (25%, 50%, 75%) ──────────────────────
    [5, 10, 15].forEach(v => {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(PAD_L, py(v)); ctx.lineTo(W - PAD_R, py(v)); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Scale labels
    [0, 5, 10, 15, 20].forEach(v => {
      ctx.fillStyle = "#3a5060"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText(v, W - PAD_R + 3, py(v) + 3);
    });

    // ── HOT MONEY (vàng) — lớp giữa ─────────────────────────────────────
    vis_h.forEach((v, i) => {
      if (v === null) return;
      const x  = PAD_L + i * step + step * 0.05;
      const bW = step * 0.9;
      const y  = py(v);
      const bH = bH_fn(v);
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, "rgba(255, 220, 0, 0.85)");
      grad.addColorStop(1, "rgba(255, 180, 0, 0.5)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bW, Math.max(1, bH));
    });

    // ── BANKER / CÁ MẬP (đỏ nếu >= MA, cam nếu < MA) ─────────────────────
    vis_b.forEach((v, i) => {
      if (v === null) return;
      const ma  = vis_m[i];
      const x   = PAD_L + i * step + step * 0.05;
      const bW  = step * 0.9;
      const y   = py(v);
      const bH  = bH_fn(v);

      const isBull = ma === null || v >= ma;
      // Đỏ đậm khi mạnh, cam khi yếu hơn MA
      let col1, col2;
      if (isBull) {
        col1 = "rgba(255, 40, 40, 0.95)";
        col2 = "rgba(200, 20, 20, 0.7)";
      } else {
        col1 = "rgba(255, 140, 0, 0.9)";
        col2 = "rgba(220, 100, 0, 0.6)";
      }
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, col1);
      grad.addColorStop(1, col2);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bW, Math.max(1, bH));

      // Viền top
      ctx.fillStyle = isBull ? "rgba(255,80,80,1)" : "rgba(255,160,0,1)";
      ctx.fillRect(x, y, bW, 1.5);
    });

    // ── MA BANKER (đường xanh dương) ──────────────────────────────────────
    ctx.beginPath(); ctx.strokeStyle = "#2196F3"; ctx.lineWidth = 2;
    let s = false;
    vis_m.forEach((v, i) => {
      if (v === null) return;
      const x = PAD_L + i * step + step / 2;
      s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
    });
    ctx.stroke();

    // ── LABELS ────────────────────────────────────────────────────────────
    const lastB = vis_b.filter(v => v !== null).slice(-1)[0];
    const lastH = vis_h.filter(v => v !== null).slice(-1)[0];
    const lastM = vis_m.filter(v => v !== null).slice(-1)[0];

    // Title bar
    ctx.fillStyle = "#111828";
    ctx.fillRect(PAD_L, 0, W - PAD_L - PAD_R, 18);

    ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillStyle = "#3a5878";
    ctx.fillText("MCDX", PAD_L + 4, 12);
    if (lastB != null) {
      ctx.fillStyle = (lastM !== null && lastB >= lastM) ? "#ff4444" : "#ff9800";
      ctx.font = FONT_B;
      ctx.fillText(`Ca Map: ${lastB.toFixed(1)}`, PAD_L + 44, 12);
    }
    if (lastH != null) {
      ctx.fillStyle = "#ffd700"; ctx.font = FONT;
      ctx.fillText(`Dau co: ${lastH.toFixed(1)}`, PAD_L + 130, 12);
    }
    if (lastM != null) {
      ctx.fillStyle = "#2196F3";
      ctx.fillText(`MA: ${lastM.toFixed(1)}`, PAD_L + 230, 12);
    }

    // "Ca Map: X" label cuối chart (giống AFL PlotText)
    if (lastB != null) {
      const labelX = W - PAD_R - 2;
      const labelY = py(lastB);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`▶ ${lastB.toFixed(1)}`, labelX, labelY + 3);
    }

    drawCrosshair(ctx, W, H, crosshairX, step);
  }, [data, height, crosshairX, p.bankerBase, p.bankerPeriod, p.hotBase, p.hotPeriod, p.bankerSen, p.hotSen, p.maBankerPer]);

  return (
    <div style={{ position: "relative", lineHeight: 0 }}>
      <canvas
        ref={ref} width={800} height={height}
        style={{ width: "100%", height, display: "block", background: "#0a0e1a" }}
      />
    </div>
  );
}

// ── MACD ─────────────────────────────────────────────────────────────────────
export function MACDChart({ macd = {}, height = 80, crosshairX = null }) {
  const ref = useRef(null);
  const { macdLine = [], signalLine = [], histogram = [] } = macd;

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const step = (W - PAD_L - PAD_R) / VISIBLE;
    const hist = histogram.slice(-VISIBLE), ml = macdLine.slice(-VISIBLE), sig = signalLine.slice(-VISIBLE);
    const all  = [...hist,...ml,...sig].filter(Boolean);
    if (!all.length) return;
    const minV = Math.min(...all), maxV = Math.max(...all), range = maxV - minV || 1;
    const py = v => H - ((v - minV) / range) * H;
    const zY = py(0);

    ctx.strokeStyle = "#1e2d45"; ctx.lineWidth = 1; ctx.setLineDash([1,3]);
    ctx.beginPath(); ctx.moveTo(PAD_L, zY); ctx.lineTo(W-PAD_R, zY); ctx.stroke();
    ctx.setLineDash([]);

    hist.forEach((v, i) => {
      if (!v) return;
      const x = PAD_L + i*step + step*0.1, bW = step*0.8;
      ctx.fillStyle = v >= 0 ? "#00e67660" : "#ff3d5760";
      const top = Math.min(py(v), zY), bH = Math.abs(py(v)-zY);
      ctx.fillRect(x, top, bW, Math.max(1, bH));
    });

    [[ml,"#00aaff",1.5],[sig,"#ff9100",1.5]].forEach(([arr,col,lw]) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw;
      let s = false;
      arr.forEach((v,i) => {
        if (!v) return;
        const x = PAD_L + i*step + step/2;
        s ? ctx.lineTo(x,py(v)) : (ctx.moveTo(x,py(v)), s=true);
      });
      ctx.stroke();
    });

    ctx.fillStyle = "#111828"; ctx.fillRect(PAD_L, 0, W-PAD_L-PAD_R, 16);
    ctx.fillStyle = "#3a5878"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("MACD(12,26,9)", PAD_L+4, 12);
    const lH = hist.filter(Boolean).slice(-1)[0];
    if (lH != null) {
      ctx.fillStyle = lH >= 0 ? "#00e676" : "#ff3d57";
      ctx.font = FONT_B; ctx.textAlign = "right";
      ctx.fillText(lH.toFixed(3), W-PAD_R-4, 12);
    }
    drawCrosshair(ctx, W, H, crosshairX, step);
  }, [macd, height, crosshairX]);

  return <canvas ref={ref} width={800} height={height} style={{ width:"100%", height, display:"block", background:"#0a0e1a" }} />;
}

// ── VPA SCORE ─────────────────────────────────────────────────────────────────
export function VPAScoreChart({ scores = [], height = 75, crosshairX = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const step = (W-PAD_L-PAD_R)/VISIBLE;
    const vis = scores.slice(-VISIBLE);
    const py = v => H - (v/20)*H;

    ctx.fillStyle = "#ff3d5710"; ctx.fillRect(PAD_L, py(7), W-PAD_L-PAD_R, H-py(7));
    ctx.fillStyle = "#00e67610"; ctx.fillRect(PAD_L, 0, W-PAD_L-PAD_R, py(13));

    ctx.setLineDash([1,4]);
    [5,10,13,15].forEach(v => {
      ctx.strokeStyle = "#1a2a40"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PAD_L,py(v)); ctx.lineTo(W-PAD_R,py(v)); ctx.stroke();
      ctx.fillStyle="#3a5060"; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText(v, W-PAD_R+3, py(v)+3);
    });
    ctx.setLineDash([]);

    vis.forEach((v,i) => {
      if (v==null) return;
      const x=PAD_L+i*step+step*0.1, bW=step*0.8;
      const col = v>=13?"#00e676":v<=7?"#ff3d57":"#ffd740";
      ctx.fillStyle=col+"aa"; ctx.fillRect(x,py(v),bW,H-py(v));
      ctx.fillStyle=col; ctx.fillRect(x,py(v),bW,2);
    });

    const last = vis.filter(v=>v!=null).slice(-1)[0];
    ctx.fillStyle="#111828"; ctx.fillRect(PAD_L,0,W-PAD_L-PAD_R,16);
    ctx.fillStyle="#1e2d45"; ctx.font=FONT; ctx.textAlign="left";
    ctx.fillText("VPA Score (0–20)", PAD_L+4, 12);
    if (last!=null) {
      const col=last>=13?"#00e676":last<=7?"#ff3d57":"#ffd740";
      ctx.fillStyle=col; ctx.font=FONT_B; ctx.textAlign="right";
      ctx.fillText(`${last}/20`, W-PAD_R-4, 12);
    }
    drawCrosshair(ctx, W, H, crosshairX, step);
  }, [scores, height, crosshairX]);

  return <canvas ref={ref} width={800} height={height} style={{ width:"100%", height, display:"block", background:"#0a0e1a" }} />;
}
