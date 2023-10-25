const crypto = require('crypto');
const UglifyJS = require("uglify-js");
const { from, isObservable, of } = require('rxjs');

module.exports.throwFormattedError = (errorMessage) => (error) => {
    const formattedError = new Error(`${errorMessage}: ${error.message}`);
    formattedError.stack = error.stack;
    throw formattedError;
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

module.exports.handledResultsToObservable = (input) => {
    // If it's already an observable, return as-is
    if (isObservable(input)) {
      return input;
    }
    
    // If it's an array, convert to observable stream
    if (Array.isArray(input)) {
      return from(input);
    }

    // Return undefined means handler results in nothing
    // Need to have an empty resource end point to ensure cached
    if(typeof input === "undefined") {
        return of({
            type: 'EMPTY',
        })
    }
  
    // If it's an object, convert to an observable
    return of(input);
}