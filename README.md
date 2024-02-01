# kv

Simple Key-Value store with namespaces for simple apps to use, stores into a JSON file, normally as $HOME/.kvstore.json. There are several different modules like this on [NPM](https://www.npmjs.com/search?q=kvstore), this is my effort and helps on my Javascript/NodeJS learning journey. One big differentiator is that it also provides array, increment/decrement and find functions over and above the usual get/set methods normally provided.

Updates to the store file happen when any data is added or taken from it, this does mean that i is slower than performing a periodic write, however it does mean that data will not be lost by a crash or application termination.

Due to the use of a local file to hold the data, this library is not suitable for use with Javascript browser applications.

This repo provides both a library for use by nodejs scripts and a CLI (kv) to either be used standalone or within bash scripts.

## As a library


const KVStore = require('kvstore');


## As a CLI

```
Usage: kv [options] [command]

kv: Simple Key-Value store with namespaces for simple apps to use

Options:
  --version                   output the version number
  -v, --verbose               enable verbose debug
  -f, --file <filename>       KV store file to use, export KV_STORE_FILE to
                              skip passing this parameter (default:
                              "/Users/kevinmu/Repos/personal/dotfiles/kvstores/generalstore.json")
  -n, --ns <value>            Namespace to use
  -s --separator <value>      key and value field separator (default: ":")
  -e, --echo                  echo stored value where applicable
  -h, --help                  display help for command

Commands:
  put|add <key> <value>       put a new key/value pair, overwrites any existing
                              value for that key
  get <key>                   Get the value for the passed key
  delete|del <key>            delete everything associated with the key
  incr <key> [value]          increment the value of a key by a given amount, 1
                              if missing
  decr <key> [value]          decrement the value of a key by a given amount, 1
                              if missing
  push|enqueue <key> <value>  push a value onto the END of the array/queue
                              indexed by key
  pop <key>                   pop a value from the END of the array indexed by
                              key
  unshift <key> <value>       unshift a value onto the START of the array
                              indexed by key
  shift|dequeue <key>         shift a value from the START of the array/queue
                              indexed by key
  peek <key>                  look at the value at the START of the array/queue
                              indexed by key, DOES NOT REMOVE IT
  endpeek <key>               look at the value at the END of the array/queue
                              indexed by key, DOES NOT REMOVE IT
  limithead <key> <count>     limit the size of an array to ONLY count
                              elements, start at the HEAD of the array
  limittail <key> <count>     limit the size of an array to ONLY count
                              elements, start at the TAIL of the array
  length <key>                get the length of the array/queue indexed by key
  find|like <regexp>          Find all matching keys that are like the passed
                              key regexp
  list|ls                     list everything associated with the namespace
  keys                        list just the top level keys associated with the
                              namespace
  values                      list just the top level values associated with
                              the namespace
  spaced                      list just the top level keys associated with the
                              namespace, space separated
  export|dump                 dump the namespace data
  info                        get info about the store, nothing about the
                              namespaces
  help [command]              display help for command


```

More help on specific commands can be found when using help with that command

```

> kv add -h


Usage: kv add [options] <key> <value>

add a new key/value pair

Options:
  -h, --help  display help for command

  Example:

    kv --ns test add key 'test string'

```

### Use as a simple queueing system

There are aliases for some commands that allow KV to be used as a queueing system. These are

* enqueue - put a value at the tail of the queue
* dequeue - take a value from the head of the queue
* peek - view the value at the head of the queue
* length - get the length of the queue

