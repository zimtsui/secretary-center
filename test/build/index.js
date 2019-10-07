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
const ava_1 = __importDefault(require("ava"));
const __1 = __importDefault(require("../../"));
const ws_1 = __importDefault(require("ws"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("path");
const events_1 = require("events");
const interfaces_1 = require("../../dist/interfaces");
const bluebird_1 = require("bluebird");
const axios_1 = __importDefault(require("axios"));
const config = fs_extra_1.default.readJsonSync(path_1.join(__dirname, '../../cfg/config.json'));
ava_1.default.serial('1', (t) => __awaiter(void 0, void 0, void 0, function* () {
    console.log = t.log;
    fs_extra_1.default.removeSync(path_1.join(__dirname, '../../', config.DB_RELATIVE_PATH));
    const center = new __1.default();
    yield center.start(console.error);
    const uploader = new ws_1.default(`ws://localhost:${config.PORT}/abc`);
    bluebird_1.promisifyAll(uploader);
    yield events_1.once(uploader, 'open');
    const tDFSTC = {
        assets: {
            spot: 1,
            cash: 10000,
        },
        trade: {
            action: interfaces_1.Action.ASK,
            price: 1000000,
            amount: 1,
            time: Date.now(),
            id: 1000000,
        }
    };
    yield uploader.sendAsync(JSON.stringify(tDFSTC));
    yield bluebird_1.delay(1000);
    let { data } = yield axios_1.default(`http://localhost:${config.PORT}/abc/trades`);
    t.log(data);
    ({ data } = yield axios_1.default(`http://localhost:${config.PORT}/abc/assets`));
    t.log(data);
    const downloader = new ws_1.default(`ws://localhost:${config.PORT}/abc/trades`);
    downloader.on('message', (message) => t.log(JSON.parse(message)));
    yield events_1.once(downloader, 'open');
    bluebird_1.promisifyAll(downloader);
    yield uploader.sendAsync(JSON.stringify(tDFSTC));
    uploader.close();
    yield bluebird_1.delay(1000);
    downloader.close();
}));
//# sourceMappingURL=index.js.map