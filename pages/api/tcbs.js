/**
 * /api/tcbs
 * Proxy server-side cho TCBS API — bypass CORS hoàn toàn.
 *
 * Query params:
 *   ticker   : string   — mã CK, ví dụ FPT, VCB, VNINDEX
 *   days     : number   — số ngày lịch sử (default 365)
 *   resolution: string  — D | W | M (default D)
 *
 * Ví dụ: /api/tcbs?ticker=FPT&days=365
 *
 * Luồng:
 *   1. Client (browser) gọi /api/tcbs  →  không bị CORS (same-origin)
 *   2. Next.js server gọi apipubaws.tcbs.com.vn  →  server-to-server, không CORS
 *   3. Chuẩn hoá data rồi trả về JSON cho client
 */

// Headers bắt buộc để TCBS không reject (giả lập Chrome từ tcinvest)
const TCBS_HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
  "Content-Type": "application/json",
  "Origin": "https://tcinvest.tcbs.com.vn",
  "Referer": "https://tcinvest.tcbs.com.vn/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "DNT": "1",
};

/**
 * Chuẩn hoá 1 bar từ TCBS về format nội bộ
 * TCBS trả về tradingDate (string YYYY-MM-DD) hoặc time (Unix timestamp)
 */
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker = "FPT", days = "365", resolution = "D" } = req.query;

  if (!ticker || ticker.length > 10) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  const toTs   = Math.floor(Date.now() / 1000);
  const fromTs = toTs - Number(days) * 86400;

  // TCBS có 2 endpoints:
  //   v1/stock/bars-long-term  — lịch sử dài (daily), dùng from/to
  //   v2/stock/bars            — intraday + daily, dùng to + countBack
  // Dùng v1 cho daily (phù hợp kỹ thuật)
  const url =
    `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term` +
    `?ticker=${encodeURIComponent(ticker)}&type=stock` +
    `&resolution=${resolution}&from=${fromTs}&to=${toTs}`;

  try {
    const upstream = await fetch(url, {
      headers: TCBS_HEADERS,
      // Timeout 8 giây
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      console.error(`[tcbs proxy] upstream ${upstream.status} for ${ticker}`);
      return res.status(upstream.status).json({
        error: `TCBS returned ${upstream.status}`,
        ticker,
      });
    }

    const json = await upstream.json();

    // TCBS trả về { data: [...] } hoặc { bars: [...] }
    const raw = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.bars)
      ? json.bars
      : [];

    if (raw.length === 0) {
      return res.status(200).json({ ticker, source: "tcbs", data: [] });
    }

    const data = raw
      .filter((d) => d.open && d.close && parseFloat(d.close) > 0)
      .map(normalizeBar)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Cache 60s ở CDN / browser
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ ticker, source: "tcbs", count: data.length, data });

  } catch (err) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    console.error(`[tcbs proxy] ${isTimeout ? "timeout" : "error"} for ${ticker}:`, err.message);
    return res.status(503).json({
      error: isTimeout ? "TCBS timeout" : "Upstream fetch failed",
      detail: err.message,
      ticker,
    });
  }
}
