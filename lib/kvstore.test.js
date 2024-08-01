// test kvstore
'use esversion: 6';

const shell = require('shelljs');
const KVStore = require('../lib/kvstore');
const os = require('os');
const path = require('path');
const process = require('process');
const { test, expect, describe } = require( "bun:test");
const testdir = path.join('/tmp', 'kvstore.' + process.pid);

// -----------------------------------------------------------------------------
const _incrementer = (function(n) {
  return function() {
    n += 1;
    return n;
  }
}(0)); // -1 if you want the first increment to return 0


// -----------------------------------------------------------------------------
const _testnumIncr = (function(n) {
  return function() {
    n += 1;
    return n;
  }
}(0)); // -1 if you want the first increment to return 0

// -----------------------------------------------------------------------------
function _makeTestFile (testnum, reset) {
  const testfile = path.join(testdir, `${testnum}-${_incrementer(reset)}.json`);
  if (!shell.test('-d', testdir)) {
    shell.mkdir('-p', testdir);
  }
  // console.error('testfile is', testfile);
  return testfile;
}


// -----------------------------------------------------------------------------
describe('KV initialization', () => {
  const testnum = 1;
  test('creates store file, removes lockfile', () => {
    const filename = _makeTestFile(testnum,0) ;
    const kv = new KVStore({ filename: filename, namespace: 'test' + testnum });
    expect(shell.test('-f', filename)).toBeTruthy();
    expect(shell.test('-f', kv.lockFileName)).not.toBeTruthy();
  });
});

// -----------------------------------------------------------------------------
describe('KV put + get', () => {
  const testnum = _testnumIncr() ;

  // namespaces and keys use the same validation, so if we pass the namespace ones we are good
  // test( 'namespace cannot start with period', () => {
  //   expect(() => expect(new KVStore({ filename: _makeTestFile(testnum,0), namespace: `.test` })).toThrow(Error))
  // });
  // test( 'namespace cannot be just a number', () => {
  //   expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: '100' })).toThrow(Error))
  // });
  // test( 'namespace cannot start as a number followed by a period', () => {
  //   expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: '100.' })).toThrow(Error))
  // });

  // test( 'namespace cannot contain a number surrounded by periods eg test.1.test', () => {
  //   expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: `test.{testnum}.test` })).toThrow(Error))
  // });

  // test( 'namespace cannot end with number type construct eg namespace.1', () => {
  //   expect(() => expect(new KVStore({ filename: _makeTestFile(testnum), namespace: `{testnum}.test` })).toThrow(Error))
  // });

  // // but throw in a couple of key validations too just to make sure
  // test( 'key cannot start with period', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
  //   expect(() => expect(kv.put( '.firsta', 'value')).toThrow(Error))
  // });

  // test( 'key cannot contain string.number type construct eg key.1', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
  //   expect(() => expect(kv.put( 'first.1', 'value')).toThrow(Error))
  // });

  // test('stores a key/value, removes lockfile', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
  //   kv.put('first', 'value');
  //   const value = kv.get('first');
  //   expect(value).toBe('value');
  //   expect(shell.test('-f', _makeTestFile(testnum) + '.lock')).not.toBeTruthy();
  // });

  // test('has caseless key access', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
  //   kv.put('SECOND', 'value2');
  //   const value = kv.get('second');
  //   expect(value).toBe('value2');
  // });

  // test('puts deep key, gets object from top', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: `test${testnum}-1` });
  //   const obj = {
  //     b: { c: { d: 'item' } }
  //   };
  //   kv.put('a.b.c.d', 'item');
  //   const value = kv.get('a');
  //   // console.log('----->', value);
  //   // console.log( kv.list())
  //   expect(value).toMatchObject(obj);
  // });

  // test('puts object, gets deep key', () => {
  //   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: `test${testnum}-1` });
  //   kv.put('deep', { b: { c: { d: 'item' } } });
  //   const value = kv.get('deep.b.c.d');
  //   expect(value).toBe('item');
  // });
});

// // -----------------------------------------------------------------------------
// describe('KV delete', () => {
//   const testnum = 3;

//   test('deletes, single key, others remain', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('first', 'value');
//     kv.put('SECOND', 'value2');
//     kv.put('third', 'value3');
//     kv.delete('third');
//     expect(kv.get('third')).not.toBeDefined();
//     expect(kv.get('first')).toBe('value');
//     expect(kv.get('second')).toBe('value2');
//   });
//   test('removes lock file', () => {
//     expect(shell.test('-f', _makeTestFile(testnum) + '.lock')).not.toBeTruthy();
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV incr', () => {
//   const testnum = 4;
//   test('increments 1', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.incr('key', 1);
//     expect(kv.get('key')).toBe(1);
//   });
//   test('increments 10', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('key', 1);
//     kv.incr('key', 10);
//     expect(kv.get('key')).toBe(11);
//   });
//   test('ignore incr with non-number', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const prev = kv.get('key');
//     const value = kv.incr('key', 'test');
//     expect(value).toBe(prev);
//   });
//   test('ignore incr of non-number', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('key', 'string');
//     const value = kv.incr('key', 1);
//     expect(value).toBe('string');
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV decr', () => {
//   const testnum = 5;

//   test('decrements 1', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.incr('key', 0);
//     kv.decr('key', 1);
//     expect(kv.get('key')).toBe(-1);
//   });
//   test('decrements 10', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('key', -1);
//     kv.decr('key', 10);
//     expect(kv.get('key')).toBe(-11);
//   });

//   test('ignore decr with non-number', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const prev = kv.get('key');
//     const value = kv.decr('key', 'test');
//     expect(value).toBe(prev);
//   });
//   test('ignore decr of non-number', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('key', 'string');
//     const value = kv.decr('key', 1);
//     expect(value).toBe('string');
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV find', () => {
//   const testnum = 6;

//   test('matches basic regexp', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const obj = [{ a1: 1 }, { a2: 2 }, { a3: 3 }];
//     kv.put('a1', 1);
//     kv.put('a2', 2);
//     kv.put('a3', 3);
//     kv.put('longname.d', 'something else');
//     const find = kv.find(/^a\d/);
//     expect(find).toMatchObject(obj);
//   });

//   test('matches deeper regexp', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const obj = [{ a: { b: { c: { d: 1 } } } }, { longname: { d: 'something else' } }];
//     kv.put('a.b.c.d', 1);
//     kv.put('a2', 2);
//     kv.put('a3', 3);
//     kv.put('longname.d', 'something else');
//     const find = kv.find(/\.d$/);
//     expect(find).toMatchObject(obj);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV list', () => {
//   const testnum = 7;

//   test('has all the keys+values', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const obj = [
//       { a: 1 }, { b: 2 }, { c: 3 }];
//     kv.put('a', 1);
//     kv.put('b', 2);
//     kv.put('c', 3);
//     const list = kv.list();
//     expect(list).toMatchObject(obj);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV keys', () => {
//   const testnum = 8;

//   test('has all the keys', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = ['a', 'b', 'c'];
//     kv.put('a', 1);
//     kv.put('b', 2);
//     kv.put('c', 3);
//     const keys = kv.keys();
//     expect(keys).toMatchObject(array);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV values', () => {
//   const testnum = 9;

//   test('has all the values', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = [1, 2, 3];
//     kv.put('a', 1);
//     kv.put('b', 2);
//     kv.put('c', 3);
//     const values = kv.values();
//     expect(values).toMatchObject(array);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV push', () => {
//   const testnum = 10;

//   test('pushes onto an existing array', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = [1, 2, 3];
//     kv.put('a', array);
//     kv.push('a', 4);
//     const values = kv.get('a');
//     expect(values).toMatchObject([1, 2, 3, 4]);
//   });

//   test('converts to array before push', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     kv.push('a', 4);
//     const values = kv.get('a');
//     expect(values).toMatchObject([1, 4]);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV pop', () => {
//   const testnum = 11;

//   test('pops from an existing array', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = [1, 2, 3];
//     kv.put('a', array);
//     expect(kv.pop('a')).toBe(3);
//   });

//   test('fetches non array value', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     expect(kv.pop('a')).toBe(1);
//   });

//   test('consumes non array value', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     kv.pop('a');
//     const value = kv.get('a');
//     // value should no longer exist
//     expect(value).toBeUndefined();
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV unshift', () => {
//   const testnum = 12;

//   test('unshifts onto an existing array', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = [1, 2, 3];
//     kv.put('a', array);
//     kv.unshift('a', 4);
//     const values = kv.get('a');
//     expect(values).toMatchObject([4, 1, 2, 3]);
//   });

//   test('converts to array before unshift', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     kv.unshift('a', 4);
//     const values = kv.get('a');
//     expect(values).toMatchObject([4, 1]);
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV shift', () => {
//   const testnum = 13;

//   test('shifts from an existing array', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     const array = [1, 2, 3];
//     kv.put('a', array);
//     expect(kv.shift('a')).toBe(1);
//   });

//   test('fetches non array value', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     expect(kv.shift('a')).toBe(1);
//   });

//   test('consumes non array value', () => {
//     const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//     kv.put('a', 1);
//     kv.shift('a');
//     const value = kv.get('a');
//     // value should no longer exist
//     expect(value).toBeUndefined();
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV export', () => {
//   const testnum = 14;
//   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//   kv.put('a.b.c.d', 1);
//   const exportdata = kv.export();
//   test('provides object matching contents', () => {
//     expect(exportdata).toMatchObject( {
//       "a":{
//         "b": {
//           "c": {
//             "d":1
//             }
//           }
//         }
//       }
//     );
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV info', () => {
//   const testnum = 15;

//   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//   test('has expected fields', () => {
//     const fields = ['filename', 'last_modified', 'updates', 'version'];
//     const info = kv.info();
//     expect(Object.keys(info).sort()).toMatchObject(fields);
//   });

//   test('has correct fieldsname', () => {
//     const info = kv.info();
//     expect(info.filename).toBe(_makeTestFile(testnum));
//   });
// });

// // -----------------------------------------------------------------------------
// describe('KV limit', () => {
//   const testnum = 15;

//   const kv = new KVStore({ filename: _makeTestFile(testnum), namespace: 'test' + testnum });
//   const array = [1, 2, 3, 4, 5, 6];

//   test('does not allow -ve limit', () => {
//     expect(() => expect(kv.limtest( 'a', 'tail', -1)).toThrow(Error))
//     expect(() => expect(kv.limtest( 'a', 'tail', -1)).toThrow('Error: KV limit cannot use a -ve value'))
//   });

//   test('limits head to 2 values', () => {
//     kv.put('a', array);
//     kv.limtest( 'a', 'head', 2)
//     const tmp = kv.get( 'a') ;
//     expect( tmp.length).toBe( 2) ;
//     expect( tmp).toMatchObject([1, 2]);
//   });

//   test('limits tail to 2 values', () => {
//     kv.put('a', array);
//     kv.limtest( 'a', 'tail', 2)
//     const tmp = kv.get( 'a') ;
//     expect( tmp.length).toBe( 2);
//     expect( tmp).toMatchObject([5, 6]);
//   });
// });
