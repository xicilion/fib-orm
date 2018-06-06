interface DatabaseBase {
    on: (ev) => void;
    execute: (sql: string) => void;

    end?: (cb: Function) => void;
    close?: () => void;
    connect?: (cb: Function) => void
    query?: Function;
}