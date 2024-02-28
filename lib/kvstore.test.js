// test kvstore

// 'use strict';
'use esversion: 6';

const shell = require('shelljs');
const KVStore = require('../lib/kvstore');
const os = require('os');
const path = require('path');
const process = require('process');

const testdir = path.join(os.tmpdir(), 'kvstore.' + process.pid);
// const testdir = path.join(os.tmpdir(), 'kvstore');
// console.error('testdir is', testdir);

function _makeTestFile (testnum) {
  const testfile = path.join(testdir, testnum + '.json');
  if (!shell.test('-d', testdir)) {
    shell.mkdir('-p', testdir);
  }
  // console.error('testfile is', testfile);
  return testfile;
}

// ----------------------------------------------------------------------------
// Jest config options

jest.verbose = true; // dont hide console.log messages, show at start of output
jest.inBand = true; // run the tests sequentially
// jest.setTimeout(30000); // in case the 5s allowed is not enough

beforeAll(() => {
  // if (!shell.test('-d', testdir)) {
  //   shell.mkdir('-p', testdir);
  // }
});

afterAll(() => {
  // shell.rm('-rf', testdir);
});

describe('KV initialization', () => {
  const testnum = 1;
  it('creates store file, removes lockfile', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    expect(shell.test('-f', _makeTestFile(testnum))).toBeTruthy();
    expect(shell.test('-f', _makeTestFile(testnum) + '.lock')).not.toBeTruthy();
  });
});

describe('KV put + get', () => {
  const testnum = 2;

  // namespaces and keys use the same validation, so if we pass the namespace ones we are good
  it( 'namespace cannot start with period', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: `.Jest` })).toThrow(Error))
  });
  it( 'namespace cannot be just a number', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: '100' })).toThrow(Error))
  });
  it( 'namespace cannot start as a number followed by a period', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: '100.' })).toThrow(Error))
  });

  it( 'namespace cannot contain a number surrounded by periods eg jest.1.jest', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: `jest.{testnum}.jest` })).toThrow(Error))
  });

  it( 'namespace cannot end with number type construct eg namespace.1', () => {
    expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: `{testnum}.jest` })).toThrow(Error))
  });

  // but throw in a couple of key validations too just to make sure
  it( 'key cannot start with period', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    expect(() => expect(kv.put( '.firsta', 'value')).toThrow(Error))
  });

  it( 'key cannot contain string.number type construct eg key.1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    expect(() => expect(kv.put( 'first.1', 'value')).toThrow(Error))
  });

  it('stores a key/value, removes lockfile', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('first', 'value');
    const value = kv.get('first');
    expect(value).toBe('value');
    expect(shell.test('-f', _makeTestFile(testnum) + '.lock')).not.toBeTruthy();
  });

  it('has caseless key access', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('SECOND', 'value2');
    const value = kv.get('second');
    expect(value).toBe('value2');
  });

  it('puts deep key, gets object from top', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: `Jest${testnum}-1` });
    const obj = {
      b: { c: { d: 'item' } }
    };
    kv.put('a.b.c.d', 'item');
    const value = kv.get('a');
    // console.log('----->', value);
    // console.log( kv.list())
    expect(value).toMatchObject(obj);
  });

  it('puts object, gets deep key', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: `Jest${testnum}-1` });
    kv.put('deep', { b: { c: { d: 'item' } } });
    const value = kv.get('deep.b.c.d');
    expect(value).toBe('item');
  });
});

describe('KV delete', () => {
  const testnum = 3;

  it('deletes, single key, others remain', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('first', 'value');
    kv.put('SECOND', 'value2');
    kv.put('third', 'value3');
    kv.delete('third');
    expect(kv.get('third')).not.toBeDefined();
    expect(kv.get('first')).toBe('value');
    expect(kv.get('second')).toBe('value2');
  });
  it('removes lock file', () => {
    expect(shell.test('-f', _makeTestFile(testnum) + '.lock')).not.toBeTruthy();
  });
});

describe('KV incr', () => {
  const testnum = 4;
  it('increments 1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.incr('key', 1);
    expect(kv.get('key')).toBe(1);
  });
  it('increments 10', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('key', 1);
    kv.incr('key', 10);
    expect(kv.get('key')).toBe(11);
  });
  it('ignore incr with non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const prev = kv.get('key');
    const value = kv.incr('key', 'test');
    expect(value).toBe(prev);
  });
  it('ignore incr of non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('key', 'string');
    const value = kv.incr('key', 1);
    expect(value).toBe('string');
  });
});

describe('KV decr', () => {
  const testnum = 5;

  it('decrements 1', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.incr('key', 0);
    kv.decr('key', 1);
    expect(kv.get('key')).toBe(-1);
  });
  it('decrements 10', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('key', -1);
    kv.decr('key', 10);
    expect(kv.get('key')).toBe(-11);
  });

  it('ignore decr with non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const prev = kv.get('key');
    const value = kv.decr('key', 'test');
    expect(value).toBe(prev);
  });
  it('ignore decr of non-number', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('key', 'string');
    const value = kv.decr('key', 1);
    expect(value).toBe('string');
  });
});

describe('KV find', () => {
  const testnum = 6;

  it('matches basic regexp', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const obj = [{ a1: 1 }, { a2: 2 }, { a3: 3 }];
    kv.put('a1', 1);
    kv.put('a2', 2);
    kv.put('a3', 3);
    kv.put('longname.d', 'something else');
    const find = kv.find(/^a\d/);
    expect(find).toMatchObject(obj);
  });

  it('matches deeper regexp', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
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
  const testnum = 7;

  it('has all the keys+values', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
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
  const testnum = 8;

  it('has all the keys', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = ['a', 'b', 'c'];
    kv.put('a', 1);
    kv.put('b', 2);
    kv.put('c', 3);
    const keys = kv.keys();
    expect(keys).toMatchObject(array);
  });
});

describe('KV values', () => {
  const testnum = 9;

  it('has all the values', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = [1, 2, 3];
    kv.put('a', 1);
    kv.put('b', 2);
    kv.put('c', 3);
    const values = kv.values();
    expect(values).toMatchObject(array);
  });
});

describe('KV push', () => {
  const testnum = 10;

  it('pushes onto an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = [1, 2, 3];
    kv.put('a', array);
    kv.push('a', 4);
    const values = kv.get('a');
    expect(values).toMatchObject([1, 2, 3, 4]);
  });

  it('converts to array before push', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    kv.push('a', 4);
    const values = kv.get('a');
    expect(values).toMatchObject([1, 4]);
  });
});

describe('KV pop', () => {
  const testnum = 11;

  it('pops from an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = [1, 2, 3];
    kv.put('a', array);
    expect(kv.pop('a')).toBe(3);
  });

  it('fetches non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    expect(kv.pop('a')).toBe(1);
  });

  it('consumes non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    kv.pop('a');
    const value = kv.get('a');
    // value should no longer exist
    expect(value).toBeUndefined();
  });
});

describe('KV unshift', () => {
  const testnum = 12;

  it('unshifts onto an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = [1, 2, 3];
    kv.put('a', array);
    kv.unshift('a', 4);
    const values = kv.get('a');
    expect(values).toMatchObject([4, 1, 2, 3]);
  });

  it('converts to array before unshift', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    kv.unshift('a', 4);
    const values = kv.get('a');
    expect(values).toMatchObject([4, 1]);
  });
});

describe('KV shift', () => {
  const testnum = 13;

  it('shifts from an existing array', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    const array = [1, 2, 3];
    kv.put('a', array);
    expect(kv.shift('a')).toBe(1);
  });

  it('fetches non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    expect(kv.shift('a')).toBe(1);
  });

  it('consumes non array value', () => {
    const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
    kv.put('a', 1);
    kv.shift('a');
    const value = kv.get('a');
    // value should no longer exist
    expect(value).toBeUndefined();
  });
});

describe('KV export', () => {
  const testnum = 14;
  const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
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
  const testnum = 15;

  const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
  it('has expected fields', () => {
    const fields = ['filename', 'last_modified', 'updates', 'version'];
    const info = kv.info();
    expect(Object.keys(info).sort()).toMatchObject(fields);
  });

  it('has correct fieldsname', () => {
    const info = kv.info();
    expect(info.filename).toBe(_makeTestFile(testnum));
  });
});

describe('KV limit', () => {
  const testnum = 15;

  const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'Jest' + testnum });
  const array = [1, 2, 3, 4, 5, 6];

  it('does not allow -ve limit', () => {
    expect(() => expect(kv.limit( 'a', 'tail', -1)).toThrow(Error))
    expect(() => expect(kv.limit( 'a', 'tail', -1)).toThrow('Error: KV limit cannot use a -ve value'))
  });

  it('limits head to 2 values', () => {
    kv.put('a', array);
    kv.limit( 'a', 'head', 2)
    const tmp = kv.get( 'a') ;
    expect( tmp.length).toBe( 2) ;
    expect( tmp).toMatchObject([1, 2]);
  });

  it('limits tail to 2 values', () => {
    kv.put('a', array);
    kv.limit( 'a', 'tail', 2)
    const tmp = kv.get( 'a') ;
    expect( tmp.length).toBe( 2);
    expect( tmp).toMatchObject([5, 6]);
  });
});
