import { useRef, useEffect } from "react";

// ── RSI ──────────────────────────────────────────────────────────────────────
export function RSIChart({ rsi = [], height = 80 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 4, pR = 56, step = (W - pL - pR) / 90;
    const full = rsi.slice(-90);

    // Zone fills
    ctx.fillStyle = "#ff456010";
    ctx.fillRect(pL, 0, W - pL - pR, H * (1 - 70 / 100));
    ctx.fillStyle = "#00d97e10";
    ctx.fillRect(pL, H * (1 - 30 / 100), W - pL - pR, H * (30 / 100));

    // Lines 30 / 50 / 70
    ctx.setLineDash([2, 4]);
    [30, 50, 70].forEach((v) => {
      const y = H - (v / 100) * H;
      ctx.strokeStyle = v === 50 ? "#0d1f2e" : "#ff456030";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = "#2a5060";
      ctx.font = "9px 'IBM Plex Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(v, W - pR + 4, y + 4);
    });
    ctx.setLineDash([]);

    // RSI line
    ctx.beginPath(); ctx.strokeStyle = "#b040e0"; ctx.lineWidth = 1.5;
    let s = false;
    full.forEach((v, i) => {
      if (!v) return;
      const x = pL + i * step + step / 2, y = H - (v / 100) * H;
      s ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (s = true));
    });
    ctx.stroke();

    // Label
    const last = full.filter(Boolean).slice(-1)[0];
    ctx.fillStyle = "#1e3040"; ctx.font = "9px 'IBM Plex Mono',monospace"; ctx.textAlign = "left";
    ctx.fillText("RSI(14)", pL + 4, 12);
    if (last != null) {
      const col = last > 70 ? "#ff4560" : last < 30 ? "#00d97e" : "#b040e0";
      ctx.fillStyle = col; ctx.font = "bold 10px 'IBM Plex Mono',monospace";
      ctx.textAlign = "right"; ctx.fillText(last.toFixed(1), W - pR - 4, 12);
    }
  }, [rsi, height]);

  return (
    <canvas
      ref={ref}
      width={760}
      height={height}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}

// ── MACD ─────────────────────────────────────────────────────────────────────
export function MACDChart({ macd = {}, height = 80 }) {
  const ref = useRef(null);
  const { macdLine = [], signalLine = [], histogram = [] } = macd;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 4, pR = 56, n = 90, step = (W - pL - pR) / n;
    const hist = histogram.slice(-n);
    const ml   = macdLine.slice(-n);
    const sig  = signalLine.slice(-n);
    const all  = [...hist, ...ml, ...sig].filter(Boolean);
    if (!all.length) return;
    const minV = Math.min(...all), maxV = Math.max(...all), range = maxV - minV || 1;
    const py   = (v) => H - ((v - minV) / range) * H;
    const zY   = py(0);

    // Zero line
    ctx.strokeStyle = "#0d1f2e"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL, zY); ctx.lineTo(W - pR, zY); ctx.stroke();

    // Histogram bars
    hist.forEach((v, i) => {
      if (!v) return;
      const x   = pL + i * step + step * 0.15;
      const bW  = step * 0.7;
      const top = Math.min(py(v), zY);
      const bH  = Math.abs(py(v) - zY);
      ctx.fillStyle = v >= 0 ? "#00d97e60" : "#ff456060";
      ctx.fillRect(x, top, bW, Math.max(1, bH));
    });

    // MACD & Signal lines
    [[ml, "#3b9eff"], [sig, "#ff9040"]].forEach(([arr, col]) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      let s = false;
      arr.forEach((v, i) => {
        if (!v) return;
        const x = pL + i * step + step / 2;
        s ? ctx.lineTo(x, py(v)) : (ctx.moveTo(x, py(v)), (s = true));
      });
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = "#1e3040"; ctx.font = "9px 'IBM Plex Mono',monospace"; ctx.textAlign = "left";
    ctx.fillText("MACD(12,26,9)", pL + 4, 12);
    ctx.fillStyle = "#3b9eff"; ctx.fillText("─ MACD", pL + 90, 12);
    ctx.fillStyle = "#ff9040"; ctx.fillText("─ Signal", pL + 148, 12);
  }, [macd, height]);

  return (
    <canvas
      ref={ref}
      width={760}
      height={height}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}

// ── VPA SCORE HISTOGRAM ───────────────────────────────────────────────────────
export function VPAScoreChart({ scores = [], height = 80 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = height;
    ctx.clearRect(0, 0, W, H);
    const pL = 4, pR = 56, n = 90, step = (W - pL - pR) / n;
    const vis = scores.slice(-n);

    // Zone fills: 0-7 bear, 7-13 neutral, 13-20 bull
    const py = (v) => H - (v / 20) * H;
    ctx.fillStyle = "#ff456012"; ctx.fillRect(pL, py(7), W - pL - pR, py(0) - py(7));
    ctx.fillStyle = "#00d97e12"; ctx.fillRect(pL, py(20), W - pL - pR, py(13) - py(20));

    // Grid lines
    ctx.setLineDash([2, 4]);
    [5, 10, 15].forEach((v) => {
      const y = py(v);
      ctx.strokeStyle = "#0d1f2e"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = "#2a5060"; ctx.font = "9px 'IBM Plex Mono',monospace";
      ctx.textAlign = "left"; ctx.fillText(v, W - pR + 4, y + 4);
    });
    ctx.setLineDash([]);

    // Bars
    vis.forEach((v, i) => {
      if (v == null) return;
      const x   = pL + i * step + step * 0.1;
      const bW  = step * 0.8;
      const col = v >= 13 ? "#00d97e" : v <= 7 ? "#ff4560" : "#f0c040";
      ctx.fillStyle = col + "90";
      ctx.fillRect(x, py(v), bW, py(0) - py(v));
    });

    ctx.fillStyle = "#1e3040"; ctx.font = "9px 'IBM Plex Mono',monospace";
    ctx.textAlign = "left"; ctx.fillText("VPA Score (0–20)", pL + 4, 12);
    const last = vis.filter(v => v != null).slice(-1)[0];
    if (last != null) {
      const col = last >= 13 ? "#00d97e" : last <= 7 ? "#ff4560" : "#f0c040";
      ctx.fillStyle = col; ctx.font = "bold 11px 'IBM Plex Mono',monospace";
      ctx.textAlign = "right"; ctx.fillText(last, W - pR - 4, 13);
    }
  }, [scores, height]);

  return (
    <canvas
      ref={ref}
      width={760}
      height={height}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}
