/**
 * CandlestickChart.jsx
 * - Crosshair dọc mỏng qua toàn bộ chart + sub-charts
 * - Bỏ EMA200
 * - Giá trục phải rút gọn 4 ký tự: 76000 → 76.0, 125500 → 125k
 * - Tooltip compact: Ngày / O C H L / Vol / VolMA20
 */
import { useRef, useEffect, useState, useCallback } from "react";

const VISIBLE = 120;

// Rút gọn giá về 4-5 ký tự
function fmtPrice(v) {
  if (!v) return "—";
  if (v >= 100000) return (v / 1000).toFixed(0) + "k";   // 125000 → 125k
  if (v >= 10000)  return (v / 1000).toFixed(1) + "k";   // 76000 → 76.0k
  if (v >= 1000)   return (v / 1000).toFixed(2) + "k";   // 1250 → 1.25k
  return v.toFixed(1);
}

function fmtVol(v) {
  if (!v) return "—";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v;
}

export default function CandlestickChart({
  data = [], ema20 = [], ema50 = [],
  showEMA = true, showVolume = true, height = 380,
  ticker = "", onHover = null,
  // crosshair X shared với sub-charts
  crosshairX = null, onCrosshairX = null,
}) {
  const canvasRef = useRef(null);
  const [localX, setLocalX] = useState(null);

  const visible = data.slice(-VISIBLE);
  const vEma20  = ema20.slice(-VISIBLE);
  const vEma50  = ema50.slice(-VISIBLE);

  // VolMA20
  const volMA20 = visible.map((_, i) => {
    if (i < 19) return null;
    return visible.slice(i - 19, i + 1).reduce((s, d) => s + d.volume, 0) / 20;
  });

  const cx = crosshairX ?? localX;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visible.length === 0) return;
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const volH = showVolume ? 52 : 0;
    const H    = height - volH - 18;
    ctx.clearRect(0, 0, W, height);

    const prices = visible.flatMap(d => [d.high, d.low]);
    const minP   = Math.min(...prices) * 0.9968;
    const maxP   = Math.max(...prices) * 1.0032;
    const pRange = maxP - minP || 1;
    const padL = 6, padR = 58;
    const chartW = W - padL - padR;
    const step   = chartW / VISIBLE;
    const cW     = Math.max(2, Math.floor(step) - 1);
    const py     = p => H - ((p - minP) / pRange) * H;

    // Grid
    ctx.setLineDash([1, 4]); ctx.lineWidth = 1;
    for (let g = 0; g <= 5; g++) {
      const y = (g / 5) * H;
      ctx.strokeStyle = "#1a2a40";
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const price = maxP - (g / 5) * pRange;
      ctx.fillStyle = "#4a6a88"; ctx.font = "10px monospace"; ctx.textAlign = "left";
      ctx.fillText(fmtPrice(price), W - padR + 3, y + 4);
    }
    ctx.setLineDash([]);

    // EMA20 (đỏ) + EMA50 (xanh) — bỏ EMA200
    if (showEMA) {
      [[vEma20, "#ff4444", 1.5, "20"], [vEma50, "#00aaff", 1.5, "50"]].forEach(([arr, col, lw, lbl]) => {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw;
        let s = false;
        arr.forEach((v, i) => {
          if (!v) return;
          const x = padL + i * step + step / 2;
          s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
        });
        ctx.stroke();
        const last = arr.filter(Boolean).slice(-1)[0];
        if (last) {
          ctx.fillStyle = col; ctx.font = "9px monospace"; ctx.textAlign = "right";
          ctx.fillText(`EMA${lbl}`, W - padR - 4, py(last) - 3);
        }
      });
    }

    // Candles
    visible.forEach((d, i) => {
      const cx_  = padL + i * step + step / 2;
      const x    = padL + i * step + (step - cW) / 2;
      const bull = d.close >= d.open;
      const col  = bull ? "#00e676" : "#ff3d57";
      const bTop = py(Math.max(d.open, d.close));
      const bBot = py(Math.min(d.open, d.close));
      const bH   = Math.max(1, bBot - bTop);
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx_, py(d.high)); ctx.lineTo(cx_, bTop);
      ctx.moveTo(cx_, bBot);       ctx.lineTo(cx_, py(d.low));
      ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(x, bTop, cW, bH);
    });

    // Volume
    if (showVolume) {
      const maxV  = Math.max(...visible.map(d => d.volume));
      const vBase = H + 8;
      visible.forEach((d, i) => {
        const x  = padL + i * step + (step - cW) / 2;
        const bH = (d.volume / maxV) * (volH - 10);
        ctx.fillStyle = (d.close >= d.open ? "#00e67650" : "#ff3d5750");
        ctx.fillRect(x, vBase + (volH - 10 - bH), cW, bH);
      });
      // VolMA20
      ctx.beginPath(); ctx.strokeStyle = "#ffd740"; ctx.lineWidth = 1;
      let sv = false;
      volMA20.forEach((v, i) => {
        if (!v) return;
        const x = padL + i * step + step / 2;
        const y = vBase + (volH - 10) - (v / maxV) * (volH - 10);
        sv ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), sv = true);
      });
      ctx.stroke();
    }

    // Current price line
    if (visible.length > 0) {
      const lc = visible[visible.length - 1].close;
      const ly = py(lc);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#ffd74055"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(W - padR, ly); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd740";
      ctx.fillRect(W - padR + 1, ly - 9, padR - 2, 17);
      ctx.fillStyle = "#0a0e1a"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtPrice(lc), W - padR + (padR - 2) / 2 + 1, ly + 4);
    }

    // Date axis
    ctx.fillStyle = "#3a5878"; ctx.font = "9px monospace"; ctx.textAlign = "center";
    const lStep = Math.max(1, Math.floor(VISIBLE / 7));
    for (let i = 0; i < visible.length; i += lStep) {
      if (visible[i]) ctx.fillText(visible[i].date.slice(5), padL + i * step + step / 2, height - 3);
    }

    // ── CROSSHAIR ────────────────────────────────────────────────────────────
    if (cx !== null && cx >= padL && cx <= W - padR) {
      const i = Math.round((cx - padL) / step - 0.5);
      if (i >= 0 && i < visible.length) {
        const snapX = padL + i * step + step / 2;

        // Đường dọc trắng mỏng xuyên suốt
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(snapX, 0); ctx.lineTo(snapX, height); ctx.stroke();
        ctx.restore();

        // Đường ngang tại giá close
        const d = visible[i];
        const closeY = py(d.close);
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(padL, closeY); ctx.lineTo(W - padR, closeY); ctx.stroke();

        // Label giá bên phải
        ctx.fillStyle = "#334466";
        ctx.fillRect(W - padR + 1, closeY - 9, padR - 2, 17);
        ctx.fillStyle = "#e8f0f8"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillText(fmtPrice(d.close), W - padR + (padR - 2) / 2 + 1, closeY + 4);
        ctx.restore();

        // Tooltip compact bên cạnh crosshair
        const vm20 = volMA20[i];
        const lines = [
          { label: d.date, color: "#7a9ab8", bold: false },
          { label: `O ${fmtPrice(d.open)}  C ${fmtPrice(d.close)}`, color: d.close >= d.open ? "#00e676" : "#ff3d57", bold: true },
          { label: `H ${fmtPrice(d.high)}  L ${fmtPrice(d.low)}`, color: "#e8f0f8", bold: false },
          { label: `Vol ${fmtVol(d.volume)}`, color: "#ffd740", bold: false },
          vm20 ? { label: `MA20 ${fmtVol(Math.round(vm20))}`, color: "#ffd74088", bold: false } : null,
        ].filter(Boolean);

        const txW = 148, txH = lines.length * 16 + 10;
        let tx = snapX + 8;
        if (tx + txW > W - padR) tx = snapX - txW - 8;
        const ty = 8;

        ctx.fillStyle = "#111828ee";
        ctx.strokeStyle = "#2a4060";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(tx + r, ty); ctx.lineTo(tx + txW - r, ty);
        ctx.arcTo(tx + txW, ty, tx + txW, ty + r, r);
        ctx.lineTo(tx + txW, ty + txH - r);
        ctx.arcTo(tx + txW, ty + txH, tx + txW - r, ty + txH, r);
        ctx.lineTo(tx + r, ty + txH);
        ctx.arcTo(tx, ty + txH, tx, ty + txH - r, r);
        ctx.lineTo(tx, ty + r);
        ctx.arcTo(tx, ty, tx + r, ty, r);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        lines.forEach((ln, idx) => {
          ctx.fillStyle = ln.color;
          ctx.font = (ln.bold ? "bold " : "") + "10px monospace";
          ctx.textAlign = "left";
          ctx.fillText(ln.label, tx + 8, ty + 14 + idx * 16);
        });
      }
    }
  }, [data, showEMA, showVolume, ema20, ema50, height, cx]);

  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
    setLocalX(mx);
    if (onCrosshairX) onCrosshairX(mx);

    const step = (canvas.width - 64) / VISIBLE;
    const i    = Math.floor((mx - 6) / step);
    if (i >= 0 && i < visible.length && onHover) onHover(visible[i]);
  }, [visible, onHover, onCrosshairX]);

  const onMouseLeave = useCallback(() => {
    setLocalX(null);
    if (onCrosshairX) onCrosshairX(null);
    if (onHover) onHover(null);
  }, [onHover, onCrosshairX]);

  return (
    <div style={{ position: "relative", background: "#0a0e1a", lineHeight: 0 }}>
      <canvas
        ref={canvasRef} width={800} height={height}
        style={{ width: "100%", height, display: "block", cursor: "crosshair" }}
        onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      />
    </div>
  );
}
