const { throwIfMissing } = require("./utilities");

const toResOfType = (type = throwIfMissing`type`) => (data = throwIfMissing`data`, meta = {}) => ({
    type,
    data,
    meta
});

const toResError = toResOfType('error');

module.exports = {
    toResOfType,
    toResError
}