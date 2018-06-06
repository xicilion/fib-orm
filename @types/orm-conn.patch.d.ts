interface OrmConnDriver {
    // dialog type
    dialect: string;
    propertyToValue: Function;
    valueToProperty: Function;
    insert: Function;
}

interface PatchedOrmConnDriver extends OrmConnDriver {
}

interface OrmConnectionOpts {
}

interface OrmConnection {
    execute: Function;
    close: Function;
}