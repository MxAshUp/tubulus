module.exports.catchTransformErrors = async (callFn) => {
    try {
        return await callFn();
    } catch (error) {
        return {
            type: 'error',
            data: error
        }
    }
}