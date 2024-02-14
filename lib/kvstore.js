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

const KV_VERSION = '1.0.0';

const path = require('path');

const DotJson = require('dot-json');
const flatten = require('flat');
const unflatten = require('flat').unflatten;
const shell = require('shelljs');
const lockfile = require('lockfile');

const debug = require('debug')(path.basename(__filename, '.js'));

// -----------------------------------------------------------------------------

class KVStore {
  constructor ({ filename, namespace, indent = 2 }) {
    this.indent = indent;
    if (!namespace) {
      debug('Missing namespace, using defaut');
      this.namespace = 'default';
    } else {
      this.namespace = this._cleanKey( namespace, 'namespace') ;
    }
    this.lockFileName = path.join(`${filename}.lock`);
    this.filename = filename;
    try {
      // const fileid = hashsum(filename);
      // this.lockFileName = path.join(os.tmpdir(), `${filename}.${fileid}.lock`);
      // debug(this.lockfileName);
      this._lockFile();
      this.store = new DotJson(filename, 2); // nicely indent the JSON

      if (!shell.test('-f', filename)) {
        debug('creating the KV store file');
        // create the KV file the first time around
        this.store
          .set('store.version', KV_VERSION)
          .set('store.updates', 0)
          .set('store.last_modified', Date.now())
          .set('store.version', 1)
          .set('store.namespaces', {})
          .save(this.indent);
      }
      const about = this.store.get('store');
      if (!about) {
        throw new Error(`Error: KV store file ${filename} is invalid`);
      }
      this._unlockFile();
    } catch (err) {
      this._unlockFile();
      // error(err);
      throw new Error(err + ' or ' + `Could not obtain a lock for file ${this.lockFileName}`);
    }
  }

  _lockFile () {
    if (!shell.test('-f', this.lockFileName)) {
      lockfile.lockSync(this.lockFileName);
    }
  }

  /**
   * { locks the file }
   *
   * @method     _unlockFile
   */
  _unlockFile () {
    if (this.lockFileName && shell.test('-f', this.lockFileName)) {
      lockfile.unlockSync(this.lockFileName);
      shell.rm('-f', this.lockFileName);
    }
  }

  /**
   * { clean up the key to something acceptable }
   *
   * @method     _cleanKey
   * @param      {string}  key     The key
   * @param      {string}  keytype     The type of key, normal or namespace
   * @returns    {string}  key     Lower cased clean key
   * @throws {Error}
   */
  _cleanKey( key, keytype = 'key') {
    if (key) {
      if( key.match( /^\./)) {
        throw new Error(`${keytype} cannot start with dot/period`);
      }
      switch (typeof key) {
        case 'number' :
        case 'bigint' :
          throw new Error(`Cannot have a number as a ${keytype}`);
          break; // eslint-disable-line
        case 'string' :
          if (key.match(/(^\d+$|\b\d+\.|\.\d+\b)/)) {
            throw new Error(`Cannot use numbers and "." in the ${keytype}`);
          }
          break;
        default:
          throw new Error(`Only strings allowed as a${keytype}`);
      }

      // remove any trailing dots
      key = key.replace( /\.+$/, '')
      key = key.trim().toLowerCase();
    }

    return key
  }

  _noteUpdated () {
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
  has (key) {
    let value;
    key = this._cleanKey( key);
    if (key) {
      value = this.store.get(`store.namespaces.${this.namespace}.${key}`);
    }

    return typeof value !== 'undefined';
  }

  /**
   * store a value into the key
   *
   * @method     put
   * @param      {string}  key     The key
   * @param      {string}  value   The value
   */
  put (key, value) {
    key = this._cleanKey( key);
    this._lockFile();

    if (!key || value === undefined) {
      throw new Error('Error: key field must be specified, as must a value');
    }
    this.store
      .set(`store.namespaces.${this.namespace}.${key}`, value)
      .save(this.indent);
    this._noteUpdated();
    this._unlockFile();
    return this.get(key);
  }

  /**
   * get the stored value from a key
   *
   * @param       {string} key  The key
   * @return      {string}      The stored value
   */
  get (key) {
    let value;

    key = this._cleanKey( key);
    if (key) {
      value = this.store.get(`store.namespaces.${this.namespace}.${key}`);
    }
    return value;
  }

  delete (key) {
    key = this._cleanKey( key);
    let preDelete;
    if (key) {
      preDelete = this.get(key);
      this._lockFile();
      this.store
        .delete(`store.namespaces.${this.namespace}.${key}`)
        .save(this.indent);
      this._noteUpdated();
      this._unlockFile();
    }
    return preDelete;
  }

  /**
     * { increment the store value by a given amount }
     *
     * @method     incr
     * @param      {string}  key     The key
     * @param      {string}  value   The value
    * @return     {number}  { the incremeted value }
     */
  incr (key, value) {
    let update = NaN;
    if (!value) {
      debug('no value to incr with');
      return;
    }
    key = this._cleanKey( key);
    if (!key) {
      debug('Error: key field must be specified');
      return;
    }

    const current = this.get(key) || 0;
    if (parseInt(value)) {
      update = parseFloat(current) + parseFloat(value);
      if (!isNaN(update) && typeof (update) === 'number') {
        debug(`updating ${key} from ${current} to ${update}`);
        this.put(key, update);
      } else {
        debug('does not calculate to be a number');
      }
    } else {
      debug('incr value is not an integer');
    }
    return this.get(key);
  }

  /**
    * { decrement the store value by a given amount }
    *
    * @method     decr
    * @param      {string}  key     The key
    * @param      {string}  value   The value
    * @return     {number}  { the decremeted value }
    */
  decr (key, value) {
    let update = NaN;
    if (!value) {
      debug('no value to decr with');
      return;
    }
    key = this._cleanKey( key);
    if (!key) {
      debug('Error: key field must be specified');
      return;
    }
    if (parseInt(value)) {
      const current = this.get(key) || 0;
      update = parseInt(current) - parseInt(value);
      if (!isNaN(update) && typeof (update) === 'number') {
        debug(`updating ${key} from ${current} to ${update}`);
        this.put(key, update);
      } else {
        debug('does not calculate to be a number');
      }
    } else {
      debug('decr value is not an integer');
    }

    return this.get(key);
  }

  //
  // add the value to the end of the array, if the current content of the key is
  // not an array then it will be converted to one
  //
  // @method     push
  // @param      {string}  key     The key
  // @param      {any}  value   The value
  //
  push (key, value) {
    let current = this.get(key);

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

  //
  // take the last value from the array, if the current content of the key is
  // not an array then that value will be used
  //
  // @method     pop
  // @param      {string}  key     The key
  // @return     {any}   the value at the end of the array indexed by key
  //
  pop (key) {
    const current = this.get(key);
    let value;

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

  //
  // add the value to the start of the array, if the current content of the key
  // is not an array then it will be converted to one
  //
  // @method     unshift
  // @param      {string}  key     The key
  // @param      {any}  value   The value
  //
  unshift (key, value) {
    let current = this.get(key);

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

  //
  // take the first value from the array, if the current content of the key is
  // not an array then that value will be used
  //
  // @method     shift
  // @param      {string}  key     The key
  // @return     {any}  the value at the start of the array indexed by key
  //
  shift (key) {
    let current = this.get(key);
    let value;

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

  //
  // limit the size of an array field, if the current content of the key is
  // not an array nothing happens
  //
  // @method     limit
  // @param      {string}  key     The key
  // @param      {string}  direction    head or tail, the front or the end of the array
  // @param      {string}  count   The number of items to limit the array to

  // @return     {number}  the size of the ammended array
  //
  limit (key, direction, count) {
    const current = this.get(key);
    let value = 0;

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
    * { get all the values for keys that are like the given key }
    *
    * @method     find
    * @param      {string}  regexp  The regular expression as a string
    * @return     {Array}   { array of matches }
    */
  find (regexp) {
    const resp = [];
    if (typeof regexp === 'string') {
      // turn it into a proper regexp
      regexp = new RegExp(regexp, 'i');
    }
    if (!regexp) {
      debug('regexp parameter is empty');
      return resp;
    }
    try {
      const list = this.store.get(`store.namespaces.${this.namespace}`);

      const a = flatten(list);
      Object.keys(a).sort().forEach((key) => {
        if (key.match(regexp)) {
        // console.log( {key})
          const b = {};
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
  list () {
    const resp = [];
    try {
      const list = this.store.get(`store.namespaces.${this.namespace}`);
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
  keys () {
    const resp = [];

    try {
      const list = this.store.get(`store.namespaces.${this.namespace}`);
      Object.keys(list).sort().forEach((key) => {
        resp.push(key);
      });
    } catch {
      debug(`Nothing found for namespace ${this.namespace}`);
    }
    return resp;
  }

  // list just the values associated with the namespace
  values () {
    const resp = [];

    try {
      const list = this.store.get(`store.namespaces.${this.namespace}`);
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
  getAll () {
    return this.store.get(`store.namespaces.${this.namespace}`);
  }

  /**
   * Dump the data about the current namespace returns JSON string
   *
   * @method     export
   * @return     {string}  All of the data in the namespace as a JSON string
   */
  export () {
    return JSON.stringify(this.getAll());
  }

  /**
   * get info about the store as a whole
   *
   * @method     info
   * @return     {object}  The about object
   */
  info () {
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
  destroy () {
    const about = this.store.get('store');
    this._lockFile();
    this.store.delete(`store.namespaces.${this.namespace}`)
      .set('store.last_modified', Date.now())
      .set('store.updates', about.updates + 1)
      .save(this.indent);
    this._unlockFile();
  }
}

module.exports = KVStore;
