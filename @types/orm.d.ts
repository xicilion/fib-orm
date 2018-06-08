/// <reference path="./orm_mirror/orm.d.ts" />

import OrmNS = require('orm')

type OrmModule = typeof OrmNS
interface OrmNSToPatch extends OrmModule {
    connectSync: Function;
}
type PatchedOrmNs = OrmNSToPatch

type FibOrm = OrmNSToPatch