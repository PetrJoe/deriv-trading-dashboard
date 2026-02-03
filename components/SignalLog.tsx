"use client";

type Props = {
  signals: any[];
};

export default function SignalLog({ signals }: Props) {
  return (
    <div className="card">
      <h3>Signal Log</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Entry</th>
            <th>SL</th>
            <th>TP1</th>
            <th>TP2</th>
          </tr>
        </thead>
        <tbody>
          {signals.length === 0 ? (
            <tr>
              <td colSpan={6}>No signals yet.</td>
            </tr>
          ) : (
            signals.map((signal, index) => (
              <tr key={`${signal.timestamp}-${index}`}>
                <td>{new Date(signal.timestamp).toLocaleTimeString()}</td>
                <td>
                  <span
                    className={`badge ${signal.action === "BUY" ? "success" : signal.action === "SELL" ? "danger" : ""}`}
                  >
                    {signal.action}
                  </span>
                </td>
                <td>{signal.entryPrice?.toFixed?.(2) ?? "--"}</td>
                <td>{signal.stopLoss?.toFixed?.(2) ?? "--"}</td>
                <td>{signal.takeProfit1?.toFixed?.(2) ?? "--"}</td>
                <td>{signal.takeProfit2?.toFixed?.(2) ?? "--"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
