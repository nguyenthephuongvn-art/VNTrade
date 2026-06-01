/**
 * /api/tcbs — Edge Function chạy ở Singapore
 * Runtime edge gần VN hơn, TCBS không block IP Singapore
 */

export const config = {
  runtime: "edge",
  regions: ["sin1"], // Singapore — gần VN nhất
};

function normalizeBar(d) {
  const date = d.tradingDate
    ? String(d.tradingDate).slice(0, 10)
    : new Date(Number(d.time) * 1000).toISOString().slice(0, 10);
  return {
    date,
    open:   parseFloat(d.open),
    high:   parseFloat(d.high),
    low:    parseFloat(d.low),
    close:  parseFloat(d.close),
    volume: parseInt(d.volume, 10),
  };
}

async function fetchTCBS(ticker, days) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url  = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      "Accept":          "application/json, text/plain, */*",
      "Accept-Language": "vi-VN,vi;q=0.9",
      "Referer":         "https://tcinvest.tcbs.com.vn/",
      "Origin":          "https://tcinvest.tcbs.com.vn",
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`TCBS ${res.status}`);
  const json = await res.json();
  const raw  = json.data || json.bars || [];
  if (!raw.length) throw new Error("empty");
  return raw.filter(d => parseFloat(d.close) > 0).map(normalizeBar)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchVNDirect(ticker, days) {
  const to   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  const sym  = ticker === "VNINDEX" ? "VNIndex" : ticker;
  const url  = `https://finfo-api.vndirect.com.vn/v4/stock_prices?sort=date&q=code:${sym}~date:gte:${from}~date:lte:${to}&size=${days}&page=1`;

  const res = await fetch(url, {
    headers: {
      "Accept":     "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin":     "https://trade.vndirect.com.vn",
      "Referer":    "https://trade.vndirect.com.vn/",
    },
  });
  if (!res.ok) throw new Error(`VNDirect ${res.status}`);
  const json = await res.json();
  const raw  = json.data || [];
  if (!raw.length) throw new Error("VNDirect empty");
  return raw.map(d => ({
    date:   d.date,
    open:   parseFloat(d.open),
    high:   parseFloat(d.high),
    low:    parseFloat(d.low),
    close:  parseFloat(d.close),
    volume: parseInt(d.volume || d.nmVolume || 0, 10),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") || "FPT").toUpperCase();
  const days   = parseInt(searchParams.get("days") || "365", 10);

  if (!ticker || ticker.length > 12) {
    return new Response(JSON.stringify({ error: "Invalid ticker" }), { status: 400 });
  }

  const headers = {
    "Content-Type":  "application/json",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    "Access-Control-Allow-Origin": "*",
  };

  // Thử TCBS trước (Singapore IP)
  try {
    const data = await fetchTCBS(ticker, days);
    return new Response(JSON.stringify({ ticker, source: "tcbs", count: data.length, data }), { headers });
  } catch (e1) {
    console.log(`TCBS failed (${ticker}): ${e1.message}`);
  }

  // Fallback VNDirect
  try {
    const data = await fetchVNDirect(ticker, days);
    return new Response(JSON.stringify({ ticker, source: "vndirect", count: data.length, data }), { headers });
  } catch (e2) {
    console.log(`VNDirect failed (${ticker}): ${e2.message}`);
    return new Response(JSON.stringify({ error: "All sources failed", ticker }), { status: 503, headers });
  }
}
