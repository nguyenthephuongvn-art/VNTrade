/**
 * CandlestickChart.jsx
 * Clone phong cách AmiBroker VSA+VPA V5.1
 * - Header info bar (Date / Vol / Open / High / Low / Close)
 * - Nến xanh đỏ rõ nét, wick mỏng
 * - EMA20 (đỏ) / EMA50 (xanh) / EMA200 (trắng nhạt)
 * - Volume bars màu theo chiều nến
 * - Crosshair tooltip
 */
import { useRef, useEffect, useState, useCallback } from "react";

const VISIBLE = 120;

export default function CandlestickChart({
  data = [], ema20 = [], ema50 = [], ema200 = [],
  showEMA = true, showVolume = true, height = 380,
  ticker = "", onHover = null,
}) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const visible  = data.slice(-VISIBLE);
  const vEma20   = ema20.slice(-VISIBLE);
  const vEma50   = ema50.slice(-VISIBLE);
  const vEma200  = ema200.slice(-VISIBLE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visible.length === 0) return;
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const volH = showVolume ? 52 : 0;
    const H    = height - volH - 18;
    ctx.clearRect(0, 0, W, height);

    // Background grid
    const prices = visible.flatMap(d => [d.high, d.low]);
    const minP   = Math.min(...prices) * 0.9968;
    const maxP   = Math.max(...prices) * 1.0032;
    const pRange = maxP - minP || 1;
    const padL = 6, padR = 62;
    const chartW = W - padL - padR;
    const step   = chartW / VISIBLE;
    const cW     = Math.max(2, Math.floor(step) - 1);
    const py     = p => H - ((p - minP) / pRange) * H;

    // Grid lines
    ctx.setLineDash([1, 4]);
    ctx.lineWidth = 1;
    for (let g = 0; g <= 6; g++) {
      const y = (g / 6) * H;
      ctx.strokeStyle = "#1a2a40";
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const price = maxP - (g / 6) * pRange;
      ctx.fillStyle = "#4a6a88";
      ctx.font = "10px 'IBM Plex Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(2), W - padR + 4, y + 4);
    }
    ctx.setLineDash([]);

    // EMA lines — AmiBroker style
    if (showEMA) {
      const emas = [
        [vEma200, "#aaaaaa", 1, "200"],
        [vEma50,  "#00aaff", 1.5, "50"],
        [vEma20,  "#ff4444", 1.5, "20"],
      ];
      emas.forEach(([arr, color, lw, lbl]) => {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
        let s = false;
        arr.forEach((v, i) => {
          if (!v) return;
          const x = padL + i * step + step / 2;
          s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), s = true);
        });
        ctx.stroke();
        // Label cuối
        const last = arr.filter(Boolean).slice(-1)[0];
        if (last) {
          ctx.fillStyle = color;
          ctx.font = "9px 'IBM Plex Mono',monospace";
          ctx.textAlign = "right";
          ctx.fillText(`EMA${lbl}`, W - padR - 4, py(last) - 3);
        }
      });
    }

    // Candles
    visible.forEach((d, i) => {
      const cx   = padL + i * step + step / 2;
      const x    = padL + i * step + (step - cW) / 2;
      const bull = d.close >= d.open;
      const col  = bull ? "#00e676" : "#ff3d57";
      const bTop = py(Math.max(d.open, d.close));
      const bBot = py(Math.min(d.open, d.close));
      const bH   = Math.max(1, bBot - bTop);

      // Wick
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, py(d.high)); ctx.lineTo(cx, bTop);
      ctx.moveTo(cx, bBot);       ctx.lineTo(cx, py(d.low));
      ctx.stroke();

      // Body — filled bull, outline bear (AmiBroker style)
      if (bull) {
        ctx.fillStyle = "#00e676";
        ctx.fillRect(x, bTop, cW, bH);
      } else {
        ctx.fillStyle = "#ff3d57";
        ctx.fillRect(x, bTop, cW, bH);
      }
    });

    // Volume bars
    if (showVolume) {
      const maxV  = Math.max(...visible.map(d => d.volume));
      const vBase = H + 8;
      visible.forEach((d, i) => {
        const x    = padL + i * step + (step - cW) / 2;
        const bull = d.close >= d.open;
        const bH   = ((d.volume / maxV) * (volH - 10));
        ctx.fillStyle = bull ? "#00e67650" : "#ff3d5750";
        ctx.fillRect(x, vBase + (volH - 10 - bH), cW, bH);
        // Top highlight
        ctx.fillStyle = bull ? "#00e67699" : "#ff3d5799";
        ctx.fillRect(x, vBase + (volH - 10 - bH), cW, 1);
      });
      // VOL MA20 line
      const vm20 = [];
      for (let i = 0; i < visible.length; i++) {
        if (i < 19) { vm20.push(null); continue; }
        vm20.push(visible.slice(i-19, i+1).reduce((s,d) => s+d.volume, 0) / 20);
      }
      ctx.beginPath(); ctx.strokeStyle = "#ffd740"; ctx.lineWidth = 1;
      let sv = false;
      vm20.forEach((v, i) => {
        if (!v) return;
        const x = padL + i * step + step / 2;
        const y = vBase + (volH - 10) - (v / maxV) * (volH - 10);
        sv ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), sv = true);
      });
      ctx.stroke();
      // Vol label
      ctx.fillStyle = "#3a5878"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText("VOL", padL + 4, H + 20);
    }

    // Date axis
    ctx.fillStyle = "#3a5878"; ctx.font = "9px 'IBM Plex Mono',monospace";
    ctx.textAlign = "center";
    const step_label = Math.floor(VISIBLE / 8);
    for (let i = 0; i < visible.length; i += step_label) {
      if (visible[i]) {
        ctx.fillText(
          visible[i].date.slice(5),
          padL + i * step + step / 2,
          height - 3
        );
      }
    }

    // Current price line
    if (visible.length > 0) {
      const lastClose = visible[visible.length - 1].close;
      const ly = py(lastClose);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#ffd74066"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(W - padR, ly); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd740";
      ctx.fillRect(W - padR + 1, ly - 8, padR - 2, 16);
      ctx.fillStyle = "#0a0e1a";
      ctx.font = "bold 10px 'IBM Plex Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText(lastClose.toFixed(2), W - padR + (padR - 2) / 2, ly + 4);
    }
  }, [data, showEMA, showVolume, ema20, ema50, ema200, height]);

  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
    const step = (canvas.width - 68) / VISIBLE;
    const i    = Math.floor((mx - 6) / step);
    if (i >= 0 && i < visible.length) {
      setTooltip({ d: visible[i], x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (onHover) onHover(visible[i]);
    }
  }, [visible, onHover]);

  return (
    <div style={{ position: "relative", background: "#0a0e1a" }}>
      <canvas
        ref={canvasRef} width={800} height={height}
        style={{ width: "100%", height, display: "block", cursor: "crosshair" }}
        onMouseMove={onMouseMove} onMouseLeave={() => { setTooltip(null); if (onHover) onHover(null); }}
      />
      {tooltip && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 14, 580), top: 8,
          background: "#111828ee", border: "1px solid #2a4060",
          borderRadius: 4, padding: "7px 11px", fontSize: 11,
          fontFamily: "'IBM Plex Mono',monospace", color: "#e8f0f8",
          pointerEvents: "none", zIndex: 100, lineHeight: 2,
          backdropFilter: "blur(6px)",
          boxShadow: "0 4px 16px #00000099",
        }}>
          <div style={{ color: "#7a9ab8", borderBottom: "1px solid #1e2d45", paddingBottom: 4, marginBottom: 4 }}>
            {ticker} · {tooltip.d.date}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div>O <b style={{ color: "#e8f0f8" }}>{tooltip.d.open.toFixed(2)}</b></div>
            <div style={{ color: "#00e676" }}>H <b>{tooltip.d.high.toFixed(2)}</b></div>
            <div style={{ color: "#ff3d57" }}>L <b>{tooltip.d.low.toFixed(2)}</b></div>
            <div style={{ color: tooltip.d.close >= tooltip.d.open ? "#00e676" : "#ff3d57" }}>
              C <b>{tooltip.d.close.toFixed(2)}</b>
            </div>
          </div>
          <div style={{ color: "#ffd740", marginTop: 4, borderTop: "1px solid #1e2d45", paddingTop: 4 }}>
            Vol <b>{(tooltip.d.volume / 1e6).toFixed(2)}M</b>
            <span style={{ color: "#3a5878", marginLeft: 8 }}>
              {tooltip.d.close >= tooltip.d.open ? "▲" : "▼"} {Math.abs(((tooltip.d.close - tooltip.d.open)/tooltip.d.open)*100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
