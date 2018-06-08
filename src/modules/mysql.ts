/// <reference path="index.d.ts" />
/// <reference path="../../@types/orm-conn.patch.d.ts" />

import db = require('db');

class Database implements DatabaseBase {
    conn: OrmConnection;
    opts: OrmConnectionOpts;
    
    constructor(connOpts) {
        this.opts = connOpts;
    }

    on(ev) {}

    ping(cb: Function) {
        setImmediate(cb);
    }

    connect(cb: Function): void {
        const that = this;
        const openMySQL: Function = db.openMySQL

        openMySQL(this.opts, function (e: Error, conn: OrmConnection) {
            if (!e)
                that.conn = conn;
            cb(e);
        });
    }

    query(sql: string, cb: Function) {
        this.conn.execute(sql, cb);
    }

    execute(sql: string) {
        return this.conn.execute(sql);
    }

    end(cb: Function) {
        this.conn.close(cb);
    }
}

export const createConnection = function (connOpts: OrmConnectionOpts) {
    return new Database(connOpts);
};