import { Trade, Assets, TradingDataFromSecretaryToCenter, Action } from 'interfaces';
interface Config {
    "PORT": number;
    "TRADE_TTL": number;
    "DB_RELATIVE_PATH": string;
}
export { Action, Config, Trade, Assets, TradingDataFromSecretaryToCenter, };
