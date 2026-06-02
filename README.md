# VNTrade — Ứng dụng theo dõi chứng khoán Việt Nam

## Cài đặt & Chạy

```bash
# 1. Vào thư mục project
cd vntrade

# 2. Cài dependencies
npm install

# 3. Chạy development server
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**

---

## Kiến trúc TCBS Proxy

```
Browser  →  /api/tcbs?ticker=FPT  →  Next.js Server  →  apipubaws.tcbs.com.vn
                                           ↑
                                    Server-side: không bị CORS
                                    Cache 60s ở CDN/browser
```

### Tại sao cần proxy?
- TCBS API không có CORS header cho domain ngoài
- Next.js API route chạy ở Node.js → không có CORS restriction
- Client chỉ gọi `/api/tcbs` (same-origin) → an toàn 100%

---

## Cấu trúc thư mục

```
vntrade/
├── pages/
│   ├── _app.js          # App wrapper, global CSS
│   ├── index.js         # Main app (Chart / Watchlist / Screener / News)
│   └── api/
│       ├── tcbs.js      # ⭐ TCBS proxy — bypass CORS
│       └── market.js    # Bảng giá nhiều mã song song
├── components/
│   ├── CandlestickChart.jsx   # Canvas chart: nến + EMA
│   └── SubChart.jsx           # RSI / MACD / VPA Score charts
├── lib/
│   ├── tcbs.js          # Client fetcher (gọi /api/tcbs)
│   ├── indicators.js    # EMA, RSI, MACD, VSA/VPA (port từ AFL)
│   └── stocks.js        # Danh sách mã + mock data generator
├── styles/
│   └── globals.css
├── next.config.js
├── jsconfig.json
└── package.json
```

---

## Tính năng Phase 1

| Tính năng | Trạng thái |
|-----------|-----------|
| Biểu đồ nến Candlestick (Canvas) | ✅ |
| EMA 20 / 50 overlay | ✅ |
| RSI (14) sub-chart | ✅ |
| MACD (12,26,9) histogram + signal | ✅ |
| VPA Composite Score (0-20) | ✅ |
| VSA Signals (Stopping Vol, No Supply, Spring...) | ✅ |
| Watchlist + Sparkline | ✅ |
| Screener (sàn / ngành / vol / RSI / VPA) | ✅ |
| Golden Cross detection | ✅ |
| Tin tức mock (Phase 2 → RSS thật) | ✅ |
| TCBS API proxy (bypass CORS) | ✅ |
| Fallback mock data | ✅ |

---

## Phase 2 — Kế hoạch tiếp theo

- [ ] Kết nối RSS thật: CafeF, VnEconomy, Vietstock
- [ ] SSI WebSocket cho giá realtime
- [ ] EMA 200 + Golden/Death Cross alert
- [ ] VPA Scanner 4 danh mục (short/medium/long/bottom-fish)
- [ ] Export watchlist ra CSV / AmiBroker format
- [ ] Zalo OA alert integration

---

## Deploy lên Vercel (miễn phí)

```bash
npm install -g vercel
vercel
```

Vercel tự nhận Next.js, API routes chạy as Serverless Functions.
Domain: `vntrade.vercel.app` (hoặc custom domain)

---

## Lưu ý về TCBS API

- Endpoint: `apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term`
- Không cần API key, không cần đăng ký
- Rate limit: ~30 req/phút — đã có cache 2 phút ở client
- Nếu TCBS thay đổi structure: chỉnh `normalizeBar()` trong `pages/api/tcbs.js`
