// test kvstore

'use strict';
'use esversion: 6';

import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs'
import { KVStore } from '../lib/kvstore.ts';
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

// ----------------------------------------------------------------------------
/**
 * tests if a file exists
 *
 */
function _isFile(filepath: string): boolean {
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


// ----------------------------------------------------------------------------
/**
 * tests if a file exists
 *
 */
function _isDir(filepath: string): boolean {
  // fs.stat will throw an ENOENT error, if a file you want to test for does not
  // exist, even before you get to check if it is a file when it does exist
  let status = false
  if (filepath) {
    try {
      const lf = fs.statSync(filepath)
      status = lf.isDirectory()
    } catch (err: any) {
      // we are only interested if the file does not exist yet
      if (err.code !== "ENOENT") {
        throw err
      }
    }
  }

  return status
}


// ----------------------------------------------------------------------------
function _makeTestFile (testname:string) {
  const testdir = path.join(os.tmpdir(), 'kvstore', new Date().toString() );

  const testfile = path.join(testdir, `${testname}.json`);
  if (!_isDir( testdir)) {
    fs.mkdirSync(testdir, {recursive: true});
  }
  // console.error('testfile is', testfile);
  return testfile;
}

// ----------------------------------------------------------------------------

describe('KV initialization', () => {
  const testname = "kv_init" ; ;
  it('creates store file, removes lockfile', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    expect(_isFile( _makeTestFile(testname))).toBeTruthy();
    expect(_isFile( _makeTestFile(testname) + '.lock')).not.toBeTruthy();
  });
});

describe('KV put + get', () => {
  const testname = "kv_put_get" ; ;

  // namespaces and keys use the same validation, so if we pass the namespace ones we are good
  it( 'namespace cannot start with period', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testname), namespace: `.Test` })).toThrow(Error))
  });
  it( 'namespace cannot be just a number', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testname), namespace: '100' })).toThrow(Error))
  });
  it( 'namespace cannot start as a number followed by a period', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testname), namespace: '100.' })).toThrow(Error))
  });

  it( 'namespace cannot contain a number surrounded by periods eg Test.1.Test', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testname), namespace: `Test.{testname}.Test` })).toThrow(Error))
  });

  it( 'namespace cannot end with number type construct eg namespace.1', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testname), namespace: `{testname}.Test` })).toThrow(Error))
  });

  // but throw in a couple of key validations too just to make sure
  it( 'key cannot start with period', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    expect(() => expect(kv.put( '.firsta', 'value')).toThrow(Error))
  });

  it( 'key cannot contain string.number type construct eg key.1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    expect(() => expect(kv.put( 'first.1', 'value')).toThrow(Error))
  });

  it('stores a key/value, removes lockfile', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('first', 'value');
    const value = kv.get('first');
    expect(value).toBe('value');
    expect(_isFile( _makeTestFile(testname) + '.lock')).not.toBeTruthy();
  });

  it('has caseless key access', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('SECOND', 'value2');
    const value = kv.get('second');
    expect(value).toBe('value2');
  });

  it('puts deep key, gets object from top', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: `Test${testname}-1` });
    const obj = {
      b: { c: { d: 'item' } }
    };
    kv.put('a.b.c.d', 'item');
    const value = kv.get('a');
    expect(value).toMatchObject(obj);
  });

  it('puts object, gets deep key', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: `Test${testname}-1` });
    kv.put('deep', { b: { c: { d: 'item' } } });
    const value = kv.get('deep.b.c.d');
    expect(value).toBe('item');
  });
});

describe('KV delete', () => {
  const testname = "kv_delete" ;

  it('deletes, single key, others remain', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('first', 'value');
    kv.put('SECOND', 'value2');
    kv.put('third', 'value3');
    kv.delete('third');
    expect(kv.get('third')).not.toBeDefined();
    expect(kv.get('first')).toBe('value');
    expect(kv.get('second')).toBe('value2');
  });
  it('removes lock file', () => {
    expect(_isFile( _makeTestFile(testname) + '.lock')).not.toBeTruthy();
  });
});

describe('KV incr', () => {
  const testname = "kv_incr" ;
  it('increments 1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    // kv.put('key', 0);
    kv.incr('key', 1);
    const value = parseInt(kv.get('key'))
    expect(value).toBe(1);
  });
  it('increments 10', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('key', 1);
    kv.incr('key', 10);
    const value = parseInt(kv.get('key'))
    expect(value).toBe(11);
  });
  it('ignore incr with non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const prev = kv.get('key');
    const value = kv.incr('key', 'test');
    expect(value).toBe(prev);
  });
  it('ignore incr of non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('key', 'string');
    const value = kv.incr('key', 1);
    expect(value).toBe('string');
  });
});

describe('KV decr', () => {
  const testname = "kv_decr" ;

  it('decrements 1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('key', 0);
    kv.decr('key', 1);
    const value = parseInt(kv.get('key'))
    expect(value).toBe(-1);
  });
  it('decrements 10', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('key', -1);
    kv.decr('key', 10);
    const value = parseInt(kv.get('key'))
    expect(value).toBe(-11);
  });

  it('ignore decr with non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const prev = kv.get('key');
    const value = kv.decr('key', 'test');
    expect(value).toBe(prev);
  });
  it('ignore decr of non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('key', 'string');
    const value = kv.decr('key', 1);
    expect(value).toBe('string');
  });
});

describe('KV find', () => {
  const testname = "kv_find" ;

  it('matches basic regexp', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const obj = [{ a1: 1 }, { a2: 2 }, { a3: 3 }];
    kv.put('a1', 1);
    kv.put('a2', 2);
    kv.put('a3', 3);
    kv.put('longname.d', 'something else');
    const find = kv.find(/^a\d/);
    expect(find).toMatchObject(obj);
  });

  it('matches deeper regexp', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const obj = [{ a: { b: { c: { d: 1 } } } }, { longname: { d: 'something else' } }];
    kv.put('a.b.c.d', 1);
    kv.put('a2', 2);
    kv.put('a3', 3);
    kv.put('longname.d', 'something else');
    const find = kv.find(/\.d$/);
    expect(find).toMatchObject(obj);
  });
});

describe('KV list', () => {
  const testname = "kv_list" ;

  it('has all the keys+values', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const obj = [
      { a: 1 }, { b: 2 }, { c: 3 }];
    kv.put('a', 1);
    kv.put('b', 2);
    kv.put('c', 3);
    const list = kv.list();
    expect(list).toMatchObject(obj);
  });
});

describe('KV keys', () => {
  const testname = "kv_keys" ;

  it('has all the keys', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array:Array<any> = ['a', 'b', 'c'];
    kv.put('a', 1);
    kv.put('b', 2);
    kv.put('c', 3);
    const keys = kv.keys();
    expect(keys).toMatchObject(array);
  });
});

describe('KV values', () => {
  const testname = "kv_values" ;

  it('has all the values', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array:Array<any> = [1, 2, 3];
    kv.put('a', 1);
    kv.put('b', 2);
    kv.put('c', 3);
    const values:Array<any> = kv.values();
    expect(values).toMatchObject(array);
  });
});

describe('KV push', () => {
  const testname = "kv_push" ;

  it('pushes onto an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array:Array<any> = [1, 2, 3];
    kv.put('a', array);
    kv.push('a', 4);
    const values:Array<any> = kv.get('a');
    expect(values).toMatchObject([ ...array, 4] as Array<any>);
  });

  it('converts to array before push', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    kv.push('a', 4);
    const values:Array<any> = kv.get('a');
    expect(values).toMatchObject([1, 4] as Array<any>);
  });
});

describe('KV pop', () => {
  const testname = "kv_pop" ;

  it('pops from an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array = [1, 2, 3];
    kv.put('a', array);
    expect(kv.pop('a')).toBe(3);
  });

  it('fetches non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    expect(kv.pop('a')).toBe(1);
  });

  it('consumes non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    kv.pop('a');
    const value = kv.get('a');
    // value should no longer exist
    expect(value).toBeUndefined();
  });
});

describe('KV unshift', () => {
  const testname = "kv_unshift" ;

  it('unshifts onto an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array:Array<any> = [1, 2, 3];
    kv.put('a', array);
    kv.unshift('a', 4);
    const values:Array<any> = kv.get('a');
    expect(values).toMatchObject([4, 1, 2, 3] as Array<any>);
  });

  it('converts to array before unshift', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    kv.unshift('a', 4);
    const values:Array<any> = kv.get('a');
    expect(values).toMatchObject([4, 1] as Array<any>);
  });
});

describe('KV shift', () => {
  const testname = "kv_shift" ;

  it('shifts from an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    const array:Array<any> = [1, 2, 3];
    kv.put('a', array);
    expect(kv.shift('a') as number).toBe(1);
  });

  it('fetches non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    expect(kv.shift('a')).toBe(1);
  });

  it('consumes non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
    kv.put('a', 1);
    kv.shift('a');
    const value = kv.get('a');
    // value should no longer exist
    expect(value).toBeUndefined();
  });
});

describe('KV export', () => {
  const testname = "kv_export" ;
  const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
  kv.put('a.b.c.d', 1);
  const exportdata = kv.export();
  it('provides object matching contents', () => {
    expect(exportdata).toMatchObject( {
      "a":{
        "b": {
          "c": {
            "d":1
            }
          }
        }
      }
    );
  });
});

describe('KV info', () => {
  const testname = "kv_info" ;

  const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
  it('has expected fields', () => {
    const fields:Array<any> = ['filename', 'last_modified', 'updates', 'version'];
    const info = kv.info();
    expect(Object.keys(info).sort()).toMatchObject(fields);
  });

  it('has correct fieldsname', () => {
    const info = kv.info();
    expect(info.filename).toBe(_makeTestFile(testname));
  });
});

describe('KV limit', () => {
  const testname = "kv_limit" ;

  const kv = new KVStore({ filename: _makeTestFile(testname), namespace: 'Test' + testname });
  const array = [1, 2, 3, 4, 5, 6];

  it('does not allow -ve limit', () => {
    expect(() => expect(kv.limit( 'a', 'tail', -1)).toThrow(Error))
    expect(() => expect(kv.limit( 'a', 'tail', -1)).toThrow('Error: KV limit cannot use a -ve value'))
  });

  it('limits head to 2 values', () => {
    kv.put('a', array);
    kv.limit( 'a', 'head', 2)
    const tmp:Array<any> = kv.get( 'a') ;
    expect( tmp.length).toBe( 2) ;
    expect( tmp).toMatchObject([1, 2] as Array<any>);
  });

  it('limits tail to 2 values', () => {
    kv.put('a', array);
    kv.limit( 'a', 'tail', 2)
    const tmp:Array<any> = kv.get( 'a') ;
    expect( tmp.length).toBe( 2);
    expect( tmp).toMatchObject([5, 6] as Array<any>);
  });
});
