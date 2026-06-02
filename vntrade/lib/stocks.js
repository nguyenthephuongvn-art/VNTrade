/**
 * lib/stocks.js
 * Danh sách cổ phiếu VN + mock data fallback
 */

export const STOCKS = {
  // HOSE
  FPT:  { name: "FPT Corporation",         sector: "Công nghệ",    exchange: "HOSE", base: 128 },
  VCB:  { name: "Vietcombank",             sector: "Ngân hàng",    exchange: "HOSE", base: 89  },
  HPG:  { name: "Hòa Phát Group",          sector: "Thép",         exchange: "HOSE", base: 26  },
  MWG:  { name: "The Gioi Di Dong",        sector: "Bán lẻ",       exchange: "HOSE", base: 48  },
  VNM:  { name: "Vinamilk",               sector: "Tiêu dùng",    exchange: "HOSE", base: 68  },
  BID:  { name: "BIDV",                   sector: "Ngân hàng",    exchange: "HOSE", base: 52  },
  DGC:  { name: "Đức Giang Chemicals",    sector: "Hóa chất",     exchange: "HOSE", base: 74  },
  PVD:  { name: "PV Drilling",            sector: "Dầu khí",      exchange: "HOSE", base: 21  },
  VHM:  { name: "Vinhomes",               sector: "Bất động sản", exchange: "HOSE", base: 42  },
  TCB:  { name: "Techcombank",            sector: "Ngân hàng",    exchange: "HOSE", base: 36  },
  VIC:  { name: "Vingroup",               sector: "Tập đoàn",     exchange: "HOSE", base: 55  },
  VRE:  { name: "Vincom Retail",          sector: "Bất động sản", exchange: "HOSE", base: 27  },
  MSN:  { name: "Masan Group",            sector: "Tiêu dùng",    exchange: "HOSE", base: 68  },
  GAS:  { name: "PV GAS",                 sector: "Dầu khí",      exchange: "HOSE", base: 82  },
  SAB:  { name: "Sabeco",                 sector: "Đồ uống",      exchange: "HOSE", base: 62  },
  CTG:  { name: "VietinBank",             sector: "Ngân hàng",    exchange: "HOSE", base: 38  },
  MBB:  { name: "MB Bank",               sector: "Ngân hàng",    exchange: "HOSE", base: 22  },
  SSI:  { name: "SSI Securities",         sector: "Chứng khoán",  exchange: "HOSE", base: 28  },
  // HNX
  ACB:  { name: "ACB Bank",              sector: "Ngân hàng",    exchange: "HNX",  base: 27  },
  SHS:  { name: "Saigon-Hanoi Sec.",     sector: "Chứng khoán",  exchange: "HNX",  base: 14  },
  DBC:  { name: "Dabaco Group",          sector: "Nông nghiệp",  exchange: "HNX",  base: 36  },
  PVC:  { name: "Petrochemical Corp.",   sector: "Hóa chất",     exchange: "HNX",  base: 12  },
  // UPCOM
  VEA:  { name: "Viet Nam Engine",       sector: "Công nghiệp",  exchange: "UPCOM",base: 39  },
  ACV:  { name: "Airports Corp VN",      sector: "Hàng không",   exchange: "UPCOM",base: 86  },
};

export const WATCHLIST_DEFAULT = ["FPT", "VCB", "HPG", "BID", "DGC", "TCB", "MBB"];

export const SECTORS = [
  "ALL", "Ngân hàng", "Công nghệ", "Thép", "Bất động sản",
  "Dầu khí", "Hóa chất", "Bán lẻ", "Tiêu dùng", "Chứng khoán",
  "Nông nghiệp", "Hàng không", "Tập đoàn", "Đồ uống", "Công nghiệp",
];

// Mock OHLCV khi TCBS không kết nối được
export function generateMock(basePrice, days = 260) {
  const data = [];
  let price = basePrice;
  // Giả lập từ 2025-06-01 trở về trước
  const end = new Date("2026-05-30");

  for (let i = days; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // bỏ cuối tuần

    // Xu hướng ngẫu nhiên nhẹ + noise
    const trend  = 0.0003;
    const noise  = (Math.random() - 0.49) * price * 0.022;
    const open   = price;
    const close  = Math.max(price * 0.92, price + noise + price * trend);
    const high   = Math.max(open, close) * (1 + Math.random() * 0.010);
    const low    = Math.min(open, close) * (1 - Math.random() * 0.010);
    const volume = Math.floor(Math.random() * 8_000_000 + 200_000);

    data.push({
      date:   date.toISOString().slice(0, 10),
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return data;
}

// Mock VN-Index
export function generateMockVNIndex(days = 90) {
  return generateMock(1905, days);
}
