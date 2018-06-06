/// <reference path="../@types/fibjs.d.ts" />
/// <reference path="../@types/orm.d.ts" />
/// <reference path="../@types/orm-conn.patch.d.ts" />

import OrmNS from 'orm'
import SqlQueryNS from 'sqlquery'
import { FixedModelInstance } from '../@types/orm-model.patch';
import * as util from 'util'
import * as url from 'url'
import { OrmNSToPatch } from '../@types/orm';
import { OrmConnDriver } from '../@types/orm-conn.patch';

interface ModelFuncToPatch extends Function {
    is_new?: boolean;
}

interface HashOfModelFuncToPatch {
    [funName: string]: ModelFuncToPatch;
}

type HashOfModelFuncNameToPath = string[];

// patch async function to sync function
function patchSync(o: FixedModelInstance, funcs: HashOfModelFuncNameToPath) {
    funcs.forEach(function (func) {
        const old_func = o[func];
        if (old_func) {
            Object.defineProperty(o, func + 'Sync', {
                value: util.sync(old_func),
                writable: true
            });
        }
    })
}

// hook find, patch result
function patchResult(o: FixedModelInstance) {
    var old_func: ModelFuncToPatch = o.find;
    var m = o.model || o;
    var comps = ['val', 'from', 'to'];

    if (old_func.is_new)
        return;

    function filter_date(opt) {
        for (var k in opt) {
            if (k === 'or')
                opt[k].forEach(filter_date);
            else {
                var p = m.allProperties[k];
                if (p && p.type === 'date') {
                    var v = opt[k];

                    if (!util.isDate(v)) {
                        if (util.isNumber(v) || util.isString(v))
                            opt[k] = new Date(v);
                        else if (util.isObject(v)) {
                            comps.forEach(c => {
                                var v1 = v[c];

                                if (util.isArray(v1)) {
                                    v1.forEach((v2, i) => {
                                        if (!util.isDate(v2))
                                            v1[i] = new Date(v2);
                                    });
                                } else if (v1 !== undefined && !util.isDate(v1))
                                    v[c] = new Date(v1);
                            });
                        }
                    }
                }
            }
        }
    }

    var new_func: ModelFuncToPatch = function () {
        var opt = arguments[0];

        if (util.isObject(opt) && !util.isFunction(opt))
            filter_date(opt);

        var rs = old_func.apply(this, Array.prototype.slice.apply(arguments));
        if (rs) {
            patchResult(rs);
            patchSync(rs, [
                "count",
                "first",
                "last",
                'all',
                'where',
                'find',
                'remove',
                'run'
            ]);
        }
        return rs;
    }

    new_func.is_new = true;
    o.where = o.all = o.find = new_func;
}

function patchObject(m: FixedModelInstance) {
    var methods = [
        "save",
        "remove",
        "validate",
        "model"
    ];

    function enum_associations(assoc) {
        assoc.forEach(function (item) {
            if (item.getAccessor)
                methods.push(item.getAccessor);
            if (item.setAccessor)
                methods.push(item.setAccessor);
            if (item.hasAccessor)
                methods.push(item.hasAccessor);
            if (item.delAccessor)
                methods.push(item.delAccessor);
            if (item.addAccessor)
                methods.push(item.addAccessor);
        });
    }

    // patch associations methods
    var opts = m.__opts;
    if (opts) {
        enum_associations(opts.one_associations);
        enum_associations(opts.many_associations);
        enum_associations(opts.extend_associations);
        enum_associations(opts.association_properties);


        for (var f in opts.fieldToPropertyMap) {
            if (opts.fieldToPropertyMap[f].lazyload) {
                var name = f.charAt(0).toUpperCase() + f.slice(1);
                methods.push('get' + name);
                methods.push('set' + name);
                methods.push('remove' + name);
            }
        };
    }

    patchSync(m, methods);
}

function patchHas(m: FixedModelInstance, funcs: HashOfModelFuncNameToPath) {
    funcs.forEach(function (func) {
        var old_func: ModelFuncToPatch = m[func];
        if (old_func)
            m[func] = function () {
                var r = old_func.apply(this, Array.prototype.slice.apply(arguments));

                var name = arguments[0];
                name = 'findBy' + name.charAt(0).toUpperCase() + name.slice(1);
                patchSync(this, [name]);

                return r;
            }
    })
}

function patchAggregate(m: FixedModelInstance) {
    var aggregate = m.aggregate;
    m.aggregate = function () {
        var r = aggregate.apply(this, Array.prototype.slice.apply(arguments));
        patchSync(r, ['get']);
        return r;
    };
}

function patchModel(m: FixedModelInstance, opts: OrmNS.ModelOptions) {
    var _afterAutoFetch;
    if (opts !== undefined && opts.hooks)
        _afterAutoFetch = opts.hooks.afterAutoFetch;

    m.afterAutoFetch(function (next) {
        patchObject(this);

        if (_afterAutoFetch) {
            if (_afterAutoFetch.length > 0)
                return _afterAutoFetch(next);
            _afterAutoFetch();
        }

        next();
    });

    patchResult(m);

    patchSync(m, [
        "clear",
        "count",
        "exists",
        "one",
        "where",
        'all',
        'create',
        'drop',
        'find',
        'get',
        'sync'
    ]);

    patchHas(m, [
        'hasOne',
        'extendsTo'
    ]);

    patchAggregate(m);
}

interface keyPropertiesTypeItem {
    type: string;
    name: string;
}
function patchInsert(table: string, data: any, keyProperties: keyPropertiesTypeItem[], cb: Function) {
    var q = this.query.insert()
        .into(table)
        .set(data)
        .build();

    this.db.all(q, function (err, info) {
        if (err) return cb(err);
        if (!keyProperties) return cb(null);

        var i, ids = {},
            prop;

        if (keyProperties.length == 1 && keyProperties[0].type == 'serial') {
            ids[keyProperties[0].name] = info.insertId;
            return cb(null, ids);
        } else {
            for (i = 0; i < keyProperties.length; i++) {
                prop = keyProperties[i];
                // Zero is a valid value for an ID column
                ids[prop.name] = data[prop.mapsTo] !== undefined ? data[prop.mapsTo] : null;
            }
            return cb(null, ids);
        }
    }.bind(this));
};

function patchDriver(driver: OrmConnDriver) {
    if (driver.dialect === 'sqlite')
        driver.insert = patchInsert;

    var propertyToValue = driver.propertyToValue;
    driver.propertyToValue = function (value, property) {
        if (property.type === 'date' &&
            (util.isNumber(value) || util.isString(value)))
            value = new Date(value);
        return propertyToValue.call(this, value, property);
    }

    var valueToProperty = driver.valueToProperty;
    driver.valueToProperty = function (value, property) {
        if (property.type === 'date' &&
            (util.isNumber(value) || util.isString(value)))
            value = new Date(value);
        return valueToProperty.call(this, value, property);
    }
}

function execQuerySync(query: SqlQueryNS.Query, opt) {
    if (arguments.length == 2)
        query = this.query.escape(query, opt);

    return this.db.execute(query);
}

module.exports = function (orm: OrmNSToPatch) {
    var conn = util.sync(orm.connect);
    orm.connectSync = function (opts) {
        if (typeof opts == 'string')
            opts = url.parse(opts, true).toJSON();
        else if (typeof opts == 'object')
            opts = util.clone(opts);

        if (opts.protocol === 'sqlite:' && opts.timezone === undefined)
            opts.timezone = 'UTC';

        var db = conn.call(this, opts);

        patchSync(db, [
            'sync',
            'close',
            'drop',
            'ping'
        ]);

        patchDriver(db.driver);

        var def = db.define;
        db.define = function (name, properties, opts) {
            if (opts !== undefined) {
                opts = util.clone(opts);
                if (opts.hooks !== undefined)
                    opts.hooks = util.clone(opts.hooks);
            }

            var m = def.call(this, name, properties, opts);
            patchModel(m, opts);
            return m;
        }

        db.begin = function () {
            return this.driver.db.conn.begin();
        };

        db.commit = function () {
            return this.driver.db.conn.commit();
        };

        db.rollback = function () {
            return this.driver.db.conn.rollback();
        };

        db.trans = function (func) {
            return this.driver.db.conn.trans(func);
        };

        db.driver.execQuerySync = execQuerySync;

        return db;
    }

    return orm;
}