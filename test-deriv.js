import { WebSocket } from "ws";

const WS_URL = "wss://ws.derivws.com/websockets/v3";
const APP_ID = "1089";

const ws = new WebSocket(`${WS_URL}?app_id=${APP_ID}`);

ws.on("open", () => {
  console.log("Connected");
  const request = {
    ticks_history: "R_100",
    adjust_start_time: 1,
    count: 10,
    end: "latest",
    granularity: 1800,
    style: "candles"
  };
  console.log("Sending:", request);
  ws.send(JSON.stringify(request));
});

ws.on("message", (data) => {
  console.log("Received:", data.toString());
  ws.close();
});

ws.on("error", (err) => {
  console.error("Error:", err);
});
