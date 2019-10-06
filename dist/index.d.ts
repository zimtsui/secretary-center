import Autonomous from 'autonomous';
declare class SecretaryCenter extends Autonomous {
    private httpServer;
    private filter;
    private koa;
    private wsRouter;
    private httpRouter;
    private db;
    private realTime;
    private recentTrades;
    constructor();
    protected _start(): Promise<void>;
    protected _stop(): Promise<void>;
    private configureHttpServer;
    private configureUpload;
    private configureWsDownload;
    private configureHttpDownload;
    private handleAssets;
    private handleTrade;
}
export default SecretaryCenter;
