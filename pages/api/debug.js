export const config = { runtime: "edge", regions: ["sin1"] };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") || "FPT";
  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 86400;
  const results = {};

  const hdrs = {
    "Accept": "application/json",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Referer": "https://tcinvest.tcbs.com.vn/",
    "Origin":  "https://tcinvest.tcbs.com.vn",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
  };

  const endpoints = [
    ["tcbs_v1", `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`],
    ["tcbs_v2", `https://apipubaws.tcbs.com.vn/stock-insight/v2/stock/bars?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`],
    ["tcbs_history", `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/history?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`],
    ["tcbs_price", `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/price?ticker=${ticker}`],
    ["cafef_rss", `https://s.cafef.vn/Lich-su-giao-dich-${ticker}-1.chn`],
  ];

  for (const [name, url] of endpoints) {
    try {
      const r = await fetch(url, { headers: hdrs });
      const text = await r.text();
      results[name] = { status: r.status, len: text.length, preview: text.slice(0, 150) };
    } catch(e) {
      results[name] = { error: e.message };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
