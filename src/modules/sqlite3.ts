/// <reference path="index.d.ts" />
/// <reference path="../../@types/orm-conn.patch.d.ts" />

import db = require('db');

export class Database implements DatabaseBase {
    conn: OrmConnection;
    
    constructor(fname) {
        this.conn = db.openSQLite(fname);
    }

    on(ev) {}

    all(sql: string, cb: Function) {
        this.conn.execute(sql, cb);
    }

    get(sql: string, cb: Function) {
        this.all(sql, function (e, r) {
            if (e)
                cb(e);
            cb(e, r[0]);
        });
    }

    execute(sql: string) {
        return this.conn.execute(sql);
    }

    close() {
        this.conn.close();
    }
}