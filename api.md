# nodejs API


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
