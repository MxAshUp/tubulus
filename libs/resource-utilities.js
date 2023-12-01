const { throwIfMissing } = require("./utilities");

const toResOfType = (type = throwIfMissing`type`) => (data = throwIfMissing`data`, meta = {}) => ({
    type,
    data,
    meta
});

const toResError = toResOfType('error');
const resNull = () => ({
    type: 'EMPTY'
});

const isResNull = ({ type }) => type === 'EMPTY';
const notResNull = ({ type }) => type !== 'EMPTY';

module.exports = {
    toResOfType,
    toResError,
    resNull,
    isResNull,
    notResNull
}