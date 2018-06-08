"use strict";
/// <reference path="index.d.ts" />
/// <reference path="../../@types/orm-conn.patch.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("db");
class Database {
    constructor(connOpts) {
        this.opts = connOpts;
    }
    on(ev) { }
    ping(cb) {
        setImmediate(cb);
    }
    connect(cb) {
        const that = this;
        const openMySQL = db.openMySQL;
        openMySQL(this.opts, function (e, conn) {
            if (!e)
                that.conn = conn;
            cb(e);
        });
    }
    query(sql, cb) {
        this.conn.execute(sql, cb);
    }
    execute(sql) {
        return this.conn.execute(sql);
    }
    end(cb) {
        this.conn.close(cb);
    }
}
exports.createConnection = function (connOpts) {
    return new Database(connOpts);
};
