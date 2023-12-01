const { toResError } = require("./resource-utilities");

module.exports.catchTransformErrors = async (callFn) => {
    try {
        return await callFn();
    } catch (error) {
        return toResError(error);
    }
}