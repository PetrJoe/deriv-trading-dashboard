# Deriv Volatility Signals Dashboard

Real-time trading signal generation for Deriv synthetic Volatility Indices using Supertrend, RSI, ATR, and Fibonacci levels.

## Features
- Live tick stream via Deriv WebSocket API
- Real-time M1/M5 candle construction
- Signal engine with Supertrend, RSI, ATR, and Fibonacci confluence
- SSE stream for candles, metrics, and signals
- Pair selection for Volatility indices
- Lightweight-charts dashboard with Supertrend overlay and RSI pane
- Backtesting endpoint for CSV candle data

## Setup
1. Install dependencies:
   - `npm install`
2. Configure environment:
   - No env configuration required (app id is hardcoded to 1089)
3. Run dev server:
   - `npm run dev`

## API Endpoints
- `GET /api/stream?symbol=R_75` — SSE stream for candles, metrics, signals
- `POST /api/subscribe` — body `{ "symbol": "R_75" }`
- `GET /api/candles?symbol=R_75&timeframe=M5`
- `GET /api/signal/latest?symbol=R_75`
- `GET /api/signal/history?symbol=R_75`
- `POST /api/backtest` — body `{ "symbol": "R_75", "csv": "time,open,high,low,close\n..." }`

## CSV Format for Backtest
```
time,open,high,low,close
1698403200,1234.0,1239.0,1229.0,1232.0
```

## Notes
- This system generates signals only. It does **not** place trades automatically.
- For best results, keep the app running so the in-memory candle store stays warm.
