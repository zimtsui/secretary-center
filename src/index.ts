import Database from './database';
import Autonomous from 'autonomous';
import Koa from 'koa';
import Filter from 'koa-ws-filter';
import { join } from 'path';
import Router from 'koa-router';
import WebSocket from 'ws';
import { createServer } from 'http';
import {
    Trade,
} from 'interfaces';

const DBPATH = join(__dirname, '../db/history.db');

interface Asset {
    spot?: number;
    long?: number;
    short?: number;
    cash?: number;
    time?: number;
};

interface TradingDataFromSecretaryToCenter {
    asset?: Asset;
    trade?: Trade;
};

type TDFSTC = TradingDataFromSecretaryToCenter;

class SecretaryCenter extends Autonomous {
    private httpServer = createServer();
    private filter = new Filter();
    private koa = new Koa();
    private db = new Database(DBPATH);

    constructor() {
        super();
        this.configureHttpServer();
        this.configureUpload();


        this.koa.use(this.filter.filter());
        this.httpServer.on('request', this.koa.callback());
    }

    protected async _start() {
        await this.db.start();
        await this.db.sql(`CREATE TABLE assets(
            name    VARCHAR(255),
            spot    VARCHAR(255),
            long    BIGINT,
            short   BIGINT,
            cash    BIGINT,
            time    BIGINT
        );`).catch(err => {
            if (err.errno !== 1) throw err;
        });
    }

    protected async _stop() {
        await this.db.stop();
    }

    private configureHttpServer(): void {
        this.httpServer.timeout = 0;
        this.httpServer.keepAliveTimeout = 0;
    }

    private configureUpload(): void {
        const router = new Router();
        router.all('/:name', async (ctx, next) => {
            const secretary: WebSocket = await ctx.upgrade();
            secretary.on('message', (message: string) => {
                const data: TDFSTC = JSON.parse(message);
                if (data.asset) this.handleAsset(
                    ctx.params.name,
                    data.asset,
                );
            });
        });
        this.filter.ws(router.routes());
    }

    private async remove(name: string): Promise<void> {
        await this.db.sql(`
            DELETE FROM assets
            WHERE name = '%s'
        ;`, name);
    }

    private async handleAsset(name: string, asset: Asset): Promise<void> {
        await this.db.sql(`
            INSERT INTO assets
            (name, spot, long, short, cash, time)
            VALUES('%s', %d, %d, %d, %d, %d)
        ;`, name,
            asset.spot || 0,
            asset.long || 0,
            asset.short || 0,
            asset.cash || 0,
            asset.time || 0,
        );
    }
}

export default SecretaryCenter;