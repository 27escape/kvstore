// -----------------------------------------------------------------------------
/**
 * @name    kvstore
 * @description class to manage manipulating a key-value store
 * @author  kevin mulholland
 * @licence MIT
 * @version 0.0.1
 */
// -----------------------------------------------------------------------------

// make sure we are checking for basic coding errors
'use strict';
'use esversion: 6';

// version 2 does not include the 'accesses' field in the header
const KV_VERSION = '2.1.0';

import * as path from 'path'
import * as fs from 'fs'
import Debug from 'debug';
// const LIBNAME = path.basename(import.meta.filename.replace(/\.ts$/, ''));
const LIBNAME = 'kvstore'
const debug = Debug(LIBNAME);

// import {DotJson}  from './dot-json.ts';
import DotJson from 'dot-json';
import { flatten, unflatten } from 'flat';
import * as lockfile from 'lockfile';

const NAMESPACES = 'store.namespaces'

// -----------------------------------------------------------------------------

export class KVStore {
  filename: string;
  indent: Number;
  namespace: string;
  store: any;
  force: boolean;
  lockFileName: string;
  tidykeys: boolean;

  constructor(config: { filename: string, namespace: string, indent: number, tidykeys: boolean, force: boolean }) {

    if (config.indent === undefined) {
      config.indent = 2
    }
    this.force = config.force;
    this.indent = config.indent;
    if (!config.namespace) {
      debug('Missing namespace, using defaut');
      this.namespace = 'default';
    } else {
      this.namespace = this._cleanKey(config.namespace, 'namespace');
    }
    this.lockFileName = path.join(`${config.filename}.lock`);
    this.filename = config.filename;
    this.tidykeys = config.tidykeys;

    try {
      // const fileid = hashsum(filename);
      // this.lockFileName = path.join(os.tmpdir(), `${filename}.${fileid}.lock`);
      // debug(this.lockfileName);
      this._lockFile();

      this.store = new DotJson(this.filename);

      if (!this._isFile(this.filename)) {
        debug('creating the KV store file');
        // create the KV file the first time around
        this.store
          .set('store.version', KV_VERSION)
          .set('store.updates', 0)
          .set('store.last_modified', Date.now())
          .set('store.version', 1)
          .set(`${NAMESPACES}`, {})
          .save(this.indent);
      }
      const about = this.store.get('store');
      if (!about) {
        throw new Error(`Error: KV store file ${this.filename} is invalid`);
      }
      this._unlockFile();
    } catch (err) {
      this._unlockFile();
      // error(err);
      throw new Error(err + ' or ' + `Could not obtain a lock for file ${this.lockFileName}`);
    }
  }

  /**
   * tests if a file exists
   *
   * @method     _isFile
   */
  _isFile(filepath: string): boolean {
    // fs.stat will throw an ENOENT error, if a file you want to test for does not
    // exist, even before you get to check if it is a file when it does exist
    let status = false
    if (filepath) {
      try {
        const lf = fs.statSync(filepath)
        status = lf.isFile()
      } catch (err: any) {
        // we are only interested if the file does not exist yet
        if (err.code !== "ENOENT") {
          throw err
        }
      }
    }

    return status
  }

  /**
   * locks the file
   *
   * @method     _lockFile
   */
  _lockFile() {
    if (!this._isFile(this.lockFileName)) {
      lockfile.lockSync(this.lockFileName);
    }
  }

  /**
   * unlocks the file
   *
   * @method     _unlockFile
   */
  _unlockFile() {
    if (this.lockFileName) {
      try {
        lockfile.unlockSync(this.lockFileName);
        fs.unlinkSync(this.lockFileName);
      } catch (err) {
        // ignore
      }
    }
  }

  /**
   * clean up the key to something acceptable, if constructor option tidykeys is used will replace '.' and spaces with '_'
   *
   * @method     _cleanKey
   * @param      {string}  key     The key
   * @param      {string}  keytype     The type of key, normal or namespace
   * @returns    {string}  key     Lower cased clean key
   * @throws {Error}
   */
  _cleanKey(key: string, keytype: string = 'key'): string {
    if (key) {
      // do we want to allow keys to be cleaned up
      if (this.tidykeys) {
        key = key.replace(/\.| /g, '_') // replace periods and spaces
        key = key.replace(/_+/g, '_')   // remove dups
        key = key.replace(/^_|_$/g, '') // remove leading or trailing
      } else {
        if (key.match(/^\./)) {
          throw new Error(`${keytype} cannot start with dot/period`);
        }
        switch (typeof key) {
          case 'number':
          case 'bigint':
            throw new Error(`Cannot have a number as a ${keytype}`);
            break; // eslint-disable-line
          case 'string':
            // no isolated numbers
            // cannot start with a number and full stop
            // cannot have fullstops surrounding a number
            // cannot end after a fullstop and a number
            if (key.match(/(^\d+$|^\d+\.|\.\d+\.|\.\d+$)/)) {
              throw new Error(`Cannot use numbers and "." in the ${keytype}`);
            }
            break;
          default:
            throw new Error(`Only strings allowed as a${keytype}`);
        }

        // remove any trailing dots
        key = key.replace(/\.+$/, '')
      }
    }

    key = key.trim().toLowerCase();
    return key
  }

  _setStoreUpdated() {
    const about = this.store.get('store');
    this.store.set('store.last_modified', Date.now())
      .set('store.updates', about.updates + 1)
      .save(this.indent);
  }

  /**
   * test if a key exists in the namespace
   *
   * @method     has
   * @param      {string}   key     The key
   * @return     {boolean}  true if the key exists, otherwise false
   */
  has(key: string): boolean {
    let value: string | undefined;
    key = this._cleanKey(key);
    if (key) {
      value = this.store.get(`${NAMESPACES}.${this.namespace}.${key}`);
    }

    return typeof value !== 'undefined';
  }

  /**
   * is the closest parent of a keypath an object
   * @param key
   */
  _closetObject(key: string): string {
    let parent_path = key
    let current: any = undefined

    while (parent_path.length) {
      current = this.get(parent_path)
      // debug(`${parent_path}, current ${current}`)
      if (current) {
        break
      }
      // remove last path item
      parent_path = parent_path.replace(/\.?\w+$/, "");
    }

    return parent_path
  }

  /**
   * store a value into the key
   *
   * @method     put
   * @param      {string}  key     The key
   * @param      {any}  value   The value
   */
  put(key: string, value: any): any {
    key = this._cleanKey(key);

    if (!key || value === undefined) {
      throw new Error('Error: key field must be specified, as must a value');
    }
    // debug(`put key: ${key}`)

    const current: any = this.get(key)
    if (!current) {
      const parent: string = this._closetObject(key)
      // debug(`parent ${parent}`)
      if (parent.length) {
        let parent_value: any = this.get(parent)
        // debug(`parent value ${parent_value}, type ${typeof parent_value}`)
        if (typeof parent_value !== 'object') {
          if (this.force) {
            debug(`force overwriting ${parent} to create path ${key}, due to differnt types`)
            this.delete(parent)
          } else {
            throw new Error(`EBADPATH: cannot overwrite path to ${key} via ${parent}, as parent is different type, use force to overwrite`)
          }
        }
      }
    } else {
      // debug('changing type')
      if (typeof current !== typeof value) {
        if (this.force) {
          debug(`force overwriting ${key}, to a new type`)
          this.delete(key)
        } else {
          throw new Error(`EBADTYPE: cannot overwrite ${key}, as different types, use force to overwrite`)
        }
      }
    }
    const keypath = `${NAMESPACES}.${this.namespace}.${key}`
    // debug(`storing to ${keypath}`)
    this._lockFile();
    this.store.set(keypath, value).save(this.indent);
    this._setStoreUpdated();
    this._unlockFile();

    return this.get(key);
  }

  /**
   * get the stored value from a key
   *
   * @param       {string} key  The key
   * @return      {any}      The stored value
   */
  get(key: string): any {
    let value: string = "";

    key = this._cleanKey(key);
    if (key) {
      value = this.store.get(`${NAMESPACES}.${this.namespace}.${key}`);
    }
    return value;
  }

  /**
   * delete an entry
   */
  delete(key: string): string {
    key = this._cleanKey(key);
    let preDelete: string = "";
    if (key) {
      preDelete = this.get(key);
      this._lockFile();
      this.store
        .delete(`${NAMESPACES}.${this.namespace}.${key}`)
        .save(this.indent);
      this._setStoreUpdated();
      this._unlockFile();
    }
    return preDelete;
  }

  /**
     * increment the store value by a given amount
     *
     * @method     incr
     * @param      {string}  key     The key
     * @param      {string}  value   The value
     * @return     {number}  { the incremeted value }
     */
  incr(key: string, value: string): number {
    let update: number = NaN;
    if (!value) {
      debug('no value to incr with');
      throw new Error('No passed value to incr with');
    }
    key = this._cleanKey(key);
    if (!key) {
      debug('Error: key field must be specified');
      throw new Error('Missing key field for incr');
    }

    const current = this.get(key) || "0";
    if (parseInt(value)) {
      update = parseFloat(current) + parseFloat(value);
      if (!isNaN(update) && typeof (update) === 'number') {
        debug(`updating ${key} from ${current} to ${update}`);
        this.put(key, "" + update);
      } else {
        debug('does not calculate to be a number');
      }
    } else {
      debug('incr value is not an integer');
    }
    return parseFloat(this.get(key));
  }

  /**
    * decrement the store value by a given amount
    *
    * @method     decr
    * @param      {string}  key     The key
    * @param      {string}  value   The value
    * @return     {number}  { the decremeted value }
    */
  decr(key: string, value: string): number {
    let update: number = NaN;
    if (!value) {
      debug('no value to decr with');
      throw new Error('No passed value to decr with');
    }
    key = this._cleanKey(key);
    if (!key) {
      debug('Error: key field must be specified');
      throw new Error('Missing key field');
    }
    if (parseInt(value)) {
      const current = this.get(key) || "0";
      update = parseInt(current) - parseInt(value);
      if (!isNaN(update) && typeof (update) === 'number') {
        debug(`updating ${key} from ${current} to ${update}`);
        this.put(key, "" + update);
      } else {
        debug('does not calculate to be a number');
      }
    } else {
      debug('decr value is not an integer');
    }

    return parseFloat(this.get(key));
  }

  /**
   * add the value to the end of the array, if the current content of the key is
   * not an array then it will be converted to one
   *
   * @method     push
   * @param      {string}  key     The key
   * @param      {any}  value   The value
   *
   *
  */
  push(key: string, value: any) {
    let current: any = this.get(key);

    if (!current) {
      current = [value];
    } else {
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        current = [current, value];
      }
    }
    this.put(key, current);
  }

  /**
   *
   * take the last value from the array, if the current content of the key is
   * not an array then that value will be used
   *
   * @method     pop
   * @param      {string}  key     The key
   * @return     {any}   the value at the end of the array indexed by key
   *
  */
  pop(key: string): any {
    const current: any = this.get(key);
    let value: any;

    if (current) {
      if (Array.isArray(current)) {
        value = current.pop();
        // put whats left back
        this.put(key, current);
      } else {
        // get the current value and remove whatever was there
        value = current;
        this.delete(key);
      }
    }
    return value;
  }

  /**
   *  add the value to the start of the array, if the current content of the key
   *  is not an array then it will be converted to one
   *
   *  @method     unshift
   *  @param      {string}  key     The key
   *  @param      {any}  value   The value
   */
  unshift(key: string, value: any) {
    let current: any = this.get(key);

    if (current) {
      if (Array.isArray(current)) {
        current.unshift(value);
      } else {
        // add to the start
        current = [value, current];
      }
      this.put(key, current);
    }
  }

  /**
   * take the first value from the array, if the current content of the key is
   * not an array then that value will be used
   *
   * @method     shift
   * @param      {string}  key     The key
   * @return     {any}  the value at the start of the array indexed by key
  */
  shift(key: string): any {
    let current: any = this.get(key);
    let value: any;

    if (!current) {
      current = NaN;
    } else {
      if (Array.isArray(current)) {
        value = current.shift();
        // put whats left back
        this.put(key, current);
      } else {
        // get the current value and remove whatever was there
        value = current;
        this.delete(key);
      }
    }
    return value;
  }

  /**
  * limit the size of an array field, if the current content of the key is
  * not an array nothing happens
  *
  * @method     limit
  * @param      {string}  key     The key
  * @param      {string}  direction    head or tail, the front or the end of the array
  * @param      {number}  count   The number of items to limit the array to
  * @return     {number}  the size of the ammended array
  */
  limit(key: string, direction: string, count: number): number {
    const current: any = this.get(key);
    let value: number = 0;

    if (count < 0) {
      throw new Error('Error: KV limit cannot use a -ve value');
    }

    if (current && Array.isArray(current)) {
      switch (direction) {
        case 'head':
        case 'front':
          current.length = count;
          this.put(key, current);
          break;
        case 'tail':
        case 'end':
          this.put(key, current.slice(-1 * count));
          break;
        default:
          debug(`limit: incorrect direction '${direction} used`);
          break;
      }
      value = current.length;
    }
    return value;
  }

  /**
    * get all the values for keys that are like the given key
    *
    * @method     find
    * @param      {RegExp}   The regular expression as a string
    * @return     {Array}   { array of matches }
    */
  find(regexp: RegExp): Array<any> {
    const resp: Array<any> = [];
    if (typeof regexp === 'string') {
      // turn it into a proper regexp
      regexp = new RegExp(regexp, 'i');
    }
    if (!regexp) {
      debug('regexp parameter is empty');
      return resp;
    }
    try {
      const list = this.store.get(`${NAMESPACES}.${this.namespace}`);

      const a: { [index: string]: any } = flatten(list);
      Object.keys(a).sort().forEach((key: string) => {
        if (key.match(regexp)) {
          // console.log( {key})
          const b: { [index: string]: any } = {};
          b[key] = a[key];
          resp.push(unflatten(b));
        }
      });
    } catch (err) {
      debug(err, `Nothing found for namespace ${this.namespace}`);
    }
    return resp;
  }

  //
  // list everything associated with the namespace
  //
  // @method     list
  // @return     {string[]}  { description_of_the_return_value }
  //
  list(): Array<any> {
    const resp: Array<any> = [];
    try {
      const list = this.store.get(`${NAMESPACES}.${this.namespace}`);
      Object.keys(list).sort().forEach((key) => {
        resp.push({ [key]: list[key] }); // need to evaluate the key to use it like this
      });
    } catch {
      debug(`Nothing found for namespace ${this.namespace}`);
    }
    return resp;
  }

  //
  // list just the keys associated with the namespace
  //
  // @method     keys
  // @return     {string[]}  { description_of_the_return_value }
  //
  keys() {
    const resp: Array<any> = [];

    try {
      const list = this.store.get(`${NAMESPACES}.${this.namespace}`);
      Object.keys(list).sort().forEach((key) => {
        resp.push(key);
      });
    } catch {
      debug(`Nothing found for namespace ${this.namespace}`);
    }
    return resp;
  }

  // list just the values associated with the namespace
  values() {
    const resp: Array<any> = [];

    try {
      const list = this.store.get(`${NAMESPACES}.${this.namespace}`);
      Object.keys(list).sort().forEach((key) => {
        resp.push(list[key]);
      });
    } catch {
      debug(`Nothing found for namespace ${this.namespace}`);
    }
    return resp;
  }

  /**
   * Gets all the data in the namespace
   *
   * @method     getAll
   * @return     {object}  All of the data in the namespace
   */
  getAll(): any {
    return this.store.get(`${NAMESPACES}.${this.namespace}`);
  }

  /**
   * Dump the data about the current namespace returns object
   *
   * @method     export
   * @return     {object}  All of the data in the namespace
   */
  export(): object {
    return this.getAll()
  }

  /**
   * get info about the store as a whole
   *
   * @method     info
   * @return     {any}  The about object
   */
  info(): any {
    const about = this.store.get('store');
    const d = new Date(about.last_modified);
    about.last_modified = d.toISOString();
    about.filename = this.filename;
    delete about.namespaces;
    return about;
  }

  /**
   * remove everything in the namespace
   *
   * @method     destroy
   */
  destroy() {
    const about = this.store.get('store');
    this._lockFile();
    this.store.delete(`${NAMESPACES}.${this.namespace}`)
      .set('store.last_modified', Date.now())
      .set('store.updates', about.updates + 1)
      .save(this.indent);
    this._unlockFile();
  }
}
