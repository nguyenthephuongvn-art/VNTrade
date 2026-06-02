export const config = { runtime: "edge", regions: ["sin1"] };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") || "FPT";
  const results = {};

  // Test Wichart (nguồn data VN phổ biến)
  try {
    const r = await fetch(`https://wichart.vn/api/price/history?symbol=${ticker}&resolution=D&from=1700000000&to=1748700000`, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://wichart.vn/" }
    });
    const t = await r.text();
    results.wichart = { status: r.status, preview: t.slice(0, 200) };
  } catch(e) { results.wichart = { error: e.message }; }

  // Test Simplize
  try {
    const r = await fetch(`https://api.simplize.vn/api/historical/quote/${ticker}?page=0&size=30`, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://simplize.vn/" }
    });
    const t = await r.text();
    results.simplize = { status: r.status, preview: t.slice(0, 200) };
  } catch(e) { results.simplize = { error: e.message }; }

  // Test VietStock
  try {
    const r = await fetch(`https://api.vietstock.vn/data/bieudonenthistory?code=${ticker}&time=D&count=30`, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://vietstock.vn/" }
    });
    const t = await r.text();
    results.vietstock = { status: r.status, preview: t.slice(0, 200) };
  } catch(e) { results.vietstock = { error: e.message }; }

  // Test MSN Money Vietnam (dùng Yahoo Finance format)
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.VN?interval=1d&range=1mo`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const t = await r.text();
    results.yahoo = { status: r.status, preview: t.slice(0, 200) };
  } catch(e) { results.yahoo = { error: e.message }; }

  // Test Fireant public API
  try {
    const r = await fetch(`https://restv2.fireant.vn/symbols/${ticker}/historical-quotes?startDate=2026-01-01&endDate=2026-06-01&offset=0&limit=30`, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fireant.vn/" }
    });
    const t = await r.text();
    results.fireant = { status: r.status, preview: t.slice(0, 200) };
  } catch(e) { results.fireant = { error: e.message }; }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
