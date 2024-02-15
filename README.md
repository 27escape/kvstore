# kv

I initially created this repo to allow CLI apps to access simple key-value stores. It has now grown beyond that.

There are several different modules like this on [NPM](https://www.npmjs.com/search?q=kvstore), this is my effort and helps on my Javascript/NodeJS learning journey. One big differentiator is that it also provides array, increment/decrement and find functions over and above the usual get/set methods normally provided.

Updates to the store file happen when any data is added or taken from it, this does mean that it is slower than performing a periodic write, however it does mean that data will not be lost by a crash or application termination.

Due to the use of a local file to hold the data, this library is not suitable for use with Javascript browser applications.

This repo provides both a library for use by nodejs scripts and a CLI (kv) to either be used standalone or within bash scripts.

## Installing

If you have cloned this repo, then `npm install` should do the trick, if you want to use the `kv` script for CLI, then you need to run `npm link`

You may run `npm run test` to make sure everything is working as expected.

I have not yet added this to [NPM](https://www.npmjs.com/)

## As a library

```js
const KVStore = require('../kvstore/lib/kvstore');

const kv = new KVStore({ filename: '/tmp/kvstore.json', namespace: 'sample' });

kv.put( 'a', 100)
kv.put( 'b', { c: { d: 'item' } })
kv.put( 'e.f.g', [ 'one', "two", "three"])

let found = kv.list();
found.forEach((ele) => {
  Object.keys(ele).sort().forEach((key) => {
    showKeyValue(key, ele[key]);
  });
});
```

Full documentation for the library can be seen in [[api.md]]

## As a CLI

Basic operations

```
# add/put/set
$ kv --ns 'namespace' --file /tmp/sample.js put key1 value 

# get
$ VALUE=$(kv --ns 'namespace' /tmp/sample.js get key1)

#delete/del/rm
$ kv --ns 'namespace' /tmp/sample.js delete key1
```

For more operations see [[cli.md]] or use the inbuilt help  `kv -h`


## Use with bun

If you want to make use of this script with [bun](https://bun.sh/) then replace `node` with `bun` in `bin/kv`, you will of course need `bun` to be installed on your system.
