const cache = new Map();

export async function fetchStock(ticker, days = 365) {
  const key = `${ticker}-${days}`;
  if (cache.has(key)) return cache.get(key);

  const res  = await fetch(`/api/tcbs?ticker=${ticker}&days=${days}`);
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const json = await res.json();
  if (!json.data || json.data.length === 0) throw new Error("No data");

  const result = { data: json.data, source: json.source || "live" };
  cache.set(key, result);
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  return result;
}

export function clearCache(ticker) {
  for (const key of cache.keys()) {
    if (key.startsWith(ticker)) cache.delete(key);
  }
}
