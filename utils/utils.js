"use strict";
exports.__esModule = true;
var cast = function (type, value) {
    if (typeof (value) !== type) {
        switch (type) {
            case 'boolean': return false;
            case 'function': return function () { };
            case 'null': return null;
            case 'number': return 0;
            case 'object': return {};
            case 'string': return '';
            case 'symbol': return Symbol();
            case 'undefined': return void 0;
            default: throw new Error('Unknown type ' + type);
        }
    }
    return value;
};
exports.cast = cast;
var disallowedFileChars = RegExp('/\\\\;:');
var sanitizeFilename = function (str) {
    if (str === '.' || str === '..') {
        return str.replace('.', '_');
    }
    return str.replace(disallowedFileChars, '_');
};
exports.sanitizeFilename = sanitizeFilename;
//# sourceMappingURL=utils.js.map