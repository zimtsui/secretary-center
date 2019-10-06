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
const sqlite3_1 = __importDefault(require("sqlite3"));
const bluebird_1 = require("bluebird");
const events_1 = require("events");
const util_1 = require("util");
sqlite3_1.default.verbose();
class Database {
    constructor(filepath) {
        this.filepath = filepath;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.db = new sqlite3_1.default.Database(this.filepath);
            yield events_1.once(this.db, 'open');
            bluebird_1.promisifyAll(this.db);
            this.db.configure('busyTimeout', 1000);
            yield this.db.serializeAsync();
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.closeAsync();
        });
    }
    sql(template, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            const statement = util_1.format(template, ...params);
            return yield this.db.allAsync(statement);
        });
    }
}
exports.default = Database;
//# sourceMappingURL=database.js.map