ls# kv

**updated:2024-12-03 check building and installing instructions, as now using [deno](https://deno.com/)**

I initially created this repo to allow CLI apps to access simple key-value stores. It has now grown beyond that. It now provides access to data within a JSON file, performing basic get/put operations, operations on numbers such as incr and decr, operations on arrays (e.g. push, pop, shift, unshift), as well as providing search functionality.

There are several different modules like this on [NPM](https://www.npmjs.com/search?q=kvstore); this is my effort and helps on my Javascript/NodeJS learning journey. One big differentiator is that it also provides array, increment/decrement and find functions over and above the usual get/set methods normally provided.

Updates to the store file happen when any data is added or taken from it, this does mean that it is slower than performing a periodic write, however it does mean that data will not be lost by a crash or application termination.

Due to the use of a local file to hold the data, this library is not suitable for use with Javascript browser applications.

This repo provides both a library for use by nodejs scripts and a CLI (kv) to either be used standalone or within bash scripts.

## Building and Installing

First up head to https://deno.com/ to find out how to install deno for your system

I have a simple bash script that will compile a deno script only if it has changed against a previously compiled version, its in `extras/deno_compile.sh`, copy it and make sure its executable in your PATH - likely not to work on Windows!

```
deno task build
```

This creates a `kv` executable for your system in the 'dist' directory, after it has been tested

```
deno task install
```

Will build and install to `$HOME/bin/kv`

## As a library

```js
// until I release it to wherever, you will have to reference it with a full path
import { KVStore } from '../lib/kvstore.ts';

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

Full documentation for the library can be seen in [API documentation](api.md)

## As a CLI

Basic operations

```
# put
$ kv --ns 'namespace' --file /tmp/sample.js put key1 value 

# get
$ VALUE=$(kv --ns 'namespace' /tmp/sample.js get key1)

#delete/del/rm
$ kv --ns 'namespace' /tmp/sample.js delete key1
```

For more operations see [CLI documentation](cli.md) or use the inbuilt help  `kv -h`

