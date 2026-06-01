/**
 * lib/tcbs.js
 * Fetch thẳng từ BROWSER (client-side) — IP VN, không bị block
 * Không đi qua server Vercel nữa → không bị chặn IP nước ngoài
 */

const cache = new Map();

// Fetch trực tiếp TCBS từ browser (client-side only)
async function fetchTCBSBrowser(ticker, days) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url  = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Referer": "https://tcinvest.tcbs.com.vn/",
      "Origin":  "https://tcinvest.tcbs.com.vn",
    },
  });
  if (!res.ok) throw new Error(`TCBS ${res.status}`);
  const json = await res.json();
  const raw  = json.data || json.bars || [];
  if (raw.length === 0) throw new Error("empty");
  return raw
    .filter(d => parseFloat(d.close) > 0)
    .map(d => ({
      date:   d.tradingDate
        ? String(d.tradingDate).slice(0, 10)
        : new Date(Number(d.time) * 1000).toISOString().slice(0, 10),
      open:   parseFloat(d.open),
      high:   parseFloat(d.high),
      low:    parseFloat(d.low),
      close:  parseFloat(d.close),
      volume: parseInt(d.volume, 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Fetch qua proxy server (fallback khi browser bị CORS)
async function fetchViaProxy(ticker, days) {
  const res  = await fetch(`/api/tcbs?ticker=${ticker}&days=${days}`);
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const json = await res.json();
  if (!json.data || json.data.length === 0) throw new Error("proxy empty");
  return json.data;
}

export async function fetchStock(ticker, days = 365) {
  const key = `${ticker}-${days}`;
  if (cache.has(key)) return cache.get(key);

  let data, source;

  // Thử TCBS trực tiếp từ browser trước (IP VN → không bị block)
  try {
    data   = await fetchTCBSBrowser(ticker, days);
    source = "tcbs";
  } catch (e1) {
    // Nếu CORS block (một số trình duyệt), fallback qua proxy
    try {
      data   = await fetchViaProxy(ticker, days);
      source = "proxy";
    } catch (e2) {
      throw new Error(`All failed: ${e1.message} | ${e2.message}`);
    }
  }

  const result = { data, source };
  cache.set(key, result);
  setTimeout(() => cache.delete(key), 3 * 60 * 1000);
  return result;
}

export function clearCache(ticker) {
  for (const key of cache.keys()) {
    if (key.startsWith(ticker)) cache.delete(key);
  }
}
