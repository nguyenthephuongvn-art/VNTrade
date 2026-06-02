import { useState, useMemo } from "react";
import { runScanner } from "@/lib/indicators";
import { STOCKS } from "@/lib/stocks";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PORTFOLIO_META = {
  swing: {
    label:    "Swing Trade",
    sub:      "10 – 30 ngày",
    icon:     "⚡",
    color:    "#448aff",
    desc:     "Momentum + Volume breakout · RSI 35–68 · VPA ≥ 13",
    badge:    "SHORT-TERM",
  },
  medium: {
    label:    "Position Trade",
    sub:      "30 – 60 ngày",
    icon:     "📈",
    color:    "#00e676",
    desc:     "Uptrend xác nhận · EMA20>EMA50>EMA200 · VPA ≥ 12",
    badge:    "MEDIUM-TERM",
  },
  long: {
    label:    "Long-Term Hold",
    sub:      "3 – 6 tháng",
    icon:     "🏦",
    color:    "#ffd740",
    desc:     "Xu hướng bền vững · Above EMA200 · Vol ổn định",
    badge:    "LONG-TERM",
  },
  bottom: {
    label:    "Bottom Fishing",
    sub:      "High Risk · 15–30 ngày",
    icon:     "🎣",
    color:    "#ff9100",
    desc:     "Oversold + VSA Stopping Volume · Spring · No Supply",
    badge:    "HIGH RISK",
  },
};

// ── SMALL ATOMS ───────────────────────────────────────────────────────────────
function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 8, fontWeight: 700,
      background: color + "20", color, letterSpacing: 0.5,
    }}>
      {children}
    </span>
  );
}

function VPABar({ score }) {
  const pct = (score / 20) * 100;
  const col = score >= 13 ? "#00e676" : score <= 7 ? "#ff3d57" : "#ffd740";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#1e2d45", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: col, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 10, color: col, fontWeight: 700, minWidth: 20 }}>{score}</span>
    </div>
  );
}

function RRBadge({ rr }) {
  const col = rr >= 2 ? "#00e676" : rr >= 1.5 ? "#ffd740" : "#ff9100";
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: col + "20", color: col, fontWeight: 700 }}>
      R/R {rr}x
    </span>
  );
}

// ── STOCK CARD ────────────────────────────────────────────────────────────────
function StockCard({ res, color, onSelect }) {
  const [open, setOpen] = useState(false);
  const info = STOCKS[res.ticker] || {};

  return (
    <div
      style={{
        background: "#111828",
        border: `1px solid ${open ? color + "50" : "#1e2d45"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden",
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onClick={() => setOpen(p => !p)}
    >
      {/* ── Row ── */}
      <div style={{
        padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap",
      }}>
        {/* Left: ticker + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{res.ticker}</span>
              {res.goldenX && <Tag color="#ffd740">✦ Golden X</Tag>}
              {res.aboveE200 && <Tag color="#448aff">▲ E200</Tag>}
              {res.vsaBullish.slice(0,1).map(s => <Tag key={s} color="#00e676">{s}</Tag>)}
            </div>
            <div style={{ fontSize: 10, color: "#3a5878", marginTop: 1 }}>
              {info.name} · {info.exchange} · {info.sector}
            </div>
          </div>
        </div>

        {/* Mid: price + change */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{res.close.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: res.chg >= 0 ? "#00e676" : "#ff3d57", fontWeight: 600 }}>
            {res.chg >= 0 ? "▲" : "▼"}{Math.abs(res.chg).toFixed(2)}%
          </div>
        </div>

        {/* Right: score + RSI + R/R */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "#3a5878" }}>VPA</span>
            <VPABar score={res.vpa} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "#3a5878" }}>RSI</span>
            <span style={{ fontSize: 11, color: res.rsi > 70 ? "#ff3d57" : res.rsi < 30 ? "#00e676" : "#d050ff", fontWeight: 600 }}>
              {res.rsi}
            </span>
            <span style={{ fontSize: 9, color: "#3a5878" }}>Vol</span>
            <span style={{ fontSize: 10, color: "#ffd740" }}>{res.volRatio}x</span>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ fontSize: 12, color: "#3a5878", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</div>
      </div>

      {/* ── Expanded detail ── */}
      {open && (
        <div style={{
          borderTop: `1px solid ${color}20`,
          padding: "12px 14px",
          background: "#0a0e1a",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
        }}>
          {/* Entry & targets */}
          <div>
            <div style={{ fontSize: 9, color: "#3a5878", letterSpacing: 1, marginBottom: 8 }}>GIÁ VÀO / MỤC TIÊU</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#4a8a9a" }}>Vào lệnh</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{res.close.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#00e676" }}>Target 1</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#00e676" }}>
                  {res.target1.toFixed(2)}
                  <span style={{ fontSize: 9, marginLeft: 4 }}>
                    (+{(((res.target1 - res.close) / res.close) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#00e676" }}>Target 2</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#00e676" }}>
                  {res.target2.toFixed(2)}
                  <span style={{ fontSize: 9, marginLeft: 4 }}>
                    (+{(((res.target2 - res.close) / res.close) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div style={{ borderTop: "1px solid #1e2d45", paddingTop: 5, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#ff3d57" }}>Stop Loss</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#ff3d57" }}>
                  {res.stopLoss.toFixed(2)}
                  <span style={{ fontSize: 9, marginLeft: 4 }}>
                    ({(((res.stopLoss - res.close) / res.close) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Signal reasons */}
          <div>
            <div style={{ fontSize: 9, color: "#3a5878", letterSpacing: 1, marginBottom: 8 }}>VSA / VPA SIGNALS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {res.vsaBullish.map(s => (
                <div key={s} style={{ fontSize: 11, color: "#00e676", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8 }}>▲</span> {s}
                </div>
              ))}
              {res.vsaBearish.map(s => (
                <div key={s} style={{ fontSize: 11, color: "#ff3d57", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8 }}>▼</span> {s}
                </div>
              ))}
              {res.reasons.map(r => (
                <div key={r} style={{ fontSize: 11, color: "#4a8a9a", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8 }}>→</span> {r}
                </div>
              ))}
              {res.goldenX && (
                <div style={{ fontSize: 11, color: "#ffd740", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✦</span> Golden Cross EMA20/50
                </div>
              )}
            </div>
          </div>

          {/* Risk/Reward + action */}
          <div>
            <div style={{ fontSize: 9, color: "#3a5878", letterSpacing: 1, marginBottom: 8 }}>ĐÁNH GIÁ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RRBadge rr={res.riskReward} />
              <div style={{ fontSize: 10, color: "#3a5878" }}>
                Vol: <span style={{ color: "#ffd740" }}>{(res.volume / 1e6).toFixed(2)}M</span>
                {" "}({res.volRatio}× TB20)
              </div>
              <div style={{ fontSize: 10, color: res.uptrend ? "#00e676" : "#ff3d57" }}>
                {res.uptrend ? "▲ Uptrend (Close > EMA20 > EMA50)" : "▼ Not in uptrend"}
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(res.ticker); }}
                  style={{
                    padding: "6px 12px", fontSize: 11, borderRadius: 4, cursor: "pointer",
                    background: color, color: "#0a0e1a", border: "none",
                    fontFamily: "inherit", fontWeight: 700,
                  }}
                >
                  📈 Xem Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PORTFOLIO TAB ─────────────────────────────────────────────────────────────
function PortfolioTab({ id, meta, stocks, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        flex: 1, padding: "10px 8px", cursor: "pointer", border: "none",
        background: active ? meta.color + "15" : "transparent",
        borderBottom: `2px solid ${active ? meta.color : "transparent"}`,
        transition: "all 0.15s", fontFamily: "inherit", textAlign: "center",
      }}
    >
      <div style={{ fontSize: 16, marginBottom: 2 }}>{meta.icon}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: active ? meta.color : "#3a5878" }}>
        {meta.label}
      </div>
      <div style={{ fontSize: 9, color: active ? meta.color + "aa" : "#3a5878", marginTop: 1 }}>
        {meta.sub}
      </div>
      <div style={{
        marginTop: 5, fontSize: 11, fontWeight: 700,
        color: stocks > 0 ? meta.color : "#3a5878",
        background: stocks > 0 ? meta.color + "20" : "#1e2d45",
        borderRadius: 10, padding: "1px 8px", display: "inline-block",
      }}>
        {stocks} cổ phiếu
      </div>
    </button>
  );
}

// ── SUMMARY STATS ─────────────────────────────────────────────────────────────
function SummaryBar({ results }) {
  const total = Object.values(results).reduce((s, a) => s + a.length, 0);
  const avgVPA = total > 0
    ? (Object.values(results).flat().reduce((s, r) => s + r.vpa, 0) / total).toFixed(1)
    : "—";
  const topRR = Object.values(results).flat().sort((a, b) => b.riskReward - a.riskReward)[0];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16,
    }}>
      {[
        { label: "Tổng cổ phiếu lọc được", value: total, color: "#fff" },
        { label: "VPA Score TB",            value: avgVPA + "/20", color: "#00e676" },
        { label: "R/R tốt nhất",            value: topRR ? topRR.riskReward + "x (" + topRR.ticker + ")" : "—", color: "#ffd740" },
        { label: "Scanner cập nhật",        value: new Date().toLocaleTimeString("vi-VN"), color: "#448aff" },
      ].map(s => (
        <div key={s.label} style={{
          background: "#111828", border: "1px solid #1e2d45", borderRadius: 7, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 9, color: "#3a5878", marginBottom: 4, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function PortfolioScanner({ stockCache, onSelectTicker, setNav }) {
  const [activeTab,  setActiveTab]  = useState("swing");
  const [isRunning,  setIsRunning]  = useState(false);
  const [ran,        setRan]        = useState(false);
  const [results,    setResults]    = useState({ swing: [], medium: [], long: [], bottom: [] });

  const dataCount = Object.keys(stockCache).length;

  const runScan = () => {
    setIsRunning(true);
    // setTimeout để React re-render spinner trước khi tính toán nặng
    setTimeout(() => {
      const res = runScanner(stockCache);
      setResults(res);
      setRan(true);
      setIsRunning(false);
    }, 50);
  };

  const activeStocks = results[activeTab] || [];
  const meta         = PORTFOLIO_META[activeTab];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#3a5878", letterSpacing: 1, marginBottom: 4 }}>
            VSA/VPA FUND MANAGER SCANNER
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
            4 Danh Mục Đầu Tư
          </h2>
          <div style={{ fontSize: 11, color: "#3a5878", marginTop: 3 }}>
            {dataCount} cổ phiếu trong cache · Port từ VSA_VPA_Hoan_Chinh_v5.2.afl
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={isRunning || dataCount === 0}
          style={{
            padding: "10px 20px", fontSize: 12, fontWeight: 700, borderRadius: 6,
            border: "none", cursor: isRunning ? "wait" : "pointer",
            fontFamily: "inherit",
            background: isRunning ? "#2a4060" : "#00e676",
            color: isRunning ? "#3a7a90" : "#0a0e1a",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {isRunning
            ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>⟳</span> Đang quét...</>
            : "⚡ Chạy Scanner"
          }
        </button>
      </div>

      {/* Not run yet prompt */}
      {!ran && !isRunning && (
        <div style={{
          background: "#111828", border: "1px dashed #2a4060",
          borderRadius: 10, padding: "32px 20px", textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>📡</div>
          <div style={{ fontSize: 13, color: "#3a7a90", marginBottom: 6 }}>
            Scanner chưa chạy · {dataCount} cổ phiếu sẵn sàng
          </div>
          <div style={{ fontSize: 11, color: "#3a5878" }}>
            Nhấn "Chạy Scanner" để phân loại vào 4 danh mục theo VSA/VPA
          </div>
        </div>
      )}

      {/* Running */}
      {isRunning && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#448aff", fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <div>Đang tính EMA · RSI · MACD · VSA · VPA Score cho {dataCount} cổ phiếu...</div>
        </div>
      )}

      {/* Results */}
      {ran && !isRunning && (
        <>
          <SummaryBar results={results} />

          {/* Portfolio tabs */}
          <div style={{
            display: "flex", background: "#111828",
            border: "1px solid #1e2d45", borderRadius: 8,
            marginBottom: 14, overflow: "hidden",
          }}>
            {Object.entries(PORTFOLIO_META).map(([id, m]) => (
              <PortfolioTab
                key={id} id={id} meta={m}
                stocks={results[id]?.length ?? 0}
                active={activeTab === id}
                onClick={setActiveTab}
              />
            ))}
          </div>

          {/* Active portfolio header */}
          <div style={{
            background: meta.color + "10",
            border: `1px solid ${meta.color}30`,
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                {meta.icon} {meta.label}
                <Tag color={meta.color} style={{ marginLeft: 8 }}>{meta.badge}</Tag>
              </div>
              <div style={{ fontSize: 11, color: "#3a5878", marginTop: 2 }}>{meta.desc}</div>
            </div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>
              {activeStocks.length} cổ phiếu lọc được
            </div>
          </div>

          {/* Stock cards */}
          {activeStocks.length === 0 ? (
            <div style={{
              background: "#111828", border: "1px dashed #1e2d45",
              borderRadius: 8, padding: "28px 16px", textAlign: "center",
              color: "#3a5878", fontSize: 12,
            }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>🔍</div>
              Không có cổ phiếu nào đáp ứng tiêu chí danh mục này<br />
              <span style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                Thử thêm nhiều mã vào watchlist để tăng tập mẫu
              </span>
            </div>
          ) : (
            activeStocks.map(res => (
              <StockCard
                key={res.ticker}
                res={res}
                color={meta.color}
                onSelect={(t) => { onSelectTicker(t); setNav("chart"); }}
              />
            ))
          )}

          {/* Disclaimer */}
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "#03060a", border: "1px solid #08141e",
            borderRadius: 6, fontSize: 10, color: "#3a5878", lineHeight: 1.7,
          }}>
            ⚠ Kết quả scanner chỉ mang tính tham khảo dựa trên phân tích kỹ thuật VSA/VPA.
            Không phải khuyến nghị đầu tư. Stop-loss luôn được đặt trước khi vào lệnh.
            Quản lý vốn: không quá 5-10% danh mục cho mỗi vị thế.
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
