/**
 * /api/tcbs — Multi-source proxy
 * Thử lần lượt: VNDirect API → SSI API → TCBS API
 * VNDirect và SSI cho phép IP quốc tế, không bị block như TCBS
 */

function normalizeBar(d) {
  // Chuẩn hoá từ nhiều format khác nhau
  const date = d.tradingDate
    ? String(d.tradingDate).slice(0, 10)
    : d.date
    ? String(d.date).slice(0, 10)
    : new Date(Number(d.time || d.t) * 1000).toISOString().slice(0, 10);
  return {
    date,
    open:   parseFloat(d.open   || d.o),
    high:   parseFloat(d.high   || d.h),
    low:    parseFloat(d.low    || d.l),
    close:  parseFloat(d.close  || d.c),
    volume: parseInt(d.volume   || d.v || 0, 10),
  };
}

// ── SOURCE 1: VNDirect API (public, không cần auth, IP quốc tế OK) ────────────
async function fetchVNDirect(ticker, days) {
  const to   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  const sym  = ticker === "VNINDEX" ? "VNIndex" : ticker;
  const url  = `https://finfo-api.vndirect.com.vn/v4/stock_prices?sort=date&q=code:${sym}~date:gte:${from}~date:lte:${to}&size=${days}&page=1`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://trade.vndirect.com.vn",
      "Referer": "https://trade.vndirect.com.vn/",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`VNDirect ${res.status}`);
  const json = await res.json();
  const raw  = json.data || [];
  if (raw.length === 0) throw new Error("VNDirect empty");

  return raw.map(d => ({
    date:   d.date,
    open:   parseFloat(d.open),
    high:   parseFloat(d.high),
    low:    parseFloat(d.low),
    close:  parseFloat(d.close),
    volume: parseInt(d.volume || d.nmVolume || 0, 10),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// ── SOURCE 2: SSI API (public endpoint, IP quốc tế OK) ───────────────────────
async function fetchSSI(ticker, days) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const sym  = ticker === "VNINDEX" ? "VNINDEX" : ticker;
  const url  = `https://iboard-query.ssi.com.vn/v2/stock/bars?symbol=${sym}&resolution=D&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://iboard.ssi.com.vn",
      "Referer": "https://iboard.ssi.com.vn/",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`SSI ${res.status}`);
  const json = await res.json();
  // SSI trả về { data: { t:[], o:[], h:[], l:[], c:[], v:[] } }
  const d = json.data;
  if (!d || !d.t || d.t.length === 0) throw new Error("SSI empty");

  return d.t.map((ts, i) => ({
    date:   new Date(ts * 1000).toISOString().slice(0, 10),
    open:   parseFloat(d.o[i]),
    high:   parseFloat(d.h[i]),
    low:    parseFloat(d.l[i]),
    close:  parseFloat(d.c[i]),
    volume: parseInt(d.v[i] || 0, 10),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// ── SOURCE 3: TCBS (fallback, có thể bị block IP nước ngoài) ─────────────────
async function fetchTCBS(ticker, days) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url  = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "vi-VN,vi;q=0.9",
      "Referer": "https://tcinvest.tcbs.com.vn/",
      "Origin": "https://tcinvest.tcbs.com.vn",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TCBS ${res.status}`);
  const json = await res.json();
  const raw  = json.data || json.bars || [];
  if (raw.length === 0) throw new Error("TCBS empty");
  return raw
    .filter(d => d.close > 0)
    .map(normalizeBar)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker = "FPT", days = "365" } = req.query;
  if (!ticker || ticker.length > 12) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  const d = parseInt(days, 10) || 365;
  const sources = [
    { name: "vndirect", fn: () => fetchVNDirect(ticker, d) },
    { name: "ssi",      fn: () => fetchSSI(ticker, d) },
    { name: "tcbs",     fn: () => fetchTCBS(ticker, d) },
  ];

  let lastError = null;
  for (const src of sources) {
    try {
      const data = await src.fn();
      if (data && data.length >= 5) {
        res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
          ticker,
          source: src.name,
          count:  data.length,
          data,
        });
      }
    } catch (err) {
      lastError = err;
      console.log(`[proxy] ${src.name} failed for ${ticker}: ${err.message}`);
    }
  }

  return res.status(503).json({
    error: "All sources failed",
    detail: lastError?.message,
    ticker,
  });
}
