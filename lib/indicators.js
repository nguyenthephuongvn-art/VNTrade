/**
 * lib/indicators.js
 * Tất cả tính toán chỉ báo kỹ thuật — chạy cả client và server
 * Tối ưu cho OHLCV array: [{ date, open, high, low, close, volume }]
 */

// ── EMA ──────────────────────────────────────────────────────────────────────
export function calcEMA(data, period) {
  const k      = 2 / (period + 1);
  const result = new Array(data.length).fill(null);
  let sum = 0, count = 0;

  for (let i = 0; i < data.length; i++) {
    const c = data[i].close;
    if (count < period) {
      sum += c;
      count++;
      if (count === period) result[i] = +(sum / period).toFixed(3);
    } else {
      result[i] = +(c * k + result[i - 1] * (1 - k)).toFixed(3);
    }
  }
  return result;
}

// ── RSI ──────────────────────────────────────────────────────────────────────
export function calcRSI(data, period = 14) {
  const result = new Array(data.length).fill(null);
  if (data.length <= period) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) gains += d; else losses -= d;
  }

  let avgG = gains / period, avgL = losses / period;
  result[period] = avgL === 0 ? 100 : +(100 - 100 / (1 + avgG / avgL)).toFixed(2);

  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = avgL === 0 ? 100 : +(100 - 100 / (1 + avgG / avgL)).toFixed(2);
  }
  return result;
}

// ── MACD ─────────────────────────────────────────────────────────────────────
export function calcMACD(data, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);

  const macdLine = data.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null
      ? +(emaFast[i] - emaSlow[i]).toFixed(4)
      : null
  );

  const k           = 2 / (signal + 1);
  const signalLine  = new Array(data.length).fill(null);
  const first       = macdLine.findIndex((v) => v !== null);

  if (first >= 0) {
    signalLine[first] = macdLine[first];
    for (let i = first + 1; i < data.length; i++) {
      signalLine[i] = +(macdLine[i] * k + signalLine[i - 1] * (1 - k)).toFixed(4);
    }
  }

  const histogram = data.map((_, i) =>
    macdLine[i] !== null && signalLine[i] !== null
      ? +(macdLine[i] - signalLine[i]).toFixed(4)
      : null
  );

  return { macdLine, signalLine, histogram };
}

// ── STOCHASTIC ────────────────────────────────────────────────────────────────
export function calcStochastic(data, kPeriod = 14, dPeriod = 3) {
  const kLine = new Array(data.length).fill(null);
  const dLine = new Array(data.length).fill(null);

  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice   = data.slice(i - kPeriod + 1, i + 1);
    const lowest  = Math.min(...slice.map((d) => d.low));
    const highest = Math.max(...slice.map((d) => d.high));
    const range   = highest - lowest;
    kLine[i] = range === 0 ? 50 : +((( data[i].close - lowest) / range) * 100).toFixed(2);
  }

  for (let i = kPeriod + dPeriod - 2; i < data.length; i++) {
    const vals = kLine.slice(i - dPeriod + 1, i + 1).filter((v) => v !== null);
    if (vals.length === dPeriod) {
      dLine[i] = +(vals.reduce((s, v) => s + v, 0) / dPeriod).toFixed(2);
    }
  }

  return { kLine, dLine };
}

// ── BOLLINGER BANDS ───────────────────────────────────────────────────────────
export function calcBollinger(data, period = 20, multiplier = 2) {
  const mid   = new Array(data.length).fill(null);
  const upper = new Array(data.length).fill(null);
  const lower = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1).map((d) => d.close);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    mid[i]   = +mean.toFixed(3);
    upper[i] = +(mean + multiplier * std).toFixed(3);
    lower[i] = +(mean - multiplier * std).toFixed(3);
  }

  return { mid, upper, lower };
}

// ── VSA / VPA SIGNALS (port từ AFL) ──────────────────────────────────────────
/**
 * Port logic cốt lõi từ VSA_VPA_Hoan_Chinh_v5.2.afl
 * Trả về mảng signal objects cho mỗi bar
 */
export function calcVSA(data) {
  const n       = data.length;
  const signals = new Array(n).fill(null).map(() => ({
    bullish: [],
    bearish: [],
    score: 0,
  }));

  if (n < 20) return signals;

  // Volume trung bình 20 bar
  const avgVol20 = new Array(n).fill(0);
  for (let i = 19; i < n; i++) {
    const slice = data.slice(i - 19, i + 1);
    avgVol20[i] = slice.reduce((s, d) => s + d.volume, 0) / 20;
  }

  for (let i = 2; i < n; i++) {
    const bar  = data[i];
    const prev = data[i - 1];
    const avg  = avgVol20[i];
    if (avg === 0) continue;

    const spread      = bar.high - bar.low;
    const prevSpread  = prev.high - prev.low;
    const closePos    = spread > 0 ? (bar.close - bar.low) / spread : 0.5;
    const prevClosePos= prevSpread > 0 ? (prev.close - prev.low) / prevSpread : 0.5;
    const highVol     = bar.volume > avg * 1.5;   // volume cao
    const veryHighVol = bar.volume > avg * 2.0;
    const lowVol      = bar.volume < avg * 0.7;
    const wideBar     = spread > prevSpread * 1.2;
    const narrowBar   = spread < prevSpread * 0.6;
    const upBar       = bar.close > prev.close;   // fix từ AFL v5.2: dùng close so close
    const downBar     = bar.close < prev.close;
    let score = 0;

    // ── BULLISH SIGNALS ───────────────────────────────────────────
    // 1. Stopping Volume (SV): volume rất cao, nến xuống, đóng cửa trên giữa
    if (veryHighVol && downBar && closePos > 0.5) {
      signals[i].bullish.push("Stopping Volume");
      score += 3;
    }
    // 2. Upthrust Reversal dạng ngược: volume cao, wideBar lên, đóng gần đáy
    // (dấu hiệu cạm bẫy) — bearish, xử lý bên dưới

    // 3. No Supply: volume thấp, nến hẹp xuống — cung cạn
    if (lowVol && narrowBar && downBar) {
      signals[i].bullish.push("No Supply");
      score += 2;
    }
    // 4. Effort to Rise: volume cao, nến rộng lên, đóng trên 60%
    if (highVol && wideBar && upBar && closePos > 0.6) {
      signals[i].bullish.push("Effort to Rise");
      score += 2;
    }
    // 5. SpringBoard: volume thấp, nến nhỏ, phá đáy rồi phục hồi (close > open)
    if (lowVol && bar.low < prev.low && bar.close > bar.open) {
      signals[i].bullish.push("Spring");
      score += 3;
    }
    // 6. Demand Bar: nến lên mạnh, đóng trên 75%, volume trên TB
    if (upBar && closePos > 0.75 && highVol) {
      signals[i].bullish.push("Demand Bar");
      score += 1;
    }

    // ── BEARISH SIGNALS ───────────────────────────────────────────
    // 7. Upthrust: volume cao, wideBar lên, đóng gần đáy (cạm bẫy tăng)
    if (highVol && wideBar && upBar && closePos < 0.4) {
      signals[i].bearish.push("Upthrust");
      score -= 3;
    }
    // 8. Buying Climax: volume cực cao, nến lên rộng, đóng gần đỉnh
    //    nhưng là đỉnh cục bộ (bar tiếp theo thường giảm)
    if (veryHighVol && wideBar && upBar && closePos > 0.8) {
      signals[i].bearish.push("Buying Climax");
      score -= 2;
    }
    // 9. No Demand: volume thấp, narrow bar lên — cầu yếu
    if (lowVol && narrowBar && upBar) {
      signals[i].bearish.push("No Demand");
      score -= 2;
    }
    // 10. Supply Entering: volume cao, nến xuống rộng, đóng dưới 40%
    if (highVol && wideBar && downBar && closePos < 0.35) {
      signals[i].bearish.push("Supply Bar");
      score -= 2;
    }
    // 11. End of Rising Market: volume rất cao, nến lên nhưng đóng giữa
    if (veryHighVol && upBar && closePos > 0.4 && closePos < 0.6) {
      signals[i].bearish.push("End of Rise");
      score -= 1;
    }
    // 12. Weakness: nến xuống, volume TB, đóng dưới 35%
    if (downBar && bar.volume > avg * 0.9 && closePos < 0.35) {
      signals[i].bearish.push("Weakness");
      score -= 1;
    }

    signals[i].score = Math.max(-5, Math.min(5, score));
  }

  return signals;
}

// ── COMPOSITE VPA SCORE (0-20, port từ AFL) ───────────────────────────────────
export function calcCompositeScore(data) {
  const vsaSignals = calcVSA(data);
  const rsi        = calcRSI(data);
  const macd       = calcMACD(data);
  const ema20      = calcEMA(data, 20);
  const ema50      = calcEMA(data, 50);

  return data.map((bar, i) => {
    if (i < 26) return 10; // neutral khi chưa đủ data
    let score = 10; // baseline neutral

    // VSA contribution (±5)
    score += vsaSignals[i].score;

    // RSI contribution (±2)
    const r = rsi[i];
    if (r !== null) {
      if (r < 30) score += 2;       // oversold → bullish
      else if (r > 70) score -= 2;  // overbought → bearish
      else if (r > 50) score += 0.5;
      else score -= 0.5;
    }

    // MACD contribution (±1.5)
    const h = macd.histogram[i];
    const hPrev = macd.histogram[i - 1];
    if (h !== null && hPrev !== null) {
      if (h > 0 && h > hPrev) score += 1.5; // rising above zero
      else if (h > 0)          score += 0.5;
      else if (h < 0 && h < hPrev) score -= 1.5;
      else if (h < 0)          score -= 0.5;
    }

    // EMA trend (±1)
    if (ema20[i] && ema50[i]) {
      if (bar.close > ema20[i] && ema20[i] > ema50[i]) score += 1; // uptrend
      else if (bar.close < ema20[i] && ema20[i] < ema50[i]) score -= 1;
    }

    return Math.max(0, Math.min(20, Math.round(score)));
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function getLastValues(arr, count = 1) {
  const filtered = arr.filter((v) => v !== null);
  if (count === 1) return filtered[filtered.length - 1] ?? null;
  return filtered.slice(-count);
}

export function pctChange(data, index = -1) {
  const i = index < 0 ? data.length + index : index;
  if (i <= 0 || i >= data.length) return 0;
  return ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
}

// ── 4-PORTFOLIO SCANNER (VSA/VPA Fund Manager Style) ─────────────────────────
/**
 * Phân loại cổ phiếu vào 4 danh mục theo phong cách fund manager
 * Port logic từ VPA-VSA 4List Scanner V2
 *
 * @param {string} ticker
 * @param {Array}  data     OHLCV array
 * @returns {{ portfolio, score, reasons, stopLoss, target1, target2, riskReward }}
 */
export function classifyPortfolio(ticker, data) {
  if (!data || data.length < 50) return null;

  const last   = data[data.length - 1];
  const prev   = data[data.length - 2];
  const prev3  = data.slice(-4, -1);   // 3 bars trước last

  // Indicators
  const ema20  = calcEMA(data, 20);
  const ema50  = calcEMA(data, 50);
  const ema200 = calcEMA(data, 200);
  const rsiArr = calcRSI(data);
  const macd   = calcMACD(data);
  const vsa    = calcVSA(data);
  const scores = calcCompositeScore(data);

  const e20  = ema20[ema20.length - 1];
  const e50  = ema50[ema50.length - 1];
  const e200 = ema200[ema200.length - 1];
  const rsi  = rsiArr[rsiArr.length - 1];
  const hist = macd.histogram[macd.histogram.length - 1];
  const histP= macd.histogram[macd.histogram.length - 2];
  const vpa  = scores[scores.length - 1];
  const vsaLast = vsa[vsa.length - 1];

  const chg  = ((last.close - prev.close) / prev.close) * 100;
  const spread = last.high - last.low;
  const atr5 = prev3.reduce((s, b) => s + (b.high - b.low), 0) / 3;

  // Volume analysis
  const avgVol20 = data.slice(-21, -1).reduce((s, b) => s + b.volume, 0) / 20;
  const volRatio = last.volume / avgVol20;

  // Trend context
  const uptrend   = last.close > e20 && e20 > e50;
  const downtrend = last.close < e20 && e20 < e50;
  const aboveE200 = e200 ? last.close > e200 : true;
  const goldenX   = e20 > e50 && ema20[ema20.length - 2] <= ema50[ema50.length - 2];
  const deathX    = e20 < e50 && ema20[ema20.length - 2] >= ema50[ema50.length - 2];
  const macdBull  = hist !== null && hist > 0 && hist > histP;
  const macdBear  = hist !== null && hist < 0 && hist < histP;

  // Support estimate: lowest low of last 20 bars
  const low20  = Math.min(...data.slice(-20).map(d => d.low));
  const high20 = Math.max(...data.slice(-20).map(d => d.high));

  let portfolio = null;
  let totalScore = vpa;
  const reasons = [];

  // ── PENALTY system (port từ Scanner V2) ──────────────────────────────────
  let penalty = 0;
  if (downtrend)      penalty += 2;
  if (rsi > 75)       penalty += 2;
  if (deathX)         penalty += 3;
  if (macdBear)       penalty += 1;
  if (vsaLast?.bearish?.length > 0) penalty += vsaLast.bearish.length;
  totalScore = Math.max(0, totalScore - penalty);

  // ── DANH MỤC 1: SHORT-TERM SWING (10–30 ngày) ────────────────────────────
  // Tiêu chí: Momentum + Volume breakout + RSI 40-65 + VPA >= 13
  const isSwing = (
    vpa >= 13 &&
    volRatio >= 1.4 &&
    uptrend &&
    rsi >= 35 && rsi <= 68 &&
    (vsaLast?.bullish?.length > 0 || macdBull) &&
    !deathX
  );

  // ── DANH MỤC 2: MEDIUM-TERM POSITION (30–60 ngày) ────────────────────────
  // Tiêu chí: Uptrend chắc chắn + EMA alignment + VPA >= 12 + above E200
  const isMedium = (
    vpa >= 12 &&
    uptrend &&
    aboveE200 &&
    rsi >= 40 && rsi <= 72 &&
    !deathX &&
    totalScore >= 10
  );

  // ── DANH MỤC 3: LONG-TERM (6 tháng) ─────────────────────────────────────
  // Tiêu chí: Strong fundamentals proxy (vol ổn định) + uptrend + E200 support
  const isLong = (
    vpa >= 11 &&
    aboveE200 &&
    e20 > e50 &&
    rsi >= 35 && rsi <= 75 &&
    avgVol20 >= 500_000 &&
    totalScore >= 9
  );

  // ── DANH MỤC 4: HIGH-RISK / BOTTOM-FISHING ───────────────────────────────
  // Tiêu chí: Oversold + VSA stopping signals + volume spike ở đáy
  const isBottomFish = (
    (rsi < 35 || low20 >= last.close * 0.98) &&
    volRatio >= 1.5 &&
    (
      vsaLast?.bullish?.some(s => ["Stopping Volume","Spring","No Supply"].includes(s)) ||
      (rsi < 28 && volRatio >= 2)
    ) &&
    !downtrend // không đang trong downtrend mạnh
  );

  // ── Ưu tiên phân loại (1 cổ phiếu có thể vào nhiều danh mục, chọn cao nhất) ──
  if (isSwing)       { portfolio = "swing";      reasons.push(...(vsaLast?.bullish || []), ...(macdBull ? ["MACD Bull"] : [])); }
  else if (isMedium) { portfolio = "medium";     reasons.push("Uptrend", aboveE200 ? "Above EMA200" : "", goldenX ? "Golden Cross" : ""); }
  else if (isBottomFish) { portfolio = "bottom"; reasons.push(...(vsaLast?.bullish || []), "RSI " + rsi?.toFixed(0)); }
  else if (isLong)   { portfolio = "long";       reasons.push("Long-term trend", "EMA aligned"); }

  if (!portfolio) return null;

  // ── Stop-loss & Target calculation ───────────────────────────────────────
  // SL: dưới đáy gần nhất (ATR-based)
  const atr = Math.max(atr5, spread, last.close * 0.01);
  let slPct, t1Pct, t2Pct;

  switch (portfolio) {
    case "swing":
      slPct = 0.055;   // -5.5%
      t1Pct = 0.08;    // +8%
      t2Pct = 0.15;    // +15%
      break;
    case "medium":
      slPct = 0.08;    // -8%
      t1Pct = 0.15;    // +15%
      t2Pct = 0.25;    // +25%
      break;
    case "long":
      slPct = 0.12;    // -12%
      t1Pct = 0.25;    // +25%
      t2Pct = 0.50;    // +50%
      break;
    case "bottom":
      slPct = 0.10;    // -10% (rủi ro cao hơn)
      t1Pct = 0.15;    // +15%
      t2Pct = 0.30;    // +30%
      break;
  }

  // Dùng support thực tế nếu hợp lý
  const slFromSupport = (last.close - low20) / last.close;
  const finalSlPct    = Math.max(slPct, Math.min(slFromSupport * 1.02, slPct * 1.5));

  const stopLoss = +(last.close * (1 - finalSlPct)).toFixed(2);
  const target1  = +(last.close * (1 + t1Pct)).toFixed(2);
  const target2  = +(last.close * (1 + t2Pct)).toFixed(2);
  const riskReward = +( t1Pct / finalSlPct ).toFixed(1);

  return {
    ticker,
    portfolio,       // "swing" | "medium" | "long" | "bottom"
    score: totalScore,
    vpa,
    rsi: +rsi?.toFixed(1),
    close: last.close,
    chg: +chg.toFixed(2),
    volume: last.volume,
    volRatio: +volRatio.toFixed(1),
    reasons: reasons.filter(Boolean).slice(0, 3),
    stopLoss,
    target1,
    target2,
    riskReward,
    uptrend,
    goldenX,
    aboveE200,
    vsaBullish: vsaLast?.bullish || [],
    vsaBearish: vsaLast?.bearish || [],
  };
}

/**
 * Chạy scanner cho toàn bộ danh sách cổ phiếu
 * @param {{ [ticker]: Array }} stockCache
 * @returns {{ swing, medium, long, bottom }}
 */
export function runScanner(stockCache) {
  const results = { swing: [], medium: [], long: [], bottom: [] };

  Object.entries(stockCache).forEach(([ticker, data]) => {
    if (!data || data.length < 50) return;
    const res = classifyPortfolio(ticker, data);
    if (res && results[res.portfolio]) {
      results[res.portfolio].push(res);
    }
  });

  // Sort: theo score DESC trong mỗi danh mục
  Object.keys(results).forEach(k => {
    results[k].sort((a, b) => b.score - a.score);
  });

  return results;
}

// ── MCDX — Banker / Institutional Flow Detector ──────────────────────────────
/**
 * Port từ MCDX AFL (phiên bản VN market)
 * Phát hiện dòng tiền tổ chức (Banker) qua 4 thành phần:
 *   1. Volume Momentum  — so sánh vol hiện tại vs vol TB dài hạn
 *   2. Price Spread     — độ rộng nến so với ATR
 *   3. Close Position   — vị trí đóng cửa trong range (Wyckoff)
 *   4. Smart Money Divergence — giá tăng nhưng vol giảm = distribution
 *
 * MCDX Score: 0–100
 *   >= 70  : Banker đang tích lũy (Accumulation)  → BUY signal
 *   50–69  : Trung tính / theo dõi
 *   <= 30  : Banker đang phân phối (Distribution) → SELL signal
 */
export function calcMCDX(data) {
  const n      = data.length;
  const result = new Array(n).fill(null);
  if (n < 20) return result;

  // Vol MA dài hạn (min 20 bar, lý tưởng 50) và ngắn hạn (10 bar)
  const volMA50 = new Array(n).fill(null);
  const volMA10 = new Array(n).fill(null);
  const volPeriod = Math.min(50, Math.floor(n * 0.6));
  for (let i = volPeriod - 1; i < n; i++) {
    volMA50[i] = data.slice(i - volPeriod + 1, i + 1).reduce((s, d) => s + d.volume, 0) / volPeriod;
  }
  for (let i = 9; i < n; i++) {
    volMA10[i] = data.slice(i - 9, i + 1).reduce((s, d) => s + d.volume, 0) / 10;
  }

  // ATR 14
  const atr14 = new Array(n).fill(null);
  for (let i = 14; i < n; i++) {
    const slice = data.slice(i - 13, i + 1);
    const trs = slice.map((d, j) => {
      if (j === 0) return d.high - d.low;
      const prev = slice[j - 1];
      return Math.max(d.high - d.low, Math.abs(d.high - prev.close), Math.abs(d.low - prev.close));
    });
    atr14[i] = trs.reduce((s, v) => s + v, 0) / 14;
  }

  for (let i = Math.max(volPeriod, 14); i < n; i++) {
    const bar  = data[i];
    const prev = data[i - 1];
    const spread     = bar.high - bar.low;
    const closePos   = spread > 0 ? (bar.close - bar.low) / spread : 0.5;
    const upBar      = bar.close > prev.close;
    const downBar    = bar.close < prev.close;
    const atr        = atr14[i] || spread || 1;
    const vm50       = volMA50[i] || 1;
    const vm10       = volMA10[i] || 1;
    const volRatio   = bar.volume / vm50;   // ratio vs long-term avg
    const volMomentum= vm10 / vm50;         // short vs long vol trend

    // ── Component 1: Volume Spike (0–30) ──────────────────────────────────
    // Vol > 2x TB dài hạn = có dòng tiền lớn
    let volScore = 0;
    if (volRatio >= 3.0)       volScore = 30;
    else if (volRatio >= 2.0)  volScore = 22;
    else if (volRatio >= 1.5)  volScore = 14;
    else if (volRatio >= 1.2)  volScore = 8;
    else if (volRatio < 0.6)   volScore = -5; // vol cạn kiệt

    // ── Component 2: Price Spread vs ATR (0–25) ───────────────────────────
    // Wide spread + high vol = Effort (Wyckoff)
    const spreadRatio = spread / atr;
    let spreadScore = 0;
    if (spreadRatio >= 1.8)      spreadScore = 25;
    else if (spreadRatio >= 1.3) spreadScore = 18;
    else if (spreadRatio >= 1.0) spreadScore = 12;
    else if (spreadRatio < 0.5)  spreadScore = -5; // narrow = no interest

    // ── Component 3: Close Position (0–25) ────────────────────────────────
    // Đóng cửa gần đỉnh = Banker giữ hàng (bullish)
    // Đóng cửa gần đáy = Banker bán ra (bearish)
    let closeScore = 0;
    if (closePos >= 0.80)       closeScore = 25;  // đóng trên 80% range
    else if (closePos >= 0.60)  closeScore = 16;
    else if (closePos >= 0.40)  closeScore = 8;
    else if (closePos < 0.25)   closeScore = -10; // đóng dưới 25% = yếu

    // ── Component 4: Smart Money Divergence (0–20) ────────────────────────
    // Giá tăng + vol tăng = Accumulation (bullish)
    // Giá tăng + vol giảm = Distribution (bearish, trừ điểm)
    // Giá giảm + vol cao = Stopping Volume (bullish)
    let divScore = 0;
    if (upBar && volMomentum >= 1.2)          divScore = 20;  // tăng giá + vol tăng tốc
    else if (upBar && volMomentum >= 0.9)     divScore = 10;
    else if (upBar && volMomentum < 0.7)      divScore = -15; // distribution
    else if (downBar && volRatio >= 2.0 && closePos > 0.5) divScore = 15; // stopping vol
    else if (downBar && volMomentum >= 1.2)   divScore = -10; // supply entering
    else if (downBar && volMomentum < 0.7)    divScore = 5;   // no supply (bullish)

    // ── Tổng hợp → normalize về 0–100 ────────────────────────────────────
    const raw   = volScore + spreadScore + closeScore + divScore;
    // Raw range: tối thiểu ~-30, tối đa ~100
    const norm  = ((raw + 30) / 130) * 100;
    result[i]   = Math.max(0, Math.min(100, Math.round(norm)));
  }

  return result;
}

/**
 * MCDX Signal: trả về tín hiệu từ array MCDX scores
 * { signal: "accumulation"|"distribution"|"neutral", strength: 0-100 }
 */
export function getMCDXSignal(mcdxArr) {
  const last = mcdxArr.filter(v => v !== null).slice(-1)[0];
  if (last == null) return { signal: "neutral", strength: 50 };
  if (last >= 70) return { signal: "accumulation", strength: last };
  if (last <= 30) return { signal: "distribution", strength: 100 - last };
  return { signal: "neutral", strength: last };
}
