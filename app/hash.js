const crypto = require('crypto');

module.exports.hashString = function(algorithm, data) {
    return crypto
        .createHash(algorithm)
        .update(JSON.stringify(data))
        .digest('hex');
}