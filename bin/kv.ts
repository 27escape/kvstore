#!/usr/bin/env deno  --allow-read --allow-write --allow-env --allow-sys --unstable-detect-cjs
// -----------------------------------------------------------------------------
/**
 * @name    kv
 * @description Simple Key-Value store with namespaces for simple apps to use
 * @author  Kevin Mulholland
 * @licence MIT
 * @version 2.1.0
 */
// -----------------------------------------------------------------------------

// make sure we are checking for basic coding errors
'use strict';
'use esversion: 6';

// -----------------------------------------------------------------------------

const VERSION = '2.1.0';

import * as path from 'node:path'
import * as os from 'node:os'
const PROGRAM = path.basename(process.argv[1]).replace(/\.ts$/, '');

import Debug from 'debug';
const debug = Debug(PROGRAM);

import { Command } from 'commander';
const program = new Command;

const DEFAULT_STORE = path.join(os.homedir(), '.kvstore.json');
const STORE_FILE = process.env.KV_STORE_FILE || DEFAULT_STORE;

import '../lib/basic-sprintf.js';

// const KVStore = require('../lib/kvstore');
import { KVStore } from '../lib/kvstore.ts';


// -----------------------------------------------------------------------------


// you need this to cleanly catch CTRL+C and nicely exit
process.once('SIGINT', function (code) {
  tidyExit(2, 'SIGINT received...');
});

// -----------------------------------------------------------------------------
// run this function either when you exit or if called by SIGINT etc
function tidyExit(lvl: number, msg: string) {
  // do system cleanup actions

  if (lvl) {
    msg && console.error(msg);
    process.exit(lvl);
  }
}
// this happens for a normal nice exit
process.on('beforeExit', (code) => {
  if (code) {
    console.log('Process beforeExit event with code: ', code);
  }
});

// this happens if you call process.exit with a non-zero code
// its not possible to call async functions (or promises) now
process.on('exit', (code) => {
  // console.log('About to exit with code: ', code);
});

/**
   * nicley write out the key value
   *
   * @function     showKeyValue
   * @param      {string}  key     The key
   * @param      {object}  value   The value, a string or object
   * @param      {string}  separator   The string to separate keys and values
   */
function showKeyValue(key: string, value: string | Object, separator: string) {
  let str: string = "error (undefined)";
  separator ||= ':';
  if (value !== undefined) {
    if (typeof (value) === 'object') {
      // separator for objects is ALWAYS ':'
      str = '%-21s %s'.sprintf(`${key}:`, JSON.stringify(value, null, 2));
    } else {
      str = '%-21s %s'.sprintf(`${key}${separator}`, value);
    }
  }
  console.log(str);
}

/**
   * nicely write out the value.
   *
   * @function     showValue
   * @param      {Object}   value   The value, object or string
   */
function showValue(value: any) {
  let str: string = value || '';
  if (value !== '' && typeof (value) === 'object') {
    str = JSON.stringify(value, null, 2);
  }

  console.log(str);
}

/**
 * trim a string, only needed for Commander inputs
 * @param {string} str
 * @returns {string}
 */
function _trimStr(str: string): string {
  return str.trim();
}

// -----------------------------------------------------------------------------

/**
 * Description
 * @param {Object} program           the Commander program objecy
 * @param {boolean} ignore_ns=false  ignore validating namespace
 * @returns {Object}                  create KV class object
 */
function get_kvstore(program: any, ignore_ns: boolean = false): Object {
  const options = program.opts();

  if (!ignore_ns && !options.ns) {
    console.error('Error: ns field must be specified');
    program.help();
  }

  const params = { filename: options.file, namespace: options.ns,
    tidykeys: options.clean,
    indent: options.indent, force: options.force }
  // console.log( 'params for kvstore', params)

  return new KVStore(params);
}

// -----------------------------------------------------------------------------
/**
 * optionally convert a passed string into an object
 * @param {any} value
 * @param {boolean} isJSON=false
 * @returns {any}
 */
function fromJSON(value: any, isJSON: boolean = false): any {
  if (isJSON) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      console.error('Error: The passed value does not look like a JSON object')
    }
  }

  return value;
}

// -----------------------------------------------------------------------------
// we have a main function as an async function, so that we can await for activities in it!

async function main() {
  program
    .description(`${PROGRAM}: Simple Key-Value store with namespaces for simple apps to use`)
    .version(VERSION, '--version')
    .option('-v, --verbose', 'enable verbose debug', function () { Debug.enable('*'); })
    .requiredOption('-f, --file <filename>', 'KV store file to use, export KV_STORE_FILE to skip passing this parameter', STORE_FILE)
    .option('-n, --ns <value>', '(required) namespace to use', _trimStr)
    .option('-c --clean', 'tidy/clean key and namespace values before use', false)
    .option('-j, --json', `on input value is a JSON string that will be converted to an object to be stored, not required for output as this already happens automatically`)
    .option('-s --separator <value>', 'key and value field separator for find, list, spaced commands', ':')
    .option('-e, --echo', 'echo stored value where applicable')
    .option('--force', 'force overwrite if keypath tree is of a different type');

  const options = program.opts();

  // get the passed arguments, help provided by default

  program.command('put <key> <value>')
    .description('put a new key/value pair, overwrites any existing value for that key')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      const retval = kv.put(key, fromJSON(value, options.json));
      if (options.echo) {
        showValue(retval);
      }
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test put key 'test string'
 `);
    })
    ;

  program.command('get <key>')
    .description('Get the value for the passed key')
    .action((key) => {
      key = key.trim();
      if (!key) {
        console.error('Error: key field must be specified');
        program.help();
      }

      const kv: any = get_kvstore(program)
      showValue(kv.get(key));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test get key
 `);
    })
    ;

  program.command('delete <key>')
    .description('delete everything associated with the key')
    .alias('del')
    .alias('rm').alias('remove')
    .action((key) => {
      key = key.trim();
      if (!key) {
        console.error('Error: key field must be specified');
        program.help();
      }
      const kv: any = get_kvstore(program)
      const retval = kv.delete(key);
      if (options.echo) {
        showValue(retval);
      }
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test delete key
 `);
    })
    ;

  program.command('incr <key> [value]')
    .description('increment the value of a key by a given amount, 1 if missing')
    .action((key, value) => {
      key = key.trim();
      value = value ? value.trim() : 1;

      if (!key) {
        console.error('Error: key field must be specified, as must a value');
        program.help();
      }
      const kv: any = get_kvstore(program)
      const retval = kv.incr(key, value);
      if (options.echo) {
        showValue(retval);
      }
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test incr counter 10
 `);
    })
    ;

  program.command('decr <key> [value]')
    .description('decrement the value of a key by a given amount, 1 if missing')
    .action((key, value) => {
      key = key.trim();
      value = value ? value.trim() : 1;

      if (!key) {
        console.error('Error: key field must be specified, as must a value');
        program.help();
      }
      const kv: any = get_kvstore(program)
      const retval = kv.decr(key, value);
      if (options.echo) {
        showValue(retval);
      }
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test decr counter 10
 `);
    })
    ;

  program.command('push <key> <value>')
    .alias('enqueue')
    .description('push a value onto the END of the array/queue indexed by key')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      kv.push(key, fromJSON(value, options.json));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test push key 'test string'
 `);
    })
    ;

  program.command('pop <key>')
    .description('pop a value from the END of the array indexed by key')
    .action((key) => {
      const kv: any = get_kvstore(program)
      const retval = kv.pop(key);
      showValue(retval);
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test pop key
 `);
    })
    ;

  program.command('unshift <key> <value>')
    .description('unshift a value onto the START of the array indexed by key')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      kv.unshift(key, fromJSON(value, options.json));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test unshift key 'test string'
 `);
    })
    ;

  program.command('shift <key>')
    .alias('dequeue')
    .description('shift a value from the START of the array/queue indexed by key')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      const retval = kv.shift(key, value);
      showValue(retval);
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test shift key
 `);
    })
    ;

  program.command('peek <key>')
    .description('look at the value at the START of the array/queue indexed by key, DOES NOT REMOVE IT')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      let retval = kv.get(key, value);
      if (Array.isArray(retval)) {
        retval = retval[0];
      }
      showValue(retval);
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test peek array
 `);
    })
    ;

  program.command('endpeek <key>')
    .description('look at the value at the END of the array/queue indexed by key, DOES NOT REMOVE IT')
    .action((key, value) => {
      const kv: any = get_kvstore(program)
      let retval = kv.get(key, value);
      if (Array.isArray(retval)) {
        retval = retval[retval.length - 1];
      }
      showValue(retval);
    })
    .on('--help', () => {
      console.log(`
Example:

  kv --ns test unpeak array
`);
    })
    ;

  program.command('limithead <key> <count>')
    .description('limit the size of an array to ONLY count elements, start at the HEAD of the array')
    .action((key, count) => {
      if (count <= 0) {
        console.error('Error: count field cannot be 0 or less');
        program.help();
      }

      const kv: any = get_kvstore(program)
      kv.limit(key, 'head', count);
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test limithead key 4
 `);
    })
    ;

  program.command('limittail <key> <count>')
    .description('limit the size of an array to ONLY count elements, start at the TAIL of the array')
    .action((key, count) => {
      if (count <= 0) {
        console.error('Error: count field cannot be 0 or less');
        program.help();
      }

      const kv: any = get_kvstore(program)
      kv.limit(key, 'tail', count);
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test limittail key 2
 `);
    })
    ; program.command('length <key>')
      .description('get the length of the array/queue indexed by key')
      .action((key: string, value: any) => {
        const kv: any = get_kvstore(program)
        let retval: any = kv.get(key, value);
        if (Array.isArray(retval)) {
          retval = retval.length;
        } else {
          retval = 1;
        }
        showValue(retval);
      })
      .on('--help', () => {
        console.log(`
  Example:

    kv --ns test shift key
 `);
      })
    ;

  program.command('find <regexp>')
    .alias('like')
    .description('Find all matching keys in that are like the passed key regexp')
    .action((regexp) => {
      regexp = regexp.trim();
      if (!regexp) {
        console.error('Error: key field must be specified');
        program.help();
      }
      const kv: any = get_kvstore(program)
      const matches = kv.find(regexp);
      Object.keys(matches).forEach((key: string) => {
        // there is only one subkey for the found item
        Object.keys(matches[key]).forEach((subkey) => {
          showKeyValue(subkey, matches[key][subkey], options.separator);
        });
      });
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test find key
 `);
    })
    ;

  program.command('list')
    .alias('ls')
    .description('list everything associated with the namespace')
    .action(() => {
      const kv: any = get_kvstore(program)
      const found = kv.list();
      found.forEach((ele: { [index: string]: any }) => {
        Object.keys(ele).sort().forEach((key) => {
          showKeyValue(key, ele[key], options.separator);
        });
      });
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test list
  `);
    })
    ;

  program.command('keys')
    .description('list just the top level keys associated with the namespace')
    .action(() => {
      const kv: any = get_kvstore(program)
      console.log(kv.keys().join('\n'));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test keys
  `);
    })
    ;

  program.command('values')
    .description('list just the top level values associated with the namespace')
    .action(() => {
      const kv: any = get_kvstore(program)
      console.log(kv.values().join('\n'));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test values
  `);
    })
    ;

  program.command('spaced')
    .description('list just the top level keys associated with the namespace, space separated')
    .action(() => {
      const kv: any = get_kvstore(program)
      console.log(kv.keys().join(' '));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv --ns test spaced
  `);
    })
    ;

  program.command('export')
    .alias('dump')
    .description('dump the namespace data')
    .action(() => {
      const kv: any = get_kvstore(program)
      console.log(JSON.stringify(kv.export(), null, 2));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv export
  `);
    })
    ;

  program.command('info')
    .description('get info about the store, nothing about the namespaces')
    .action(() => {
      const kv: any = get_kvstore(program, true)
      console.log(JSON.stringify(kv.info(), null, 2));
    })
    .on('--help', () => {
      console.log(`
  Example:

    kv dump
  `);
    })
    ;

  // note that this does not remove things from process.argv
  program.parse(process.argv);
}

// -----------------------------------------------------------------------------
// now we start the main activity and catch any errors
main().then(() => {
  // stuff todo after main completes, probably may not use this
  tidyExit(0, "");
})
  .catch(err => {
    // console.log('there was an error');
    tidyExit(1, err.message);
  });
