"use client";

import { VOLATILITY_SYMBOLS } from "../lib/deriv/symbols";

type Props = {
  value: string;
  onChange: (symbol: string) => void;
};

export default function PairSelector({ value, onChange }: Props) {
  return (
    <label className="row">
      <span className="badge">Pair</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {VOLATILITY_SYMBOLS.map((item) => (
          <option key={item.symbol} value={item.symbol}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
