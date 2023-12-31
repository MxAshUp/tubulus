const crypto = require('crypto');
const UglifyJS = require("uglify-js");
const { from, isObservable, of } = require('rxjs');
const { resNull } = require('./resource-utilities');

module.exports.throwFormattedError = (errorMessage) => (error) => {
    const formattedError = new Error(`${errorMessage}: ${error.message}`);
    formattedError.stack = error.stack;
    throw formattedError;
}

module.exports.throwIfMissing = (parameterName) => {
    const newError = new Error(`Missing: ${parameterName}`);
  
    const stack = newError.stack.split("\n");
    stack.splice(1, 1);
    newError.stack = stack.join("\n");
  
    throw newError;
  }

const hashString = module.exports.hashString = (algorithm, data) => {
    return crypto
        .createHash(algorithm)
        .update(JSON.stringify(data))
        .digest('hex');
}

// Minifying js allows us to compare _functional_ differences between code.
// For example: if a comment is changed, or variable name updated, the minified version will be unchanged
// and therefore the effective difference would be none.
module.exports.hashFunction = (fn) => {
    // Add const "fn ="" to prevent minify from remove it.
    const codeStr = `const fn = ${fn.toString()}`;
    const {code} = UglifyJS.minify(codeStr, {
        parse: {
            bare_returns: true,
        },
        compress: {
            drop_console: true,
        }
    });
    if(!code) throw new Error('Unexpected uglify result: undefined');

    return hashString('md5', code);
}

// Returns true if a and b are equal, but will return false if either a or b are undefined;
module.exports.equalAndDefined = (a, b) => typeof a !== 'undefined' && a === b;

module.exports.invokeWithArgs = (...args) => (fn) => fn(...args);

// Dynamically composes an optimized function based on an array of predicates and a separator (' && ', ' || ', etc).
module.exports.concatConditions = (conditions, separator) => {
    if(conditions.length === 1) return conditions[0];

    const flattenConditions = [];

    const flatten = (conds, sep) => conds.map(c => {
        if (c._concatSep && c._concatConditions) {
            const innerPredicate = flatten(c._concatConditions, c._concatSep);
            flattenConditions.push(...c._concatConditions);
            return c._concatSep !== sep ? `(${innerPredicate})` : innerPredicate;
        } else {
            flattenConditions.push(c);
            return `_${flattenConditions.length - 1}(...args)`;
        }
    }).join(sep);

    const predicateCallStr = flatten(conditions, separator);
    const fullFnStr = `return ${predicateCallStr};`;

    const fn = new Function(
        ...Array.from({ length: flattenConditions.length }, (_, i) => `_${i}`),
        '...args', 
        fullFnStr
    ).bind(null, ...flattenConditions);

    fn._concatSep = separator;
    fn._concatConditions = conditions;

    return fn;
};