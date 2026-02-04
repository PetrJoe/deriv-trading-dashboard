"use client";

type Props = {
  metrics: any;
  latestSignal: any;
};

export default function MetricsPanel({ metrics, latestSignal }: Props) {
  return (
    <div className="card">
      <h3>Live Metrics</h3>
      <div className="grid grid-2">
        <div>
          <small>Supertrend</small>
          <div className={`badge ${metrics?.supertrend === "bullish" ? "success" : "danger"}`}>
            {metrics?.supertrend ?? "--"}
          </div>
        </div>
        <div>
          <small>RSI</small>
          <div className="badge">{metrics?.rsi?.toFixed?.(2) ?? "--"}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <small>Active Fibonacci Levels</small>
        <div className="row">
          {metrics?.fibLevels?.length
            ? metrics.fibLevels.slice(0, 6).map((level: number) => (
                <span key={level} className="badge">
                  {level.toFixed(2)}
                </span>
              ))
            : "--"}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <small>Latest Signal</small>
        <div className="row">
          <span className="badge">{latestSignal?.action ?? "NEUTRAL"}</span>
          <span className="badge">{latestSignal?.confidence ?? "LOW"}</span>
          <span className="badge">SL {latestSignal?.stopLoss?.toFixed?.(2) ?? "--"}</span>
          <span className="badge">TP1 {latestSignal?.takeProfit1?.toFixed?.(2) ?? "--"}</span>
          <span className="badge">TP2 {latestSignal?.takeProfit2?.toFixed?.(2) ?? "--"}</span>
        </div>
      </div>
    </div>
  );
}
