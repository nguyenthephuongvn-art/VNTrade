/**
 * lib/tcbs.js
 * Client-side fetcher — gọi /api/tcbs (proxy của mình), không phải TCBS trực tiếp
 * → Không bao giờ bị CORS vì cùng origin
 */

const cache = new Map(); // in-memory cache trong session

/**
 * Lấy OHLCV lịch sử qua proxy
 * @param {string} ticker  - Mã CK (FPT, VCB, VNINDEX,...)
 * @param {number} days    - Số ngày lịch sử (default 365)
 * @returns {Promise<{data: Array, source: string}>}
 */
export async function fetchStock(ticker, days = 365) {
  const key = `${ticker}-${days}`;
  if (cache.has(key)) return cache.get(key);

  const res = await fetch(`/api/tcbs?ticker=${ticker}&days=${days}`);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);

  const json = await res.json();
  if (!json.data || json.data.length === 0) {
    throw new Error(`No data for ${ticker}`);
  }

  const result = { data: json.data, source: json.source || "tcbs" };
  cache.set(key, result);

  // Tự xoá cache sau 2 phút
  setTimeout(() => cache.delete(key), 2 * 60 * 1000);

  return result;
}

/**
 * Lấy bảng giá nhanh cho danh sách mã
 * @param {string[]} tickers
 */
export async function fetchMarket(tickers) {
  const res  = await fetch(`/api/market?tickers=${tickers.join(",")}`);
  const json = await res.json();
  return json.data || [];
}

/**
 * Xoá cache cho ticker cụ thể (khi muốn refresh)
 */
export function clearCache(ticker) {
  for (const key of cache.keys()) {
    if (key.startsWith(ticker)) cache.delete(key);
  }
}
