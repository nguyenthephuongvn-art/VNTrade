/**
 * /api/market
 * Lấy bảng giá tổng quan cho danh sách mã CK
 * Query: tickers=FPT,VCB,HPG,...
 *
 * Gọi song song nhiều ticker để tránh chờ tuần tự
 */

const TCBS_HEADERS = {
  "Accept": "application/json",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Referer": "https://tcinvest.tcbs.com.vn/",
  "Origin": "https://tcinvest.tcbs.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

async function fetchLast(ticker) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - 5 * 86400; // 5 ngày gần nhất, lấy 2 bar cuối để tính %chg
  const url  =
    `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term` +
    `?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;
  const r = await fetch(url, {
    headers: TCBS_HEADERS,
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  const json = await r.json();
  const raw  = (json.data || json.bars || []).filter(d => d.close > 0);
  if (raw.length < 2) return null;
  const last = raw[raw.length - 1];
  const prev = raw[raw.length - 2];
  return {
    ticker,
    close:  parseFloat(last.close),
    open:   parseFloat(last.open),
    high:   parseFloat(last.high),
    low:    parseFloat(last.low),
    volume: parseInt(last.volume, 10),
    change: ((parseFloat(last.close) - parseFloat(prev.close)) / parseFloat(prev.close)) * 100,
    date:   last.tradingDate?.slice(0, 10) ?? "",
  };
}

export default async function handler(req, res) {
  const { tickers = "FPT,VCB,HPG,BID,DGC,PVD,VHM,MWG,VNM,ACB" } = req.query;
  const list = tickers.split(",").map(t => t.trim().toUpperCase()).slice(0, 20);

  const results = await Promise.allSettled(list.map(fetchLast));

  const data = results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value);

  const errors = results
    .filter(r => r.status === "rejected")
    .map((r, i) => ({ ticker: list[i], reason: r.reason?.message }));

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json({ data, errors, count: data.length });
}
