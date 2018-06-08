const fs = require('fs')
const path = require('path')

const fibTypify = require('fib-typify')

const baseDir = path.resolve(__dirname, '../src')
const distDir = path.resolve(__dirname, '../lib')

fibTypify.compileDirectoryTo(baseDir, distDir, {
    compilerOptions: {
        target: 'es6',
        module: 'commonjs'
    }
})