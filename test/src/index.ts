import test from 'ava';
import SecretaryCenter from '../../';
import WebSocket from 'ws';
import fse from 'fs-extra';
import { join } from 'path';
import { once } from 'events';
import {
    TradingDataFromSecretaryToCenter as TDFSTC,
    Action,
    Config,
} from '../../dist/interfaces';
import {
    promisifyAll,
    delay,
} from 'bluebird';
import axios from 'axios';

const config: Config = fse.readJsonSync(join(__dirname, '../../cfg/config.json'));

type PromisifiedWebSocket = WebSocket & {
    [key: string]: any;
};

test.serial('1', async t => {
    console.log = t.log;

    fse.removeSync(join(__dirname, '../../', config.DB_RELATIVE_PATH));

    const center = new SecretaryCenter();
    await center.start(console.error);
    const uploader: PromisifiedWebSocket
        = new WebSocket(`ws://localhost:${config.PORT}/abc`);
    promisifyAll(uploader);
    await once(uploader, 'open');
    const tDFSTC: TDFSTC = {
        assets: {
            spot: 1,
            cash: 10000,
        },
        trade: {
            action: Action.ASK,
            price: 1000000,
            amount: 1,
            time: Date.now(),
            id: 1000000,
        }
    };
    await uploader.sendAsync(JSON.stringify(tDFSTC));
    await delay(1000);
    let { data } = await axios(`http://localhost:${config.PORT}/abc/trades`);
    t.log(data);
    ({ data } = await axios(`http://localhost:${config.PORT}/abc/assets`));
    t.log(data);

    const downloader: PromisifiedWebSocket
        = new WebSocket(`ws://localhost:${config.PORT}/abc/trades`);
    downloader.on('message', (message: string) =>
        t.log(JSON.parse(message)));
    await once(downloader, 'open');
    promisifyAll(downloader);

    await uploader.sendAsync(JSON.stringify(tDFSTC));
    uploader.close();

    await delay(1000);
    downloader.close();
});