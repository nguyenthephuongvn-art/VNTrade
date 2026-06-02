/**
 * /api/debug — Test xem Vercel gọi được API nào
 * Truy cập: vn-trade-gamma.vercel.app/api/debug?ticker=FPT
 */
export const config = {
  runtime: "edge",
  regions: ["sin1"],
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") || "FPT";
  const results = {};

  // Test 1: TCBS
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 10 * 86400;
    const r = await fetch(
      `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`,
      { headers: { "Referer": "https://tcinvest.tcbs.com.vn/", "Origin": "https://tcinvest.tcbs.com.vn" } }
    );
    const text = await r.text();
    results.tcbs = { status: r.status, preview: text.slice(0, 200) };
  } catch (e) { results.tcbs = { error: e.message }; }

  // Test 2: VNDirect
  try {
    const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const from  = new Date(Date.now()-10*86400000).toISOString().slice(0,10).replace(/-/g,"");
    const r = await fetch(
      `https://finfo-api.vndirect.com.vn/v4/stock_prices?sort=date&q=code:${ticker}~date:gte:${from}~date:lte:${today}&size=10&page=1`,
      { headers: { "Origin": "https://trade.vndirect.com.vn", "Referer": "https://trade.vndirect.com.vn/" } }
    );
    const text = await r.text();
    results.vndirect = { status: r.status, preview: text.slice(0, 200) };
  } catch (e) { results.vndirect = { error: e.message }; }

  // Test 3: SSI
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 10 * 86400;
    const r = await fetch(
      `https://iboard-query.ssi.com.vn/v2/stock/bars?symbol=${ticker}&resolution=D&from=${from}&to=${to}`,
      { headers: { "Origin": "https://iboard.ssi.com.vn", "Referer": "https://iboard.ssi.com.vn/" } }
    );
    const text = await r.text();
    results.ssi = { status: r.status, preview: text.slice(0, 200) };
  } catch (e) { results.ssi = { error: e.message }; }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
