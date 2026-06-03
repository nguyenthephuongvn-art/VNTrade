import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import CandlestickChart from "@/components/CandlestickChart";
import { RSIChart, MACDChart, VPAScoreChart, MCDXChart } from "@/components/SubChart";
import PortfolioScanner from "@/components/PortfolioScanner";
import { fetchStock, fetchMarket } from "@/lib/tcbs";
import { calcEMA, calcRSI, calcMACD, calcVSA, calcCompositeScore, calcMCDX, getMCDXSignal } from "@/lib/indicators";
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
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#1a3a5018", color: "var(--text-sub)" }}>
      ···
    </span>
  );
  if (source === "tcbs" || source === "yahoo" || source === "vndirect") return (
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#00d97e15", color: "var(--green)" }}>
      LIVE
    </span>
  );
  return (
    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#f0c04015", color: "var(--yellow)" }}>
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
      background: "var(--bg-card)", border: "1px solid #0d1f2e", borderRadius: 5,
      padding: "7px 9px", minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || "var(--text-primary)", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function NavBtn({ id, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: "5px 11px", fontSize: 11, border: "none", borderRadius: 4,
      background: active ? "var(--green)" : "transparent",
      color: active ? "var(--bg-deep)" : "var(--text-sub)",
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
      color: active ? color : "var(--text-muted)",
      border: `1px solid ${active ? color + "50" : "var(--border)"}`,
    }}>
      {label}
    </button>
  );
}


// ── CUSTOM TICKER INPUT ────────────────────────────────────────────────────────
function CustomTickerInput({ ticker, setTicker, sourceMap }) {
  const [custom, setCustom] = useState("");
  const allTickers = Object.keys(STOCKS);

  const handleCustom = (e) => {
    e.preventDefault();
    const t = custom.trim().toUpperCase();
    if (t.length >= 2 && t.length <= 5) {
      setTicker(t);
      setCustom("");
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Custom input */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1 }}>TÌM MÃ:</span>
        <form onSubmit={handleCustom} style={{ display: "flex", gap: 4 }}>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value.toUpperCase())}
            placeholder="VD: HSG, DIG..."
            maxLength={5}
            style={{
              padding: "4px 8px", fontSize: 11, width: 120,
              background: "var(--bg-card)", border: "1px solid var(--border-hi)",
              color: "var(--text-primary)", borderRadius: 3, fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button type="submit" style={{
            padding: "4px 10px", fontSize: 10, background: "var(--blue)",
            color: "#0a0e1a", border: "none", borderRadius: 3,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
          }}>→</button>
        </form>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          (bất kỳ mã niêm yết trên Yahoo Finance .VN)
        </span>
      </div>
      {/* Preset tickers */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {allTickers.map((t) => (
          <button key={t} onClick={() => setTicker(t)} style={{
            padding: "3px 7px", fontSize: 10, borderRadius: 3, cursor: "pointer",
            fontFamily: "inherit", fontWeight: ticker === t ? 700 : 400,
            background: ticker === t ? "var(--green)" : "var(--bg-card)",
            color: ticker === t ? "#0a0e1a" : "var(--text-muted)",
            border: `1px solid ${ticker === t ? "var(--green)" : "var(--border)"}`,
            transition: "all 0.1s",
          }}>
            {t}
            {sourceMap[t] === "yahoo" && ticker !== t && (
              <span style={{ marginLeft: 2, fontSize: 7, color: "var(--green)" }}>●</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


// ── QUICK SEARCH — ô nhập mã cổ phiếu ────────────────────────────────────────
function QuickSearch({ setTicker }) {
  const [val, setVal] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const allTickers = Object.keys(STOCKS);

  const handleChange = (e) => {
    const v = e.target.value.toUpperCase();
    setVal(v);
    if (v.length >= 1) {
      setSuggestions(
        allTickers.filter(t => t.startsWith(v) || STOCKS[t].name.toUpperCase().includes(v)).slice(0, 8)
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (t) => {
    setTicker(t);
    setVal("");
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = val.trim().toUpperCase();
    if (t.length >= 2) { handleSelect(t); }
  };

  return (
    <div style={{ position: "relative" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 0 }}>
        <input
          value={val}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
          placeholder="Nhập mã CK..."
          maxLength={6}
          style={{
            padding: "6px 10px", fontSize: 12, width: 140,
            background: "var(--bg-card)", border: "1px solid var(--border-hi)",
            borderRight: "none", color: "var(--text-primary)",
            borderRadius: "4px 0 0 4px", fontFamily: "inherit", outline: "none",
          }}
        />
        <button type="submit" style={{
          padding: "6px 12px", fontSize: 12, fontWeight: 700,
          background: "var(--blue)", color: "#0a0e1a",
          border: "none", borderRadius: "0 4px 4px 0",
          cursor: "pointer", fontFamily: "inherit",
        }}>→</button>
      </form>

      {/* Dropdown gợi ý */}
      {suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: "#111828", border: "1px solid var(--border-hi)",
          borderRadius: 4, boxShadow: "0 8px 24px #00000099",
          marginTop: 2,
        }}>
          {suggestions.map(t => (
            <div key={t}
              onMouseDown={() => handleSelect(t)}
              style={{
                padding: "7px 12px", cursor: "pointer", fontSize: 11,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: "var(--blue)", fontWeight: 700 }}>{t}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                {STOCKS[t]?.name?.slice(0, 22)}
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                {STOCKS[t]?.exchange}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [showMCDX, setShowMCDX] = useState(false);
  const [hoverCandle, setHoverCandle] = useState(null); // cây nến đang hover

  const ema20   = calcEMA(data, 20);
  const ema50   = calcEMA(data, 50);
  const ema200  = calcEMA(data, 200);
  const rsi     = calcRSI(data);
  const macd    = calcMACD(data);
  const vpaScores = showVPA ? calcCompositeScore(data) : [];
  const mcdxScores = showMCDX ? calcMCDX(data) : [];
  const mcdxSignal = showMCDX ? getMCDXSignal(calcMCDX(data)) : null;
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
      {/* ══ COMPACT TOP BAR ══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 6, marginBottom: 5,
        borderBottom: "1px solid var(--border)", paddingBottom: 5,
      }}>
        {/* LEFT: Mã + giá + thông tin ngang */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>{ticker}</span>
          <Badge source={source} />
          <span style={{ fontSize: 20, fontWeight: 700, color: chg >= 0 ? "var(--green)" : "var(--red)" }}>
            {last.close?.toFixed(2) ?? "—"}
          </span>
          <span style={{ fontSize: 11, color: chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
            {chg >= 0 ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {STOCKS[ticker]?.name?.slice(0,20) ?? ticker}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
            {STOCKS[ticker]?.exchange} · {STOCKS[ticker]?.sector}
          </span>
        </div>
        {/* RIGHT: Quick search */}
        <QuickSearch setTicker={setTicker} />
      </div>

      {/* ══ TOGGLES + OHLCV INFO — 1 hàng ngang ══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 4, marginBottom: 4,
      }}>
        {/* Toggles */}
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <ToggleBtn label="EMA"    active={showEMA}  color="var(--yellow)" onClick={() => setShowEMA(p=>!p)} />
          <ToggleBtn label="Vol"    active={showVol}  color="var(--blue)"   onClick={() => setShowVol(p=>!p)} />
          <ToggleBtn label="RSI"    active={showRSI}  color="var(--purple)" onClick={() => setShowRSI(p=>!p)} />
          <ToggleBtn label="MACD"   active={showMACD} color="var(--blue)"   onClick={() => setShowMACD(p=>!p)} />
          <ToggleBtn label="VPA"    active={showVPA}  color="var(--green)"  onClick={() => setShowVPA(p=>!p)} />
          <ToggleBtn label="MCDX"   active={showMCDX} color="var(--orange)" onClick={() => setShowMCDX(p=>!p)} />
        </div>
        {/* OHLCV inline — không cần ô, chỉ chữ */}
        <div style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "monospace", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)" }}>O</span>
          <span style={{ color: "#e8f0f8" }}>{(hoverCandle || last).open?.toFixed(2)}</span>
          <span style={{ color: "var(--green)" }}>H {(hoverCandle || last).high?.toFixed(2)}</span>
          <span style={{ color: "var(--red)" }}>L {(hoverCandle || last).low?.toFixed(2)}</span>
          <span style={{ color: chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
            C {(hoverCandle || last).close?.toFixed(2)}
          </span>
          <span style={{ color: "var(--yellow)" }}>
            V {((hoverCandle || last).volume/1e6)?.toFixed(2)}M
          </span>
          {hoverCandle && (
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{hoverCandle.date}</span>
          )}
          <span style={{ color: "var(--purple)", fontSize: 10 }}>RSI {rsiVal?.toFixed(1)}</span>
          {showEMA && (
            <>
              <span style={{ color: "var(--yellow)", fontSize: 10 }}>EMA20 {ema20[ema20.length-1]?.toFixed(0)}</span>
              <span style={{ color: "var(--blue)", fontSize: 10 }}>EMA50 {ema50[ema50.length-1]?.toFixed(0)}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats moved to inline bar above */}



      {/* VSA signals panel */}
      {showVPA && lastVSA && (lastVSA.bullish.length > 0 || lastVSA.bearish.length > 0) && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap",
          padding: "8px 10px", background: "var(--bg-card)", borderRadius: 6, border: "1px solid #0d1f2e",
        }}>
          {lastVSA.bullish.map(s => (
            <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#00d97e18", color: "var(--green)" }}>
              ▲ {s}
            </span>
          ))}
          {lastVSA.bearish.map(s => (
            <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#ff456018", color: "var(--red)" }}>
              ▼ {s}
            </span>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "10px 6px 2px", marginBottom: 5 }}>
        <CandlestickChart data={data} ema20={ema20} ema50={ema50} ema200={ema200} showEMA={showEMA} showVolume={showVol} height={showVol ? 360 : 300} ticker={ticker} onHover={setHoverCandle} />
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

      {showMCDX && mcdxSignal && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
          background: "var(--bg-card)", border: "1px solid #0d1f2e", borderRadius: 7, marginBottom: 5,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-sub)" }}>MCDX Banker Signal:</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 8,
            background: mcdxSignal.signal === "accumulation" ? "#00d97e20" : mcdxSignal.signal === "distribution" ? "#ff456020" : "#3b9eff20",
            color:      mcdxSignal.signal === "accumulation" ? "var(--green)"   : mcdxSignal.signal === "distribution" ? "var(--red)"   : "var(--blue)",
          }}>
            {mcdxSignal.signal === "accumulation" ? "▲ TÍCH LŨY" : mcdxSignal.signal === "distribution" ? "▼ PHÂN PHỐI" : "→ TRUNG TÍNH"}
          </span>
          <span style={{ fontSize: 11, color: "var(--yellow)" }}>Score: {mcdxSignal.strength}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>
            {mcdxSignal.signal === "accumulation" ? "Banker đang mua tích lũy" : mcdxSignal.signal === "distribution" ? "Banker đang bán phân phối" : "Chưa có tín hiệu rõ"}
          </span>
        </div>
      )}

      {showMCDX && (
        <div style={{ background: "#050f18", border: "1px solid #0d1f2e", borderRadius: 7, padding: "6px 6px 2px", marginBottom: 5 }}>
          <MCDXChart mcdx={mcdxScores} height={88} />
        </div>
      )}

      {/* Ticker picker */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
        {Object.keys(STOCKS).map((t) => (
          <button key={t} onClick={() => setTicker(t)} style={{
            padding: "4px 8px", fontSize: 10, borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", fontWeight: ticker === t ? 700 : 400,
            background: ticker === t ? "var(--green)" : "var(--bg-card)",
            color: ticker === t ? "var(--bg-deep)" : "var(--text-muted)",
            border: `1px solid ${ticker === t ? "var(--green)" : "var(--border)"}`,
          }}>
            {t}
            {sourceMap[t] === "tcbs" && ticker !== t && (
              <span style={{ marginLeft: 2, fontSize: 7, color: "var(--green)" }}>●</span>
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
      <div style={{ fontSize: 11, color: "var(--text-sub)", marginBottom: 14 }}>
        {watchlist.length} cổ phiếu
      </div>

      {watchlist.map((t) => {
        const d  = stockCache[t];
        if (!d || d.length < 2) return (
          <div key={t} style={{ background: "var(--bg-card)", border: "1px solid #0d1f2e", borderRadius: 7, padding: 12, marginBottom: 7, color: "var(--text-muted)", fontSize: 12 }}>
            {t} — đang tải...
          </div>
        );
        const la = d[d.length - 1], pv = d[d.length - 2];
        const c  = ((la.close - pv.close) / pv.close) * 100;
        return (
          <div key={t}
            onClick={() => { setActiveTicker(t); setNav("chart"); }}
            style={{
              background: "var(--bg-card)", border: "1px solid #0d1f2e", borderRadius: 7,
              padding: "11px 14px", marginBottom: 7, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "border-color 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t}</div>
                <div style={{ fontSize: 10, color: "var(--text-sub)" }}>{STOCKS[t]?.exchange} · {STOCKS[t]?.sector}</div>
              </div>
              <Sparkline data={d} color={c >= 0 ? "var(--green)" : "var(--red)"} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{la.close.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: c >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                {c >= 0 ? "▲" : "▼"} {Math.abs(c).toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {/* Add stocks */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 1 }}>THÊM CỔ PHIẾU</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(STOCKS).filter((t) => !watchlist.includes(t)).map((t) => (
            <button key={t} onClick={() => setWatchlist((p) => [...p, t])} style={{
              padding: "4px 8px", fontSize: 10, background: "transparent",
              color: "var(--text-sub)", border: "1px dashed #0d1f2e", borderRadius: 4,
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
    background: "var(--bg-card)", border: "1px solid #0d1f2e", color: "var(--text-sub)",
    padding: "6px 10px", borderRadius: 4, fontSize: 11,
    fontFamily: "'IBM Plex Mono',monospace",
  };

  const thStyle = { padding: "7px 10px", color: "var(--text-sub)", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", fontSize: 11 };
  const tdStyle = (col) => ({ padding: "8px 10px", color: col || "var(--text-sub)", fontSize: 11 });

  return (
    <div className="fade-in">
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { lb: "Sàn",    key: "exchange", opts: ["ALL","HOSE","HNX","UPCOM"] },
          { lb: "Ngành",  key: "sector",   opts: SECTORS },
        ].map((f) => (
          <div key={f.key}>
            <div style={{ fontSize: 9, color: "var(--text-sub)", marginBottom: 3, letterSpacing: 1 }}>{f.lb.toUpperCase()}</div>
            <select style={selStyle} value={filters[f.key]}
              onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}>
              {f.opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 9, color: "var(--text-sub)", marginBottom: 3, letterSpacing: 1 }}>VOL TỐI THIỂU</div>
          <select style={selStyle} value={filters.minVol}
            onChange={(e) => setFilters((p) => ({ ...p, minVol: +e.target.value }))}>
            {[[50000,"50K+"],[500000,"500K+"],[1000000,"1M+"],[5000000,"5M+"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "var(--text-sub)", marginBottom: 3, letterSpacing: 1 }}>SẮP XẾP</div>
          <select style={selStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {[["vol","Volume"],["chg","% Thay đổi"],["rsi","RSI"],["vpa","VPA Score"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={run} style={{
            background: "var(--green)", color: "var(--bg-deep)", border: "none",
            padding: "8px 16px", borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: 11,
          }}>⚡ Lọc</button>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8 }}>
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
                style={{ borderBottom: "1px solid #07111a", background: i % 2 === 0 ? "var(--bg-deep)" : "transparent", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-deep)" : "transparent")}>
                <td style={{ ...tdStyle(), color: "#5aaeff", fontWeight: 700 }}>{r.ticker}</td>
                <td style={tdStyle()}>{r.sector}</td>
                <td style={{ ...tdStyle(), color: "var(--text-muted)" }}>{r.exchange}</td>
                <td style={{ ...tdStyle(), color: "#fff", fontWeight: 600 }}>{r.close.toFixed(2)}</td>
                <td style={{ ...tdStyle(), color: r.chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                  {r.chg >= 0 ? "▲" : "▼"}{Math.abs(r.chg).toFixed(2)}%
                </td>
                <td style={{ ...tdStyle(), color: "var(--yellow)" }}>{(r.vol/1e6).toFixed(2)}M</td>
                <td style={{ ...tdStyle(), color: r.rsi > 70 ? "var(--red)" : r.rsi < 30 ? "var(--green)" : "var(--purple)", fontWeight: 700 }}>
                  {r.rsi.toFixed(1)}
                </td>
                <td style={{ ...tdStyle(), color: r.vpa >= 13 ? "var(--green)" : r.vpa <= 7 ? "var(--red)" : "var(--yellow)", fontWeight: 700 }}>
                  {r.vpa}/20
                </td>
                <td>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6,
                    background: r.aboveEMA ? "#00d97e15" : "#ff456015",
                    color: r.aboveEMA ? "var(--green)" : "var(--red)" }}>
                    {r.aboveEMA ? "Above" : "Below"}
                  </span>
                </td>
                <td>
                  {r.goldenCross && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "#f0c04020", color: "var(--yellow)" }}>
                      ✦ Golden X
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center", fontSize: 12 }}>
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
            color:      filter === tag ? "var(--green)"   : "var(--text-sub)",
            border: `1px solid ${filter === tag ? "#00d97e40" : "var(--border)"}`,
          }}>{tag}</button>
        ))}
      </div>

      {news.map((n) => (
        <div key={n.id} style={{
          background: "var(--bg-card)",
          border: "1px solid #0d1f2e",
          borderLeft: `3px solid ${n.hot ? "var(--green)" : "var(--border)"}`,
          borderRadius: 7, padding: "11px 14px", marginBottom: 7,
          transition: "border-color 0.12s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: "#00d97e12", color: "var(--green)", fontWeight: 600 }}>{n.tag}</span>
            <span style={{ fontSize: 10, color: "var(--text-sub)" }}>{n.source}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>{n.time}</span>
            {n.hot && <span style={{ fontSize: 10, color: "var(--orange)" }}>🔥</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{n.title}</div>
        </div>
      ))}
    </div>
  );
}


// ── TOPBAR SEARCH — ô nhập mã nhỏ gọn trên topbar ────────────────────────────
function TopbarSearch({ ticker, setTicker, setNav }) {
  const [val, setVal] = useState("");
  const [sugg, setSugg] = useState([]);
  const allTickers = Object.keys(STOCKS);

  const onChange = (e) => {
    const v = e.target.value.toUpperCase();
    setVal(v);
    setSugg(v.length >= 1
      ? allTickers.filter(t => t.startsWith(v) || STOCKS[t].name.toUpperCase().includes(v)).slice(0, 6)
      : []
    );
  };

  const pick = (t) => {
    setTicker(t);
    setNav("chart");
    setVal("");
    setSugg([]);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const t = val.trim().toUpperCase();
    if (t.length >= 2) pick(t);
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 0 }}>
        <input
          value={val}
          onChange={onChange}
          onBlur={() => setTimeout(() => setSugg([]), 180)}
          placeholder={ticker || "Mã CK..."}
          maxLength={6}
          style={{
            width: 96, padding: "4px 8px", fontSize: 11,
            background: "var(--bg-card)", border: "1px solid var(--border-hi)",
            borderRight: "none", color: "var(--text-primary)",
            borderRadius: "3px 0 0 3px", fontFamily: "inherit", outline: "none",
          }}
        />
        <button type="submit" style={{
          padding: "4px 8px", fontSize: 11, fontWeight: 700,
          background: "var(--blue)", color: "#0a0e1a",
          border: "none", borderRadius: "0 3px 3px 0",
          cursor: "pointer", fontFamily: "inherit",
        }}>↵</button>
      </form>

      {sugg.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 500,
          background: "#111828", border: "1px solid var(--border-hi)",
          borderRadius: 4, minWidth: 200, marginTop: 2,
          boxShadow: "0 8px 24px #000000aa",
        }}>
          {sugg.map(t => (
            <div key={t} onMouseDown={() => pick(t)} style={{
              padding: "6px 10px", cursor: "pointer", fontSize: 11,
              display: "flex", gap: 8, alignItems: "center",
              borderBottom: "1px solid var(--border)",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = ""}
            >
              <span style={{ color: "var(--blue)", fontWeight: 700, minWidth: 36 }}>{t}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 10, flex: 1 }}>{STOCKS[t]?.name?.slice(0,24)}</span>
              <span style={{ color: "var(--text-dim)", fontSize: 9 }}>{STOCKS[t]?.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TOPBAR TICKER INFO — giá + OHLCV của mã đang xem ─────────────────────────
function TopbarTickerInfo({ ticker, stockCache, rsiVal }) {
  const d = stockCache[ticker];
  if (!d || d.length < 2) return (
    <span style={{ fontSize: 10, color: "var(--text-dim)" }}>đang tải {ticker}...</span>
  );
  const last = d[d.length - 1];
  const prev = d[d.length - 2];
  const chg  = ((last.close - prev.close) / prev.close) * 100;
  const bull = chg >= 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "monospace", overflow: "hidden" }}>
      {/* Tên mã + giá */}
      <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>{ticker}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: bull ? "var(--green)" : "var(--red)", flexShrink: 0 }}>
        {last.close.toFixed(2)}
      </span>
      <span style={{ color: bull ? "var(--green)" : "var(--red)", fontWeight: 700, flexShrink: 0 }}>
        {bull ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%
      </span>
      <span style={{ color: "var(--border-hi)", flexShrink: 0 }}>│</span>
      {/* OHLCV */}
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>O</span>
      <span style={{ color: "#e8f0f8", flexShrink: 0 }}>{last.open.toFixed(2)}</span>
      <span style={{ color: "var(--green)", flexShrink: 0 }}>H {last.high.toFixed(2)}</span>
      <span style={{ color: "var(--red)", flexShrink: 0 }}>L {last.low.toFixed(2)}</span>
      <span style={{ color: "var(--yellow)", flexShrink: 0 }}>
        V {(last.volume/1e6).toFixed(2)}M
      </span>
      {rsiVal != null && (
        <>
          <span style={{ color: "var(--border-hi)", flexShrink: 0 }}>│</span>
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>RSI</span>
          <span style={{
            color: rsiVal > 70 ? "var(--red)" : rsiVal < 30 ? "var(--green)" : "var(--purple)",
            fontWeight: 700, flexShrink: 0
          }}>{rsiVal.toFixed(1)}</span>
        </>
      )}
      <span style={{ color: "var(--text-dim)", fontSize: 10, flexShrink: 0 }}>
        {last.date}
      </span>
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

  // RSI của mã hiện tại để hiển thị trên topbar
  const _topbarData = stockCache[ticker] || [];
  const _topbarRSI  = _topbarData.length > 14 ? calcRSI(_topbarData) : [];
  const rsiVal      = _topbarRSI[_topbarRSI.length - 1] ?? null;
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
          background: "var(--bg-base)", borderBottom: "1px solid #0a1c2c",
          padding: "0 16px", height: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, gap: 12,
        }}>
          {/* ── LEFT: Logo + Ô nhập mã + VNINDEX + Giá mã hiện tại ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, overflow: "hidden" }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--green)",
                animation: "pulse-live 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>VN</span>
              <span style={{ fontSize: 13, color: "var(--green)" }}>TRADE</span>
            </div>

            {/* Ô nhập mã — ngay cạnh logo */}
            <TopbarSearch ticker={ticker} setTicker={setTicker} setNav={setNav} />

            {/* Separator */}
            <span style={{ color: "var(--border-hi)", flexShrink: 0 }}>│</span>

            {/* VNINDEX */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>VNI</span>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>
                {vnLast?.close.toFixed(2) ?? "···"}
              </span>
              {vnLast && (
                <span style={{ fontSize: 11, color: vnChg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                  {vnChg >= 0 ? "▲" : "▼"}{Math.abs(vnChg).toFixed(2)}%
                </span>
              )}
              <Badge source={vnSource} />
            </div>

            {/* Separator */}
            <span style={{ color: "var(--border-hi)", flexShrink: 0 }}>│</span>

            {/* Thông tin mã đang xem — O H L C V RSI */}
            <TopbarTickerInfo ticker={ticker} stockCache={stockCache} rsiVal={rsiVal} />
          </div>

          {/* ── RIGHT: Nav ── */}
          <nav style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <NavBtn id="chart"     label="Chart"     active={nav === "chart"}     onClick={setNav} />
            <NavBtn id="watchlist" label="Watchlist"  active={nav === "watchlist"} onClick={setNav} />
            <NavBtn id="screener"  label="Screener"   active={nav === "screener"}  onClick={setNav} />
            <NavBtn id="scanner"   label="Scanner"    active={nav === "scanner"}   onClick={setNav} />
            <NavBtn id="news"      label="News"       active={nav === "news"}      onClick={setNav} />
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
          fontSize: 10, color: "var(--text-dim)", flexShrink: 0,
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
