const { WebSocket, OPEN, WebSocketServer } = require("ws");
const axios = require("axios");

class BinanceWs {
    static URL = "wss://fstream.binance.com/stream";
    static UPDATE_INTERVAL = 500;

    static timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];
    static wsServer = new WebSocketServer({ port: 80 });
    static clients = new Set();
    static tempData = [];
    static tempUpdate = Date.now();
    static sockets = new Set();

    static async load() {
        this.wsServer.on("connection", this.onConnection.bind(this));

        const { data: exchangeData } = await axios.get("https://fapi.binance.com/fapi/v1/exchangeInfo");

        let events = [];

        for (const { symbol } of exchangeData.symbols) {
            for (const timeframe of BinanceWs.timeframes) {
                events.push(`${symbol.toLowerCase()}@kline_${timeframe}`);

                if (events.length >= 128) {
                    this.sockets.add(new BinanceWs(events));

                    events = [];
                }
            }
        }

        setInterval(() => {
            this.sockets.forEach((socket) => {
                socket.ws.isAlive = false;
                socket.ws.ping();
            });
        }, 30000);
    }

    static onConnection(ws) {
        this.clients.add(ws);

        ws.onclose = () => this.clients.delete(ws);
    }

    static notify() {
        const data = JSON.stringify(this.tempData);

        this.tempData = [];
        this.tempUpdate = Date.now();

        this.clients.forEach((ws) => {
            if (ws.readyState !== OPEN) {
                this.clients.delete(ws);
                return;
            }

            ws.send(data);
        });
    }

    ws = new WebSocket(BinanceWs.URL);
    events = [];

    constructor(events) {
        this.events = events;

        this.ws.on("open", this._open.bind(this));
        this.ws.on("pong", () => this.ws.isAlive = true);
        this.ws.on("close", this._close.bind(this));
        this.ws.on("error", (...args) => console.log("error", args));
        this.ws.on("message", this._message.bind(this));
    }

    _close(code, result) {
        console.log("CLOSE", code, result.toString());

        BinanceWs.sockets.delete(this);
        BinanceWs.sockets.add(new BinanceWs(this.events));
    }

    _subscribe(events = []) {
        const data = JSON.stringify({
            method: "SUBSCRIBE",
            params: events,
            id: 1
        })

        this.ws.send(data);
    }

    _open() {
        this.ws.isAlive = true;

        if (this.events.length > 0) {
            this._subscribe(this.events);
        }
    }

    _message(rawData) {
        try {
            const data = JSON.parse(rawData.toString());

            if (!data.stream) return;

            const kline = data.data.k;

            BinanceWs.tempData.push([
                kline.s, // Symbol
                kline.i, // Timeframe
                kline.t, // Open Time
                parseFloat(kline.o), // Open
                parseFloat(kline.h), // High
                parseFloat(kline.l), // Low
                parseFloat(kline.c), // Close
                parseFloat(kline.v), // Volume
                kline.n // Trades Amount
            ]);

            if (Date.now() - BinanceWs.tempUpdate >= BinanceWs.UPDATE_INTERVAL) {
                BinanceWs.notify();
            }
        } catch (e) {}
    }
}

BinanceWs.load();