import Database from './database';
import fse from 'fs-extra';
import Autonomous from 'autonomous';
import Koa from 'koa';
import Filter from 'koa-ws-filter';
import { join, dirname } from 'path';
import Router from 'koa-router';
import WebSocket from 'ws';
import { createServer } from 'http';
import EventEmitter from 'events';
import TtlQueue from 'ttl-queue';
import {
    Trade,
    Config,
    Assets,
    TradingDataFromSecretaryToCenter as TDFSTC
} from './interfaces';

const config: Config = fse.readJsonSync(join(__dirname,
    '../cfg/config.json'));

const DB_PATH = join(__dirname, '../', config.DB_RELATIVE_PATH);
fse.ensureDirSync(dirname(DB_PATH));

interface TradeAndName {
    name: string;
    trade: Trade;
}

class SecretaryCenter extends Autonomous {
    private httpServer = createServer();
    private filter = new Filter();
    private koa = new Koa();
    private wsRouter = new Router();
    private httpRouter = new Router();
    private db = new Database(DB_PATH);
    private realTime = new EventEmitter();
    private recentTrades = new TtlQueue<TradeAndName>(config.TRADE_TTL);

    constructor() {
        super();
        this.configureHttpServer();
        this.configureUpload();
        this.configureWsDownload();
        this.configureHttpDownload();

        this.filter.ws(this.wsRouter.routes());
        this.filter.http(this.httpRouter.routes());
        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }

    protected async _start() {
        await this.db.start();
        await this.db.sql(`CREATE TABLE assets(
            name    VARCHAR(255),
            spot    BIGINT,
            long    BIGINT,
            short   BIGINT,
            cash    BIGINT,
            time    BIGINT
        );`).catch(err => {
            if (err.errno !== 1) throw err;
        });

        return new Promise<void>(resolve =>
            void this.httpServer.listen(config.PORT, resolve)
        );
    }

    protected async _stop() {
        await this.db.stop();
        return new Promise<void>((resolve, reject) =>
            void this.httpServer.close(err => {
                if (err) reject(err); else resolve();
            }));
    }

    private configureHttpServer(): void {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }

    private configureUpload(): void {
        this.wsRouter.all('/:name', async (ctx, next) => {
            const secretary: WebSocket = await ctx.upgrade();
            secretary.on('message', (message: string) => {
                const data: TDFSTC = JSON.parse(message);
                this.realTime.emit(ctx.params.name, data);
                if (data.assets) this.handleAssets(
                    ctx.params.name,
                    data.assets,
                );
                if (data.trade) this.handleTrade(
                    ctx.params.name,
                    data.trade,
                );
            });
        });
    }

    private configureWsDownload(): void {
        this.wsRouter.all('/:name/assets', async (ctx, next) => {
            const client: WebSocket = await ctx.upgrade();
            function onData(data: TDFSTC) {
                if (!data.assets) return;
                const message = JSON.stringify(data.assets);
                client.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(ctx.params.name, onData);
            client.on('error', console.error);

            client.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        });

        this.wsRouter.all('/:name/trades', async (ctx, next) => {
            const client: WebSocket = await ctx.upgrade();
            function onData(data: TDFSTC) {
                if (!data.trade) return;
                const message = JSON.stringify(data.trade);
                client.send(message, (err?: Error) => {
                    if (err) console.error(err);
                });
            }
            this.realTime.on(ctx.params.name, onData);
            client.on('error', console.error);

            client.on('close', () => {
                this.realTime.off(ctx.params.name, onData);
            });
        });
    }

    private configureHttpDownload(): void {
        this.httpRouter.get('/:name/assets', async (ctx, next) => {
            const rows = await this.db.sql(`
                SELECT spot, long, short, cash, time
                FROM assets
                WHERE name = '%s'
                ORDER BY time
            ;`, ctx.params.name);
            ctx.body = rows;
        });

        this.httpRouter.get('/:name/trades', async (ctx, next) => {
            const trades = [...this.recentTrades]
                .filter(tradeAndName => tradeAndName.name === ctx.params.name)
                .map(tradeAndName => tradeAndName.trade);
            ctx.body = trades;
        });
    }

    private async handleAssets(
        name: string, assets: Assets
    ): Promise<void> {
        await this.db.sql(`
            INSERT INTO assets
            (name, spot, long, short, cash, time)
            VALUES('%s', %d, %d, %d, %d, %d)
        ;`, name,
            assets.spot || 0,
            assets.long || 0,
            assets.short || 0,
            assets.cash || 0,
            assets.time || 0,
        );
    }

    private handleTrade(
        name: string, trade: Trade
    ): void {
        this.recentTrades.push({
            name, trade,
        });
    }
}

export default SecretaryCenter;