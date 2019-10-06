declare class Database {
    private filepath;
    private db;
    constructor(filepath: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    sql(template: any, ...params: any[]): Promise<any>;
}
export default Database;
