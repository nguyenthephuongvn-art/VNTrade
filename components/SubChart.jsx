/**
 * SubChart.jsx
 * MACD + MCDX (đỏ/xanh kiểu Banker) + VPA Score
 * RSI đã bỏ theo yêu cầu
 */
import { useRef, useEffect } from "react";

const FONT     = "10px monospace";
const FONT_B   = "bold 10px monospace";
const VISIBLE  = 120;
const PAD_L    = 6;
const PAD_R    = 58;

function fmtPrice(v) {
  if (!v) return "—";
  if (v >= 100000) return (v/1000).toFixed(0)+"k";
  if (v >= 10000)  return (v/1000).toFixed(1)+"k";
  if (v >= 1000)   return (v/1000).toFixed(2)+"k";
  return v.toFixed(1);
}

// Vẽ đường dọc crosshair trên sub-chart
function drawCrosshair(ctx, W, H, cx, step, n) {
  if (cx === null || cx === undefined) return;
  const i = Math.round((cx - PAD_L) / step - 0.5);
  if (i < 0 || i >= n) return;
  const snapX = PAD_L + i * step + step / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(snapX, 0); ctx.lineTo(snapX, H); ctx.stroke();
  ctx.restore();
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
    const all = [...hist,...ml,...sig].filter(Boolean);
    if (!all.length) return;
    const minV = Math.min(...all), maxV = Math.max(...all), range = maxV - minV || 1;
    const py = v => H - ((v - minV) / range) * H;
    const zY = py(0);

    // Zero line
    ctx.strokeStyle = "#1e2d45"; ctx.lineWidth = 1; ctx.setLineDash([1,3]);
    ctx.beginPath(); ctx.moveTo(PAD_L, zY); ctx.lineTo(W - PAD_R, zY); ctx.stroke();
    ctx.setLineDash([]);

    // Histogram
    hist.forEach((v, i) => {
      if (!v) return;
      const x = PAD_L + i * step + step * 0.1, bW = step * 0.8;
      ctx.fillStyle = v >= 0 ? "#00e67665" : "#ff3d5765";
      const top = Math.min(py(v), zY), bH = Math.abs(py(v) - zY);
      ctx.fillRect(x, top, bW, Math.max(1, bH));
    });

    [[ml,"#00aaff",1.5],[sig,"#ff9100",1.5]].forEach(([arr,col,lw]) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw;
      let s = false;
      arr.forEach((v,i) => {
        if (!v) return;
        const x = PAD_L + i * step + step/2;
        s ? ctx.lineTo(x,py(v)) : (ctx.moveTo(x,py(v)), s=true);
      });
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("MACD(12,26,9)", PAD_L+4, 12);
    const lastH = hist.filter(Boolean).slice(-1)[0];
    if (lastH != null) {
      ctx.fillStyle = lastH >= 0 ? "#00e676" : "#ff3d57";
      ctx.font = FONT_B; ctx.textAlign = "right";
      ctx.fillText(lastH.toFixed(3), W - PAD_R - 4, 12);
    }

    drawCrosshair(ctx, W, H, crosshairX, step, VISIBLE);
  }, [macd, height, crosshairX]);

  return <canvas ref={ref} width={800} height={height} style={{ width:"100%", height, display:"block", background:"#0a0e1a" }} />;
}

// ── MCDX — Màu đỏ kiểu Banker độ tham gia ────────────────────────────────────
// Histogram MÀU ĐỎ gradient theo cường độ (đậm = nhiều cá mập)
// Đường trung bình xanh dương = MA cá mập
export function MCDXChart({ mcdx = [], height = 100, crosshairX = null }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const step = (W - PAD_L - PAD_R) / VISIBLE;
    const vis  = mcdx.slice(-VISIBLE);
    const valid = vis.filter(v => v != null);

    if (!valid.length) {
      ctx.fillStyle = "#3a5878"; ctx.font = FONT; ctx.textAlign = "center";
      ctx.fillText("MCDX — cần thêm dữ liệu", W/2, H/2);
      return;
    }

    const py = v => H - 4 - ((v/100) * (H-8));

    // Nền zone
    ctx.fillStyle = "#ff000008"; ctx.fillRect(PAD_L, 0, W-PAD_L-PAD_R, H);

    // Đường zero (50%)
    ctx.setLineDash([2,4]); ctx.strokeStyle = "#2a3a50"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD_L, py(50)); ctx.lineTo(W-PAD_R, py(50)); ctx.stroke();
    ctx.setLineDash([]);

    // Grid nhẹ
    [20, 40, 60, 80].forEach(v => {
      ctx.strokeStyle = "#1a2535"; ctx.lineWidth = 1;
      ctx.setLineDash([1,4]);
      ctx.beginPath(); ctx.moveTo(PAD_L, py(v)); ctx.lineTo(W-PAD_R, py(v)); ctx.stroke();
      ctx.fillStyle = "#3a5060"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText(v, W-PAD_R+3, py(v)+3);
    });
    ctx.setLineDash([]);

    // Histogram đỏ — độ đậm theo cường độ (càng cao càng đỏ đậm)
    vis.forEach((v, i) => {
      if (v == null) return;
      const x  = PAD_L + i * step + step * 0.05;
      const bW = step * 0.9;
      const y  = py(v);
      const bH = H - 4 - y;

      // Màu đỏ gradient: nhạt khi thấp, đậm khi cao
      // v 0→50: từ xanh tối đến đỏ nhạt
      // v 50→100: từ đỏ nhạt đến đỏ đậm (cá mập mạnh)
      let r, g, b, a;
      if (v >= 70) {
        // Cá mập mạnh: đỏ đậm
        r = 255; g = 30 + (100-v)*1.5; b = 40; a = 0.85;
      } else if (v >= 50) {
        // Trung bình cao: đỏ vừa
        r = 220; g = 60 + (70-v)*2; b = 60; a = 0.65;
      } else if (v >= 30) {
        // Trung tính: cam nhạt
        r = 180; g = 100; b = 60; a = 0.45;
      } else {
        // Yếu: xanh tối
        r = 60; g = 120; b = 180; a = 0.4;
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(x, y, bW, Math.max(1, bH));

      // Viền top sáng hơn
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a+0.3)})`;
      ctx.fillRect(x, y, bW, 2);
    });

    // Đường MA Cá Mập — EMA9 của MCDX (đường trung bình xanh)
    const k = 2/10; let ema = null;
    const maLine = vis.map(v => {
      if (v == null) return null;
      ema = ema === null ? v : v*k + ema*(1-k);
      return +ema.toFixed(2);
    });

    ctx.beginPath(); ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 2;
    let s = false;
    maLine.forEach((v, i) => {
      if (!v) return;
      const x = PAD_L + i*step + step/2;
      s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s=true);
    });
    ctx.stroke();

    // Labels
    const lastV  = valid.slice(-1)[0];
    const lastMA = maLine.filter(Boolean).slice(-1)[0];
    ctx.fillStyle = "#1e2d45"; ctx.font = FONT; ctx.textAlign = "left";
    ctx.fillText("MCDX Banker", PAD_L+4, 12);

    if (lastV != null) {
      const intensity = lastV >= 70 ? "MẠNH" : lastV >= 50 ? "VỪA" : lastV >= 30 ? "YẾU" : "THẤP";
      const col = lastV >= 70 ? "#ff4444" : lastV >= 50 ? "#ff7744" : lastV >= 30 ? "#ffaa44" : "#4488cc";
      ctx.fillStyle = col; ctx.font = FONT_B; ctx.textAlign = "right";
      ctx.fillText(`${lastV} · ${intensity}`, W-PAD_R-4, 12);
    }
    if (lastMA != null) {
      ctx.fillStyle = "#00d4ff88"; ctx.font = FONT; ctx.textAlign = "right";
      ctx.fillText(`MA Cá Mập ${lastMA.toFixed(1)}`, W-PAD_R-4, 24);
    }

    drawCrosshair(ctx, W, H, crosshairX, step, VISIBLE);
  }, [mcdx, height, crosshairX]);

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
    ctx.fillStyle="#1e2d45"; ctx.font=FONT; ctx.textAlign="left";
    ctx.fillText("VPA Score (0–20)", PAD_L+4, 12);
    if (last!=null) {
      const col=last>=13?"#00e676":last<=7?"#ff3d57":"#ffd740";
      ctx.fillStyle=col; ctx.font=FONT_B; ctx.textAlign="right";
      ctx.fillText(`${last}/20`, W-PAD_R-4, 12);
    }

    drawCrosshair(ctx, W, H, crosshairX, step, VISIBLE);
  }, [scores, height, crosshairX]);

  return <canvas ref={ref} width={800} height={height} style={{ width:"100%", height, display:"block", background:"#0a0e1a" }} />;
}
