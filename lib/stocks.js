/**
 * lib/stocks.js
 * Danh sách cổ phiếu VN + mock data fallback
 */

export const STOCKS = {
  // ── HOSE — Bluechip ─────────────────────────────────────────────────────
  FPT:  { name: "FPT Corporation",        sector: "Công nghệ",     exchange: "HOSE", base: 128 },
  VCB:  { name: "Vietcombank",            sector: "Ngân hàng",     exchange: "HOSE", base: 89  },
  BID:  { name: "BIDV",                   sector: "Ngân hàng",     exchange: "HOSE", base: 52  },
  CTG:  { name: "VietinBank",             sector: "Ngân hàng",     exchange: "HOSE", base: 38  },
  TCB:  { name: "Techcombank",            sector: "Ngân hàng",     exchange: "HOSE", base: 36  },
  MBB:  { name: "MB Bank",               sector: "Ngân hàng",     exchange: "HOSE", base: 22  },
  VPB:  { name: "VPBank",                sector: "Ngân hàng",     exchange: "HOSE", base: 18  },
  STB:  { name: "Sacombank",             sector: "Ngân hàng",     exchange: "HOSE", base: 28  },
  LPB:  { name: "LienVietPostBank",      sector: "Ngân hàng",     exchange: "HOSE", base: 16  },
  HDB:  { name: "HDBank",               sector: "Ngân hàng",     exchange: "HOSE", base: 24  },
  // ── HOSE — Công nghệ & Viễn thông ───────────────────────────────────────
  VGI:  { name: "Viettel Global",        sector: "Công nghệ",     exchange: "HOSE", base: 42  },
  CMG:  { name: "CMC Corp",              sector: "Công nghệ",     exchange: "HOSE", base: 38  },
  ELC:  { name: "Elcom Corp",            sector: "Công nghệ",     exchange: "HOSE", base: 22  },
  // ── HOSE — Bất động sản ─────────────────────────────────────────────────
  VHM:  { name: "Vinhomes",              sector: "Bất động sản",  exchange: "HOSE", base: 42  },
  VIC:  { name: "Vingroup",              sector: "Bất động sản",  exchange: "HOSE", base: 55  },
  VRE:  { name: "Vincom Retail",         sector: "Bất động sản",  exchange: "HOSE", base: 27  },
  NVL:  { name: "Novaland",              sector: "Bất động sản",  exchange: "HOSE", base: 12  },
  PDR:  { name: "Phát Đạt Real Estate",  sector: "Bất động sản",  exchange: "HOSE", base: 18  },
  KDH:  { name: "Khang Điền House",      sector: "Bất động sản",  exchange: "HOSE", base: 32  },
  DXG:  { name: "Dat Xanh Group",        sector: "Bất động sản",  exchange: "HOSE", base: 14  },
  // ── HOSE — Công nghiệp & Thép ───────────────────────────────────────────
  HPG:  { name: "Hòa Phát Group",        sector: "Thép",          exchange: "HOSE", base: 26  },
  NKG:  { name: "Nam Kim Steel",         sector: "Thép",          exchange: "HOSE", base: 18  },
  TLH:  { name: "Tien Len Steel",        sector: "Thép",          exchange: "HOSE", base: 12  },
  // ── HOSE — Dầu khí ──────────────────────────────────────────────────────
  GAS:  { name: "PV GAS",               sector: "Dầu khí",       exchange: "HOSE", base: 82  },
  PVD:  { name: "PV Drilling",           sector: "Dầu khí",       exchange: "HOSE", base: 21  },
  PVS:  { name: "PV Technical Services", sector: "Dầu khí",       exchange: "HOSE", base: 28  },
  BSR:  { name: "Binh Son Refinery",     sector: "Dầu khí",       exchange: "HOSE", base: 19  },
  // ── HOSE — Hóa chất & Phân bón ──────────────────────────────────────────
  DGC:  { name: "Đức Giang Chemicals",   sector: "Hóa chất",      exchange: "HOSE", base: 74  },
  DCM:  { name: "Ca Mau Fertilizer",     sector: "Hóa chất",      exchange: "HOSE", base: 22  },
  DPM:  { name: "PetroVietnam Fert.",    sector: "Hóa chất",      exchange: "HOSE", base: 28  },
  // ── HOSE — Tiêu dùng & Bán lẻ ───────────────────────────────────────────
  VNM:  { name: "Vinamilk",              sector: "Tiêu dùng",     exchange: "HOSE", base: 68  },
  MSN:  { name: "Masan Group",           sector: "Tiêu dùng",     exchange: "HOSE", base: 68  },
  MWG:  { name: "The Gioi Di Dong",      sector: "Bán lẻ",        exchange: "HOSE", base: 48  },
  PNJ:  { name: "Phu Nhuan Jewelry",     sector: "Bán lẻ",        exchange: "HOSE", base: 78  },
  SAB:  { name: "Sabeco",               sector: "Đồ uống",       exchange: "HOSE", base: 62  },
  QNS:  { name: "Quang Ngai Sugar",      sector: "Tiêu dùng",     exchange: "HOSE", base: 38  },
  // ── HOSE — Chứng khoán ──────────────────────────────────────────────────
  SSI:  { name: "SSI Securities",        sector: "Chứng khoán",   exchange: "HOSE", base: 28  },
  VCI:  { name: "Viet Capital Sec.",     sector: "Chứng khoán",   exchange: "HOSE", base: 32  },
  HCM:  { name: "HCM City Sec.",         sector: "Chứng khoán",   exchange: "HOSE", base: 22  },
  VND:  { name: "VNDirect Securities",   sector: "Chứng khoán",   exchange: "HOSE", base: 18  },
  // ── HOSE — Logistics & Cảng biển ────────────────────────────────────────
  GMD:  { name: "Gemadept Corp",         sector: "Logistics",     exchange: "HOSE", base: 54  },
  VSC:  { name: "Viet Nam Container",    sector: "Logistics",     exchange: "HOSE", base: 28  },
  HAH:  { name: "Hai An Transport",      sector: "Logistics",     exchange: "HOSE", base: 46  },
  // ── HOSE — Điện & Năng lượng ────────────────────────────────────────────
  POW:  { name: "PetroVietnam Power",    sector: "Điện",          exchange: "HOSE", base: 12  },
  PC1:  { name: "PC1 Group",             sector: "Điện",          exchange: "HOSE", base: 18  },
  REE:  { name: "Refrigeration Elec.",   sector: "Điện",          exchange: "HOSE", base: 62  },
  GEX:  { name: "Gelex Group",           sector: "Điện",          exchange: "HOSE", base: 22  },
  // ── HOSE — Thủy sản & Nông nghiệp ───────────────────────────────────────
  ANV:  { name: "Nam Viet Corp",         sector: "Thủy sản",      exchange: "HOSE", base: 18  },
  VHC:  { name: "Vinh Hoan Corp",        sector: "Thủy sản",      exchange: "HOSE", base: 68  },
  IDI:  { name: "IDI International",     sector: "Thủy sản",      exchange: "HOSE", base: 12  },
  // ── HOSE — Xây dựng & VLXD ──────────────────────────────────────────────
  CTD:  { name: "Coteccons",             sector: "Xây dựng",      exchange: "HOSE", base: 62  },
  HBC:  { name: "Hoa Binh Constr.",      sector: "Xây dựng",      exchange: "HOSE", base: 8   },
  VGC:  { name: "Viglacera",             sector: "VLXD",          exchange: "HOSE", base: 28  },
  // ── HNX ─────────────────────────────────────────────────────────────────
  ACB:  { name: "ACB Bank",              sector: "Ngân hàng",     exchange: "HNX",  base: 27  },
  SHS:  { name: "Saigon-Hanoi Sec.",     sector: "Chứng khoán",   exchange: "HNX",  base: 14  },
  DBC:  { name: "Dabaco Group",          sector: "Nông nghiệp",   exchange: "HNX",  base: 36  },
  PVC:  { name: "Petrovietnam Chem.",    sector: "Hóa chất",      exchange: "HNX",  base: 12  },
  PGS:  { name: "PetroVietnam Gas S.",   sector: "Dầu khí",       exchange: "HNX",  base: 38  },
  STP:  { name: "Song Da Plastic",       sector: "VLXD",          exchange: "HNX",  base: 8   },
  // ── UPCOM ────────────────────────────────────────────────────────────────
  VEA:  { name: "Viet Nam Engine",       sector: "Công nghiệp",   exchange: "UPCOM",base: 39  },
  ACV:  { name: "Airports Corp VN",      sector: "Hàng không",    exchange: "UPCOM",base: 86  },
  MCH:  { name: "Masan Consumer",        sector: "Tiêu dùng",     exchange: "UPCOM",base: 148 },
  VTP:  { name: "Viettel Post",          sector: "Logistics",     exchange: "UPCOM",base: 42  },
};

export const WATCHLIST_DEFAULT = ["FPT", "VCB", "HPG", "BID", "DGC", "TCB", "MBB"];

export const SECTORS = [
  "ALL",
  "Ngân hàng", "Công nghệ", "Bất động sản", "Thép", "Dầu khí",
  "Hóa chất", "Tiêu dùng", "Bán lẻ", "Chứng khoán", "Logistics",
  "Điện", "Thủy sản", "Xây dựng", "VLXD", "Nông nghiệp",
  "Hàng không", "Đồ uống", "Công nghiệp", "Tập đoàn",
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
