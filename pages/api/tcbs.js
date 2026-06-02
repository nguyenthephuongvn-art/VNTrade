/**
 * /api/tcbs — Yahoo Finance API cho cổ phiếu VN
 * Yahoo Finance hoạt động từ mọi IP quốc tế, có đầy đủ cổ phiếu VN (.VN suffix)
 */
export const config = {
  runtime: "edge",
  regions: ["sin1"],
};

// Map ticker VN → Yahoo Finance symbol
function toYahooSymbol(ticker) {
  if (ticker === "VNINDEX") return "^VNINDEX";
  return `${ticker}.VN`;
}

async function fetchYahoo(ticker, days) {
  const symbol = toYahooSymbol(ticker);
  const to     = Math.floor(Date.now() / 1000);
  const from   = to - days * 86400;
  const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${from}&period2=${to}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = await res.json();

  const result = json.chart?.result?.[0];
  if (!result) throw new Error("Yahoo no result");

  const ts     = result.timestamp || [];
  const q      = result.indicators?.quote?.[0] || {};
  const opens  = q.open  || [];
  const highs  = q.high  || [];
  const lows   = q.low   || [];
  const closes = q.close || [];
  const vols   = q.volume|| [];

  if (ts.length === 0) throw new Error("Yahoo empty");

  return ts.map((t, i) => ({
    date:   new Date(t * 1000).toISOString().slice(0, 10),
    open:   +(opens[i]  || closes[i] || 0).toFixed(2),
    high:   +(highs[i]  || closes[i] || 0).toFixed(2),
    low:    +(lows[i]   || closes[i] || 0).toFixed(2),
    close:  +(closes[i] || 0).toFixed(2),
    volume: Math.round(vols[i] || 0),
  }))
  .filter(d => d.close > 0)
  .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") || "FPT").toUpperCase();
  const days   = parseInt(searchParams.get("days") || "365", 10);

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const data = await fetchYahoo(ticker, days);
    return new Response(
      JSON.stringify({ ticker, source: "yahoo", count: data.length, data }),
      { headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, ticker }),
      { status: 503, headers }
    );
  }
}
