/**
 * lib/stocks.js — VN30 + Midcap HOSE/HNX/UPCOM + custom ticker support
 * Yahoo Finance: ticker.VN (HOSE/HNX), ^VNINDEX
 */

export const STOCKS = {
  // ── VN30 BLUECHIP ────────────────────────────────────────────────────────
  // Ngân hàng
  VCB:  { name: "Vietcombank",            sector: "Ngân hàng",    exchange: "HOSE", base: 89  },
  BID:  { name: "BIDV",                   sector: "Ngân hàng",    exchange: "HOSE", base: 52  },
  CTG:  { name: "VietinBank",             sector: "Ngân hàng",    exchange: "HOSE", base: 38  },
  TCB:  { name: "Techcombank",            sector: "Ngân hàng",    exchange: "HOSE", base: 36  },
  MBB:  { name: "MB Bank",               sector: "Ngân hàng",    exchange: "HOSE", base: 22  },
  VPB:  { name: "VPBank",                sector: "Ngân hàng",    exchange: "HOSE", base: 18  },
  ACB:  { name: "ACB Bank",              sector: "Ngân hàng",    exchange: "HNX",  base: 27  },
  STB:  { name: "Sacombank",             sector: "Ngân hàng",    exchange: "HOSE", base: 28  },
  HDB:  { name: "HDBank",               sector: "Ngân hàng",    exchange: "HOSE", base: 24  },
  LPB:  { name: "LienVietPostBank",      sector: "Ngân hàng",    exchange: "HOSE", base: 16  },
  // Công nghệ
  FPT:  { name: "FPT Corporation",        sector: "Công nghệ",    exchange: "HOSE", base: 128 },
  // BĐS & Vingroup
  VHM:  { name: "Vinhomes",              sector: "Bất động sản", exchange: "HOSE", base: 42  },
  VIC:  { name: "Vingroup",              sector: "Bất động sản", exchange: "HOSE", base: 55  },
  VRE:  { name: "Vincom Retail",         sector: "Bất động sản", exchange: "HOSE", base: 27  },
  // Công nghiệp
  HPG:  { name: "Hòa Phát Group",        sector: "Thép",         exchange: "HOSE", base: 26  },
  GAS:  { name: "PV GAS",               sector: "Dầu khí",      exchange: "HOSE", base: 82  },
  // Tiêu dùng
  VNM:  { name: "Vinamilk",              sector: "Tiêu dùng",    exchange: "HOSE", base: 68  },
  MSN:  { name: "Masan Group",           sector: "Tiêu dùng",    exchange: "HOSE", base: 68  },
  MWG:  { name: "The Gioi Di Dong",      sector: "Bán lẻ",       exchange: "HOSE", base: 48  },
  SAB:  { name: "Sabeco",               sector: "Đồ uống",      exchange: "HOSE", base: 62  },
  // Chứng khoán
  SSI:  { name: "SSI Securities",        sector: "Chứng khoán",  exchange: "HOSE", base: 28  },
  VND:  { name: "VNDirect Securities",   sector: "Chứng khoán",  exchange: "HOSE", base: 18  },
  // Dầu khí
  PLX:  { name: "Petrolimex",            sector: "Dầu khí",      exchange: "HOSE", base: 48  },
  BSR:  { name: "Binh Son Refinery",     sector: "Dầu khí",      exchange: "HOSE", base: 19  },
  // Điện
  REE:  { name: "REE Corporation",       sector: "Điện",         exchange: "HOSE", base: 62  },
  POW:  { name: "PetroVietnam Power",    sector: "Điện",         exchange: "HOSE", base: 12  },
  // Hàng không / Cảng
  ACV:  { name: "Airports Corp VN",      sector: "Hàng không",   exchange: "UPCOM",base: 86  },
  GMD:  { name: "Gemadept Corp",         sector: "Logistics",    exchange: "HOSE", base: 54  },

  // ── MIDCAP HOSE ──────────────────────────────────────────────────────────
  // Ngân hàng
  EIB:  { name: "Eximbank",              sector: "Ngân hàng",    exchange: "HOSE", base: 18  },
  TPB:  { name: "TPBank",               sector: "Ngân hàng",    exchange: "HOSE", base: 16  },
  OCB:  { name: "Orient Comm. Bank",     sector: "Ngân hàng",    exchange: "HOSE", base: 12  },
  BAB:  { name: "Bac A Bank",            sector: "Ngân hàng",    exchange: "HOSE", base: 14  },
  // BĐS
  NVL:  { name: "Novaland",              sector: "Bất động sản", exchange: "HOSE", base: 12  },
  PDR:  { name: "Phát Đạt Real Estate",  sector: "Bất động sản", exchange: "HOSE", base: 18  },
  KDH:  { name: "Khang Điền House",      sector: "Bất động sản", exchange: "HOSE", base: 32  },
  DXG:  { name: "Dat Xanh Group",        sector: "Bất động sản", exchange: "HOSE", base: 14  },
  NLG:  { name: "Nam Long Group",        sector: "Bất động sản", exchange: "HOSE", base: 28  },
  HDG:  { name: "Ha Do Group",           sector: "Bất động sản", exchange: "HOSE", base: 38  },
  CEO:  { name: "C.E.O Group",           sector: "Bất động sản", exchange: "HOSE", base: 16  },
  // Thép
  NKG:  { name: "Nam Kim Steel",         sector: "Thép",         exchange: "HOSE", base: 18  },
  TLH:  { name: "Tien Len Steel",        sector: "Thép",         exchange: "HOSE", base: 12  },
  HSG:  { name: "Hoa Sen Group",         sector: "Thép",         exchange: "HOSE", base: 22  },
  // Dầu khí
  PVD:  { name: "PV Drilling",           sector: "Dầu khí",      exchange: "HOSE", base: 21  },
  PVS:  { name: "PV Technical Svc.",     sector: "Dầu khí",      exchange: "HOSE", base: 28  },
  OIL:  { name: "PV OIL",               sector: "Dầu khí",      exchange: "UPCOM",base: 12  },
  // Hóa chất & Phân bón
  DGC:  { name: "Đức Giang Chemicals",   sector: "Hóa chất",     exchange: "HOSE", base: 74  },
  DCM:  { name: "Ca Mau Fertilizer",     sector: "Hóa chất",     exchange: "HOSE", base: 22  },
  DPM:  { name: "PetroVietnam Fert.",    sector: "Hóa chất",     exchange: "HOSE", base: 28  },
  CSV:  { name: "Southern Chem.",        sector: "Hóa chất",     exchange: "HOSE", base: 42  },
  // Bán lẻ & Tiêu dùng
  PNJ:  { name: "Phu Nhuan Jewelry",     sector: "Bán lẻ",       exchange: "HOSE", base: 78  },
  QNS:  { name: "Quang Ngai Sugar",      sector: "Tiêu dùng",    exchange: "HOSE", base: 38  },
  MCH:  { name: "Masan Consumer",        sector: "Tiêu dùng",    exchange: "UPCOM",base: 148 },
  // Chứng khoán
  VCI:  { name: "Viet Capital Sec.",     sector: "Chứng khoán",  exchange: "HOSE", base: 32  },
  HCM:  { name: "HCM City Sec.",         sector: "Chứng khoán",  exchange: "HOSE", base: 22  },
  MBS:  { name: "MB Securities",         sector: "Chứng khoán",  exchange: "HOSE", base: 18  },
  // Logistics & Cảng
  VSC:  { name: "Viet Nam Container",    sector: "Logistics",    exchange: "HOSE", base: 28  },
  HAH:  { name: "Hai An Transport",      sector: "Logistics",    exchange: "HOSE", base: 46  },
  VTP:  { name: "Viettel Post",          sector: "Logistics",    exchange: "UPCOM",base: 42  },
  STG:  { name: "Sotrans Group",         sector: "Logistics",    exchange: "HOSE", base: 38  },
  // Điện & Năng lượng tái tạo
  PC1:  { name: "PC1 Group",             sector: "Điện",         exchange: "HOSE", base: 18  },
  GEX:  { name: "Gelex Group",           sector: "Điện",         exchange: "HOSE", base: 22  },
  EVF:  { name: "EVN Finance",           sector: "Điện",         exchange: "HOSE", base: 16  },
  HDC:  { name: "Hai Duong Cement",      sector: "VLXD",         exchange: "HOSE", base: 22  },
  // Thủy sản
  VHC:  { name: "Vinh Hoan Corp",        sector: "Thủy sản",     exchange: "HOSE", base: 68  },
  ANV:  { name: "Nam Viet Corp",         sector: "Thủy sản",     exchange: "HOSE", base: 18  },
  IDI:  { name: "IDI International",     sector: "Thủy sản",     exchange: "HOSE", base: 12  },
  FMC:  { name: "Sao Ta Foods",          sector: "Thủy sản",     exchange: "HOSE", base: 48  },
  // Xây dựng & VLXD
  CTD:  { name: "Coteccons",             sector: "Xây dựng",     exchange: "HOSE", base: 62  },
  HBC:  { name: "Hoa Binh Constr.",      sector: "Xây dựng",     exchange: "HOSE", base: 8   },
  VGC:  { name: "Viglacera",             sector: "VLXD",         exchange: "HOSE", base: 28  },
  BMP:  { name: "Binh Minh Plastics",    sector: "VLXD",         exchange: "HOSE", base: 58  },
  // Nông nghiệp
  DBC:  { name: "Dabaco Group",          sector: "Nông nghiệp",  exchange: "HNX",  base: 36  },
  BAF:  { name: "BaF Viet Nam Agri.",    sector: "Nông nghiệp",  exchange: "HOSE", base: 22  },
  // Công nghệ
  VGI:  { name: "Viettel Global",        sector: "Công nghệ",    exchange: "HOSE", base: 42  },
  CMG:  { name: "CMC Corp",              sector: "Công nghệ",    exchange: "HOSE", base: 38  },
  // Dược phẩm & Y tế
  DHG:  { name: "Hau Giang Pharma",      sector: "Dược phẩm",   exchange: "HOSE", base: 118 },
  IMP:  { name: "Imexpharm",             sector: "Dược phẩm",   exchange: "HOSE", base: 68  },
  DBD:  { name: "Binh Dinh Pharma",      sector: "Dược phẩm",   exchange: "HOSE", base: 38  },
  // Bảo hiểm
  BVH:  { name: "Bao Viet Holdings",     sector: "Bảo hiểm",    exchange: "HOSE", base: 52  },
  PVI:  { name: "PVI Holdings",          sector: "Bảo hiểm",    exchange: "HOSE", base: 42  },
  // HNX Midcap
  SHS:  { name: "Saigon-Hanoi Sec.",     sector: "Chứng khoán",  exchange: "HNX",  base: 14  },
  PVS:  { name: "PV Technical Svc.",     sector: "Dầu khí",      exchange: "HNX",  base: 28  },
  PGS:  { name: "PetroVietnam Gas S.",   sector: "Dầu khí",      exchange: "HNX",  base: 38  },
  PVC:  { name: "Petrovietnam Chem.",    sector: "Hóa chất",     exchange: "HNX",  base: 12  },
  // UPCOM
  VEA:  { name: "Viet Nam Engine",       sector: "Công nghiệp",  exchange: "UPCOM",base: 39  },
};

export const WATCHLIST_DEFAULT = ["FPT","VCB","HPG","BID","DGC","TCB","MBB","PVD","VHM","SSI"];

export const SECTORS = [
  "ALL",
  "Ngân hàng","Công nghệ","Bất động sản","Thép","Dầu khí",
  "Hóa chất","Tiêu dùng","Bán lẻ","Chứng khoán","Logistics",
  "Điện","Thủy sản","Xây dựng","VLXD","Nông nghiệp",
  "Hàng không","Đồ uống","Công nghiệp","Dược phẩm","Bảo hiểm","Tập đoàn",
];

// Mock OHLCV cho fallback
export function generateMock(basePrice, days = 260) {
  const data = [];
  let price = basePrice;
  const end = new Date("2026-05-30");
  for (let i = days; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const noise = (Math.random() - 0.49) * price * 0.022;
    const open  = price;
    const close = Math.max(price * 0.92, price + noise + price * 0.0003);
    const high  = Math.max(open, close) * (1 + Math.random() * 0.010);
    const low   = Math.min(open, close) * (1 - Math.random() * 0.010);
    data.push({
      date:   date.toISOString().slice(0, 10),
      open:   +open.toFixed(2),   high: +high.toFixed(2),
      low:    +low.toFixed(2),    close: +close.toFixed(2),
      volume: Math.floor(Math.random() * 8_000_000 + 200_000),
    });
    price = close;
  }
  return data;
}

export function generateMockVNIndex(days = 90) { return generateMock(1905, days); }
