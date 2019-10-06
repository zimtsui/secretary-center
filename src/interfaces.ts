import {
    Trade,
    Assets,
    TradingDataFromSecretaryToCenter,
} from 'interfaces';

interface Config {
    "PORT": number;
    "TRADE_TTL": number;
    "DB_RELATIVE_PATH": string;
};

export {
    Config,
    Trade,
    Assets,
    TradingDataFromSecretaryToCenter,
}