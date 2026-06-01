import { useRef, useEffect, useState, useCallback } from "react";

const VISIBLE = 90; // số bar hiển thị

export default function CandlestickChart({
  data = [],
  ema20 = [],
  ema50 = [],
  showEMA = true,
  showVolume = true,
  height = 340,
}) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const visible  = data.slice(-VISIBLE);
  const vEma20   = ema20.slice(-VISIBLE);
  const vEma50   = ema50.slice(-VISIBLE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visible.length === 0) return;
    const ctx  = canvas.getContext("2d");
    const W    = canvas.width;
    const volH = showVolume ? 58 : 0;
    const H    = height - volH - 16;
    ctx.clearRect(0, 0, W, height);

    const prices = visible.flatMap((d) => [d.high, d.low]);
    const minP   = Math.min(...prices) * 0.9972;
    const maxP   = Math.max(...prices) * 1.0028;
    const pRange = maxP - minP || 1;
    const padL = 4, padR = 56;
    const chartW = W - padL - padR;
    const step   = chartW / VISIBLE;
    const cW     = Math.max(2, Math.floor(step) - 2);
    const py     = (p) => H - ((p - minP) / pRange) * H;

    // Grid
    ctx.setLineDash([2, 5]);
    for (let g = 0; g <= 5; g++) {
      const y = (g / 5) * H;
      ctx.strokeStyle = "#0d1f2e"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const price = maxP - (g / 5) * pRange;
      ctx.fillStyle = "#2a5060";
      ctx.font = "10px 'IBM Plex Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(1), W - padR + 4, y + 4);
    }
    ctx.setLineDash([]);

    // EMA lines
    if (showEMA) {
      [
        [vEma20, "#f0c040"],
        [vEma50, "#40a0f0"],
      ].forEach(([arr, color]) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        let started = false;
        arr.forEach((v, i) => {
          if (!v) return;
          const x = padL + i * step + step / 2;
          const y = py(v);
          started ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (started = true));
        });
        ctx.stroke();
      });
    }

    // Candles
    visible.forEach((d, i) => {
      const cx   = padL + i * step + step / 2;
      const x    = padL + i * step + (step - cW) / 2;
      const bull = d.close >= d.open;
      const col  = bull ? "#00d97e" : "#ff4560";
      const bTop = py(Math.max(d.open, d.close));
      const bBot = py(Math.min(d.open, d.close));
      const bH   = Math.max(1, bBot - bTop);

      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, py(d.high)); ctx.lineTo(cx, bTop);
      ctx.moveTo(cx, bBot);       ctx.lineTo(cx, py(d.low));
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillRect(x, bTop, cW, bH);
    });

    // Volume
    if (showVolume) {
      const maxV   = Math.max(...visible.map((d) => d.volume));
      const vBase  = H + 8;
      visible.forEach((d, i) => {
        const x    = padL + i * step + (step - cW) / 2;
        const bull = d.close >= d.open;
        const bH   = (d.volume / maxV) * (volH - 10);
        ctx.fillStyle = bull ? "#00d97e35" : "#ff456035";
        ctx.fillRect(x, vBase + (volH - 10 - bH), cW, bH);
      });
      ctx.fillStyle = "#1a3a50"; ctx.font = "9px 'IBM Plex Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText("VOL", padL + 4, H + 20);
    }

    // Date labels
    ctx.fillStyle = "#2a5060"; ctx.font = "9px 'IBM Plex Mono',monospace";
    ctx.textAlign = "center";
    [0, 18, 36, 54, 72, 89].forEach((i) => {
      if (visible[i]) {
        ctx.fillText(
          visible[i].date.slice(5),
          padL + i * step + step / 2,
          height - 3
        );
      }
    });
  }, [data, showEMA, showVolume, ema20, ema50, height]);

  const onMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
      const step = (canvas.width - 60) / VISIBLE;
      const i    = Math.floor((mx - 4) / step);
      if (i >= 0 && i < visible.length) {
        setTooltip({ d: visible[i], clientX: e.clientX, clientY: e.clientY });
      }
    },
    [visible]
  );

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={760}
        height={height}
        style={{ width: "100%", height, display: "block", cursor: "crosshair" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: Math.min(tooltip.clientX + 14, window.innerWidth - 160),
            top:  tooltip.clientY - 80,
            background: "#05101aee",
            border: "1px solid #1a3a50",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "'IBM Plex Mono',monospace",
            color: "#c8d8e8",
            pointerEvents: "none",
            zIndex: 100,
            lineHeight: 1.9,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px #00000088",
          }}
        >
          <div style={{ color: "#3a6a80", marginBottom: 2 }}>{tooltip.d.date}</div>
          <div>O <b>{tooltip.d.open.toFixed(2)}</b></div>
          <div style={{ color: "#00d97e" }}>H <b>{tooltip.d.high.toFixed(2)}</b></div>
          <div style={{ color: "#ff4560" }}>L <b>{tooltip.d.low.toFixed(2)}</b></div>
          <div style={{ color: tooltip.d.close >= tooltip.d.open ? "#00d97e" : "#ff4560" }}>
            C <b>{tooltip.d.close.toFixed(2)}</b>
          </div>
          <div style={{ color: "#f0c040" }}>
            Vol <b>{(tooltip.d.volume / 1e6).toFixed(2)}M</b>
          </div>
        </div>
      )}
    </div>
  );
}
