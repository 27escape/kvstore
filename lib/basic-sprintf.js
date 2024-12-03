/** ---------------------------------------------------------------------------
 * @module    basic-sprintf
 * @description adds an extra method to the String prototype
 * for something better try https://github.com/alexei/sprintf.js
 * copied from https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
 */

// make sure we are checking for basic coding errors


// to use this just do
//
// require('basic-sprintf')
// it should not be assigned to any variable, this way it will just be
// executed as regular JS

'use strict';
'use esversion: 6';


String.format = function (str, arr) {
  var i = -1;
  function callback (exp, p0, p1, p2, p3, p4) {
    if (exp == '%%') return '%';
    if (arr[++i] === undefined) return undefined;
    exp = p2 ? parseInt(p2.substr(1)) : undefined;
    var base = p3 ? parseInt(p3.substr(1)) : undefined;
    var val;
    switch (p4) {
      case 's': val = arr[i]; break;
      case 'c': val = arr[i][0]; break;
      case 'f': val = parseFloat(arr[i]).toFixed(exp); break;
      case 'p': val = parseFloat(arr[i]).toPrecision(exp); break;
      case 'e': val = parseFloat(arr[i]).toExponential(exp); break;
      case 'x': val = parseInt(arr[i]).toString(base || 16); break;
      case 'd': val = parseFloat(parseInt(arr[i], base || 10).toPrecision(exp)).toFixed(0); break;
    }
    val = typeof (val) === 'object' ? JSON.stringify(val) : val.toString(base);
    var sz = parseInt(p1); /* padding size */
    var ch = p1 && p1[0] == '0' ? '0' : ' '; /* isnull? */
    while (val.length < sz) val = p0 !== undefined ? val + ch : ch + val; /* isminus? */
    return val;
  }
  var regex = /%(-)?(0?[0-9]+)?([.][0-9]+)?([#][0-9]+)?([scfpexd%])/g;
  return str.replace(regex, callback);
};

String.prototype.sprintf = function () {
  return String.format(this, Array.prototype.slice.call(arguments));
};

function percent (offset, total) {
  return '[%3d%]'.sprintf((offset * 100 / total).toFixed(0));
}
