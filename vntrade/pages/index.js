import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import CandlestickChart from "@/components/CandlestickChart";
import { RSIChart, MACDChart, VPAScoreChart } from "@/components/SubChart";
import PortfolioScanner from "@/components/PortfolioScanner";
import { fetchStock, fetchMarket } from "@/lib/tcbs";
import { calcEMA, calcRSI, calcMACD, calcVSA, calcCompositeScore } from "@/lib/indicators";
import { STOCKS, WATCHLIST_DEFAULT, SECTORS, generateMock, generateMockVNIndex } from "@/lib/stocks";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const NEWS_MOCK = [
  { id:1, time:"08:32", tag:"VN-Index",  title:"VN-Index tiến sát 1.920, khối ngoại mua ròng phiên thứ 5 liên tiếp",              source:"CafeF",      hot:true  },
  { id:2, time:"08:15", tag:"FPT",       title:"FPT báo lãi Q1/2026 tăng 28% YoY, mảng phần mềm nước ngoài tăng tốc",           source:"VnEconomy",  hot:true  },
  { id:3, time:"07:50", tag:"Ngân hàng", title:"NHNN giữ lãi suất điều hành, thanh khoản hệ thống dồi dào",                      source:"Vietstock",  hot:false },
  { id:4, time:"07:30", tag:"HPG",       title:"Hòa Phát nhận thêm đơn hàng thép HBI từ Mỹ, sản lượng Q2 kỳ vọng cao",          source:"CafeF",      hot:false },
  { id:5, time:"07:10", tag:"MSCI",      title:"MSCI xác nhận lộ trình nâng hạng thị trường VN vào tháng 9/2026",                source:"Bloomberg",  hot:true  },
  { id:6, time:"06:45", tag:"Vĩ mô",    title:"CPI tháng 5 tăng 3.1% YoY, lạm phát trong vùng kiểm soát",                       source:"GSO",        hot:false },
  { id:7, time:"06:20", tag:"PVD",       title:"Giá dầu WTI hồi về $74/barrel, cổ phiếu dầu khí hưởng lợi",                     source:"Reuters",    hot:false },
  { id:8, time:"05:55", tag:"DGC",       title:"Đức Giang Chemicals: Giá phốt pho vàng tăng 15% do nguồn cung TQ thu hẹp",       source:"CafeF",      hot:false },
];

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useStockData(ticker) {
  const [data,   setData]   = useState([]);
  const [source, setSource] = useState("loading");
  const [error,  setError]  = useState(null);

  useEffect(() => {
    if (!ticker) return;
    setSource("loading");
    setError(null);

    fetchStock(ticker, 400)
      .then(({ data: d, source: s }) => {
        setData(d);
        setSource(s);
      })
      .catch((err) => {
        // Fallback mock
        setData(generateMock(STOCKS[ticker]?.base || 50, 300));
        setSource("mock");
        setError(err.message);
      });
  }, [ticker]);

  return { data, source, error };
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function Badge({ source }) {
  if (source === "loading") return (
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#1a3a5018", color: "#3a7a90" }}>
      ···
    </span>
  );
  if (source === "tcbs") return (
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#00d97e15", color: "#00d97e" }}>
      LIVE
    </span>
  );
  return (
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#f0c04015", color: "#f0c040" }}>
      MOCK
    </span>
  );
}

function Sparkline({ data, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data?.length) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    const pts = data.slice(-25).map((d) => d.close);
    const mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * c.width;
      const y = c.height - ((v - mn) / r) * c.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color]);
  return <canvas ref={ref} width={72} height={28} style={{ display: "block" }} />;
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#06101a", border: "1px solid #0d1f2e", borderRadius: 5,
      padding: "7px 9px", minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: "#1e4050", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || "#dce8f0", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function NavBtn({ id, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: "5px 11px", fontSize: 11, border: "none", borderRadius: 4,
      background: active ? "#00d97e" : "transparent",
      color: active ? "#03080e" : "#3a7a90",
      cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 700 : 400,
      transition: "all 0.12s",
    }}>
      {label}
    </button>
  );
}

function ToggleBtn({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 9px", fontSize: 10, borderRadius: 4, cursor: "pointer",
      fontFamily: "inherit", transition: "all 0.12s",
      background: active ? color + "18" : "transparent",
      color: active ? color : "#1e4050",
      border: `1px solid ${active ? color + "50" : "#0d1f2e"}`,
    }}>
      {label}
    </button>
  );
}

// ── CHART VIEW ────────────────────────────────────────────────────────────────
function ChartView({ ticker, setTicker, sourceMap }) {
  const { data, source, error } = useStockData(ticker);
  const [showEMA,  setShowEMA]  = useState(true);
  const [showVol,  setShowVol]  = useState(true);
  const [showRSI,  setShowRSI]  = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [showVPA,  setShowVPA]  = useState(false);

  const ema20   = calcEMA(data, 20);
  const ema50   = calcEMA(data, 50);
  const rsi     = calcRSI(data);
  const macd    = calcMACD(data);
  const vpaScores = showVPA ? calcCompositeScore(data) : [];
  const vsaSigs = showVPA ? calcVSA(data) : [];

  const last    = data[data.length - 1] || {};
  const prev    = data[data.length - 2] || {};
  const chg     = last.close && prev.close
    ? ((last.close - prev.close) / prev.close) * 100
    : 0;
  const rsiVal  = rsi[rsi.length - 1];
  const lastVSA = vsaSigs[vsaSigs.length - 1];

  const cardBg = "06101a";

  return (
    <div className="fade-in">
      {/* Ticker header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{ticker}</span>
            <Badge source={source} />
            <span style={{ fontSize: 28, fontWeight: 700, color: chg >= 0 ? "#00d97e" : "#ff4560" }}>
              {last.close?.toFixed(2) ?? "—"}
            </span>
            <span style={{ fontSize: 13, color: chg >= 0 ? "#00d97e" : "#ff4560" }}>
              {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#2a5060", marginTop: 2 }}>
            {STOCKS[ticker]?.name} · {STOCKS[ticker]?.exchange} · {STOCKS[ticker]?.sector}
          </div>
          {error && (
            <div style={{ fontSize: 10, color: "#f0c040", marginTop: 2 }}>
              ⚠ TCBS offline — dùng mock data
            </div>
          )}
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <ToggleBtn label="EMA20/50" active={showEMA}  color="#f0c040" onClick={() => setShowEMA(p=>!p)} />
          <ToggleBtn label="Volume"   active={showVol}  color="#3b9eff" onClick={() => setShowVol(p=>!p)} />
          <ToggleBtn label="RSI"      active={showRSI}  color="#b040e0" onClick={() => setShowRSI(p=>!p)} />
          <ToggleBtn label="MACD"     active={showMACD} color="#3b9eff" onClick={() => setShowMACD(p=>!p)} />
          <ToggleBtn label="VPA Score" active={showVPA} color="#00d97e" onClick={() => setShowVPA(p=>!p)} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 8 }}>
        <StatCard label="Open"    value={last.open?.toFixed(2) ?? "—"} />
        <StatCard label="High"    value={last.high?.toFixed(2) ?? "—"} color="#00d97e" />
        <StatCard label="Low"     value={last.low?.toFixed(2)  ?? "—"} color="#ff4560" />
        <StatCard label="Vol"     value={last.volume ? (last.volume/1e6).toFixed(2)+"M" : "—"} color="#f0c040" />
        <StatCard label="RSI(14)" value={rsiVal?.toFixed(1) ?? "—"}
          color={rsiVal > 70 ? "#ff4560" : rsiVal < 30 ? "#00d97e" : "#b040e0"} />
        <StatCard label="VPA"
          value={vpaScores.length ? vpaScores[vpaScores.length-1] : "—"}
          color={vpaScores.slice(-1)[0] >= 13 ? "#00d97e" : vpaScores.slice(-1)[0] <= 7 ? "#ff4560" : "#f0c040"} />
      </div>

      {/* EMA legend */}
      {showEMA && (
        <div style={{ fontSize: 10, display: "flex", gap: 16, marginBottom: 5 }}>
          <span style={{ color: "#f0c040" }}>─ EMA20: {ema20[ema20.length-1]?.toFixed(2)}</span>
          <span style={{ color: "#40a0f0" }}>─ EMA50: {ema50[ema50.length-1]?.toFixed(2)}</span>
        </div>
      )}

      {/* VSA signals panel */}
      {showVPA && lastVSA && (lastVSA.bullish.length > 0 || lastVSA.bearish.length > 0) && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap",
          padding: "8px 10px", background: "#05101a", borderRadius: 6, border: "1px solid #0d1f2e",
        }}>
          {lastVSA.bullish.map(s => (
            <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#00d97e18", color: "#00d97e" }}>
              ▲ {s}
            </span>
          ))}
          {lastVSA.bearish.map(s => (
            <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#ff456018", color: "#ff4560" }}>
              ▼ {s}
            </span>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "10px 6px 2px", marginBottom: 5 }}>
        <CandlestickChart data={data} ema20={ema20} ema50={ema50} showEMA={showEMA} showVolume={showVol} height={showVol ? 340 : 280} />
      </div>

      {showRSI && (
        <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "6px 6px 2px", marginBottom: 5 }}>
          <RSIChart rsi={rsi} height={75} />
        </div>
      )}

      {showMACD && (
        <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "6px 6px 2px", marginBottom: 5 }}>
          <MACDChart macd={macd} height={75} />
        </div>
      )}

      {showVPA && (
        <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "6px 6px 2px", marginBottom: 5 }}>
          <VPAScoreChart scores={vpaScores} height={75} />
        </div>
      )}

      {/* Ticker picker */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
        {Object.keys(STOCKS).map((t) => (
          <button key={t} onClick={() => setTicker(t)} style={{
            padding: "4px 8px", fontSize: 10, borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", fontWeight: ticker === t ? 700 : 400,
            background: ticker === t ? "#00d97e" : "#05101a",
            color: ticker === t ? "#03080e" : "#2a6070",
            border: `1px solid ${ticker === t ? "#00d97e" : "#0d1f2e"}`,
          }}>
            {t}
            {sourceMap[t] === "tcbs" && ticker !== t && (
              <span style={{ marginLeft: 2, fontSize: 7, color: "#00d97e" }}>●</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── WATCHLIST VIEW ────────────────────────────────────────────────────────────
function WatchlistView({ watchlist, setWatchlist, stockCache, setActiveTicker, setNav }) {
  return (
    <div className="fade-in">
      <div style={{ fontSize: 11, color: "#2a5060", marginBottom: 14 }}>
        {watchlist.length} cổ phiếu
      </div>

      {watchlist.map((t) => {
        const d  = stockCache[t];
        if (!d || d.length < 2) return (
          <div key={t} style={{ background: "#06101a", border: "1px solid #0d1f2e", borderRadius: 7, padding: 12, marginBottom: 7, color: "#1e4050", fontSize: 12 }}>
            {t} — đang tải...
          </div>
        );
        const la = d[d.length - 1], pv = d[d.length - 2];
        const c  = ((la.close - pv.close) / pv.close) * 100;
        return (
          <div key={t}
            onClick={() => { setActiveTicker(t); setNav("chart"); }}
            style={{
              background: "#06101a", border: "1px solid #0d1f2e", borderRadius: 7,
              padding: "11px 14px", marginBottom: 7, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "border-color 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1a3a50")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#0d1f2e")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t}</div>
                <div style={{ fontSize: 10, color: "#2a5060" }}>{STOCKS[t]?.exchange} · {STOCKS[t]?.sector}</div>
              </div>
              <Sparkline data={d} color={c >= 0 ? "#00d97e" : "#ff4560"} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{la.close.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: c >= 0 ? "#00d97e" : "#ff4560", fontWeight: 600 }}>
                {c >= 0 ? "▲" : "▼"} {Math.abs(c).toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {/* Add stocks */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, color: "#1e4050", marginBottom: 6, letterSpacing: 1 }}>THÊM CỔ PHIẾU</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(STOCKS).filter((t) => !watchlist.includes(t)).map((t) => (
            <button key={t} onClick={() => setWatchlist((p) => [...p, t])} style={{
              padding: "4px 8px", fontSize: 10, background: "transparent",
              color: "#2a5060", border: "1px dashed #0d1f2e", borderRadius: 4,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              + {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SCREENER VIEW ─────────────────────────────────────────────────────────────
function ScreenerView({ stockCache, setActiveTicker, setNav }) {
  const [filters, setFilters] = useState({ exchange: "ALL", sector: "ALL", minVol: 500000, rsiMin: 0, rsiMax: 100 });
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy]   = useState("vol");

  const run = useCallback(() => {
    const out = [];
    Object.entries(STOCKS).forEach(([ticker, info]) => {
      const d = stockCache[ticker];
      if (!d || d.length < 20) return;
      const last = d[d.length - 1], prev = d[d.length - 2];
      const chg  = ((last.close - prev.close) / prev.close) * 100;
      const rsi  = calcRSI(d);
      const r    = rsi[rsi.length - 1] ?? 50;
      const ema20 = calcEMA(d, 20);
      const ema50 = calcEMA(d, 50);
      const aboveEMA = last.close > (ema20[ema20.length - 1] ?? 0);
      const goldenCross = (ema20[ema20.length - 1] > ema50[ema50.length - 1]) &&
                          (ema20[ema20.length - 2] <= ema50[ema50.length - 2]);
      const vpaScores = calcCompositeScore(d);
      const vpa = vpaScores[vpaScores.length - 1];

      if (
        last.volume >= filters.minVol &&
        r >= filters.rsiMin && r <= filters.rsiMax &&
        (filters.exchange === "ALL" || info.exchange === filters.exchange) &&
        (filters.sector   === "ALL" || info.sector   === filters.sector)
      ) {
        out.push({ ticker, ...info, close: last.close, chg, vol: last.volume, rsi: r, aboveEMA, goldenCross, vpa });
      }
    });

    const sorted = [...out].sort((a, b) => {
      if (sortBy === "vol")    return b.vol - a.vol;
      if (sortBy === "chg")    return b.chg - a.chg;
      if (sortBy === "rsi")    return b.rsi - a.rsi;
      if (sortBy === "vpa")    return b.vpa - a.vpa;
      return 0;
    });
    setResults(sorted);
  }, [stockCache, filters, sortBy]);

  useEffect(() => { run(); }, [run]);

  const selStyle = {
    background: "#06101a", border: "1px solid #0d1f2e", color: "#a8c8d8",
    padding: "6px 10px", borderRadius: 4, fontSize: 11,
    fontFamily: "'IBM Plex Mono',monospace",
  };

  const thStyle = { padding: "7px 10px", color: "#2a5060", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", fontSize: 11 };
  const tdStyle = (col) => ({ padding: "8px 10px", color: col || "#8ab8c8", fontSize: 11 });

  return (
    <div className="fade-in">
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { lb: "Sàn",    key: "exchange", opts: ["ALL","HOSE","HNX","UPCOM"] },
          { lb: "Ngành",  key: "sector",   opts: SECTORS },
        ].map((f) => (
          <div key={f.key}>
            <div style={{ fontSize: 9, color: "#2a5060", marginBottom: 3, letterSpacing: 1 }}>{f.lb.toUpperCase()}</div>
            <select style={selStyle} value={filters[f.key]}
              onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}>
              {f.opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 9, color: "#2a5060", marginBottom: 3, letterSpacing: 1 }}>VOL TỐI THIỂU</div>
          <select style={selStyle} value={filters.minVol}
            onChange={(e) => setFilters((p) => ({ ...p, minVol: +e.target.value }))}>
            {[[50000,"50K+"],[500000,"500K+"],[1000000,"1M+"],[5000000,"5M+"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#2a5060", marginBottom: 3, letterSpacing: 1 }}>SẮP XẾP</div>
          <select style={selStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {[["vol","Volume"],["chg","% Thay đổi"],["rsi","RSI"],["vpa","VPA Score"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={run} style={{
            background: "#00d97e", color: "#03080e", border: "none",
            padding: "8px 16px", borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: 11,
          }}>⚡ Lọc</button>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#1e4050", marginBottom: 8 }}>
        {results.length} kết quả · Click vào hàng để mở chart
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #0d1f2e" }}>
              {["Ticker","Ngành","Sàn","Giá","% Thay đổi","Volume","RSI","VPA","EMA","Signal"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.ticker}
                onClick={() => { setActiveTicker(r.ticker); setNav("chart"); }}
                style={{ borderBottom: "1px solid #07111a", background: i % 2 === 0 ? "#04090e" : "transparent", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0a1a28")}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#04090e" : "transparent")}>
                <td style={{ ...tdStyle(), color: "#5aaeff", fontWeight: 700 }}>{r.ticker}</td>
                <td style={tdStyle()}>{r.sector}</td>
                <td style={{ ...tdStyle(), color: "#1e4050" }}>{r.exchange}</td>
                <td style={{ ...tdStyle(), color: "#fff", fontWeight: 600 }}>{r.close.toFixed(2)}</td>
                <td style={{ ...tdStyle(), color: r.chg >= 0 ? "#00d97e" : "#ff4560", fontWeight: 700 }}>
                  {r.chg >= 0 ? "▲" : "▼"}{Math.abs(r.chg).toFixed(2)}%
                </td>
                <td style={{ ...tdStyle(), color: "#f0c040" }}>{(r.vol/1e6).toFixed(2)}M</td>
                <td style={{ ...tdStyle(), color: r.rsi > 70 ? "#ff4560" : r.rsi < 30 ? "#00d97e" : "#b040e0", fontWeight: 700 }}>
                  {r.rsi.toFixed(1)}
                </td>
                <td style={{ ...tdStyle(), color: r.vpa >= 13 ? "#00d97e" : r.vpa <= 7 ? "#ff4560" : "#f0c040", fontWeight: 700 }}>
                  {r.vpa}/20
                </td>
                <td>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6,
                    background: r.aboveEMA ? "#00d97e15" : "#ff456015",
                    color: r.aboveEMA ? "#00d97e" : "#ff4560" }}>
                    {r.aboveEMA ? "Above" : "Below"}
                  </span>
                </td>
                <td>
                  {r.goldenCross && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "#f0c04020", color: "#f0c040" }}>
                      ✦ Golden X
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 24, color: "#1e4050", textAlign: "center", fontSize: 12 }}>
                  Không có kết quả — thử điều chỉnh bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── NEWS VIEW ─────────────────────────────────────────────────────────────────
function NewsView() {
  const [filter, setFilter] = useState("ALL");
  const tags = ["ALL","VN-Index","FPT","HPG","Ngân hàng","MSCI","Vĩ mô","PVD","DGC"];
  const news = filter === "ALL" ? NEWS_MOCK : NEWS_MOCK.filter((n) => n.tag === filter);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {tags.map((tag) => (
          <button key={tag} onClick={() => setFilter(tag)} style={{
            padding: "4px 9px", fontSize: 10, borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.12s",
            background: filter === tag ? "#00d97e15" : "transparent",
            color:      filter === tag ? "#00d97e"   : "#2a5060",
            border: `1px solid ${filter === tag ? "#00d97e40" : "#0d1f2e"}`,
          }}>{tag}</button>
        ))}
      </div>

      {news.map((n) => (
        <div key={n.id} style={{
          background: "#06101a",
          border: "1px solid #0d1f2e",
          borderLeft: `3px solid ${n.hot ? "#00d97e" : "#0d1f2e"}`,
          borderRadius: 7, padding: "11px 14px", marginBottom: 7,
          transition: "border-color 0.12s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1a3a50")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#0d1f2e")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: "#00d97e12", color: "#00d97e", fontWeight: 600 }}>{n.tag}</span>
            <span style={{ fontSize: 10, color: "#2a5060" }}>{n.source}</span>
            <span style={{ fontSize: 10, color: "#1e4050", marginLeft: "auto" }}>{n.time}</span>
            {n.hot && <span style={{ fontSize: 10, color: "#ff9040" }}>🔥</span>}
          </div>
          <div style={{ fontSize: 13, color: "#c8d8e8", lineHeight: 1.6 }}>{n.title}</div>
        </div>
      ))}
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [nav,       setNav]       = useState("chart");
  const [ticker,    setTicker]    = useState("FPT");
  const [watchlist, setWatchlist] = useState(WATCHLIST_DEFAULT);

  // Shared stock cache for screener + watchlist
  const [stockCache, setStockCache] = useState({});
  const [sourceMap,  setSourceMap]  = useState({});

  // Preload watchlist + all tickers for screener
  useEffect(() => {
    const all = [...new Set([...watchlist, ...Object.keys(STOCKS)])];
    all.forEach((t) => {
      if (stockCache[t]) return;
      fetchStock(t, 400)
        .then(({ data: d, source: s }) => {
          setStockCache((p) => ({ ...p, [t]: d }));
          setSourceMap((p)  => ({ ...p, [t]: s }));
        })
        .catch(() => {
          setStockCache((p) => ({ ...p, [t]: generateMock(STOCKS[t]?.base || 50, 300) }));
          setSourceMap((p)  => ({ ...p, [t]: "mock" }));
        });
    });
  }, []);

  // VN-Index
  const [vnData,   setVnData]   = useState(null);
  const [vnSource, setVnSource] = useState("loading");
  useEffect(() => {
    fetchStock("VNINDEX", 60)
      .then(({ data: d, source: s }) => { setVnData(d); setVnSource(s); })
      .catch(() => { setVnData(generateMockVNIndex()); setVnSource("mock"); });
  }, []);

  const vnLast = vnData?.[vnData.length - 1];
  const vnPrev = vnData?.[vnData.length - 2];
  const vnChg  = vnLast && vnPrev ? ((vnLast.close - vnPrev.close) / vnPrev.close) * 100 : 0;

  const liveCnt = Object.values(sourceMap).filter((s) => s === "tcbs").length;
  const mockCnt = Object.values(sourceMap).filter((s) => s === "mock").length;

  return (
    <>
      <Head>
        <title>VNTrade — Theo dõi chứng khoán Việt Nam</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* ── TOP BAR ── */}
        <header style={{
          background: "#050c16", borderBottom: "1px solid #0a1c2c",
          padding: "0 16px", height: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, gap: 12,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#00d97e",
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>VN</span>
            <span style={{ fontSize: 14, color: "#00d97e" }}>TRADE</span>
          </div>

          {/* VN-Index */}
          <div style={{ fontSize: 12, flexShrink: 0 }}>
            <span style={{ color: "#2a5060" }}>VN-Index </span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{vnLast?.close.toFixed(2) ?? "···"}</span>
            {vnLast && (
              <span style={{ color: vnChg >= 0 ? "#00d97e" : "#ff4560", marginLeft: 6 }}>
                {vnChg >= 0 ? "▲" : "▼"}{Math.abs(vnChg).toFixed(2)}%
              </span>
            )}
            <Badge source={vnSource} />
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 2 }}>
            <NavBtn id="chart"    label="📈 Chart"    active={nav === "chart"}    onClick={setNav} />
            <NavBtn id="watchlist"label="⭐ Watchlist" active={nav === "watchlist"} onClick={setNav} />
            <NavBtn id="screener" label="🔍 Screener"  active={nav === "screener"}  onClick={setNav} />
            <NavBtn id="scanner"  label="🎯 4 Danh Mục" active={nav === "scanner"}  onClick={setNav} />
            <NavBtn id="news"     label="📰 Tin tức"  active={nav === "news"}     onClick={setNav} />
          </nav>
        </header>

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {nav === "chart"     && <ChartView ticker={ticker} setTicker={setTicker} sourceMap={sourceMap} />}
          {nav === "watchlist" && <WatchlistView watchlist={watchlist} setWatchlist={setWatchlist} stockCache={stockCache} setActiveTicker={setTicker} setNav={setNav} />}
          {nav === "screener"  && <ScreenerView stockCache={stockCache} setActiveTicker={setTicker} setNav={setNav} />}
          {nav === "scanner"   && <PortfolioScanner stockCache={stockCache} onSelectTicker={setTicker} setNav={setNav} />}
          {nav === "news"      && <NewsView />}
        </main>

        {/* ── STATUS BAR ── */}
        <footer style={{
          background: "#02050a", borderTop: "1px solid #07121c",
          padding: "3px 16px", display: "flex", justifyContent: "space-between",
          fontSize: 10, color: "#0e2030", flexShrink: 0,
        }}>
          <span>
            API: apipubaws.tcbs.com.vn/stock-insight/v1 ·{" "}
            <span style={{ color: "#00d97e40" }}>{liveCnt} live</span> ·{" "}
            <span style={{ color: "#f0c04040" }}>{mockCnt} mock</span>
          </span>
          <span>HOSE · ICT</span>
        </footer>
      </div>
    </>
  );
}
