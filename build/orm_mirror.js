#!/usr/bin/env fibjs

const fs = require('fs')
const path = require('path')

const filepathList = [
    'orm.d.ts',
    'sql-query.d.ts'
]

const distDir = path.resolve(__dirname, '../@types/orm_mirror')
if (!fs.exists(distDir)) {
    fs.mkdir(distDir)
}

filepathList.forEach((filepath) => {
    fs.copy(
        path.resolve(__dirname, '../node_modules/orm/lib/TypeScript', filepath),
        path.join(distDir, filepath)
    )
})