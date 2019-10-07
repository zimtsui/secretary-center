"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./database"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const autonomous_1 = __importDefault(require("autonomous"));
const koa_1 = __importDefault(require("koa"));
const koa_ws_filter_1 = __importDefault(require("koa-ws-filter"));
const path_1 = require("path");
const koa_router_1 = __importDefault(require("koa-router"));
const http_1 = require("http");
const events_1 = __importDefault(require("events"));
const ttl_queue_1 = __importDefault(require("ttl-queue"));
const config = fs_extra_1.default.readJsonSync(path_1.join(__dirname, '../cfg/config.json'));
const DB_PATH = path_1.join(__dirname, '../', config.DB_RELATIVE_PATH);
fs_extra_1.default.ensureDirSync(path_1.dirname(DB_PATH));
class SecretaryCenter extends autonomous_1.default {
    constructor() {
        super();
        this.httpServer = http_1.createServer();
        this.filter = new koa_ws_filter_1.default();
        this.koa = new koa_1.default();
        this.wsRouter = new koa_router_1.default();
        this.httpRouter = new koa_router_1.default();
        this.db = new database_1.default(DB_PATH);
        this.realTime = new events_1.default();
        this.recentTrades = new ttl_queue_1.default(config.TRADE_TTL);
        this.configureHttpServer();
        this.configureUpload();
        this.configureWsDownload();
        this.configureHttpDownload();
        this.filter.ws(this.wsRouter.routes());
        this.filter.http(this.httpRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }
    _start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.start();
            yield this.db.sql(`CREATE TABLE assets(
            name    VARCHAR(255),
            spot    BIGINT,
            long    BIGINT,
            short   BIGINT,
            cash    BIGINT,
            time    BIGINT
        );`).catch(err => {
                if (err.errno !== 1)
                    throw err;
            });
            return new Promise(resolve => void this.httpServer.listen(config.PORT, resolve));
        });
    }
    _stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.stop();
            return new Promise((resolve, reject) => void this.httpServer.close(err => {
                if (err)
                    reject(err);
                else
                    resolve();
            }));
        });
    }
    configureHttpServer() {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }
    configureUpload() {
        this.wsRouter.all('/:name', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const secretary = yield ctx.upgrade();
            secretary.on('message', (message) => {
                const data = JSON.parse(message);
                this.realTime.emit(ctx.params.name, data);
                if (data.assets)
                    this.handleAssets(ctx.params.name, data.assets);
                if (data.trade)
                    this.handleTrade(ctx.params.name, data.trade);
            });
        }));
    }
    configureWsDownload() {
        this.wsRouter.all('/:name/assets', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const client = yield ctx.upgrade();
            function onData(data) {
                if (!data.assets)
                    return;
                const message = JSON.stringify(data.assets);
                client.send(message, (err) => {
                    if (err)
                        console.error(err);
                });
            }
            this.realTime.on(ctx.params.name, onData);
            client.on('error', console.error);
            client.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        }));
        this.wsRouter.all('/:name/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const client = yield ctx.upgrade();
            function onData(data) {
                if (!data.trade)
                    return;
                const message = JSON.stringify(data.trade);
                client.send(message, (err) => {
                    if (err)
                        console.error(err);
                });
            }
            this.realTime.on(ctx.params.name, onData);
            client.on('error', console.error);
            client.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        }));
    }
    configureHttpDownload() {
        this.httpRouter.get('/:name/assets', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db.sql(`
                SELECT spot, long, short, cash, time
                FROM assets
                WHERE name = '%s'
                ORDER BY time
            ;`, ctx.params.name);
            ctx.body = rows;
        }));
        this.httpRouter.get('/:name/trades', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const trades = [...this.recentTrades]
                .filter(tradeAndName => tradeAndName.name === ctx.params.name)
                .map(tradeAndName => tradeAndName.trade);
            ctx.body = trades;
        }));
    }
    handleAssets(name, assets) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.sql(`
            INSERT INTO assets
            (name, spot, long, short, cash, time)
            VALUES('%s', %d, %d, %d, %d, %d)
        ;`, name, assets.spot || 0, assets.long || 0, assets.short || 0, assets.cash || 0, assets.time || 0);
        });
    }
    handleTrade(name, trade) {
        this.recentTrades.push({
            name, trade,
        });
    }
}
exports.default = SecretaryCenter;
//# sourceMappingURL=index.js.map