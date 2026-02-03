Build a full-stack, **real-time trading signal generation system** specifically for Deriv's synthetic Volatility Indices (e.g., VOLATILITY 50, 75, 100). The system will implement a **multi-timeframe, rules-based strategy** combining **Supertrend, RSI, ATR, and Fibonacci retracement/extension levels**. The core deliverable is a **web-based dashboard** that displays live charts, automatically plots technical levels, and generates clear visual and textual trading signals (Entry Price, Stop-Loss, Take-Profit) **without executing trades automatically**. The system must be built using **Next.js 14+**, stream live data via the **Deriv WebSocket API**, and integrate a **TradingView-based charting library** for professional candlestick display.

implement pair selection

## **1. Core Technical Strategy & Trading Logic**

### **Primary Signal Generation Rules (M5 Chart - Analysis Timeframe)**

*   **Trend Filter (Non-Negotiable):**
    *   Calculate the **Supertrend indicator** (ATR Period: 10, Multiplier: 2).
    *   **Bullish Bias Condition:** Price (close) must be **ABOVE** the Supertrend line. Only consider **BUY/LONG** signals in this state.
    *   **Bearish Bias Condition:** Price (close) must be **BELOW** the Supertrend line. Only consider **SELL/SHORT** signals in this state.
    *   The Supertrend line must be plotted on the M5 chart.

*   **Momentum & Entry Trigger:**
    *   Calculate the **Relative Strength Index (RSI)** (Period: 14).
    *   For a **BUY Signal:** RSI must cross **below 30** (oversold) and then show a confirmed upward turn.
    *   For a **SELL Signal:** RSI must cross **above 70** (overbought) and then show a confirmed downward turn.

*   **Fibonacci Confluence (Key Enhancement):**
    *   **Automated Drawing Logic:** The system must automatically identify the last significant impulse wave.
        *   In a **Bullish Supertrend**, identify the last major **Swing Low (0%)** and **Swing High (100%)**.
        *   In a **Bearish Supertrend**, identify the last major **Swing High (0%)** and **Swing Low (100%)**.
    *   Plot Fibonacci **retracement levels** (23.6%, 38.2%, 50.0%, 61.8%, 78.6%) and key **extension levels** (127.2%, 161.8%).
    *   **Signal Priority:** A potential RSI signal occurring near the **38.2%, 50.0%, or 61.8%** Fibonacci retracement level receives the highest priority.

### **Entry Execution Confirmation (M1 Chart - Execution Timeframe)**
*   The final entry signal requires confirmation on the **M1 chart**.
*   For a **BUY:** Wait for a **bullish M1 candlestick** (preferably a close above its open) to form **at or above** the identified Fibonacci support zone (or the M5 Supertrend line if no strong Fib level is present).
*   For a **SELL:** Wait for a **bearish M1 candlestick** to form **at or below** the identified Fibonacci resistance zone.

### **Dynamic Risk Management & Position Sizing**
*   **Volatility-Based Stops & Targets:**
    *   Calculate the **Average True Range (ATR)** (Period: 14) on the M5 chart.
    *   **Stop-Loss (SL):** Place SL at **1.5 x ATR** away from the entry price.
    *   **Take-Profit (TP):**
        *   **TP1:** Set at **1.0 x ATR** (1:1 Risk/Reward) or at the **127.2% Fibonacci extension** level, whichever is closer to entry.
        *   **TP2 (Final Target):** Set at **1.5 x ATR** (1:1.5 R/R) or at the **161.8% Fibonacci extension** level.
*   The system must display **both SL and TP levels** as clear horizontal lines on the chart.

---

## **2. System Architecture & Technical Stack Specifications**

### **Backend (Next.js App Router - API Routes & Server Logic)**
*   **Data Stream Manager:** Create a robust service to connect to the **Deriv WebSocket API** (`wss://ws.derivws.com/websockets/v3`). It must:
    *   Subscribe to **tick-by-tick data** for user-selected volatility indices.
    *   Buffer ticks and **construct M1 and M5 candlesticks** (OHLC) in real-time.
    *   Handle reconnection logic and errors gracefully.
*   **Signal Engine:** This is the core serverless function that runs on a **defined interval** (e.g., every 1 minute). It must:
    *   Receive the latest candle data.
    *   Calculate all indicators (**Supertrend, RSI, ATR**) for the required lookback period.
    *   Implement the complete trading logic outlined in Section 1.
    *   Output a structured signal object.
*   **Data Structure for Signal Object:**
    ```json
    {
      "timestamp": "2023-10-27T10:05:00Z",
      "symbol": "R_100",
      "action": "BUY" // or "SELL", "POTENTIAL_BUY", "POTENTIAL_SELL", "NEUTRAL"
      "confidence": "HIGH", // Based on confluence (e.g., RSI + Fib)
      "entryPrice": 1234.56,
      "stopLoss": 1229.12,
      "takeProfit1": 1240.00,
      "takeProfit2": 1245.48,
      "details": {
        "supertrend": "bullish",
        "rsiValue": 28.5,
        "fibLevel": "61.8%",
        "atrValue": 3.45
      }
    }
    ```

### **Frontend (Next.js - Dashboard & Visualization)**
*   **Real-Time Charting:**
    *   Integrate `lightweight-charts` or `TradingView Charting Library` (via `react-tradingview-widget` or similar) for the primary chart display.
    *   **Must-Have Chart Features:** M5 timeframe as default, ability to overlay the Supertrend line, display RSI in a separate pane, and plot **Fibonacci retracement/extension levels automatically** when a signal is generated.
    *   **Visual Signal Markers:** The chart must automatically plot:
        *   A distinct **icon** (e.g., arrow up/down) at the entry candle.
        *   **Horizontal lines** for Stop-Loss (red) and Take-Profit levels (green).
        *   The **Fibonacci retracement/extension** levels as semi-transparent bands or lines.
*   **Signal Log & Dashboard:**
    *   A dedicated panel to list **all generated signals** in chronological order, with their full details.
    *   Key metrics dashboard showing: **Current Supertrend direction, Current RSI value, Current ATR value, Active Fibonacci levels.**
    *   An audible/visual **alert system** when a new "HIGH" confidence signal is generated.

### **Data Flow**
1.  **Deriv WS** → Streams ticks to **Backend Data Manager**.
2.  **Data Manager** → Builds M1/M5 candles → Stores in a **circular buffer/in-memory store**.
3.  **Signal Engine Cron** → Fetches latest candles → Runs strategy logic → Saves signal to **database/history** and emits via **WebSocket/Server-Sent Events (SSE)**.
4.  **Frontend** → Listens for new signals via WebSocket/SSE → Updates chart with new markers/lines → Updates signal log.

---

## **3. Development Phases & Milestones**

### **Phase 1: Foundation & Data Pipeline (Week 1-2)**
*   **Goal:** Establish a stable connection to Deriv and see live data in your app.
*   **Milestones:**
    1.  Set up Next.js project with necessary dependencies (`@deriv/deriv-api`, charting library).
    2.  Implement the WebSocket connection service with subscription logic for 1-2 volatility indices.
    3.  Build the candle-stick constructor (M1, M5) from tick data.
    4.  Create a basic frontend page that logs raw ticks and candle closes to the console/UI.

### **Phase 2: Indicator Calculation & Backend Signal Logic (Week 3-4)**
*   **Goal:** The backend can correctly calculate indicators and output logical signals.
*   **Milestones:**
    1.  Implement pure JavaScript/Node.js functions for **Supertrend, RSI, and ATR**.
    2.  Build the core `generateSignal()` function that implements the trading rules (Steps 1-3 from Section 1).
    3.  Create a **simple API endpoint** (e.g., `GET /api/test-signal`) that returns a calculated signal based on the latest N candles (for manual testing).
    4.  **Unit Testing:** Verify indicator calculations against known data sets.

### **Phase 3: Charting Integration & Frontend Display (Week 5-6)**
*   **Goal:** Visualize data and signals on a professional candlestick chart.
*   **Milestones:**
    1.  Integrate the chosen charting library and plot real-time M5 candlesticks.
    2.  Plot the Supertrend line and RSI indicator on the chart.
    3.  Connect the frontend to the signal WebSocket/SSE stream.
    4.  Implement logic to **plot entry markers, SL/TP lines, and Fibonacci levels** on the chart when a new signal is received.

### **Phase 4: Signal Refinement & Risk Management (Week 7)**
*   **Goal:** Integrate Fibonacci and dynamic ATR-based stops/targets.
*   **Milestones:**
    1.  Implement **automated Fibonacci level identification and drawing** logic based on swing points.
    2.  Enhance the `generateSignal()` function to include **Fibonacci confluence checking** and **dynamic SL/TP calculation** using ATR.
    3.  Update the frontend to display Fibonacci levels clearly.

### **Phase 5: Polish, Alerts, & Historical Backtesting (Week 8)**
*   **Goal:** Create a production-ready system with validation tools.
*   **Milestones:**
    1.  Build the **Signal Log panel** and **metrics dashboard**.
    2.  Implement visual/audible alerts.
    3.  **(Critical)** Develop a **backtesting module** that can read a CSV of historical ticks, run the strategy, and generate performance metrics (Win Rate, Profit Factor, Max Drawdown). This is for strategy validation only.

---

## **4. Critical Non-Functional Requirements**
*   **Performance:** The system must process ticks and update indicators with minimal latency. Chart updates should be smooth.
*   **Reliability:** The WebSocket connection must automatically reconnect if dropped. No signal should be lost during brief disconnections (candle constructor should buffer).
*   **Accuracy:** Indicator calculations must be mathematically precise and match the values calculated by TradingView or other standard platforms.
*   **Security:** Keep your Deriv API tokens (`app_id`) secure using environment variables (`NEXT_PUBLIC_` is acceptable for frontend-only, but consider server-side proxying for production).

---

## **Final Deliverables**
1.  A fully functional **Next.js web application** accessible via a URL.
2.  **Complete source code** with clear comments and documentation.
3.  A **live dashboard** showing: real-time chart with all indicators, active signal, SL/TP lines, Fibonacci levels, and a history of past signals.
4.  A **basic backtesting report** demonstrating the strategy's logic on historical data.
